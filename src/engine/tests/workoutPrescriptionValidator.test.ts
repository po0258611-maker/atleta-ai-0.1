import assert from 'node:assert/strict';
import { generateFullBodyWorkout } from '../workoutEngineAdaptive';
import { validateWorkoutPrescription } from '../workoutPrescriptionValidator';
import { repairWorkoutPrescription } from '../workoutEngineBridge';
import { UserProfile } from '../../types';

const profile: UserProfile = {
  name: 'Validation Test',
  gender: 'male',
  age: 30,
  heightCm: 180,
  weightKg: 80,
  experience: 'intermediate',
  availableDays: 4,
  timePerSessionMin: 60,
  objective: 'hypertrophy',
  environment: 'full_gym',
  priorities: ['peitoral', 'costas'],
  limitations: [],
  forbiddenExercises: [],
  sleepHours: 8,
  stressLevel: 'moderate',
};

const program = generateFullBodyWorkout(profile);
const result = validateWorkoutPrescription(program);
assert.equal(result.valid, true, result.errors.join('\n'));
assert.equal(result.errors.length, 0);
console.log('✓ Validador determinístico: programa gerado respeita contratos de séries, ambiente, volume, tempo e fadiga.');

const invalidProgram = structuredClone(program);
invalidProgram.splitDays[0].items[0].targetSets = 6;
const invalidResult = validateWorkoutPrescription(invalidProgram);
assert.equal(invalidResult.valid, false);
assert(invalidResult.errors.some((error) => error.includes('targetSets')));
console.log('✓ Validador detecta violação de série fora do limite.');

// =========================================================================
// STAGE 08.1: TESTES DE REGRESSÃO E DOMÍNIO (FREQUÊNCIA FULL BODY 5X)
// =========================================================================
import { generateFullBodyWorkout as generateV1Legacy } from '../workoutEngine';
import { executeWorkoutPipeline } from '../workoutEngineBridge';
import { WorkoutDay, WorkoutLog } from '../../types';

// TESTE 1: Full Body 2x válido
const profile2x: UserProfile = { ...profile, availableDays: 2 };
const prog2x = generateFullBodyWorkout(profile2x);
const res2x = validateWorkoutPrescription(prog2x);
assert.equal(res2x.valid, true, `TESTE 1 falhou: ${res2x.errors.join(', ')}`);
assert.equal(prog2x.splitDays.length, 2);
console.log('✓ TESTE 1: Full Body 2x válido.');

// TESTE 2: Full Body 3x válido
const profile3x: UserProfile = { ...profile, availableDays: 3 };
const prog3x = generateFullBodyWorkout(profile3x);
const res3x = validateWorkoutPrescription(prog3x);
assert.equal(res3x.valid, true, `TESTE 2 falhou: ${res3x.errors.join(', ')}`);
assert.equal(prog3x.splitDays.length, 3);
console.log('✓ TESTE 2: Full Body 3x válido.');

// TESTE 3: Full Body 4x válido
const profile4x: UserProfile = { ...profile, availableDays: 4 };
const prog4x = generateFullBodyWorkout(profile4x);
const res4x = validateWorkoutPrescription(prog4x);
assert.equal(res4x.valid, true, `TESTE 3 falhou: ${res4x.errors.join(', ')}`);
assert.equal(prog4x.splitDays.length, 4);
console.log('✓ TESTE 3: Full Body 4x válido.');

// TESTE 4: Full Body 5x válido usando rotação cíclica
// 4a. Geração canônica da matriz estrutural (4 templates para rotação de 5 dias)
const profile5x: UserProfile = { ...profile, availableDays: 5 };
const prog5xStructural = generateFullBodyWorkout(profile5x);
const res5xStructural = validateWorkoutPrescription(prog5xStructural);
assert.equal(res5xStructural.valid, true, `TESTE 4 (estrutural) falhou: ${res5xStructural.errors.join(', ')}`);
assert.equal(prog5xStructural.splitDays.length, 4);

