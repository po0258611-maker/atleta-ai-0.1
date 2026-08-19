import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UserProfile, FullBodyProgram, SubscriptionState } from '../types';
import { askAICoach } from '../engine/aiCoachEngine';
import { FeaturePermissions, PermissionService } from '../services/permissionService';
import { ProgressionEngine, IntelligentGoalTarget } from '../services/progressionEngine';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  User, 
  Dumbbell, 
  ShieldCheck, 
  CheckCircle2, 
  Cpu, 
  RefreshCw, 
  Zap,
  Lock,
  BrainCircuit,
  Target,
  Flame,
  Activity
} from 'lucide-react';

interface AICoachViewProps {
  profile: UserProfile;
  program: FullBodyProgram | null;
  subscription?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
  onOpenAIImitationModal?: () => void;
  onOpenPremiumGate?: (title: string, desc: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export const AICoachView: React.FC<AICoachViewProps> = ({
  profile,
  program,
  subscription,
  onOpenSubscriptionModal,
  onOpenAIImitationModal,
  onOpenPremiumGate,
}) => {
  const permissions: FeaturePermissions = useMemo(() => {
    return PermissionService.getPermissions(subscription || null);
  }, [subscription]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [queryCount, setQueryCount] = useState<number>(0);
  const [showGoalsCalculator, setShowGoalsCalculator] = useState<boolean>(false);

  const intelligentGoals: IntelligentGoalTarget = useMemo(() => {
    return ProgressionEngine.calculateIntelligentGoals(profile);
  }, [profile]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: `Olá, **${profile.name}**! Eu sou o **KINETIX AI™**, sua inteligência biomecânica e de performance de alta precisão do Athleta AI.

Fui projetado com foco em **ciência do exercício, controle biomecânico e otimização metabólica**:
- **Treinamento & Biomecânica de Precisão:** Prescrição Full Body, vetor de força, RIR/RPE e gestão de fadiga central.
- **Engenharia Metabólica (NutriFlux):** Dieta flexível (IIFYM), cálculo de macros, fibras e particionamento de nutrientes.
- **Suplementação & Recuperação:** Creatina, Whey, Beta-Alanina, higiene do sono e preservação articular.

**Seu Perfil Biométrico:**
- **Nível:** ${profile.experience.toUpperCase()} (${profile.availableDays}x/semana - Fullbody Matrix)
- **Ambiente:** ${profile.equipmentAccess === 'full_gym' ? 'Academia Completa' : profile.equipmentAccess === 'small_gym' ? 'Academia de Condomínio' : 'Home Gym / Peso Corporal'}

Como posso orientar seus treinos ou estratégia metabólica hoje?`,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const suggestedQuestions = [
    `Como otimizar a hipertrofia natural no nível ${profile.experience.toUpperCase()}?`,
    'Quais os melhores suplementos naturais comprovados pela ciência?',
    'Como organizar os macronutrientes da Dieta Flexível para perda de gordura?',
    'Como melhorar o sono e a recuperação para otimizar a síntese proteica?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = textToSend || inputPrompt;
    if (!promptText.trim() || loading) return;

    // Check query limit for Core Pass users
    if (!permissions.hasApexPass && queryCount >= permissions.maxKinetixAiQueriesPerDay) {
      if (onOpenPremiumGate) {
        onOpenPremiumGate(
          'Consultas Ilimitadas no KINETIX AI™',
          `Você atingiu o limite de ${permissions.maxKinetixAiQueriesPerDay} consultas gratuitas por sessão do Athleta Core Pass. Assine o Passe APEX para obter acessos ilimitados e sem restrições.`
        );
      }
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: promptText,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputPrompt('');
    setLoading(true);
    setQueryCount((prev) => prev + 1);

    const aiResponseText = await askAICoach(promptText, profile, program);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: aiResponseText,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
  };

  // Helper function to render markdown-style formatted text (bold, lists, code, spacing)
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-2" />;

          // Process bold tags **text**
          const parts = line.split(/(\*\*.*?\*\*)/g);
          const formattedLine = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="font-bold text-emerald-300">{part.slice(2, -2)}</strong>;
            }
            return part;
          });

          // Bullet point lines
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start space-x-2 pl-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{formattedLine}</span>
              </div>
            );
          }

          // Numbered list lines
          if (/^\d+\.\s/.test(line.trim())) {
            return (
              <div key={idx} className="flex items-start space-x-2 pl-2">
                <span className="text-emerald-400 font-bold font-mono">{line.trim().split(' ')[0]}</span>
                <span>{formattedLine}</span>
              </div>
            );
          }

          return <p key={idx}>{formattedLine}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 text-slate-100 animate-fadeIn">
      
