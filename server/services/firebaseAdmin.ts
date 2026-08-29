import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { logger } from '../middlewares/logger';

let adminApp: App | null = null;
let adminFirestore: Firestore | null = null;

export function getFirebaseAdmin(): App {
  if (!adminApp) {
    const existingApps = getApps();
    if (existingApps.length > 0 && existingApps[0]) {
      adminApp = existingApps[0];
    } else {
      const projectId =
        process.env.FIREBASE_PROJECT_ID?.trim() ||
        'storied-cable-xn50x';

      try {
        // Credentials are resolved by the runtime (ADC/service account).
        // No private credential is stored in the repository.
        adminApp = initializeApp({ projectId });
        logger.info('Firebase Admin SDK initialized', { projectId });
      } catch (err: unknown) {
        logger.error('Erro ao inicializar Firebase Admin SDK', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    }
  }

  return adminApp;
}

export function getAdminFirestore(): Firestore {
  if (!adminFirestore) {
    adminFirestore = getFirestore(getFirebaseAdmin());
  }
  return adminFirestore;
}

export interface DecodedAthleteToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  role?: string;
}

/** Validates a Firebase ID Token on the server side. */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedAthleteToken> {
  const app = getFirebaseAdmin();
  const auth = getAuth(app);

  try {
    const decoded = await auth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      email_verified: decoded.email_verified,
      role: (decoded.role as string) || 'ATHLETE',
    };
  } catch (error: unknown) {
    logger.warn('Token Firebase inválido ou expirado', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
