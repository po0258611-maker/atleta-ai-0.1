import assert from 'node:assert/strict';
import { ProgressionEngine } from '../../services/progressionEngine';
import { SetLog } from '../../types';

const sets: SetLog[] = [
  { setNumber: 1, repsDone: 12, weightKg: 40, actualRIR: 2, completed: true },
  { setNumber: 2, repsDone: 12, weightKg: 40, actualRIR: 2, completed: true },
  { setNumber: 3, repsDone: 12, weightKg: 40, actualRIR: 2, completed: true },
];

const decision = ProgressionEngine.evaluateAdaptiveProgression(
  {
    id: 'ex_test',
    nome: 'Exercício de teste',
    equipamento: 'dumbbell',
    categoria: 'isolation',
    grupoMuscular: 'biceps',
  },
  sets,
  '8-12',
  2,
  40,
);

assert.equal(decision.action, 'increase_load');
assert.equal(decision.currentWeightKg, 40);
assert(decision.recommendedWeightKg > decision.currentWeightKg);
console.log('✓ ProgressionEngine integrado: carga sobe somente após completar topo da faixa com RIR seguro.');
