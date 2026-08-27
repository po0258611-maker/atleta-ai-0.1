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
 * Client-Side Deterministic Sports Science & Nutrition Knowledge Base
 */
export function generateClientCoachAnswer(
  prompt: string,
  userProfile?: UserProfile | null
): string {
  const norm = prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nomeAtleta = userProfile?.name || 'Atleta';
  const peso = userProfile?.weightKg || 75;
  const exp = (userProfile?.experience || 'intermediate').toUpperCase();

  // 1. DIETA FLEXÍVEL & MACRONUTRIENTES / PERDA DE GORDURA
  if (
    norm.includes('dieta') ||
    norm.includes('macro') ||
    norm.includes('gordura') ||
    norm.includes('cutting') ||
    norm.includes('caloria') ||
    norm.includes('perder peso') ||
    norm.includes('emagrecer')
  ) {
    const proteinaG = Math.round(peso * 2.2);
    const gorduraG = Math.round(peso * 0.8);

    return `Olá, **${nomeAtleta}**! Aqui está a estratégia científica para organizar seus macronutrientes na **Dieta Flexível (NutriFlux)** com foco em perda de gordura e preservação muscular:

### 1. Balanço Energético & Déficit Seguro
* **Déficit Calórico Moderado:** Aplique um déficit de **15% a 20% (300 a 500 kcal/dia)** sobre seu Gasto Energético Total. Déficits excessivos reduzem o metabolismo basal e degradam tecido muscular.

### 2. Metas de Macronutrientes (Baseado no seu peso de ${peso}kg)
* **Proteínas (2.0 a 2.4g/kg):** ~**${proteinaG}g/dia**
  * *Função:* Preservação de massa magra sob restrição energética e efeito térmico dos alimentos (TEF).
  * *Fontes:* Frango, ovos, carnes magras, peixes, whey protein, ricota, iogurte desnatado.
* **Gorduras (0.7 a 0.9g/kg):** ~**${gorduraG}g/dia**
  * *Função:* Suporte à síntese hormonal de testosterona e absorção de vitaminas lipossolúveis (A, D, E, K).
  * *Fontes:* Azeite de oliva, ovos inteiros, abacate e castanhas.
* **Carboidratos (Calorias Restantes):**
  * *Função:* Manter os estoques de glicogênio muscular cheios para treinar pesado com RIR 1-2.
  * *Cálculo:* Preencha todas as calorias restantes da meta diária com fontes limpas de carboidratos (arroz, batata, aveia, frutas).

### 3. Fibras e Hidratação
* **Fibras:** **14g para cada 1.000 kcal** (mínimo de 30g/dia para saúde intestinal e saciedade).
* **Água:** **40ml por kg** (~${Math.round((peso * 40) / 100) / 10}L por dia).`;
  }

  // 2. HIPERTROFIA NATURAL & VOLUME DE TREINO
  if (
    norm.includes('hipertrofia') ||
    norm.includes('ganho de massa') ||
    norm.includes('natural') ||
    norm.includes('series') ||
    norm.includes('volume') ||
    norm.includes('split')
  ) {
    return `Olá, **${nomeAtleta}**! Para maximizar seus ganhos de hipertrofia no nível **${exp}**, siga os 3 pilares da literatura científica moderna:

### 1. Volume Efetivo Semanal
* Mantenha entre **12 e 18 séries diretas por grupo muscular por semana**, distribuídas na sua rotina Full Body.
* Séries de alta qualidade próximas da falha recrutam as unidades motoras de alto limiar conforme o *Princípio do Tamanho de Henneman*.

### 2. Proximidade da Falha (RIR 1-2)
* Treine a grande maioria das séries a **1 ou 2 repetições da falha concêntrica (RIR 1-2)**. A falha absoluta (RIR 0) deve ser reservada para a última série de isoladores para evitar fadiga neural prematura.

### 3. Sobrecarga Progressiva Dupla
1. Escolha uma faixa de repetições (ex: 8-12 reps).
2. Progrida em repetições até atingir o topo da faixa em todas as séries.
3. Aumente a carga em **2% a 5%** e reinicie no início da faixa.`;
  }

  // 3. SUPLEMENTAÇÃO CIENTÍFICA
  if (
    norm.includes('suplement') ||
    norm.includes('creatina') ||
    norm.includes('whey') ||
    norm.includes('cafeina') ||
    norm.includes('beta alanina')
  ) {
    return `### Suplementos com Comprovação Científica Máxima (Grau A)

1. **Creatina Monohidratada:**
   * *Dose:* **3g a 5g diários** contínuos.
   * *Mecanismo:* Eleva a fosfocreatina muscular, gerando aumento de força, potência e volume hídrico intracelular.
2. **Whey Protein (Concentrado / Isolado):**
   * *Dose:* **25 a 35g por porção** para atingir o limiar de leucina (~3g), ativando a síntese proteica miofibrilar via mTOR.
3. **Cafeína Anidra:**
   * *Dose:* **3 a 6mg/kg** consumidos 45-60 min antes do treino (aumenta o recrutamento muscular e reduz o esforço percebido).
4. **Beta-Alanina:**
   * *Dose:* **3.2g a 6.4g/dia** fracionados (tamponamento de H+ em séries longas).`;
  }

  // 4. SONO E RECUPERAÇÃO
  if (
    norm.includes('sono') ||
    norm.includes('recupera') ||
    norm.includes('sintese') ||
    norm.includes('fadiga') ||
    norm.includes('descanso')
  ) {
    return `### Otimização do Sono e Recuperação Muscular

* **Duração Ideal:** **7h30 a 9h de sono por noite**. Nas fases de ondas lentas (sono NREM profundo), ocorre a maior secreção do hormônio do crescimento (GH) e reparação do tecido muscular.
* **Higiene do Sono:** Reduza a exposição à luz azul 60 min antes de deitar e mantenha o quarto escuro e refrigerado (18-21°C).
* **Espaçamento Proteico:** Consuma uma refeição proteica (com caseína, ovos ou whey com aveia) cerca de 60-90 minutos antes de dormir para apoiar a síntese proteica noturna.`;
  }

  // 5. RESPOSTA PADRÃO
  return `Olá, **${nomeAtleta}**! Estou pronto para auxiliar na sua evolução no **Treino MAX**.

- **Execução & Biomecânica:** Priorize a amplitude ativa de movimento e o controle da fase excêntrica (2 a 3s).
- **Intensidade & RIR:** Trabalhe no padrão de **RIR 1-2** para otimizar a hipertrofia sem gerar fadiga excessiva no seu nível ${exp}.
- **Nutrição:** Mantenha **2.0g/kg de proteína** e hidratação adequada para sustentar o rendimento do seu programa.

Você pode perguntar sobre cálculos de macros específicos, substituições de exercícios ou ajustes de cargas!`;
}

/**
 * Client-Side Orchestrator for the AI Layer:
 * 1. Collects Validated Data from Training Engine / State
 * 2. Formats strictly as Data Context
 * 3. Calls Secured Server AI Pipeline (Gemini 3.7 Flash)
 * 4. Fallback gracefully to deterministic sports science engine if offline/network error occurs
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

    if (data && data.reply && !data.reply.includes('instabilidade momentânea')) {
      return data.reply;
    }

    // If response was empty or generic, use local deterministic engine
    return generateClientCoachAnswer(prompt, userProfile);
  } catch (err: unknown) {
    // If request failed (e.g. unauthenticated guest, network offline), seamlessly serve intelligent deterministic knowledge
    return generateClientCoachAnswer(prompt, userProfile);
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

