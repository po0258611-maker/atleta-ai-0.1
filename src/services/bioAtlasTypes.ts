import {
  Gender,
  ExperienceLevel,
  WorkoutGoal,
  GymEnvironment,
  SubscriptionPlanId,
  PaymentMethodType,
  SubscriptionState,
  MuscleGroup,
  MovementPattern,
  MovementPlane,
  ExerciseReplacement,
} from '../types';

/**
 * Biomechanical Joint definition for BioAtlas
 */
export type BiomechanicalJoint =
  | 'glenohumeral' // Ombro
  | 'scapulothoracic' // Escápula
  | 'elbow' // Cotovelo
  | 'radioulnar' // Antebraço
  | 'wrist' // Punho
  | 'hip' // Quadril
  | 'knee' // Joelho
  | 'ankle' // Tornozelo
  | 'spine_cervical'
  | 'spine_thoracic'
  | 'spine_lumbar';

/**
 * Biomechanical Axis definition
 */
export type BiomechanicalAxis = 'frontal' | 'sagittal' | 'longitudinal' | 'multi_axial';

/**
 * BioAtlas Media Asset container (Separates visuals from pure scientific biomechanics)
 */
export interface BioAtlasMedia {
  videoUrl?: string;
  youtubeVideoId?: string;
  videoUrlMp4?: string;
  videoLegendaPT?: string;
  imageUrl?: string;
  imageAnatomical3D?: string;
  thumbnailUrl?: string;
}

/**
 * Scientific Biomechanical Profile
 */
export interface BiomechanicalProfile {
  jointsInvolved: BiomechanicalJoint[];
  movementPlane: MovementPlane;
  movementAxis: BiomechanicalAxis;
  rangeOfMotion: string; // e.g. "0° a 110° de flexão de joelho"
  tempoStandard: string; // e.g. "3-1-1-0" (excêntrica-pausa-concêntrica-topo)
  recommendedRIRRange: [number, number]; // e.g. [1, 3]
  recommendedRPERange: [number, number]; // e.g. [7, 9]
  commonBiomechanicalErrors: string[];
  fatigueIndex: number; // 1 (low) to 5 (extreme CNS / axial load)
}

/**
 * BioAtlas Unified Exercise Schema
 */
export interface BioAtlasExercise {
  // 1. Identifiers & Taxonomy
  id: string;
  name: string;
  nameEnglish?: string;
  category: 'compound' | 'isolation';
  movementPattern: MovementPattern;
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'band' | 'smith';
  difficulty: ExperienceLevel;
  primaryObjective?: WorkoutGoal;

  // 2. Musculoskeletal Targeting
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];

  // 3. Pure Scientific Biomechanics
  biomechanics: BiomechanicalProfile;

  // 4. Execution Protocol
  executionGuide: {
    summary: string;
    stepByStep: string[];
    breathingPattern: string;
    keyCoachingCue: string;
  };

  // 5. Intelligent Trees: Variations, Progressions, Regressions, Substitutions
  variations: string[];
  progressions: string[];
  regressions: string[];
  substitutions: ExerciseReplacement[];

  // 6. Media & Visual Content Layer
  media: BioAtlasMedia;

  // Legacy/UI convenience properties
  isFavorite?: boolean;
}

/**
 * BioAtlas Filter Query Interface
 */
export interface BioAtlasFilterOptions {
  muscle?: MuscleGroup | 'all';
  equipment?: BioAtlasExercise['equipment'] | 'all';
  pattern?: MovementPattern | 'all';
  difficulty?: ExperienceLevel | 'all';
  objective?: WorkoutGoal | 'all';
  category?: 'compound' | 'isolation' | 'all';
  searchTerm?: string;
}
