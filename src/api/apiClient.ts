// Frontend Secure API Client for ATLETA AI
import { getIdToken } from '../services/firebaseAuthService';

export interface ApiClientResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'Erro na comunicação com o servidor.';
    try {
      const errorJson = await response.json();
      if (errorJson?.error?.message) {
        errorMsg = errorJson.error.message;
      }
    } catch {
      // fallback message
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function postApi<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
