import { FullBodyProgram, MuscleGroup, WorkoutItem, Exercise, WorkoutDay, UserProfile } from '../types';
import { EXERCISE_DATABASE } from './exerciseData';

export interface PrescriptionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const MUSCLES: MuscleGroup[] = [
  'peitoral', 'costas', 'ombros', 'biceps', 'triceps',
  'quadriceps', 'posteriores', 'gluteos', 'panturrilhas', 'core',
];

const VALID_TEMPLATES = new Set(['A', 'B', 'C', 'D']);

const CATALOG_BY_ID = new Map<string, Exercise>(
  EXERCISE_DATABASE.map((ex) => [ex.id.trim().toLowerCase(), ex]),
);

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function parseRange(range: string): [number, number] | null {
  if (typeof range !== 'string') return null;
  const match = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(range);
  if (!match) return null;
  const min = Number(match[1]);
  const max = Number(match[2]);
  return min > 0 && max >= min ? [min, max] : null;
}

export function calculateRealSessionDuration(items: WorkoutItem[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const transition = Math.max(0, items.length - 1) * 60;
  const work = items.reduce((sum, item) => {
    if (!item || typeof item !== 'object') return sum;
    const range = item.targetReps ? parseRange(item.targetReps) : null;
    const midpoint = range ? (range[0] + range[1]) / 2 : 10;
    const workPerSet = Math.min(60, Math.max(20, midpoint * 3.5));
    const sets = Number.isInteger(item.targetSets) && item.targetSets > 0 ? item.targetSets : 0;
    return sum + sets * workPerSet;
  }, 0);
  const rest = items.reduce((sum, item) => {
    if (!item || typeof item !== 'object') return sum;
    const r = Number.isFinite(item.targetRestSec) && item.targetRestSec >= 0 ? item.targetRestSec : 90;
    const sets = Number.isInteger(item.targetSets) && item.targetSets > 0 ? item.targetSets : 0;
    return sum + Math.max(0, sets - 1) * r;
  }, 0);
  const warmup = items.length > 0 ? 300 : 0;
  return Math.ceil((transition + work + rest + warmup) / 60);
}

export function calculateRealSystemicFatigue(items: WorkoutItem[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const weighted = items.reduce((sum, item) => {
    if (!item || typeof item !== 'object') return sum;
    const catalogEx = item.exercise?.id ? CATALOG_BY_ID.get(item.exercise.id.trim().toLowerCase()) : undefined;
    const fIndex = catalogEx?.fatigueIndex ?? item.exercise?.fatigueIndex ?? 3;
    const sets = Number.isInteger(item.targetSets) && item.targetSets > 0 ? item.targetSets : 0;
    return sum + fIndex * sets;
  }, 0);
  const max = items.reduce((sum, item) => {
    if (!item || typeof item !== 'object') return sum;
    const sets = Number.isInteger(item.targetSets) && item.targetSets > 0 ? item.targetSets : 0;
    return sum + 5 * sets;
  }, 0);
  return max > 0 ? Math.round((weighted / max) * 100) : 0;
}

export function calculateRealWeeklyVolume(splitDays: WorkoutDay[]): Record<MuscleGroup, number> {
  const volume = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<MuscleGroup, number>;
  if (!Array.isArray(splitDays)) return volume;
  for (const day of splitDays) {
    if (!day || !Array.isArray(day.items)) continue;
    for (const item of day.items) {
      if (!item?.exercise?.grupoMuscular) continue;
      const primary = item.exercise.grupoMuscular;
      const sets = Number.isInteger(item.targetSets) && item.targetSets > 0 ? item.targetSets : 0;
      if (MUSCLES.includes(primary)) {
        volume[primary] += sets;
      }
      if (Array.isArray(item.exercise.musculosSecundarios)) {
        for (const secondary of item.exercise.musculosSecundarios) {
          if (!MUSCLES.includes(secondary)) continue;
          const factor = item.exercise.categoria === 'isolation'
            ? 0
            : (secondary === 'biceps' || secondary === 'triceps' ? 0.5 : 0.35);
          volume[secondary] += Math.round(sets * factor * 10) / 10;
        }
      }
    }
  }
  for (const m of MUSCLES) {
    volume[m] = Math.round(volume[m] * 10) / 10;
  }
  return volume;
}

export function calculateRealFrequencyMap(splitDays: WorkoutDay[]): Record<MuscleGroup, number> {
  const frequency = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<MuscleGroup, number>;
  if (!Array.isArray(splitDays)) return frequency;
  for (const day of splitDays) {
    if (!day || !Array.isArray(day.items)) continue;
    for (const item of day.items) {
      if (!item?.exercise?.grupoMuscular) continue;
      const primary = item.exercise.grupoMuscular;
      if (MUSCLES.includes(primary)) {
        frequency[primary] += 1;
      }
      if (Array.isArray(item.exercise.musculosSecundarios)) {
        for (const secondary of item.exercise.musculosSecundarios) {
          if (!MUSCLES.includes(secondary)) continue;
          const factor = item.exercise.categoria === 'isolation'
            ? 0
            : (secondary === 'biceps' || secondary === 'triceps' ? 0.5 : 0.35);
          frequency[secondary] += factor;
        }
      }
    }
  }
  for (const m of MUSCLES) {
    frequency[m] = Math.round(frequency[m] * 100) / 100;
  }
  return frequency;
}

function checkLimitationConflict(exercise: Exercise, limitations: unknown): boolean {
  if (!Array.isArray(limitations) || limitations.length === 0) return false;
  const text = limitations
    .filter((val): val is string => typeof val === 'string')
    .map(normalizeText)
    .join(' ');
  if (!text) return false;

  const conflicts: Array<[string[], (e: Exercise) => boolean]> = [
    [['joelho', 'joelhos', 'patela', 'knee', 'knees'], (e) => ['squat', 'lunge'].includes(e.padraoMotor)],
    [['lombar', 'coluna', 'costas baixas', 'lower-back', 'lower back', 'lumbar'], (e) => e.padraoMotor === 'hinge' || e.padraoMotor === 'squat'],
    [['ombro', 'ombros', 'manguito', 'shoulder', 'shoulders'], (e) => e.padraoMotor === 'vertical_push'],
    [['cotovelo', 'cotovelos', 'elbow', 'elbows'], (e) => ['biceps', 'triceps'].includes(e.grupoMuscular)],
  ];

  return conflicts.some(([keywords, predicate]) =>
    keywords.some((keyword) => text.includes(normalizeText(keyword))) && predicate(exercise),
  );
}

function getExerciseRepresentations(exercise: Exercise, catalogEx?: Exercise): Set<string> {
  const reps = new Set<string>();
  if (typeof exercise.id === 'string' && exercise.id.trim()) {
    reps.add(normalizeText(exercise.id));
  }
  if (typeof exercise.nome === 'string' && exercise.nome.trim()) {
    reps.add(normalizeText(exercise.nome));
  }
  if (typeof (exercise as any).nomeEnglish === 'string' && (exercise as any).nomeEnglish.trim()) {
    reps.add(normalizeText((exercise as any).nomeEnglish));
  }
  if (Array.isArray((exercise as any).variacoes)) {
    for (const v of (exercise as any).variacoes) {
      if (typeof v === 'string' && v.trim()) reps.add(normalizeText(v));
    }
  }

  if (catalogEx) {
    if (catalogEx.id) reps.add(normalizeText(catalogEx.id));
    if (catalogEx.nome) reps.add(normalizeText(catalogEx.nome));
    if (catalogEx.nomeEnglish) reps.add(normalizeText(catalogEx.nomeEnglish));
    if (Array.isArray(catalogEx.variacoes)) {
      for (const v of catalogEx.variacoes) {
        if (typeof v === 'string' && v.trim()) reps.add(normalizeText(v));
      }
    }
  }

  return reps;
}

function validateItem(
  item: WorkoutItem,
  path: string,
  errors: string[],
  profile?: UserProfile,
) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    errors.push(`${path}: item de treino ausente ou estrutura inválida.`);
    return;
  }

  if (!Number.isInteger(item.targetSets) || item.targetSets < 2 || item.targetSets > 5) {
    errors.push(`${path}: targetSets deve permanecer entre 2 e 5.`);
  }

  // 1. Limite fisiológico de repetições
  if (typeof item.targetReps !== 'string') {
    errors.push(`${path}: targetReps inválido (${item.targetReps}).`);
  } else {
    const range = parseRange(item.targetReps);
    if (!range) {
      errors.push(`${path}: targetReps inválido (${item.targetReps}).`);
    } else {
      const [minReps, maxReps] = range;
      if (minReps < 1 || maxReps > 35) {
        errors.push(
          `${path}: targetReps (${item.targetReps}) excede o limite fisiológico do treinamento resistido (permitido 1 a 35 reps).`,
        );
      } else if (maxReps - minReps > 8) {
        errors.push(
          `${path}: targetReps (${item.targetReps}) com amplitude excessiva (${maxReps - minReps} reps). Amplitude máxima permitida é de 8 reps.`,
        );
      }
    }
  }

  // 2. Limites de RIR e RPE
  if (!Number.isFinite(item.targetRIR) || item.targetRIR < 0 || item.targetRIR > 5) {
    errors.push(`${path}: targetRIR deve permanecer entre 0 e 5.`);
  }

  if (!Number.isFinite(item.targetRPE) || item.targetRPE < 1 || item.targetRPE > 10) {
    errors.push(`${path}: targetRPE deve permanecer entre 1 e 10.`);
  }

  // 3. Coerência RIR ↔ RPE
  if (Number.isFinite(item.targetRIR) && Number.isFinite(item.targetRPE)) {
    const rirRpeSum = item.targetRIR + item.targetRPE;
    if (Math.abs(rirRpeSum - 10) > 1 || (item.targetRIR <= 4 && rirRpeSum !== 10)) {
      errors.push(
        `${path}: incoerência fisiológica entre RIR (${item.targetRIR}) e RPE (${item.targetRPE}). RPE deve ser coerente com 10 - RIR.`,
      );
    }
  }

  // 4. Limite de descanso
  if (!Number.isFinite(item.targetRestSec) || item.targetRestSec < 0 || item.targetRestSec > 600) {
    errors.push(`${path}: descanso deve permanecer entre 0 e 600 segundos.`);
  }

  // 5. Integridade dos valores derivados de cada item
  if (typeof item.cadence !== 'string' || !item.cadence.trim()) {
    errors.push(`${path}: cadência ausente ou inválida.`);
  }
  if (typeof item.orderRationale !== 'string' || !item.orderRationale.trim()) {
    errors.push(`${path}: orderRationale ausente ou vazio.`);
  }

  if (!item.exercise || typeof item.exercise !== 'object' || Array.isArray(item.exercise)) {
    errors.push(`${path}: exercício ausente ou estrutura inválida.`);
    return;
  }

  if (
    typeof item.exercise.grupoMuscular !== 'string' ||
    item.exercise.grupoMuscular !== item.exercise.grupoMuscular.trim()
  ) {
    errors.push(`${path}: grupoMuscular inválido.`);
  }

  // 6. Coerência Objetivo ↔ Prescrição
  if (profile && typeof profile.objective === 'string') {
    const range = parseRange(item.targetReps);
    const isCompound = item.exercise.categoria === 'compound';

    if (profile.objective === 'strength') {
      if (isCompound) {
        if (range && (range[0] > 8 || range[1] > 10)) {
          errors.push(
            `${path}: incoerência objetivo ↔ prescrição: exercício composto (${item.exercise.nome}) com repetições (${item.targetReps}) excessivas para o objetivo de força.`,
          );
        }
        if (Number.isFinite(item.targetRestSec) && item.targetRestSec < 90) {
          errors.push(
            `${path}: incoerência objetivo ↔ prescrição: descanso de ${item.targetRestSec}s insuficiente para ressíntese de ATP-CP em composto de força (${item.exercise.nome}).`,
          );
        }
      }
    } else if (profile.objective === 'conditioning' || profile.objective === 'health') {
      if (range && range[1] <= 3 && item.targetRestSec >= 240) {
        errors.push(
          `${path}: incoerência objetivo ↔ prescrição: repetições extremas de força (${item.targetReps}) inadequadas para ${profile.objective}.`,
        );
      }
    }
  }
}

