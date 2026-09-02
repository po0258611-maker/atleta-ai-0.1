import fs from 'fs';
import path from 'path';

export interface BuildInfo {
  version: string;
  commitSha: string;
  buildTime: string;
  environment: string;
}

function tryGetLocalGitSha(): string | null {
  try {
    const gitHeadPath = path.join(process.cwd(), '.git', 'HEAD');
    if (fs.existsSync(gitHeadPath)) {
      const headContent = fs.readFileSync(gitHeadPath, 'utf8').trim();
      if (headContent.startsWith('ref: ')) {
        const refPath = path.join(process.cwd(), '.git', headContent.substring(5).trim());
        if (fs.existsSync(refPath)) {
          return fs.readFileSync(refPath, 'utf8').trim().substring(0, 7);
        }
      } else if (headContent.length >= 7) {
        return headContent.substring(0, 7);
      }
    }
  } catch {}
  return null;
}

export function resolveBuildInfo(customEnv: NodeJS.ProcessEnv = process.env): BuildInfo {
  const envSha =
    customEnv.COMMIT_SHA?.trim() ||
    customEnv.GIT_COMMIT_SHA?.trim() ||
    customEnv.GITHUB_SHA?.trim() ||
    customEnv.VITE_COMMIT_SHA?.trim() ||
    customEnv.SOURCE_VERSION?.trim() ||
    customEnv.K_REVISION?.trim();

  const commitSha = envSha || tryGetLocalGitSha() || 'local-dev';
  const version = customEnv.npm_package_version?.trim() || '0.3.0';
  const environment = customEnv.NODE_ENV?.trim() || 'development';
  const buildTime = customEnv.BUILD_TIME?.trim() || new Date().toISOString();

  return {
    version,
    commitSha,
    buildTime,
    environment,
  };
}

export const BUILD_INFO: BuildInfo = resolveBuildInfo();
