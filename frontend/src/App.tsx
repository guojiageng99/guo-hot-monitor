import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import KeywordPanel from "./components/KeywordPanel";
import HotspotsGrid from "./components/HotspotsGrid";
import NotificationCenter from "./components/NotificationCenter";
import "./App.css";

const API_BASE = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

function App() {
  const [keywords, setKeywords] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [isConnected, setIsConnected] = useState(false);

  // 初始化Socket.io连接
  useEffect(() => {
    const socket = io(SOCKET_URL, {
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
  const fetchKeywords = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/keywords`);
      setKeywords(res.data);
    } catch (error) {
      console.error("获取关键词失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 获取热点
  const fetchHotspots = async () => {
    try {
      const res = await axios.get(`${API_BASE}/hotspots?limit=50`);
      setHotspots(res.data);
    } catch (error) {
      console.error("获取热点失败:", error);
    }
  };

  // 初始化加载
  useEffect(() => {
    fetchKeywords();
    fetchHotspots();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-x-hidden">
      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-black/30 border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold text-lg animate-pulse">
              🔥
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              热点监控中心
            </h1>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
              ></div>
              <span className="text-purple-300">
                {isConnected ? "已连接" : "断开连接"}
              </span>
            </div>
            <div className="text-purple-300">
              关键词: {keywords.length} | 热点: {hotspots.length}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧面板 */}
          <div className="lg:col-span-1">
            <KeywordPanel
              keywords={keywords}
              onAdd={handleAddKeyword}
              onDelete={handleDeleteKeyword}
              loading={loading}
            />

            {/* 通知中心 */}
            <div className="mt-6">
              <NotificationCenter notifications={notifications.slice(0, 5)} />
            </div>
          </div>

          {/* 右侧热点展示 */}
          <div className="lg:col-span-3">
            <div className="mb-6 flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg transition-all font-medium ${
                  filter === "all"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                🌍 全部热点
              </button>
              <button
                onClick={() => setFilter("verified")}
                className={`px-4 py-2 rounded-lg transition-all font-medium ${
                  filter === "verified"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                ✅ 已验证
              </button>
            </div>

            <HotspotsGrid
              hotspots={hotspots.filter(
                (h) =>
                  filter === "all" || (filter === "verified" && h.verified),
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
