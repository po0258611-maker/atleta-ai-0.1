import React from 'react';
import { 
  X, 
  Lock, 
  Sparkles, 
  CheckCircle2, 
  Dumbbell, 
  Zap, 
  BrainCircuit, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';

interface PremiumGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureTitle?: string;
  featureDescription?: string;
  onOpenSubscriptionView?: () => void;
}

export const PremiumGateModal: React.FC<PremiumGateModalProps> = ({
  isOpen,
  onClose,
  featureTitle = 'Recurso Exclusivo APEX Pass',
  featureDescription = 'Este recurso de alta precisão é reservado para membros do plano APEX Membership.',
  onOpenSubscriptionView,
}) => {
  if (!isOpen) return null;

  const handleUpgradeClick = () => {
    onClose();
    if (onOpenSubscriptionView) {
      onOpenSubscriptionView();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0f0f12] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden space-y-6">
        {/* Subtle Ambient Red Glow */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Lock Icon Badge */}
        <div className="flex items-center space-x-3">
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 shadow-inner">
            <Lock className="h-6 w-6 text-rose-500" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-rose-500/15 border border-rose-500/30 rounded-full text-rose-300 text-[10px] font-black uppercase tracking-wider mb-1">
              <Sparkles className="h-3 w-3 text-rose-400" />
              <span>APEX MEMBERSHIP</span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">{featureTitle}</h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
          {featureDescription}
        </p>

        {/* Benefits Comparison */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            O que você desbloqueia com o Passe APEX:
          </div>

          <div className="grid grid-cols-1 gap-2.5 text-xs text-zinc-200">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>Consultas Ilimitadas com o <strong>KINETIX AI™</strong></span>
            </div>
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>Acesso a todos os <strong>23+ Exercícios 3D no BioAtlas</strong></span>
            </div>
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>Exportação de Relatórios Biomecânicos em <strong>PDF & Excel</strong></span>
            </div>
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>Histórico de Carga e Treinos <strong>Ilimitado</strong></span>
            </div>
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>Gestão Multi-Perfil de Atletas & Alunos</span>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleUpgradeClick}
            className="w-full sm:w-auto flex-1 py-3.5 px-5 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-rose-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer group"
          >
            <span>CONHECER PLANO APEX (R$ 15/MÊS)</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs rounded-2xl transition-all cursor-pointer"
          >
            Continuar no Core Pass
          </button>
        </div>
      </div>
    </div>
  );
};
