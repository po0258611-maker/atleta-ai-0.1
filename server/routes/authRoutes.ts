import { Router } from 'express';
import { handleRegister, handleLogin, handleLogout, handleMe } from '../controllers/authController';
import { authGuard } from '../middlewares/authGuard';
import { rateLimiter } from '../middlewares/rateLimiter';

export const authRouter = Router();

authRouter.post('/register', rateLimiter, handleRegister);
authRouter.post('/login', rateLimiter, handleLogin);
authRouter.post('/logout', authGuard, handleLogout);
authRouter.get('/me', authGuard, handleMe);