// 4b. 5 ocorrências explícitas no split (A -> B -> C -> D -> A)
const prog5xCyclic = structuredClone(prog5xStructural);
const day5OccurrenceA: WorkoutDay = structuredClone(prog5xCyclic.splitDays[0]);
prog5xCyclic.splitDays.push(day5OccurrenceA);
assert.equal(prog5xCyclic.splitDays.length, 5);
const res5xCyclic = validateWorkoutPrescription(prog5xCyclic);
assert.equal(res5xCyclic.valid, true, `TESTE 4 (cíclico) falhou: ${res5xCyclic.errors.join(', ')}`);
console.log('✓ TESTE 4: Full Body 5x válido usando rotação cíclica (templates estruturais e 5 sessões).');

// TESTE 5: 5x não-Full Body não deve ser aceito pela nova exceção
const progNonFullBody = structuredClone(prog5xCyclic) as any;
progNonFullBody.methodology = 'UPPER_LOWER';
const resNonFullBody = validateWorkoutPrescription(progNonFullBody);
assert.equal(resNonFullBody.valid, false);
assert(resNonFullBody.errors.some((e) => e.includes('metodologia')));
console.log('✓ TESTE 5: 5x não-Full Body não deve ser aceito pela nova exceção.');

// TESTE 6: Exercício proibido continua sendo rejeitado
const progForbidden = structuredClone(prog5xCyclic);
progForbidden.profile.forbiddenExercises = [progForbidden.splitDays[0].items[0].exercise.id];
const resForbidden = validateWorkoutPrescription(progForbidden);
assert.equal(resForbidden.valid, false);
assert(resForbidden.errors.some((e) => e.includes('exercício proibido')));
console.log('✓ TESTE 6: Exercício proibido continua sendo rejeitado.');

// TESTE 7: Equipamento incompatível continua sendo rejeitado
const progIncompatibleEq = structuredClone(prog5xCyclic);
progIncompatibleEq.profile.environment = 'home';
progIncompatibleEq.splitDays[0].items[0].exercise.equipamento = 'machine';
const resIncompatibleEq = validateWorkoutPrescription(progIncompatibleEq);
assert.equal(resIncompatibleEq.valid, false);
assert(resIncompatibleEq.errors.some((e) => e.includes('incompatível')));
console.log('✓ TESTE 7: Equipamento incompatível continua sendo rejeitado.');

// TESTE 8: Volume inválido continua sendo rejeitado
const progInvalidVol = structuredClone(prog5xCyclic);
progInvalidVol.splitDays[0].items[0].targetSets = 8;
const resInvalidVol = validateWorkoutPrescription(progInvalidVol);
assert.equal(resInvalidVol.valid, false);
assert(resInvalidVol.errors.some((e) => e.includes('targetSets') || e.includes('séries excedem o orçamento')));
console.log('✓ TESTE 8: Volume inválido continua sendo rejeitado.');

// TESTE 9: Prescrição inválida continua sendo rejeitada
const progInvalidReps = structuredClone(prog5xCyclic);
progInvalidReps.splitDays[0].items[0].targetReps = 'invalido-reps';
const resInvalidReps = validateWorkoutPrescription(progInvalidReps);
assert.equal(resInvalidReps.valid, false);
assert(resInvalidReps.errors.some((e) => e.includes('targetReps inválido')));
console.log('✓ TESTE 9: Prescrição inválida continua sendo rejeitada.');

// TESTE 10: O quinto WorkoutDay é uma ocorrência válida da rotação e não uma nova categoria estrutural inventada
const progInventedCategory = structuredClone(prog5xStructural);
const inventedDay: any = {
  ...structuredClone(progInventedCategory.splitDays[0]),
  id: 'E', // Categoria inventada fora de A, B, C, D
};
progInventedCategory.splitDays.push(inventedDay);
const resInvented = validateWorkoutPrescription(progInventedCategory);
assert.equal(resInvented.valid, false);
assert(resInvented.errors.some((e) => e.includes('template estrutural inválido')));
console.log('✓ TESTE 10: O quinto WorkoutDay é uma ocorrência válida da rotação e não uma nova categoria estrutural inventada.');

