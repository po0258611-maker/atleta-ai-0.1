import { FirestoreDataService } from './firestoreDataService';
import { UserProfile, FullBodyProgram, WorkoutLog } from '../types';
import { BodyMeasurementRecord } from './bodyMeasurementsService';

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
    exportMetadata: {
      totalLogs: number;
      totalMeasurements: number;
      checksum: string;
    };
  };
}

export interface DatabaseStatusResponse {
  providers: {
    supabase: {
      name: string;
      connected: boolean;
      url: string;
      publishableKeyMasked: string;
      status: string;
      message: string;
      latencyMs: number;
    };
    firestore: {
      name: string;
      connected: boolean;
      projectId: string;
      status: string;
      latencyMs: number;
      features: string[];
    };
    localCache: {
      name: string;
      status: string;
      latencyMs: number;
    };
  };
  timestamp: string;
}

export interface SchemaCollection {
  name: string;
  description: string;
  primaryKey: string;
  path?: string;
  indexes: string[];
  fields: string[];
}

export interface IntegrityCheckResult {
  status: 'healthy' | 'warnings_found' | 'needs_repair';
  checkedRecordsCount: number;
  issuesCount: number;
  issues: { level: 'info' | 'warning' | 'error'; message: string; field?: string }[];
  timestamp: string;
}

export class DatabaseToolsService {
  /**
   * Fetches the overall database infrastructure status from the API.
   */
  static async getDatabaseStatus(): Promise<DatabaseStatusResponse | null> {
    try {
      const res = await fetch('/api/database/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[DatabaseTools] Falha ao obter status do backend:', err);
      return null;
    }
  }

  /**
   * Benchmarks the real-time latency with the database API.
   */
  static async pingDatabase(): Promise<{ roundtripMs: number; status: string }> {
    const startTime = Date.now();
    try {
      const res = await fetch('/api/database/ping');
      if (res.ok) {
        const data = await res.json();
        return { roundtripMs: data.roundtripMs || (Date.now() - startTime), status: data.status || 'good' };
      }
    } catch {
      // Fallback
    }
    const ms = Date.now() - startTime;
    return { roundtripMs: ms, status: ms < 300 ? 'good' : 'fair' };
  }

  /**
   * Retrieves the comprehensive database schema specification.
   */
  static async getSchemaDictionary(): Promise<{ version: string; engine: string; collections: SchemaCollection[] } | null> {
    try {
      const res = await fetch('/api/database/schema');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return {
        version: '2.5.0',
        engine: 'Hybrid Firestore + Supabase PostgreSQL',
        collections: [
          {
            name: 'users',
            description: 'Perfis de atletas, credenciais e configurações biométricas',
            primaryKey: 'uid (UUID)',
            indexes: ['email', 'createdAt'],
            fields: ['uid', 'email', 'name', 'gender', 'age', 'weight', 'height', 'goal', 'experienceLevel', 'gymEnvironment']
          },
          {
            name: 'workouts',
            description: 'Planilhas e periodizações de treino ativas geradas pelo Workout Engine',
            path: 'users/{uid}/workouts/active',
            primaryKey: 'programId',
            indexes: ['uid', 'generatedAt'],
            fields: ['id', 'name', 'cycleName', 'frequency', 'days', 'generatedAt']
          },
          {
            name: 'exerciseLogs',
            description: 'Registros de séries, repetições, RIR, RPE, volume de carga e fadiga',
            path: 'users/{uid}/exerciseLogs/{logId}',
            primaryKey: 'logId',
            indexes: ['uid', 'date', 'exerciseName'],
            fields: ['id', 'exerciseName', 'muscleGroup', 'date', 'sets', 'totalVolume', 'e1RM']
          },
          {
            name: 'measurements',
            description: 'Histórico de medidas corporais e percentuais',
            path: 'users/{uid}/measurements/{recordId}',
            primaryKey: 'recordId',
            indexes: ['uid', 'date'],
            fields: ['id', 'date', 'weight', 'bodyFat', 'chest', 'waist', 'arms', 'thighs']
          }
        ]
      };
    }
  }

