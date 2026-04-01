import express, { Router, Request, Response } from "express";
import { prisma } from "../index";

const router = Router();

// 获取所有关键词
router.get("/", async (req: Request, res: Response) => {
  try {
    const keywords = await prisma.keyword.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
    });
    res.json(keywords);
  } catch (error) {
    res.status(500).json({ error: "获取关键词失败" });
  }
});

// 创建关键词
router.post("/", async (req: Request, res: Response) => {
  try {
    const { keyword, description, categories } = req.body;

    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({ error: "关键词不能为空" });
    }

    const newKeyword = await prisma.keyword.create({
      data: {
        keyword: keyword.trim(),
        description: description || "",
        categories: categories ? JSON.stringify(categories) : null,
        status: "active",
      },
    });

    res.status(201).json(newKeyword);
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(400).json({ error: "该关键词已存在" });
    } else {
      res.status(500).json({ error: "创建关键词失败" });
    }
  }
});

// 更新关键词
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { keyword, description, categories, status } = req.body;

    const updated = await prisma.keyword.update({
      where: { id: parseInt(id) },
      data: {
        ...(keyword && { keyword }),
        ...(description !== undefined && { description }),
        ...(categories && { categories: JSON.stringify(categories) }),
        ...(status && { status }),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "更新关键词失败" });
  }
});

// 删除关键词（软删除）
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    await prisma.keyword.update({
      where: { id: parseInt(id) },
      data: { status: "deleted" },
    });

    res.json({ message: "关键词已删除" });
  } catch (error) {
    res.status(500).json({ error: "删除关键词失败" });
  }
});

export default router;
