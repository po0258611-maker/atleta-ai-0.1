import { BioAtlasExercise, BioAtlasFilterOptions } from './bioAtlasTypes';
import { EXERCISE_DATABASE } from '../engine/exerciseData';
import { Exercise, GymEnvironment, MuscleGroup } from '../types';

/**
 * Transforms legacy Exercise schema into structured BioAtlasExercise format
 * separating pure biomechanics from visual media.
 */
export function transformToBioAtlas(ex: Exercise): BioAtlasExercise {
  // Infer joints based on movement pattern and group
  const joints = inferJoints(ex);
  const axis = inferAxis(ex);

  return {
    id: ex.id,
    name: ex.nome,
    nameEnglish: ex.nomeEnglish,
    category: ex.categoria,
    movementPattern: ex.padraoMotor,
    equipment: ex.equipamento,
    difficulty: ex.nivel,
    primaryObjective: (ex.objetivo?.includes('hipertrofia') || ex.objetivo?.includes('Hipertrofia'))
      ? 'hypertrophy'
      : (ex.objetivo?.includes('força') || ex.objetivo?.includes('Força'))
      ? 'strength'
      : 'hypertrophy',

    primaryMuscles: [ex.grupoMuscular],
    secondaryMuscles: ex.musculosSecundarios || [],

    biomechanics: {
      jointsInvolved: joints,
      movementPlane: ex.planoMovimento,
      movementAxis: axis,
      rangeOfMotion: ex.amplitude || 'Amplitude completa dentro da tolerância articular',
      tempoStandard: ex.cadencia || '3-0-1-0',
      recommendedRIRRange: [Math.max(0, ex.rir - 1), ex.rir + 1],
      recommendedRPERange: [Math.max(6, ex.rpe - 1), Math.min(10, ex.rpe + 1)],
      commonBiomechanicalErrors: ex.errosComuns || [],
      fatigueIndex: ex.fatigueIndex || 3,
    },

    executionGuide: {
      summary: ex.execucao,
      stepByStep: ex.passoAPasso || [],
      breathingPattern: ex.respiracao,
      keyCoachingCue: ex.dicaPrincipal || '',
    },

    variations: ex.variacoes || [],
    progressions: inferProgressions(ex),
    regressions: inferRegressions(ex),
    substitutions: ex.substitutos || [],

    media: {
      videoUrl: ex.video,
      youtubeVideoId: ex.youtubeVideoId,
      videoUrlMp4: ex.videoUrlMp4,
      videoLegendaPT: ex.videoLegendaPT,
      imageUrl: ex.imagem,
      imageAnatomical3D: ex.imagemAnatomica3D,
    },

    isFavorite: ex.isFavorite,
  };
}

function inferJoints(ex: Exercise) {
  const list: any[] = [];
  if (ex.padraoMotor === 'squat' || ex.padraoMotor === 'lunge') {
    list.push('hip', 'knee', 'ankle');
  } else if (ex.padraoMotor === 'hinge') {
    list.push('hip', 'knee', 'spine_lumbar');
  } else if (ex.padraoMotor === 'horizontal_push' || ex.padraoMotor === 'vertical_push') {
    list.push('glenohumeral', 'scapulothoracic', 'elbow');
  } else if (ex.padraoMotor === 'horizontal_pull' || ex.padraoMotor === 'vertical_pull') {
    list.push('scapulothoracic', 'glenohumeral', 'elbow');
  } else if (ex.padraoMotor === 'isolation_upper') {
    if (ex.grupoMuscular === 'biceps' || ex.grupoMuscular === 'triceps') list.push('elbow');
    if (ex.grupoMuscular === 'ombros') list.push('glenohumeral');
  } else if (ex.padraoMotor === 'isolation_lower') {
    if (ex.grupoMuscular === 'quadriceps' || ex.grupoMuscular === 'posteriores') list.push('knee');
    if (ex.grupoMuscular === 'gluteos') list.push('hip');
    if (ex.grupoMuscular === 'panturrilhas') list.push('ankle');
  } else {
    list.push('spine_lumbar', 'spine_thoracic');
  }
  return list;
}

function inferAxis(ex: Exercise): any {
  if (ex.planoMovimento === 'sagittal') return 'frontal';
  if (ex.planoMovimento === 'frontal') return 'sagittal';
  if (ex.planoMovimento === 'transverse') return 'longitudinal';
  return 'multi_axial';
}

