import React, { useState, useEffect, useRef } from 'react';
import { Exercise } from '../types';
import { EXERCISE_DATABASE } from '../engine/exerciseData';
import {
  X,
  Heart,
  Dumbbell,
  Target,
  CheckCircle2,
  Wind,
  Lightbulb,
  AlertTriangle,
  Activity,
  Repeat,
  Layers,
  Sparkles,
  Zap,
  Video,
  Play,
  PlayCircle,
  ExternalLink,
  Film,
  Volume2,
  VolumeX,
  Gauge,
  ShieldCheck,
  Search,
} from 'lucide-react';

interface ExerciseDetailModalProps {
  exercise: Exercise;
  onClose: () => void;
  onToggleFavorite?: (exerciseId: string) => void;
  isFavorite?: boolean;
  onSelectExercise?: (exercise: Exercise) => void;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exercise,
  onClose,
  onToggleFavorite,
  isFavorite = false,
  onSelectExercise,
}) => {
  const videoId = exercise.youtubeVideoId || (exercise.video ? exercise.video.split('/').pop()?.split('?')[0] : null);

  const [activeMediaTab, setActiveMediaTab] = useState<'video_free' | 'demo' | '3d'>('video_free');
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [highlightVideo, setHighlightVideo] = useState<boolean>(false);

  const mediaContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync tab state and stop speech when exercise changes
  useEffect(() => {
    setActiveMediaTab('video_free');
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [exercise.id]);

  const handleGoToVideo = (stepText?: string) => {
    setActiveMediaTab('video_free');
    setHighlightVideo(true);

    if (mediaContainerRef.current) {
      mediaContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }

    setTimeout(() => {
      setHighlightVideo(false);
    }, 2000);
  };

  const speakInstructionsPT = () => {
    if (!('speechSynthesis' in window)) {
      alert('Seu navegador não suporta sintetizador de voz.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = `Exercício: ${exercise.nome}. Objetivo: ${exercise.objetivo || exercise.execucao}. Dica técnica: ${exercise.dicaPrincipal || ''}. Passo a passo: ${exercise.passoAPasso?.join('. ') || exercise.execucao}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const muscleLabels: Record<string, string> = {
    peitoral: 'Peitoral Maior / Menor',
    costas: 'Costas (Latíssimo, Trapézio, Romboide)',
    ombros: 'Ombros (Deltóide Anterior, Lateral, Posterior)',
    biceps: 'Bíceps Braquial & Braquiorradial',
    triceps: 'Tríceps (Porção Longa, Lateral, Medial)',
    quadriceps: 'Quadríceps (Vastos & Reto Femural)',
    posteriores: 'Posteriores de Coxa (Isquiotibiais)',
    gluteos: 'Glúteo Máximo, Médio & Mínimo',
    panturrilhas: 'Panturrilhas (Gastrocnêmio & Sóleo)',
    core: 'Core (Reto Abdominal, Transverso & Oblíquos)',
  };

  const levelLabels: Record<string, { label: string; color: string }> = {
    beginner: { label: 'Iniciante', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    intermediate: { label: 'Intermediário', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    advanced: { label: 'Avançado', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  };

  const equipLabels: Record<string, string> = {
    barbell: 'Barra Olímpica / Livre',
    dumbbell: 'Halteres',
    machine: 'Máquina Guiada',
    cable: 'Cabos / Polia Alta/Baixa',
    bodyweight: 'Peso Corporal (Calistenia)',
    band: 'Elástico de Resistência',
    smith: 'Barra Guiada (Smith)',
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden relative max-h-[92vh] flex flex-col my-auto">
        
        {/* Top Sticky Header */}
        <div className="bg-slate-900/95 border-b border-slate-800 p-4 sm:p-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md shrink-0">
          <div className="flex items-center space-x-3 pr-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-950/50">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  VÍDEO SEM DIREITOS AUTORAIS (PT-BR)
                </span>
                <span className={`text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full border ${levelLabels[exercise.nivel]?.color || ''}`}>
                  {levelLabels[exercise.nivel]?.label || exercise.nivel}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5 tracking-tight flex items-center gap-2">
                <span>{exercise.nome}</span>
              </h2>
              {exercise.nomeEnglish && (
                <p className="text-xs text-slate-400 italic">{exercise.nomeEnglish}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(exercise.id)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isFavorite
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                }`}
                title={isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
              >
                <Heart className={`h-5 w-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer border border-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* Section 1: Interactive Media Container (Video Free vs YouTube vs 3D) & Specs */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            
            {/* Media Box */}
            <div
              ref={mediaContainerRef}
              className={`md:col-span-7 bg-slate-950 rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col relative group min-h-[280px] shadow-inner ${
                highlightVideo
                  ? 'border-emerald-400 ring-4 ring-emerald-500/50 scale-[1.01]'
                  : 'border-slate-800'
              }`}
            >
              
              {/* Media Switcher Tab Buttons */}
              <div className="bg-slate-900/90 border-b border-slate-800/80 p-2 flex items-center justify-between shrink-0 flex-wrap gap-1">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setActiveMediaTab('video_free')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeMediaTab === 'video_free'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>Vídeo (YouTube)</span>
                  </button>

                  <button
                    onClick={() => setActiveMediaTab('demo')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeMediaTab === 'demo'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    <span>Guia Animado PT</span>
                  </button>

                  <button
                    onClick={() => setActiveMediaTab('3d')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeMediaTab === '3d'
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/50'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Anatomia 3D</span>
                  </button>
                </div>

                {/* Narration voice button */}
                <button
                  onClick={speakInstructionsPT}
                  className={`flex items-center space-x-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    isSpeaking
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/80'
                  }`}
                  title="Ouvir instrução de voz em português"
                >
                  {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  <span>{isSpeaking ? 'Parar Voz' : 'Ouvir PT-BR'}</span>
                </button>
              </div>

              {/* Active Tab View */}
              <div className="flex-1 flex flex-col items-center justify-center relative bg-slate-950 min-h-[240px]">
                {activeMediaTab === 'video_free' ? (
                  exercise.videoUrlMp4 ? (
                    <div className="w-full h-full relative bg-black flex flex-col items-center justify-center overflow-hidden">
                      <video
                        src={exercise.videoUrlMp4}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full max-h-[240px] object-contain"
                        ref={(ref) => {
                          if (ref) {
                            (videoRef as any).current = ref;
                            ref.playbackRate = playbackSpeed;
                          }
                        }}
                      />
                      {/* Subtitle Bar */}
                      <div className="w-full bg-slate-900/90 border-t border-slate-800 p-2 text-center text-[11px] text-emerald-300 font-medium">
                        {exercise.videoLegendaPT || exercise.dicaPrincipal || exercise.execucao}
                      </div>
                    </div>
                  ) : videoId ? (
                    <div className="w-full h-full relative bg-black flex flex-col items-center justify-center overflow-hidden">
                      {/* Video Player */}
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${videoId}?hl=pt-BR&cc_lang_pref=pt-BR&rel=0&modestbranding=1&playsinline=1`}
                        title={`Vídeo demonstrativo de ${exercise.nome}`}
                        className="w-full h-[210px] sm:h-[240px] border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      
                      {/* Subtitle & Fallback Toolbar */}
                      <div className="w-full bg-slate-900 border-t border-slate-800 p-2.5 px-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-300 gap-2 flex-wrap">
                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                              PT-BR
                            </span>
                            <span className="truncate max-w-[240px] sm:max-w-[340px] text-slate-300 text-xs">
                              {exercise.videoLegendaPT || exercise.dicaPrincipal || exercise.execucao}
                            </span>
                          </div>

                          {/* Direct Action Links */}
                          <div className="flex items-center space-x-2 shrink-0">
                            <a
                              href={`https://www.youtube.com/watch?v=${videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shadow-md shadow-red-950/40"
                              title="Abrir diretamente no YouTube em nova aba"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Abrir no YouTube</span>
                            </a>

                            <button
                              onClick={() => setActiveMediaTab('demo')}
                              className="inline-flex items-center space-x-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                              title="Ativar Guia Biomecânico Animado"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>Guia Animado</span>
                            </button>
                          </div>
                        </div>

                        {/* Fallback Notice Banner */}
                        <div className="bg-slate-950/70 rounded-xl p-2 px-3 border border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 gap-2">
                          <span className="flex items-center gap-1.5">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span>Se o YouTube exibir restrição no player, acesse o <strong>Guia Animado</strong> ou abra no YouTube.</span>
                          </span>
                          <a
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.nome + ' como fazer execucao correta musculacao')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline shrink-0 font-medium"
                          >
                            Pesquisar no YouTube →
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* High Performance HTML5 Interactive Visual Loop */
                    <div className="w-full h-full p-4 flex flex-col items-center justify-center relative overflow-hidden bg-slate-950 text-center space-y-3">
                      <div className="relative w-20 h-20 rounded-full border-2 border-emerald-500/40 bg-emerald-950/30 flex items-center justify-center shadow-lg shadow-emerald-950/60 animate-bounce">
                        <Dumbbell className="h-10 w-10 text-emerald-400 rotate-45" />
                      </div>
                      
                      <div className="space-y-1 max-w-sm">
                        <div className="flex items-center justify-center space-x-1.5 text-emerald-400 text-xs font-bold">
                          <ShieldCheck className="h-4 w-4" />
                          <span>Demonstração de Movimento Técnica PT-BR</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                          {exercise.execucao}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <span className="text-[10px] bg-slate-900 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono">
                          Cadência: {exercise.cadencia}
                        </span>
                        <span className="text-[10px] bg-slate-900 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-mono">
                          RIR: {exercise.rir}
                        </span>
                      </div>
                    </div>
                  )
                ) : activeMediaTab === 'demo' ? (
                  /* Interactive Animated Kinematic Execution Guide */
                  <div className="w-full h-full p-4 sm:p-5 flex flex-col items-center justify-center relative overflow-hidden bg-slate-950 text-center space-y-3.5">
                    {/* Visual Animated Kinematic Stage */}
                    <div className="relative w-full max-w-sm bg-slate-900/90 rounded-2xl border border-slate-800 p-4 flex items-center justify-around shadow-lg">
                      <div className="flex flex-col items-center space-y-1">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-pulse">
                          <Dumbbell className="h-6 w-6 rotate-12" />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Padrão Motor</span>
                        <span className="text-xs font-bold text-white uppercase">{exercise.padraoMotor || 'Compound'}</span>
                      </div>

                      <div className="h-10 w-px bg-slate-800" />

                      <div className="flex flex-col items-center space-y-1">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                          <Gauge className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide">Cadência</span>
                        <span className="text-xs font-bold text-white font-mono">{exercise.cadencia}</span>
                      </div>

                      <div className="h-10 w-px bg-slate-800" />

                      <div className="flex flex-col items-center space-y-1">
                        <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
                          <Target className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Alvo</span>
                        <span className="text-xs font-bold text-white capitalize">{exercise.grupoMuscular}</span>
                      </div>
                    </div>

                    {/* Cadence Phase Visualizer Bar */}
                    <div className="w-full max-w-sm bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-left space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                          Ciclo de Repetição Ideal
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          RIR {exercise.rir} (Reserva)
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {exercise.execucao}
                      </p>

                      {exercise.dicaPrincipal && (
                        <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-xl p-2 text-[11px] text-emerald-300 flex items-start gap-1.5">
                          <Lightbulb className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span><strong>Dica de Ouro:</strong> {exercise.dicaPrincipal}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[10px]">
                      {videoId && (
                        <a
                          href={`https://www.youtube.com/watch?v=${videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-red-600/90 hover:bg-red-500 text-white px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all shadow-md"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Assistir Vídeo no YouTube</span>
                        </a>
                      )}
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.nome + ' execucao biomecanica')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all"
                      >
                        <Search className="h-3 w-3" />
                        <span>Pesquisar no YouTube PT-BR</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden relative">
                    {exercise.imagemAnatomica3D || exercise.imagem ? (
                      <img
                        src={exercise.imagemAnatomica3D || exercise.imagem}
                        alt={`Anatomia 3D de ${exercise.nome}`}
                        className="w-full h-full object-cover max-h-[260px] group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
                        <Activity className="h-12 w-12 text-cyan-400/50" />
                        <span className="text-xs text-slate-400">Modelo Anatômico 3D Ilustrativo</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Video Footer Speed Controls & Copyright Badge */}
              <div className="bg-slate-900/90 border-t border-slate-800 p-2.5 px-3 flex items-center justify-between text-[11px] text-slate-300">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Vídeo & Legendas em Português (PT-BR)</span>
                </div>

                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-slate-400 mr-1 flex items-center gap-0.5">
                    <Gauge className="h-3 w-3" />
                    Velocidade:
                  </span>
                  {[0.5, 0.75, 1].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                        playbackSpeed === spd
                          ? 'bg-emerald-500 text-slate-950 font-extrabold'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Specs List */}
            <div className="md:col-span-5 bg-slate-950/60 rounded-2xl border border-slate-800 p-4 sm:p-5 flex flex-col justify-between space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
                <Target className="h-4 w-4" />
                <span>Resumo Biomecânico</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Músculo Principal:</span>
                  <span className="font-bold text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/20">
                    {muscleLabels[exercise.grupoMuscular] || exercise.grupoMuscular}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Sinergistas:</span>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[170px]">
                    {exercise.musculosSecundarios.length > 0 ? (
                      exercise.musculosSecundarios.map((m) => (
                        <span key={m} className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                          {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">Nenhum</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Equipamento:</span>
                  <span className="font-semibold text-slate-200">{equipLabels[exercise.equipamento] || exercise.equipamento}</span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Padrão Motor:</span>
                  <span className="font-semibold text-slate-200">{exercise.padraoMotor.toUpperCase()}</span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Plano Movimento:</span>
                  <span className="font-semibold text-slate-200">{exercise.planoMovimento.toUpperCase()}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Fadiga Axial / Sistema:</span>
                  <span className="font-bold text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/20">
                    {exercise.fatigueIndex} / 5
                  </span>
                </div>
              </div>

              {/* Voice Narration Button */}
              <button
                onClick={speakInstructionsPT}
                className={`mt-2 w-full font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md ${
                  isSpeaking
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/40 animate-pulse'
                    : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <span>{isSpeaking ? 'PARAR NARRAÇÃO' : 'OUVIR GUIA EM PORTUGUÊS (PT-BR)'}</span>
              </button>
            </div>

          </div>

          {/* Section 2: Objective & Main Tip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exercise.objetivo && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-1">
                <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <Target className="h-4 w-4" />
                  <span>Objetivo do Exercício</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  {exercise.objetivo}
                </p>
              </div>
            )}

            {exercise.dicaPrincipal && (
              <div className="bg-slate-950/80 border border-amber-500/20 rounded-2xl p-4 space-y-1">
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Lightbulb className="h-4 w-4" />
                  <span>Dica de Ouro de Execução</span>
                </div>
                <p className="text-xs text-amber-200/90 leading-relaxed pt-1">
                  {exercise.dicaPrincipal}
                </p>
              </div>
            )}
          </div>

          {/* Section 3: Interactive Step-by-Step Guide ("PASSO A PASSO COM VÍDEO") */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Como Executar (Guia Passo a Passo Específico)</span>
              </h3>

              <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full font-medium">
                {exercise.passoAPasso?.length || 0} Etapas Técnicas
              </span>
            </div>

            {exercise.passoAPasso && exercise.passoAPasso.length > 0 ? (
              <div className="space-y-2.5">
                {exercise.passoAPasso.map((step, idx) => {
                  const isSelected = activeStepIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveStepIndex(idx)}
                      className={`flex items-start space-x-3 text-xs p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 border-cyan-500/50 shadow-md shadow-cyan-950/30 text-white'
                          : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <span
                        className={`h-6 w-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold'
                            : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {idx + 1}
                      </span>

                      <div className="flex-1 space-y-1">
                        <p className="leading-relaxed font-medium">
                          {step.replace(/^\d+\.\s*/, '')}
                        </p>
                        
                        {isSelected && (
                          <div className="pt-2 flex items-center space-x-3 text-[11px] font-bold animate-fadeIn">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGoToVideo(step);
                              }}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
                            >
                              <Play className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />
                              <span>Ver no Vídeo Livre</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800 leading-relaxed">
                {exercise.execucao}
              </p>
            )}
          </div>

          {/* Section 4: Breathing & Mechanics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-2">
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Wind className="h-4 w-4" />
                <span>Padrão Respiratório</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {exercise.respiracao}
              </p>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-2">
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Zap className="h-4 w-4" />
                <span>Cadência & Amplitude Recomendada</span>
              </div>
              <div className="text-xs text-slate-300 space-y-1">
                <p><strong>Cadência:</strong> <span className="text-cyan-300 font-mono">{exercise.cadencia}</span></p>
                <p><strong>Amplitude:</strong> {exercise.amplitude}</p>
              </div>
            </div>
          </div>

          {/* Section 5: Common Errors to Avoid */}
          <div className="bg-slate-950 rounded-2xl border border-rose-500/20 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Erros Comuns a Evitar</span>
            </h3>

            <div className="space-y-2 text-xs">
              {exercise.errosComuns.map((err, idx) => (
                <div key={idx} className="flex items-start space-x-2.5 bg-rose-950/20 p-2.5 rounded-xl border border-rose-500/20 text-rose-200">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Worked Muscle Groups */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
              <Layers className="h-4 w-4" />
              <span>Músculos Trabalhados no Movimento</span>
            </h3>

            <div className="flex flex-wrap gap-2 text-xs">
              <div className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                <span>Principal: {muscleLabels[exercise.grupoMuscular] || exercise.grupoMuscular}</span>
              </div>

              {exercise.musculosSecundarios.map((m) => (
                <div key={m} className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl font-medium flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                  <span>Sinergista: {muscleLabels[m] || m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 7: Variations & Substitutes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Variations */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span>Variações de Pegada & Ângulo</span>
              </h3>

              <div className="space-y-2 text-xs">
                {exercise.variacoes.length > 0 ? (
                  exercise.variacoes.map((v, i) => (
                    <div key={i} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-slate-300">
                      {v}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic text-xs">Sem variações cadastradas.</p>
                )}
              </div>
            </div>

            {/* Direct Substitutes */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-2">
                <Repeat className="h-4 w-4" />
                <span>Exercícios Substitutos Inteligentes</span>
              </h3>

              <div className="space-y-2 text-xs">
                {exercise.substitutos.length > 0 ? (
                  exercise.substitutos.map((sub, i) => {
                    const matchedEx = EXERCISE_DATABASE.find((e) => e.id === sub.replacementId);
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          if (matchedEx && onSelectExercise) {
                            onSelectExercise(matchedEx);
                          }
                        }}
                        className={`bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1 ${
                          matchedEx && onSelectExercise ? 'hover:border-emerald-500/50 cursor-pointer transition-all' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100">{sub.replacementName}</span>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                            {sub.equivalenceScore}% Equivalente
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{sub.notes}</p>
                        {matchedEx && onSelectExercise && (
                          <span className="text-[10px] text-emerald-400 font-semibold inline-block pt-1 hover:underline">
                            → Clique para ver guia e vídeo deste substituto
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-500 italic text-xs">
                    Exercício versátil com peso corporal ou livre.
                  </p>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