      {/* Header Banner with Gemini Status & APEX Badges */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="space-y-1 relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              <span>Google Gemini 3.6 Flash</span>
            </div>

            <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              permissions.hasApexPass
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {permissions.hasApexPass ? (
                <>
                  <Zap className="h-3.5 w-3.5 text-rose-400 fill-rose-400" />
                  <span>KINETIX AI™ ILIMITADO (APEX)</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  <span>QUOTA CORE PASS: {queryCount}/3 USADAS</span>
                </>
              )}
            </div>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            KINETIX AI™ — Biomechanical Intelligence
          </h2>
          <p className="text-xs text-slate-400">
            Consultoria em tempo real baseada em ciência do exercício, ajuste de cargas e adaptação de perfis biomecânicos.
          </p>

          {/* Quick Action Buttons */}
          <div className="pt-2 flex flex-wrap gap-2">
            <button
              onClick={onOpenAIImitationModal}
              className="px-3.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <BrainCircuit className="h-3.5 w-3.5 text-rose-400" />
              <span>Clonagem Biomecânica de Atletas AI</span>
            </button>

            <button
              onClick={() => setShowGoalsCalculator(!showGoalsCalculator)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Target className="h-3.5 w-3.5 text-cyan-400" />
              <span>Calculadora de Metas Inteligentes AI</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900 px-3.5 py-2 rounded-2xl border border-slate-800 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-200">Gemini Online</span>
        </div>
      </div>

      {/* Intelligent Goals Calculator Modal / Box */}
      {showGoalsCalculator && (
        <div className="bg-[#0f0f12] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
              <Target className="h-5 w-5" />
              <span>Metas Inteligentes AI & Projeção de Macrociclo (Progression Engine)</span>
            </div>
            <button
              onClick={() => setShowGoalsCalculator(false)}
              className="text-xs text-zinc-400 hover:text-white bg-zinc-900 px-2.5 py-1 rounded-lg"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-1">
              <span className="text-zinc-500 font-semibold block text-[11px]">Meta de Peso Corporal:</span>
              <div className="text-lg font-black text-white">{intelligentGoals.targetWeightKg} kg</div>
              <span className="text-[10px] text-zinc-400">Tempo Estimado: {intelligentGoals.estimatedWeeksToGoal} semanas</span>
            </div>

            <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-1">
              <span className="text-zinc-500 font-semibold block text-[11px]">Meta de Calorias Diárias:</span>
              <div className="text-lg font-black text-emerald-400">{intelligentGoals.recommendedDailyCalories} kcal</div>
              <span className="text-[10px] text-zinc-400">Proteínas: {intelligentGoals.macroRatio.proteinGrams}g | Carbos: {intelligentGoals.macroRatio.carbsGrams}g | Gorduras: {intelligentGoals.macroRatio.fatsGrams}g</span>
            </div>

            <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-1">
              <span className="text-zinc-500 font-semibold block text-[11px]">Diretriz de Progressão:</span>
              <div className="text-xs font-bold text-cyan-300 space-y-0.5 mt-1">
                <div>• Sobrecarga: Double & Rep Progression</div>
                <div>• Autorregulação: Baseada em RIR/RPE</div>
                <div>• 1RM: Calculado sob demanda com dados reais</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 min-h-[440px] max-h-[580px] overflow-y-auto flex flex-col justify-between">
        
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex space-x-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="h-9 w-9 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md shadow-emerald-500/20 mt-1">
                  <Sparkles className="h-5 w-5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-3xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed shadow-lg ${
                  msg.sender === 'user'
                    ? 'bg-[#00c875] text-slate-950 font-semibold rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
                }`}
              >
                {msg.sender === 'ai' ? renderFormattedText(msg.text) : <div>{msg.text}</div>}
                
                <div className={`text-[10px] mt-2 font-mono ${msg.sender === 'user' ? 'text-slate-900 font-bold' : 'text-slate-400'} text-right`}>
                  {msg.time}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="h-9 w-9 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shrink-0 mt-1">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-3 text-emerald-400 text-xs bg-slate-900 p-4 rounded-2xl border border-slate-800 w-fit shadow-lg animate-pulse">
              <Sparkles className="h-4 w-4 animate-spin text-emerald-400" />
              <span className="font-semibold">Gemini 3.6 Flash consultando diretrizes científicas...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Questions */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Dúvidas Frequentes:</span>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(q)}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/40 px-3 py-2 rounded-xl text-xs transition-all text-left font-medium cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Input Bar */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-3 shadow-2xl flex items-center space-x-3">
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Digite sua dúvida sobre treino, cargas, dores ou suplementos..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={loading || !inputPrompt.trim()}
          className="bg-[#00c875] hover:bg-emerald-400 text-slate-950 font-bold px-5 py-3 rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer transition-all"
        >
          <span>Enviar</span>
          <Send className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
};

