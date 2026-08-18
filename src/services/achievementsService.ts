export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: 'Shield' | 'Dumbbell' | 'Award' | 'Flame' | 'Zap' | 'Target' | 'Activity' | 'Star';
  category: 'onboarding' | 'workout' | 'consistency' | 'biometrics';
  unlocked: boolean;
  unlockedAt?: string;
  progressPct: number;
}

const STORAGE_KEY = 'athleta_ai_user_achievements';

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'welcome_pioneer',
    title: 'Pioneiro Athleta',
    description: 'Criou sua conta na plataforma Athleta Core Pass.',
    iconName: 'Shield',
    category: 'onboarding',
    unlocked: true,
    unlockedAt: new Date().toISOString(),
    progressPct: 100,
  },
  {
    id: 'first_assessment',
    title: 'BioProfile Concluído',
    description: 'Preencheu sua avaliação física e metas no BioProfile Studio.',
    iconName: 'Target',
    category: 'onboarding',
    unlocked: false,
    progressPct: 0,
  },
  {
    id: 'first_workout',
    title: 'Primeiro Treino Concluído',
    description: 'Executou e registrou a 1ª sessão de treino no Workout Logger.',
    iconName: 'Dumbbell',
    category: 'workout',
    unlocked: false,
    progressPct: 0,
  },
  {
    id: 'weight_logged',
    title: 'Foco na Balança',
    description: 'Registrou suas medições corporais básicas.',
    iconName: 'Activity',
    category: 'biometrics',
    unlocked: false,
    progressPct: 0,
  },
  {
    id: 'timer_master',
    title: 'Mestre da Frequência',
    description: 'Utilizou o cronômetro de descanso para respeitar os intervalos.',
    iconName: 'Flame',
    category: 'workout',
    unlocked: false,
    progressPct: 0,
  },
  {
    id: 'volume_1k',
    title: '1.000 kg Levantados',
    description: 'Acumulou mais de 1.000 kg de volume total nos treinos.',
    iconName: 'Zap',
    category: 'workout',
    unlocked: false,
    progressPct: 0,
  },
  {
    id: 'consistency_3',
    title: 'Consistência de Aço',
    description: 'Concluiu 3 sessões de treino com registro de RPE.',
    iconName: 'Award',
    category: 'consistency',
    unlocked: false,
    progressPct: 0,
  },
  {
    id: 'apex_ready',
    title: 'Evolução Apex',
    description: 'Explorou todas as ferramentas do Athleta Core Pass.',
    iconName: 'Star',
    category: 'consistency',
    unlocked: false,
    progressPct: 0,
  },
];

export class AchievementsService {
  static getAchievements(userId: string): Achievement[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (!data) {
        localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(INITIAL_ACHIEVEMENTS));
        return INITIAL_ACHIEVEMENTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_ACHIEVEMENTS;
    }
  }

  static unlockAchievement(userId: string, achievementId: string): Achievement[] {
    const current = this.getAchievements(userId);
    const updated = current.map((a) => {
      if (a.id === achievementId && !a.unlocked) {
        return {
          ...a,
          unlocked: true,
          unlockedAt: new Date().toISOString(),
          progressPct: 100,
        };
      }
      return a;
    });

    try {
      localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(updated));
    } catch (err) {
      console.error('Error unlocking achievement:', err);
    }
    return updated;
  }
}
