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
  processGooglePlayPurchase,
  restorePurchases
} from '../services/subscriptionService';
import { LegalModal } from './LegalModal';

interface SubscriptionViewProps {
  subscription: SubscriptionState;
  onSubscriptionUpdate: (updatedState: SubscriptionState) => void;
  onOpenCheckoutModal?: () => void;
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
          message: `Pedido registrado: ${res.orderId}. Confirmação via Google Play Billing.`,
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
        message: 'Erro ao registrar pedido com o Google Play Billing. Tente novamente.',
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
        type: res.restored ? 'success' : 'error',
        message: res.message,
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Não foi possível encontrar uma assinatura ativa vinculada no backend.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCancel = async () => {
    if (confirm('Tem certeza de que deseja cancelar a renovação da sua assinatura?')) {
      const updated = await cancelSubscription();
      onSubscriptionUpdate(updated);
      setFeedback({
        type: 'success',
        message: 'Sua assinatura foi cancelada. Seu acesso continuará ativo até o final do período vigente.',
      });
    }
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
            <span>Treino MAX APEX Membership</span>
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
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 ${
                subscription.isSubscribed
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>
                {subscription.isSubscribed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4" />}
                <span>{subscription.isSubscribed ? 'ASSINATURA ATIVA' : 'PLANO GRATUITO'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Active Subscription Details (If Subscribed) */}
      {subscription.isSubscribed && (
        <div className="bg-[#0f0f12] border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>{subscription.planName}</span>
                <span className="px-2 py-0.5 bg-rose-600/20 text-rose-400 text-[10px] rounded-md font-mono">
                  {subscription.billingCycle === 'yearly' ? 'ANUAL' : 'MENSAL'}
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Renovação automática via {subscription.paymentMethod.toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-white">
                R$ {subscription.priceBrl.toFixed(2).replace('.', ',')}
                <span className="text-xs font-normal text-zinc-400">/{subscription.billingCycle === 'yearly' ? 'ano' : 'mês'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1">
              <div className="text-[11px] text-zinc-400 flex items-center space-x-1.5">
                <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                <span>Próxima Renovação</span>
              </div>
              <div className="text-sm font-bold text-zinc-200">{formattedDate}</div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1">
              <div className="text-[11px] text-zinc-400 flex items-center space-x-1.5">
                <CreditCard className="h-3.5 w-3.5 text-zinc-500" />
                <span>Método</span>
              </div>
              <div className="text-sm font-bold text-zinc-200 capitalize">
                {subscription.paymentMethod === 'credit_card' ? 'Cartão de Crédito' : 'PIX Instantâneo'}
              </div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1">
              <div className="text-[11px] text-zinc-400 flex items-center space-x-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />
                <span>Status da Conta</span>
              </div>
              <div className="text-sm font-bold text-emerald-400 capitalize">
                {subscription.status === 'active' ? 'Ativo & Regular' : subscription.status}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              onClick={handleCancel}
              className="text-xs text-zinc-400 hover:text-rose-400 underline transition-colors cursor-pointer"
            >
              Cancelar renovação automática
            </button>
          </div>
        </div>
      )}

      {/* Plan Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Plan */}
        <div 
          onClick={() => setSelectedPlanId('pro_monthly')}
          className={`relative bg-[#0f0f12] border rounded-3xl p-6 sm:p-8 space-y-6 cursor-pointer transition-all ${
            selectedPlanId === 'pro_monthly' 
              ? 'border-rose-500 shadow-xl shadow-rose-500/10' 
              : 'border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="space-y-2">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Plano Mensal
            </div>
            <h3 className="text-2xl font-black text-white">Treino MAX PRO</h3>
            <p className="text-xs text-zinc-400">Flexibilidade total, cancele quando desejar.</p>
          </div>

          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-black text-white">R$ 15,00</span>
            <span className="text-xs text-zinc-400">/ mês</span>
          </div>

          <ul className="space-y-2.5 text-xs text-zinc-300">
            <li className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-rose-500" />
              <span>Full Body 2.5 Engine completo</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-rose-500" />
              <span>Coach IA KINETIX ilimitado</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-rose-500" />
              <span>BioAtlas 3D com todos os exercícios</span>
            </li>
          </ul>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenCheckoutModal) {
                onOpenCheckoutModal();
              } else {
                handleSubscribeWithGooglePlay('pro_monthly');
              }
            }}
            disabled={isBuying}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <span>Assinar Plano Mensal</span>
          </button>
        </div>

        {/* Annual Plan (Featured) */}
        <div 
          onClick={() => setSelectedPlanId('pro_annual')}
          className={`relative bg-[#0f0f12] border rounded-3xl p-6 sm:p-8 space-y-6 cursor-pointer transition-all ${
            selectedPlanId === 'pro_annual' 
              ? 'border-rose-500 shadow-2xl shadow-rose-500/20' 
              : 'border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="absolute top-0 right-8 -translate-y-1/2 bg-gradient-to-r from-rose-600 to-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
            33% DE ECONOMIA
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-1">
              <Star className="h-3.5 w-3.5 fill-rose-500" />
              <span>Mais Popular • Anual</span>
            </div>
            <h3 className="text-2xl font-black text-white">Treino MAX APEX</h3>
            <p className="text-xs text-zinc-400">12 meses de evolução contínua pelo melhor valor.</p>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">R$ 10,00</span>
            <span className="text-xs text-zinc-400">/ mês (R$ 120/ano)</span>
          </div>

          <ul className="space-y-2.5 text-xs text-zinc-300">
            <li className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Tudo do Plano PRO</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Backup em Nuvem Ilimitado no Google Drive</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Suporte Prioritário & Novos Recursos em Primeira Mão</span>
            </li>
          </ul>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenCheckoutModal) {
                onOpenCheckoutModal();
              } else {
                handleSubscribeWithGooglePlay('pro_annual');
              }
            }}
            disabled={isBuying}
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            <span>Assinar Plano Anual com Desconto</span>
          </button>
        </div>
      </div>

      {/* Restore & Policy Links */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs text-zinc-500">
        <button
          onClick={handleRestore}
          disabled={isRestoring}
          className="flex items-center space-x-1.5 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
          <span>Restaurar Assinatura Anterior</span>
        </button>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setLegalModalType('terms')}
            className="hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Termos de Uso
          </button>
          <span>•</span>
          <button
            onClick={() => setLegalModalType('privacy')}
            className="hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Privacidade
          </button>
        </div>
      </div>

      {/* Legal Modals */}
      {legalModalType && (
        <LegalModal
          isOpen={true}
          onClose={() => setLegalModalType(null)}
          type={legalModalType}
        />
      )}
    </div>
  );
};
