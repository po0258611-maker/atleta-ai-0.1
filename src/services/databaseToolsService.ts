import { UserProfile, FullBodyProgram, WorkoutLog } from '../types';
import { BodyMeasurementRecord } from './bodyMeasurementsService';
import { apiRequest } from '../api/apiClient';

export interface DatabaseBackupPayload {
  version: string;
  exportedAt: string;
  app: string;
  uid: string;
  data: {
    profile: UserProfile | null;
    workoutProgram: FullBodyProgram | null;
    workoutLogs: WorkoutLog[];
    measurements: BodyMeasurementRecord[];
    exportMetadata: { totalLogs: number; totalMeasurements: number; checksum: string };
  };
}

export interface DatabaseStatusResponse {
  providers: {
    supabase: { name: string; connected: boolean; url?: string; publishableKeyMasked?: string; status: string; message?: string; latencyMs: number };
    firestore: { name: string; connected: boolean; projectId: string; status: string; latencyMs: number; features?: string[] };
    localCache?: { name: string; status: string; latencyMs: number };
  };
  timestamp: string;
}

export interface SchemaCollection {
  name: string;
  description?: string;
  primaryKey: string;
  path?: string;
  indexes?: string[];
  fields?: string[];
  authority?: string;
}

export interface IntegrityCheckResult {
  status: 'healthy' | 'warnings_found' | 'needs_repair';
  checkedRecordsCount: number;
  issuesCount: number;
  issues: { level: 'info' | 'warning' | 'error'; message: string; field?: string }[];
  timestamp: string;
}

const LOCAL_SCHEMA_FALLBACK = {
  version: '2.6.0',
  engine: 'Firebase Auth + Firestore authoritative persistence; Supabase compatibility layer',
  collections: [
    { name: 'users', description: 'Identidade e metadados mínimos do atleta', primaryKey: 'uid', path: 'users/{uid}', indexes: [], fields: ['uid', 'displayName', 'updatedAt'] },
    { name: 'profile', description: 'Perfil do atleta', primaryKey: 'current', path: 'users/{uid}/profile/current', indexes: [], fields: ['name', 'gender', 'age', 'heightCm', 'weightKg'] },
    { name: 'workouts', description: 'Programa ativo', primaryKey: 'active', path: 'users/{uid}/workouts/active', indexes: [], fields: ['id', 'createdAt', 'methodology', 'splitDays'] },
    { name: 'exerciseLogs', description: 'Histórico de execução dos treinos', primaryKey: 'logId', path: 'users/{uid}/exerciseLogs/{logId}', indexes: ['date'], fields: ['id', 'date', 'dayId', 'exerciseLogs', 'sessionRPE'] },
    { name: 'progression', description: 'Agregados de progresso', primaryKey: 'stats', path: 'users/{uid}/progression/stats', indexes: [], fields: ['totalWorkouts', 'totalVolumeKg', 'currentStreakDays', 'lastWorkoutDate'] },
    { name: 'settings', description: 'Preferências do usuário', primaryKey: 'preferences', path: 'users/{uid}/settings/preferences', indexes: [], fields: ['theme', 'notifications', 'language'] },
    { name: 'measurements', description: 'Medições corporais', primaryKey: 'recordId', path: 'users/{uid}/measurements/{recordId}', indexes: ['date'], fields: ['id', 'date', 'weightKg', 'heightCm'] },
  ],
};

export class DatabaseToolsService {
  static async getDatabaseStatus(): Promise<DatabaseStatusResponse | null> {
    try {
      return await apiRequest<DatabaseStatusResponse>('/api/database/status');
    } catch (err) {
      console.warn('[DatabaseTools] Falha ao obter status do backend:', err);
      return null;
    }
  }

  static async pingDatabase(): Promise<{ roundtripMs: number; status: string }> {
    const startTime = Date.now();
    try {
      const data = await apiRequest<{ roundtripMs: number; status: string }>('/api/database/ping');
      return { roundtripMs: Number.isFinite(data.roundtripMs) ? data.roundtripMs : Date.now() - startTime, status: data.status || 'good' };
    } catch {
      return { roundtripMs: Date.now() - startTime, status: 'unavailable' };
    }
  }

