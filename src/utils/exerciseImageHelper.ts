import { Exercise, MuscleGroup } from '../types';

/**
 * Muscle group to anatomical image mapping
 */
const MUSCLE_IMAGE_MAP: Record<string, string> = {
  quadriceps: '/images/athletic_squat_3d_1786105958653.jpg',
  gluteos: '/images/athletic_squat_3d_1786105958653.jpg',
  panturrilhas: '/images/athletic_squat_3d_1786105958653.jpg',
  posteriores: '/images/athletic_hinge_3d_1786106034930.jpg',
  lombar: '/images/athletic_hinge_3d_1786106034930.jpg',
  peitoral: '/images/athletic_bench_3d_1786105975477.jpg',
  costas: '/images/athletic_row_3d_1786105987331.jpg',
  dorsais: '/images/athletic_row_3d_1786105987331.jpg',
  trapezio: '/images/athletic_row_3d_1786105987331.jpg',
  ombros: '/images/athletic_overhead_3d_1786105999818.jpg',
  deltoides: '/images/athletic_overhead_3d_1786105999818.jpg',
  biceps: '/images/athletic_arms_3d_1786106010485.jpg',
  triceps: '/images/athletic_arms_3d_1786106010485.jpg',
  antebraco: '/images/athletic_arms_3d_1786106010485.jpg',
  abdominais: '/images/athletic_arms_3d_1786106010485.jpg',
  core: '/images/athletic_arms_3d_1786106010485.jpg',
};

const DEFAULT_IMAGE = '/images/athletic_squat_3d_1786105958653.jpg';

/**
 * Normalizes any exercise image path to a public path accessible in the browser
 */
export function normalizeImagePath(rawPath?: string): string | null {
  if (!rawPath) return null;
  const trimmed = rawPath.trim();
  if (!trimmed) return null;

  // Convert '/src/assets/images/...' or 'src/assets/images/...' to '/images/...'
  if (trimmed.includes('src/assets/images/')) {
    const filename = trimmed.split('src/assets/images/').pop()?.replace(/^\//, '');
    return filename ? `/images/${filename}` : null;
  }

  // If it's already a public path like '/images/...' or 'images/...'
  if (trimmed.startsWith('/images/')) return trimmed;
  if (trimmed.startsWith('images/')) return `/${trimmed}`;

  // If it's an external URL (e.g. http/https)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Gets a guaranteed working image URL for any exercise or muscle group
 */
export function getExerciseImageUrl(
  exercise?: Partial<Exercise> | null,
  fallbackMuscleGroup?: MuscleGroup | string
): string {
  if (exercise) {
    const custom3D = normalizeImagePath(exercise.imagemAnatomica3D);
    if (custom3D) return custom3D;

    const customImg = normalizeImagePath(exercise.imagem);
    if (customImg) return customImg;

    const muscle = exercise.grupoMuscular || fallbackMuscleGroup;
    if (muscle && MUSCLE_IMAGE_MAP[muscle]) {
      return MUSCLE_IMAGE_MAP[muscle];
    }
  }

  if (fallbackMuscleGroup && MUSCLE_IMAGE_MAP[fallbackMuscleGroup]) {
    return MUSCLE_IMAGE_MAP[fallbackMuscleGroup];
  }

  return DEFAULT_IMAGE;
}
