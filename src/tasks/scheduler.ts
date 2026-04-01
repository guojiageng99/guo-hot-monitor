import cron from "node-cron";
import { hotspotsCollectService } from "../services/hotspotsCollect";
import { aiVerificationService } from "../services/aiVerification";
import { io, prisma } from "../index";

let taskRunning = false;

export async function startScheduledTasks(): Promise<void> {
  console.log("📅 启动定时监控任务");

  // 每30分钟执行一次热点采集
  // 格式: 秒 分 时 日 月 星期
  cron.schedule("0 */30 * * * *", async () => {
    if (taskRunning) {
      console.log("⏳ 上一次采集还在进行中，跳过本次...");
      return;
    }

    taskRunning = true;
    try {
      console.log(`🔄 开始采集热点 - ${new Date().toLocaleString("zh-CN")}`);

      // 1. 从多个源采集热点
      const hotspots = await hotspotsCollectService.collectFromAllSources();
      console.log(`✅ 采集到 ${hotspots.length} 条热点`);

      // 2. 获取活跃关键词
      const keywords = await prisma.keyword.findMany({
        where: { status: "active" },
      });

      // 3. 对每个热点进行AI验证和匹配
      for (const hotspot of hotspots) {
        try {
          // AI验证和标签化
          const verified = await aiVerificationService.verifyAndTag(
            hotspot.title,
            hotspot.content,
          );

          // 更新热点信息
          const savedHotspot = await prisma.hotspot.update({
            where: { id: hotspot.id },
            data: {
              verified: verified.isReal,
              aiSummary: verified.summary,
              aiTags: JSON.stringify(verified.tags),
              relevanceScore: verified.relevanceScore,
            },
          });

          // 检查是否匹配任何关键词
          for (const keyword of keywords) {
            const matches = await aiVerificationService.matchKeyword(
              hotspot.title,
              hotspot.content,
              keyword.keyword,
            );

            if (matches) {
              // 创建通知
              const notification = await prisma.notification.create({
                data: {
                  keywordId: keyword.id,
                  hotspotId: savedHotspot.id,
                },
              });

              // 通过 Socket.io 实时推送给前端
              io.emit("new-hotspot", {
                hotspot: savedHotspot,
                keyword: keyword.keyword,
                notification,
              });

              console.log(
                `🔔 新热点匹配关键词: ${keyword.keyword} - ${hotspot.title}`,
              );
            }
          }
        } catch (error) {
          console.error(`❌ 处理热点失败: ${hotspot.title}`, error);
        }
      }

      console.log("✅ 采集任务完成");
    } catch (error) {
      console.error("❌ 定时任务执行出错:", error);
    } finally {
      taskRunning = false;
    }
  });

  console.log("✅ 定时任务已启动，将在每个整点和半点执行");
}