  static async getSchemaDictionary(): Promise<{ version: string; engine: string; collections: SchemaCollection[] } | null> {
    try {
      return await apiRequest<{ version: string; engine: string; collections: SchemaCollection[] }>('/api/database/schema');
    } catch {
      return LOCAL_SCHEMA_FALLBACK;
    }
  }

  static async exportFullDatabaseBackup(params: {
    uid: string;
    profile: UserProfile | null;
    workoutProgram: FullBodyProgram | null;
    workoutLogs: WorkoutLog[];
  }): Promise<DatabaseBackupPayload> {
    const { uid, profile, workoutProgram, workoutLogs } = params;
    let measurements: BodyMeasurementRecord[] = [];

    try {
      const raw = localStorage.getItem(`athleta_ai_body_measurements_${uid}`) || localStorage.getItem('athleta_ai_body_measurements');
      if (raw) measurements = JSON.parse(raw);
    } catch {
      measurements = [];
    }

    const simpleChecksum = btoa(encodeURIComponent(`${uid}_${workoutLogs.length}_${measurements.length}_${Date.now()}`)).slice(0, 16);
    return {
      version: '2.6.0',
      exportedAt: new Date().toISOString(),
      app: 'Treino MAX / ATLETA AI Engine',
      uid,
      data: {
        profile,
        workoutProgram,
        workoutLogs,
        measurements,
        exportMetadata: { totalLogs: workoutLogs.length, totalMeasurements: measurements.length, checksum: simpleChecksum },
      },
    };
  }

