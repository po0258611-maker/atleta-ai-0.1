import { UserProfile, FullBodyProgram, Exercise } from '../types';
import { postApi } from '../api/apiClient';
import { EXERCISE_DATABASE } from './exerciseData';

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
 * Deterministic offline fallback. It is only allowed for transport/model
 * availability failures; authorization, quota and safety decisions fail closed.
 */
export function generateClientCoachAnswer(prompt: string, userProfile?: UserProfile | null): string {
  const norm = prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nomeAtleta = userProfile?.name || 'Atleta';
  const peso = userProfile?.weightKg || 75;
  const exp = (userProfile?.experience || 'intermediate').toUpperCase();

  if (norm.includes('dieta') || norm.includes('macro') || norm.includes('gordura') || norm.includes('cutting') || norm.includes('caloria') || norm.includes('perder peso') || norm.includes('emagrecer')) {
    const proteinaG = Math.round(peso * 2.2);
    const gorduraG = Math.round(peso * 0.8);
    return `Olá, **${nomeAtleta}**! Posso oferecer uma orientação geral, não uma prescrição clínica.\n\nUse o balanço energético, a ingestão adequada de proteína e o acompanhamento da resposta do peso e do desempenho como pontos de partida.\n\n**Referência do perfil:** ${proteinaG} g de proteína e ${gorduraG} g de gordura. Esses valores são apenas uma estimativa inicial e precisam ser ajustados ao contexto individual.`;
  }

  if (norm.includes('hipertrofia') || norm.includes('ganho de massa') || norm.includes('natural') || norm.includes('series') || norm.includes('volume') || norm.includes('split')) {
    return `Olá, **${nomeAtleta}**! Para hipertrofia no nível **${exp}**, priorize volume recuperável, proximidade controlada da falha e progressão consistente. Registre carga, repetições e esforço para orientar os próximos ajustes.`;
  }

  if (norm.includes('suplement') || norm.includes('creatina') || norm.includes('whey') || norm.includes('cafeina') || norm.includes('beta alanina')) {
    return `### Suplementação\nSuplementos devem complementar uma alimentação adequada. A resposta individual, o horário e possíveis contraindicações precisam ser considerados antes do uso.`;
  }

  if (norm.includes('sono') || norm.includes('recupera') || norm.includes('sintese') || norm.includes('fadiga') || norm.includes('descanso')) {
    return `### Recuperação\nMantenha sono regular, monitore o esforço e reduza a exigência quando houver queda persistente de desempenho, dor ou fadiga excessiva.`;
  }

  return `Olá, **${nomeAtleta}**! Priorize técnica consistente, progressão gradual, recuperação adequada e registro do desempenho.`;
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function shouldFailClosed(error: unknown): boolean {
  const status = getHttpStatus(error);
  const code = getErrorCode(error);
  return status === 401 || status === 403 || status === 429 || code === 'QUOTA_SYSTEM_ERROR' || code === 'FEATURE_NOT_IN_PLAN' || code === 'MONTHLY_QUOTA_EXCEEDED';
}

function isFallbackAllowed(error: unknown): boolean {
  if (shouldFailClosed(error)) return false;
  const status = getHttpStatus(error);
  const code = getErrorCode(error);
  return status === undefined || status === 408 || status === 502 || status === 503 || status === 504 || code === 'API_ERROR' || code === 'EMPTY_AI_RESPONSE';
}

export async function askAICoach(prompt: string, userProfile?: UserProfile | null, activeProgram?: FullBodyProgram | null): Promise<string> {
  try {
    const validatedData: Record<string, unknown> = {};
    if (userProfile) {
      validatedData.atleta = {
        nome: userProfile.name,
        objetivo: userProfile.objective,
        experiencia: userProfile.experience,
        diasDisponiveis: userProfile.availableDays,
        pesoKg: userProfile.weightKg,
        alturaCm: userProfile.heightCm,
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
          exerciciosPrescritos: d.items.map((i) => ({ exercicio: i.exercise.nome, series: i.targetSets, reps: i.targetReps, rir: i.targetRIR })),
        })),
        volumeSemanalPorGrupo: activeProgram.weeklyVolumeMap,
      };
    }

    const data = await postApi<{ reply: string }>('/api/ai-coach', {
      prompt,
      context: Object.keys(validatedData).length > 0 ? validatedData : undefined,
    });

    if (!data?.reply) throw new Error('EMPTY_AI_RESPONSE');
    return data.reply;
  } catch (err: unknown) {
    if (!isFallbackAllowed(err)) throw err;
    return generateClientCoachAnswer(prompt, userProfile);
  }
}

export async function fetchPrescriptionExplanation(userProfile: UserProfile, program: FullBodyProgram): Promise<string> {
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
    if (!isFallbackAllowed(err)) throw err;
    return `A periodização Full Body foi configurada pelo motor determinístico para ${userProfile.availableDays} dias semanais, distribuindo o volume conforme objetivo, experiência e recuperação informados.`;
  }
}
