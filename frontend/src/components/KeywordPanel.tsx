import React, { useState } from "react";

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
  loading: boolean;
}

const KeywordPanel: React.FC<KeywordPanelProps> = ({
  keywords,
  onAdd,
  onDelete,
  loading,
}) => {
  const [input, setInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

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
    <div className="sticky top-20 space-y-6">
      {/* 输入框 */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-purple-500/20 backdrop-blur">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <span>监控关键词</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入要监控的关键词..."
            className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all"
            disabled={isAdding}
          />
          <button
            type="submit"
            disabled={isAdding || loading}
            className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg shadow-purple-500/30"
          >
            {isAdding ? "添加中..." : "➕ 添加关键词"}
          </button>
        </form>
      </div>

      {/* 关键词列表 */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-purple-500/20 backdrop-blur max-h-96 overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">
          监控中的关键词 ({keywords.length})
        </h3>

        {keywords.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-2xl mb-2">📭</p>
            <p>还没有监控任何关键词</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keywords.map((kw) => (
              <div
                key={kw.id}
                className="bg-slate-700/40 rounded-lg p-3 flex justify-between items-center hover:bg-slate-700/60 transition-all border border-slate-600/20"
              >
                <div className="flex-1">
                  <div className="font-medium text-purple-300">
                    {kw.keyword}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(kw.createdAt).toLocaleDateString("zh-CN")}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(kw.id)}
                  className="ml-2 px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded transition-all"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-lg p-4 border border-blue-500/20 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {keywords.length}
          </div>
          <div className="text-xs text-blue-300/70 mt-1">活跃关键词</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-lg p-4 border border-green-500/20 text-center">
          <div className="text-2xl font-bold text-green-400">⚡</div>
          <div className="text-xs text-green-300/70 mt-1">实时监控中</div>
        </div>
      </div>
    </div>
  );
};

export default KeywordPanel;
