// leaderboard.routes.js — 排行榜路由
// SPEC §M5: GET /leaderboard?scope=week|all

import { Router } from 'express';
import { list } from '../controllers/leaderboardController.js';

const router = Router();

router.get('/leaderboard', list);

export default router;
