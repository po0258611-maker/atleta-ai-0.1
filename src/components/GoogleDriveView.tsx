import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  UploadCloud, 
  DownloadCloud, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ShieldCheck, 
  Lock, 
  Search, 
  Cloud, 
  FileCode,
  FileCheck,
  Sparkles,
  ArrowRight,
  Database,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { 
  initDriveAuth, 
  signInWithGoogleDrive, 
  getDriveAccessToken, 
  disconnectGoogleDrive,
  getCachedGoogleUser
} from '../services/googleDriveAuth';
import { 
  listDriveFiles, 
  uploadFullBackupToDrive, 
  uploadWorkoutTextToDrive, 
  downloadAndParseBackupFromDrive, 
  deleteDriveFile, 
  fetchDriveAbout,
  DriveFileItem,
  DriveAboutInfo,
  AthletaBackupPayload
} from '../services/googleDriveService';
import { FullBodyProgram, UserProfile, WorkoutLog } from '../types';

interface GoogleDriveViewProps {
  program: FullBodyProgram;
  userProfile: UserProfile;
  workoutLogs: WorkoutLog[];
  onRestoreBackup: (backup: AthletaBackupPayload) => void;
}

export const GoogleDriveView: React.FC<GoogleDriveViewProps> = ({
  program,
  userProfile,
  workoutLogs,
  onRestoreBackup,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [aboutInfo, setAboutInfo] = useState<DriveAboutInfo | null>(null);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Alerts / feedback
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Confirmation Modal state for destructive delete
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Preview & Confirm Restore Modal state
  const [backupToRestore, setBackupToRestore] = useState<{ item: DriveFileItem; payload: AthletaBackupPayload } | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user, token) => {
        setIsConnected(true);
        loadDriveData();
      },
      () => {
        const token = getDriveAccessToken();
        if (token) {
          setIsConnected(true);
          loadDriveData();
        } else {
          setIsConnected(false);
          setAboutInfo(null);
          setFiles([]);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const loadDriveData = async () => {
    setIsLoadingFiles(true);
    try {
      const [about, filesList] = await Promise.all([
        fetchDriveAbout(),
        listDriveFiles(),
      ]);
      if (about) setAboutInfo(about);
      setFiles(filesList);
    } catch (err: any) {
      console.error('Erro ao carregar dados do Drive:', err);
      showNotification('error', err.message || 'Erro ao sincronizar com o Google Drive.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleConnect = async () => {
    setIsAuthenticating(true);
    try {
      await signInWithGoogleDrive();
      setIsConnected(true);
      showNotification('success', 'Conectado com sucesso ao Google Drive com permissões ativas.');
      await loadDriveData();
    } catch (err: any) {
      console.error('Falha no login Google:', err);
      showNotification('error', err.message || 'Falha ao conectar com o Google.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleDrive();
    setIsConnected(false);
    setAboutInfo(null);
    setFiles([]);
    showNotification('info', 'Desconectado do Google Drive.');
  };

  const handleBackupNow = async () => {
    if (!isConnected) {
      showNotification('error', 'Conecte sua conta Google Drive antes de fazer backup.');
      return;
    }

    setIsUploading(true);
    try {
      const file = await uploadFullBackupToDrive({ program, userProfile, workoutLogs });
      showNotification('success', `Backup "${file.name}" salvo com sucesso no Google Drive!`);
      await loadDriveData();
    } catch (err: any) {
      console.error('Erro ao fazer backup:', err);
      showNotification('error', err.message || 'Erro ao enviar backup para o Google Drive.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportTextSheet = async () => {
    if (!isConnected) {
      showNotification('error', 'Conecte sua conta Google Drive primeiro.');
      return;
    }

    setIsUploading(true);
    try {
      const file = await uploadWorkoutTextToDrive({ program, userProfile });
      showNotification('success', `Ficha de treino em texto "${file.name}" salva no Google Drive!`);
      await loadDriveData();
    } catch (err: any) {
      console.error('Erro ao exportar texto:', err);
      showNotification('error', err.message || 'Erro ao salvar texto no Google Drive.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(fileToDelete.id);
      showNotification('success', `Arquivo "${fileToDelete.name}" excluído com sucesso do Google Drive.`);
      setFileToDelete(null);
      await loadDriveData();
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      showNotification('error', err.message || 'Não foi possível excluir o arquivo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartRestore = async (file: DriveFileItem) => {
    setIsRestoring(true);
    try {
      const payload = await downloadAndParseBackupFromDrive(file.id);
      setBackupToRestore({ item: file, payload });
    } catch (err: any) {
      console.error('Erro ao ler backup:', err);
      showNotification('error', err.message || 'Erro ao ler arquivo de backup.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleConfirmRestore = () => {
    if (!backupToRestore) return;
    onRestoreBackup(backupToRestore.payload);
    showNotification('success', `Ficha e perfil restaurados com sucesso a partir do backup!`);
    setBackupToRestore(null);
  };

  const filteredFiles = files.filter((f) => {
    if (!searchQuery.trim()) return true;
    return f.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-[#0f0f12] border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-600/10 via-cyan-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                <Cloud className="h-3.5 w-3.5 text-emerald-400" />
                <span>Nuvem Google Drive</span>
              </span>
              <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-2.5 py-0.5 rounded-full text-xs font-mono">
                API v3 Integrada
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Sincronização & Backup no <span className="text-emerald-400">Google Drive</span>
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-medium">
              Proteja sua evolução, salve fichas de treino personalizadas, rotinas de periodização e registros de cargas diretamente na sua conta do Google Drive com total segurança e criptografia.
            </p>
          </div>

          {/* Connection Pill / Action Button */}
          <div className="w-full lg:w-auto shrink-0">
            {isConnected ? (
              <div className="bg-zinc-950/80 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center space-x-3">
                  {aboutInfo?.userPhoto ? (
                    <img 
                      src={aboutInfo.userPhoto} 
                      alt="Google User" 
                      className="h-10 w-10 rounded-full border border-emerald-400 object-cover" 
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-sm">
                      GD
                    </div>
                  )}
                  <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                      <p className="text-xs font-bold text-white">
                        {aboutInfo?.userName || getCachedGoogleUser()?.displayName || 'Conta Google'}
                      </p>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono truncate max-w-[200px]">
                      {aboutInfo?.userEmail || getCachedGoogleUser()?.email || 'Conectado'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDisconnect}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isAuthenticating}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 bg-white hover:bg-zinc-100 text-zinc-900 font-bold px-6 py-3.5 rounded-2xl shadow-xl hover:shadow-2xl transition-all cursor-pointer text-sm active:scale-95 disabled:opacity-50"
              >
                {/* Official Google G Logo SVG */}
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>{isAuthenticating ? 'Conectando...' : 'Conectar com Google Drive'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Feedback Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs font-medium animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : notification.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : notification.type === 'error' ? (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          ) : (
            <Cloud className="h-5 w-5 text-cyan-400 shrink-0" />
          )}
          <span className="flex-1">{notification.message}</span>
        </div>
      )}

      {/* Quick Backup Action Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Full JSON Backup */}
        <div className="bg-[#0f0f12] border border-zinc-800/90 hover:border-emerald-500/40 p-6 rounded-3xl space-y-4 shadow-xl transition-all group">
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <UploadCloud className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30 font-mono">
              COMPLETO
            </span>
          </div>

          <div>
            <h3 className="font-black text-white text-base group-hover:text-emerald-400 transition-colors">
              Backup Completo do Atleta
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Salva o perfil biomecânico, todas as fases da ficha Full Body e o histórico de execuções.
            </p>
          </div>

          <button
            onClick={handleBackupNow}
            disabled={!isConnected || isUploading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-40 cursor-pointer active:scale-95"
          >
            {isUploading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <HardDrive className="h-4 w-4" />
            )}
            <span>{isUploading ? 'Salvando na Nuvem...' : 'Salvar Backup no Drive'}</span>
          </button>
        </div>

        {/* Text Routine Export */}
        <div className="bg-[#0f0f12] border border-zinc-800/90 hover:border-cyan-500/40 p-6 rounded-3xl space-y-4 shadow-xl transition-all group">
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <FileText className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 px-2.5 py-1 rounded-full border border-cyan-500/30 font-mono">
              TXT
            </span>
          </div>

          <div>
            <h3 className="font-black text-white text-base group-hover:text-cyan-400 transition-colors">
              Ficha em Texto (.txt)
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Gera um documento de texto com a lista de exercícios, descansos, cadências e RIR para consulta rápida.
            </p>
          </div>

          <button
            onClick={handleExportTextSheet}
            disabled={!isConnected || isUploading}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/60 font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-40 cursor-pointer active:scale-95"
          >
            <FileCode className="h-4 w-4" />
            <span>Exportar Texto para o Drive</span>
          </button>
        </div>

        {/* Security & Cloud Info */}
        <div className="bg-[#0f0f12] border border-zinc-800/90 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full font-mono">
              PROTEGIDO
            </span>
          </div>

          <div>
            <h3 className="font-black text-white text-base">
              Privacidade dos Dados
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Seus dados de treino ficam guardados na sua própria conta Google dentro da pasta segura <code className="text-zinc-300">Athleta AI</code>.
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>Pasta no Drive:</span>
            <span className="text-emerald-400 font-bold">Athleta AI</span>
          </div>
        </div>
      </div>

      {/* Google Drive File Explorer Section */}
      <div className="bg-[#0f0f12] border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-emerald-400" />
              <span>Arquivos & Backups no Google Drive</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Visualize, restaure ou gerencie os arquivos da sua nuvem.
            </p>
          </div>

          {/* Search & Refresh Bar */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar arquivos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <button
              onClick={loadDriveData}
              disabled={!isConnected || isLoadingFiles}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl transition-all cursor-pointer disabled:opacity-40 active:scale-95"
              title="Atualizar lista de arquivos"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingFiles ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Files Table or Empty State */}
        {!isConnected ? (
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <Cloud className="h-8 w-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-black text-white text-sm">Google Drive não conectado</h3>
              <p className="text-xs text-zinc-400">
                Faça login com sua conta Google acima para listar e restaurar seus backups salvos na nuvem.
              </p>
            </div>
            <button
              onClick={handleConnect}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs inline-flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Cloud className="h-4 w-4" />
              <span>Conectar Google Drive</span>
            </button>
          </div>
        ) : isLoadingFiles ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin mx-auto" />
            <p className="text-xs text-zinc-400 font-mono">Carregando arquivos do Google Drive...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-8 text-center space-y-2">
            <p className="text-sm font-bold text-zinc-300">Nenhum arquivo encontrado no Google Drive.</p>
            <p className="text-xs text-zinc-500">
              Clique em &quot;Salvar Backup no Drive&quot; acima para criar seu primeiro arquivo na nuvem!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 pl-2">Nome do Arquivo</th>
                  <th className="pb-3 hidden sm:table-cell">Modificado Em</th>
                  <th className="pb-3 hidden md:table-cell">Tamanho</th>
                  <th className="pb-3 text-right pr-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredFiles.map((file) => {
                  const isAthletaJson = file.name.endsWith('.json') && file.name.includes('Athleta');
                  const formattedDate = file.modifiedTime
                    ? new Date(file.modifiedTime).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/A';

                  const formattedSize = file.size
                    ? `${(parseInt(file.size, 10) / 1024).toFixed(1)} KB`
                    : '—';

                  return (
                    <tr key={file.id} className="hover:bg-zinc-900/40 transition-colors group">
                      <td className="py-3 pl-2">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isAthletaJson
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {isAthletaJson ? (
                              <FileCheck className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white group-hover:text-emerald-400 transition-colors truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                              {file.name}
                            </p>
                            {isAthletaJson && (
                              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                Backup Athleta
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 hidden sm:table-cell text-zinc-400 font-mono text-[11px]">
                        {formattedDate}
                      </td>

                      <td className="py-3 hidden md:table-cell text-zinc-400 font-mono text-[11px]">
                        {formattedSize}
                      </td>

                      <td className="py-3 text-right pr-2">
                        <div className="flex items-center justify-end space-x-2">
                          {isAthletaJson && (
                            <button
                              onClick={() => handleStartRestore(file)}
                              disabled={isRestoring}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer active:scale-95 flex items-center space-x-1"
                              title="Restaurar este treino no aplicativo"
                            >
                              <DownloadCloud className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Restaurar</span>
                            </button>
                          )}

                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-all"
                              title="Abrir no Google Drive"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}

                          <button
                            onClick={() => setFileToDelete(file)}
                            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 transition-all cursor-pointer"
                            title="Excluir arquivo do Google Drive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MANDATORY USER CONFIRMATION MODAL FOR DESTRUCTIVE DELETE */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0f0f12] border border-rose-500/40 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Confirmar Exclusão</h3>
                <p className="text-xs text-zinc-400">Esta ação excluirá o arquivo do Google Drive.</p>
              </div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-xs space-y-1">
              <p className="text-zinc-400">Arquivo a ser excluído:</p>
              <p className="font-bold text-white font-mono break-all">{fileToDelete.name}</p>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Você tem certeza de que deseja excluir permanentemente este arquivo da sua conta Google Drive? Esta operação não pode ser desfeita.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>{isDeleting ? 'Excluindo...' : 'Excluir do Drive'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESTORE BACKUP MODAL */}
      {backupToRestore && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0f0f12] border border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <DownloadCloud className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Restaurar Ficha do Google Drive</h3>
                <p className="text-xs text-zinc-400">Carregar dados salvos no Athleta AI.</p>
              </div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Atleta do Backup:</span>
                <span className="font-bold text-white">{backupToRestore.payload.userProfile?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Objetivo:</span>
                <span className="font-bold text-emerald-400 uppercase">{backupToRestore.payload.userProfile?.objective}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Fases de Treino:</span>
                <span className="font-bold text-white">{backupToRestore.payload.program?.splitDays?.length || 0} Dias</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Data do Backup:</span>
                <span className="font-mono text-zinc-300">
                  {new Date(backupToRestore.payload.exportedAt).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Ao confirmar, a ficha atual será substituída pela rotina e perfil contidos neste arquivo de backup do Google Drive.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setBackupToRestore(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer shadow-lg shadow-emerald-600/30 active:scale-95"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirmar Restauração</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
