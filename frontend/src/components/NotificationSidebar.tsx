import type { FC } from "react";

export interface NotifItem {
  hotspot?: {
    id: number;
    title: string;
    content?: string;
    source?: string;
  };
  keyword?: { keyword: string };
}

interface NotificationSidebarProps {
  notifications: NotifItem[];
  onMarkAllRead: () => void;
  className?: string;
  /** 供抽屉/浮层内使用，避免与页面其他元素 id 冲突 */
  titleId?: string;
  /** 浮层模式：显示关闭按钮 */
  onClose?: () => void;
}

const NotificationSidebar: FC<NotificationSidebarProps> = ({
  notifications,
  onMarkAllRead,
  className = "",
  titleId,
  onClose,
}) => {
  return (
    <div
      className={`flex flex-col min-h-0 h-full bg-[#12121a] ${className}`}
    >
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-4 border-b border-white/[0.06]">
        <h2
          id={titleId}
          className="text-base font-semibold text-white tracking-tight"
        >
          通知
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-xs font-medium text-[#7c4dff] hover:text-[#9f7dff] transition-colors"
          >
            全部已读
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-sm px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition-colors"
              aria-label="关闭"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {notifications.length === 0 ? (
          <p className="text-center text-sm text-[#9ca3af] py-16 px-2">
            暂无通知
            <br />
            <span className="text-xs mt-2 block opacity-70">
              匹配关键词的新热点会出现在这里
            </span>
          </p>
        ) : (
          notifications.map((n, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/[0.06] bg-[#16161e] p-3.5 text-sm shadow-sm"
            >
              <p className="font-medium text-[#a78bfa] leading-snug line-clamp-2">
                发现新热点: {n.hotspot?.title}
              </p>
              <p className="mt-2 text-[#9ca3af] text-xs leading-relaxed line-clamp-3">
                {n.hotspot?.content?.slice(0, 140) ||
                  `匹配关键词：${n.keyword?.keyword ?? ""}`}
              </p>
              <p className="mt-2 text-[11px] text-zinc-600">
                {n.hotspot?.source}
                {n.keyword?.keyword ? ` · ${n.keyword.keyword}` : ""}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationSidebar;
