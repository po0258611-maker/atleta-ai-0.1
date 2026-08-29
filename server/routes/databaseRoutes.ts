import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { SERVER_CONFIG } from '../config/env';
import { getAdminFirestore } from '../services/firebaseAdmin';
import { requireAuth } from '../middlewares/auth';
import { requireRole } from '../middlewares/authorization';

export const databaseRouter = Router();

function getSupabaseServer() {
  if (!SERVER_CONFIG.SUPABASE_URL || !SERVER_CONFIG.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_CONFIGURATION_MISSING');
  }
  return createClient(SERVER_CONFIG.SUPABASE_URL, SERVER_CONFIG.SUPABASE_ANON_KEY);
}

// Diagnostics are protected. /api/health remains the public process-liveness endpoint.
databaseRouter.get('/status', requireAuth, async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const providers: Record<string, unknown> = {};
  let healthy = true;

  try {
    const client = getSupabaseServer();
    const { error } = await client.auth.getSession();
    const latency = Date.now() - startTime;
    const supabaseConnected = !error;
    healthy = healthy && supabaseConnected;

    providers.supabase = {
      name: 'Supabase PostgreSQL & Auth',
      connected: supabaseConnected,
      status: supabaseConnected ? 'online' : 'error',
      latencyMs: latency,
      message: error ? error.message : 'Conexão Supabase operacional',
    };
  } catch (error: unknown) {
    healthy = false;
    providers.supabase = {
      name: 'Supabase PostgreSQL & Auth',
      connected: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Falha de conexão',
    };
  }

  const firestoreStart = Date.now();
  try {
    const firestore = getAdminFirestore();
    await firestore.collection('health').doc('readiness').get();
    providers.firestore = {
      name: 'Firebase Firestore & Auth',
      connected: true,
      status: 'online',
      projectId: SERVER_CONFIG.FIREBASE_PROJECT_ID,
      latencyMs: Date.now() - firestoreStart,
    };
  } catch (error: unknown) {
    healthy = false;
    providers.firestore = {
      name: 'Firebase Firestore & Auth',
      connected: false,
      status: 'error',
      projectId: SERVER_CONFIG.FIREBASE_PROJECT_ID,
      latencyMs: Date.now() - firestoreStart,
      message: error instanceof Error ? error.message : 'Falha de conexão',
    };
  }

  return res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    providers,
    timestamp: new Date().toISOString(),
  });
});

databaseRouter.get('/ping', requireAuth, async (_req: Request, res: Response) => {
  const start = Date.now();
  try {
    const client = getSupabaseServer();
    const { error } = await client.auth.getSession();
    const roundtripMs = Date.now() - start;

    if (error) {
      return res.status(503).json({
        success: false,
        roundtripMs,
        status: 'error',
        error: 'SUPABASE_UNAVAILABLE',
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      roundtripMs,
      status: roundtripMs < 200 ? 'excellent' : roundtripMs < 600 ? 'good' : 'fair',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return res.status(503).json({
      success: false,
      roundtripMs: Date.now() - start,
      status: 'error',
      error: error instanceof Error ? error.message : 'DATABASE_UNAVAILABLE',
      timestamp: new Date().toISOString(),
    });
  }
});

// Schema metadata is informational but can expose internal architecture, so keep it private.
databaseRouter.get('/schema', requireAuth, (_req: Request, res: Response) => {
  return res.json({
    version: '2.6.0',
    engine: 'Firebase Auth + Firestore authoritative persistence; Supabase compatibility layer',
    collections: [
      { name: 'users', path: 'users/{uid}', primaryKey: 'uid', fields: ['uid', 'displayName', 'updatedAt'] },
      { name: 'profile', path: 'users/{uid}/profile/current', primaryKey: 'current' },
      { name: 'workouts', path: 'users/{uid}/workouts/active', primaryKey: 'active' },
      { name: 'exerciseLogs', path: 'users/{uid}/exerciseLogs/{logId}', primaryKey: 'logId' },
      { name: 'progression', path: 'users/{uid}/progression/stats', primaryKey: 'stats' },
      { name: 'settings', path: 'users/{uid}/settings/preferences', primaryKey: 'preferences' },
      { name: 'measurements', path: 'users/{uid}/measurements/{recordId}', primaryKey: 'recordId' },
      { name: 'subscriptions', path: 'subscriptions/{uid}', primaryKey: 'uid', authority: 'server' },
      { name: 'subscription_history', path: 'subscription_history/{historyId}', primaryKey: 'historyId', authority: 'server' },
      { name: 'webhook_events', path: 'webhook_events/{provider_eventId}', primaryKey: 'provider_eventId', authority: 'server' },
      { name: 'usage', path: 'usage/{user_metric_period}', primaryKey: 'user_metric_period', authority: 'server' },
    ],
  });
});

// Integrity inspection can reveal sensitive operational state; ADMIN only.
databaseRouter.post('/integrity-check', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const { logs, profile, measurements } = req.body || {};
  const issues: { level: 'info' | 'warning' | 'error'; message: string; field?: string }[] = [];
  let checkedRecordsCount = 0;

  if (profile && typeof profile === 'object') {
    checkedRecordsCount++;
    if (typeof profile.name !== 'string' || profile.name.trim().length === 0) {
      issues.push({ level: 'warning', message: 'Nome do atleta não preenchido no perfil.', field: 'name' });
    }
    if (typeof profile.weight === 'number' && (profile.weight < 30 || profile.weight > 300)) {
      issues.push({ level: 'warning', message: `Peso informado (${profile.weight} kg) fora da faixa biométrica usual.`, field: 'weight' });
    }
  }

  if (Array.isArray(logs)) {
    checkedRecordsCount += logs.length;
    logs.forEach((log: any, idx: number) => {
      if (!log || typeof log !== 'object') {
        issues.push({ level: 'error', message: `Registro de log #${idx + 1} inválido.` });
        return;
      }
      if (typeof log.exerciseName !== 'string' || log.exerciseName.trim() === '') {
        issues.push({ level: 'error', message: `Registro de log #${idx + 1} sem nome de exercício associado.` });
      }
      if (!Array.isArray(log.sets) || log.sets.length === 0) {
        issues.push({ level: 'warning', message: `Log #${idx + 1} (${log.exerciseName || 'Desconhecido'}) sem séries computadas.` });
      } else {
        log.sets.forEach((set: any, sIdx: number) => {
          if (!set || typeof set !== 'object') {
            issues.push({ level: 'error', message: `Log #${idx + 1}, Série ${sIdx + 1}: estrutura inválida.` });
            return;
          }
          if (typeof set.reps === 'number' && set.reps <= 0) {
            issues.push({ level: 'warning', message: `Log #${idx + 1}, Série ${sIdx + 1}: repetições menor ou igual a zero.` });
          }
          if (typeof set.weight === 'number' && set.weight < 0) {
            issues.push({ level: 'error', message: `Log #${idx + 1}, Série ${sIdx + 1}: carga negativa detectada (${set.weight} kg).` });
          }
        });
      }
    });
  }

  if (Array.isArray(measurements)) checkedRecordsCount += measurements.length;

  return res.json({
    status: issues.some((i) => i.level === 'error') ? 'needs_repair' : issues.length > 0 ? 'warnings_found' : 'healthy',
    checkedRecordsCount,
    issuesCount: issues.length,
    issues,
    timestamp: new Date().toISOString(),
  });
});
