import { getDriveAccessToken } from './googleDriveAuth';
import { FullBodyProgram, UserProfile, WorkoutLog } from '../types';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  isBackupFile?: boolean;
}

export interface DriveAboutInfo {
  userName?: string;
  userEmail?: string;
  userPhoto?: string;
  storageLimitBytes?: number;
  storageUsageBytes?: number;
}

export interface AthletaBackupPayload {
  version: string;
  exportedAt: string;
  app: string;
  userProfile: UserProfile;
  program: FullBodyProgram;
  workoutLogs: WorkoutLog[];
  metadata?: {
    totalWorkouts: number;
    daysPerWeek: number;
    objective: string;
  };
}

const ATHLETA_FOLDER_NAME = 'Athleta AI - Treinos e Backups';

/**
 * Gets or creates the Athleta AI dedicated folder in user's Google Drive
 */
export async function getOrCreateAthletaFolder(accessToken: string): Promise<string | null> {
  try {
    // Search if folder exists
    const q = `name = '${ATHLETA_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!searchRes.ok) {
      throw new Error(`Erro ao buscar pasta: ${searchRes.statusText}`);
    }

    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    // Create folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: ATHLETA_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Pasta com backups automáticos e fichas de treino do Athleta AI',
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Erro ao criar pasta: ${createRes.statusText}`);
    }

    const folder = await createRes.json();
    return folder.id;
  } catch (err) {
    console.warn('Não foi possível obter ou criar pasta específica, usando raiz do Drive:', err);
    return null;
  }
}

/**
 * Fetches user info and storage quota from Drive API
 */
export async function fetchDriveAbout(): Promise<DriveAboutInfo | null> {
  const token = getDriveAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/about?fields=user,storageQuota',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      userName: data.user?.displayName,
      userEmail: data.user?.emailAddress,
      userPhoto: data.user?.photoLink,
      storageLimitBytes: data.storageQuota?.limit ? parseInt(data.storageQuota.limit, 10) : undefined,
      storageUsageBytes: data.storageQuota?.usage ? parseInt(data.storageQuota.usage, 10) : undefined,
    };
  } catch (e) {
    console.error('Erro ao buscar informações do Drive:', e);
    return null;
  }
}

/**
 * Lists files from Google Drive (with focus on Athleta backups and workouts)
 */
export async function listDriveFiles(filterQuery?: string): Promise<DriveFileItem[]> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Token do Google Drive não encontrado. Por favor, conecte sua conta Google.');
  }

  let q = 'trashed = false';
  if (filterQuery) {
    q += ` and (name contains '${filterQuery}' or fullText contains '${filterQuery}')`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&orderBy=modifiedTime desc&pageSize=30&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,iconLink)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Sessão expirada. Por favor, reconecte sua conta Google.');
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erro ao carregar arquivos do Drive (${res.status})`);
  }

  const data = await res.json();
  const files: DriveFileItem[] = (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size,
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
    iconLink: f.iconLink,
    isBackupFile: f.name.toLowerCase().includes('athleta') || f.name.toLowerCase().includes('treino') || f.name.endsWith('.json'),
  }));

  return files;
}

/**
 * Uploads a file to Google Drive using multipart upload
 */
async function uploadToDrive(
  token: string,
  metadata: { name: string; mimeType: string; parents?: string[]; description?: string },
  content: Blob | string
): Promise<DriveFileItem> {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const contentType = metadata.mimeType || 'application/json';
  const bodyContent = typeof content === 'string' ? content : await content.text();

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${contentType}\r\n\r\n` +
    bodyContent +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,createdTime,modifiedTime,size',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Falha ao enviar arquivo para o Google Drive (${res.status})`);
  }

  return await res.json();
}

/**
 * Saves a complete backup (profile, program, logs) directly to Google Drive
 */
