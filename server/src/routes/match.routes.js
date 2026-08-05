// match.routes.js — 赛事浏览路由(公开)

import { Router } from 'express';
import { list, detail } from '../controllers/matchController.js';

const router = Router();

// 公开浏览:无需鉴权
router.get('/', list);
router.get('/:id', detail);

export default router;
