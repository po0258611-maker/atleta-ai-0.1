import React, { useState } from 'react';
import { 
  X, 
  BrainCircuit, 
  Sparkles, 
  CheckCircle2, 
  Dumbbell, 
  ShieldAlert, 
  Zap, 
  Lock, 
  ArrowRight,
  Sliders,
  Activity
} from 'lucide-react';
import { 
  ATHLETE_ARCHETYPES, 
  AthleteArchetype, 
  AIImitationEngine 
} from '../services/aiImitationEngine';
import { FullBodyProgram, UserProfile } from '../types';
import { FeaturePermissions } from '../services/permissionService';

interface AIImitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: FeaturePermissions;
  currentProgram: FullBodyProgram | null;
  userProfile: UserProfile;
  onApplyAdaptedProgram: (adaptedProgram: FullBodyProgram) => void;
  onOpenPremiumGate: (title: string, desc: string) => void;
}

export const AIImitationModal: React.FC<AIImitationModalProps> = ({
  isOpen,
  onClose,
  permissions,
  currentProgram,
  userProfile,
  onApplyAdaptedProgram,
  onOpenPremiumGate,
}) => {
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string>('powerlifting_pro');
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const selectedArchetype = ATHLETE_ARCHETYPES.find((a) => a.id === selectedArchetypeId) || ATHLETE_ARCHETYPES[0];

  const handleActivateImitation = () => {
    if (!permissions.canAccessAIImitation) {
      onOpenPremiumGate(
        'Clonagem e Imitação Biomecânica de Elite AI',
        'Imite o padrão biomecânico de atletas profissionais com tempos de tensão, trajetórias de barra e cadências calibradas em tempo real pelo motor KINETIX AI™.'
      );
      return;
    }

    if (!currentProgram) return;

    setIsApplying(true);
    setTimeout(() => {
      const adapted = AIImitationEngine.adaptProgramWithArchetype(
        currentProgram,
        selectedArchetypeId,
        userProfile
      );
      onApplyAdaptedProgram(adapted);
      setIsApplying(false);
      setAppliedSuccess(true);
      setTimeout(() => {
        setAppliedSuccess(false);
        onClose();
      }, 1500);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0f0f12] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-xl transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 shadow-inner">
            <BrainCircuit className="h-6 w-6 text-rose-500" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-rose-500/15 border border-rose-500/30 rounded-full text-rose-300 text-[10px] font-black uppercase tracking-wider mb-1">
              <Sparkles className="h-3 w-3 text-rose-400" />
              <span>RECURSO EXCLUSIVO APEX PASS</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Imitação & Clonagem Biomecânica de Atletas
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
          Selecione o arquétipo biomecânico de elite para recalibrar a cadência (tempo sob tensão), o intervalo de descanso intra-série e o RIR alvo da sua ficha de treino.
        </p>

        {appliedSuccess && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span><strong>Sucesso!</strong> Ficha de treino recalibrada com a clonagem do arquétipo <strong>{selectedArchetype.name}</strong>.</span>
          </div>
        )}

        {/* Archetype Selector List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ATHLETE_ARCHETYPES.map((arch) => {
            const isSelected = selectedArchetypeId === arch.id;
            return (
              <div
                key={arch.id}
                onClick={() => setSelectedArchetypeId(arch.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-rose-950/30 border-rose-500 shadow-lg shadow-rose-600/15 ring-1 ring-rose-500/50'
                    : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30">
                      {arch.badge}
                    </span>
                    <input
                      type="radio"
                      name="archetype"
                      checked={isSelected}
                      onChange={() => setSelectedArchetypeId(arch.id)}
                      className="accent-rose-500 h-4 w-4"
                    />
                  </div>
                  <h3 className="font-bold text-white text-xs sm:text-sm mt-1">{arch.name}</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{arch.subtitle}</p>
                </div>

                <div className="border-t border-zinc-800/80 pt-2.5 text-[11px] text-zinc-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-semibold">Cadência:</span>
                    <span className="font-mono font-bold text-rose-300">{arch.tempoPattern}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-semibold">Descanso Sugerido:</span>
                    <span className="font-mono font-bold text-zinc-200">{arch.restIntervalSec}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-semibold">RIR Alvo:</span>
                    <span className="font-mono font-bold text-emerald-400">{arch.recommendedRir} RIR</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Detail Spec */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2 text-xs text-zinc-300">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center space-x-1.5">
            <Activity className="h-3.5 w-3.5 text-rose-400" />
            <span>Foco Biomecânico do Arquétipo Selecionado:</span>
          </div>
          <p className="text-zinc-300 leading-relaxed">
            {selectedArchetype.description}
          </p>
          <div className="pt-2 flex flex-wrap gap-2">
            {selectedArchetype.focusMetrics.map((metric) => (
              <span
                key={metric}
                className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-bold rounded-lg"
              >
                ✓ {metric}
              </span>
            ))}
          </div>
        </div>

        {/* CTA Action */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleActivateImitation}
            disabled={isApplying}
            className={`w-full py-3.5 px-5 font-black text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              permissions.canAccessAIImitation
                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-600/25'
                : 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
            }`}
          >
            {permissions.canAccessAIImitation ? (
              <>
                <Zap className="h-4 w-4 fill-white" />
                <span>{isApplying ? 'RECALIBRANDO FICHA...' : 'ATIVAR CLONAGEM NA FICHA ATUAL'}</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 text-amber-400" />
                <span>DESBLOQUEAR COM PASSE APEX (R$ 15/MÊS)</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs rounded-2xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
