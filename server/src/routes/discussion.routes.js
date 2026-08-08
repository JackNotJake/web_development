// discussion.routes.js — 讨论路由
// 列表公开浏览;创建、修改、删除必须登录。

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { create, list, update, remove } from '../controllers/discussionController.js';

const router = Router();

// 创建评论 / 回复(一层) —— 需登录
router.post('/matches/:matchId/discussions', authMiddleware, create);

// 分页获取评论树(根评论 + replies[]) —— 公开
router.get('/matches/:matchId/discussions', list);

// 修改评论(仅本人) —— 需登录
router.patch('/discussions/:id', authMiddleware, update);

// 删除评论(本人或 ADMIN) —— 需登录
router.delete('/discussions/:id', authMiddleware, remove);

export default router;
