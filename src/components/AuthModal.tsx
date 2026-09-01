import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Dumbbell, 
  Loader2,
  Lock,
  Mail,
  Key,
  LogIn,
  UserPlus
} from 'lucide-react';
import { 
  UserAccount, 
  loginWithGoogleAccount,
  loginWithEmailAccount,
  registerWithEmailAccount
} from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage('Conectando à sua Conta Google via Firebase...');

    try {
      const user = await loginWithGoogleAccount();
      setSuccessMessage(`Conectado como ${user.name}!`);
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 500);
    } catch (err: any) {
      console.warn('Tentativa na autenticação Firebase Google:', err);
      let message = 'Falha ao autenticar com a Conta Google.';
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        message = 'Domínio não autorizado no Firebase Console. Utilize login por E-mail & Senha ou autorize o domínio.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        message = 'A janela do Google foi fechada antes de concluir.';
      } else if (err.code === 'auth/popup-blocked') {
        message = 'O pop-up de login foi bloqueado pelo seu navegador.';
      }
      setErrorMessage(message);
      setIsSubmitting(false);
      setSuccessMessage(null);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Preencha seu e-mail e senha.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(isRegistering ? 'Criando conta...' : 'Autenticando...');

    try {
      const user = isRegistering
        ? await registerWithEmailAccount(email, password)
        : await loginWithEmailAccount(email, password);
      
      setSuccessMessage(`Conectado como ${user.name}!`);
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      setErrorMessage(err.message || 'Falha ao autenticar.');
      setIsSubmitting(false);
      setSuccessMessage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#0f0f12] border border-zinc-800 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-5 my-auto max-h-[92dvh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-rose-500">
            <Dumbbell className="h-7 w-7 text-rose-500 transform -rotate-12" />
          </div>
          <h2 className="text-xl font-black text-white">Autenticação do Atleta</h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Acesse seus treinos, periodização biomecânica e histórico de cargas na nuvem.
          </p>
        </div>

        {/* Auth Method Tabs */}
        <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
          <button
            type="button"
            onClick={() => { setAuthMode('google'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authMode === 'google' 
                ? 'bg-rose-600 text-white shadow-md' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Conta Google
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('email'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authMode === 'email' 
                ? 'bg-rose-600 text-white shadow-md' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            E-mail & Senha
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center space-x-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center space-x-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Content */}
        {authMode === 'google' ? (
          <div className="space-y-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleLogin}
              className="w-full py-3.5 px-4 bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center space-x-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                  <span>Conectando ao Google...</span>
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>CONECTAR COM CONTA GOOGLE</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-rose-500" />
                E-mail
              </label>
              <input
                type="email"
                required
                placeholder="atleta@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-rose-500" />
                Senha
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRegistering ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>CRIAR CONTA</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>ENTRAR</span>
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setErrorMessage(null);
                }}
                className="text-xs text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                {isRegistering ? 'Já possui conta? Clique para Entrar' : 'Não tem conta? Cadastre-se aqui'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-[10px] text-zinc-500 flex items-center justify-center space-x-1 pt-2">
          <ShieldCheck className="h-3 w-3 text-rose-500" />
          <span>Login oficial Firebase Authentication com ID Token</span>
        </div>
      </div>
    </div>
  );
};
