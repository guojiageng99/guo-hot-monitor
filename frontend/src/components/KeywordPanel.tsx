import type { FC } from "react";
import { useState } from "react";

interface Keyword {
  id: number;
  keyword: string;
  description: string;
  status: string;
  createdAt: string;
}

interface KeywordPanelProps {
  keywords: Keyword[];
  onAdd: (keyword: string) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number, status: "active" | "paused") => void;
  loading: boolean;
}

const KeywordPanel: FC<KeywordPanelProps> = ({
  keywords,
  onAdd,
  onDelete,
  onToggleStatus,
  loading,
}) => {
  const [input, setInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const activeCount = keywords.filter((k) => k.status === "active").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsAdding(true);
    try {
      await onAdd(input);
      setInput("");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 border border-slate-700/50 bg-slate-900/40 backdrop-blur-md shadow-lg shadow-black/20">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-violet-400/90">
          监控配置
        </div>
        <h2 className="text-base font-semibold mb-4 text-slate-100 tracking-tight">
          关键词
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入要监控的关键词..."
            className="w-full px-4 py-3 bg-slate-950/50 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all"
            disabled={isAdding}
          />
          <button
            type="submit"
            disabled={isAdding || loading}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl font-semibold text-sm transition-colors shadow-md shadow-violet-950/40 ring-1 ring-white/10"
          >
            {isAdding ? "添加中..." : "➕ 添加关键词"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl p-5 border border-slate-700/50 bg-slate-900/40 backdrop-blur-md max-h-96 overflow-y-auto shadow-lg shadow-black/15">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">
          已添加 ({keywords.length})
        </h3>

        {keywords.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-2xl mb-2">📭</p>
            <p>还没有监控任何关键词</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keywords.map((kw) => {
              const isPaused = kw.status === "paused";
              return (
                <div
                  key={kw.id}
                  className={`rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 border transition-colors ${
                    isPaused
                      ? "bg-slate-900/50 border-slate-700/40 opacity-80"
                      : "bg-slate-800/40 hover:bg-slate-800/70 border-slate-600/30"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-violet-200 truncate">
                        {kw.keyword}
                      </span>
                      {isPaused && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-200 border border-amber-500/25 shrink-0">
                          已暂停
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(kw.createdAt).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onToggleStatus(
                          kw.id,
                          isPaused ? "active" : "paused",
                        )
                      }
                      className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-600/50 text-slate-300 hover:bg-slate-700/50 transition-colors"
                    >
                      {isPaused ? "启用" : "暂停"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(kw.id)}
                      className="px-2.5 py-1 text-xs font-medium bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 rounded-lg border border-rose-500/25 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 border border-slate-700/50 bg-slate-900/30 text-center">
          <div className="text-2xl font-semibold font-mono-nums text-cyan-300 tabular-nums">
            {activeCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">监控中</div>
        </div>
        <div className="rounded-xl p-4 border border-slate-700/50 bg-slate-900/30 text-center">
          <div className="text-2xl font-semibold font-mono-nums text-slate-400 tabular-nums">
            {keywords.length - activeCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">已暂停</div>
        </div>
      </div>
    </div>
  );
};

export default KeywordPanel;
