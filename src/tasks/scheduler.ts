import cron from "node-cron";
import { runCollectionPipeline } from "./collectionPipeline";

export async function startScheduledTasks(): Promise<void> {
  console.log("📅 启动定时监控任务");

  cron.schedule("0 */30 * * * *", async () => {
    console.log(`🔄 开始采集热点 - ${new Date().toLocaleString("zh-CN")}`);

    const result = await runCollectionPipeline();

    if (result.skipped) {
      console.log("⏳ 上一次采集还在进行中，跳过本次...");
      return;
    }

    console.log(
      `✅ 采集任务完成: 新入库 ${result.collected} 条, AI 处理 ${result.processed} 条, 匹配通知 ${result.matchedNotifications}, 错误 ${result.errors}`,
    );
  });

  console.log("✅ 定时任务已启动，将在每个整点和半点执行");
}
