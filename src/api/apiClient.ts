// Frontend API client. Authentication is delegated to Firebase and the backend
// validates the Firebase ID token on every protected request.
import { getFreshIdToken } from '../services/firebaseAuthService';

export interface ApiClientResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getFreshIdToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'Erro na comunicação com o servidor.';
    try {
      const errorJson = await response.json();
      if (errorJson?.error?.message) errorMsg = errorJson.error.message;
    } catch {
      // Keep generic message when the response is not JSON.
    }

    const error = new Error(errorMsg);
    (error as Error & { status?: number; code?: string }).status = response.status;
    return Promise.reject(error);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function postApi<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
