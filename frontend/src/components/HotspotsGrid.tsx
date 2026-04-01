import React from "react";

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

const HotspotsGrid: React.FC<HotspotsGridProps> = ({ hotspots }) => {
  const getSourceColor = (source: string) => {
    const colors: { [key: string]: string } = {
      Twitter: "from-blue-600 to-blue-400",
      Bing搜索: "from-cyan-600 to-cyan-400",
      搜狗搜索: "from-orange-600 to-orange-400",
      微博热搜: "from-red-600 to-red-400",
      HackerNews: "from-yellow-600 to-yellow-400",
      B站热门: "from-pink-600 to-pink-400",
      Google搜索: "from-green-600 to-green-400",
    };
    return colors[source] || "from-purple-600 to-purple-400";
  };

  const getTags = (tagStr?: string) => {
    if (!tagStr) return [];
    try {
      return JSON.parse(tagStr);
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
          className="group bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-xl p-5 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:from-slate-800 hover:to-slate-800/80 animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* 头部 */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="text-base font-bold text-white line-clamp-2 group-hover:text-purple-300 transition-colors">
                {hotspot.title}
              </h3>
              <div className="flex gaps-2 mt-2">
                <span
                  className={`text-xs font-semibold bg-gradient-to-r ${getSourceColor(
                    hotspot.source,
                  )} bg-clip-text text-transparent`}
                >
                  📌 {hotspot.source}
                </span>
              </div>
            </div>
            {hotspot.verified && (
              <div className="ml-2 px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-medium flex items-center gap-1">
                ✓ 已验证
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
                .map((tag, i) => (
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