export async function uploadFullBackupToDrive(params: {
  program: FullBodyProgram;
  userProfile: UserProfile;
  workoutLogs: WorkoutLog[];
}): Promise<DriveFileItem> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Não autenticado com o Google Drive. Conecte sua conta primeiro.');
  }

  const folderId = await getOrCreateAthletaFolder(token);

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(':', 'h');
  const sanitizedName = params.userProfile.name.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Athleta_AI_Backup_${sanitizedName}_${dateStr}_${timeStr}.json`;

  const payload: AthletaBackupPayload = {
    version: '2.5',
    exportedAt: now.toISOString(),
    app: 'Athleta AI - Scientific Fullbody Training Engine',
    userProfile: params.userProfile,
    program: params.program,
    workoutLogs: params.workoutLogs,
    metadata: {
      totalWorkouts: params.workoutLogs.length,
      daysPerWeek: params.userProfile.availableDays,
      objective: params.userProfile.objective,
    },
  };

  const metadata: any = {
    name: fileName,
    mimeType: 'application/json',
    description: `Backup completo do treino e perfil de ${params.userProfile.name} gerado pelo Athleta AI em ${dateStr}.`,
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  return await uploadToDrive(token, metadata, JSON.stringify(payload, null, 2));
}

/**
 * Uploads a text summary format of the workout routine to Google Drive
 */
export async function uploadWorkoutTextToDrive(params: {
  program: FullBodyProgram;
  userProfile: UserProfile;
}): Promise<DriveFileItem> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Não autenticado com o Google Drive.');
  }

  const folderId = await getOrCreateAthletaFolder(token);
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Ficha_Treino_${params.userProfile.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.txt`;

  let textContent = `=======================================================\n`;
  textContent += `ATHLETA AI - FICHA CIENTÍFICA DE TREINO FULL BODY\n`;
  textContent += `=======================================================\n`;
  textContent += `Atleta: ${params.userProfile.name}\n`;
  textContent += `Objetivo: ${params.userProfile.objective}\n`;
  textContent += `Frequência: ${params.userProfile.availableDays}x por semana\n`;
  textContent += `Tempo por Sessão: ~${params.userProfile.timePerSessionMin} minutos\n`;
  textContent += `Data de Geração: ${dateStr}\n\n`;

  params.program.splitDays.forEach((day) => {
    textContent += `-------------------------------------------------------\n`;
    textContent += `FASE / DIA ${day.id}: ${day.title}\n`;
    textContent += `Foco: ${day.focusMuscles.join(', ')}\n`;
    textContent += `Tempo Estimado: ${day.estimatedTimeMin} min | Fadiga: ${day.systemicFatigueScore}/100\n`;
    textContent += `-------------------------------------------------------\n`;
    
    day.items.forEach((item, idx) => {
      textContent += `${idx + 1}. ${item.exercise.nome}\n`;
      textContent += `   - Séries: ${item.targetSets} | Reps: ${item.targetReps} | RIR Alvo: ${item.targetRIR}\n`;
      textContent += `   - Descanso: ${item.targetRestSec}s | Cadência: ${item.cadence}\n`;
      textContent += `   - Justificativa: ${item.orderRationale}\n\n`;
    });
    textContent += `\n`;
  });

  const metadata: any = {
    name: fileName,
    mimeType: 'text/plain',
    description: `Ficha de treino em formato texto para consulta rápida no Google Drive.`,
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  return await uploadToDrive(token, metadata, textContent);
}

/**
 * Reads and parses a backup JSON file from Google Drive
 */
export async function downloadAndParseBackupFromDrive(fileId: string): Promise<AthletaBackupPayload> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Token do Google Drive não encontrado.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Falha ao baixar arquivo do Drive (${res.status})`);
  }

  const data = await res.json();
  if (!data.program || !data.userProfile) {
    throw new Error('O arquivo selecionado não contém um formato de backup válido do Athleta AI.');
  }

  return data as AthletaBackupPayload;
}

/**
 * Deletes a file from Google Drive (MUST be preceded by user confirmation dialog)
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Token do Google Drive não encontrado.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Falha ao excluir arquivo (${res.status})`);
  }
}
