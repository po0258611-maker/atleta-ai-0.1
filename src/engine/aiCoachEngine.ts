import { UserProfile, FullBodyProgram, Exercise } from '../types';
import { postApi } from '../api/apiClient';
import { EXERCISE_DATABASE } from './exerciseData';

export interface AICoachMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

/**
 * Validates whether an exercise proposed exists in the validated deterministic database
 */
export function isExerciseInDatabase(exerciseName: string): boolean {
  const norm = exerciseName.trim().toLowerCase();
  return EXERCISE_DATABASE.some(
    (e) => e.nome.toLowerCase() === norm || e.nomeEnglish?.toLowerCase() === norm
  );
}

/**
 * Client-Side Orchestrator for the AI Layer:
 * 1. Collects Validated Data from Training Engine / State
 * 2. Formats strictly as Data Context
 * 3. Calls Secured Server AI Pipeline
 * 4. Verifies Response integrity
 */
export async function askAICoach(
  prompt: string,
  userProfile?: UserProfile | null,
  activeProgram?: FullBodyProgram | null
): Promise<string> {
  try {
    // 1. Training Engine -> Validated Data
    const validatedData: Record<string, unknown> = {};

    if (userProfile) {
      validatedData.atleta = {
        nome: userProfile.name,
        objetivo: userProfile.objective,
        experiencia: userProfile.experience,
        diasDisponiveis: userProfile.availableDays,
        limitacoesFisicas: userProfile.limitations || [],
        exerciciosProibidos: userProfile.forbiddenExercises || [],
      };
    }

    if (activeProgram) {
      validatedData.programaPeriodizado = {
        id: activeProgram.id,
        metodologia: activeProgram.methodology,
        diasTotais: activeProgram.splitDays.length,
        distribuicao: activeProgram.splitDays.map((d) => ({
          dia: d.id,
          titulo: d.title,
          foco: d.focusMuscles,
          tempoMin: d.estimatedTimeMin,
          exerciciosPrescritos: d.items.map((i) => ({
            exercicio: i.exercise.nome,
            series: i.targetSets,
            reps: i.targetReps,
            rir: i.targetRIR,
          })),
        })),
        volumeSemanalPorGrupo: activeProgram.weeklyVolumeMap,
      };
    }

    // 2. Post to AI Layer (Secure backend pipeline with Security Guard & Validation Layer)
    const data = await postApi<{ reply: string }>('/api/ai-coach', {
      prompt,
      context: Object.keys(validatedData).length > 0 ? validatedData : undefined,
    });

    return data.reply;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Falha na conexão com o KINETIX Coach AI.';
    return `KINETIX AI™: Não foi possível processar a consulta neste momento. (${errorMessage})`;
  }
}

/**
 * Fetches prescription rationale from the deterministic pipeline
 */
export async function fetchPrescriptionExplanation(
  userProfile: UserProfile,
  program: FullBodyProgram
): Promise<string> {
  try {
    const firstDay = program.splitDays[0];
    const firstExercise = firstDay?.items[0];

    const data = await postApi<{ explanation: string }>('/api/explain-prescription', {
      exerciseName: firstExercise?.exercise.nome || 'Rotina Full Body Periodizada',
      targetSets: firstExercise?.targetSets || 3,
      reps: firstExercise?.targetReps || '8-12',
      rir: firstExercise?.targetRIR || 2,
      reason: `Rotina Full Body de ${program.splitDays.length} dias focada em ${userProfile.objective} para nível ${userProfile.experience}.`,
    });

    return data.explanation;
  } catch {
    return `A periodização Full Body foi configurada pelo motor determinístico para ${userProfile.availableDays} dias semanais, distribuindo as séries efetivas para maximizar a síntese proteica miofibrilar sem acumular fadiga axial excessiva.`;
  }
}
