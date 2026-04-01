import type { FC } from "react";

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
  createdAt: string;
}

interface HotspotsGridProps {
  hotspots: Hotspot[];
}

const HotspotsGrid: FC<HotspotsGridProps> = ({ hotspots }) => {
  const getSourceStyle = (source: string) => {
    const map: { [key: string]: string } = {
      Twitter: "bg-sky-500/15 text-sky-200 border-sky-500/25",
      Bing搜索: "bg-cyan-500/15 text-cyan-200 border-cyan-500/25",
      搜狗搜索: "bg-orange-500/15 text-orange-200 border-orange-500/25",
      微博热搜: "bg-red-500/15 text-red-200 border-red-500/25",
      HackerNews: "bg-amber-500/15 text-amber-200 border-amber-500/25",
      B站热门: "bg-pink-500/15 text-pink-200 border-pink-500/25",
      Google搜索: "bg-emerald-500/15 text-emerald-200 border-emerald-500/25",
    };
    return map[source] || "bg-violet-500/15 text-violet-200 border-violet-500/25";
  };

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

  if (hotspots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4 animate-bounce">🌊</div>
        <h3 className="text-xl font-bold text-slate-300 mb-2">还没有热点</h3>
        <p className="text-slate-400">添加关键词后，热点将自动出现在这里</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-max">
      {hotspots.map((hotspot, index) => (
        <div
          key={hotspot.id}
          className="group relative overflow-hidden rounded-2xl p-5 border border-slate-700/40 bg-slate-900/50 backdrop-blur-sm shadow-lg shadow-black/20 hover:border-violet-500/40 hover:shadow-violet-950/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-violet-600/5 via-transparent to-fuchsia-600/5"
            aria-hidden
          />
          {/* 头部 */}
          <div className="relative flex justify-between items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-50 line-clamp-2 group-hover:text-violet-200 transition-colors tracking-tight">
                {hotspot.title}
              </h3>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <span
                  className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border ${getSourceStyle(
                    hotspot.source,
                  )}`}
                >
                  {hotspot.source}
                </span>
              </div>
            </div>
            {hotspot.verified && (
              <div className="shrink-0 px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
                已验证
              </div>
            )}
          </div>

          {/* 内容 */}
          <p className="text-sm text-slate-300 line-clamp-3 mb-3 leading-relaxed">
            {hotspot.content}
          </p>

          {/* AI摘要 */}
          {hotspot.aiSummary && (
            <div className="mb-3 p-3 bg-slate-700/30 rounded-lg border border-purple-500/20">
              <div className="text-xs text-purple-300 font-medium mb-1">
                🤖 AI摘要
              </div>
              <div className="text-sm text-slate-300 line-clamp-2">
                {hotspot.aiSummary}
              </div>
            </div>
          )}

          {/* 标签 */}
          {getTags(hotspot.aiTags).length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {getTags(hotspot.aiTags)
                .slice(0, 3)
                .map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 bg-slate-700/60 text-slate-300 rounded-full border border-slate-600/50"
                  >
                    #{tag}
                  </span>
                ))}
            </div>
          )}

          {/* 底部信息 */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-700/30">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">
                相关度: {Math.round(hotspot.relevanceScore)}%
              </span>
              <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  style={{ width: `${hotspot.relevanceScore}%` }}
                ></div>
              </div>
            </div>
            <span className="text-xs text-slate-500">
              {new Date(hotspot.createdAt).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* 链接 */}
          {hotspot.sourceUrl && (
            <a
              href={hotspot.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-center py-2 text-sm text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-all"
            >
              查看源链接 →
            </a>
          )}
        </div>
      ))}
    </div>
  );
};

export default HotspotsGrid;
