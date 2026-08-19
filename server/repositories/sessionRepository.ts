import { Session } from '../domain/types';
import { generateSecureToken, hashToken } from '../utils/crypto';

class SessionRepository {
  private sessions: Map<string, Session> = new Map(); // Key is tokenHash
  private sessionTTLMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  async createSession(userId: string, ipAddress: string, userAgent: string): Promise<{ session: Session; rawToken: string }> {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const id = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTTLMs).toISOString();

    const session: Session = {
      id,
      userId,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
      createdAt: now.toISOString(),
    };

    this.sessions.set(tokenHash, session);
    return { session, rawToken };
  }

  async findValidSession(rawToken: string): Promise<Session | null> {
    const tokenHash = hashToken(rawToken);
    const session = this.sessions.get(tokenHash);
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.sessions.delete(tokenHash);
      return null;
    }

    return session;
  }

  async invalidateSession(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    this.sessions.delete(tokenHash);
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    for (const [hash, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(hash);
      }
    }
  }
}

export const sessionRepository = new SessionRepository();
