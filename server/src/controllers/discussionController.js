// discussionController.js — 讨论 CRUD 控制器
// 创建:zod 校验 content(1-500);parentId 可选,须同 matchId 且为根评论(一层回复)
// 列表:按 matchId 分页,返回根评论 + replies[] 树形
// 修改:仅本人(ADMIN 除外均不可改)
// 删除:本人或 ADMIN

import { z } from 'zod';
import { prisma } from '../prismaClient.js';

const contentSchema = z.object({
  content: z.string().min(1).max(500),
});

const createSchema = z.object({
  content: z.string().min(1).max(500),
  parentId: z.string().min(1).optional(),
});

/**
 * POST /matches/:matchId/discussions
 * 创建评论或回复(一层)。
 */
export async function create(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: '未登录' });
  }

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: '请求参数无效', details: parsed.error.issues });
  }
  const { content, parentId } = parsed.data;
  const { matchId } = req.params;

  // 校验比赛存在
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return res.status(404).json({ error: '比赛不存在' });
  }

  // 若指定 parentId:须存在、同 matchId、为根评论(parentId 为 null)
  if (parentId) {
    const parent = await prisma.discussion.findUnique({ where: { id: parentId } });
    if (!parent) {
      return res.status(400).json({ error: '父评论不存在' });
    }
    if (parent.matchId !== matchId) {
      return res.status(400).json({ error: '父评论不属于该比赛' });
    }
    if (parent.parentId !== null) {
      return res.status(400).json({ error: '仅支持一层回复' });
    }
  }

  const discussion = await prisma.discussion.create({
    data: {
      matchId,
      userId: req.user.userId,
      content,
      parentId: parentId ?? null,
    },
  });
  return res.status(201).json(discussion);
}

/**
 * GET /matches/:matchId/discussions?page=&limit=
 * 分页返回评论树(根评论 + replies[])。
 */
export async function list(req, res) {
  const { matchId } = req.params;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;

  const [discussions, total] = await Promise.all([
    prisma.discussion.findMany({
      where: { matchId, parentId: null },
      include: {
        user: { select: { id: true, username: true } },
        replies: {
          include: {
            user: { select: { id: true, username: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.discussion.count({ where: { matchId, parentId: null } }),
  ]);

  return res.status(200).json({ discussions, page, total });
}

/**
 * PATCH /discussions/:id
 * 仅本人可修改(ADMIN 亦不允许改他人内容,保持内容责任归属)。
 */
export async function update(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: '未登录' });
  }

  const { id } = req.params;
  const discussion = await prisma.discussion.findUnique({ where: { id } });
  if (!discussion) {
    return res.status(404).json({ error: '评论不存在' });
  }

  if (discussion.userId !== req.user.userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: '无权修改他人评论' });
  }

  const parsed = contentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: '请求参数无效', details: parsed.error.issues });
  }

  const updated = await prisma.discussion.update({
    where: { id },
    data: { content: parsed.data.content },
  });
  return res.status(200).json(updated);
}

/**
 * DELETE /discussions/:id
 * 本人或 ADMIN 可删除。
 */
export async function remove(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: '未登录' });
  }

  const { id } = req.params;
  const discussion = await prisma.discussion.findUnique({ where: { id } });
  if (!discussion) {
    return res.status(404).json({ error: '评论不存在' });
  }

  if (discussion.userId !== req.user.userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: '无权删除他人评论' });
  }

  await prisma.discussion.delete({ where: { id } });
  return res.status(200).json({ success: true });
}
