// auth.routes.js — 鉴权路由(注册 / 登录)

import { Router } from 'express';
import { register, login } from '../controllers/authController.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);

export default router;
