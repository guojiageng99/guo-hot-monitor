import { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import KeywordPanel from "./components/KeywordPanel";
import HotspotsGrid from "./components/HotspotsGrid";
import NotificationCenter from "./components/NotificationCenter";
import "./App.css";

const envApi = import.meta.env.VITE_API_BASE?.trim().replace(/\/$/, "") ?? "";
const API_BASE =
  envApi.length > 0
    ? envApi
    : import.meta.env.DEV
      ? "/api"
      : "http://localhost:5000/api";
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? window.location.origin : "http://localhost:5000");

function App() {
  const [keywords, setKeywords] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [isConnected, setIsConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");

  // 初始化Socket.io连接
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      path: "/socket.io",
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      console.log("✅ Socket.io已连接");
      setIsConnected(true);
    });

    socket.on("new-hotspot", (data) => {
      console.log("🔔 收到新热点:", data);
      setNotifications((prev) => [data, ...prev].slice(0, 50));
      setHotspots((prev) => [data.hotspot, ...prev]);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket.io断开连接");
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 获取关键词
  const fetchKeywords = async (showPanelLoading = true) => {
    try {
      if (showPanelLoading) setLoading(true);
      const res = await axios.get(`${API_BASE}/keywords`);
      setKeywords(res.data);
    } catch (error) {
      console.error("获取关键词失败:", error);
    } finally {
      if (showPanelLoading) setLoading(false);
    }
  };

  const loadHotspots = useCallback(async (q: string) => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (q) params.set("q", q);
      const res = await axios.get(`${API_BASE}/hotspots?${params.toString()}`);
      setHotspots(res.data);
    } catch (error) {
      console.error("获取热点失败:", error);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setSearchQ(searchDraft.trim()), 350);
    return () => window.clearTimeout(id);
  }, [searchDraft]);

  useEffect(() => {
    void loadHotspots(searchQ);
  }, [searchQ, loadHotspots]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchKeywords(false), loadHotspots(searchQ)]);
    } finally {
      setRefreshing(false);
    }
  }, [searchQ, loadHotspots]);

  const handleCollectNow = useCallback(async () => {
    setCollecting(true);
    try {
      const res = await axios.post(`${API_BASE}/hotspots/collect`);
      await loadHotspots(searchQ);
      const d = res.data;
      alert(
        `采集完成：新入库 ${d.collected} 条，AI 处理 ${d.processed} 条，匹配通知 ${d.matchedNotifications} 条${d.errors ? `（${d.errors} 条处理出错）` : ""}`,
      );
    } catch (error: unknown) {
      const ax = error as { response?: { status?: number; data?: { error?: string } } };
      if (ax.response?.status === 409) {
        alert(ax.response.data?.error ?? "采集进行中");
      } else {
        alert(ax.response?.data?.error ?? "采集失败，请查看控制台");
        console.error(error);
      }
    } finally {
      setCollecting(false);
    }
  }, [searchQ, loadHotspots]);

  // 初始化加载关键词（热点由 searchQ effect 拉取）
  useEffect(() => {
    void fetchKeywords();
  }, []);

  // 添加关键词
  const handleAddKeyword = async (keyword: string) => {
    try {
      const res = await axios.post(`${API_BASE}/keywords`, {
        keyword,
        description: `监控关键词: ${keyword}`,
      });
      setKeywords((prev) => [res.data, ...prev]);
    } catch (error: any) {
      alert(error.response?.data?.error || "添加失败");
    }
  };

  // 删除关键词
  const handleDeleteKeyword = async (id: number) => {
    try {
      await axios.delete(`${API_BASE}/keywords/${id}`);
      setKeywords((prev) => prev.filter((k) => k.id !== id));
    } catch (error) {
      console.error("删除失败:", error);
    }
  };

  const handleToggleKeywordStatus = async (
    id: number,
    status: "active" | "paused",
  ) => {
    try {
      const res = await axios.put(`${API_BASE}/keywords/${id}`, { status });
      setKeywords((prev) =>
        prev.map((k) => (k.id === id ? res.data : k)),
      );
    } catch (error) {
      console.error("更新关键词状态失败:", error);
      alert("更新状态失败");
    }
  };

  const activeKeywordCount = keywords.filter((k) => k.status === "active").length;

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = hotspots.filter((h) => h.createdAt?.slice(0, 10) === today).length;
  const urgentCount = hotspots.filter((h) => h.relevanceScore >= 80).length;

  return (
    <div className="min-h-screen bg-dashboard-mesh text-slate-100 overflow-x-hidden">
      <div className="min-h-screen bg-grid-faint">
      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/55 border-b border-white/[0.06]">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25 ring-1 ring-white/10"
              aria-hidden
            >
              <span className="text-lg leading-none">🔥</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate">
                热点监控中心
              </h1>
              <p className="text-xs text-slate-400 truncate">
                AI 实时热点追踪与告警
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
            <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/50 text-slate-300">
              <span
                className={`inline-block w-2 h-2 rounded-full mr-2 align-middle ${
                  isConnected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-rose-500"
                }`}
              />
              {isConnected ? "实时通道已连接" : "实时通道断开"}
            </div>
            <span className="hidden sm:inline text-slate-500 text-xs">
              关键词{" "}
              <span className="text-slate-300 font-mono-nums">
                {activeKeywordCount}/{keywords.length}
              </span>
              <span className="mx-1.5">·</span>
              热点 <span className="text-slate-300 font-mono-nums">{hotspots.length}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => void handleCollectNow()}
              disabled={collecting || refreshing || loading}
              className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold shadow-md shadow-fuchsia-950/40 ring-1 ring-white/10 transition-colors"
            >
              {collecting ? "采集中…" : "立即检查"}
            </button>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing || loading || collecting}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold shadow-md shadow-violet-900/40 ring-1 ring-white/10 transition-colors"
            >
              {refreshing ? "刷新中…" : "刷新数据"}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { label: "总热点", value: hotspots.length, accent: "text-violet-300" },
            { label: "今日新增", value: todayCount, accent: "text-cyan-300" },
            { label: "紧急热点", value: urgentCount, accent: "text-rose-300" },
            {
              label: "监控关键词",
              value: activeKeywordCount,
              accent: "text-lime-300",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-md p-4 shadow-lg shadow-black/20"
            >
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                {card.label}
              </p>
              <p className={`mt-1 text-3xl font-semibold font-mono-nums tabular-nums ${card.accent}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <aside className="xl:col-span-3">
            <div className="space-y-6">
              <KeywordPanel
                keywords={keywords}
                onAdd={handleAddKeyword}
                onDelete={handleDeleteKeyword}
                onToggleStatus={handleToggleKeywordStatus}
                loading={loading}
              />

              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-md p-4 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="font-semibold text-sm text-slate-200 tracking-tight">
                    实时通知
                  </h2>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    最近 5 条
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">关键词匹配到的新热点会推送到此处</p>
                <NotificationCenter notifications={notifications.slice(0, 5)} />
              </div>
            </div>
          </aside>

          <main className="xl:col-span-9">
            <div className="mb-4">
              <label className="sr-only" htmlFor="hotspot-search">
                搜索热点
              </label>
              <input
                id="hotspot-search"
                type="search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="搜索标题或正文…"
                className="w-full max-w-md px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-600/50 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
                autoComplete="off"
              />
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {(
                [
                  { id: "all" as const, label: "全部热点" },
                  { id: "verified" as const, label: "已验证" },
                  { id: "urgent" as const, label: "紧急" },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ring-1 ${
                    filter === id
                      ? id === "urgent"
                        ? "bg-rose-600/90 text-white ring-rose-400/30 shadow-md shadow-rose-950/40"
                        : "bg-violet-600 text-white ring-violet-400/30 shadow-md shadow-violet-950/40"
                      : "bg-slate-900/60 text-slate-400 hover:text-slate-200 ring-slate-700/50 hover:ring-slate-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <HotspotsGrid
              hotspots={hotspots.filter((h) => {
                if (filter === "all") return true;
                if (filter === "verified") return h.verified;
                if (filter === "urgent") return h.relevanceScore >= 80;
                return true;
              })}
            />
          </main>
        </div>
      </div>
      </div>
    </div>
  );
}

export default App;
