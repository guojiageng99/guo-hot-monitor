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

const card =
  "rounded-xl border border-white/[0.06] bg-[#16161e]";

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
      <div className={`${card} p-6`}>
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#7c4dff]">
          监控配置
        </div>
        <h2 className="text-base font-semibold mb-4 text-white tracking-tight">
          关键词
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入要监控的关键词..."
            className="w-full px-4 py-3 bg-[#0d0d12] border border-white/[0.08] rounded-xl text-white placeholder-[#6b7280] focus:outline-none focus:border-[#7c4dff]/50 focus:ring-2 focus:ring-[#7c4dff]/20 transition-all"
            disabled={isAdding}
          />
          <button
            type="submit"
            disabled={isAdding || loading}
            className="w-full py-2.5 rounded-xl font-semibold text-sm text-white bg-[#7c4dff] hover:bg-[#6d3ef0] disabled:opacity-50 border border-[#8f5fff]/30 shadow-[0_4px_20px_rgba(124,77,255,0.25)]"
          >
            {isAdding ? "添加中..." : "添加关键词"}
          </button>
        </form>
      </div>

      <div className={`${card} p-5 max-h-[28rem] overflow-y-auto`}>
        <h3 className="text-sm font-semibold text-white mb-4">
          已添加 ({keywords.length})
        </h3>

        {keywords.length === 0 ? (
          <div className="text-center py-8 text-[#9ca3af]">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm">还没有监控任何关键词</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keywords.map((kw) => {
              const isPaused = kw.status === "paused";
              return (
                <div
                  key={kw.id}
                  className={`rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 border transition-colors ${
                    isPaused
                      ? "bg-[#0d0d12]/90 border-white/[0.04] opacity-85"
                      : "bg-[#1a1a22] border-white/[0.06] hover:border-[#7c4dff]/20"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[#c4b5fd] truncate">
                        {kw.keyword}
                      </span>
                      {isPaused && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-200 border border-amber-500/25 shrink-0">
                          已暂停
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#9ca3af] mt-1">
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
                      className="px-2.5 py-1 text-xs font-medium rounded-lg border border-white/[0.1] text-zinc-300 hover:bg-white/[0.06] transition-colors"
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
        <div className={`${card} p-4 text-center`}>
          <div className="text-2xl font-semibold font-mono-nums text-[#7c4dff] tabular-nums">
            {activeCount}
          </div>
          <div className="text-[11px] text-[#9ca3af] mt-1">监控中</div>
        </div>
        <div className={`${card} p-4 text-center`}>
          <div className="text-2xl font-semibold font-mono-nums text-[#9ca3af] tabular-nums">
            {keywords.length - activeCount}
          </div>
          <div className="text-[11px] text-[#9ca3af] mt-1">已暂停</div>
        </div>
      </div>
    </div>
  );
};

export default KeywordPanel;
