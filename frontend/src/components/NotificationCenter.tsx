import type { FC } from "react";

interface Notification {
  hotspot?: {
    id: number;
    title: string;
    source: string;
  };
  keyword?: {
    keyword: string;
  };
}

interface NotificationCenterProps {
  notifications: Notification[];
}

const NotificationCenter: FC<NotificationCenterProps> = ({ notifications }) => {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-purple-500/20 backdrop-blur">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="text-2xl animate-bounce">🔔</span>
        <span>最新通知</span>
        {notifications.length > 0 && (
          <span className="ml-auto text-sm px-2 py-1 bg-red-500/30 text-red-300 rounded-full font-medium">
            {notifications.length}
          </span>
        )}
      </h3>

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm">暂无新通知</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {notifications.map((notif, index) => (
            <div
              key={index}
              className="p-3 bg-slate-700/40 rounded-lg border border-slate-600/20 hover:border-green-500/50 transition-all animate-in fade-in slide-in-from-right-2"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-sm font-medium text-green-400 flex items-start gap-2">
                <span className="text-lg mt-0.5">✨</span>
                <div className="flex-1">
                  <div className="line-clamp-1">{notif.hotspot?.title}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    匹配关键词:{" "}
                    <span className="text-purple-300">
                      {notif.keyword?.keyword}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    来源: {notif.hotspot?.source}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
