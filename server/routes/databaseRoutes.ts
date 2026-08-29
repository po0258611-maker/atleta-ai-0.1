import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middlewares/auth';
import { getFirestoreAdapter } from '../repositories/firestoreAdapter';
import { SERVER_CONFIG } from '../config/env';

export const databaseRouter = Router();

function getSupabaseServer() {
  if (!SERVER_CONFIG.SUPABASE_URL || !SERVER_CONFIG.SUPABASE_ANON_KEY) return null;
  return createClient(SERVER_CONFIG.SUPABASE_URL, SERVER_CONFIG.SUPABASE_ANON_KEY);
}

// Diagnostics expose infrastructure state only to authenticated users.
databaseRouter.use(requireAuth);

databaseRouter.get('/status', async (_req: Request, res: Response) => {
  const startedAt = Date.now();
  const supabase = getSupabaseServer();
  let supabaseConnected = false;
  let supabaseError: string | undefined;

  if (supabase) {
    try {
      const result = await supabase.auth.getSession();
      supabaseConnected = !result.error;
      supabaseError = result.error?.message;
    } catch (error) {
      supabaseError = error instanceof Error ? error.message : 'Supabase indisponível';
    }
  } else {
    supabaseError = 'Supabase não configurado neste ambiente.';
  }

  const firestore = getFirestoreAdapter();
  const latencyMs = Date.now() - startedAt;

  return res.status(200).json({
    providers: {
      supabase: {
        configured: Boolean(supabase),
        connected: supabaseConnected,
        status: supabaseConnected ? 'online' : 'unavailable',
        message: supabaseConnected ? 'Conexão operacional' : supabaseError,
        latencyMs,
      },
      firestore: {
        configured: Boolean(firestore),
        connected: Boolean(firestore),
        status: firestore ? 'configured' : 'unavailable',
      },
    },
    timestamp: new Date().toISOString(),
  });
});

databaseRouter.get('/ping', async (_req: Request, res: Response) => {
  const startedAt = Date.now();
  const client = getSupabaseServer();
  if (!client) {
    return res.status(503).json({
      success: false,
      error: { code: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase não configurado neste ambiente.' },
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const { error } = await client.auth.getSession();
    if (error) {
      return res.status(503).json({
        success: false,
        error: { code: 'SUPABASE_UNAVAILABLE', message: error.message },
        roundtripMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      });
    }
    const roundtripMs = Date.now() - startedAt;
    return res.json({
      success: true,
      roundtripMs,
      status: roundtripMs < 200 ? 'excellent' : roundtripMs < 600 ? 'good' : 'fair',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      error: { code: 'SUPABASE_UNAVAILABLE', message: error instanceof Error ? error.message : 'Supabase indisponível' },
      roundtripMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  }
});

databaseRouter.get('/schema', (_req: Request, res: Response) => {
  res.json({
    version: SERVER_CONFIG.APP_VERSION,
    engine: 'Hybrid Firestore + Supabase PostgreSQL',
    collections: [
      { name: 'users', path: 'users/{uid}', primaryKey: 'uid' },
      { name: 'workouts', path: 'users/{uid}/workouts/active', primaryKey: 'programId' },
      { name: 'exerciseLogs', path: 'users/{uid}/exerciseLogs/{logId}', primaryKey: 'logId' },
      { name: 'measurements', path: 'users/{uid}/measurements/{recordId}', primaryKey: 'recordId' },
      { name: 'sessions', path: 'users/{uid}/sessions/{sessionId}', primaryKey: 'sessionId' },
      { name: 'achievements', path: 'users/{uid}/achievements/{badgeId}', primaryKey: 'badgeId' },
    ],
  });
});

databaseRouter.post('/integrity-check', (req: Request, res: Response) => {
  const { logs, profile, measurements } = req.body || {};
  const issues: { level: 'info' | 'warning' | 'error'; message: string; field?: string }[] = [];
  let checkedRecordsCount = 0;

  if (profile && typeof profile === 'object') {
    checkedRecordsCount += 1;
    if (typeof profile.name !== 'string' || profile.name.trim().length === 0) {
      issues.push({ level: 'warning', message: 'Nome do atleta não preenchido no perfil.', field: 'name' });
    }
    if (typeof profile.weight === 'number' && (!Number.isFinite(profile.weight) || profile.weight < 25 || profile.weight > 350)) {
      issues.push({ level: 'warning', message: `Peso informado (${profile.weight} kg) fora dos limites aceitos.`, field: 'weight' });
    }
  }

  if (Array.isArray(logs)) {
    checkedRecordsCount += logs.length;
    logs.slice(0, 1000).forEach((log: unknown, idx: number) => {
      const record = log && typeof log === 'object' ? log as Record<string, unknown> : {};
      if (typeof record.exerciseName !== 'string' || !record.exerciseName.trim()) {
        issues.push({ level: 'error', message: `Registro de log #${idx + 1} sem nome de exercício associado.` });
      }
      const sets = record.sets;
      if (!Array.isArray(sets) || sets.length === 0) {
        issues.push({ level: 'warning', message: `Log #${idx + 1} sem séries computadas.` });
      } else {
        sets.slice(0, 100).forEach((set: unknown, sIdx: number) => {
          const item = set && typeof set === 'object' ? set as Record<string, unknown> : {};
          const reps = Number(item.reps ?? item.repsDone);
          const weight = Number(item.weight ?? item.weightKg);
          if (!Number.isFinite(reps) || reps < 0) {
            issues.push({ level: 'warning', message: `Log #${idx + 1}, série ${sIdx + 1}: repetições inválidas.` });
          }
          if (!Number.isFinite(weight) || weight < 0) {
            issues.push({ level: 'error', message: `Log #${idx + 1}, série ${sIdx + 1}: carga inválida.` });
          }
        });
      }
    });
  }

  if (Array.isArray(measurements)) checkedRecordsCount += Math.min(measurements.length, 1000);

  return res.json({
    status: issues.some((i) => i.level === 'error') ? 'needs_repair' : issues.length > 0 ? 'warnings_found' : 'healthy',
    checkedRecordsCount,
    issuesCount: issues.length,
    issues,
    timestamp: new Date().toISOString(),
  });
});
