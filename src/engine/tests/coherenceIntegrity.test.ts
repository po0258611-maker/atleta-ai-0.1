import assert from 'node:assert/strict';
import { generateFullBodyWorkout } from '../workoutEngineAdaptive';
import {
  validateWorkoutPrescription,
  calculateRealSessionDuration,
  calculateRealSystemicFatigue,
  MUSCLES,
} from '../workoutPrescriptionValidator';
import { repairWorkoutPrescription } from '../workoutEngineBridge';
import { UserProfile, FullBodyProgram } from '../../types';

console.log('===================================================================');
console.log('   ATLETA AI — STAGE 09.3: COHERENCE & INTEGRITY TEST SUITE       ');
console.log('===================================================================\n');

const baseProfile: UserProfile = {
  name: 'Coherence Tester',
  gender: 'male',
  age: 28,
  heightCm: 178,
  weightKg: 75,
  experience: 'intermediate',
  availableDays: 4,
  timePerSessionMin: 60,
  objective: 'hypertrophy',
  environment: 'full_gym',
  priorities: ['peitoral', 'costas'],
  limitations: [],
  forbiddenExercises: [],
  sleepHours: 8,
  stressLevel: 'low',
};

const validProgram: FullBodyProgram = generateFullBodyWorkout(baseProfile);
const baseValidation = validateWorkoutPrescription(validProgram);
assert.equal(baseValidation.valid, true, `Programa base deve ser 100% válido: ${baseValidation.errors.join(', ')}`);
console.log('✓ [0] Programa base gerado é válido.');

// -------------------------------------------------------------------
// 1. COERÊNCIA RIR ↔ RPE
// -------------------------------------------------------------------
console.log('\n--- 1. TESTES DE COERÊNCIA RIR ↔ RPE ---');

// 1.1 Incoerência: RIR 1 com RPE 6 (soma 7, deveria ser 9 ou 10) -> REJECT
const pIncoherentRirRpe = structuredClone(validProgram);
pIncoherentRirRpe.splitDays[0].items[0].targetRIR = 1;
pIncoherentRirRpe.splitDays[0].items[0].targetRPE = 6;
const resIncoherentRirRpe = validateWorkoutPrescription(pIncoherentRirRpe);
assert.equal(resIncoherentRirRpe.valid, false);
assert(resIncoherentRirRpe.errors.some((e) => e.includes('incoerência fisiológica entre RIR')));
console.log('✓ 1.1 Incoerência entre RIR e RPE (RIR 1 com RPE 6) rejeitada com sucesso.');

// 1.2 Reparo automático de RIR ↔ RPE -> PASS
const pRepairedRirRpe = repairWorkoutPrescription(pIncoherentRirRpe);
assert.equal(pRepairedRirRpe.splitDays[0].items[0].targetRPE, 9);
const resRepairedRirRpe = validateWorkoutPrescription(pRepairedRirRpe);
assert.equal(resRepairedRirRpe.valid, true, resRepairedRirRpe.errors.join(', '));
console.log('✓ 1.2 Reparo automático harmoniza RIR 1 com RPE 9 e valida com sucesso.');

// 1.3 Coerência fisiológica exata (RIR 2 com RPE 8, RIR 0 com RPE 10) -> PASS
const pCoherentRirRpe = structuredClone(validProgram);
pCoherentRirRpe.splitDays[0].items[0].targetRIR = 2;
pCoherentRirRpe.splitDays[0].items[0].targetRPE = 8;
const resCoherent = validateWorkoutPrescription(pCoherentRirRpe);
assert.equal(resCoherent.valid, true);
console.log('✓ 1.3 RIR 2 com RPE 8 passa na validação.');

// -------------------------------------------------------------------
// 2. COERÊNCIA OBJETIVO ↔ PRESCRIÇÃO
// -------------------------------------------------------------------
console.log('\n--- 2. TESTES DE COERÊNCIA OBJETIVO ↔ PRESCRIÇÃO ---');

// 2.1 Força com repetições excessivas em exercício composto (ex: 12-15) -> REJECT
const pStrengthHighReps = structuredClone(validProgram);
pStrengthHighReps.profile.objective = 'strength';
const compoundItem = pStrengthHighReps.splitDays[0].items.find((it) => it.exercise.categoria === 'compound')!;
compoundItem.targetReps = '12-15';
const resStrengthHighReps = validateWorkoutPrescription(pStrengthHighReps);
assert.equal(resStrengthHighReps.valid, false);
assert(resStrengthHighReps.errors.some((e) => e.includes('incoerência objetivo ↔ prescrição')));
console.log('✓ 2.1 Exercício composto de força com 12-15 repetições é rejeitado.');

