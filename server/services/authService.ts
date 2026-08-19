import { userRepository } from '../repositories/userRepository';
import { sessionRepository } from '../repositories/sessionRepository';
import { verifyPassword } from '../utils/crypto';
import { User } from '../domain/types';

export interface AuthSessionResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token: string;
  expiresAt: string;
}

export class AuthService {
  async register(email: string, name: string, pass: string, ip: string, ua: string): Promise<AuthSessionResult> {
    if (!email || !pass || pass.length < 6) {
      throw new Error('E-mail e senha (mínimo 6 caracteres) são obrigatórios.');
    }

    const user = await userRepository.create({ email, name, password: pass });
    const { session, rawToken } = await sessionRepository.createSession(user.id, ip, ua);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token: rawToken,
      expiresAt: session.expiresAt,
    };
  }

  async login(email: string, pass: string, ip: string, ua: string): Promise<AuthSessionResult> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Credenciais inválidas.');
    }

    const account = await userRepository.findAccountByUserId(user.id);
    if (!account || !account.passwordHash) {
      throw new Error('Credenciais inválidas.');
    }

    const isValid = verifyPassword(pass, account.passwordHash);
    if (!isValid) {
      throw new Error('Credenciais inválidas.');
    }

    const { session, rawToken } = await sessionRepository.createSession(user.id, ip, ua);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token: rawToken,
      expiresAt: session.expiresAt,
    };
  }

  async logout(rawToken: string): Promise<void> {
    await sessionRepository.invalidateSession(rawToken);
  }

  async validateSession(rawToken: string): Promise<User | null> {
    const session = await sessionRepository.findValidSession(rawToken);
    if (!session) return null;
    return userRepository.findById(session.userId);
  }
}

export const authService = new AuthService();
