export type Gender = 'male' | 'female';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutGoal = 'hypertrophy' | 'fat_loss' | 'recomposition' | 'strength' | 'conditioning' | 'health';
export type GymEnvironment = 'full_gym' | 'small_gym' | 'home' | 'minimal';

export type SubscriptionPlanId = 'pro_monthly' | 'pro_annual';
export type PaymentMethodType = 'pix' | 'credit_card' | 'boleto';

export interface SubscriptionState {
  isSubscribed: boolean;
  planId: SubscriptionPlanId;
  planName: string;
  priceBrl: number;
  status: 'active' | 'trialing' | 'canceled' | 'expired';
  billingCycle: 'monthly' | 'yearly';
  renewsAt: string;
  paymentMethod?: PaymentMethodType;
  lastPaymentDate?: string;
  pixQrCodeUrl?: string;
  pixCopiaECola?: string;
}

export type MuscleGroup =
  | 'peitoral'
  | 'costas'
  | 'ombros'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'posteriores'
  | 'gluteos'
  | 'panturrilhas'
  | 'core';

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'isolation_upper'
  | 'isolation_lower'
  | 'core';

export type MovementPlane = 'sagittal' | 'frontal' | 'transverse' | 'multiplanar';

export interface ExerciseReplacement {
  originalId: string;
  replacementId: string;
  replacementName: string;
  condition: GymEnvironment | 'injury' | 'preference';
  equivalenceScore: number;
  notes: string;
}

export interface Exercise {
  id: string;
  nome: string;
  nomeEnglish?: string;
  grupoMuscular: MuscleGroup;
  musculosSecundarios: MuscleGroup[];
  categoria: 'compound' | 'isolation';
  equipamento: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'band' | 'smith';
  nivel: ExperienceLevel;
  tipoMovimento: 'push' | 'pull' | 'legs' | 'core';
  padraoMotor: MovementPattern;
  planoMovimento: MovementPlane;
  execucao: string;
  passoAPasso?: string[];
  objetivo?: string;
  dicaPrincipal?: string;
  respiracao: string;
  amplitude: string;
  cadencia: string;
  rir: number;
  rpe: number;
  descanso: number;
  video?: string;
  youtubeVideoId?: string;
  videoUrlMp4?: string;
  videoLegendaPT?: string;
  imagem?: string;
  imagemAnatomica3D?: string;
  errosComuns: string[];
  variacoes: string[];
  substitutos: ExerciseReplacement[];
  fatigueIndex: number;
  isFavorite?: boolean;
}

export interface UserProfile {
  name: string;
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  experience: ExperienceLevel;
  availableDays: 2 | 3 | 4 | 5;
  timePerSessionMin: 30 | 45 | 60 | 75 | 90;
  objective: WorkoutGoal;
  environment: GymEnvironment;
  priorities: MuscleGroup[];
  limitations: string[];
  forbiddenExercises: string[];
  sleepHours: number;
  stressLevel: 'low' | 'moderate' | 'high';
}

export interface PrescriptionRule {
  id: string;
  name: string;
  description: string;
  scientificBasis: string;
  category: 'volume' | 'order' | 'frequency' | 'intensity' | 'environment';
}

export interface WorkoutItem {
  id: string;
  exercise: Exercise;
  originalExercise?: Exercise;
  targetSets: number;
  targetReps: string;
  targetRIR: number;
  targetRPE: number;
  targetRestSec: number;
  cadence: string;
  orderRationale: string;
  isReplaced?: boolean;
  replacementNotes?: string;
}

export interface WorkoutDay {
  id: 'A' | 'B' | 'C' | 'D';
  title: string;
  description: string;
  focusMuscles: MuscleGroup[];
  items: WorkoutItem[];
  estimatedTimeMin: number;
  systemicFatigueScore: number;
}

export interface FullBodyProgram {
  id: string;
  createdAt: string;
  profile: UserProfile;
  methodology: 'FULL_BODY';
  splitDays: WorkoutDay[];
  /** Target before exercise/session constraints are applied. */
  targetWeeklyVolumeMap?: Record<MuscleGroup, number>;
  /** Actual direct + weighted indirect volume produced by the plan. */
  weeklyVolumeMap: Record<MuscleGroup, number>;
  frequencyMap: Record<MuscleGroup, number>;
  prescriptionRationale: string[];
  generationWarnings?: string[];
  aiAnalysis?: string;
}

export interface SetLog {
  setNumber: number;
  repsDone: number;
  weightKg: number;
  actualRIR: number;
  completed: boolean;
}

export interface WorkoutLog {
  id: string;
  date: string;
  dayId: 'A' | 'B' | 'C' | 'D';
  durationMin: number;
  exerciseLogs: {
    exerciseId: string;
    exerciseName: string;
    sets: SetLog[];
  }[];
  sessionRPE: number;
  notes: string;
}

export interface FatigueAssessment {
  currentFatigueScore: number;
  status: 'optimal' | 'moderate' | 'high_fatigue' | 'deload_recommended';
  volumeAccumulation: number;
  intensityFactor: number;
  consecutiveDays: number;
  sleepFactor: number;
  recommendedAction: string;
}

export interface AthleteContext {
  atleta: {
    nome: string;
    genero: Gender;
    idade: number;
    pesoKg: number;
    alturaCm: number;
    experiencia: ExperienceLevel;
    diasDisponiveis: number;
    tempoPorSessaoMin: number;
    objetivo: WorkoutGoal;
    ambiente: GymEnvironment;
    prioridades: MuscleGroup[];
    limitacoesFisicas: string[];
    exerciciosProibidos: string[];
    horasSono: number;
    nivelEstresse: 'low' | 'moderate' | 'high';
  };
  programaPeriodizado?: {
    id: string;
    metodologia: string;
    diasTotais: number;
    distribuicao: {
      dia: string;
      titulo: string;
      foco: MuscleGroup[];
      tempoMin: number;
      exerciciosPrescritos: {
        exercicio: string;
        padraoMotor: string;
        grupoMuscular: string;
        series: number;
        reps: string;
        rir: number;
        rpe: number;
        descansoSec: number;
        cadencia: string;
      }[];
    }[];
    volumeSemanalPorGrupo: Record<MuscleGroup, number>;
  };
  fadigaERecuperacao?: {
    scoreFadiga: number;
    status: 'optimal' | 'moderate' | 'high_fatigue' | 'deload_recommended';
    nivelDeload: string;
    driversPrincipais: string[];
    rpeMedioRecente: number;
    totalSeriesRecentes: number;
    tendenciaDesempenho: 'improving' | 'stable' | 'regressing';
    orientacaoAcao: string;
    alertaDorOuLimitacao?: string;
  };
  metasEComposicaoCorporal?: {
    metaPesoKg: number;
    semanasEstimadas: number;
    caloriasDiariasRecomendadas: number;
    macrosG: {
      proteinas: number;
      carboidratos: number;
      gorduras: number;
    };
    focoTreino: string;
  };
  progressaoEHistoricoRecente?: {
    totalSessoesRegistradas: number;
    diasConsecutivosTreinados: number;
    estimativa1RM: {
      agachamento?: number;
      supino?: number;
      terra?: number;
      desenvolvimento?: number;
    };
    statusPeriodizacao: string;
    necessitaDeload: boolean;
  };
}
