import type { FC } from "react";

interface NotifItem {
  hotspot?: {
    id: number;
    title: string;
    content?: string;
    source?: string;
  };
  keyword?: { keyword: string };
}

interface NotificationDrawerProps {
  open: boolean;
  notifications: NotifItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
}

const NotificationDrawer: FC<NotificationDrawerProps> = ({
  open,
  notifications,
  onClose,
  onMarkAllRead,
}) => {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm"
        aria-label="关闭通知"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-[70] h-full w-full max-w-md border-l border-white/[0.08] bg-[#161618] shadow-2xl flex flex-col animate-in slide-in-from-right-2 fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-drawer-title"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.06]">
          <h2
            id="notif-drawer-title"
            className="text-base font-semibold text-white"
          >
            通知
          </h2>
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-xs font-medium text-violet-400 hover:text-violet-300"
          >
            全部已读
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 py-12">暂无通知</p>
          ) : (
            notifications.map((n, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/[0.06] bg-[#1e1e22] p-3 text-sm"
              >
                <p className="font-medium text-violet-300/95 leading-snug">
                  发现新热点: {n.hotspot?.title}
                </p>
                <p className="mt-2 text-zinc-500 text-xs line-clamp-2">
                  {n.hotspot?.content?.slice(0, 120) ||
                    `匹配关键词：${n.keyword?.keyword ?? ""}`}
                </p>
                <p className="mt-1.5 text-[11px] text-zinc-600">
                  {n.hotspot?.source}
                  {n.keyword?.keyword ? ` · ${n.keyword.keyword}` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
};

export default NotificationDrawer;
