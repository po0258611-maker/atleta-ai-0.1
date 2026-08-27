import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Server, ShieldCheck, Key, ExternalLink, X, Activity } from 'lucide-react';
import { testSupabaseConnection, SupabaseConnectionStatus } from '../services/supabaseClient';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<SupabaseConnectionStatus | null>(null);
  const [serverStatus, setServerStatus] = useState<{
    connected: boolean;
    provider: string;
    message?: string;
    publishableKeyMasked?: string;
    latencyMs?: number;
  } | null>(null);

  const checkConnectivity = async () => {
    setLoading(true);
    try {
      // 1. Client-side Supabase check
      const clientResult = await testSupabaseConnection();
      setStatus(clientResult);

      // 2. Server-side API check
      try {
        const response = await fetch('/api/database/status');
        if (response.ok) {
          const data = await response.json();
          setServerStatus(data);
        }
      } catch (srvErr) {
        console.warn('Erro ao consultar endpoint backend:', srvErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkConnectivity();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f0f12] border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Conexão Supabase API & DB
              </h3>
              <p className="text-xs text-zinc-400">Status de integração e persistência na nuvem</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Main Status Badge */}
          <div className={`p-4 rounded-2xl border flex items-start space-x-3 ${
            status?.connected
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
          }`}>
            {status?.connected ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-white">
                {status?.connected ? 'Banco de Dados & API Conectados' : 'Conectando ao Supabase...'}
              </h4>
              <p className="text-xs leading-relaxed text-zinc-300">
                {status?.message || 'Verificando conexão com o cluster de banco de dados...'}
              </p>
              {status?.latencyMs !== undefined && (
                <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono mt-1">
                  <Activity className="h-3 w-3 text-emerald-400" />
                  <span>Latência da API: {status.latencyMs}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Connection Parameters & Config Details */}
          <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
              <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                <Server className="h-3.5 w-3.5 text-zinc-400" />
                Provedor de Banco de Dados:
              </span>
              <span className="font-bold text-white uppercase tracking-wider">Supabase (PostgreSQL)</span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
              <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                <Key className="h-3.5 w-3.5 text-zinc-400" />
                Chave Publicável (Publishable Key):
              </span>
              <span className="font-mono text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                sb_publishable_1ivn...9LeJ
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
              <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
                Segurança & Protocolo:
              </span>
              <span className="text-zinc-300 font-medium">TLS 1.3 / HTTPS Rest API</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                <Server className="h-3.5 w-3.5 text-zinc-400" />
                Backend Proxy Gateway:
              </span>
              <span className="font-mono text-[11px] text-zinc-300">
                {serverStatus?.connected ? 'Ativo (/api/database)' : 'Disponível'}
              </span>
            </div>
          </div>

          {/* Sync & Features Overview */}
          <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-2">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Recursos Habilitados via API</h5>
            <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
              <li>Sincronização de fichas de treino e registros de execução (Workouts).</li>
              <li>Histórico de composição corporal, dobras cutâneas e 1RM.</li>
              <li>Autenticação de sessão de atletas e backup criptografado em nuvem.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <button
            onClick={checkConnectivity}
            disabled={loading}
            className="flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{loading ? 'Testando API...' : 'Testar Conexão Novamente'}</span>
          </button>

          <button
            onClick={onClose}
            className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-950/50"
          >
            Concluir
          </button>
        </div>

      </div>
    </div>
  );
};
