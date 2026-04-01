import express, { Express, Request, Response } from "express";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import keywordRouter from "./routes/keywords";
import hotspotsRouter from "./routes/hotspots";
import { startScheduledTasks } from "./tasks/scheduler";

// 加载环境变量
dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const io = new IOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// API 路由
app.use("/api/keywords", keywordRouter);
app.use("/api/hotspots", hotspotsRouter);

// 健康检查
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Socket.io 连接处理
io.on("connection", (socket) => {
  console.log(`客户端连接: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`客户端断开连接: ${socket.id}`);
  });
});

// 将 io 实例导出给其他模块使用
export { io, prisma };

// 启动服务器
httpServer.listen(PORT, async () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 环境: ${process.env.NODE_ENV}`);

  // 启动定时任务
  startScheduledTasks();
});

// 优雅关闭
process.on("SIGINT", async () => {
  console.log("\n正在关闭服务器...");
  await prisma.$disconnect();
  process.exit(0);
});
