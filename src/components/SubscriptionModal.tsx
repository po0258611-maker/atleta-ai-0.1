import React, { useState } from 'react';
import { 
  X, 
  Check, 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  Copy, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Zap, 
  Lock,
  RefreshCw
} from 'lucide-react';
import { SubscriptionState, PaymentMethodType } from '../types';
import { 
  generatePixDetails, 
  processCreditCardPayment, 
  confirmPixPayment 
} from '../services/subscriptionService';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: SubscriptionState;
  onSubscriptionUpdate: (updatedState: SubscriptionState) => void;
  userEmail?: string;
  userName?: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  subscription,
  onSubscriptionUpdate,
  userEmail = 'atleta@gmail.com',
  userName = 'Atleta',
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Credit Card Form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState(userName);
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);

  // Generated PIX data
  const [pixData] = useState(() => generatePixDetails(userEmail, userName));

  if (!isOpen) return null;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixData.copiaECola);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleConfirmPix = async () => {
    setIsProcessing(true);
    try {
      const updated = await confirmPixPayment();
      onSubscriptionUpdate(updated);
      setSuccessMsg('Pagamento PIX confirmado com sucesso! Seu plano PRO está ativo.');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch {
      setIsProcessing(false);
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardError(null);

    const cleanCard = cardNumber.replace(/\s+/g, '');
    if (cleanCard.length < 13) {
      setCardError('Por favor, digite um número de cartão válido.');
      return;
    }
    if (!expiry || !cvv) {
      setCardError('Por favor, preencha a data de validade e o código CVV.');
      return;
    }

    setIsProcessing(true);
    try {
      const updated = await processCreditCardPayment({
        cardNumber,
        cardName,
        expiry,
        cvv,
      });
      onSubscriptionUpdate(updated);
      setSuccessMsg('Cartão aprovado! Assinatura ativada com sucesso.');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch {
      setCardError('Falha ao processar pagamento. Verifique os dados do cartão.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0f0f12] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Badge & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-rose-500/15 border border-rose-500/30 rounded-full text-rose-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Assinatura Individual PRO</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Plano PRO Athleta AI
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto font-medium">
            Acesso ilimitado ao Motor Científico Full-Body, Nutrição Flexível com IA e Histórico de Cargas.
          </p>
        </div>

        {/* Price Card */}
        <div className="bg-gradient-to-r from-rose-950/40 via-[#0f0f12] to-zinc-950 border border-rose-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-xs text-zinc-400 font-bold uppercase">Apenas</span>
              <span className="text-3xl sm:text-4xl font-black text-rose-500">R$ 15,00</span>
              <span className="text-xs text-zinc-400 font-medium">/ mês por pessoa</span>
            </div>
            <p className="text-[11px] text-zinc-300 mt-1 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span>Sem taxa de adesão • Cancele quando quiser sem fidelidade</span>
            </p>
          </div>

          <div className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/30 shrink-0">
            Mais Vendido
          </div>
        </div>

        {/* Features List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-zinc-200">
          <div className="flex items-center space-x-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
            <Check className="h-4 w-4 text-rose-400 shrink-0" />
            <span>Prescrição IA Ilimitada (Fullbody 2x a 5x)</span>
          </div>
          <div className="flex items-center space-x-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
            <Check className="h-4 w-4 text-rose-400 shrink-0" />
            <span>Motor Biomecânico & Guia PT-BR com Áudio</span>
          </div>
          <div className="flex items-center space-x-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
            <Check className="h-4 w-4 text-rose-400 shrink-0" />
            <span>Dieta Flexível & Plano Macronutricional</span>
          </div>
          <div className="flex items-center space-x-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
            <Check className="h-4 w-4 text-rose-400 shrink-0" />
            <span>Exportação de PDF & Registrador de Cargas</span>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center space-x-3 text-emerald-300 text-xs font-bold animate-fadeIn">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Payment Methods Tabs */}
        <div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
            <CreditCard className="h-4 w-4 text-rose-400" />
            <span>Escolha a forma de pagamento:</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedMethod('pix')}
              className={`p-3.5 rounded-2xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all cursor-pointer ${
                selectedMethod === 'pix'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-lg shadow-rose-600/15'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
            >
              <QrCode className="h-4 w-4" />
              <span>PIX (Instantâneo)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('credit_card')}
              className={`p-3.5 rounded-2xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all cursor-pointer ${
                selectedMethod === 'credit_card'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-lg shadow-rose-600/15'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Cartão de Crédito</span>
            </button>
          </div>

          {/* PIX Method Details */}
          {selectedMethod === 'pix' && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4 text-center animate-fadeIn">
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 bg-white rounded-2xl shadow-xl inline-block">
                  <img
                    src={pixData.qrCodeUrl}
                    alt="QR Code PIX Athleta AI"
                    className="w-40 h-40 object-contain"
                  />
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Chave expira em 15 minutos</span>
                </div>
              </div>

              {/* Copia e Cola Code */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-zinc-300">Código PIX Copia e Cola:</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={pixData.copiaECola}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[11px] font-mono text-zinc-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shrink-0"
                  >
                    {copiedPix ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Button */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmPix}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-xl shadow-rose-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Confirmando Pagamento...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 fill-white" />
                    <span>CONFIRMAR PAGAMENTO PIX (R$ 15,00)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Credit Card Form */}
          {selectedMethod === 'credit_card' && (
            <form onSubmit={handleCardSubmit} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3 animate-fadeIn">
              {cardError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                  {cardError}
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-zinc-300 mb-1 block">Número do Cartão:</label>
                <input
                  type="text"
                  required
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 mb-1 block">Nome do Titular:</label>
                <input
                  type="text"
                  required
                  placeholder="Nome impresso no cartão"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 mb-1 block">Validade (MM/AA):</label>
                  <input
                    type="text"
                    required
                    placeholder="12/28"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 mb-1 block">CVV:</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full mt-2 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-xl shadow-rose-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processando Pagamento...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>ASSINAR AGORA POR R$ 15,00 / MÊS</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Security Footer */}
        <div className="text-center text-[11px] text-zinc-400 flex items-center justify-center space-x-2 pt-2 border-t border-zinc-800 font-medium">
          <ShieldCheck className="h-4 w-4 text-rose-400" />
          <span>Pagamento seguro de 256 bits com confirmação imediata</span>
        </div>
      </div>
    </div>
  );
};
