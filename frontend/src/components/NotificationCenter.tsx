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
    <div className="space-y-3">
      {notifications.length > 0 && (
        <div className="flex justify-end">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-200 border border-violet-500/20">
            共 {notifications.length} 条
          </span>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <p className="text-3xl mb-2 opacity-80">📭</p>
          <p className="text-sm">暂无推送，匹配关键词的新热点会出现在这里</p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {notifications.map((notif, index) => (
            <li
              key={index}
              className="p-3 rounded-xl bg-slate-800/50 border border-slate-600/25 hover:border-violet-500/35 transition-colors animate-in fade-in slide-in-from-right-2"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <p className="text-sm font-medium text-slate-100 line-clamp-2 leading-snug">
                {notif.hotspot?.title}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>
                  关键词{" "}
                  <span className="text-violet-300 font-medium">
                    {notif.keyword?.keyword}
                  </span>
                </span>
                <span className="text-slate-600">·</span>
                <span>{notif.hotspot?.source}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationCenter;
