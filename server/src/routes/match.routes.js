// match.routes.js — 赛事浏览路由(公开)

import { Router } from 'express';
import { list, detail, teams, teamDetail, faqs } from '../controllers/matchController.js';

const router = Router();

// 公开浏览:无需鉴权
router.get('/', list);
router.get('/faqs', faqs);
router.get('/teams', teams);
router.get('/teams/:id', teamDetail);
router.get('/:id', detail);

export default router;
