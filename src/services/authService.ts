import { UserProfile } from '../types';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  createdAt: string;
  emailVerified?: boolean;
  profile: UserProfile;
}

const STORAGE_USERS_KEY = 'athleta_ai_registered_users';
const STORAGE_CURRENT_SESSION_KEY = 'athleta_ai_current_session';
const STORAGE_DELETED_PROFILES_KEY = 'athleta_ai_deleted_profiles';

export const INITIAL_DEMO_ACCOUNTS = [
  {
    name: 'João Silva',
    email: 'joao.silva@gmail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    desc: 'Atleta Intermediário • Full Body 4x',
  },
  {
    name: 'Mariana Costa',
    email: 'mariana.costa@gmail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    desc: 'Atleta Avançada • Full Body 5x',
  },
  {
    name: 'Lucas Mendes',
    email: 'lucas.mendes@gmail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    desc: 'Atleta Iniciante • Saúde & Força',
  },
];

export const getDeletedProfileEmails = (): string[] => {
  try {
    const data = localStorage.getItem(STORAGE_DELETED_PROFILES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const deleteSavedProfile = (email: string): void => {
  try {
    const deleted = getDeletedProfileEmails();
    if (!deleted.includes(email.toLowerCase())) {
      deleted.push(email.toLowerCase());
      localStorage.setItem(STORAGE_DELETED_PROFILES_KEY, JSON.stringify(deleted));
    }

    // Also remove from registered users
    const users = getRegisteredUsers();
    const updatedUsers = users.filter((u) => u.email.toLowerCase() !== email.toLowerCase());
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));
  } catch (err) {
    console.error('Error deleting profile:', err);
  }
};

export const deleteAllSavedProfiles = (): void => {
  try {
    const allEmails = INITIAL_DEMO_ACCOUNTS.map((a) => a.email.toLowerCase());
    const existingUsers = getRegisteredUsers().map((u) => u.email.toLowerCase());
    const combined = Array.from(new Set([...allEmails, ...existingUsers]));
    
    localStorage.setItem(STORAGE_DELETED_PROFILES_KEY, JSON.stringify(combined));
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([]));
  } catch (err) {
    console.error('Error deleting all profiles:', err);
  }
};

// Demo Default Athletes
export const DEMO_ACCOUNTS: UserAccount[] = [
  {
    id: 'demo-1',
    name: 'João Silva',
    email: 'joao.silva@athleta.ai',
    password: '123456',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-15T10:00:00Z',
    profile: {
      name: 'João Silva',
      gender: 'male',
      age: 28,
      heightCm: 178,
      weightKg: 82,
      experience: 'intermediate',
      availableDays: 4,
      timePerSessionMin: 60,
      objective: 'hypertrophy',
      environment: 'full_gym',
      priorities: ['peitoral', 'costas', 'quadriceps'],
      limitations: [],
      forbiddenExercises: [],
      sleepHours: 7.5,
      stressLevel: 'moderate',
    },
  },
  {
    id: 'demo-2',
    name: 'Mariana Costa',
    email: 'mariana.costa@athleta.ai',
    password: '123456',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-02-01T14:30:00Z',
    profile: {
      name: 'Mariana Costa',
      gender: 'female',
      age: 26,
      heightCm: 165,
      weightKg: 60,
      experience: 'advanced',
      availableDays: 5,
      timePerSessionMin: 75,
      objective: 'hypertrophy',
      environment: 'full_gym',
      priorities: ['gluteos', 'posteriores', 'ombros'],
      limitations: [],
      forbiddenExercises: [],
      sleepHours: 8,
      stressLevel: 'low',
    },
  },
  {
    id: 'demo-3',
    name: 'Lucas Mendes',
    email: 'lucas.mendes@athleta.ai',
    password: '123456',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-03-10T09:15:00Z',
    profile: {
      name: 'Lucas Mendes',
      gender: 'male',
      age: 32,
      heightCm: 172,
      weightKg: 74,
      experience: 'beginner',
      availableDays: 3,
      timePerSessionMin: 45,
      objective: 'health',
      environment: 'small_gym',
      priorities: ['peitoral', 'costas'],
      limitations: ['Leve desconforto lombar'],
      forbiddenExercises: ['Agachamento Livre'],
      sleepHours: 6.5,
      stressLevel: 'high',
    },
  },
];

export const getRegisteredUsers = (): UserAccount[] => {
  try {
    const deleted = getDeletedProfileEmails();
    const data = localStorage.getItem(STORAGE_USERS_KEY);
    
    if (data !== null) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter((u) => !deleted.includes(u.email.toLowerCase()));
      }
    }
    
    // First time load: return default demo accounts that are not marked deleted
    const initialUsers = DEMO_ACCOUNTS.filter((u) => !deleted.includes(u.email.toLowerCase()));
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(initialUsers));
    return initialUsers;
  } catch {
    return [];
  }
};

