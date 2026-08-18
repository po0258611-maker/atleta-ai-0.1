import React, { useState } from 'react';
import { 
  X, 
  Activity, 
  Plus, 
  History, 
  Scale, 
  Ruler, 
  Check, 
  TrendingDown, 
  TrendingUp 
} from 'lucide-react';
import { 
  BodyMeasurementsService, 
  BodyMeasurementRecord 
} from '../services/bodyMeasurementsService';

interface BodyMeasurementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onRecordAdded?: () => void;
}

export const BodyMeasurementsModal: React.FC<BodyMeasurementsModalProps> = ({
  isOpen,
  onClose,
  userId,
  onRecordAdded,
}) => {
  const [records, setRecords] = useState<BodyMeasurementRecord[]>(() =>
    BodyMeasurementsService.getRecords(userId)
  );

  const [weightKg, setWeightKg] = useState<number>(80);
  const [heightCm, setHeightCm] = useState<number>(178);
  const [bodyFatPercentage, setBodyFatPercentage] = useState<number>(15);
  const [waistCm, setWaistCm] = useState<number>(82);
  const [chestCm, setChestCm] = useState<number>(102);
  const [armCm, setArmCm] = useState<number>(38);
  const [notes, setNotes] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord = BodyMeasurementsService.addRecord(userId, {
      date: new Date().toISOString().split('T')[0],
      weightKg: Number(weightKg),
      heightCm: Number(heightCm),
      bodyFatPercentage: bodyFatPercentage ? Number(bodyFatPercentage) : undefined,
      waistCm: waistCm ? Number(waistCm) : undefined,
      chestCm: chestCm ? Number(chestCm) : undefined,
      armCm: armCm ? Number(armCm) : undefined,
      notes: notes.trim() || undefined,
    });

    setRecords(BodyMeasurementsService.getRecords(userId));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);

    if (onRecordAdded) {
      onRecordAdded();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0f0f12] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-xl transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400">
            <Activity className="h-6 w-6 text-rose-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Medições Corporais Básicas</h2>
            <p className="text-xs text-zinc-400">
              Acompanhe sua evolução de peso, altura, percentual de gordura e circunferências.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center space-x-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>Medição corporal registrada com sucesso!</span>
          </div>
        )}

        {/* Form to Add Measurement */}
        <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Plus className="h-3.5 w-3.5 text-rose-400" />
            <span>Registrar Nova Medição</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {/* Peso */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Peso (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-rose-500 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
              />
            </div>

            {/* Altura */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Altura (cm) *
              </label>
              <input
                type="number"
                required
                value={heightCm}
                onChange={(e) => setHeightCm(parseInt(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-rose-500 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
              />
            </div>

            {/* % Gordura */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                % Gordura (BF)
              </label>
              <input
                type="number"
                step="0.1"
                value={bodyFatPercentage}
                onChange={(e) => setBodyFatPercentage(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-rose-500 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
              />
            </div>

            {/* Cintura */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Cintura (cm)
              </label>
              <input
                type="number"
                step="0.5"
                value={waistCm}
                onChange={(e) => setWaistCm(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-rose-500 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
              />
            </div>

            {/* Peitoral */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Peitoral (cm)
              </label>
              <input
                type="number"
                step="0.5"
                value={chestCm}
                onChange={(e) => setChestCm(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-rose-500 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
              />
            </div>

            {/* Braço */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Braço (cm)
              </label>
              <input
                type="number"
                step="0.5"
                value={armCm}
                onChange={(e) => setArmCm(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-rose-500 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>Salvar Registro de Medição</span>
          </button>
        </form>

        {/* History List */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
            <History className="h-3.5 w-3.5 text-zinc-400" />
            <span>Histórico de Medições</span>
          </div>

          {records.length === 0 ? (
            <div className="text-center py-6 bg-zinc-950/50 border border-zinc-800/60 rounded-2xl text-xs text-zinc-500">
              Nenhuma medição registrada ainda. Preencha os dados acima.
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs text-zinc-300"
                >
                  <div>
                    <span className="font-bold text-white">{r.date}</span>
                    <div className="text-[11px] text-zinc-400 mt-0.5 space-x-2">
                      <span>{r.weightKg} kg</span>
                      <span>•</span>
                      <span>{r.heightCm} cm</span>
                      {r.bodyFatPercentage && (
                        <>
                          <span>•</span>
                          <span>{r.bodyFatPercentage}% BF</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-zinc-400">
                    {r.waistCm && <div>Cintura: {r.waistCm} cm</div>}
                    {r.armCm && <div>Braço: {r.armCm} cm</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
