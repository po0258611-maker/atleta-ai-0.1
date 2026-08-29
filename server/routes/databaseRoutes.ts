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

databaseRouter.get('/status', requireAuth, async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const providers: Record<string, unknown> = {};
  let healthy = true;

  try {
    const client = getSupabaseServer();
    const { error } = await client.auth.getSession();
    const latency = Date.now() - startTime;
    const connected = !error;
    healthy = healthy && connected;
    providers.supabase = {
      name: 'Supabase PostgreSQL & Auth',
      connected,
      url: SERVER_CONFIG.SUPABASE_URL,
      publishableKeyMasked: `${SERVER_CONFIG.SUPABASE_ANON_KEY.slice(0, 6)}...${SERVER_CONFIG.SUPABASE_ANON_KEY.slice(-4)}`,
      status: connected ? 'online' : 'error',
      message: error ? error.message : 'Conexão Supabase operacional',
      latencyMs: latency,
    };
  } catch (error: unknown) {
    healthy = false;
    providers.supabase = {
      name: 'Supabase PostgreSQL & Auth',
      connected: false,
      url: SERVER_CONFIG.SUPABASE_URL,
      publishableKeyMasked: SERVER_CONFIG.SUPABASE_ANON_KEY ? `${SERVER_CONFIG.SUPABASE_ANON_KEY.slice(0, 6)}...${SERVER_CONFIG.SUPABASE_ANON_KEY.slice(-4)}` : '',
      status: 'error',
      message: error instanceof Error ? error.message : 'Falha de conexão',
      latencyMs: Date.now() - startTime,
    };
  }

  const firestoreStart = Date.now();
  try {
    await getAdminFirestore().collection('health').doc('readiness').get();
    providers.firestore = {
      name: 'Firebase Firestore & Auth',
      connected: true,
      projectId: SERVER_CONFIG.FIREBASE_PROJECT_ID,
      status: 'online',
      latencyMs: Date.now() - firestoreStart,
      features: ['Real-time Synchronization', 'Offline Persistence', 'Subcollections RBAC'],
    };
  } catch (error: unknown) {
    healthy = false;
    providers.firestore = {
      name: 'Firebase Firestore & Auth',
      connected: false,
      projectId: SERVER_CONFIG.FIREBASE_PROJECT_ID,
      status: 'error',
      latencyMs: Date.now() - firestoreStart,
      features: [],
      message: error instanceof Error ? error.message : 'Falha de conexão',
    };
  }

  providers.localCache = {
    name: 'IndexedDB & Local Store',
    status: 'browser-dependent',
    latencyMs: 1,
  };

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
      return res.status(503).json({ success: false, roundtripMs, status: 'error', error: 'SUPABASE_UNAVAILABLE', timestamp: new Date().toISOString() });
    }
    return res.json({ success: true, roundtripMs, status: roundtripMs < 200 ? 'excellent' : roundtripMs < 600 ? 'good' : 'fair', timestamp: new Date().toISOString() });
  } catch (error: unknown) {
    return res.status(503).json({ success: false, roundtripMs: Date.now() - start, status: 'error', error: error instanceof Error ? error.message : 'DATABASE_UNAVAILABLE', timestamp: new Date().toISOString() });
  }
});

