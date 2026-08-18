import { FullBodyProgram, UserProfile } from '../types';

export async function askAICoach(
  prompt: string,
  profile: UserProfile,
  program?: FullBodyProgram | null
): Promise<string> {
  try {
    const res = await fetch('/api/ai-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        profile,
        context: program ? { methodology: program.methodology, daysCount: program.splitDays.length } : {},
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao conectar com AI Coach');
    }

    const data = await res.json();
    return data.text || 'Nenhuma resposta retornada.';
  } catch (error: any) {
    console.error('Error fetching AI Coach response:', error);
    return `⚠️ Não foi possível obter resposta em tempo real: ${error.message}. Certifique-se de que a variável GEMINI_API_KEY está configurada no painel de Segredos.`;
  }
}

export async function fetchPrescriptionExplanation(
  profile: UserProfile,
  program: FullBodyProgram
): Promise<string> {
  try {
    const res = await fetch('/api/explain-prescription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile,
        workoutSplit: program.splitDays,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao gerar explicação da prescrição');
    }

    const data = await res.json();
    return data.explanation || 'Explicação técnica indisponível.';
  } catch (error: any) {
    console.error('Error explaining prescription:', error);
    return `Fundamentação técnica simplificada: A rotina Full Body foi gerada respeitando o equilíbrio de estímulo semanal por grupo muscular (${profile.experience.toUpperCase()}) com prioridade em exercícios compostos livres adaptados ao cenário de treino.`;
  }
}
