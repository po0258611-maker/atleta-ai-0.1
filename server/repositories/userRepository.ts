import { User, Account } from '../domain/types';
import { hashPassword } from '../utils/crypto';

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role?: 'ATHLETE' | 'COACH' | 'ADMIN';
}

class UserRepository {
  private users: Map<string, User> = new Map();
  private accounts: Map<string, Account> = new Map();
  private emailToUserId: Map<string, string> = new Map();

  constructor() {
    // Seed standard demo users
    this.createSeedUser('atleta.demo@atleta.ai', 'Atleta Pro Demo', 'senha123', 'ATHLETE');
    this.createSeedUser('coach.demo@atleta.ai', 'Treinador Elite Demo', 'senha123', 'COACH');
  }

  private createSeedUser(email: string, name: string, pass: string, role: 'ATHLETE' | 'COACH') {
    const id = `usr_${email.split('@')[0]}`;
    const now = new Date().toISOString();
    const user: User = {
      id,
      email: email.toLowerCase(),
      name,
      role,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    const account: Account = {
      id: `acc_${id}`,
      userId: id,
      provider: 'EMAIL',
      providerAccountId: email.toLowerCase(),
      passwordHash: hashPassword(pass),
      createdAt: now,
    };
    this.users.set(id, user);
    this.accounts.set(account.id, account);
    this.emailToUserId.set(email.toLowerCase(), id);
  }

  async findByEmail(email: string): Promise<User | null> {
    const userId = this.emailToUserId.get(email.toLowerCase());
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findAccountByUserId(userId: string): Promise<Account | null> {
    for (const account of this.accounts.values()) {
      if (account.userId === userId) {
        return account;
      }
    }
    return null;
  }

  async create(data: CreateUserData): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new Error('Já existe uma conta cadastrada com este e-mail.');
    }

    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const user: User = {
      id,
      email: data.email.toLowerCase(),
      name: data.name,
      role: data.role || 'ATHLETE',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    const account: Account = {
      id: `acc_${id}`,
      userId: id,
      provider: 'EMAIL',
      providerAccountId: data.email.toLowerCase(),
      passwordHash: hashPassword(data.password),
      createdAt: now,
    };

    this.users.set(id, user);
    this.accounts.set(account.id, account);
    this.emailToUserId.set(data.email.toLowerCase(), id);

    return user;
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const account = await this.findAccountByUserId(userId);
    if (account) {
      account.passwordHash = hashPassword(newPassword);
      this.accounts.set(account.id, account);
    }
  }
}

export const userRepository = new UserRepository();
