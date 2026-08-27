import React, { useState } from 'react';
import { 
  Bookmark, 
  Dumbbell, 
  Apple, 
  MessageSquare, 
  BookOpen, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  CreditCard, 
  Activity
} from 'lucide-react';

export type TabType = 
  | 'overview'
  | 'workout_engine'
  | 'diet'
  | 'ai_coach'
  | 'exercise_library'
  | 'assessment'
  | 'subscription'
  | 'fatigue'
  | 'progress';

interface SidebarNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  workoutCount?: number;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  setActiveTab,
  workoutCount = 5,
  isCollapsed: externalIsCollapsed,
  setIsCollapsed: externalSetIsCollapsed,
  isMobileOpen = false,
  setIsMobileOpen,
}) => {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  const toggleCollapse = () => {
    if (externalSetIsCollapsed) {
      externalSetIsCollapsed(!isCollapsed);
    } else {
      setInternalIsCollapsed(!isCollapsed);
    }
  };

  const menuItems = [
    {
      id: 'overview' as TabType,
      label: 'Painel Geral',
      icon: Bookmark,
      badge: null,
    },
    {
      id: 'workout_engine' as TabType,
      label: 'Ficha de Treino',
      icon: Dumbbell,
      badge: (
        <span className="bg-zinc-800 text-zinc-300 border border-zinc-700/60 px-2 py-0.5 rounded-full text-xs font-bold font-mono">
          {workoutCount}
        </span>
      ),
    },
    {
      id: 'diet' as TabType,
      label: 'Plano Alimentar',
      icon: Apple,
      badge: null,
    },
    {
      id: 'ai_coach' as TabType,
      label: 'Treinador IA',
      icon: MessageSquare,
      badge: (
        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 font-black text-[10px] tracking-wider px-2 py-0.5 rounded-md uppercase shadow-sm">
          APEX
        </span>
      ),
    },
    {
      id: 'exercise_library' as TabType,
      label: 'Guia de Exercícios',
      icon: BookOpen,
      badge: null,
    },
    {
      id: 'subscription' as TabType,
      label: 'Assinatura APEX',
      icon: CreditCard,
      badge: (
        <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 font-black text-[10px] tracking-wider px-2 py-0.5 rounded-md font-mono">
          R$ 15/mês
        </span>
      ),
    },
    {
      id: 'assessment' as TabType,
      label: 'Meu Perfil',
      icon: Settings,
      badge: null,
    },
  ];

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Desktop Sidebar (visible on lg screens) */}
      <div 
        className={`hidden lg:block bg-[#0f0f12] border border-zinc-800/90 rounded-3xl shadow-2xl transition-all duration-300 ${
          isCollapsed ? 'w-20 p-2.5' : 'w-64 p-3'
        }`}
      >
        {/* Sidebar Header with Toggle Button */}
        <div className={`flex items-center mb-2 px-2 py-1.5 border-b border-zinc-800/80 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Navegação
            </span>
          )}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px]"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-rose-400" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-zinc-400 hover:text-rose-400" />
            )}
          </button>
        </div>

        {/* Desktop Menu Items */}
        <div className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                title={item.label}
                className={`relative group w-full flex items-center transition-all duration-200 cursor-pointer ${
                  isCollapsed 
                    ? 'justify-center p-3.5 rounded-2xl' 
                    : 'justify-between px-4 py-3.5 rounded-2xl text-sm font-semibold'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white font-black shadow-lg shadow-rose-600/25 border border-rose-500/50'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3.5'}`}>
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-rose-400'}`} />
                  {!isCollapsed && <span className="tracking-tight">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && <div className="ml-2 shrink-0">{item.badge}</div>}

                {/* Tooltip for collapsed mode */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-xl shadow-xl border border-zinc-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.badge}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Backdrop & Drawer Modal (visible when isMobileOpen is true) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Overlay backdrop */}
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
          />

          {/* Slide-out drawer panel */}
          <div className="relative w-4/5 max-w-xs bg-[#0f0f12] border-r border-zinc-800 h-full p-4 flex flex-col justify-between shadow-2xl z-10 animate-slideInLeft">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-lg bg-rose-600 flex items-center justify-center text-white font-bold">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <span className="font-black text-white text-base">Treino MAX</span>
                </div>
                <button
                  onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                  className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Drawer Menu List */}
              <div className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-rose-600 text-white font-black shadow-lg shadow-rose-600/25'
                          : 'text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800/80 text-center text-[11px] text-zinc-400 font-medium">
              Treino MAX Mobile Engine
            </div>
          </div>
        </div>
      )}

      {/* Fixed Mobile Bottom Navigation Bar (App-like touch navigation for smartphones) */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0f0f12]/95 backdrop-blur-md border-t border-zinc-800/90 py-2 px-3 z-40 lg:hidden flex items-center justify-around shadow-2xl">
        {[
          { id: 'overview' as TabType, label: 'Início', icon: Bookmark },
          { id: 'workout_engine' as TabType, label: 'Treino', icon: Dumbbell },
          { id: 'diet' as TabType, label: 'Dieta', icon: Apple },
          { id: 'ai_coach' as TabType, label: 'IA', icon: MessageSquare },
          { id: 'exercise_library' as TabType, label: 'Exercícios', icon: BookOpen },
        ].map((nav) => {
          const Icon = nav.icon;
          const isActive = activeTab === nav.id;

          return (
            <button
              key={nav.id}
              onClick={() => handleSelectTab(nav.id)}
              className={`flex flex-col items-center justify-center space-y-1 px-3 py-1 rounded-xl transition-all min-w-[56px] ${
                isActive ? 'text-rose-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className={`p-1 rounded-xl ${isActive ? 'bg-rose-500/20 border border-rose-500/30' : ''}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] tracking-tight">{nav.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