// 2.2 Força com descanso insuficiente em composto (< 90s) -> REJECT
const pStrengthLowRest = structuredClone(validProgram);
pStrengthLowRest.profile.objective = 'strength';
const compoundItem2 = pStrengthLowRest.splitDays[0].items.find((it) => it.exercise.categoria === 'compound')!;
compoundItem2.targetReps = '4-6';
compoundItem2.targetRestSec = 60;
// Ajusta estimatedTimeMin para isolar o erro de descanso
compoundItem2.targetRestSec = 45;
const resStrengthLowRest = validateWorkoutPrescription(pStrengthLowRest);
assert.equal(resStrengthLowRest.valid, false);
assert(resStrengthLowRest.errors.some((e) => e.includes('descanso de 45s insuficiente')));
console.log('✓ 2.2 Exercício composto de força com 45s de descanso é rejeitado.');

// 2.3 Saúde/condicionamento com repetições máximas de força (1-3 com 300s rest) -> REJECT
const pCondMaxStrength = structuredClone(validProgram);
pCondMaxStrength.profile.objective = 'health';
pCondMaxStrength.splitDays[0].items[0].targetReps = '1-3';
pCondMaxStrength.splitDays[0].items[0].targetRestSec = 300;
const resCond = validateWorkoutPrescription(pCondMaxStrength);
assert.equal(resCond.valid, false);
assert(resCond.errors.some((e) => e.includes('repetições extremas de força')));
console.log('✓ 2.3 Objetivo de saúde com prescrição de força máxima extrema é rejeitado.');

// -------------------------------------------------------------------
// 3. LIMITE FISIOLÓGICO DE REPETIÇÕES
// -------------------------------------------------------------------
console.log('\n--- 3. TESTES DE LIMITE FISIOLÓGICO DE REPETIÇÕES ---');

// 3.1 Repetições abaixo de 1 (ex: 0-5) -> REJECT
const pRepsZero = structuredClone(validProgram);
pRepsZero.splitDays[0].items[0].targetReps = '0-5';
const resRepsZero = validateWorkoutPrescription(pRepsZero);
assert.equal(resRepsZero.valid, false);
assert(resRepsZero.errors.some((e) => e.includes('targetReps inválido') || e.includes('excede o limite fisiológico')));
console.log('✓ 3.1 Reps iniciando em 0 rejeitado.');

// 3.2 Repetições acima de 35 (ex: 40-50) -> REJECT
const pRepsExtreme = structuredClone(validProgram);
pRepsExtreme.splitDays[0].items[0].targetReps = '40-50';
const resRepsExtreme = validateWorkoutPrescription(pRepsExtreme);
assert.equal(resRepsExtreme.valid, false);
assert(resRepsExtreme.errors.some((e) => e.includes('excede o limite fisiológico')));
console.log('✓ 3.2 Reps acima de 35 (40-50) rejeitado.');

// 3.3 Amplitude excessiva (ex: 5-20, delta = 15 > 8) -> REJECT
const pRepsWide = structuredClone(validProgram);
pRepsWide.splitDays[0].items[0].targetReps = '5-20';
const resRepsWide = validateWorkoutPrescription(pRepsWide);
assert.equal(resRepsWide.valid, false);
assert(resRepsWide.errors.some((e) => e.includes('amplitude excessiva')));
console.log('✓ 3.3 Reps com amplitude excessiva (5-20, delta > 8) rejeitado.');

// -------------------------------------------------------------------
// 4. DURAÇÃO REAL × LIMITE DE SESSÃO
// -------------------------------------------------------------------
console.log('\n--- 4. TESTES DE DURAÇÃO REAL × LIMITE DE SESSÃO ---');

// 4.1 estimatedTimeMin divergente da duração real calculada (> 8 min) -> REJECT
const pDurationDivergent = structuredClone(validProgram);
const realTime = calculateRealSessionDuration(pDurationDivergent.splitDays[0].items);
pDurationDivergent.splitDays[0].estimatedTimeMin = realTime + 15;
const resDurationDivergent = validateWorkoutPrescription(pDurationDivergent);
assert.equal(resDurationDivergent.valid, false);
assert(resDurationDivergent.errors.some((e) => e.includes('estimatedTimeMin declarado')));
console.log('✓ 4.1 estimatedTimeMin adulterado com divergência de 15 min é rejeitado.');