export const getCurrentSession = (): UserAccount | null => {
  try {
    const data = localStorage.getItem(STORAGE_CURRENT_SESSION_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading session:', err);
  }
  return null;
};

export const setCurrentSession = (user: UserAccount | null): void => {
  if (user) {
    localStorage.setItem(STORAGE_CURRENT_SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_CURRENT_SESSION_KEY);
  }
};

export const registerUserAccount = (accountData: {
  name: string;
  email: string;
  password?: string;
  profile: UserProfile;
}): UserAccount => {
  const users = getRegisteredUsers();
  
  const existing = users.find((u) => u.email.toLowerCase() === accountData.email.toLowerCase());
  if (existing) {
    throw new Error('Já existe uma conta cadastrada com este e-mail. Faça login ou use outro e-mail.');
  }

  const newUser: UserAccount = {
    id: `user-${Date.now()}`,
    name: accountData.name,
    email: accountData.email,
    password: accountData.password || '123456',
    createdAt: new Date().toISOString(),
    profile: accountData.profile,
  };

  const updatedUsers = [...users, newUser];
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));
  setCurrentSession(newUser);
  return newUser;
};

export const loginWithEmailAndPassword = (email: string, password: string): UserAccount => {
  if (!email || !password) {
    throw new Error('Por favor, informe seu e-mail e sua senha de acesso.');
  }

  const users = getRegisteredUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!user) {
    throw new Error('E-mail não encontrado. Verifique a digitação ou crie uma nova conta.');
  }

  // Validate password
  if (user.password && user.password !== password) {
    throw new Error('Senha incorreta! Verifique sua senha e tente novamente (Dica: para contas demo a senha é 123456).');
  }

  // Set active session
  setCurrentSession(user);
  return user;
};

export const loginWithGoogleAccount = (googleUser?: { name: string; email: string; avatarUrl?: string }): UserAccount => {
  const users = getRegisteredUsers();
  
  const defaultGoogleUser = googleUser || {
    name: 'Atleta Google',
    email: 'atleta.google@gmail.com',
    avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
  };

  let user = users.find((u) => u.email.toLowerCase() === defaultGoogleUser.email.toLowerCase());

  if (!user) {
    user = {
      id: `google-${Date.now()}`,
      name: defaultGoogleUser.name,
      email: defaultGoogleUser.email,
      avatarUrl: defaultGoogleUser.avatarUrl,
      createdAt: new Date().toISOString(),
      profile: {
        name: defaultGoogleUser.name,
        gender: 'male',
        age: 27,
        heightCm: 176,
        weightKg: 78,
        experience: 'intermediate',
        availableDays: 4,
        timePerSessionMin: 60,
        objective: 'hypertrophy',
        environment: 'full_gym',
        priorities: ['peitoral', 'costas', 'quadriceps'],
        limitations: [],
        forbiddenExercises: [],
        sleepHours: 8,
        stressLevel: 'moderate',
      },
    };
    const updatedUsers = [...users, user];
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));
  }

  setCurrentSession(user);
  return user;
};

export const updateUserAccountProfile = (userId: string, updatedProfile: UserProfile): UserAccount => {
  const users = getRegisteredUsers();
  const index = users.findIndex((u) => u.id === userId);

  let updatedUser: UserAccount;

  if (index !== -1) {
    updatedUser = {
      ...users[index],
      name: updatedProfile.name,
      profile: updatedProfile,
    };
    users[index] = updatedUser;
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } else {
    updatedUser = {
      id: userId,
      name: updatedProfile.name,
      email: `${updatedProfile.name.toLowerCase().replace(/\s+/g, '.')}@athleta.ai`,
      createdAt: new Date().toISOString(),
      profile: updatedProfile,
    };
  }

  setCurrentSession(updatedUser);
  return updatedUser;
};

export const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const users = getRegisteredUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!user) {
    return {
      success: false,
      message: 'E-mail não encontrado no sistema. Verifique a digitação ou crie uma nova conta.',
    };
  }

  return {
    success: true,
    message: `Instruções de redefinição de senha enviadas para ${email}. Código de verificação de teste: 123456`,
  };
};

export const verifyUserEmail = (userId: string): UserAccount => {
  const users = getRegisteredUsers();
  const index = users.findIndex((u) => u.id === userId);

  if (index !== -1) {
    const updatedUser = {
      ...users[index],
      emailVerified: true,
    };
    users[index] = updatedUser;
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    setCurrentSession(updatedUser);
    return updatedUser;
  }
  
  const current = getCurrentSession();
  if (current) {
    const updated = { ...current, emailVerified: true };
    setCurrentSession(updated);
    return updated;
  }

  throw new Error('Sessão não encontrada');
};

