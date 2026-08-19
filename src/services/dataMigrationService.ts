import { FirestoreDataService } from './firestoreDataService';
import { UserProfile, FullBodyProgram, WorkoutLog, SubscriptionState } from '../types';
import { BodyMeasurementRecord } from './bodyMeasurementsService';

const MIGRATION_FLAG_KEY = 'athleta_ai_migrated_to_firestore';

/**
 * Migrates existing browser localStorage data to Firestore for the authenticated user.
 * Preserves localStorage until validation is confirmed.
 */
export async function migrateLocalStorageToFirestore(uid: string): Promise<{
  migrated: boolean;
  itemsMigrated: string[];
}> {
  if (!uid) return { migrated: false, itemsMigrated: [] };

  const migrationKey = `${MIGRATION_FLAG_KEY}_${uid}`;
  const alreadyMigrated = localStorage.getItem(migrationKey);

  if (alreadyMigrated === 'true') {
    return { migrated: false, itemsMigrated: [] };
  }

  const itemsMigrated: string[] = [];

  try {
    // 1. Migrate Subscription
    const localSub = localStorage.getItem('athleta_ai_subscription_state');
    if (localSub) {
      try {
        const parsedSub: SubscriptionState = JSON.parse(localSub);
        const existingFirestoreSub = await FirestoreDataService.getSubscription(uid);
        if (!existingFirestoreSub) {
          await FirestoreDataService.saveSubscription(uid, parsedSub);
          itemsMigrated.push('subscription');
        }
      } catch (e) {
        console.warn('Erro ao migrar assinatura local:', e);
      }
    }

    // 2. Migrate Body Measurements
    const localMeasurements = localStorage.getItem(`athleta_ai_body_measurements_${uid}`) || localStorage.getItem('athleta_ai_body_measurements');
    if (localMeasurements) {
      try {
        const parsedMeasurements: BodyMeasurementRecord[] = JSON.parse(localMeasurements);
        if (Array.isArray(parsedMeasurements) && parsedMeasurements.length > 0) {
          for (const meas of parsedMeasurements) {
            await FirestoreDataService.saveMeasurement(uid, meas);
          }
          itemsMigrated.push(`measurements (${parsedMeasurements.length} records)`);
        }
      } catch (e) {
        console.warn('Erro ao migrar medições locais:', e);
      }
    }

    // 3. Mark migration as validated and completed for this UID
    localStorage.setItem(migrationKey, 'true');
    console.log(`[Migration] Migração de localStorage para Firestore concluída para UID: ${uid}`, itemsMigrated);

    return {
      migrated: itemsMigrated.length > 0,
      itemsMigrated,
    };
  } catch (error) {
    console.error('[Migration] Falha durante migração para Firestore:', error);
    return { migrated: false, itemsMigrated };
  }
}
