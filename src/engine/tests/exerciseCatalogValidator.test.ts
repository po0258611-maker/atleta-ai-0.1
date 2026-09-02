import assert from 'node:assert/strict';
import { EXERCISE_DATABASE } from '../exerciseData';
import { validateExerciseCatalog } from '../exerciseCatalogValidator';

const result = validateExerciseCatalog(EXERCISE_DATABASE);
assert.equal(result.valid, true, result.errors.join('\n'));
assert.equal(result.errors.length, 0);
console.log(`✓ Catálogo de exercícios validado: ${EXERCISE_DATABASE.length} registros, sem erros estruturais.`);
console.log(`✓ Warnings de catálogo: ${result.warnings.length}`);
