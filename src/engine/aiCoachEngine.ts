import { UserProfile, FullBodyProgram } from '../types';
import { postApi } from '../api/apiClient';

export interface AICoachMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export async function askAICoach(
  prompt: string,
  userProfile?: UserProfile | null,
  activeProgram?: FullBodyProgram | null
): Promise<string> {
  try {
    const context: Record<string, unknown> = {};
    if (userProfile) {
      context.user = {
        name: userProfile.name,
        objective: userProfile.objective,
        experience: userProfile.experience,
        availableDays: userProfile.availableDays,
        limitations: userProfile.limitations,
      };
    }
    if (activeProgram) {
      context.program = {
        id: activeProgram.id,
        methodology: activeProgram.methodology,
        daysCount: activeProgram.splitDays.length,
        splitDays: activeProgram.splitDays.map((d) => ({ id: d.id, title: d.title })),
      };
    }

    const data = await postApi<{ reply: string }>('/api/ai-coach', {
      prompt,
      context: Object.keys(context).length > 0 ? context : undefined,
    });

    return data.reply;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Falha na conexão com o KINETIX Coach AI.';
    return `KINETIX AI™: Não foi possível processar a consulta neste momento. (${errorMessage})`;
  }
}

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
    return `A periodização Full Body foi configurada para ${userProfile.availableDays} dias semanais, distribuindo as séries efetivas para maximizar a síntese proteica miofibrilar sem acumular fadiga axial excessiva.`;
  }
}