// 4.2 Duração real excede limite de sessão do usuário (timePerSessionMin + 15) -> REJECT
const pDurationExceeded = structuredClone(validProgram);
pDurationExceeded.profile.timePerSessionMin = 30; // Max allowed: 45
// Eleva descanso de cada item para 240s para elevar a duração da sessão para além dos 45 min
for (const item of pDurationExceeded.splitDays[0].items) {
  item.targetRestSec = 240;
}
const day0RealTime = calculateRealSessionDuration(pDurationExceeded.splitDays[0].items);
pDurationExceeded.splitDays[0].estimatedTimeMin = day0RealTime;
const resDurationExceeded = validateWorkoutPrescription(pDurationExceeded);
assert.equal(resDurationExceeded.valid, false);
assert(resDurationExceeded.errors.some((e) => e.includes('excede o limite contratado')));
console.log('✓ 4.2 Sessão que excede o limite contratado de 30 min (+15 margem) é rejeitada.');

// -------------------------------------------------------------------
// 5. FADIGA CALCULADA × VALOR DECLARADO
// -------------------------------------------------------------------
console.log('\n--- 5. TESTES DE FADIGA CALCULADA × VALOR DECLARADO ---');

// 5.1 systemicFatigueScore adulterado com divergência > 5 -> REJECT
const pFatigueTampered = structuredClone(validProgram);
const realFatigue = calculateRealSystemicFatigue(pFatigueTampered.splitDays[0].items);
pFatigueTampered.splitDays[0].systemicFatigueScore = realFatigue > 50 ? realFatigue - 20 : realFatigue + 20;
const resFatigueTampered = validateWorkoutPrescription(pFatigueTampered);
assert.equal(resFatigueTampered.valid, false);
assert(resFatigueTampered.errors.some((e) => e.includes('systemicFatigueScore declarado') && e.includes('diverge da fadiga')));
console.log('✓ 5.1 systemicFatigueScore declarado com divergência de 20 pontos é rejeitado.');

// 5.2 systemicFatigueScore coerente com valor calculado -> PASS
const pFatigueAccurate = structuredClone(validProgram);
pFatigueAccurate.splitDays[0].systemicFatigueScore = realFatigue;
const resFatigueAccurate = validateWorkoutPrescription(pFatigueAccurate);
assert.equal(resFatigueAccurate.valid, true);
console.log('✓ 5.2 systemicFatigueScore preciso é aprovado.');

// -------------------------------------------------------------------
// 6. weeklyVolumeMap × SÉRIES REAIS
// -------------------------------------------------------------------
console.log('\n--- 6. TESTES DE weeklyVolumeMap × SÉRIES REAIS ---');

// 6.1 Volume declarado adulterado (ex: peitoral declarado 25 quando real é ~10) -> REJECT
const pVolumeTampered = structuredClone(validProgram);
pVolumeTampered.weeklyVolumeMap.peitoral += 10;
const resVolumeTampered = validateWorkoutPrescription(pVolumeTampered);
assert.equal(resVolumeTampered.valid, false);
assert(resVolumeTampered.errors.some((e) => e.includes('weeklyVolumeMap.peitoral: volume declarado')));
console.log('✓ 6.1 weeklyVolumeMap com valor forjado é detectado e rejeitado.');

// 6.2 Volume declarado coincide exatamente com séries reais calculadas -> PASS
const pVolumeRepaired = repairWorkoutPrescription(pVolumeTampered);
const resVolumeRepaired = validateWorkoutPrescription(pVolumeRepaired);
assert.equal(resVolumeRepaired.valid, true, resVolumeRepaired.errors.join(', '));
console.log('✓ 6.2 weeklyVolumeMap recalculado deterministicamente passa na validação.');

// -------------------------------------------------------------------
// 7. frequencyMap × SESSÕES REAIS
// -------------------------------------------------------------------
console.log('\n--- 7. TESTES DE frequencyMap × SESSÕES REAIS ---');

