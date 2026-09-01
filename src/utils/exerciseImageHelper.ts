import { Exercise, MuscleGroup } from '../types';

/**
 * Public image root. Using Vite's BASE_URL keeps images working when the app
 * is served from a sub-path (for example, an embedded preview/workspace).
 */
const PUBLIC_BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

function publicImagePath(filename: string): string {
  return `${PUBLIC_BASE_URL}/images/${filename}`.replace(/([^:]\/)\/+/g, '$1');
}

/**
 * Muscle group to anatomical image mapping
 */
const MUSCLE_IMAGE_MAP: Record<string, string> = {
  quadriceps: publicImagePath('athletic_squat_3d_1786105958653.jpg'),
  gluteos: publicImagePath('athletic_squat_3d_1786105958653.jpg'),
  panturrilhas: publicImagePath('athletic_squat_3d_1786105958653.jpg'),
  posteriores: publicImagePath('athletic_hinge_3d_1786106034930.jpg'),
  lombar: publicImagePath('athletic_hinge_3d_1786106034930.jpg'),
  peitoral: publicImagePath('athletic_bench_3d_1786105975477.jpg'),
  costas: publicImagePath('athletic_row_3d_1786105987331.jpg'),
  dorsais: publicImagePath('athletic_row_3d_1786105987331.jpg'),
  trapezio: publicImagePath('athletic_row_3d_1786105987331.jpg'),
  ombros: publicImagePath('athletic_overhead_3d_1786105999818.jpg'),
  deltoides: publicImagePath('athletic_overhead_3d_1786105999818.jpg'),
  biceps: publicImagePath('athletic_arms_3d_1786106010485.jpg'),
  triceps: publicImagePath('athletic_arms_3d_1786106010485.jpg'),
  antebraco: publicImagePath('athletic_arms_3d_1786106010485.jpg'),
  abdominais: publicImagePath('athletic_arms_3d_1786106010485.jpg'),
  core: publicImagePath('athletic_arms_3d_1786106010485.jpg'),
};

const DEFAULT_IMAGE = publicImagePath('athletic_squat_3d_1786105958653.jpg');

/**
 * Converts an internal/public image reference into a browser-accessible path.
 * External URLs and data URLs are preserved unchanged.
 */
export function normalizeImagePath(rawPath?: string): string | null {
  if (!rawPath) return null;
  const trimmed = rawPath.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Convert '/src/assets/images/...' or 'src/assets/images/...' to a public image path.
  if (trimmed.includes('src/assets/images/')) {
    const filename = trimmed.split('src/assets/images/').pop()?.replace(/^\//, '');
    return filename ? publicImagePath(filename) : null;
  }

  // Already rooted in the public images directory. Rebase it through BASE_URL
  // so embedded/sub-path previews do not request the wrong host root.
  if (trimmed.startsWith('/images/')) {
    return `${PUBLIC_BASE_URL}${trimmed}`.replace(/([^:]\/)\/+/g, '$1');
  }

  if (trimmed.startsWith('images/')) {
    return `${PUBLIC_BASE_URL}/${trimmed}`.replace(/([^:]\/)\/+/g, '$1');
  }

  return trimmed;
}

/**
 * Gets a guaranteed image URL for any exercise or muscle group.
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
