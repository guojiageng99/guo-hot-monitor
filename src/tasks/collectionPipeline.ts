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
 * 采集 → 入库 → AI 审核（真实性/相对关键词相关性/重要性/摘要）→ 按 matchedKeywords 通知
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
    const keywordStrings = keywords.map((k) => k.keyword);
    const keywordByText = new Map(
      keywords.map((k) => [k.keyword.trim().toLowerCase(), k] as const),
    );

    for (const hotspot of hotspots) {
      if (hotspot.id == null) {
        continue;
      }
      try {
        const verified = await aiVerificationService.verifyAndTag(
          hotspot.title,
          hotspot.content,
          keywordStrings,
        );

        const savedHotspot = await prisma.hotspot.update({
          where: { id: hotspot.id },
          data: {
            verified: verified.isReal,
            aiSummary: verified.summary,
            aiTags: JSON.stringify(verified.tags),
            relevanceScore: verified.relevanceScore,
            importance: verified.importance,
          },
        });

        processed += 1;

        const notifiedIds = new Set<number>();

        for (const mk of verified.matchedKeywords) {
          const row = keywordByText.get(mk.trim().toLowerCase());
          if (!row || notifiedIds.has(row.id)) continue;
          notifiedIds.add(row.id);

          const notification = await prisma.notification.create({
            data: {
              keywordId: row.id,
              hotspotId: savedHotspot.id,
            },
          });

          matchedNotifications += 1;

          io.emit("new-hotspot", {
            hotspot: savedHotspot,
            keyword: { keyword: row.keyword },
            notification,
          });
        }

        if (notifiedIds.size === 0 && keywords.length > 0) {
          for (const keyword of keywords) {
            const hit = await aiVerificationService.matchKeyword(
              hotspot.title,
              hotspot.content,
              keyword.keyword,
            );
            if (!hit) continue;

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
