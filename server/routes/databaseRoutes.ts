import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { SERVER_CONFIG } from '../config/env';
import { requireAuth } from '../middlewares/auth';

export const databaseRouter = Router();

function getSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_ANON_KEY || '').trim();

  if (!url || !key) return null;
  if (!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(url)) return null;

  return { url, key };
}

function getSupabaseServer() {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Supabase não configurado no ambiente do servidor.');
  return createClient(config.url, config.key);
}

// 1. Database configuration & health status.
// Keep this endpoint intentionally low-detail because it may be used by deployment probes.
databaseRouter.get('/status', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const supabaseConfig = getSupabaseConfig();

  try {
    // A configured Supabase client is not the same thing as a proven database connection.
    // Avoid reporting synthetic "online" values when no real health query is available.
    let supabaseStatus: 'configured' | 'not_configured' = supabaseConfig ? 'configured' : 'not_configured';

    if (supabaseConfig) {
      const client = getSupabaseServer();
      await client.auth.getSession();
      supabaseStatus = 'configured';
    }

    return res.status(supabaseConfig ? 200 : 503).json({
      providers: {
        supabase: {
          configured: supabaseStatus === 'configured',
          status: supabaseStatus,
          latencyMs: Date.now() - startTime,
        },
        firestore: {
          configured: Boolean(SERVER_CONFIG.FIREBASE_PROJECT_ID),
          status: SERVER_CONFIG.FIREBASE_PROJECT_ID ? 'configured' : 'not_configured',
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return res.status(503).json({
      success: false,
      error: 'Serviço de banco de dados indisponível ou não configurado.',
      timestamp: new Date().toISOString(),
    });
  }
});

// 2. Real-time Ping Latency Benchmark.
// Requires authentication and never reports a successful ping after an exception.
databaseRouter.get('/ping', requireAuth, async (_req: Request, res: Response) => {
  const start = Date.now();
  try {
    const client = getSupabaseServer();
    await client.auth.getSession();
    const roundtrip = Date.now() - start;
    return res.json({
      success: true,
      roundtripMs: roundtrip,
      status: roundtrip < 200 ? 'excellent' : roundtrip < 600 ? 'good' : 'fair',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(503).json({
      success: false,
      code: 'DATABASE_UNAVAILABLE',
      message: 'Serviço Supabase não está configurado ou disponível.',
      timestamp: new Date().toISOString(),
    });
  }
});

// 3. Database Schema Dictionary & Metadata.
// Internal architecture metadata must not be publicly enumerable.
databaseRouter.get('/schema', requireAuth, (_req: Request, res: Response) => {
  res.json({
    version: '2.5.0',
    engine: 'Hybrid Firestore + Supabase PostgreSQL',
    collections: [
      {
        name: 'users',
        description: 'Perfis de atletas, credenciais e configurações biométricas',
        primaryKey: 'uid (UUID)',
        indexes: ['email', 'createdAt', 'role'],
        fields: ['uid', 'email', 'name', 'gender', 'age', 'weight', 'height', 'goal', 'experienceLevel', 'gymEnvironment', 'createdAt', 'updatedAt']
      },
      {
        name: 'workouts',
        description: 'Planilhas e periodizações de treino ativas geradas pelo Workout Engine',
        path: 'users/{uid}/workouts/active',
        primaryKey: 'programId',
        indexes: ['uid', 'generatedAt', 'frequency'],
        fields: ['id', 'name', 'cycleName', 'frequency', 'days', 'generatedAt', 'updatedAt']
      },
      {
        name: 'exerciseLogs',
        description: 'Registros de séries, repetições, RIR, RPE, volume de carga e fadiga',
        path: 'users/{uid}/exerciseLogs/{logId}',
        primaryKey: 'logId',
        indexes: ['uid', 'date', 'exerciseName', 'muscleGroup'],
        fields: ['id', 'exerciseName', 'muscleGroup', 'date', 'sets', 'totalVolume', 'notes', 'e1RM', 'fatigueLevel', 'rpe']
      },
      {
        name: 'measurements',
        description: 'Histórico de medidas corporais, circunferências e composição de dobras',
        path: 'users/{uid}/measurements/{recordId}',
        primaryKey: 'recordId',
        indexes: ['uid', 'date'],
        fields: ['id', 'date', 'weight', 'bodyFat', 'chest', 'waist', 'arms', 'thighs', 'calves']
      },
      {
        name: 'subscriptions',
        description: 'Estado das assinaturas server-authoritative e histórico de transações',
        path: 'users/{uid}/subscription/current',
        primaryKey: 'subscriptionId',
        indexes: ['uid', 'status', 'tier'],
        fields: ['tier', 'status', 'currentPeriodEnd', 'cancelAtPeriodEnd', 'gateway', 'lastAuditTimestamp']
      },
      {
        name: 'sessions',
        description: 'Sessões ativas em dispositivos e tokens de autorização',
        path: 'users/{uid}/sessions/{sessionId}',
        primaryKey: 'sessionId',
        indexes: ['uid', 'lastActive'],
        fields: ['id', 'name', 'type', 'location', 'lastActive', 'isCurrent', 'createdAt']
      },
      {
        name: 'achievements',
        description: 'Conquistas, insígnias e marcas de sobrecarga desbloqueadas',
        path: 'users/{uid}/achievements/{badgeId}',
        primaryKey: 'badgeId',
        indexes: ['uid', 'unlockedAt'],
        fields: ['id', 'title', 'description', 'category', 'unlockedAt', 'xpValue']
      }
    ]
  });
});

// 4. Data Audit & Integrity Inspector.
// The endpoint validates the submitted payload only; it does not persist or mutate data.
databaseRouter.post('/integrity-check', requireAuth, (req: Request, res: Response) => {
  const { logs, profile, measurements } = req.body || {};

  const issues: { level: 'info' | 'warning' | 'error'; message: string; field?: string }[] = [];
  let checkedRecordsCount = 0;

  if (profile) {
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
      if (!log.exerciseName) {
        issues.push({ level: 'error', message: `Registro de log #${idx + 1} sem nome de exercício associado.` });
      }
      if (!Array.isArray(log.sets) || log.sets.length === 0) {
        issues.push({ level: 'warning', message: `Log #${idx + 1} (${log.exerciseName || 'Desconhecido'}) sem séries computadas.` });
      } else {
        log.sets.forEach((set: any, sIdx: number) => {
          if (typeof set.reps !== 'number' || set.reps <= 0) {
            issues.push({ level: 'warning', message: `Log #${idx + 1}, Série ${sIdx + 1}: contagem de repetições menor ou igual a zero.` });
          }
          if (typeof set.weight === 'number' && set.weight < 0) {
            issues.push({ level: 'error', message: `Log #${idx + 1}, Série ${sIdx + 1}: carga negativa detectada (${set.weight} kg).` });
          }
        });
      }
    });
  }

  if (Array.isArray(measurements)) {
    checkedRecordsCount += measurements.length;
  }

  return res.json({
    status: issues.some(i => i.level === 'error') ? 'needs_repair' : issues.length > 0 ? 'warnings_found' : 'healthy',
    checkedRecordsCount,
    issuesCount: issues.length,
    issues,
    timestamp: new Date().toISOString(),
  });
});
