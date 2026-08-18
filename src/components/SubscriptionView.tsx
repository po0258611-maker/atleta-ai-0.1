import React, { useState } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  XCircle, 
  RefreshCw, 
  AlertCircle,
  Zap,
  Check,
  Star,
  RotateCcw
} from 'lucide-react';
import { SubscriptionState } from '../types';
import { 
  cancelSubscription, 
  reactivateSubscription,
  processGooglePlayPurchase,
  restorePurchases
} from '../services/subscriptionService';
import { LegalModal } from './LegalModal';

interface SubscriptionViewProps {
  subscription: SubscriptionState;
  onSubscriptionUpdate: (updatedState: SubscriptionState) => void;
  onOpenCheckoutModal: () => void;
  userEmail?: string;
  userName?: string;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  subscription,
  onSubscriptionUpdate,
  onOpenCheckoutModal,
  userEmail = 'atleta@gmail.com',
  userName = 'Atleta',
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<'pro_monthly' | 'pro_annual'>('pro_annual');
  const [isBuying, setIsBuying] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Legal modal state
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | null>(null);

  const handleSubscribeWithGooglePlay = async (planId: 'pro_monthly' | 'pro_annual') => {
    setIsBuying(true);
    setFeedback(null);

    try {
      const res = await processGooglePlayPurchase(planId);
      if (res.success && res.subscriptionState) {
        onSubscriptionUpdate(res.subscriptionState);
        setFeedback({
          type: 'success',
          message: `Sucesso! Assinatura confirmada pelo Google Play. Pedido: ${res.orderId}`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `Código [${res.code}]: ${res.message}`,
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Erro ao conectar com os serviços do Google Play Billing. Tente novamente.',
      });
    } finally {
      setIsBuying(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setFeedback(null);
    try {
      const res = await restorePurchases();
      onSubscriptionUpdate(res.subscriptionState);
      setFeedback({
        type: 'success',
        message: res.message,
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Não foi possível encontrar uma assinatura vinculada a esta conta Google.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Tem certeza de que deseja cancelar a renovação automática da sua assinatura?')) {
      const updated = cancelSubscription();
      onSubscriptionUpdate(updated);
      setFeedback({
        type: 'success',
        message: 'Sua assinatura foi cancelada. Seu acesso continuará ativo até o final do período pago.',
      });
    }
  };

  const handleReactivate = () => {
    const updated = reactivateSubscription();
    onSubscriptionUpdate(updated);
    setFeedback({
      type: 'success',
      message: 'Sua assinatura PRO foi reativada com sucesso!',
    });
  };

  const formattedDate = new Date(subscription.renewsAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-fadeIn">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-[#0f0f12] to-zinc-950 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-rose-500/15 border border-rose-500/30 rounded-full text-rose-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-rose-400" />
            <span>Athleta APEX Membership</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Gestão do Passe APEX
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1">
                Desbloqueie o poder máximo da Inteligência Artificial Biomecânica e Nutricional.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                subscription.status === 'active'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>
                {subscription.status === 'active' ? '● Plano PRO Ativo' : '● Inativo'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs font-bold animate-fadeIn ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Two Plan Selection Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white tracking-tight">
            Escolha o Plano Ideal para Você
          </h2>
          <span className="text-xs text-rose-400 font-bold uppercase tracking-wider">
            Individual • Sem taxas escondidas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plan Card 1: Mensal */}
          <div 
            onClick={() => setSelectedPlanId('pro_monthly')}
            className={`p-6 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between ${
              selectedPlanId === 'pro_monthly'
                ? 'bg-[#0f0f12] border-rose-500 shadow-xl shadow-rose-600/15 ring-1 ring-rose-500/50'
                : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Plano Mensal</span>
                <input
                  type="radio"
                  name="plan_select"
                  checked={selectedPlanId === 'pro_monthly'}
                  onChange={() => setSelectedPlanId('pro_monthly')}
                  className="accent-rose-500 h-4 w-4"
                />
              </div>

              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-white">R$ 15,00</span>
                  <span className="text-xs text-zinc-400 font-medium">/ mês</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Cobrado mensalmente. Cancele quando quiser.</p>
              </div>

              <div className="border-t border-zinc-800/80 pt-3 space-y-2 text-xs text-zinc-300">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>Prescrição IA Fullbody Ilimitada</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>Cálculo Personalizado de Macros</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>Registrador de Cargas & RIR</span>
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSubscribeWithGooglePlay('pro_monthly');
              }}
              disabled={isBuying}
              className="mt-6 w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isBuying && selectedPlanId === 'pro_monthly' ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-rose-400" />
                  <span>Conectando Google Play...</span>
                </>
              ) : (
                <span>Assinar Mensal (R$ 15,00/mês)</span>
              )}
            </button>
          </div>

          {/* Plan Card 2: Anual (Melhor Custo-Benefício) */}
          <div 
            onClick={() => setSelectedPlanId('pro_annual')}
            className={`p-6 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between overflow-hidden ${
              selectedPlanId === 'pro_annual'
                ? 'bg-gradient-to-b from-rose-950/40 via-[#0f0f12] to-zinc-950 border-rose-500 shadow-2xl shadow-rose-600/25 ring-2 ring-rose-500'
                : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            {/* Best Value Badge */}
            <div className="absolute top-0 right-0 bg-rose-600 text-white font-black text-[10px] uppercase px-4 py-1 rounded-bl-2xl tracking-wider shadow-md flex items-center space-x-1">
              <Star className="h-3 w-3 fill-white" />
              <span>MELHOR CUSTO-BENEFÍCIO</span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center space-x-1">
                  <span>Plano Anual</span>
                  <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded text-[10px]">Economia de 33%</span>
                </span>
                <input
                  type="radio"
                  name="plan_select"
                  checked={selectedPlanId === 'pro_annual'}
                  onChange={() => setSelectedPlanId('pro_annual')}
                  className="accent-rose-500 h-4 w-4"
                />
              </div>

              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-rose-400">R$ 120,00</span>
                  <span className="text-xs text-zinc-400 font-medium">/ ano</span>
                </div>
                <p className="text-[11px] text-rose-300/90 font-bold mt-1">
                  Equivale a apenas R$ 10,00 por mês!
                </p>
              </div>

              <div className="border-t border-zinc-800/80 pt-3 space-y-2 text-xs text-zinc-200">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-rose-400 shrink-0" />
                  <span><strong>Tudo do plano mensal</strong> + Prioridade em IA</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>Economize R$ 60,00 por ano</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>Exportação de PDFs e Relatórios de Progresso</span>
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSubscribeWithGooglePlay('pro_annual');
              }}
              disabled={isBuying}
              className="mt-6 w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-xl shadow-rose-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isBuying && selectedPlanId === 'pro_annual' ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  <span>Processando no Google Play...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-white" />
                  <span>ASSINAR AGORA COM GOOGLE PLAY</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Alternative Checkout CTA & Restore Purchases */}
      <div className="bg-[#0f0f12] border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2 justify-center sm:justify-start">
              <CreditCard className="h-4 w-4 text-rose-400" />
              <span>Outras Opções de Pagamento (PIX / Cartão de Crédito)</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Gere um QR Code PIX imediato ou cadastre seu cartão sem passar pela loja.
            </p>
          </div>

          <button
            onClick={onOpenCheckoutModal}
            className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-rose-500/40 hover:border-rose-500 font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
          >
            PAGAR VIA PIX / CARTÃO
          </button>
        </div>

        <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between text-xs text-zinc-400 gap-3">
          <button
            type="button"
            onClick={handleRestore}
            disabled={isRestoring}
            className="text-rose-400 hover:text-rose-300 font-bold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
            <span>Restaurar Compras do Google Play</span>
          </button>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setLegalModalType('terms')}
              className="hover:text-white underline transition-colors cursor-pointer"
            >
              Termos de Uso
            </button>
            <span>•</span>
            <button
              onClick={() => setLegalModalType('privacy')}
              className="hover:text-white underline transition-colors cursor-pointer"
            >
              Política de Privacidade
            </button>
          </div>
        </div>
      </div>

      {/* Current Subscription Management Box */}
      <div className="bg-[#0f0f12] border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{subscription.planName}</h3>
              <p className="text-xs text-zinc-400">Titular: {userName} ({userEmail})</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xl font-black text-rose-400">R$ {subscription.priceBrl.toFixed(2)}</div>
            <div className="text-[10px] text-zinc-400 uppercase font-bold">
              {subscription.billingCycle === 'yearly' ? 'Anual' : 'Mensal'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
            <span className="text-zinc-400 font-semibold block text-[11px]">Próxima Renovação:</span>
            <div className="font-bold text-white flex items-center space-x-1.5">
              <Calendar className="h-4 w-4 text-rose-400" />
              <span>{formattedDate}</span>
            </div>
          </div>

          <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
            <span className="text-zinc-400 font-semibold block text-[11px]">Método Vinculado:</span>
            <div className="font-bold text-white uppercase flex items-center space-x-1.5">
              <Zap className="h-4 w-4 text-rose-400" />
              <span>{subscription.paymentMethod === 'pix' ? 'PIX Copia e Cola' : 'Google Play Billing / Cartão'}</span>
            </div>
          </div>

          <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
            <span className="text-zinc-400 font-semibold block text-[11px]">Status PNU:</span>
            <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{subscription.status === 'active' ? 'Ativo e Regular' : 'Cancelado / Inativo'}</span>
            </div>
          </div>
        </div>

        {/* Cancellation or Reactivation Actions */}
        <div className="flex justify-end border-t border-zinc-800/80 pt-4">
          {subscription.status === 'active' ? (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-500/40 font-bold text-xs rounded-xl flex items-center space-x-2 transition-all cursor-pointer"
            >
              <XCircle className="h-4 w-4" />
              <span>Cancelar Renovação Automática</span>
            </button>
          ) : (
            <button
              onClick={handleReactivate}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Zap className="h-4 w-4 fill-white" />
              <span>REATIVAR ASSINATURA PRO</span>
            </button>
          )}
        </div>
      </div>

      {/* Legal Modal Render */}
      <LegalModal
        isOpen={!!legalModalType}
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
    </div>
  );
};
