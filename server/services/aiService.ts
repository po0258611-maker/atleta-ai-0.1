import { GoogleGenAI } from '@google/genai';
import { SERVER_CONFIG } from '../config/env';
import { logger } from '../middlewares/logger';

let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error('GEMINI_API_KEY is not configured in backend environment');
      throw new Error('Serviço de Inteligência Artificial indisponível no momento.');
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function generateAICoachResponse(prompt: string, context?: Record<string, unknown>): Promise<string> {
  const ai = getAiClient();

  const systemInstruction = `Você é o KINETIX Coach AI™, o núcleo de inteligência de treinamento físico do ATLETA AI.
Você combina biomecânica de precisão, fisiologia do exercício (evidências científicas de hipertrofia de alto nível) e prescrição determinística.
Diretrizes:
- Responda sempre em português brasileiro de forma direta, técnica e motivadora.
- Seja científico, citando conceitos de RIR, RPE, volume semanal, recuperação e fadiga quando pertinente.
- Não prescreva nem recomende esteroides anabolizantes ou atalhos farmacológicos perigosos.
- Adapte o vocabulário para um atleta em busca de máxima eficiência.`;

  const userContent = context 
    ? `[CONTEXTO DO ATLETA]: ${JSON.stringify(context)}\n\n[DÚVIDA DO ATLETA]: ${prompt}`
    : prompt;

  const response = await ai.models.generateContent({
    model: SERVER_CONFIG.GEMINI_MODEL,
    contents: [userContent],
    config: {
      systemInstruction,
      temperature: 0.7,
    }
  });

  return response.text || 'Não foi possível gerar a resposta. Tente novamente.';
}

export async function explainPrescriptionResponse(exerciseName: string, targetSets: number, reps: string, rir: number, reason: string): Promise<string> {
  const ai = getAiClient();

  const prompt = `Explique em 2 parágrafos curtos e diretos a justificativa fisiológica e biomecânica para prescrever:
- Exercício: ${exerciseName}
- Volume: ${targetSets} séries de ${reps} repetições com RIR ${rir}
- Foco da fase: ${reason}`;

  const response = await ai.models.generateContent({
    model: SERVER_CONFIG.GEMINI_MODEL,
    contents: [prompt],
    config: {
      systemInstruction: 'Você é um biomecânico e fisiologista do exercício sênior. Forneça explicações concisas baseadas em evidências.',
      temperature: 0.6,
    }
  });

  return response.text || 'Prescrição calculada conforme os princípios de sobrecarga progressiva e recuperação neuromuscular.';
}
