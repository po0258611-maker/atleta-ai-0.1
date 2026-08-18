import { FullBodyProgram, Exercise, UserProfile } from '../types';

export interface AthleteArchetype {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  focusMetrics: string[];
  recommendedRir: number;
  tempoPattern: string; // e.g. "3-0-1-0"
  restIntervalSec: number;
  biomechanicalFocus: string;
}

export const ATHLETE_ARCHETYPES: AthleteArchetype[] = [
  {
    id: 'powerlifting_pro',
    name: 'Clone Powerlifting Heavy Duty',
    subtitle: 'Força Máxima e Recrutamento Neural High-Threshold',
    description: 'Imita os padrões biomecânicos de atletas de força de elite. Prioriza trajetória de barra vertical, vetores de força otimizados e RIR baixo (0-1) com descansos completos.',
    badge: 'KINETIC POWER',
    focusMetrics: ['Pico de Torque (1RM)', 'Velocidade Concêntrica', 'Recrutamento Neural'],
    recommendedRir: 1,
    tempoPattern: '2-1-X-0',
    restIntervalSec: 180,
    biomechanicalFocus: 'Estabilidade intra-articular extrema, alta taxa de desenvolvimento de força (RFD) e rigidez do core.',
  },
  {
    id: 'hypertrophy_pro',
    name: 'Clone Hipertrofia Volume Specialist',
    subtitle: 'Tensão Mecânica Constante e Estresse Metabólico',
    description: 'Modela a execução biomecânica para maximizar o estresse mecânico no músculo alvo. Utiliza cadência excêntrica controlada (3s) e recrutamento sem pontos de descanso.',
    badge: 'HYPERTROPHY CLONE',
    focusMetrics: ['Tensão Mecânica', 'Tempo Sob Tensão (TUT)', 'Acúmulo de Metabólitos'],
    recommendedRir: 2,
    tempoPattern: '3-0-1-0',
    restIntervalSec: 90,
    biomechanicalFocus: 'Manutenção de tensão contínua na amplitude ativa (Active ROM) sem perda de alinhamento com a linha de força.',
  },
  {
    id: 'hybrid_tactical',
    name: 'Clone Híbrido Tático / Endurance',
    subtitle: 'Resistência Muscular Localizada e Capacidade de Trabalho',
    description: 'Otimiza o fluxo sanguíneo e a taxa de depuração de lactato em sessões de alta densidade sem comprometer a integridade articular.',
    badge: 'HYBRID ATHLETE',
    focusMetrics: ['Capacidade de Trabalho', 'Depuração de Lactato', 'Densidade do Treino'],
    recommendedRir: 2,
    tempoPattern: '2-0-1-0',
    restIntervalSec: 60,
    biomechanicalFocus: 'Recuperação intra-série acelerada e eficiência ventilatória sob carga contínua.',
  },
  {
    id: 'calisthenics_kinematics',
    name: 'Clone Calisthenics & Kinematics',
    subtitle: 'Força Relativa, Alavancas e Controle Escapular',
    description: 'Otimiza a cinemática de exercícios de peso corporal e peso livre enfatizando estabilidade do centro de massa e controle proprioceptivo.',
    badge: 'RELATIVE STRENGTH',
    focusMetrics: ['Força Relativa / Peso Corporal', 'Controle Escapular', 'Estabilidade de Core'],
    recommendedRir: 1,
    tempoPattern: '2-1-2-0',
    restIntervalSec: 120,
    biomechanicalFocus: 'Deltóides posteriores e serrátil anterior ativados para proteção da cintura escapular.',
  },
];

export class AIImitationEngine {
  /**
   * Adapts a FullBodyProgram according to the chosen Athlete Archetype's biomechanical rules
   */
  static adaptProgramWithArchetype(
    program: FullBodyProgram,
    archetypeId: string,
    userProfile: UserProfile
  ): FullBodyProgram {
    const archetype = ATHLETE_ARCHETYPES.find((a) => a.id === archetypeId) || ATHLETE_ARCHETYPES[0];

    const adaptedSplitDays = program.splitDays.map((day) => {
      const adaptedItems = day.items.map((item) => ({
        ...item,
        targetRIR: archetype.recommendedRir,
        cadence: archetype.tempoPattern,
        targetRestSec: archetype.restIntervalSec,
        replacementNotes: item.replacementNotes
          ? `[CLONAGEM AI: ${archetype.badge}] ${item.replacementNotes}`
          : `[CLONAGEM AI: ${archetype.badge}] ${archetype.biomechanicalFocus}`,
      }));

      return {
        ...day,
        items: adaptedItems,
        estimatedTimeMin: Math.round(
          day.estimatedTimeMin * (archetype.restIntervalSec > 120 ? 1.15 : 0.95)
        ),
      };
    });

    return {
      ...program,
      splitDays: adaptedSplitDays,
    };
  }
}
