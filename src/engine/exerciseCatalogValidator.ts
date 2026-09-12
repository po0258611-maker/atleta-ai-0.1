import { Exercise } from '../types';

export interface ExerciseCatalogValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateExerciseCatalog(catalog: Exercise[]): ExerciseCatalogValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();

  if (!Array.isArray(catalog) || catalog.length === 0) {
    return { valid: false, errors: ['Catálogo de exercícios vazio ou inválido.'], warnings };
  }

  for (const exercise of catalog) {
    const path = `exercise:${exercise?.id || 'unknown'}`;
    if (!exercise?.id?.trim()) errors.push(`${path}: id obrigatório.`);
    if (!exercise?.nome?.trim()) errors.push(`${path}: nome obrigatório.`);

    const normalizedName = exercise?.nome?.trim().toLowerCase();
    if (exercise?.id && ids.has(exercise.id)) errors.push(`${path}: ID duplicado.`);
    if (exercise?.id) ids.add(exercise.id);
    if (normalizedName && names.has(normalizedName)) warnings.push(`${path}: nome duplicado no catálogo.`);
    if (normalizedName) names.add(normalizedName);

    if (!Number.isInteger(exercise?.rir) || exercise.rir < 0 || exercise.rir > 5) {
      errors.push(`${path}: RIR deve estar entre 0 e 5.`);
    }
    if (!Number.isFinite(exercise?.rpe) || exercise.rpe < 1 || exercise.rpe > 10) {
      errors.push(`${path}: RPE deve estar entre 1 e 10.`);
    }
    if (!Number.isFinite(exercise?.descanso) || exercise.descanso < 0 || exercise.descanso > 600) {
      errors.push(`${path}: descanso deve estar entre 0 e 600 segundos.`);
    }
    if (!Number.isFinite(exercise?.fatigueIndex) || exercise.fatigueIndex < 1 || exercise.fatigueIndex > 5) {
      errors.push(`${path}: fatigueIndex deve estar entre 1 e 5.`);
    }
    if (!Array.isArray(exercise?.musculosSecundarios)) errors.push(`${path}: musculosSecundarios inválidos.`);
    if (!Array.isArray(exercise?.substitutos)) errors.push(`${path}: substitutos inválidos.`);

    for (const replacement of exercise?.substitutos || []) {
      if (!replacement.replacementId?.trim()) {
        errors.push(`${path}: substituição sem replacementId.`);
      }
      if (!Number.isFinite(replacement.equivalenceScore) || replacement.equivalenceScore < 0 || replacement.equivalenceScore > 100) {
        errors.push(`${path}: equivalenceScore de substituição deve estar entre 0 e 100.`);
      }
      if (replacement.originalId && replacement.originalId !== exercise.id) {
        errors.push(`${path}: originalId da substituição não corresponde ao exercício de origem.`);
      }
    }
  }

  for (const exercise of catalog) {
    for (const replacement of exercise.substitutos || []) {
      if (!ids.has(replacement.replacementId)) {
        warnings.push(`exercise:${exercise.id}: substituição ${replacement.replacementId} não existe no catálogo.`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings: Array.from(new Set(warnings)) };
}
