import { FirestoreDataService } from './firestoreDataService';
import { BodyMeasurementRecord } from './bodyMeasurementsService';

const MIGRATION_FLAG_KEY = 'athleta_ai_migrated_to_firestore_v2';

/**
 * Migrates safe, user-owned legacy browser data to Firestore.
 * Subscription/billing state is intentionally excluded: it is server-authoritative
 * and must never be promoted from localStorage into the billing authority.
 */
export async function migrateLocalStorageToFirestore(uid: string): Promise<{
  migrated: boolean;
  itemsMigrated: string[];
}> {
  if (!uid) return { migrated: false, itemsMigrated: [] };

  const migrationKey = `${MIGRATION_FLAG_KEY}_${uid}`;
  if (localStorage.getItem(migrationKey) === 'true') {
    return { migrated: false, itemsMigrated: [] };
  }

  const itemsMigrated: string[] = [];

  try {
    const localMeasurements =
      localStorage.getItem(`athleta_ai_body_measurements_${uid}`) ||
      localStorage.getItem('athleta_ai_body_measurements');

    if (localMeasurements) {
      try {
        const parsedMeasurements: BodyMeasurementRecord[] = JSON.parse(localMeasurements);
        if (Array.isArray(parsedMeasurements)) {
          for (const measurement of parsedMeasurements) {
            if (measurement?.id) {
              await FirestoreDataService.saveMeasurement(uid, measurement);
            }
          }
          if (parsedMeasurements.length > 0) {
            itemsMigrated.push(`measurements (${parsedMeasurements.length} records)`);
          }
        }
      } catch (error) {
        console.warn('[Migration] Erro ao migrar medições locais:', error);
      }
    }

    localStorage.setItem(migrationKey, 'true');
    console.info(`[Migration] Migração segura concluída para UID ${uid}`, itemsMigrated);

    return {
      migrated: itemsMigrated.length > 0,
      itemsMigrated,
    };
  } catch (error) {
    console.error('[Migration] Falha durante migração para Firestore:', error);
    return { migrated: false, itemsMigrated };
  }
}
