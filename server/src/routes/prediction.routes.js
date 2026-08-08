// prediction.routes.js — 预测路由
// SPEC §M3+M5:
//   POST /matches/:matchId/predictions  (必须登录)
//   GET  /matches/:id/forecast          (公开)
//   GET  /matches/:id/prediction-final  (公开)

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { create, getForecast, getPredictionFinal, getMyPrediction } from '../controllers/predictionController.js';

const router = Router();

router.post('/matches/:matchId/predictions', authMiddleware, create);
router.get('/matches/:id/my-prediction', authMiddleware, getMyPrediction);
router.get('/matches/:id/forecast', getForecast);
router.get('/matches/:id/prediction-final', getPredictionFinal);

export default router;
