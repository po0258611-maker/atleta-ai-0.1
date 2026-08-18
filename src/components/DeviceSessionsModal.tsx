import React, { useState } from 'react';
import { X, Smartphone, Monitor, ShieldCheck, LogOut, Check, AlertCircle, Laptop } from 'lucide-react';

interface ActiveDevice {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

interface DeviceSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceSessionsModal: React.FC<DeviceSessionsModalProps> = ({ isOpen, onClose }) => {
  const [devices, setDevices] = useState<ActiveDevice[]>([
    {
      id: 'dev_1',
      name: 'Navegador Chrome (Dispositivo Atual)',
      type: 'desktop',
      location: 'São Paulo, Brasil',
      lastActive: 'Ativo agora',
      isCurrent: true,
    },
    {
      id: 'dev_2',
      name: 'iPhone 15 Pro (App Athleta iOS)',
      type: 'mobile',
      location: 'São Paulo, Brasil',
      lastActive: 'Há 2 horas',
      isCurrent: false,
    },
    {
      id: 'dev_3',
      name: 'Samsung Galaxy Tab S9',
      type: 'tablet',
      location: 'Campinas, Brasil',
      lastActive: 'Ontem às 18:30',
      isCurrent: false,
    },
  ]);

  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRevokeDevice = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    setMessage('Sessão revogada com sucesso! Token JWT invalidado no servidor.');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleRevokeAllOthers = () => {
    setDevices((prev) => prev.filter((d) => d.isCurrent));
    setMessage('Todas as outras sessões foram encerradas em todos os dispositivos.');
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0b1329] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Sessões Ativas & Controle de Dispositivos</h2>
              <p className="text-[11px] text-slate-400">Proteção JWT e invalidamento remoto de tokens</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold flex items-center space-x-2">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Device List */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {devices.map((device) => (
            <div
              key={device.id}
              className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                device.isCurrent
                  ? 'bg-slate-900 border-emerald-500/40 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                  {device.type === 'mobile' ? (
                    <Smartphone className="h-4 w-4 text-cyan-400" />
                  ) : device.type === 'tablet' ? (
                    <Laptop className="h-4 w-4 text-indigo-400" />
                  ) : (
                    <Monitor className="h-4 w-4 text-emerald-400" />
                  )}
                </div>

                <div>
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <span>{device.name}</span>
                    {device.isCurrent && (
                      <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">
                        Este
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {device.location} • {device.lastActive}
                  </div>
                </div>
              </div>

              {!device.isCurrent && (
                <button
                  type="button"
                  onClick={() => handleRevokeDevice(device.id)}
                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Encerrar
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Revoke All Action */}
        {devices.length > 1 && (
          <button
            type="button"
            onClick={handleRevokeAllOthers}
            className="w-full py-2.5 bg-slate-900 hover:bg-rose-950/40 text-rose-300 border border-slate-800 hover:border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Encerrar Todas as Outras Sessões Remotas</span>
          </button>
        )}

        <div className="pt-2 border-t border-slate-800 text-center text-[10px] text-slate-500">
          Chave JWT expira a cada 7 dias com rotação automática de Refresh Token.
        </div>
      </div>
    </div>
  );
};
