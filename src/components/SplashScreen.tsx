import React, { useEffect, useState } from 'react';
import { Dumbbell, Sparkles, ShieldCheck } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Inicializando Motor de Inteligência Artificial...');

  useEffect(() => {
    const steps = [
      { p: 25, label: 'Carregando Módulos de Biomecânica...' },
      { p: 55, label: 'Verificando Chaves de Criptografia & JWT...' },
      { p: 85, label: 'Sincronizando Sessão Ativa com o Firebase Cloud...' },
      { p: 100, label: 'Acesso Liberado! Bem-vindo.' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].p);
        setStatusText(steps[currentStep].label);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onFinish();
        }, 400);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col items-center justify-center p-6 select-none overflow-hidden animate-fadeIn">
      {/* Background Animated Crimson Ambient Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Logo & Badge */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-sm w-full">
        <div className="relative">
          <div className="h-24 w-24 rounded-3xl bg-gradient-to-tr from-rose-600 via-red-500 to-rose-400 p-0.5 shadow-2xl shadow-rose-600/40 animate-bounce">
            <div className="h-full w-full bg-[#0f0f12] rounded-[22px] flex items-center justify-center">
              <Dumbbell className="h-12 w-12 text-rose-500 transform -rotate-12" />
            </div>
          </div>
          <div className="absolute -top-2 -right-2 bg-rose-600 text-white p-1.5 rounded-full shadow-lg">
            <Sparkles className="h-4 w-4 fill-white" />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center space-x-2">
            <span>TREINO</span>
            <span className="text-rose-500">MAX</span>
          </h1>
          <p className="text-xs text-zinc-400 font-semibold tracking-wider uppercase">
            Prescrição Científica & Alta Performance
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full space-y-2 pt-4">
          <div className="w-full h-2.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-red-500 rounded-full transition-all duration-300 ease-out shadow-md shadow-rose-600/50"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
            <span className="truncate max-w-[220px]">{statusText}</span>
            <span className="font-bold text-rose-400 shrink-0">{progress}%</span>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="pt-8 flex items-center justify-center space-x-2 text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
          <ShieldCheck className="h-3.5 w-3.5 text-rose-500" />
          <span>Sessão Protegida • JWT 256-bit</span>
        </div>
      </div>
    </div>
  );
};