// TESTE 11: Histórico/adaptive continua funcionando
const fakeLogs: WorkoutLog[] = [
  {
    id: 'log1',
    date: new Date().toISOString(),
    dayId: 'A',
    durationMin: 50,
    sessionRPE: 7,
    notes: '',
    exerciseLogs: [{ exerciseId: 'supino-reto-barra', exerciseName: 'Supino Reto Barra', sets: [{ setNumber: 1, weightKg: 80, repsDone: 10, completed: true, actualRIR: 2 }] }],
  },
];
const progAdaptive = generateFullBodyWorkout(profile5x, fakeLogs);
const resAdaptive = validateWorkoutPrescription(progAdaptive);
assert.equal(resAdaptive.valid, true, `TESTE 11 falhou: ${resAdaptive.errors.join(', ')}`);
console.log('✓ TESTE 11: Histórico/adaptive continua funcionando.');

// TESTE 12: Fallback V1 continua compatível com o novo comportamento
// 12a. Fallback via pipeline real com V2 simulando falha deve ser validado e produzir V1_FALLBACK
const fallbackRes = executeWorkoutPipeline(profile5x, [], { simulateV2Failure: true });
assert.equal(fallbackRes.source, 'V1_FALLBACK');
assert.equal(fallbackRes.validation.valid, true, `TESTE 12 falhou: ${fallbackRes.validation.errors.join(', ')}`);

// 12b. Segurança do Fallback: prescrição V1 sem reparo com excesso de volume continua sendo rejeitada pelo validador
const progV1Raw = generateV1Legacy(profile5x);
const resV1Raw = validateWorkoutPrescription(progV1Raw);
assert.equal(resV1Raw.valid, false, 'V1 com excesso de volume não pode ser aprovado');
assert(resV1Raw.errors.some((e) => e.includes('séries excedem o orçamento')));
console.log('✓ TESTE 12: Fallback V1 continua compatível e seguro com o novo comportamento.');

// TESTE DE INTEGRAÇÃO DO PIPELINE COM availableDays = 5
const pipelineRes = executeWorkoutPipeline(profile5x);
assert.equal(pipelineRes.validation.valid, true, `Pipeline falhou: ${pipelineRes.validation.errors.join(', ')}`);
assert.equal(pipelineRes.source, 'V2_ADAPTIVE', `Esperado V2_ADAPTIVE, obtido: ${pipelineRes.source}`);
console.log('✓ TESTE DE INTEGRAÇÃO: availableDays = 5 gera com sucesso via V2_ADAPTIVE sem fallback!');

// =========================================================================
// STAGE 09.1: HARDENING DO SAFETY VALIDATOR CORE (TESTES OBRIGATÓRIOS)
// =========================================================================
import { EXERCISE_DATABASE } from '../exerciseData';

// --- A. INPUT MALFORMADO (Nenhum deve lançar TypeError) ---
console.log('\n--- EXECUTANDO TESTES DE INPUT MALFORMADO (STAGE 09.1) ---');

// 1. program null
assert.doesNotThrow(() => {
  const res = validateWorkoutPrescription(null as any);
  assert.equal(res.valid, false);
  assert(res.errors.length > 0);
});
console.log('✓ 1. program null -> valid === false sem TypeError');

// 2. profile null
assert.doesNotThrow(() => {
  const p = structuredClone(prog4x) as any;
  p.profile = null;
  const res = validateWorkoutPrescription(p);
  assert.equal(res.valid, false);
});
console.log('✓ 2. profile null -> valid === false sem TypeError');

// 3. splitDays null
assert.doesNotThrow(() => {
  const p = structuredClone(prog4x) as any;
  p.splitDays = null;
  const res = validateWorkoutPrescription(p);
  assert.equal(res.valid, false);
});
console.log('✓ 3. splitDays null -> valid === false sem TypeError');

// 4. splitDays objeto (não-array)
assert.doesNotThrow(() => {
  const p = structuredClone(prog4x) as any;
  p.splitDays = { A: {} };
  const res = validateWorkoutPrescription(p);
  assert.equal(res.valid, false);
});
console.log('✓ 4. splitDays objeto -> valid === false sem TypeError');

// 5. day.items null
assert.doesNotThrow(() => {
  const p = structuredClone(prog4x) as any;
  p.splitDays[0].items = null;
  const res = validateWorkoutPrescription(p);
  assert.equal(res.valid, false);
});
console.log('✓ 5. day.items null -> valid === false sem TypeError');

