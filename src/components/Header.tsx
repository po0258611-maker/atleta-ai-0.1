import React, { useState } from 'react';
import { Dumbbell, User, Menu, LogIn, LogOut, ChevronDown, Sparkles, FileDown, CreditCard, ShieldCheck, Cloud } from 'lucide-react';
import { TabType } from './SidebarNav';
import { UserAccount } from '../services/authService';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  userProfileName: string;
  currentUser: UserAccount | null;
  onOpenAuthModal: () => void;
  onOpenSubscriptionModal?: () => void;
  onLogout: () => void;
  onExportPDF?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  userProfileName,
  currentUser,
  onOpenAuthModal,
  onOpenSubscriptionModal,
  onLogout,
  onExportPDF,
  onToggleMobileMenu 
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="bg-[#0f0f12] border-b border-zinc-800/90 text-zinc-100 sticky top-0 z-40 shadow-xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Hamburger Button */}
            {onToggleMobileMenu && (
              <button
                onClick={onToggleMobileMenu}
                className="lg:hidden p-2 rounded-xl bg-zinc-900 text-zinc-300 hover:text-rose-400 border border-zinc-800 transition-all cursor-pointer active:scale-95"
                title="Abrir Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            {/* Brand Logo */}
            <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab('overview')}>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-rose-400 flex items-center justify-center shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-transform">
                <Dumbbell className="h-6 w-6 text-white font-bold transform -rotate-12" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-black text-xl tracking-tight text-white flex items-center gap-1">
                    ATHLETA <span className="text-rose-500">AI</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-mono hidden sm:inline-block">
                    APEX SUITE
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 hidden sm:block font-medium">Engineered for Human Apex Performance</p>
              </div>
            </div>
          </div>

          {/* User Account Controls */}
          <div className="flex items-center space-x-3">

            {/* APEX Membership Upgrade/Status Pill */}
            <button
              onClick={() => {
                if (onOpenSubscriptionModal) {
                  onOpenSubscriptionModal();
                } else {
                  setActiveTab('subscription');
                }
              }}
              className="hidden sm:flex items-center space-x-1.5 bg-gradient-to-r from-rose-500/20 via-red-500/15 to-zinc-900 hover:from-rose-500/30 hover:to-zinc-800 text-rose-300 border border-rose-500/40 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              title="Assinatura APEX R$ 15,00/mês"
            >
              <CreditCard className="h-3.5 w-3.5 text-rose-400" />
              <span>APEX Pass • R$ 15/mês</span>
            </button>
            
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2.5 bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs transition-all cursor-pointer active:scale-95"
                >
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="h-6 w-6 rounded-full object-cover border border-rose-500"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-rose-500/20 text-rose-400 font-black flex items-center justify-center text-[11px]">
                      {currentUser.name.charAt(0)}
                    </div>
                  )}

                  <div className="text-left hidden sm:block">
                    <div className="text-white font-bold leading-tight">{currentUser.name}</div>
                    <div className="text-[10px] text-zinc-400 leading-none">{currentUser.email}</div>
                  </div>

                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400 ml-1" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#0f0f12] border border-zinc-800 rounded-2xl shadow-2xl py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-zinc-800">
                      <p className="text-xs font-bold text-white">{currentUser.name}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{currentUser.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab('subscription');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:text-rose-400 hover:bg-zinc-900 flex items-center space-x-2 cursor-pointer transition-colors font-medium"
                    >
                      <CreditCard className="h-4 w-4 text-rose-400" />
                      <span>Gerenciar Assinatura (PRO)</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('google_drive');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:text-emerald-400 hover:bg-zinc-900 flex items-center space-x-2 cursor-pointer transition-colors font-medium"
                    >
                      <Cloud className="h-4 w-4 text-emerald-400" />
                      <span>Google Drive (Backup & Nuvem)</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('assessment');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:text-rose-400 hover:bg-zinc-900 flex items-center space-x-2 cursor-pointer transition-colors font-medium"
                    >
                      <User className="h-4 w-4" />
                      <span>Editar Perfil de Atleta</span>
                    </button>

                    <button
                      onClick={() => {
                        onOpenAuthModal();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:text-rose-400 hover:bg-zinc-900 flex items-center space-x-2 cursor-pointer transition-colors font-medium"
                    >
                      <Sparkles className="h-4 w-4 text-rose-400" />
                      <span>Alternar de Conta</span>
                    </button>

                    <div className="border-t border-zinc-800 my-1"></div>

                    <button
                      onClick={() => {
                        onLogout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 cursor-pointer transition-colors font-semibold"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sair da Conta</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-rose-600/25 transition-all cursor-pointer active:scale-95"
              >
                <LogIn className="h-4 w-4" />
                <span>Entrar / Cadastrar</span>
              </button>
            )}

            {/* Export PDF Button */}
            {onExportPDF && (
              <button
                onClick={onExportPDF}
                className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
                title="Exportar Plano de Treino e Nutrição para PDF"
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar PDF</span>
              </button>
            )}

            {/* Quick Profile Tab Button */}
            <button
              onClick={() => setActiveTab('assessment')}
              className="flex items-center space-x-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 px-3 py-2 rounded-xl border border-zinc-800 text-xs font-semibold transition-all cursor-pointer active:scale-95"
              title="Acessar Perfil"
            >
              <User className="h-3.5 w-3.5 text-rose-400" />
              <span className="hidden md:inline">Perfil</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
