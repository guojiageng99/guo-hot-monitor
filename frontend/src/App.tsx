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

function isUrgentHotspot(h: {
  importance?: string;
  relevanceScore?: number;
}): boolean {
  return (
    h.importance === "urgent" ||
    h.importance === "high" ||
    (h.relevanceScore ?? 0) >= 80
  );
}

function KpiCards({
  total,
  today,
  urgent,
}: {
  total: number;
  today: number;
  urgent: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div className="rounded-xl border border-white/[0.06] bg-[#16161e] px-5 py-4 shadow-sm">
        <p className="text-xs font-medium text-[#9ca3af] uppercase tracking-wider mb-1">
          总热点
        </p>
        <p className="text-3xl font-bold font-mono-nums tabular-nums text-[#a855f7]">
          {total}
        </p>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-[#16161e] px-5 py-4 shadow-sm">
        <p className="text-xs font-medium text-[#9ca3af] uppercase tracking-wider mb-1">
          今日新增
        </p>
        <p className="text-3xl font-bold font-mono-nums tabular-nums text-[#22d3ee]">
          {today}
        </p>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-[#16161e] px-5 py-4 shadow-sm">
        <p className="text-xs font-medium text-[#9ca3af] uppercase tracking-wider mb-1">
          紧急热点
        </p>
        <p className="text-3xl font-bold font-mono-nums tabular-nums text-[#f97316]">
          {urgent}
        </p>
      </div>
    </div>
  );
}

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
  const urgentCount = hotspots.filter(isUrgentHotspot).length;

  const filteredHotspots = useMemo(
    () =>
      hotspots.filter((h) => {
        if (filter === "all") return true;
        if (filter === "verified") return h.verified;
        if (filter === "urgent") return isUrgentHotspot(h);
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

  const markAllRead = () => {
    setNotifications([]);
  };

  const padX = "px-4 sm:px-6 lg:px-8 xl:px-10";

  return (
    <div className="min-h-screen w-full flex flex-col bg-transparent text-white">
      <header className="shrink-0 z-50 border-b border-white/[0.06] bg-[#0b0914]/90 backdrop-blur-md">
        <div
          className={`${padX} pt-4 pb-5 flex flex-wrap items-center justify-between gap-4`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-11 w-11 shrink-0 rounded-xl bg-[#7c4dff]/15 ring-1 ring-[#7c4dff]/35 flex items-center justify-center text-xl shadow-[0_0_24px_rgba(124,77,255,0.15)]"
              aria-hidden
            >
              🔥
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white tracking-tight">
                热点监控
              </h1>
              <p
                className={`text-sm mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ${isConnected ? "text-emerald-400" : "text-[#9ca3af]"}`}
                title={isConnected ? "实时通道已连接" : "未连接"}
              >
                <span>AI 实时热点追踪，监控关键词</span>
                <span
                  className={`font-semibold font-mono-nums tabular-nums ${isConnected ? "text-emerald-200" : "text-[#22d3ee]"}`}
                >
                  {activeKeywordCount}
                </span>
                <span className={isConnected ? "text-emerald-400/70" : "text-[#9ca3af]"}>
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-zinc-600"}`}
                  />
                  {isConnected ? "已连接" : "离线"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleCollectNow()}
              disabled={collecting || refreshing || loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#7c4dff] hover:bg-[#6d3ef0] disabled:opacity-45 shadow-[0_4px_24px_rgba(124,77,255,0.35)] border border-[#8f5fff]/30 transition-colors"
            >
              <IconRefresh className="opacity-95 w-[18px] h-[18px]" />
              {collecting ? "检查中…" : "立即检查"}
            </button>
            <button
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              aria-expanded={notifOpen}
              className={`relative p-2.5 rounded-xl border bg-[#16161e] transition-colors ${
                notifOpen
                  ? "border-[#7c4dff]/45 text-white shadow-[0_0_20px_rgba(124,77,255,0.2)]"
                  : "border-white/[0.08] text-[#9ca3af] hover:text-white hover:border-[#7c4dff]/30"
              }`}
              aria-label="通知"
            >
              <IconBell className="w-[22px] h-[22px]" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow-lg">
                  {notifBadge}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <nav
            className={`shrink-0 ${padX} flex gap-2 pt-4 pb-3 border-b border-white/[0.06] bg-[#0b0914]/80`}
            role="tablist"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 text-sm rounded-lg transition-all ${
                  activeTab === t.id
                    ? "font-semibold text-white bg-[#7c4dff]/22 ring-2 ring-[#7c4dff]/55 shadow-[0_0_28px_rgba(124,77,255,0.22)]"
                    : "font-medium text-[#6b7280] hover:text-zinc-200 hover:bg-white/[0.05]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <main className={`flex-1 min-h-0 overflow-y-auto ${padX} py-6 pb-10`}>
            {activeTab === "dashboard" && (
              <>
                <KpiCards
                  total={hotspots.length}
                  today={todayCount}
                  urgent={urgentCount}
                />

                <section>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                    <span aria-hidden className="text-xl">
                      🔥
                    </span>
                    最新热点
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mb-5">
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
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          filter === id
                            ? id === "urgent"
                              ? "bg-orange-500/15 border-orange-400/35 text-orange-200"
                              : "bg-[#7c4dff]/20 border-[#7c4dff]/40 text-[#c4b5fd]"
                            : "border-transparent bg-[#16161e] text-[#9ca3af] hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => void handleRefresh()}
                      disabled={refreshing || collecting}
                      className="ml-auto text-xs text-[#9ca3af] hover:text-[#00e5ff] disabled:opacity-40"
                    >
                      {refreshing ? "刷新中…" : "刷新列表"}
                    </button>
                  </div>
                  <LatestHotspotsFeed hotspots={filteredHotspots} />
                </section>
              </>
            )}

            {activeTab === "keywords" && (
              <div className="max-w-3xl">
                <KeywordPanel
                  keywords={keywords}
                  onAdd={handleAddKeyword}
                  onDelete={handleDeleteKeyword}
                  onToggleStatus={handleToggleKeywordStatus}
                  loading={loading}
                />
                <p className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => void handleRefresh()}
                    disabled={refreshing}
                    className="text-sm text-[#7c4dff] hover:text-[#9f7dff] disabled:opacity-40"
                  >
                    {refreshing ? "刷新中…" : "刷新列表"}
                  </button>
                </p>
              </div>
            )}

            {activeTab === "search" && (
              <>
                <KpiCards
                  total={hotspots.length}
                  today={todayCount}
                  urgent={urgentCount}
                />
                <section>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                    <span aria-hidden className="text-xl">
                      🔥
                    </span>
                    最新热点
                  </h2>
                  <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                    搜索热点
                  </label>
                  <input
                    type="search"
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    placeholder="输入关键词，搜索标题或正文…"
                    className="w-full px-4 py-3 rounded-xl bg-[#16161e] border border-white/[0.08] text-white placeholder-[#6b7280] text-sm focus:outline-none focus:ring-2 focus:ring-[#7c4dff]/40 focus:border-[#7c4dff]/50 mb-5"
                    autoComplete="off"
                  />
                  <div className="flex flex-wrap items-center gap-2 mb-5">
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
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          filter === id
                            ? id === "urgent"
                              ? "bg-orange-500/15 border-orange-400/35 text-orange-200"
                              : "bg-[#7c4dff]/20 border-[#7c4dff]/40 text-[#c4b5fd]"
                            : "border-transparent bg-[#16161e] text-[#9ca3af] hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => void handleRefresh()}
                      disabled={refreshing || collecting}
                      className="ml-auto text-xs text-[#9ca3af] hover:text-[#00e5ff] disabled:opacity-40"
                    >
                      {refreshing ? "刷新中…" : "刷新列表"}
                    </button>
                  </div>
                  <LatestHotspotsFeed hotspots={filteredHotspots} />
                </section>
              </>
            )}
          </main>
        </div>
      </div>

      <NotificationDrawer
        open={notifOpen}
        notifications={notifications}
        onClose={() => setNotifOpen(false)}
        onMarkAllRead={markAllRead}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
    </div>
  );
}

export default App;