export function validateWorkoutPrescription(program: FullBodyProgram): PrescriptionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (!program || typeof program !== 'object' || Array.isArray(program)) {
      return { valid: false, errors: ['Programa ausente ou estrutura inválida.'], warnings };
    }

    if (program.methodology !== 'FULL_BODY') {
      return { valid: false, errors: ['Programa ausente ou metodologia inválida.'], warnings };
    }

    if (!program.profile || typeof program.profile !== 'object' || Array.isArray(program.profile)) {
      return { valid: false, errors: ['Perfil de usuário ausente ou estrutura inválida.'], warnings };
    }

    const availableDays = program.profile.availableDays;
    if (typeof availableDays !== 'number' || ![2, 3, 4, 5].includes(availableDays)) {
      errors.push(`Frequência inválida: ${availableDays}.`);
    }

    if (!Array.isArray(program.splitDays)) {
      errors.push('Estrutura splitDays inválida ou ausente (esperado array).');
      return { valid: false, errors, warnings };
    }

    const expectedDays = availableDays;
    if (expectedDays === 5) {
      // Domínio Full Body: a metodologia possui 4 templates estruturais (A, B, C, D).
      // Para frequência de 5 dias semanais solicitada pelo usuário, é aceita:
      // 1) A representação canônica dos 4 templates estruturais (A, B, C, D) que compõem o ciclo rotacional; ou
      // 2) As 5 ocorrências de sessões semanais geradas pela rotação cíclica dos templates existentes (ex: A, B, C, D, A).
      if (program.splitDays.length !== 4 && program.splitDays.length !== 5) {
        errors.push(`Quantidade de sessões divergente: para Full Body 5x são esperados 4 templates estruturais ou 5 ocorrências rotacionais, recebido ${program.splitDays.length}.`);
      }
    } else if (program.splitDays.length !== expectedDays) {
      errors.push(`Quantidade de sessões divergente: esperado ${expectedDays}, recebido ${program.splitDays.length}.`);
    }

    const allowedEquipment = new Set(
      program.profile.environment === 'full_gym'
        ? ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'smith']
        : program.profile.environment === 'small_gym'
          ? ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band']
          : ['dumbbell', 'bodyweight', 'band'],
    );

    const rawForbidden = Array.isArray(program.profile.forbiddenExercises)
      ? program.profile.forbiddenExercises
      : [];
    const forbiddenSet = new Set(
      rawForbidden
        .filter((val): val is string => typeof val === 'string' && val.trim().length > 0)
        .map(normalizeText),
    );

    const timePerSessionMin = typeof program.profile.timePerSessionMin === 'number'
      ? program.profile.timePerSessionMin
      : 60;
    const sessionBudget = timePerSessionMin <= 30 ? 7
      : timePerSessionMin <= 45 ? 10
        : timePerSessionMin <= 60 ? 14
          : timePerSessionMin <= 75 ? 18 : 22;

    let directSetCount = 0;

    for (let dayIndex = 0; dayIndex < program.splitDays.length; dayIndex++) {
      const day = program.splitDays[dayIndex];
      if (!day || typeof day !== 'object' || Array.isArray(day)) {
        errors.push(`Sessão na posição ${dayIndex}: estrutura de dia inválida ou nula.`);
        continue;
      }

      if (!VALID_TEMPLATES.has(day.id as any)) {
        errors.push(`Sessão ${day.id}: template estrutural inválido. Full Body suporta apenas templates rotacionais A, B, C e D.`);
      }

      if (!Array.isArray(day.items)) {
        errors.push(`Sessão ${day.id || dayIndex}: lista de exercícios (items) ausente ou não é array.`);
        continue;
      }

      const daySets = day.items.reduce(
        (sum, item) => sum + (item && typeof item.targetSets === 'number' ? item.targetSets : 0),
        0,
      );

      if (daySets > sessionBudget) {
        errors.push(`Sessão ${day.id}: ${daySets} séries excedem o orçamento ${sessionBudget}.`);
      }

      if (!Number.isFinite(day.estimatedTimeMin) || day.estimatedTimeMin <= 0) {
        errors.push(`Sessão ${day.id}: estimatedTimeMin inválido.`);
      }

      if (!Number.isFinite(day.systemicFatigueScore) || day.systemicFatigueScore < 0 || day.systemicFatigueScore > 100) {
        errors.push(`Sessão ${day.id}: systemicFatigueScore deve permanecer entre 0 e 100.`);
      }

      // Duração real calculada × limite de sessão e valor declarado
      const realSessionDuration = calculateRealSessionDuration(day.items);
      if (Number.isFinite(day.estimatedTimeMin) && Math.abs(day.estimatedTimeMin - realSessionDuration) > 8) {
        errors.push(
          `Sessão ${day.id}: estimatedTimeMin declarado (${day.estimatedTimeMin} min) diverge da duração real calculada (${realSessionDuration} min).`,
        );
      }
      const maxAllowedSessionTime = timePerSessionMin + 15;
      if (realSessionDuration > maxAllowedSessionTime || day.estimatedTimeMin > maxAllowedSessionTime) {
        errors.push(
          `Sessão ${day.id}: duração (${realSessionDuration} min) excede o limite contratado de ${timePerSessionMin} min (${maxAllowedSessionTime} min máx).`,
        );
      }

      // Fadiga calculada × valor declarado
      const realFatigue = calculateRealSystemicFatigue(day.items);
      if (Number.isFinite(day.systemicFatigueScore) && Math.abs(day.systemicFatigueScore - realFatigue) > 5) {
        errors.push(
          `Sessão ${day.id}: systemicFatigueScore declarado (${day.systemicFatigueScore}) diverge da fadiga calculada (${realFatigue}).`,
        );
      }

      // Integridade dos valores derivados do dia: focusMuscles
      const actualPrimaryMuscles = new Set(
        day.items
          .filter((it) => it && it.exercise && typeof it.exercise.grupoMuscular === 'string')
          .map((it) => it.exercise.grupoMuscular as MuscleGroup),
      );
      if (!Array.isArray(day.focusMuscles) || day.focusMuscles.length === 0) {
        errors.push(`Sessão ${day.id}: focusMuscles ausente ou vazio.`);
      } else {
        const focusSet = new Set(day.focusMuscles);
        for (const m of day.focusMuscles) {
          if (!actualPrimaryMuscles.has(m)) {
            errors.push(`Sessão ${day.id}: focusMuscles contém grupo muscular ausente nos exercícios (${m}).`);
          }
        }
        for (const m of actualPrimaryMuscles) {
          if (!focusSet.has(m)) {
            errors.push(`Sessão ${day.id}: focusMuscles omite grupo muscular trabalhado na sessão (${m}).`);
          }
        }
      }

      // Detecção de duplicação intra-sessão
      const seenExerciseIdsInDay = new Set<string>();
      const seenExerciseNamesInDay = new Set<string>();

      for (let itemIndex = 0; itemIndex < day.items.length; itemIndex++) {
        const item = day.items[itemIndex];
        const path = `${day.id || dayIndex}/${item && item.id ? item.id : `item_${itemIndex}`}`;

        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          errors.push(`${path}: item de treino ausente ou nulo.`);
          continue;
        }

        validateItem(item, path, errors, program.profile);
        if (Number.isInteger(item.targetSets) && item.targetSets >= 0) {
          directSetCount += item.targetSets;
        }

        if (!item.exercise || typeof item.exercise !== 'object' || Array.isArray(item.exercise)) {
          errors.push(`${path}: objeto exercise ausente ou nulo.`);
          continue;
        }

        // 1. Integridade do ID e Nome do exercício
        const rawId = item.exercise.id;
        const rawNome = item.exercise.nome;

        if (typeof rawId !== 'string' || !rawId.trim()) {
          errors.push(`${path}: exercise.id ausente ou vazio.`);
          continue;
        }

        if (typeof rawNome !== 'string' || !rawNome.trim()) {
          errors.push(`${path}: exercise.nome ausente ou vazio.`);
          continue;
        }

        const normalizedId = rawId.trim().toLowerCase();
        const catalogEx = CATALOG_BY_ID.get(normalizedId);

        if (!catalogEx) {
          errors.push(`${path}: exercício inexistente ou desconhecido no catálogo oficial (${rawId}).`);
        }

        // 2. Duplicação intra-sessão (mesmo ID ou mesmo nome normalizado dentro do mesmo dia)
        const normName = normalizeText(rawNome);
        const effectiveCanonicalId = catalogEx ? catalogEx.id : normalizedId;

        if (seenExerciseIdsInDay.has(effectiveCanonicalId) || (normName && seenExerciseNamesInDay.has(normName))) {
          errors.push(`Sessão ${day.id}: exercício duplicado na mesma sessão (${rawNome}).`);
        }
        seenExerciseIdsInDay.add(effectiveCanonicalId);
        if (normName) seenExerciseNamesInDay.add(normName);

        // 3. Exercícios proibidos (ID, nome PT, nomeEnglish, variações/aliases)
        const reps = getExerciseRepresentations(item.exercise, catalogEx);
        let isForbidden = false;
        for (const rep of reps) {
          if (rep && forbiddenSet.has(rep)) {
            isForbidden = true;
            break;
          }
        }
        if (isForbidden) {
          errors.push(`${path}: exercício proibido presente na prescrição (${rawNome}).`);
        }

        // 4. Compatibilidade com Equipamento do Ambiente
        const exerciseEquipment = catalogEx ? catalogEx.equipamento : item.exercise.equipamento;
        if (!exerciseEquipment || !allowedEquipment.has(exerciseEquipment)) {
          errors.push(`${path}: equipamento ${item.exercise.equipamento || 'desconhecido'} incompatível com ${program.profile.environment}.`);
        }

        // 5. Conflito com Limitações Físicas do Perfil
        const exForLimitation = catalogEx || item.exercise;
        if (checkLimitationConflict(exForLimitation, program.profile.limitations)) {
          errors.push(`${path}: exercício conflitante com limitação física do perfil (${rawNome}).`);
        }
      }
    }

    // weeklyVolumeMap × séries reais
    if (!program.weeklyVolumeMap || typeof program.weeklyVolumeMap !== 'object' || Array.isArray(program.weeklyVolumeMap)) {
      errors.push('weeklyVolumeMap ausente ou inválido.');
    } else {
      const fullVolume = calculateRealWeeklyVolume(program.splitDays);
      const seenTemplateIds = new Set<string>();
      const uniqueTemplateDays = program.splitDays.filter((d) => {
        if (!d || !d.id || seenTemplateIds.has(d.id)) return false;
        seenTemplateIds.add(d.id);
        return true;
      });
      const uniqueVolume = calculateRealWeeklyVolume(uniqueTemplateDays);

      for (const muscle of MUSCLES) {
        const volume = program.weeklyVolumeMap[muscle];
        if (!Number.isFinite(volume) || volume < 0) {
          errors.push(`weeklyVolumeMap.${muscle}: volume inválido.`);
        } else {
          const matchFull = Math.abs(volume - fullVolume[muscle]) <= 0.5;
          const matchUnique = Math.abs(volume - uniqueVolume[muscle]) <= 0.5;
          if (!matchFull && !matchUnique) {
            errors.push(
              `weeklyVolumeMap.${muscle}: volume declarado (${volume}) diverge das séries reais calculadas (${fullVolume[muscle]}).`,
            );
          }
        }
      }
    }

    // frequencyMap × sessões reais
    if (!program.frequencyMap || typeof program.frequencyMap !== 'object' || Array.isArray(program.frequencyMap)) {
      errors.push('frequencyMap ausente ou inválido.');
    } else {
      const fullFreq = calculateRealFrequencyMap(program.splitDays);
      const seenTemplateIds = new Set<string>();
      const uniqueTemplateDays = program.splitDays.filter((d) => {
        if (!d || !d.id || seenTemplateIds.has(d.id)) return false;
        seenTemplateIds.add(d.id);
        return true;
      });
      const uniqueFreq = calculateRealFrequencyMap(uniqueTemplateDays);

      for (const muscle of MUSCLES) {
        const freq = program.frequencyMap[muscle];
        if (!Number.isFinite(freq) || freq < 0) {
          errors.push(`frequencyMap.${muscle}: frequência inválida.`);
        } else {
          const matchFull = Math.abs(freq - fullFreq[muscle]) <= 0.5;
          const matchUnique = Math.abs(freq - uniqueFreq[muscle]) <= 0.5;
          if (!matchFull && !matchUnique) {
            errors.push(
              `frequencyMap.${muscle}: frequência declarada (${freq}) diverge dos estímulos reais das sessões (${fullFreq[muscle]}).`,
            );
          }
        }
      }
    }

    // targetWeeklyVolumeMap (se presente)
    if (program.targetWeeklyVolumeMap) {
      if (typeof program.targetWeeklyVolumeMap !== 'object' || Array.isArray(program.targetWeeklyVolumeMap)) {
        errors.push('targetWeeklyVolumeMap deve ser um objeto válido.');
      } else {
        for (const muscle of MUSCLES) {
          const targetVal = program.targetWeeklyVolumeMap[muscle];
          if (typeof targetVal !== 'number' || !Number.isFinite(targetVal) || targetVal < 0) {
            errors.push(`targetWeeklyVolumeMap.${muscle}: valor alvo inválido.`);
          }
        }
      }
    }

    if (directSetCount === 0) warnings.push('Programa sem séries diretas prescritas.');
    if (Array.isArray(program.generationWarnings) && program.generationWarnings.length > 0) {
      warnings.push(...program.generationWarnings);
    }

    return { valid: errors.length === 0, errors, warnings: Array.from(new Set(warnings)) };
  } catch (unexpectedErr) {
    return {
      valid: false,
      errors: [`Erro interno inesperado durante validação de segurança: ${unexpectedErr instanceof Error ? unexpectedErr.message : String(unexpectedErr)}`],
      warnings,
    };
  }
}