  static downloadBackupJSON(payload: DatabaseBackupPayload, athleteName?: string) {
    const sanitizedName = (athleteName || 'atleta').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `backup_treinomax_${sanitizedName}_${dateStr}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static downloadWorkoutLogsCSV(logs: WorkoutLog[], athleteName?: string) {
    if (!logs || logs.length === 0) return;
    const headers = ['Data', 'Treino', 'Duração (min)', 'Exercício', 'Séries', 'Reps Realizadas', 'Cargas (kg)', 'RIR', 'RPE Sessão', 'Observações'];
    const rows: string[] = [];

    logs.forEach((log) => {
      if (!log.exerciseLogs || log.exerciseLogs.length === 0) {
        rows.push([`"${log.date}"`, `"Treino ${log.dayId || '-'}"`, log.durationMin || 0, '"Sem exercícios"', 0, '"-"', '"-"', '"-"', log.sessionRPE || 0, `"${log.notes || ''}"`].join(','));
        return;
      }
      log.exerciseLogs.forEach((ex) => {
        const repsStr = ex.sets.map((s) => s.repsDone).join(';');
        const weightsStr = ex.sets.map((s) => s.weightKg).join(';');
        const rirStr = ex.sets.map((s) => s.actualRIR ?? '-').join(';');
        rows.push([`"${log.date}"`, `"Treino ${log.dayId || '-'}"`, log.durationMin || 0, `"${ex.exerciseName}"`, ex.sets.length, `"${repsStr}"`, `"${weightsStr}"`, `"${rirStr}"`, log.sessionRPE || 0, `"${log.notes || ''}"`].join(','));
      });
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico_treinos_${(athleteName || 'atleta').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static validateAndParseBackup(jsonText: string): { valid: boolean; error?: string; payload?: DatabaseBackupPayload } {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || !parsed.data) return { valid: false, error: 'Arquivo inválido: estrutura de dados ausente.' };
      if (!parsed.data.profile && !Array.isArray(parsed.data.workoutLogs)) return { valid: false, error: 'Arquivo inválido: nenhum perfil ou registro de treino encontrado.' };
      return { valid: true, payload: parsed as DatabaseBackupPayload };
    } catch (err: any) {
      return { valid: false, error: `Falha ao interpretar JSON: ${err.message}` };
    }
  }

  static async runIntegrityAudit(params: { profile: UserProfile | null; logs: WorkoutLog[]; measurements?: BodyMeasurementRecord[] }): Promise<IntegrityCheckResult> {
    try {
      return await apiRequest<IntegrityCheckResult>('/api/database/integrity-check', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    } catch {
      const issues: IntegrityCheckResult['issues'] = [];
      if (!params.profile?.name) issues.push({ level: 'warning', message: 'Perfil do atleta não possui nome registrado.' });
      if (params.logs.length === 0) issues.push({ level: 'info', message: 'Nenhum registro de treino encontrado no histórico.' });
      return {
        status: issues.length > 0 ? 'warnings_found' : 'healthy',
        checkedRecordsCount: params.logs.length + (params.profile ? 1 : 0),
        issuesCount: issues.length,
        issues,
        timestamp: new Date().toISOString(),
      };
    }
  }

  static generateSampleProgressionData(): { logs: WorkoutLog[]; measurements: BodyMeasurementRecord[] } {
    const today = new Date();
    const sampleLogs: WorkoutLog[] = [
      {
        id: `sample_log_1_${Date.now()}`,
        dayId: 'A',
        durationMin: 55,
        sessionRPE: 8,
        notes: 'Treino A - Carga base estabelecida com sobrecarga segura.',
        date: new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10),
        exerciseLogs: [{ exerciseId: 'supino_reto_barra', exerciseName: 'Supino Reto com Barra', sets: [{ setNumber: 1, repsDone: 8, weightKg: 70, actualRIR: 2, completed: true }, { setNumber: 2, repsDone: 8, weightKg: 70, actualRIR: 2, completed: true }, { setNumber: 3, repsDone: 7, weightKg: 70, actualRIR: 1, completed: true }] }],
      },
      {
        id: `sample_log_2_${Date.now()}`,
        dayId: 'B',
        durationMin: 60,
        sessionRPE: 8.5,
        notes: 'Treino B - Foco em extensão e estabilização de core.',
        date: new Date(today.getTime() - 5 * 86400000).toISOString().slice(0, 10),
        exerciseLogs: [{ exerciseId: 'agachamento_livre_barra', exerciseName: 'Agachamento Livre com Barra', sets: [{ setNumber: 1, repsDone: 6, weightKg: 90, actualRIR: 3, completed: true }, { setNumber: 2, repsDone: 6, weightKg: 90, actualRIR: 2, completed: true }, { setNumber: 3, repsDone: 6, weightKg: 90, actualRIR: 2, completed: true }] }],
      },
      {
        id: `sample_log_3_${Date.now()}`,
        dayId: 'C',
        durationMin: 50,
        sessionRPE: 8,
        notes: 'Treino C - Sobrecarga progressiva aplicada (+2.5kg no Supino).',
        date: new Date(today.getTime() - 2 * 86400000).toISOString().slice(0, 10),
        exerciseLogs: [{ exerciseId: 'supino_reto_barra', exerciseName: 'Supino Reto com Barra', sets: [{ setNumber: 1, repsDone: 8, weightKg: 72.5, actualRIR: 2, completed: true }, { setNumber: 2, repsDone: 8, weightKg: 72.5, actualRIR: 2, completed: true }, { setNumber: 3, repsDone: 8, weightKg: 72.5, actualRIR: 1, completed: true }] }],
      },
      {
        id: `sample_log_4_${Date.now()}`,
        dayId: 'D',
        durationMin: 55,
        sessionRPE: 7.5,
        notes: 'Treino D - Final de microciclo de choque com excelência.',
        date: new Date(today.getTime() - 1 * 86400000).toISOString().slice(0, 10),
        exerciseLogs: [{ exerciseId: 'elevacao_lateral_halteres', exerciseName: 'Elevação Lateral com Halteres', sets: [{ setNumber: 1, repsDone: 12, weightKg: 12, actualRIR: 2, completed: true }, { setNumber: 2, repsDone: 12, weightKg: 12, actualRIR: 2, completed: true }] }],
      },
    ];

    const sampleMeasurements: BodyMeasurementRecord[] = [
      { id: `meas_1_${Date.now()}`, userId: 'sample_user', date: new Date(today.getTime() - 14 * 86400000).toISOString().slice(0, 10), weightKg: 76.5, heightCm: 176, bodyFatPercentage: 15.2, chestCm: 101, waistCm: 82, armCm: 37, thighCm: 57 },
      { id: `meas_2_${Date.now()}`, userId: 'sample_user', date: new Date(today.getTime() - 1 * 86400000).toISOString().slice(0, 10), weightKg: 77.2, heightCm: 176, bodyFatPercentage: 14.8, chestCm: 102.5, waistCm: 81.5, armCm: 37.6, thighCm: 57.8 },
    ];

    return { logs: sampleLogs, measurements: sampleMeasurements };
  }
}
