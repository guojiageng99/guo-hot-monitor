import type { FC } from "react";
import { IconEye, IconTwitter } from "./icons";

interface Hotspot {
  id: number;
  title: string;
  content: string;
  source: string;
  sourceUrl?: string;
  verified: boolean;
  aiSummary?: string;
  aiTags?: string;
  relevanceScore: number;
  /** urgent | high | medium | low */
  importance?: string;
  createdAt: string;
}

interface LatestHotspotsFeedProps {
  hotspots: Hotspot[];
}

function priorityFromScore(score: number): {
  label: string;
  className: string;
  showFire?: boolean;
} {
  if (score >= 80) {
    return {
      label: "HIGH",
      className:
        "bg-orange-500/20 text-orange-200 border-orange-400/35",
      showFire: true,
    };
  }
  if (score >= 50) {
    return {
      label: "MEDIUM",
      className:
        "bg-amber-400/20 text-amber-100 border-amber-400/35",
    };
  }
  return {
    label: "LOW",
    className: "bg-zinc-600/35 text-zinc-300 border-zinc-500/30",
  };
}

/** 教程：重要性分级 urgent / high / medium / low */
function priorityFromImportance(
  importance: string | undefined,
  score: number,
): { label: string; className: string; showFire?: boolean } {
  const i = (importance || "").toLowerCase().trim();
  if (i === "urgent") {
    return {
      label: "URGENT",
      className:
        "bg-red-600/25 text-red-100 border-red-400/45",
      showFire: true,
    };
  }
  if (i === "high") {
    return {
      label: "HIGH",
      className:
        "bg-orange-500/20 text-orange-200 border-orange-400/35",
      showFire: true,
    };
  }
  if (i === "medium") {
    return {
      label: "MEDIUM",
      className:
        "bg-amber-400/20 text-amber-100 border-amber-400/35",
    };
  }
  if (i === "low") {
    return {
      label: "LOW",
      className: "bg-zinc-600/35 text-zinc-300 border-zinc-500/30",
    };
  }
  return priorityFromScore(score);
}

function sourceKey(source: string): string {
  const map: Record<string, string> = {
    Twitter: "twitter",
    Bing搜索: "bing",
    搜狗搜索: "sogou",
    微博热搜: "weibo",
    HackerNews: "hackernews",
    B站热门: "bilibili",
    Google搜索: "google",
  };
  return map[source] ?? source.toLowerCase().replace(/\s+/g, "").slice(0, 14);
}

function isTwitterSource(source: string) {
  return /twitter/i.test(source);
}

const getTags = (tagStr?: string): string[] => {
  if (!tagStr) return [];
  try {
    const parsed = JSON.parse(tagStr);
    return Array.isArray(parsed)
      ? parsed.filter((t) => typeof t === "string")
      : [];
  } catch {
    return [];
  }
};

const LatestHotspotsFeed: FC<LatestHotspotsFeedProps> = ({ hotspots }) => {
  const viewHint = (h: Hotspot) =>
    Math.max(1, Math.min(99, Math.round(h.relevanceScore / 12) || h.id % 17 + 1));

  if (hotspots.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#1e1e22] py-16 text-center">
        <p className="text-4xl mb-3 opacity-40">🔥</p>
        <p className="text-zinc-400 text-sm">暂无热点，点击「立即检查」或等待定时采集</p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 w-full [grid-template-columns:repeat(auto-fill,minmax(min(100%,18rem),1fr))]"
    >
      {hotspots.map((hotspot, index) => {
        const p = priorityFromImportance(
          hotspot.importance,
          hotspot.relevanceScore,
        );
        const tags = getTags(hotspot.aiTags);
        const topicTag = tags[0] ?? "AI 热点";
        const desc = (hotspot.aiSummary || hotspot.content || "").trim();

        return (
          <article
            key={hotspot.id}
            className="rounded-xl border border-white/[0.06] bg-[#1e1e22] p-5 shadow-sm transition-colors hover:border-violet-500/20 animate-in fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-md border uppercase ${p.className}`}
              >
                {p.showFire && <span aria-hidden>🔥</span>}
                {p.label}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border border-sky-500/25 bg-sky-500/10 text-sky-200">
                {isTwitterSource(hotspot.source) && (
                  <IconTwitter className="text-sky-400 shrink-0" />
                )}
                {sourceKey(hotspot.source)}
              </span>
              <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border border-violet-500/30 bg-violet-500/15 text-violet-200 max-w-[200px] truncate">
                {topicTag}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-white leading-snug tracking-tight mb-2 line-clamp-2">
              {hotspot.title}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3 mb-4">
              {desc}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
              <span className="text-xs text-zinc-500">
                相关性（相对监控词）{" "}
                <span className="text-zinc-300 font-medium font-mono-nums">
                  {Math.round(hotspot.relevanceScore)}%
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <IconEye className="text-zinc-500" />
                <span className="font-mono-nums text-zinc-400">{viewHint(hotspot)}</span>
              </span>
            </div>

            {hotspot.sourceUrl && (
              <a
                href={hotspot.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-xs font-medium text-violet-400 hover:text-violet-300"
              >
                查看原文 →
              </a>
            )}
          </article>
        );
      })}
    </div>
  );
};

export default LatestHotspotsFeed;
