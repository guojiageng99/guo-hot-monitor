import { hotspotsCollectService } from "../services/hotspotsCollect";
import { aiVerificationService } from "../services/aiVerification";
import { io, prisma } from "../index";

export type CollectionPipelineResult = {
  skipped: boolean;
  collected: number;
  processed: number;
  matchedNotifications: number;
  errors: number;
};

let pipelineRunning = false;

/**
 * 执行一次完整采集：多源抓取 → 入库 → AI 验证/打标 → 关键词匹配 → Socket 推送。
 * 与定时任务共用互斥锁，避免并发执行。
 */
export async function runCollectionPipeline(): Promise<CollectionPipelineResult> {
  if (pipelineRunning) {
    return {
      skipped: true,
      collected: 0,
      processed: 0,
      matchedNotifications: 0,
      errors: 0,
    };
  }

  pipelineRunning = true;
  let collected = 0;
  let processed = 0;
  let matchedNotifications = 0;
  let errors = 0;

  try {
    const hotspots = await hotspotsCollectService.collectFromAllSources();
    collected = hotspots.length;

    const keywords = await prisma.keyword.findMany({
      where: { status: "active" },
    });

    for (const hotspot of hotspots) {
      if (hotspot.id == null) {
        continue;
      }
      try {
        const verified = await aiVerificationService.verifyAndTag(
          hotspot.title,
          hotspot.content,
        );

        const savedHotspot = await prisma.hotspot.update({
          where: { id: hotspot.id },
          data: {
            verified: verified.isReal,
            aiSummary: verified.summary,
            aiTags: JSON.stringify(verified.tags),
            relevanceScore: verified.relevanceScore,
          },
        });

        processed += 1;

        for (const keyword of keywords) {
          const matches = await aiVerificationService.matchKeyword(
            hotspot.title,
            hotspot.content,
            keyword.keyword,
          );

          if (matches) {
            const notification = await prisma.notification.create({
              data: {
                keywordId: keyword.id,
                hotspotId: savedHotspot.id,
              },
            });

            matchedNotifications += 1;

            io.emit("new-hotspot", {
              hotspot: savedHotspot,
              keyword: { keyword: keyword.keyword },
              notification,
            });
          }
        }
      } catch {
        errors += 1;
      }
    }

    return {
      skipped: false,
      collected,
      processed,
      matchedNotifications,
      errors,
    };
  } finally {
    pipelineRunning = false;
  }
}
