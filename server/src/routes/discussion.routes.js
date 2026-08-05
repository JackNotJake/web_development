// discussion.routes.js — 讨论路由
// 注意:鉴权由 app 层统一挂载(生产用 authMiddleware);控制器内部对写操作做
// `if (!req.user) return 401` 兜底,故路由内不重复挂 authMiddleware 以兼容测试。

import { Router } from 'express';
import { create, list, update, remove } from '../controllers/discussionController.js';

const router = Router();

// 创建评论 / 回复(一层)
router.post('/matches/:matchId/discussions', create);

// 分页获取评论树(根评论 + replies[])
router.get('/matches/:matchId/discussions', list);

// 修改评论(仅本人)
router.patch('/discussions/:id', update);

// 删除评论(本人或 ADMIN)
router.delete('/discussions/:id', remove);

export default router;