// 6. item null
assert.doesNotThrow(() => {
  const p = structuredClone(prog4x) as any;
  p.splitDays[0].items[0] = null;
  const res = validateWorkoutPrescription(p);
  assert.equal(res.valid, false);
});
console.log('✓ 6. item null -> valid === false sem TypeError');

// 7. item.exercise null
assert.doesNotThrow(() => {
  const p = structuredClone(prog4x) as any;
  p.splitDays[0].items[0].exercise = null;
  const res = validateWorkoutPrescription(p);
  assert.equal(res.valid, false);
});
console.log('✓ 7. item.exercise null -> valid === false sem TypeError');

// 8. exercise.id ausente
assert.doesNotThrow(() => {
  const p = structuredClone(prog4x) as any;
  p.splitDays[0].items[0].exercise.id = '';
  const res = validateWorkoutPrescription(p);
  assert.equal(res.valid, false);
  assert(res.errors.some((e: string) => e.includes('exercise.id ausente')));
});
console.log('✓ 8. exercise.id ausente -> valid === false sem TypeError');

// 9. exercise.nome ausente
assert.doesNotThrow(() => {
  const p = structuredClone(prog4x) as any;
  p.splitDays[0].items[0].exercise.nome = '';
  const res = validateWorkoutPrescription(p);
  assert.equal(res.valid, false);
  assert(res.errors.some((e: string) => e.includes('exercise.nome ausente')));
});
console.log('✓ 9. exercise.nome ausente -> valid === false sem TypeError');

// --- B. CATÁLOGO DE EXERCÍCIOS ---
console.log('\n--- EXECUTANDO TESTES DO CATÁLOGO (STAGE 09.1) ---');

// 10. exerciseId válido -> PASS
const pValidCat = structuredClone(prog4x);
const resValidCat = validateWorkoutPrescription(pValidCat);
assert.equal(resValidCat.valid, true);
console.log('✓ 10. exerciseId válido no catálogo -> PASS');

// 11. exerciseId inexistente -> REJECT
const pInexistent = structuredClone(prog4x);
pInexistent.splitDays[0].items[0].exercise.id = 'ex_exercicio_inventado_xyz';
const resInexistent = validateWorkoutPrescription(pInexistent);
assert.equal(resInexistent.valid, false);
assert(resInexistent.errors.some((e) => e.includes('inexistente ou desconhecido no catálogo')));
console.log('✓ 11. exerciseId inexistente no catálogo -> REJECT');

// 12. ID vazio -> REJECT
const pEmptyId = structuredClone(prog4x);
pEmptyId.splitDays[0].items[0].exercise.id = '   ';
const resEmptyId = validateWorkoutPrescription(pEmptyId);
assert.equal(resEmptyId.valid, false);
assert(resEmptyId.errors.some((e) => e.includes('exercise.id ausente ou vazio')));
console.log('✓ 12. ID vazio -> REJECT');

// 13. ID inválido com nome válido -> REJECT
const pFakeIdValidName = structuredClone(prog4x);
pFakeIdValidName.splitDays[0].items[0].exercise.id = 'id_hacker_arbitrario';
pFakeIdValidName.splitDays[0].items[0].exercise.nome = 'Agachamento Livre com Barra';
const resFakeIdValidName = validateWorkoutPrescription(pFakeIdValidName);
assert.equal(resFakeIdValidName.valid, false);
assert(resFakeIdValidName.errors.some((e) => e.includes('inexistente ou desconhecido no catálogo')));
console.log('✓ 13. ID inválido com nome válido -> REJECT');

// --- C. EXERCÍCIOS PROIBIDOS EXPANDIDOS ---
console.log('\n--- EXECUTANDO TESTES DE PROIBIDOS EXPANDIDOS (STAGE 09.1) ---');

// 14. exercício proibido por ID -> REJECT
const pForbidId = structuredClone(prog4x);
pForbidId.profile.forbiddenExercises = ['ex_squat_barbell'];
// Garante que Day 0 possui ex_squat_barbell
pForbidId.splitDays[0].items[0].exercise = structuredClone(EXERCISE_DATABASE.find((e) => e.id === 'ex_squat_barbell')!);
const resForbidId = validateWorkoutPrescription(pForbidId);
assert.equal(resForbidId.valid, false);
assert(resForbidId.errors.some((e) => e.includes('exercício proibido')));
console.log('✓ 14. Proibido por ID oficial -> REJECT');