// 7.1 Frequência declarada adulterada (ex: costas declarada 5 quando real é ~2) -> REJECT
const pFreqTampered = structuredClone(validProgram);
pFreqTampered.frequencyMap.costas += 3;
const resFreqTampered = validateWorkoutPrescription(pFreqTampered);
assert.equal(resFreqTampered.valid, false);
assert(resFreqTampered.errors.some((e) => e.includes('frequencyMap.costas: frequência declarada')));
console.log('✓ 7.1 frequencyMap com frequência forjada é detectada e rejeitada.');

// 7.2 Frequência recalculada deterministicamente -> PASS
const pFreqRepaired = repairWorkoutPrescription(pFreqTampered);
const resFreqRepaired = validateWorkoutPrescription(pFreqRepaired);
assert.equal(resFreqRepaired.valid, true, resFreqRepaired.errors.join(', '));
console.log('✓ 7.2 frequencyMap recalculado deterministicamente passa na validação.');

// -------------------------------------------------------------------
// 8. INTEGRIDADE DOS VALORES DERIVADOS
// -------------------------------------------------------------------
console.log('\n--- 8. TESTES DE INTEGRIDADE DOS VALORES DERIVADOS ---');

// 8.1 focusMuscles omite grupo muscular trabalhado na sessão -> REJECT
const pFocusOmit = structuredClone(validProgram);
const primaryM = pFocusOmit.splitDays[0].items[0].exercise.grupoMuscular;
pFocusOmit.splitDays[0].focusMuscles = pFocusOmit.splitDays[0].focusMuscles.filter((m) => m !== primaryM);
const resFocusOmit = validateWorkoutPrescription(pFocusOmit);
assert.equal(resFocusOmit.valid, false);
assert(resFocusOmit.errors.some((e) => e.includes('focusMuscles omite grupo muscular')));
console.log('✓ 8.1 focusMuscles omitindo grupo muscular trabalhado é rejeitado.');

// 8.2 focusMuscles contém grupo muscular fantasma não trabalhado -> REJECT
const pFocusGhost = structuredClone(validProgram);
const ghostMuscle = MUSCLES.find((m) => !pFocusGhost.splitDays[0].focusMuscles.includes(m))!;
pFocusGhost.splitDays[0].focusMuscles.push(ghostMuscle);
const resFocusGhost = validateWorkoutPrescription(pFocusGhost);
assert.equal(resFocusGhost.valid, false);
assert(resFocusGhost.errors.some((e) => e.includes('focusMuscles contém grupo muscular ausente')));
console.log('✓ 8.2 focusMuscles contendo grupo muscular fantasma é rejeitado.');

// 8.3 cadence ausente ou vazia -> REJECT
const pCadenceMissing = structuredClone(validProgram);
(pCadenceMissing.splitDays[0].items[0] as any).cadence = '';
const resCadenceMissing = validateWorkoutPrescription(pCadenceMissing);
assert.equal(resCadenceMissing.valid, false);
assert(resCadenceMissing.errors.some((e) => e.includes('cadência ausente ou inválida')));
console.log('✓ 8.3 item com cadência vazia é rejeitado.');

// 8.4 orderRationale ausente ou vazio -> REJECT
const pRationaleMissing = structuredClone(validProgram);
(pRationaleMissing.splitDays[0].items[0] as any).orderRationale = '   ';
const resRationaleMissing = validateWorkoutPrescription(pRationaleMissing);
assert.equal(resRationaleMissing.valid, false);
assert(resRationaleMissing.errors.some((e) => e.includes('orderRationale ausente ou vazio')));
console.log('✓ 8.4 item com orderRationale vazio é rejeitado.');

// 8.5 targetWeeklyVolumeMap com valor NaN / negativo -> REJECT
const pTargetVolInvalid = structuredClone(validProgram);
pTargetVolInvalid.targetWeeklyVolumeMap = {
  peitoral: -5,
  costas: 10,
  ombros: 10,
  biceps: 10,
  triceps: 10,
  quadriceps: 10,
  posteriores: 10,
  gluteos: 10,
  panturrilhas: 10,
  core: 10,
};
const resTargetVolInvalid = validateWorkoutPrescription(pTargetVolInvalid);
assert.equal(resTargetVolInvalid.valid, false);
assert(resTargetVolInvalid.errors.some((e) => e.includes('targetWeeklyVolumeMap.peitoral: valor alvo inválido')));
console.log('✓ 8.5 targetWeeklyVolumeMap com valor negativo é rejeitado.');

console.log('\n===================================================================');
console.log('   STAGE 09.3: TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!       ');
console.log('===================================================================\n');
