import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, X, Loader2, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { alertsApi } from '../../services/api';
import toast from 'react-hot-toast';

interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  body: string;
  channel: string;
  read: number;
  created_at: string;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshUnread: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onRefreshUnread,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await alertsApi.getNotifications();
      setNotifications(res);
    } catch (err) {
      console.warn('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await alertsApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
      onRefreshUnread();
      toast.success('All notifications marked as read');
    } catch (err: any) {
      toast.error('Failed to mark read');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-title"
      className="fixed inset-0 z-50 bg-teal-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white rounded-3xl border-4 border-teal-600 shadow-2xl max-w-lg w-full p-6 sm:p-8 relative max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b-2 border-warm-200 pb-4 mb-4">
          <div className="flex items-center gap-2 text-teal-950 font-black text-2xl">
            <Bell className="w-7 h-7 text-teal-850" />
            <h2 id="notif-title">Notifications</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="p-2 rounded-xl text-warm-700 hover:bg-warm-100"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-teal-900 font-bold">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-warm-700 font-bold text-lg">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border-2 transition-colors ${
                  n.read === 0
                    ? 'bg-teal-50 border-teal-300 shadow-sm'
                    : 'bg-warm-50 border-warm-200 text-warm-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-black text-lg text-teal-950">{n.title}</h3>
                  {n.read === 0 && (
                    <span className="text-xs font-black uppercase tracking-wider bg-teal-800 text-white px-2 py-0.5 rounded-full">
                      New
                    </span>
                  )}
                </div>
                <p className="text-base font-semibold text-warm-900 leading-snug">
                  {n.body}
                </p>
                <div className="mt-2 text-xs font-bold text-warm-600">
                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>

        {notifications.some((n) => n.read === 0) && (
          <div className="pt-4 mt-2 border-t-2 border-warm-200">
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-teal-900 hover:bg-teal-850 text-white font-black text-lg flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <CheckCheck className="w-5 h-5" />
              <span>Mark all as read</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
