import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { logger } from '../middlewares/logger';
import { SERVER_CONFIG } from '../config/env';
import fs from 'fs';
import path from 'path';

let adminApp: App | null = null;
let adminFirestore: Firestore | null = null;

function loadFirestoreDatabaseId(): string | undefined {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (parsed?.firestoreDatabaseId && typeof parsed.firestoreDatabaseId === 'string') {
        return parsed.firestoreDatabaseId.trim();
      }
    }
  } catch {}
  return process.env.FIRESTORE_DATABASE_ID?.trim() || undefined;
}

export function getFirebaseAdmin(): App {
  if (!adminApp) {
    const projectId = SERVER_CONFIG.FIREBASE_PROJECT_ID;
    const existingApps = getApps();
    const matchedApp = existingApps.find((a) => a.options.projectId === projectId);

    if (matchedApp) {
      adminApp = matchedApp;
    } else {
      try {
        adminApp = initializeApp({ projectId });
        logger.info('Firebase Admin SDK initialized', { projectId });
      } catch (err: unknown) {
        if (existingApps.length > 0 && existingApps[0]) {
          adminApp = existingApps[0];
          logger.warn('Firebase Admin SDK usando app existente', {
            projectId: adminApp.options.projectId,
          });
        } else {
          logger.error('Erro ao inicializar Firebase Admin SDK', {
            error: err instanceof Error ? err.message : 'Unknown error',
          });
          throw err;
        }
      }
    }
  }

  return adminApp;
}

export function getAdminFirestore(): Firestore {
  if (!adminFirestore) {
    const app = getFirebaseAdmin();
    const databaseId = loadFirestoreDatabaseId();
    adminFirestore = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
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
  // Mock/demo tokens are permitted only outside production for local previews/tests.
  const isProduction = SERVER_CONFIG.NODE_ENV === 'production';
  if (!isProduction && (idToken.startsWith('mock_token_') || idToken.startsWith('demo_token_'))) {
    const uid = idToken.replace(/^(mock_token_|demo_token_)/, '');
    return {
      uid: uid || 'athlete_demo',
      email: 'atleta.demo@treinomax.app',
      name: 'Atleta Max (Teste)',
      picture: undefined,
      email_verified: true,
      role: 'ATHLETE',
    };
  }

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