// 15. proibido por nome PT -> REJECT
const pForbidPt = structuredClone(prog4x);
pForbidPt.profile.forbiddenExercises = ['Agachamento Livre com Barra'];
pForbidPt.splitDays[0].items[0].exercise = structuredClone(EXERCISE_DATABASE.find((e) => e.id === 'ex_squat_barbell')!);
const resForbidPt = validateWorkoutPrescription(pForbidPt);
assert.equal(resForbidPt.valid, false);
assert(resForbidPt.errors.some((e) => e.includes('exercício proibido')));
console.log('✓ 15. Proibido por nome em português -> REJECT');

// 16. proibido via nomeEnglish oficial -> REJECT
const pForbidEn = structuredClone(prog4x);
pForbidEn.profile.forbiddenExercises = ['Barbell Back Squat'];
pForbidEn.splitDays[0].items[0].exercise = structuredClone(EXERCISE_DATABASE.find((e) => e.id === 'ex_squat_barbell')!);
const resForbidEn = validateWorkoutPrescription(pForbidEn);
assert.equal(resForbidEn.valid, false);
assert(resForbidEn.errors.some((e) => e.includes('exercício proibido')));
console.log('✓ 16. Proibido via nomeEnglish oficial -> REJECT');

// 17. proibido via alias/variação oficial existente no catálogo -> REJECT
const pForbidVar = structuredClone(prog4x);
// "Agachamento Frontal" é variação oficial registrada no catálogo de ex_squat_barbell
pForbidVar.profile.forbiddenExercises = ['Agachamento Frontal'];
pForbidVar.splitDays[0].items[0].exercise = structuredClone(EXERCISE_DATABASE.find((e) => e.id === 'ex_squat_barbell')!);
const resForbidVar = validateWorkoutPrescription(pForbidVar);
assert.equal(resForbidVar.valid, false);
assert(resForbidVar.errors.some((e) => e.includes('exercício proibido')));
console.log('✓ 17. Proibido via variação oficial no catálogo -> REJECT');

// 18. casing/acentuação/espaços diferente -> REJECT
const pForbidCase = structuredClone(prog4x);
pForbidCase.profile.forbiddenExercises = ['  bArBeLl   bAcK   sQuAt  '];
pForbidCase.splitDays[0].items[0].exercise = structuredClone(EXERCISE_DATABASE.find((e) => e.id === 'ex_squat_barbell')!);
const resForbidCase = validateWorkoutPrescription(pForbidCase);
assert.equal(resForbidCase.valid, false);
assert(resForbidCase.errors.some((e) => e.includes('exercício proibido')));
console.log('✓ 18. Casing, acentuação e espaços normalizados -> REJECT');

// --- D. DUPLICAÇÃO INTRA-SESSÃO ---
console.log('\n--- EXECUTANDO TESTES DE DUPLICAÇÃO (STAGE 09.1) ---');

// 19. mesmo exerciseId duas vezes na sessão -> REJECT
const pDupId = structuredClone(prog4x);
pDupId.splitDays[0].items[1] = structuredClone(pDupId.splitDays[0].items[0]);
const resDupId = validateWorkoutPrescription(pDupId);
assert.equal(resDupId.valid, false);
assert(resDupId.errors.some((e) => e.includes('exercício duplicado na mesma sessão')));
console.log('✓ 19. Mesmo exerciseId duplicado na sessão -> REJECT');

// 20. duplicação em posições diferentes (primeiro e último) -> REJECT
const pDupPos = structuredClone(prog4x);
const lastIdx = pDupPos.splitDays[0].items.length - 1;
pDupPos.splitDays[0].items[lastIdx] = structuredClone(pDupPos.splitDays[0].items[0]);
const resDupPos = validateWorkoutPrescription(pDupPos);
assert.equal(resDupPos.valid, false);
assert(resDupPos.errors.some((e) => e.includes('exercício duplicado na mesma sessão')));
console.log('✓ 20. Duplicação em posições afastadas na mesma sessão -> REJECT');

