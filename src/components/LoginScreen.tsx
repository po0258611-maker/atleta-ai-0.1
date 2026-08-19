import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Dumbbell, 
  Loader2,
  Lock,
  Sparkles
} from 'lucide-react';
import { 
  UserAccount, 
  loginWithGoogleAccount 
} from '../services/authService';

interface LoginScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
  isLoadingSession?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, isLoadingSession }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage('Conectando à sua Conta Google via Firebase...');

    try {
      const user = await loginWithGoogleAccount();
      setSuccessMessage(`Conectado como ${user.name}!`);
      setTimeout(() => onLoginSuccess(user), 500);
    } catch (err: any) {
      console.error('Falha no login Google Firebase:', err);
      let message = 'Falha ao autenticar com a Conta Google.';
      if (err.code === 'auth/popup-closed-by-user') {
        message = 'A janela de login do Google foi fechada antes de concluir.';
      } else if (err.code === 'auth/popup-blocked') {
        message = 'O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Erro de conexão com o Firebase Auth. Verifique sua conexão com a internet.';
      }
      setErrorMessage(message);
      setIsSubmitting(false);
      setSuccessMessage(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Red Ambient Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-rose-600/15 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* App Logo & Heading */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-xl shadow-rose-600/20 text-rose-500">
            <Dumbbell className="h-8 w-8 text-rose-500 transform -rotate-12" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              ATHLETA <span className="text-rose-500">AI</span>
              <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                APEX SUITE
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">
              Inteligência Artificial Biomecânica e Prescrição Nutricional
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-[#0f0f12] border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-rose-500" />
              Autenticação Segura
            </h2>
            <p className="text-xs text-zinc-400">
              O acesso aos motores biométricos e histórico de treino é protegido via Firebase Google Sign-In.
            </p>
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

          {/* Primary Action Button: Real Google Firebase Login */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={isSubmitting || isLoadingSession}
              onClick={handleGoogleLogin}
              className="w-full py-3.5 px-4 bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center space-x-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting || isLoadingSession ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                  <span>Autenticando sessão Google...</span>
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>CONECTAR COM A CONTA GOOGLE</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-zinc-800 text-center space-y-2">
            <div className="flex items-center justify-center space-x-1.5 text-[11px] text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              <span>Login único e sem necessidade de senhas</span>
            </div>
            <p className="text-[10px] text-zinc-500">
              Ao continuar, sua sessão será sincronizada com Firebase Authentication e os padrões de segurança do Google Workspace.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-zinc-500 flex items-center justify-center space-x-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-rose-500" />
          <span>Sessão 100% segura com criptografia Firebase Token</span>
        </div>
      </div>
    </div>
  );
};
