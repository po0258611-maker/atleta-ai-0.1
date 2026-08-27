import React from 'react';
import { X, ShieldCheck, FileText, Lock } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  type: 'terms' | 'privacy' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, type, onClose }) => {
  if (!isOpen || !type) return null;

  const isTerms = type === 'terms';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0b1329] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              {isTerms ? <FileText className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isTerms ? 'Termos de Uso Treino MAX' : 'Política de Privacidade & LGPD'}
              </h2>
              <p className="text-xs text-slate-400">
                Última atualização: Agosto de 2026 • Versão 2.4 (Conforme LGPD/GDPR)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Document Body */}
        <div className="flex-1 overflow-y-auto space-y-4 text-xs text-slate-300 pr-2 leading-relaxed font-sans">
          {isTerms ? (
            <>
              <h3 className="text-sm font-bold text-white">1. Aceitação dos Termos</h3>
              <p>
                Ao acessar e utilizar o aplicativo **Treino MAX**, você concorda expressamente em cumprir estes Termos de Uso e todas as leis aplicáveis. A assinatura individual Treino MAX PRO (R$ 15,00/mês ou R$ 120,00/ano) concede acesso às funcionalidades exclusivas de geração de prescrição de treino e cálculo de macronutrientes.
              </p>

              <h3 className="text-sm font-bold text-white">2. Isenção de Responsabilidade Médica</h3>
              <p>
                As recomendações fornecidas pelo Motor de Inteligência Artificial do Treino MAX têm caráter estritamente informativo e educativo com base em literatura de educação física. O usuário deve consultar um médico ou profissional de saúde habilitado antes de iniciar qualquer programa de exercícios intensos.
              </p>

              <h3 className="text-sm font-bold text-white">3. Assinatura, Cobrança e Cancelamento</h3>
              <p>
                As assinaturas digitais do Treino MAX são processadas via Google Play Billing ou gateway de pagamento seguro. O cancelamento pode ser efetuado a qualquer momento nas configurações do aplicativo ou na sua conta do Google Play, sem aplicação de multas ou fidelidade obrigatória.
              </p>

              <h3 className="text-sm font-bold text-white">4. Propriedade Intelectual</h3>
              <p>
                Todos os algoritmos de prescrição biomecânica, marcas, logos e conteúdos de exercícios são de propriedade exclusiva do Treino MAX.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-white">1. Coleta de Dados Biométricos</h3>
              <p>
                Coletamos apenas as informações estritamente necessárias para calibrar o volume semanal e consumo calórico: sexo biométrico, idade, peso, altura, histórico de lesões e objetivo esportivo.
              </p>

              <h3 className="text-sm font-bold text-white">2. Criptografia e Segurança dos Dados</h3>
              <p>
                Todos os dados de cadastro e histórico de cargas são armazenados no **Cloud Firestore** sob protocolos de criptografia TLS 1.3 em trânsito e AES-256 em repouso.
              </p>

              <h3 className="text-sm font-bold text-white">3. Direitos do Titular (LGPD Art. 18)</h3>
              <p>
                O usuário pode a qualquer momento solicitar a exportação, anonimização ou exclusão definitiva de seu perfil e histórico de dados diretamente pelo menu de suporte do app.
              </p>

              <h3 className="text-sm font-bold text-white">4. Não Compartilhamento com Terceiros</h3>
              <p>
                O Treino MAX não vende nem compartilha dados pessoais ou histórico de treinos com parceiros de anúncios comerciais.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