// 21. sessões diferentes podem usar o mesmo exercício -> PASS
const pMultiDay = structuredClone(prog4x);
// Day A e Day B usando mesmo exercício em posições isoladas
pMultiDay.splitDays[1].items[0].exercise = structuredClone(pMultiDay.splitDays[0].items[0].exercise);
const repairedMultiDay = repairWorkoutPrescription(pMultiDay);
const resMultiDay = validateWorkoutPrescription(repairedMultiDay);
assert.equal(resMultiDay.valid, true, `Esperado sucesso entre sessões diferentes: ${resMultiDay.errors.join(', ')}`);
console.log('✓ 21. Sessões diferentes podem usar o mesmo exercício conforme metodologia -> PASS');

// 22. cenário de repair produzindo mesmo substituto -> segunda validação REJECT
const pRepairDup = structuredClone(prog4x);
// Simula dois itens no mesmo dia que foram ambos substituídos pelo mesmo exercício canônico
const canonicalSquat = EXERCISE_DATABASE.find((e) => e.id === 'ex_squat_barbell')!;
pRepairDup.splitDays[0].items[0].exercise = structuredClone(canonicalSquat);
pRepairDup.splitDays[0].items[1].exercise = structuredClone(canonicalSquat);
const resRepairDup = validateWorkoutPrescription(pRepairDup);
assert.equal(resRepairDup.valid, false);
assert(resRepairDup.errors.some((e) => e.includes('exercício duplicado na mesma sessão')));
console.log('✓ 22. Cenário de repair produzindo substitutos duplicados é barrado na revalidação -> REJECT');

// --- E. LIMITAÇÕES FÍSICAS ---
console.log('\n--- EXECUTANDO TESTES DE LIMITAÇÕES FÍSICAS (STAGE 09.1) ---');

// 23. Exercício compatível com limitação -> PASS
const profileKneeSafe: UserProfile = { ...profile, limitations: ['joelho'] };
const progKneeSafe = generateFullBodyWorkout(profileKneeSafe);
const resKneeSafe = validateWorkoutPrescription(progKneeSafe);
assert.equal(resKneeSafe.valid, true, `Esperado válido com limitações: ${resKneeSafe.errors.join(', ')}`);
console.log('✓ 23. Exercício compatível com limitações do usuário -> PASS');

// 24. Conflito com joelho (squat/lunge) -> REJECT
const pKneeConflict = structuredClone(prog4x);
pKneeConflict.profile.limitations = ['joelho'];
pKneeConflict.splitDays[0].items[0].exercise = structuredClone(EXERCISE_DATABASE.find((e) => e.padraoMotor === 'squat')!);
const resKneeConflict = validateWorkoutPrescription(pKneeConflict);
assert.equal(resKneeConflict.valid, false);
assert(resKneeConflict.errors.some((e) => e.includes('limitação física')));
console.log('✓ 24a. Conflito com limitação de joelho (squat/lunge) -> REJECT');

// 24b. Conflito com lombar (hinge/squat) -> REJECT
const pLumbarConflict = structuredClone(prog4x);
pLumbarConflict.profile.limitations = ['dor_lombar'];
pLumbarConflict.splitDays[0].items[0].exercise = structuredClone(EXERCISE_DATABASE.find((e) => e.padraoMotor === 'hinge')!);
const resLumbarConflict = validateWorkoutPrescription(pLumbarConflict);
assert.equal(resLumbarConflict.valid, false);
assert(resLumbarConflict.errors.some((e) => e.includes('limitação física')));
console.log('✓ 24b. Conflito com limitação de lombar/coluna (hinge/squat) -> REJECT');

// 24c. Conflito com ombro (vertical_push) -> REJECT
const pShoulderConflict = structuredClone(prog4x);
pShoulderConflict.profile.limitations = ['shoulder pain'];
pShoulderConflict.splitDays[0].items[0].exercise = structuredClone(EXERCISE_DATABASE.find((e) => e.padraoMotor === 'vertical_push')!);
const resShoulderConflict = validateWorkoutPrescription(pShoulderConflict);
assert.equal(resShoulderConflict.valid, false);
assert(resShoulderConflict.errors.some((e) => e.includes('limitação física')));
console.log('✓ 24c. Conflito com limitação de ombro (vertical_push) -> REJECT');

