import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Dumbbell, 
  Plus, 
  Trash2, 
  KeyRound, 
  Mail, 
  UserPlus, 
  LogIn, 
  ArrowRight,
  Shield,
  HelpCircle
} from 'lucide-react';
import { 
  UserAccount, 
  loginWithGoogleAccount,
  loginWithEmailAndPassword,
  registerUserAccount,
  requestPasswordReset,
  INITIAL_DEMO_ACCOUNTS,
  getDeletedProfileEmails,
  deleteSavedProfile,
  deleteAllSavedProfiles
} from '../services/authService';

interface LoginScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // Saved accounts state
  const [savedAccounts, setSavedAccounts] = useState(() => {
    const deleted = getDeletedProfileEmails();
    return INITIAL_DEMO_ACCOUNTS.filter((acc) => !deleted.includes(acc.email.toLowerCase()));
  });

  const handleDeleteProfile = (e: React.MouseEvent, profileEmail: string) => {
    e.stopPropagation();
    deleteSavedProfile(profileEmail);
    setSavedAccounts((prev) => prev.filter((acc) => acc.email.toLowerCase() !== profileEmail.toLowerCase()));
    setSuccessMessage(`Perfil ${profileEmail} removido.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteAllProfiles = () => {
    deleteAllSavedProfiles();
    setSavedAccounts([]);
    setSuccessMessage('Todos os perfis salvos foram removidos.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    setTimeout(() => {
      try {
        const user = loginWithEmailAndPassword(email, password);
        setSuccessMessage(`Bem-vindo de volta, ${user.name}!`);
        setTimeout(() => onLoginSuccess(user), 600);
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao realizar login.');
        setIsSubmitting(false);
      }
    }, 500);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim()) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    setTimeout(() => {
      try {
        const newUser = registerUserAccount({
          name: registerName.trim(),
          email: registerEmail.trim().toLowerCase(),
          password: registerPassword,
          profile: {
            name: registerName.trim(),
            gender: 'male',
            age: 25,
            heightCm: 175,
            weightKg: 75,
            experience: 'intermediate',
            availableDays: 4,
            timePerSessionMin: 60,
            objective: 'hypertrophy',
            environment: 'full_gym',
            priorities: ['peitoral', 'costas'],
            limitations: [],
            forbiddenExercises: [],
            sleepHours: 8,
            stressLevel: 'moderate',
          },
        });
        setSuccessMessage('Conta Athleta Core Pass criada com sucesso!');
        setTimeout(() => onLoginSuccess(newUser), 600);
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao criar conta.');
        setIsSubmitting(false);
      }
    }, 600);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu e-mail cadastrado.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await requestPasswordReset(email);
    setIsSubmitting(false);
    if (res.success) {
      setSuccessMessage(res.message);
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleGoogleLogin = (googleData?: { name: string; email: string; avatarUrl?: string }) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage('Autenticando via Google...');

    setTimeout(() => {
      try {
        const user = loginWithGoogleAccount(googleData);
        setSuccessMessage(`Conectado como ${user.name}!`);
        setTimeout(() => onLoginSuccess(user), 600);
      } catch {
        setErrorMessage('Falha ao autenticar com o Google.');
        setIsSubmitting(false);
      }
    }, 500);
  };

  const handleGuestLogin = () => {
    handleGoogleLogin({
      name: 'Atleta Visitante',
      email: 'visitante.corepass@athleta.ai',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Red Ambient Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-rose-600/15 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-5">
        {/* App Logo & Heading */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-xl shadow-rose-600/20 text-rose-500">
            <Dumbbell className="h-8 w-8 text-rose-500 transform -rotate-12" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              ATHLETA <span className="text-rose-500">AI</span>
              <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                CORE PASS
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">
              Inteligência Artificial Biomecânica e Prescrição Nutricional
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-[#0f0f12] border border-zinc-800/90 rounded-3xl p-6 shadow-2xl space-y-5">
          {/* Tabs header */}
          <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-2xl border border-zinc-800/80 text-xs font-bold">
            <button
              onClick={() => { setActiveTab('login'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'login' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setActiveTab('register'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'register' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Cadastrar
            </button>
            <button
              onClick={() => { setActiveTab('forgot_password'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'forgot_password' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Recuperar
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center space-x-2 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center space-x-2 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  E-mail do Atleta
                </label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@atleta.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Senha de Acesso
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <LogIn className="h-4 w-4" />
                <span>ENTRAR NO ATHLETA CORE</span>
              </button>
            </form>
          )}

          {/* TAB 2: CADASTRAR */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Seu Nome"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  E-mail de Cadastro
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu.email@gmail.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Criar Senha
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>CRIAR CONTA GRATUITA</span>
              </button>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD */}
          {activeTab === 'forgot_password' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
              <p className="text-xs text-zinc-400">
                Informe o seu e-mail cadastrado para enviarmos as instruções de redefinição de senha.
              </p>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  E-mail Cadastrado
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu.email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <KeyRound className="h-4 w-4" />
                <span>ENVIAR CÓDIGO DE RECUPERAÇÃO</span>
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-zinc-500">
              <span className="bg-[#0f0f12] px-2">Ou acesse rapidamente</span>
            </div>
          </div>

          {/* Social Google & Guest */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleGoogleLogin()}
              className="w-full py-2.5 px-4 bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>CONECTAR COM A CONTA GOOGLE</span>
            </button>

            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white font-bold text-xs rounded-xl border border-zinc-800 transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>ENTRAR COMO CONVIDADO (ATHLETA CORE)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-zinc-500 flex items-center justify-center space-x-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-rose-500" />
          <span>Sessão 100% segura com criptografia end-to-end</span>
        </div>
      </div>
    </div>
  );
};
