import React, { useState, useEffect } from 'react';
import { Exercise } from '../types';
import { EXERCISE_DATABASE } from '../engine/exerciseData';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { getExerciseImageUrl } from '../utils/exerciseImageHelper';
import {
  Search,
  BookOpen,
  Heart,
  Dumbbell,
  Sparkles,
  Layers,
  Filter,
  Check,
  Video,
  Play,
  Lock,
} from 'lucide-react';
import { PremiumGateModal } from './PremiumGateModal';

interface ExerciseLibraryViewProps {
  initialExerciseIdToOpen?: string | null;
}

export const ExerciseLibraryView: React.FC<ExerciseLibraryViewProps> = ({
  initialExerciseIdToOpen,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [selectedPattern, setSelectedPattern] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);

  // Active modal state
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [isGateOpen, setIsGateOpen] = useState<boolean>(false);
  const [gateTitle, setGateTitle] = useState<string>('');
  const [gateDesc, setGateDesc] = useState<string>('');

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('athleta_favorite_exercises');
      return saved ? JSON.parse(saved) : ['ex_squat_barbell', 'ex_bench_press_barbell', 'ex_lat_pulldown'];
    } catch {
      return ['ex_squat_barbell', 'ex_bench_press_barbell', 'ex_lat_pulldown'];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('athleta_favorite_exercises', JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  useEffect(() => {
    if (initialExerciseIdToOpen) {
      const found = EXERCISE_DATABASE.find((e) => e.id === initialExerciseIdToOpen);
      if (found) {
        setActiveExercise(found);
      }
    }
  }, [initialExerciseIdToOpen]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const muscleCategoryChips = [
    { id: 'all', label: 'Todos' },
    { id: 'peitoral', label: 'Peitoral' },
    { id: 'costas', label: 'Costas' },
    { id: 'ombros', label: 'Ombros' },
    { id: 'quadriceps', label: 'Quadríceps' },
    { id: 'posteriores', label: 'Posteriores' },
    { id: 'gluteos', label: 'Glúteos' },
    { id: 'biceps', label: 'Bíceps' },
    { id: 'triceps', label: 'Tríceps' },
    { id: 'panturrilhas', label: 'Panturrilhas' },
    { id: 'core', label: 'Core' },
  ];

  const filteredExercises = EXERCISE_DATABASE.filter((ex) => {
    const matchesSearch =
      ex.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.nomeEnglish && ex.nomeEnglish.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMuscle = selectedMuscle === 'all' || ex.grupoMuscular === selectedMuscle;
    const matchesPattern = selectedPattern === 'all' || ex.padraoMotor === selectedPattern;
    const matchesEquipment = selectedEquipment === 'all' || ex.equipamento === selectedEquipment;
    const matchesFavorites = !onlyFavorites || favorites.includes(ex.id);

    return matchesSearch && matchesMuscle && matchesPattern && matchesEquipment && matchesFavorites;
  });

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <BookOpen className="h-4 w-4" />
              <span>BioAtlas 3D • Modelos Anatômicos Ray-traced</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              BioAtlas 3D — Guia Anatômico Biomecânico
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Consulte modelos anatômicos 3D, passos a passo detalhados, alvos musculares, padrão respiratório e substituições para cada exercício.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                onlyFavorites
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-lg shadow-rose-950/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Heart className={`h-4 w-4 ${onlyFavorites ? 'fill-rose-400 text-rose-400' : 'text-slate-400'}`} />
              <span>{onlyFavorites ? 'Exibindo Favoritos' : 'Ver Favoritos (' + favorites.length + ')'}</span>
            </button>
          </div>
        </div>

        {/* Search & Select Filters */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome de exercício..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Muscle Group Select */}
          <select
            value={selectedMuscle}
            onChange={(e) => setSelectedMuscle(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">Todos os Grupos Musculares</option>
            <option value="peitoral">Peitoral</option>
            <option value="costas">Costas</option>
            <option value="ombros">Ombros</option>
            <option value="quadriceps">Quadríceps</option>
            <option value="posteriores">Posteriores</option>
            <option value="gluteos">Glúteos</option>
            <option value="biceps">Bíceps</option>
            <option value="triceps">Tríceps</option>
            <option value="panturrilhas">Panturrilhas</option>
            <option value="core">Core</option>
          </select>

          {/* Movement Pattern Select */}
          <select
            value={selectedPattern}
            onChange={(e) => setSelectedPattern(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">Todos os Padrões Motores</option>
            <option value="squat">Agachamento (Squat)</option>
            <option value="hinge">Dominante de Quadril (Hinge)</option>
            <option value="horizontal_push">Empurre Horizontal</option>
            <option value="horizontal_pull">Puxada Horizontal (Remadas)</option>
            <option value="vertical_push">Empurre Vertical (Desenvolvimento)</option>
            <option value="vertical_pull">Puxada Vertical (Puxadas/Barra)</option>
            <option value="isolation_upper">Isolamento Superior</option>
            <option value="isolation_lower">Isolamento Inferior</option>
            <option value="core">Estabilidade de Core</option>
          </select>

          {/* Equipment Select */}
          <select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">Todos os Equipamentos</option>
            <option value="barbell">Barra</option>
            <option value="dumbbell">Halteres</option>
            <option value="machine">Máquinas</option>
            <option value="cable">Cabos / Polia</option>
            <option value="bodyweight">Peso Corporal</option>
          </select>

        </div>

        {/* Quick Muscle Chips bar */}
        <div className="mt-4 flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] font-medium mr-1 shrink-0 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Categorias:
          </span>
          {muscleCategoryChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setSelectedMuscle(chip.id)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedMuscle === chip.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800/80'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Exercise Cards */}
      {filteredExercises.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExercises.map((ex, index) => {
            const isFav = favorites.includes(ex.id);
            const isLocked = index >= 12;

            const handleExerciseClick = () => {
              if (isLocked) {
                setGateTitle(`Exercício Exclusivo: ${ex.nome}`);
                setGateDesc('O acesso completo aos 23+ modelos anatômicos 3D avançados do BioAtlas é exclusivo para membros do APEX Pass.');
                setIsGateOpen(true);
              } else {
                setActiveExercise(ex);
              }
            };

            return (
              <div
                key={ex.id}
                onClick={handleExerciseClick}
                className={`bg-slate-900 border rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between transition-all group cursor-pointer ${
                  isLocked ? 'border-amber-500/30 opacity-90' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Visual Header / Thumbnail */}
                <div className="bg-slate-950 h-44 relative overflow-hidden flex items-center justify-center border-b border-slate-800">
                  <img
                    src={getExerciseImageUrl(ex)}
                    alt={ex.nome}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('athletic_squat')) {
                        target.src = '/images/athletic_squat_3d_1786105958653.jpg';
                      }
                    }}
                  />

                  {/* Overlay Badges */}
                  <div className="absolute top-3 left-3 flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-950/90 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                      {ex.grupoMuscular}
                    </span>
                    {isLocked && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1">
                        <Lock className="h-3 w-3 text-amber-400" />
                        APEX PASS
                      </span>
                    )}
                  </div>

                  {/* Favorite Toggle Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(ex.id);
                    }}
                    className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all cursor-pointer border ${
                      isFav
                        ? 'bg-rose-500/80 text-white border-rose-400 shadow-md shadow-rose-950/50'
                        : 'bg-slate-950/70 text-slate-400 hover:text-white border-slate-700'
                    }`}
                    title={isFav ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
                  >
                    <Heart className={`h-4 w-4 ${isFav ? 'fill-white' : ''}`} />
                  </button>

                  <div className="absolute bottom-2 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-0.5 rounded text-[10px] font-semibold text-slate-300 border border-slate-800">
                    Equip: <strong className="text-cyan-300">{ex.equipamento.toUpperCase()}</strong>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors flex items-center justify-between">
                      <span>{ex.nome}</span>
                      {isLocked && <Lock className="h-4 w-4 text-amber-400 shrink-0 ml-2" />}
                    </h3>
                    {ex.nomeEnglish && (
                      <p className="text-xs text-slate-400 italic mt-0.5">{ex.nomeEnglish}</p>
                    )}

                    <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between border-b border-slate-800/80 pb-1 text-slate-400">
                        <span>Padrão Motor:</span>
                        <strong className="text-slate-200">{ex.padraoMotor.toUpperCase()}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/80 pb-1 text-slate-400">
                        <span>Fadiga Axial:</span>
                        <strong className="text-amber-400">{ex.fatigueIndex} / 5</strong>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={handleExerciseClick}
                    className={`w-full font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md ${
                      isLocked
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-slate-800 hover:bg-cyan-600 hover:text-white text-cyan-300'
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <Lock className="h-3.5 w-3.5 text-amber-400" />
                        <span>DESBLOQUEAR COM APEX PASS</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-cyan-400 group-hover:fill-white text-cyan-400 group-hover:text-white" />
                        <span>VER GUIA & VÍDEO PASSO A PASSO</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3 text-slate-400">
          <Dumbbell className="h-12 w-12 mx-auto text-slate-600" />
          <h3 className="text-lg font-bold text-slate-200">Nenhum exercício encontrado</h3>
          <p className="text-xs max-w-md mx-auto">
            Tente ajustar os filtros de busca, grupo muscular ou desativar o filtro de favoritos.
          </p>
        </div>
      )}

      {/* Exercise Detail Modal ("GUIA DO EXERCÍCIO") */}
      {activeExercise && (
        <ExerciseDetailModal
          exercise={activeExercise}
          onClose={() => setActiveExercise(null)}
          onToggleFavorite={toggleFavorite}
          isFavorite={favorites.includes(activeExercise.id)}
          onSelectExercise={(selectedSub) => setActiveExercise(selectedSub)}
        />
      )}

      {/* Premium Gate Modal */}
      <PremiumGateModal
        isOpen={isGateOpen}
        onClose={() => setIsGateOpen(false)}
        featureTitle={gateTitle}
        featureDescription={gateDesc}
      />

    </div>
  );
};
