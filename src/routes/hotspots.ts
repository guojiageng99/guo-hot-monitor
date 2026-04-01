import express, { Router, Request, Response } from "express";
import { prisma } from "../index";

const router = Router();

// 获取热点（支持分页、来源、标题/内容搜索 q）
router.get("/", async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "20", source, keyword_id, q } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (source) where.source = source as string;

    const qStr = typeof q === "string" ? q.trim() : "";
    if (qStr.length > 0) {
      where.OR = [
        { title: { contains: qStr } },
        { content: { contains: qStr } },
      ];
    }

    let hotspots = await prisma.hotspot.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit as string),
    });

    // 如果指定了关键词，过滤相关热点
    if (keyword_id) {
      hotspots = hotspots.filter((h) => h.id.toString() === keyword_id);
    }

    res.json(hotspots);
  } catch (error) {
    res.status(500).json({ error: "获取热点失败" });
  }
});

// 手动触发一次采集（须放在 /:id 之前）
router.post("/collect", async (_req: Request, res: Response) => {
  try {
    const { runCollectionPipeline } = await import(
      "../tasks/collectionPipeline"
    );
    const result = await runCollectionPipeline();
    if (result.skipped) {
      return res.status(409).json({
        error: "已有采集任务正在执行，请稍后再试",
        skipped: true,
      });
    }
    res.json({
      ok: true,
      collected: result.collected,
      processed: result.processed,
      matchedNotifications: result.matchedNotifications,
      errors: result.errors,
    });
  } catch (error) {
    console.error("手动采集失败:", error);
    res.status(500).json({ error: "采集执行失败" });
  }
});

// 获取单个热点（仅数字 id，避免与 /collect 等路径混淆）
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const numId = parseInt(id as string, 10);
    if (Number.isNaN(numId)) {
      return res.status(404).json({ error: "热点不存在" });
    }
    const hotspot = await prisma.hotspot.findUnique({
      where: { id: numId },
    });

    if (!hotspot) {
      return res.status(404).json({ error: "热点不存在" });
    }

    res.json(hotspot);
  } catch (error) {
    res.status(500).json({ error: "获取热点失败" });
  }
});

// 创建热点（通常由后端定时任务创建）
router.post("/", async (req: Request, res: Response) => {
  try {
    const { title, content, source, sourceUrl, relevanceScore } = req.body;

    const hotspot = await prisma.hotspot.create({
      data: {
        title,
        content,
        source,
        sourceUrl: sourceUrl || null,
        relevanceScore: parseFloat(relevanceScore) || 0,
      },
    });

    res.status(201).json(hotspot);
  } catch (error) {
    res.status(500).json({ error: "创建热点失败" });
  }
});

// 更新热点（AI验证、打标签等）
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const numId = parseInt(id as string, 10);
    if (Number.isNaN(numId)) {
      return res.status(404).json({ error: "热点不存在" });
    }
    const { verified, aiSummary, aiTags, relevanceScore, importance } = req.body;

    const updated = await prisma.hotspot.update({
      where: { id: numId },
      data: {
        ...(verified !== undefined && { verified }),
        ...(aiSummary && { aiSummary }),
        ...(aiTags && { aiTags: JSON.stringify(aiTags) }),
        ...(relevanceScore !== undefined && { relevanceScore }),
        ...(typeof importance === "string" &&
          ["urgent", "high", "medium", "low"].includes(importance) && {
            importance,
          }),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "更新热点失败" });
  }
});

export default router;
