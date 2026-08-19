import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { logger } from '../middlewares/logger';

let adminApp: App | null = null;

export function getFirebaseAdmin(): App {
  if (!adminApp) {
    const existingApps = getApps();
    if (existingApps.length > 0 && existingApps[0]) {
      adminApp = existingApps[0];
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
      try {
        adminApp = initializeApp({
          projectId,
        });
        logger.info(`Firebase Admin SDK inicializado com projectId: ${projectId}`);
      } catch (err: any) {
        logger.error('Erro ao inicializar Firebase Admin SDK', { error: err.message });
        throw err;
      }
    }
  }
  return adminApp;
}

export interface DecodedAthleteToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  role?: string;
}

/**
 * Validates Firebase ID Token securely on the server side
 */
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
  } catch (error: any) {
    logger.warn('Token Firebase inválido ou expirado', { error: error.message });
    throw error;
  }
}
