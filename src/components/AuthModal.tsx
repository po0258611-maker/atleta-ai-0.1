import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Dumbbell, 
  Plus,
  Trash2
} from 'lucide-react';
import { 
  UserAccount, 
  loginWithGoogleAccount,
  INITIAL_DEMO_ACCOUNTS,
  getDeletedProfileEmails,
  deleteSavedProfile,
  deleteAllSavedProfiles
} from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Saved accounts state
  const [savedAccounts, setSavedAccounts] = useState(() => {
    const deleted = getDeletedProfileEmails();
    return INITIAL_DEMO_ACCOUNTS.filter((acc) => !deleted.includes(acc.email.toLowerCase()));
  });

  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  if (!isOpen) return null;

  const handleDeleteProfile = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    deleteSavedProfile(email);
    setSavedAccounts((prev) => prev.filter((acc) => acc.email.toLowerCase() !== email.toLowerCase()));
    setSuccessMessage(`Perfil ${email} removido.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteAllProfiles = () => {
    deleteAllSavedProfiles();
    setSavedAccounts([]);
    setSuccessMessage('Todos os perfis salvos foram removidos.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleGoogleLogin = (googleData?: { name: string; email: string; avatarUrl?: string }) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage('Conectando à sua Conta Google...');

    setTimeout(() => {
      try {
        const user = loginWithGoogleAccount(googleData);
        setSuccessMessage(`Conectado como ${user.name} (${user.email})!`);
        setTimeout(() => {
          onLoginSuccess(user);
          onClose();
        }, 600);
      } catch {
        setErrorMessage('Erro ao autenticar com a Conta Google.');
        setIsSubmitting(false);
      }
    }, 500);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customEmail.trim()) {
      setErrorMessage('Por favor, informe seu nome e e-mail do Google.');
      return;
    }
    if (!customEmail.includes('@')) {
      setErrorMessage('Por favor, informe um e-mail válido.');
      return;
    }

    handleGoogleLogin({
      name: customName.trim(),
      email: customEmail.trim().toLowerCase(),
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0b1329] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex p-3 bg-slate-900 border border-slate-800 rounded-2xl text-emerald-400">
            <Dumbbell className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-xl font-black text-white">Login com Conta Google</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Acesse seus treinos, histórico de carga e plano nutricional com a sua Conta Google.
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

        {/* Primary Google Login Button */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleGoogleLogin()}
          className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center space-x-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {/* Google SVG */}
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>ENTRAR COM A CONTA GOOGLE</span>
        </button>

        {/* Saved Profiles Section */}
        {savedAccounts.length > 0 && (
          <>
            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-between items-center text-[10px] uppercase px-1">
                <span className="bg-[#0b1329] pr-2 text-slate-400 font-bold">
                  Perfis salvos
                </span>
                <button
                  type="button"
                  onClick={handleDeleteAllProfiles}
                  className="bg-[#0b1329] pl-2 text-rose-400 hover:text-rose-300 font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                  title="Excluir todos os perfis salvos"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Excluir todos</span>
                </button>
              </div>
            </div>

            {/* Saved Accounts List */}
            <div className="space-y-2">
              {savedAccounts.map((acc) => (
                <div
                  key={acc.email}
                  onClick={() => !isSubmitting && handleGoogleLogin(acc)}
                  className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={acc.avatarUrl}
                      alt={acc.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700 group-hover:border-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                        {acc.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{acc.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Entrar →
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProfile(e, acc.email)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remover perfil salvo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Toggle Custom Google Email Option */}
        <div className="pt-2 border-t border-slate-800">
          {!showCustomInput ? (
            <button
              onClick={() => setShowCustomInput(true)}
              className="w-full py-1.5 text-xs font-bold text-slate-400 hover:text-emerald-400 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Usar outra Conta do Google</span>
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-2.5 pt-1">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Seu Nome Completo"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <input
                  type="email"
                  required
                  placeholder="seu.email@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex space-x-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Conectar Google
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomInput(false)}
                  className="px-3 py-2 bg-slate-900 text-slate-400 text-xs rounded-xl hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center text-[10px] text-slate-500 flex items-center justify-center space-x-1">
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
          <span>Login de alta segurança via Google OAuth</span>
        </div>
      </div>
    </div>
  );
};
