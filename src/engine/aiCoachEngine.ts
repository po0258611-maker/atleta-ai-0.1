import { UserProfile, FullBodyProgram, Exercise, WorkoutLog, AthleteContext } from '../types';
import { postApi } from '../api/apiClient';
import { EXERCISE_DATABASE } from './exerciseData';
import { AthleteContextService } from '../services/athleteContextService';

export interface AICoachMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export function isExerciseInDatabase(exerciseName: string): boolean {
  const norm = exerciseName.trim().toLowerCase();
  return EXERCISE_DATABASE.some(
    (e) => e.nome.toLowerCase() === norm || e.nomeEnglish?.toLowerCase() === norm
  );
}

/**
 * Client-side deterministic fallback. This is available only when the secured API
 * is temporarily unavailable; it is never used to bypass authentication,
 * entitlement, quota, or rate-limit decisions returned by the backend.
 */
export function generateClientCoachAnswer(
  prompt: string,
  userProfile?: UserProfile | null
): string {
  const norm = prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nomeAtleta = userProfile?.name || 'Atleta';
  const peso = userProfile?.weightKg || 75;
  const exp = (userProfile?.experience || 'intermediate').toUpperCase();

  if (
    norm.includes('dieta') || norm.includes('macro') || norm.includes('gordura') ||
    norm.includes('cutting') || norm.includes('caloria') || norm.includes('perder peso') ||
    norm.includes('emagrecer')
  ) {
    const proteinaG = Math.round(peso * 2.2);
    const gorduraG = Math.round(peso * 0.8);
    return `Olá, **${nomeAtleta}**! Aqui está uma orientação geral para organizar sua estratégia alimentar:

### 1. Balanço energético
Use um déficit moderado quando o objetivo for perda de gordura e monitore a resposta do peso e do desempenho.

### 2. Proteína e gordura
Como ponto de partida, uma faixa individualizada de proteína e uma ingestão adequada de gordura podem ser definidas de acordo com peso, objetivo e contexto.

### 3. Carboidratos e hidratação
Distribua o restante das calorias entre carboidratos e demais alimentos da sua preferência, mantendo hidratação e fibras adequadas.

**Estimativa do seu perfil:** ${proteinaG} g de proteína e ${gorduraG} g de gordura são apenas referências iniciais e devem ser ajustadas conforme sua resposta.`;
  }

  if (
    norm.includes('hipertrofia') || norm.includes('ganho de massa') || norm.includes('natural') ||
    norm.includes('series') || norm.includes('volume') || norm.includes('split')
  ) {
    return `Olá, **${nomeAtleta}**! Para hipertrofia no nível **${exp}**, priorize volume recuperável, proximidade da falha e progressão consistente.

- Use séries de qualidade próximas da falha, evitando transformar todas as séries em esforço máximo.
- Distribua o volume ao longo da semana conforme sua recuperação.
- Progrida repetições ou carga quando a execução permanecer estável.`;
  }

  if (
    norm.includes('suplement') || norm.includes('creatina') || norm.includes('whey') ||
    norm.includes('cafeina') || norm.includes('beta alanina')
  ) {
    return `### Suplementação
A suplementação deve complementar uma dieta adequada, não substituí-la. Creatina monohidratada é uma das opções com melhor evidência para desempenho e força; cafeína pode ajudar no desempenho, mas a tolerância individual e o horário de uso importam.`;
  }

  if (
    norm.includes('sono') || norm.includes('recupera') || norm.includes('sintese') ||
    norm.includes('fadiga') || norm.includes('descanso')
  ) {
    return `### Recuperação
Mantenha sono regular, controle o volume de treino de acordo com sua recuperação e ajuste o programa quando houver queda persistente de desempenho, dor ou fadiga excessiva.`;
  }

  return `Olá, **${nomeAtleta}**! Priorize técnica consistente, progressão gradual, recuperação adequada e registre seu desempenho para orientar os próximos ajustes.`;
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

function shouldFailClosed(error: unknown): boolean {
  const status = getHttpStatus(error);
  return status === 401 || status === 403 || status === 429;
}

export async function askAICoach(
  prompt: string,
  userProfile?: UserProfile | null,
  activeProgram?: FullBodyProgram | null,
  workoutLogs: WorkoutLog[] = []
): Promise<string> {
  try {
    const athleteContext = AthleteContextService.buildAthleteContext(
      userProfile,
      activeProgram,
      workoutLogs
    );

    const data = await postApi<{ reply: string }>('/api/ai-coach', {
      prompt,
      context: athleteContext ? (athleteContext as unknown as Record<string, unknown>) : undefined,
    });

    if (!data?.reply) {
      throw new Error('EMPTY_AI_RESPONSE');
    }

    return data.reply;
  } catch (err: unknown) {
    // Authorization and quota decisions are authoritative. Never bypass them locally.
    if (shouldFailClosed(err)) {
      throw err;
    }

    // Only availability/transient failures may use the offline deterministic fallback.
    return generateClientCoachAnswer(prompt, userProfile);
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
  } catch (err: unknown) {
    if (shouldFailClosed(err)) {
      throw err;
    }
    return `A periodização Full Body foi configurada pelo motor determinístico para ${userProfile.availableDays} dias semanais, distribuindo o volume de acordo com o objetivo e a recuperação informados.`;
  }
}
