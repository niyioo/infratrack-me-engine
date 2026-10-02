import { useState } from "react";
import { CivitnessLogo } from "@/components/brand/CivitnessLogo";
import { clearAuthStorage } from "@/features/auth/store";
import { useAuth } from "@/features/auth/hooks";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount
} from "@/features/notifications/hooks";

export function Topbar() {
  const { user } = useAuth();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationsQuery = useNotifications({ channel: "IN_APP", page: 1, page_size: 8 });
  const { data: unreadMeta } = useUnreadNotificationCount();
  const markNotificationRead = useMarkNotificationRead();
  const markAllNotificationsRead = useMarkAllNotificationsRead();
  const notifications = notificationsQuery.data?.items ?? [];

  function handleLogout() {
    clearAuthStorage();
    window.location.href = "/login";
  }

  return (
    <header className="flex items-center justify-between border-b border-brand/10 bg-white/95 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-4">
        <CivitnessLogo showWordmark={false} size={32} />
        <div>
          <h2 className="text-base font-semibold text-slate-900">Operations Dashboard</h2>
          <p className="text-sm text-slate-500">Geo-verified project monitoring and funding control</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationOpen((current) => !current)}
            className="relative rounded-lg border border-brand/15 bg-brand-soft/50 px-3 py-2 text-sm text-brand-strong"
          >
            Alerts
            {(unreadMeta?.count ?? 0) > 0 ? (
              <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs text-white">
                {unreadMeta?.count}
              </span>
            ) : null}
          </button>

          {isNotificationOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-[360px] rounded-xl border border-brand/10 bg-white p-4 shadow-brand">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <p className="text-xs text-slate-500">Recent in-app alerts for your projects.</p>
                </div>
                <button
                  type="button"
                  onClick={() => markAllNotificationsRead.mutate()}
                  className="text-xs font-medium text-accent"
                >
                  Mark all read
                </button>
              </div>

              <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => {
                        if (!notification.is_read) {
                          markNotificationRead.mutate(notification.id);
                        }
                      }}
                      className={`block w-full rounded-xl border px-4 py-3 text-left ${
                        notification.is_read ? "border-slate-200 bg-white" : "border-accent/20 bg-accent-soft"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                        {!notification.is_read ? (
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                      <p className="mt-2 text-xs text-slate-500">{notification.created_at}</p>
                    </button>
                  ))
                ) : (
                  <p className="rounded-xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
                    No notifications yet.
                  </p>
                )}
              </div>
              {notificationsQuery.data?.next ? (
                <p className="mt-3 text-xs text-slate-500">
                  Showing the latest 8 notifications. Use the unread badge count to track older items.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{user?.full_name}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-brand/15 px-3 py-2 text-sm text-brand-strong hover:bg-brand-soft"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