databaseRouter.get('/schema', requireAuth, (_req: Request, res: Response) => {
  return res.json({
    version: '2.6.0',
    engine: 'Firebase Auth + Firestore authoritative persistence; Supabase compatibility layer',
    collections: [
      {
        name: 'users', description: 'Identidade e metadados mínimos do atleta', primaryKey: 'uid', path: 'users/{uid}', indexes: [], fields: ['uid', 'displayName', 'updatedAt'],
      },
      {
        name: 'profile', description: 'Perfil do atleta e parâmetros de treino', primaryKey: 'current', path: 'users/{uid}/profile/current', indexes: [], fields: ['name', 'gender', 'age', 'heightCm', 'weightKg', 'experience', 'objective', 'environment'],
      },
      {
        name: 'workouts', description: 'Programa Full Body ativo', primaryKey: 'active', path: 'users/{uid}/workouts/active', indexes: [], fields: ['id', 'createdAt', 'methodology', 'splitDays', 'weeklyVolumeMap', 'frequencyMap'],
      },
      {
        name: 'exerciseLogs', description: 'Histórico de execução, séries, RIR, RPE e carga', primaryKey: 'logId', path: 'users/{uid}/exerciseLogs/{logId}', indexes: ['date'], fields: ['id', 'date', 'dayId', 'durationMin', 'exerciseLogs', 'sessionRPE', 'notes'],
      },
      {
        name: 'progression', description: 'Agregados de desempenho e streak', primaryKey: 'stats', path: 'users/{uid}/progression/stats', indexes: [], fields: ['uid', 'totalWorkouts', 'totalVolumeKg', 'currentStreakDays', 'lastWorkoutDate', 'updatedAt'],
      },
      {
        name: 'settings', description: 'Preferências do usuário', primaryKey: 'preferences', path: 'users/{uid}/settings/preferences', indexes: [], fields: ['theme', 'notifications', 'soundEffects', 'hapticFeedback', 'language'],
      },
      {
        name: 'measurements', description: 'Histórico de medidas corporais', primaryKey: 'recordId', path: 'users/{uid}/measurements/{recordId}', indexes: ['date'], fields: ['id', 'date', 'weightKg', 'heightCm', 'bodyFatPercentage', 'chestCm', 'waistCm', 'armCm', 'thighCm'],
      },
      {
        name: 'subscriptions', description: 'Estado de assinatura server-authoritative', primaryKey: 'uid', path: 'subscriptions/{uid}', indexes: ['status', 'planId'], fields: ['id', 'userId', 'planId', 'status', 'provider', 'currentPeriodStart', 'currentPeriodEnd', 'cancelAtPeriodEnd', 'updatedAt'], authority: 'server',
      },
      {
        name: 'subscription_history', description: 'Auditoria de mudanças de assinatura', primaryKey: 'historyId', path: 'subscription_history/{historyId}', indexes: ['userId', 'timestamp'], fields: ['id', 'subscriptionId', 'userId', 'eventType', 'statusBefore', 'statusAfter', 'timestamp'], authority: 'server',
      },
      {
        name: 'webhook_events', description: 'Idempotência e auditoria de eventos externos', primaryKey: 'provider_eventId', path: 'webhook_events/{provider_eventId}', indexes: ['provider', 'eventId'], fields: ['provider', 'eventId', 'eventType', 'status', 'receivedAt', 'processedAt'], authority: 'server',
      },
      {
        name: 'usage', description: 'Contadores de quota por usuário, métrica e período', primaryKey: 'user_metric_period', path: 'usage/{user_metric_period}', indexes: ['userId', 'metric', 'period'], fields: ['userId', 'metric', 'period', 'count', 'updatedAt'], authority: 'server',
      },
    ],
  });
});

databaseRouter.post('/integrity-check', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const { logs, profile, measurements } = req.body || {};
  const issues: { level: 'info' | 'warning' | 'error'; message: string; field?: string }[] = [];
  let checkedRecordsCount = 0;

  if (profile && typeof profile === 'object') {
    checkedRecordsCount++;
    if (typeof profile.name !== 'string' || profile.name.trim() === '') issues.push({ level: 'warning', message: 'Nome do atleta não preenchido no perfil.', field: 'name' });
    if (typeof profile.weight === 'number' && (profile.weight < 30 || profile.weight > 300)) issues.push({ level: 'warning', message: `Peso informado (${profile.weight} kg) fora da faixa biométrica usual.`, field: 'weight' });
  }

  if (Array.isArray(logs)) {
    checkedRecordsCount += logs.length;
    logs.forEach((log: any, idx: number) => {
      if (!log || typeof log !== 'object') {
        issues.push({ level: 'error', message: `Registro de log #${idx + 1} inválido.` });
        return;
      }
      if (typeof log.exerciseName !== 'string' && (!Array.isArray(log.exerciseLogs) || log.exerciseLogs.length === 0)) {
        issues.push({ level: 'error', message: `Registro de log #${idx + 1} sem exercícios associados.` });
      }
      if (Array.isArray(log.sets)) {
        log.sets.forEach((set: any, sIdx: number) => {
          if (!set || typeof set !== 'object') issues.push({ level: 'error', message: `Log #${idx + 1}, Série ${sIdx + 1}: estrutura inválida.` });
          else if (typeof set.weight === 'number' && set.weight < 0) issues.push({ level: 'error', message: `Log #${idx + 1}, Série ${sIdx + 1}: carga negativa detectada.` });
        });
      }
    });
  }

  if (Array.isArray(measurements)) checkedRecordsCount += measurements.length;

  return res.json({
    status: issues.some((i) => i.level === 'error') ? 'needs_repair' : issues.length ? 'warnings_found' : 'healthy',
    checkedRecordsCount,
    issuesCount: issues.length,
    issues,
    timestamp: new Date().toISOString(),
  });
});