function inferProgressions(ex: Exercise): string[] {
  if (ex.equipamento === 'dumbbell') return ['Versão com Barra', 'Aumento de Sobrecarga / Tempo Lento'];
  if (ex.equipamento === 'machine') return ['Versão com Halteres / Peso Livre'];
  if (ex.equipamento === 'bodyweight') return ['Versão com Carga Adicional (Colete/Halter)'];
  return ['Variação com Pausa', 'Aumento de Sobrecarga Progressiva'];
}

function inferRegressions(ex: Exercise): string[] {
  if (ex.equipamento === 'barbell') return ['Versão na Máquina ou Halteres com maior estabilidade'];
  if (ex.equipamento === 'dumbbell') return ['Versão no Cabo ou Máquina Articulada'];
  if (ex.categoria === 'compound') return ['Exercício de Isolamento Unilateral'];
  return ['Redução de amplitude técnica'];
}

export class BioAtlasService {
  private static cachedDatabase: BioAtlasExercise[] | null = null;

  /**
   * Returns complete standardized BioAtlas Exercise Catalog without duplicates
   */
  static getExerciseCatalog(): BioAtlasExercise[] {
    if (!this.cachedDatabase) {
      const seenIds = new Set<string>();
      const catalog: BioAtlasExercise[] = [];

      EXERCISE_DATABASE.forEach((ex) => {
        if (!seenIds.has(ex.id)) {
          seenIds.add(ex.id);
          catalog.push(transformToBioAtlas(ex));
        }
      });

      this.cachedDatabase = catalog;
    }
    return this.cachedDatabase;
  }

  /**
   * Filters BioAtlas library by muscle, equipment, pattern, difficulty, objective and search term
   */
  static filterExercises(options: BioAtlasFilterOptions): BioAtlasExercise[] {
    const catalog = this.getExerciseCatalog();
    const {
      muscle = 'all',
      equipment = 'all',
      pattern = 'all',
      difficulty = 'all',
      objective = 'all',
      category = 'all',
      searchTerm = '',
    } = options;

    const term = searchTerm.trim().toLowerCase();

    return catalog.filter((ex) => {
      // Search term filter
      if (term) {
        const matchesName = ex.name.toLowerCase().includes(term);
        const matchesEnglish = ex.nameEnglish?.toLowerCase().includes(term);
        const matchesExecution = ex.executionGuide.summary.toLowerCase().includes(term);
        if (!matchesName && !matchesEnglish && !matchesExecution) return false;
      }

      // Muscle filter
      if (muscle !== 'all') {
        const isPrimary = ex.primaryMuscles.includes(muscle as MuscleGroup);
        const isSecondary = ex.secondaryMuscles.includes(muscle as MuscleGroup);
        if (!isPrimary && !isSecondary) return false;
      }

      // Equipment filter
      if (equipment !== 'all' && ex.equipment !== equipment) return false;

      // Pattern filter
      if (pattern !== 'all' && ex.movementPattern !== pattern) return false;

      // Difficulty filter
      if (difficulty !== 'all' && ex.difficulty !== difficulty) return false;

      // Objective filter
      if (objective !== 'all' && ex.primaryObjective && ex.primaryObjective !== objective) return false;

      // Category filter
      if (category !== 'all' && ex.category !== category) return false;

      return true;
    });
  }

  /**
   * Finds intelligent biomechanical substitutes for an exercise based on environment or limitations
   */
  static findIntelligentSubstitutions(
    exerciseId: string,
    environment?: GymEnvironment
  ): BioAtlasExercise[] {
    const catalog = this.getExerciseCatalog();
    const target = catalog.find((e) => e.id === exerciseId);
    if (!target) return [];

    // 1. Direct explicit substitutions
    const explicitIds = target.substitutions
      .filter((s) => !environment || s.condition === environment || s.condition === 'preference')
      .map((s) => s.replacementId);

    const explicitMatches = catalog.filter((e) => explicitIds.includes(e.id));
    if (explicitMatches.length > 0) return explicitMatches;

    // 2. Dynamic biomechanical match (same primary muscle + same movement pattern)
    return catalog
      .filter(
        (e) =>
          e.id !== target.id &&
          e.primaryMuscles.some((m) => target.primaryMuscles.includes(m)) &&
          e.movementPattern === target.movementPattern
      )
      .slice(0, 3);
  }
}
