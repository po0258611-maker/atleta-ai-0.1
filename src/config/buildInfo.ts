export interface ClientBuildInfo {
  version: string;
  commitSha: string;
  buildTime: string;
  environment: string;
}

declare global {
  interface Window {
    __ATLETA_AI_BUILD__?: ClientBuildInfo;
  }
}

// Injected during Vite build or fallback to default
export const CLIENT_BUILD_INFO: ClientBuildInfo = typeof __APP_BUILD_INFO__ !== 'undefined'
  ? __APP_BUILD_INFO__
  : {
      version: '0.3.0',
      commitSha: 'local-dev',
      buildTime: new Date().toISOString(),
      environment: 'development',
    };

if (typeof window !== 'undefined') {
  window.__ATLETA_AI_BUILD__ = CLIENT_BUILD_INFO;
}