  /**
   * Generates a complete backup of athlete records (Profile, Active Workout, Logs, Measurements).
   */
  static async exportFullDatabaseBackup(params: {
    uid: string;
    profile: UserProfile | null;
    workoutProgram: FullBodyProgram | null;
    workoutLogs: WorkoutLog[];
  }): Promise<DatabaseBackupPayload> {
    const { uid, profile, workoutProgram, workoutLogs } = params;

    // Load measurements
    let measurements: BodyMeasurementRecord[] = [];
    try {
      const raw = localStorage.getItem(`athleta_ai_body_measurements_${uid}`) || localStorage.getItem('athleta_ai_body_measurements');
      if (raw) measurements = JSON.parse(raw);
    } catch {
      measurements = [];
    }

    const simpleChecksum = btoa(encodeURIComponent(`${uid}_${workoutLogs.length}_${measurements.length}_${Date.now()}`)).slice(0, 16);

    const payload: DatabaseBackupPayload = {
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      app: 'Treino MAX / ATLETA AI Engine',
      uid,
      data: {
        profile,
        workoutProgram,
        workoutLogs,
        measurements,
        exportMetadata: {
          totalLogs: workoutLogs.length,
          totalMeasurements: measurements.length,
          checksum: simpleChecksum,
        }
      }
    };

    return payload;
  }

  /**
   * Triggers the download of a JSON backup file directly in the browser.
   */
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

