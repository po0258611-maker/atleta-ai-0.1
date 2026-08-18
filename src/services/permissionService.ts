import { SubscriptionState } from '../types';

export interface FeaturePermissions {
  hasApexPass: boolean;
  tierName: 'Athleta Core Pass' | 'APEX Pass';
  canAccessKinetixAI: boolean;
  maxKinetixAiQueriesPerDay: number;
  maxExerciseLibraryAccess: number; // Max free exercises visible without APEX lock
  maxHistoryLogsVisible: number; // Max workout logs visible in free history
  canExportPdf: boolean;
  canExportExcel: boolean;
  canSwitchMultiProfiles: boolean;
  canAccessAdvancedNeuroFatigue: boolean;
  canAccessCustomMacros: boolean;
  
  // Step 2 Advanced Premium Features
  canAccessAIImitation: boolean; // AI-driven athletic profile cloning & biomechanical adaptation
  canAccessAutoAdjustments: boolean; // Real-time RIR/RPE auto-regulated fatigue & load adjustments
  canAccessIntelligentProgression: boolean; // Periodization engine, ACWR calculation & deload triggers
  canAccessIntelligentGoals: boolean; // AI 1RM projections & periodization macrocycle goals
  canAccessAdvancedGraphics: boolean; // NeuroFatigue multi-dimensional radar charts & volume trends
}

export const FREE_TIER_LIMITS = {
  KINETIX_AI_QUERIES_PER_DAY: 3,
  EXERCISE_LIBRARY_FREE_COUNT: 12,
  WORKOUT_HISTORY_FREE_COUNT: 3,
};

export class PermissionService {
  /**
   * Evaluates feature permissions based on the user's subscription state
   */
  static getPermissions(subscription: SubscriptionState | null): FeaturePermissions {
    const isApex = subscription ? subscription.isSubscribed && subscription.status === 'active' : false;

    if (isApex) {
      return {
        hasApexPass: true,
        tierName: 'APEX Pass',
        canAccessKinetixAI: true,
        maxKinetixAiQueriesPerDay: 9999, // Unlimited
        maxExerciseLibraryAccess: 9999, // All 23+ exercises unlocked
        maxHistoryLogsVisible: 9999, // Unlimited history
        canExportPdf: true,
        canExportExcel: true,
        canSwitchMultiProfiles: true,
        canAccessAdvancedNeuroFatigue: true,
        canAccessCustomMacros: true,
        canAccessAIImitation: true,
        canAccessAutoAdjustments: true,
        canAccessIntelligentProgression: true,
        canAccessIntelligentGoals: true,
        canAccessAdvancedGraphics: true,
      };
    }

    // Default Athleta Core Pass (Free Tier)
    return {
      hasApexPass: false,
      tierName: 'Athleta Core Pass',
      canAccessKinetixAI: true, // Limited to 3 queries/day
      maxKinetixAiQueriesPerDay: FREE_TIER_LIMITS.KINETIX_AI_QUERIES_PER_DAY,
      maxExerciseLibraryAccess: FREE_TIER_LIMITS.EXERCISE_LIBRARY_FREE_COUNT,
      maxHistoryLogsVisible: FREE_TIER_LIMITS.WORKOUT_HISTORY_FREE_COUNT,
      canExportPdf: false,
      canExportExcel: false,
      canSwitchMultiProfiles: false,
      canAccessAdvancedNeuroFatigue: false,
      canAccessCustomMacros: false,
      canAccessAIImitation: false,
      canAccessAutoAdjustments: false,
      canAccessIntelligentProgression: false,
      canAccessIntelligentGoals: false,
      canAccessAdvancedGraphics: false,
    };
  }

  /**
   * Checks if an exercise index is accessible under the user's current tier
   */
  static isExerciseUnlocked(exerciseIndex: number, permissions: FeaturePermissions): boolean {
    if (permissions.hasApexPass) return true;
    return exerciseIndex < permissions.maxExerciseLibraryAccess;
  }

  /**
   * Checks if a history log index is accessible under the user's current tier
   */
  static isHistoryLogUnlocked(logIndex: number, permissions: FeaturePermissions): boolean {
    if (permissions.hasApexPass) return true;
    return logIndex < permissions.maxHistoryLogsVisible;
  }
}
