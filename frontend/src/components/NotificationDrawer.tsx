import type { FC } from "react";
import type { NotifItem } from "./NotificationSidebar";
import NotificationSidebar from "./NotificationSidebar";

interface NotificationDrawerProps {
  open: boolean;
  notifications: NotifItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

/** 全断点：点击铃铛打开；大屏为右侧浮层卡片，小屏为全高抽屉 */
const NotificationDrawer: FC<NotificationDrawerProps> = ({
  open,
  notifications,
  onClose,
  onMarkAllRead,
  onRefresh,
  refreshing,
}) => {
  if (!open) return null;

  const titleId = "notif-panel-title";

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm"
        aria-label="关闭通知"
        onClick={onClose}
      />
      <aside
        className="fixed z-[70] flex flex-col overflow-hidden bg-[#12121a] shadow-2xl
          inset-y-0 right-0 h-full w-full max-w-md border-l border-white/[0.08]
          lg:inset-auto lg:left-auto lg:right-5 lg:top-20 lg:bottom-5 lg:h-auto lg:max-h-[calc(100dvh-5.5rem)] lg:min-h-[min(480px,calc(100dvh-5.5rem))] lg:w-[min(100%,400px)] lg:rounded-2xl lg:border lg:shadow-[0_12px_48px_rgba(0,0,0,0.55)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <NotificationSidebar
          notifications={notifications}
          onMarkAllRead={onMarkAllRead}
          onClose={onClose}
          titleId={titleId}
          className="flex-1 min-h-0 lg:rounded-t-2xl"
        />

        <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] text-center lg:rounded-b-2xl bg-[#12121a]">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={refreshing}
            className="text-xs text-[#9ca3af] hover:text-[#22d3ee] disabled:opacity-40"
          >
            {refreshing ? "刷新中…" : "刷新数据"}
          </button>
        </div>
      </aside>
    </>
  );
};

export default NotificationDrawer;
