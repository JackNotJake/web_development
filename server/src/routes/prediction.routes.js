// prediction.routes.js — 预测路由
// SPEC §M3+M5:
//   POST /matches/:matchId/predictions  (鉴权,控制器内 if(!req.user)→401)
//   GET  /matches/:id/forecast          (公开)
//   GET  /matches/:id/prediction-final  (公开)

import { Router } from 'express';
import { create, getForecast, getPredictionFinal } from '../controllers/predictionController.js';

const router = Router();

router.post('/matches/:matchId/predictions', create);
router.get('/matches/:id/forecast', getForecast);
router.get('/matches/:id/prediction-final', getPredictionFinal);

export default router;
