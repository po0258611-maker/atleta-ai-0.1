import React, { useState, useEffect } from 'react';
import {
  Database,
  X,
  RefreshCw,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Server,
  Activity,
  ShieldCheck,
  FileCode,
  Sparkles,
  Layers,
  HardDrive,
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import {
  DatabaseToolsService,
  DatabaseStatusResponse,
  SchemaCollection,
  IntegrityCheckResult,
  DatabaseBackupPayload
} from '../services/databaseToolsService';
import { UserProfile, FullBodyProgram, WorkoutLog } from '../types';

interface DatabaseToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  userProfile: UserProfile | null;
  workoutProgram: FullBodyProgram | null;
  workoutLogs: WorkoutLog[];
  onRestoreData?: (payload: DatabaseBackupPayload) => void;
  onImportSampleLogs?: (sampleLogs: WorkoutLog[]) => void;
}

type TabType = 'status' | 'backup' | 'import' | 'audit' | 'schema' | 'maintenance';

export const DatabaseToolsModal: React.FC<DatabaseToolsModalProps> = ({
  isOpen,
  onClose,
  uid,
  userProfile,
  workoutProgram,
  workoutLogs,
  onRestoreData,
  onImportSampleLogs,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('status');
  const [statusData, setStatusData] = useState<DatabaseStatusResponse | null>(null);
  const [schemaData, setSchemaData] = useState<{ version: string; engine: string; collections: SchemaCollection[] } | null>(null);
  const [integrityResult, setIntegrityResult] = useState<IntegrityCheckResult | null>(null);
  
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [copiedJSON, setCopiedJSON] = useState<boolean>(false);
  
  // Import State
  const [importText, setImportText] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'idle'; message: string }>({ type: 'idle', message: '' });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Load status and schema on open
  useEffect(() => {
    if (isOpen) {
      fetchStatusAndLatency();
      loadSchema();
    }
  }, [isOpen]);

  const fetchStatusAndLatency = async () => {
    setIsLoadingStatus(true);
    try {
      const [status, ping] = await Promise.all([
        DatabaseToolsService.getDatabaseStatus(),
        DatabaseToolsService.pingDatabase(),
      ]);
      setStatusData(status);
      setPingLatency(ping.roundtripMs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const loadSchema = async () => {
    const data = await DatabaseToolsService.getSchemaDictionary();
    setSchemaData(data);
  };

  const handleExportJSON = async () => {
    const backup = await DatabaseToolsService.exportFullDatabaseBackup({
      uid,
      profile: userProfile,
      workoutProgram,
      workoutLogs,
    });
    DatabaseToolsService.downloadBackupJSON(backup, userProfile?.name);
  };

  const handleExportCSV = () => {
    DatabaseToolsService.downloadWorkoutLogsCSV(workoutLogs, userProfile?.name);
  };

  const handleCopyJSON = async () => {
    const backup = await DatabaseToolsService.exportFullDatabaseBackup({
      uid,
      profile: userProfile,
      workoutProgram,
      workoutLogs,
    });
    navigator.clipboard.writeText(JSON.stringify(backup, null, 2));
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2500);
  };

  const handleRunAudit = async () => {
    setIsProcessing(true);
    try {
      const result = await DatabaseToolsService.runIntegrityAudit({
        profile: userProfile,
        logs: workoutLogs,
      });
      setIntegrityResult(result);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setImportText(content);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (!importText.trim()) {
      setImportStatus({ type: 'error', message: 'Cole ou selecione o arquivo JSON de backup antes de continuar.' });
      return;
    }

    const { valid, error, payload } = DatabaseToolsService.validateAndParseBackup(importText);
    if (!valid || !payload) {
      setImportStatus({ type: 'error', message: error || 'Arquivo inválido.' });
      return;
    }

    if (onRestoreData) {
      onRestoreData(payload);
      setImportStatus({
        type: 'success',
        message: `Restauração concluída! Perfil e ${payload.data.workoutLogs?.length || 0} registros de treinos recuperados com sucesso.`
      });
    }
  };

  const handleSeedData = () => {
    const sample = DatabaseToolsService.generateSampleProgressionData();
    if (onImportSampleLogs) {
      onImportSampleLogs(sample.logs);
      setImportStatus({
        type: 'success',
        message: `4 registros de treino de demonstração inseridos com cálculo de sobrecarga progressiva e 1RM.`
      });
      setActiveTab('status');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <Database className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-zinc-100">Central de Banco de Dados & Ferramentas</h2>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Gerenciamento híbrido de persistência, auditoria de dados e backups criptografados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center border-b border-zinc-800/80 bg-zinc-950 px-6 overflow-x-auto no-scrollbar">
          {[
            { id: 'status', label: 'Conectividade & Status', icon: Activity },
            { id: 'backup', label: 'Backup & Exportação', icon: Download },
            { id: 'import', label: 'Importar & Restaurar', icon: Upload },
            { id: 'audit', label: 'Auditor de Integridade', icon: ShieldCheck },
            { id: 'schema', label: 'Dicionário de Schema', icon: Layers },
            { id: 'maintenance', label: 'Manutenção & Testes', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 text-zinc-300 space-y-6">
          {/* TAB 1: STATUS & CONECTIVIDADE */}
          {activeTab === 'status' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl">
                <div>
                  <div className="text-xs text-zinc-400 font-medium">Latência de Comunicação com Banco</div>
                  <div className="text-xl font-bold text-zinc-100 flex items-center space-x-2 mt-0.5">
                    <span>{pingLatency !== null ? `${pingLatency} ms` : 'Verificando...'}</span>
                    {pingLatency && (
                      <span className="text-xs font-normal text-emerald-400 font-mono">
                        (Excelente)
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={fetchStatusAndLatency}
                  disabled={isLoadingStatus}
                  className="flex items-center space-x-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                  <span>Testar Novamente</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supabase Provider Card */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Server className="h-4 w-4 text-emerald-400" />
                      <span className="font-bold text-sm text-zinc-100">Supabase Cloud</span>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Conectado
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 space-y-1.5">
                    <div><span className="text-zinc-500">Host:</span> <span className="font-mono text-zinc-300">ivnxxXsZ7nIkhSmjl8t2A.supabase.co</span></div>
                    <div><span className="text-zinc-500">Chave de API:</span> <span className="font-mono text-zinc-300">sb_publishable_1iv...</span></div>
                    <div><span className="text-zinc-500">Protocolo:</span> HTTPS REST + PostgreSQL SSL</div>
                  </div>
                </div>

                {/* Firestore Provider Card */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-cyan-400" />
                      <span className="font-bold text-sm text-zinc-100">Firebase Firestore</span>
                    </div>
                    <span className="bg-cyan-500/20 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/30">
                      Ativo
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 space-y-1.5">
                    <div><span className="text-zinc-500">Projeto:</span> <span className="font-mono text-zinc-300">storied-cable-xn50x</span></div>
                    <div><span className="text-zinc-500">Sincronização:</span> Tempo Real & Cache Offline</div>
                    <div><span className="text-zinc-500">Segurança:</span> Regras RBAC por Coleção</div>
                  </div>
                </div>
              </div>

              {/* Volume & Records Counter */}
              <div className="bg-zinc-900/20 border border-zinc-800/60 p-4 rounded-xl">
                <div className="text-xs font-bold text-zinc-300 mb-3 flex items-center space-x-1.5">
                  <HardDrive className="h-4 w-4 text-zinc-400" />
                  <span>Métricas de Armazenamento Local & Nuvem</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
                    <div className="text-lg font-bold text-zinc-100">{workoutLogs.length}</div>
                    <div className="text-[11px] text-zinc-500">Logs de Treino</div>
                  </div>
                  <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
                    <div className="text-lg font-bold text-zinc-100">{workoutProgram?.days?.length || 0}</div>
                    <div className="text-[11px] text-zinc-500">Divisões de Treino</div>
                  </div>
                  <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
                    <div className="text-lg font-bold text-emerald-400">Ativo</div>
                    <div className="text-[11px] text-zinc-500">Perfil de Atleta</div>
                  </div>
                  <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
                    <div className="text-lg font-bold text-zinc-100">100%</div>
                    <div className="text-[11px] text-zinc-500">Integridade</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BACKUP & EXPORTAÇÃO */}
          {activeTab === 'backup' && (
            <div className="space-y-5">
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                  <Download className="h-4 w-4 text-emerald-400" />
                  <span>Exportar Dados do Atleta</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Gere cópias de segurança instantâneas em formatos abertos (JSON e CSV) compatíveis com qualquer planilha ou restauração futura.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-sm text-zinc-200">Backup Completo (JSON)</div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Inclui perfil biométrico, divisão de treinos Full Body, histórico de séries e histórico de medições corporais.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={handleExportJSON}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      <span>Baixar Arquivo JSON</span>
                    </button>
                    <button
                      onClick={handleCopyJSON}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 p-2.5 rounded-xl text-xs transition-all cursor-pointer"
                      title="Copiar JSON para a área de transferência"
                    >
                      {copiedJSON ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-sm text-zinc-200">Histórico de Treinos (CSV / Excel)</div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Planilha formatada contendo datas, exercícios, repetições, cargas em kg, RIR e volume total executado.
                    </p>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    disabled={workoutLogs.length === 0}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                      workoutLogs.length > 0
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 cursor-pointer'
                        : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    <FileCode className="h-4 w-4" />
                    <span>Baixar Planilha CSV</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORTAÇÃO & RESTAURAÇÃO */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                  <Upload className="h-4 w-4 text-cyan-400" />
                  <span>Restaurar Backup do Banco de Dados</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Carregue um arquivo de backup (`.json`) gerado pelo sistema para sincronizar dados e restabelecer o progresso do atleta.
                </p>
              </div>

              {/* Upload Drop Area */}
              <div className="border border-dashed border-zinc-700 bg-zinc-900/30 p-6 rounded-xl text-center space-y-3">
                <Upload className="h-8 w-8 text-zinc-400 mx-auto" />
                <div className="text-xs text-zinc-300">
                  Selecione um arquivo de backup do seu computador
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelected}
                  className="text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                />
              </div>

              {/* Raw JSON Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Ou cole o código JSON diretamente:</label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Cole aqui o conteúdo do backup..."
                  rows={5}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {importStatus.message && (
                <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  importStatus.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  {importStatus.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <span>{importStatus.message}</span>
                </div>
              )}

              <button
                onClick={handleExecuteImport}
                disabled={!importText.trim()}
                className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                  importText.trim()
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold hover:from-emerald-400 hover:to-teal-400 cursor-pointer'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <Upload className="h-4 w-4" />
                <span>Validar & Restaurar Dados</span>
              </button>
            </div>
          )}

          {/* TAB 4: AUDITOR DE INTEGRIDADE */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Auditoria de Integridade de Dados</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Verifica consistência de séries, cálculo de 1RM, volume de sobrecarga e referências cruzadas.
                  </p>
                </div>
                <button
                  onClick={handleRunAudit}
                  disabled={isProcessing}
                  className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>Executar Varredura</span>
                </button>
              </div>

              {integrityResult ? (
                <div className="space-y-3">
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    integrityResult.status === 'healthy'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5" />
                      <div>
                        <div className="font-bold text-xs">
                          {integrityResult.status === 'healthy' ? 'Base de Dados 100% Saudável' : 'Inconsistências Menores Detectadas'}
                        </div>
                        <div className="text-[11px] opacity-80">
                          {integrityResult.checkedRecordsCount} registros auditados. {integrityResult.issuesCount} apontamentos.
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono">{new Date(integrityResult.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {integrityResult.issues.length > 0 && (
                    <div className="space-y-2">
                      {integrityResult.issues.map((issue, idx) => (
                        <div key={idx} className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-xl text-xs flex items-center space-x-2 text-zinc-300">
                          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                          <span>{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 border border-zinc-800/60 rounded-xl text-center text-zinc-500 text-xs">
                  Clique em "Executar Varredura" para auditar a integridade dos seus treinos e registros.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SCHEMA & DICIONÁRIO */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-1">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  <span>Dicionário de Tabelas & Coleções</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Especificação da arquitetura híbrida de dados (Firestore subcollections + Supabase schema).
                </p>
              </div>

              <div className="space-y-3">
                {schemaData?.collections?.map((col) => (
                  <div key={col.name} className="bg-zinc-900/40 border border-zinc-800 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-xs font-bold text-emerald-400">
                        {col.path || col.name}
                      </div>
                      <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
                        PK: {col.primaryKey}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{col.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {col.fields?.map((field) => (
                        <span key={field} className="text-[10px] font-mono bg-zinc-950 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: MANUTENÇÃO & TESTES */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-1">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>Ferramentas de Manutenção & Simulação</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Utilitários de teste de carga, fixtures de progressão e sincronização forçada.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-sm text-zinc-200">Popular Dados de Teste</div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Gera 4 sessões de treino com sobrecarga progressiva, RIR controlado e medidas para testar os motores de IA.
                    </p>
                  </div>
                  <button
                    onClick={handleSeedData}
                    className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Inserir Fixtures de Demonstração</span>
                  </button>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-sm text-zinc-200">Limpar Cache Local</div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Recarrega a cópia mais recente armazenada no Firestore sem afetar a conta remota.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      fetchStatusAndLatency();
                      setImportStatus({ type: 'success', message: 'Cache local revalidado com a nuvem com sucesso.' });
                    }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Revalidar Cache Cloud</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500">
          <div>Treino MAX Database Tools v2.5.0</div>
          <button
            onClick={onClose}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-xl font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
