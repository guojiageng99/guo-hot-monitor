import { useState, useEffect, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import KeywordPanel from "./components/KeywordPanel";
import LatestHotspotsFeed from "./components/LatestHotspotsFeed";
import NotificationDrawer from "./components/NotificationDrawer";
import { IconRefresh, IconBell } from "./components/icons";
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

type TabId = "dashboard" | "keywords" | "search";

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
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
  const [notifOpen, setNotifOpen] = useState(false);

  const effectiveSearch = activeTab === "search" ? searchQ : "";

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      path: "/socket.io",
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => setIsConnected(true));
    socket.on("new-hotspot", (data) => {
      setNotifications((prev) => [data, ...prev].slice(0, 50));
      setHotspots((prev) => [data.hotspot, ...prev]);
    });
    socket.on("disconnect", () => setIsConnected(false));

    return () => {
      socket.disconnect();
    };
  }, []);

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
    void loadHotspots(effectiveSearch);
  }, [effectiveSearch, loadHotspots]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchKeywords(false), loadHotspots(effectiveSearch)]);
    } finally {
      setRefreshing(false);
    }
  }, [effectiveSearch, loadHotspots]);

  const handleCollectNow = useCallback(async () => {
    setCollecting(true);
    try {
      const res = await axios.post(`${API_BASE}/hotspots/collect`);
      await loadHotspots(effectiveSearch);
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
  }, [effectiveSearch, loadHotspots]);

  useEffect(() => {
    void fetchKeywords();
  }, []);

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

  const filteredHotspots = useMemo(
    () =>
      hotspots.filter((h) => {
        if (filter === "all") return true;
        if (filter === "verified") return h.verified;
        if (filter === "urgent") return h.relevanceScore >= 80;
        return true;
      }),
    [hotspots, filter],
  );

  const notifBadge =
    notifications.length > 9 ? "9+" : String(notifications.length);

  const tabs: { id: TabId; label: string }[] = [
    { id: "dashboard", label: "仪表盘" },
    { id: "keywords", label: "关键词" },
    { id: "search", label: "搜索" },
  ];

  /** 铺满视口宽度，仅保留左右内边距（不再限制 max-width，避免宽屏右侧大块留白） */
  const layoutShell =
    "w-full max-w-none box-border px-4 sm:px-5 md:px-8 lg:px-10 xl:px-12";

  return (
    <div className="min-h-screen w-full bg-[#121214] text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#121214]/90 backdrop-blur-md">
        <div
          className={`${layoutShell} pt-4 pb-2 flex items-start justify-between gap-4`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl leading-none shrink-0" aria-hidden>
              🔥
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white tracking-tight">
                热点监控
              </h1>
              <p className="text-sm text-zinc-500 mt-0.5">AI 实时热点追踪</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? "bg-emerald-500" : "bg-zinc-600"}`}
              title={isConnected ? "已连接" : "未连接"}
            />
            <button
              type="button"
              onClick={() => void handleCollectNow()}
              disabled={collecting || refreshing || loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-45 shadow-lg shadow-violet-950/50 border border-white/10 transition-all"
            >
              <IconRefresh className="opacity-90" />
              {collecting ? "检查中…" : "立即检查"}
            </button>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing || collecting || loading}
              className="inline-flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 border border-white/[0.1] bg-[#1e1e22] hover:text-zinc-200 hover:border-white/15 disabled:opacity-45 transition-colors shrink-0"
            >
              <span className="sm:hidden">{refreshing ? "…" : "刷新"}</span>
              <span className="hidden sm:inline">
                {refreshing ? "刷新中…" : "刷新列表"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              className="relative p-2.5 rounded-xl border border-white/[0.08] bg-[#1e1e22] text-zinc-300 hover:bg-[#252528] hover:text-white transition-colors"
              aria-label="通知"
            >
              <IconBell />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {notifBadge}
                </span>
              )}
            </button>
          </div>
        </div>

        <nav className={`${layoutShell} flex gap-1 pb-3 pt-1`} role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? "bg-violet-600/90 text-white shadow-md shadow-violet-950/40"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className={`${layoutShell} py-6 pb-16`}>
        {activeTab === "dashboard" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              {[
                { label: "总热点", value: hotspots.length, color: "text-blue-400" },
                { label: "今日新增", value: todayCount, color: "text-blue-400" },
                { label: "紧急热点", value: urgentCount, color: "text-red-400" },
                {
                  label: "监控关键词",
                  value: activeKeywordCount,
                  color: "text-emerald-400",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-white/[0.06] bg-[#1e1e22] px-4 py-3"
                >
                  <p className="text-xs text-zinc-500 mb-1">{card.label}</p>
                  <p
                    className={`text-2xl font-bold font-mono-nums tabular-nums ${card.color}`}
                  >
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                <span aria-hidden>🔥</span>
                最新热点
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {(
                  [
                    { id: "all" as const, label: "全部" },
                    { id: "verified" as const, label: "已验证" },
                    { id: "urgent" as const, label: "紧急" },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      filter === id
                        ? id === "urgent"
                          ? "bg-red-500/15 border-red-500/35 text-red-200"
                          : "bg-violet-500/20 border-violet-500/35 text-violet-200"
                        : "border-transparent bg-[#1e1e22] text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <LatestHotspotsFeed hotspots={filteredHotspots} />
            </section>
          </>
        )}

        {activeTab === "keywords" && (
          <KeywordPanel
            keywords={keywords}
            onAdd={handleAddKeyword}
            onDelete={handleDeleteKeyword}
            onToggleStatus={handleToggleKeywordStatus}
            loading={loading}
          />
        )}

        {activeTab === "search" && (
          <section>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              搜索热点
            </label>
            <input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="输入关键词，搜索标题或正文…"
              className="w-full px-4 py-3 rounded-xl bg-[#1e1e22] border border-white/[0.08] text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/35 focus:border-violet-500/40 mb-6"
              autoComplete="off"
            />
            <div className="flex flex-wrap gap-2 mb-4">
              {(
                [
                  { id: "all" as const, label: "全部" },
                  { id: "verified" as const, label: "已验证" },
                  { id: "urgent" as const, label: "紧急" },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    filter === id
                      ? id === "urgent"
                        ? "bg-red-500/15 border-red-500/35 text-red-200"
                        : "bg-violet-500/20 border-violet-500/35 text-violet-200"
                      : "border-transparent bg-[#1e1e22] text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <LatestHotspotsFeed hotspots={filteredHotspots} />
          </section>
        )}
      </main>

      <NotificationDrawer
        open={notifOpen}
        notifications={notifications}
        onClose={() => setNotifOpen(false)}
        onMarkAllRead={() => {
          setNotifications([]);
          setNotifOpen(false);
        }}
      />
    </div>
  );
}

export default App;
