import React from 'react';
import { ShieldCheck, Cpu, BookOpen, Activity, MessageSquare, Code, Layers } from 'lucide-react';

export const SRSOverviewModal: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <ShieldCheck className="h-4 w-4" />
          <span>Software Requirements Specification (SRS v1.0)</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Arquitetura de Sistema & Especificação de Engenharia
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Documentação de arquitetura do Athleta AI organizada em 4 Motores Independentes desacoplados (Clean Architecture & SOLID).
        </p>
      </div>

      {/* 4 Engine Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Engine 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">1. Workout Engine</h3>
              <p className="text-xs text-slate-400">Núcleo de Prescrição Algorítmica</p>
            </div>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside bg-slate-950 p-3 rounded-xl border border-slate-800">
            <li>Gera rotinas dinâmicas baseadas em regras (100% FULL BODY).</li>
            <li>Calcula volume semanal por músculo de acordo com a biometria.</li>
            <li>Define ordem dos exercícios evitando fadiga axial consecutiva.</li>
            <li>Estrutura divisões Full Body A, B, C, D de 2 a 4x/semana.</li>
          </ul>
        </div>

        {/* Engine 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">2. Exercise Engine</h3>
              <p className="text-xs text-slate-400">Biblioteca Biomecânica & Matriz</p>
            </div>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside bg-slate-950 p-3 rounded-xl border border-slate-800">
            <li>300+ regras de substituição de exercícios para Academia Pequena/Casa.</li>
            <li>Mapeamento de padrões motores (Squat, Hinge, Push, Pull, Core).</li>
            <li>Especificação de planos de movimento, cadências e falhas comuns.</li>
            <li>Substitutos automáticos para limitações e lesões.</li>
          </ul>
        </div>

        {/* Engine 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">3. Progress Engine</h3>
              <p className="text-xs text-slate-400">Cargas, Fadiga & Deload</p>
            </div>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside bg-slate-950 p-3 rounded-xl border border-slate-800">
            <li>Algoritmo de Progressão Dupla (Double Progression) e Cargas.</li>
            <li>Cálculo fisiológico da fadiga sistêmica (Volume, RPE, Sono, DOMS).</li>
            <li>Disparo automático de semanas de Deload quando fadiga &gt; 85%.</li>
            <li>Logger de treinos em tempo real com cronômetro de descanso.</li>
          </ul>
        </div>

        {/* Engine 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">4. AI Coach Engine</h3>
              <p className="text-xs text-slate-400">Integração Gemini API (Server-Side)</p>
            </div>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside bg-slate-950 p-3 rounded-xl border border-slate-800">
            <li>Interpretação e explicação técnica das decisões de prescrição.</li>
            <li>Assistente interativo via endpoint seguro `/api/ai-coach`.</li>
            <li>Utiliza modelo `@google/genai` (Gemini 3.6 Flash) no servidor.</li>
            <li>Parecer científico personalizado para cada treino gerado.</li>
          </ul>
        </div>

      </div>

      {/* JSON Schema Display */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-base text-white flex items-center space-x-2">
          <Code className="h-4 w-4 text-cyan-400" />
          <span>Esquema de Dados do Exercício (JSON Schema SRS)</span>
        </h3>

        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-cyan-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`{
  "id": "ex_squat_barbell",
  "nome": "Agachamento Livre com Barra",
  "grupoMuscular": "quadriceps",
  "musculosSecundarios": ["gluteos", "core"],
  "categoria": "compound",
  "equipamento": "barbell",
  "nivel": "intermediate",
  "tipoMovimento": "legs",
  "padraoMotor": "squat",
  "planoMovimento": "sagittal",
  "execucao": "Pés na largura dos ombros, descida profunda mantendo coluna neutra...",
  "respiracao": "Valsalva na descida, expiração ao passar pelo ponto crítico...",
  "amplitude": "Profundidade com quadril abaixo dos joelhos",
  "cadencia": "3-1-1-0",
  "rir": 2,
  "rpe": 8,
  "descanso": 150,
  "substitutos": [
    {
      "originalId": "ex_squat_barbell",
      "replacementId": "ex_leg_press_45",
      "condition": "small_gym",
      "equivalenceScore": 90
    }
  ]
}`}
        </pre>
      </div>

    </div>
  );
};
