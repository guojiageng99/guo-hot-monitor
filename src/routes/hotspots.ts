import express, { Router, Request, Response } from "express";
import { prisma } from "../index";

const router = Router();

// 获取热点（支持分页和筛选）
router.get("/", async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "20", source, keyword_id } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (source) where.source = source as string;

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

// 获取单个热点
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const hotspot = await prisma.hotspot.findUnique({
      where: { id: parseInt(id) },
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
    const { verified, aiSummary, aiTags, relevanceScore } = req.body;

    const updated = await prisma.hotspot.update({
      where: { id: parseInt(id) },
      data: {
        ...(verified !== undefined && { verified }),
        ...(aiSummary && { aiSummary }),
        ...(aiTags && { aiTags: JSON.stringify(aiTags) }),
        ...(relevanceScore !== undefined && { relevanceScore }),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "更新热点失败" });
  }
});

export default router;