  /**
   * Exports Workout Logs to CSV format.
   */
  static downloadWorkoutLogsCSV(logs: WorkoutLog[], athleteName?: string) {
    if (!logs || logs.length === 0) return;

    const headers = ['Data', 'Treino', 'Duração (min)', 'Exercício', 'Séries', 'Reps Realizadas', 'Cargas (kg)', 'RIR', 'RPE Sessão', 'Observações'];
    const rows: string[] = [];

    logs.forEach((log) => {
      if (!log.exerciseLogs || log.exerciseLogs.length === 0) {
        rows.push([
          `"${log.date}"`,
          `"Treino ${log.dayId || '-'}"`,
          log.durationMin || 0,
          `"Sem exercícios"`,
          0,
          `"-"`,
          `"-"`,
          `"-"`,
          log.sessionRPE || 0,
          `"${log.notes || ''}"`
        ].join(','));
        return;
      }

      log.exerciseLogs.forEach((ex) => {
        const repsStr = ex.sets.map(s => s.repsDone).join(';');
        const weightsStr = ex.sets.map(s => s.weightKg).join(';');
        const rirStr = ex.sets.map(s => s.actualRIR ?? '-').join(';');
        rows.push([
          `"${log.date}"`,
          `"Treino ${log.dayId || '-'}"`,
          log.durationMin || 0,
          `"${ex.exerciseName}"`,
          ex.sets.length,
          `"${repsStr}"`,
          `"${weightsStr}"`,
          `"${rirStr}"`,
          log.sessionRPE || 0,
          `"${log.notes || ''}"`
        ].join(','));
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

  /**
   * Validates and restores a database backup payload.
   */
  static validateAndParseBackup(jsonText: string): {
    valid: boolean;
    error?: string;
    payload?: DatabaseBackupPayload;
  } {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || !parsed.data) {
        return { valid: false, error: 'Arquivo inválido: estrutura de dados ausente.' };
      }
      if (!parsed.data.profile && !Array.isArray(parsed.data.workoutLogs)) {
        return { valid: false, error: 'Arquivo inválido: nenhum perfil ou registro de treino encontrado.' };
      }
      return { valid: true, payload: parsed as DatabaseBackupPayload };
    } catch (err: any) {
      return { valid: false, error: `Falha ao interpretar JSON: ${err.message}` };
    }
  }

  /**
   * Executes integrity checks and audit for local datasets.
   */
  static async runIntegrityAudit(params: {
    profile: UserProfile | null;
    logs: WorkoutLog[];
    measurements?: BodyMeasurementRecord[];
  }): Promise<IntegrityCheckResult> {
    try {
      const res = await fetch('/api/database/integrity-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback local check
    }

    const issues: { level: 'info' | 'warning' | 'error'; message: string; field?: string }[] = [];
    if (!params.profile?.name) {
      issues.push({ level: 'warning', message: 'Perfil do atleta não possui nome registrado.' });
    }
    if (params.logs.length === 0) {
      issues.push({ level: 'info', message: 'Nenhum registro de treino encontrado no histórico.' });
    }

    return {
      status: issues.length > 0 ? 'warnings_found' : 'healthy',
      checkedRecordsCount: (params.logs.length) + (params.profile ? 1 : 0),
      issuesCount: issues.length,
      issues,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generates realistic sample progression data for testing and demonstrations.
   */
  static generateSampleProgressionData(): {
    logs: WorkoutLog[];
    measurements: BodyMeasurementRecord[];
  } {
    const today = new Date();
    const sampleLogs: WorkoutLog[] = [
      {
        id: `sample_log_1_${Date.now()}`,
        dayId: 'A',
        durationMin: 55,
        sessionRPE: 8,
        notes: 'Treino A - Carga base estabelecida com sobrecarga segura.',
        date: new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10),
        exerciseLogs: [
          {
            exerciseId: 'supino_reto_barra',
            exerciseName: 'Supino Reto com Barra',
            sets: [
              { setNumber: 1, repsDone: 8, weightKg: 70, actualRIR: 2, completed: true },
              { setNumber: 2, repsDone: 8, weightKg: 70, actualRIR: 2, completed: true },
              { setNumber: 3, repsDone: 7, weightKg: 70, actualRIR: 1, completed: true },
            ]
          },
          {
            exerciseId: 'puxada_alta_pronada',
            exerciseName: 'Puxada Alta Pronada',
            sets: [
              { setNumber: 1, repsDone: 10, weightKg: 55, actualRIR: 2, completed: true },
              { setNumber: 2, repsDone: 10, weightKg: 55, actualRIR: 2, completed: true },
            ]
          }
        ]
      },
      {
        id: `sample_log_2_${Date.now()}`,
        dayId: 'B',
        durationMin: 60,
        sessionRPE: 8.5,
        notes: 'Treino B - Foco em extensão e estabilização de core.',
        date: new Date(today.getTime() - 5 * 86400000).toISOString().slice(0, 10),
        exerciseLogs: [
          {
            exerciseId: 'agachamento_livre_barra',
            exerciseName: 'Agachamento Livre com Barra',
            sets: [
              { setNumber: 1, repsDone: 6, weightKg: 90, actualRIR: 3, completed: true },
              { setNumber: 2, repsDone: 6, weightKg: 90, actualRIR: 2, completed: true },
              { setNumber: 3, repsDone: 6, weightKg: 90, actualRIR: 2, completed: true },
            ]
          }
        ]
      },
      {
        id: `sample_log_3_${Date.now()}`,
        dayId: 'C',
        durationMin: 50,
        sessionRPE: 8,
        notes: 'Treino C - Sobrecarga progressiva aplicada (+2.5kg no Supino).',
        date: new Date(today.getTime() - 2 * 86400000).toISOString().slice(0, 10),
        exerciseLogs: [
          {
            exerciseId: 'supino_reto_barra',
            exerciseName: 'Supino Reto com Barra',
            sets: [
              { setNumber: 1, repsDone: 8, weightKg: 72.5, actualRIR: 2, completed: true },
              { setNumber: 2, repsDone: 8, weightKg: 72.5, actualRIR: 2, completed: true },
              { setNumber: 3, repsDone: 8, weightKg: 72.5, actualRIR: 1, completed: true },
            ]
          }
        ]
      },
      {
        id: `sample_log_4_${Date.now()}`,
        dayId: 'D',
        durationMin: 55,
        sessionRPE: 7.5,
        notes: 'Treino D - Final de microciclo de choque com excelência.',
        date: new Date(today.getTime() - 1 * 86400000).toISOString().slice(0, 10),
        exerciseLogs: [
          {
            exerciseId: 'elevacao_lateral_halteres',
            exerciseName: 'Elevação Lateral com Halteres',
            sets: [
              { setNumber: 1, repsDone: 12, weightKg: 12, actualRIR: 2, completed: true },
              { setNumber: 2, repsDone: 12, weightKg: 12, actualRIR: 2, completed: true },
            ]
          }
        ]
      }
    ];

    const sampleMeasurements: BodyMeasurementRecord[] = [
      {
        id: `meas_1_${Date.now()}`,
        userId: 'sample_user',
        date: new Date(today.getTime() - 14 * 86400000).toISOString().slice(0, 10),
        weightKg: 76.5,
        heightCm: 176,
        bodyFatPercentage: 15.2,
        chestCm: 101,
        waistCm: 82,
        armCm: 37,
        thighCm: 57,
      },
      {
        id: `meas_2_${Date.now()}`,
        userId: 'sample_user',
        date: new Date(today.getTime() - 1 * 86400000).toISOString().slice(0, 10),
        weightKg: 77.2,
        heightCm: 176,
        bodyFatPercentage: 14.8,
        chestCm: 102.5,
        waistCm: 81.5,
        armCm: 37.6,
        thighCm: 57.8,
      }
    ];

    return { logs: sampleLogs, measurements: sampleMeasurements };
  }
}
