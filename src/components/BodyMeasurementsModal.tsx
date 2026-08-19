import React, { useState, useEffect } from 'react';
import { 
  X, 
  Activity, 
  Plus, 
  History, 
  Scale, 
  Ruler, 
  Check, 
  TrendingDown, 
  TrendingUp,
  Loader2
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
  const [records, setRecords] = useState<BodyMeasurementRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [weightKg, setWeightKg] = useState<number>(80);
  const [heightCm, setHeightCm] = useState<number>(178);
  const [bodyFatPercentage, setBodyFatPercentage] = useState<number>(15);
  const [waistCm, setWaistCm] = useState<number>(82);
  const [chestCm, setChestCm] = useState<number>(102);
  const [armCm, setArmCm] = useState<number>(38);
  const [notes, setNotes] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && userId) {
      setIsLoading(true);
      BodyMeasurementsService.getRecords(userId).then((data) => {
        setRecords(data);
        if (data.length > 0) {
          const latest = data[0];
          setWeightKg(latest.weightKg || 80);
          setHeightCm(latest.heightCm || 178);
          if (latest.bodyFatPercentage) setBodyFatPercentage(latest.bodyFatPercentage);
          if (latest.waistCm) setWaistCm(latest.waistCm);
          if (latest.chestCm) setChestCm(latest.chestCm);
          if (latest.armCm) setArmCm(latest.armCm);
        }
        setIsLoading(false);
      });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const newRecord = await BodyMeasurementsService.addRecord(userId, {
        date: new Date().toISOString().split('T')[0],
        weightKg: Number(weightKg),
        heightCm: Number(heightCm),
        bodyFatPercentage: bodyFatPercentage ? Number(bodyFatPercentage) : undefined,
        waistCm: waistCm ? Number(waistCm) : undefined,
        chestCm: chestCm ? Number(chestCm) : undefined,
        armCm: armCm ? Number(armCm) : undefined,
        notes: notes.trim() || undefined,
      });

      const updated = await BodyMeasurementsService.getRecords(userId);
      setRecords(updated);
      setSavedSuccess(true);
      if (onRecordAdded) onRecordAdded();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao registrar medidas:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const latestRecord = records.length > 0 ? records[0] : null;
  const previousRecord = records.length > 1 ? records[1] : null;

  const weightDiff = latestRecord && previousRecord 
    ? (latestRecord.weightKg - previousRecord.weightKg).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0f0f12] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-rose-500">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Composição Corporal & Antropometria</h2>
            <p className="text-xs text-zinc-400">
              Acompanhe sua evolução física, percentual de gordura e circunferências sincronizadas no Firestore.
            </p>
          </div>
        </div>

        {/* Overview Stats Bento */}
        {latestRecord && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80">
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Peso Atual</div>
              <div className="text-lg font-black text-white flex items-center space-x-1">
                <span>{latestRecord.weightKg} kg</span>
                {weightDiff && (
                  <span className={`text-xs font-bold flex items-center ${Number(weightDiff) < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Number(weightDiff) < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {weightDiff}kg
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Gordura (%BF)</div>
              <div className="text-lg font-black text-white">
                {latestRecord.bodyFatPercentage ? `${latestRecord.bodyFatPercentage}%` : '--'}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Cintura</div>
              <div className="text-lg font-black text-white">
                {latestRecord.waistCm ? `${latestRecord.waistCm} cm` : '--'}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Braço Contraído</div>
              <div className="text-lg font-black text-white">
                {latestRecord.armCm ? `${latestRecord.armCm} cm` : '--'}
              </div>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Plus className="h-3.5 w-3.5 text-rose-500" />
            <span>Registrar Nova Aferição de Medidas</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1 flex items-center space-x-1">
                <Scale className="h-3 w-3 text-rose-400" />
                <span>Peso Corporal (kg)</span>
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1 flex items-center space-x-1">
                <Ruler className="h-3 w-3 text-rose-400" />
                <span>Altura (cm)</span>
              </label>
              <input
                type="number"
                required
                value={heightCm}
                onChange={(e) => setHeightCm(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                Percentual de Gordura (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={bodyFatPercentage || ''}
                onChange={(e) => setBodyFatPercentage(parseFloat(e.target.value))}
                placeholder="Ex: 14"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                Cintura / Abdômen (cm)
              </label>
              <input
                type="number"
                step="0.5"
                value={waistCm || ''}
                onChange={(e) => setWaistCm(parseFloat(e.target.value))}
                placeholder="Ex: 82"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                Tórax / Peitoral (cm)
              </label>
              <input
                type="number"
                step="0.5"
                value={chestCm || ''}
                onChange={(e) => setChestCm(parseFloat(e.target.value))}
                placeholder="Ex: 104"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                Braço Contraído (cm)
              </label>
              <input
                type="number"
                step="0.5"
                value={armCm || ''}
                onChange={(e) => setArmCm(parseFloat(e.target.value))}
                placeholder="Ex: 39"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando no Firestore...</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Salvar Nova Medição</span>
                </>
              )}
            </button>

            {savedSuccess && (
              <div className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5 animate-fadeIn">
                <Check className="h-4 w-4" />
                <span>Salvo e sincronizado no Firestore!</span>
              </div>
            )}
          </div>
        </form>

        {/* History Table */}
        <div className="space-y-3 pt-4 border-t border-zinc-800">
          <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
            <History className="h-3.5 w-3.5 text-zinc-400" />
            <span>Histórico de Medições</span>
          </div>

          {isLoading ? (
            <div className="py-8 flex justify-center items-center text-zinc-500 space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
              <span className="text-xs">Carregando histórico do Firestore...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-2xl text-center text-xs text-zinc-500">
              Nenhuma medição registrada até o momento.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="font-mono text-zinc-400">{r.date}</div>
                  <div className="font-bold text-white">{r.weightKg} kg</div>
                  <div className="text-zinc-400">{r.bodyFatPercentage ? `${r.bodyFatPercentage}% BF` : '--'}</div>
                  <div className="text-zinc-400">{r.waistCm ? `${r.waistCm} cm cint.` : '--'}</div>
                  <div className="text-zinc-400">{r.armCm ? `${r.armCm} cm braço` : '--'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