// 24d. Conflito com cotovelo (biceps/triceps) -> REJECT
const pElbowConflict = structuredClone(prog4x);
pElbowConflict.profile.limitations = ['cotovelos'];
pElbowConflict.splitDays[0].items[0].exercise = structuredClone(EXERCISE_DATABASE.find((e) => ['biceps', 'triceps'].includes(e.grupoMuscular))!);
const resElbowConflict = validateWorkoutPrescription(pElbowConflict);
assert.equal(resElbowConflict.valid, false);
assert(resElbowConflict.errors.some((e) => e.includes('limitação física')));
console.log('✓ 24d. Conflito com limitação de cotovelo (biceps/triceps) -> REJECT');

// --- G. TESTE CONTRA FALSA SEGURANÇA (STAGE 09.1 SEÇÃO 9) ---
console.log('\n--- EXECUTANDO TESTES CONTRA FALSA SEGURANÇA (PAYLOAD MANUAL/ADULTERADO) ---');

// Falsa Segurança 1: Exercício inventado injetado em payload manual
const pAdulteratedFake = structuredClone(prog4x);
(pAdulteratedFake.splitDays[0].items[0].exercise as any).id = 'ex_hack_dangerous_injection';
const resAdulteratedFake = validateWorkoutPrescription(pAdulteratedFake);
assert.equal(resAdulteratedFake.valid, false);
assert(resAdulteratedFake.errors.some((e) => e.includes('inexistente ou desconhecido no catálogo')));
console.log('✓ Falsa Segurança 1: Bloqueou exercício forjado em payload adulterado.');

// Falsa Segurança 2: Exercício conflitante com limitação injetado em payload
const pAdulteratedLim = structuredClone(prog4x);
pAdulteratedLim.profile.limitations = ['knee injury'];
pAdulteratedLim.splitDays[0].items[0].exercise = structuredClone(EXERCISE_DATABASE.find((e) => e.id === 'ex_squat_barbell')!);
const resAdulteratedLim = validateWorkoutPrescription(pAdulteratedLim);
assert.equal(resAdulteratedLim.valid, false);
assert(resAdulteratedLim.errors.some((e) => e.includes('limitação física')));
console.log('✓ Falsa Segurança 2: Bloqueou exercício lesivo injetado em payload manual.');

// Falsa Segurança 3: Exercício proibido identificado via nomeEnglish em payload
const pAdulteratedForbid = structuredClone(prog4x);
pAdulteratedForbid.profile.forbiddenExercises = ['Dumbbell Lateral Raise'];
pAdulteratedForbid.splitDays[0].items[0].exercise = structuredClone(EXERCISE_DATABASE.find((e) => e.id === 'ex_lateral_raise_dumbbell')!);
const resAdulteratedForbid = validateWorkoutPrescription(pAdulteratedForbid);
assert.equal(resAdulteratedForbid.valid, false);
assert(resAdulteratedForbid.errors.some((e) => e.includes('exercício proibido')));
console.log('✓ Falsa Segurança 3: Bloqueou exercício proibido especificado por nome em inglês.');

// Falsa Segurança 4: Duplicação forjada no mesmo dia
const pAdulteratedDup = structuredClone(prog4x);
pAdulteratedDup.splitDays[0].items[0].exercise = structuredClone(EXERCISE_DATABASE.find((e) => e.id === 'ex_bench_press_barbell')!);
pAdulteratedDup.splitDays[0].items[2].exercise = structuredClone(EXERCISE_DATABASE.find((e) => e.id === 'ex_bench_press_barbell')!);
const resAdulteratedDup = validateWorkoutPrescription(pAdulteratedDup);
assert.equal(resAdulteratedDup.valid, false);
assert(resAdulteratedDup.errors.some((e) => e.includes('exercício duplicado na mesma sessão')));
console.log('✓ Falsa Segurança 4: Bloqueou duplicação arbitrária injetada em posições diferentes no mesmo dia.');

console.log('\n===================================================================');
console.log('   STAGE 09.1: TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!       ');
console.log('===================================================================\n');


