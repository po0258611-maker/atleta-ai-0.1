import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

export async function handleRegister(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, name, password } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const ua = req.headers['user-agent'] || 'Unknown';

    const result = await authService.register(email, name || 'Atleta', password, ip, ua);
    return res.status(201).json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao realizar cadastro.';
    return res.status(400).json({ error: { code: 'REGISTRATION_FAILED', message: msg } });
  }
}

export async function handleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const ua = req.headers['user-agent'] || 'Unknown';

    const result = await authService.login(email, password, ip, ua);
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha no login.';
    return res.status(401).json({ error: { code: 'AUTH_FAILED', message: msg } });
  }
}

export async function handleLogout(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.rawToken) {
      await authService.logout(req.rawToken);
    }
    return res.json({ status: 'ok', message: 'Sessão encerrada com sucesso.' });
  } catch (err) {
    return next(err);
  }
}

export async function handleMe(req: Request, res: Response) {
  return res.json({ user: req.user });
}
