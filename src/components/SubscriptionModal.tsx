import React, { useState, useEffect } from 'react';
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
  Lock,
  RefreshCw,
  Loader2,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { SubscriptionState, PaymentMethodType } from '../types';
import { 
  createPixOrder, 
  createCardCheckoutSession,
  checkPaymentStatus,
  getSubscriptionState,
  PaymentIntentResponse 
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
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Server Payment Intent
  const [pixIntent, setPixIntent] = useState<PaymentIntentResponse | null>(null);
  const [cardIntent, setCardIntent] = useState<PaymentIntentResponse | null>(null);

  // Credit Card state
  const [cardName, setCardName] = useState(userName);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // Auto-generate PIX order from backend when PIX is selected
  useEffect(() => {
    if (isOpen && selectedMethod === 'pix' && !pixIntent) {
      setIsProcessing(true);
      createPixOrder('PRO')
        .then((intent) => {
          setPixIntent(intent);
          setIsProcessing(false);
        })
        .catch((err) => {
          setErrorMsg(err.message || 'Erro ao gerar ordem PIX no servidor.');
          setIsProcessing(false);
        });
    }
  }, [isOpen, selectedMethod, pixIntent]);

  if (!isOpen) return null;

  const handleCopyPix = () => {
    if (pixIntent?.copiaECola) {
      navigator.clipboard.writeText(pixIntent.copiaECola);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  const handleVerifyPixPayment = async () => {
    if (!pixIntent) return;
    setIsCheckingStatus(true);
    setErrorMsg(null);

    try {
      const res = await checkPaymentStatus(pixIntent.transactionId, 'pix_direct');
      if (res.status === 'approved') {
        const freshSub = await getSubscriptionState();
        onSubscriptionUpdate(freshSub);
        setSuccessMsg('Pagamento PIX liquidado e confirmado pelo servidor!');
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1500);
      } else {
        setErrorMsg('Aguardando liquidação bancária pelo webhook do Banco Central. Conclua a transferência no seu app bancário.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao consultar status no servidor.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleInitiateCardCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const intent = await createCardCheckoutSession('PRO');
      setCardIntent(intent);
      if (intent.checkoutUrl) {
        // Safe redirect to PCI-compliant gateway checkout
        window.open(intent.checkoutUrl, '_blank');
      }
      setSuccessMsg('Sessão de pagamento segura gerada com o gateway.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao iniciar checkout seguro.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#0f0f12] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 bg-rose-500/15 border border-rose-500/30 text-rose-400 px-3 py-1 rounded-full text-xs font-bold font-mono">
            <Sparkles className="h-3.5 w-3.5" />
            <span>GATEWAY SERVER-AUTHORITATIVE ATIVO</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Assinatura Athleta AI PRO & APEX
          </h2>
          <p className="text-xs text-zinc-400">
            Acesso ilimitado ao AI Coach KINETIX, BioAtlas 3D e prescrições Full Body avançadas.
          </p>
        </div>

        {/* Plan Value Banner */}
        <div className="bg-gradient-to-r from-rose-950/40 via-zinc-900 to-zinc-900 border border-rose-900/40 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Plano Mensal PRO
            </div>
            <div className="text-2xl font-black text-white flex items-baseline space-x-1">
              <span>R$ 15,00</span>
              <span className="text-xs font-normal text-zinc-400">/ mês</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Sem fidelidade ou carência. Cancele quando quiser.
            </div>
          </div>
          <div className="text-right">
            <span className="px-2.5 py-1 bg-rose-600/20 text-rose-400 border border-rose-600/30 rounded-lg text-[10px] font-bold">
              Gateway 100% Criptografado
            </span>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Payment Methods Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-2xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setSelectedMethod('pix')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              selectedMethod === 'pix'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span>PIX Instantâneo</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod('credit_card')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              selectedMethod === 'credit_card'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Cartão de Crédito</span>
          </button>
        </div>

        {/* Method 1: PIX Real Payment */}
        {selectedMethod === 'pix' && (
          <div className="space-y-4 animate-fadeIn">
            {isProcessing ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                <span className="text-xs text-zinc-400">Gerando QR Code PIX com o Banco Central...</span>
              </div>
            ) : pixIntent ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-5 bg-zinc-950 rounded-2xl border border-zinc-800">
                  {pixIntent.qrCodeUrl && (
                    <div className="p-2 bg-white rounded-2xl shadow-lg shrink-0">
                      <img
                        src={pixIntent.qrCodeUrl}
                        alt="QR Code PIX"
                        className="w-36 h-36 object-contain"
                      />
                    </div>
                  )}
                  <div className="space-y-2 text-center sm:text-left">
                    <div className="text-xs font-bold text-white">Como pagar com PIX:</div>
                    <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal list-inside">
                      <li>Abra o aplicativo do seu banco</li>
                      <li>Escolha pagar via <strong>PIX Copia e Cola / QR Code</strong></li>
                      <li>Escaneie a imagem ou cole o código abaixo</li>
                      <li>A liberação é automática via Webhook</li>
                    </ol>
                    <div className="text-[10px] text-amber-400 font-mono flex items-center space-x-1 pt-1 justify-center sm:justify-start">
                      <Clock className="h-3 w-3" />
                      <span>Expira em 15 minutos (TxID: {pixIntent.transactionId})</span>
                    </div>
                  </div>
                </div>

                {pixIntent.copiaECola && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-zinc-400">PIX Copia e Cola</div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={pixIntent.copiaECola}
                        className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 font-mono truncate focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                      >
                        {copiedPix ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copiado!</span>
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
                )}

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyPixPayment}
                    disabled={isCheckingStatus}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isCheckingStatus ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Verificando com o Servidor...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>Verificar Confirmação do Pagamento</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Method 2: Credit Card PCI Gateway */}
        {selectedMethod === 'credit_card' && (
          <form onSubmit={handleInitiateCardCheckout} className="space-y-4 animate-fadeIn">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-zinc-300 text-xs font-bold">
                <Lock className="h-4 w-4 text-emerald-400" />
                <span>Checkout Criptografado de Ponta a Ponta</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Em conformidade com a norma <strong>PCI-DSS</strong>, dados sensíveis de cartão de crédito não trafegam nem são armazenados na aplicação. O processamento é realizado diretamente pela infraestrutura bancária do gateway.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  Titular do Cartão
                </label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Nome impresso no cartão"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  Número do Cartão
                </label>
                <input
                  type="text"
                  required
                  maxLength={19}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="0000 0000 0000 0000"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    Validade (MM/AA)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="12/28"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    CVV
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="123"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Conectando com o Gateway...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>Concluir Pagamento com Segurança</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Guarantee */}
        <div className="pt-2 flex items-center justify-center space-x-4 text-[10px] text-zinc-500">
          <div className="flex items-center space-x-1">
            <Lock className="h-3 w-3 text-emerald-500" />
            <span>SSL 256-bit</span>
          </div>
          <div>•</div>
          <div>Cancelamento a qualquer momento</div>
          <div>•</div>
          <div>Suporte 24/7</div>
        </div>
      </div>
    </div>
  );
};
