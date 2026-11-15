import React, { useState, useEffect, useCallback } from 'react';
import { alertsApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Info,
  Clock,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const NotificationsPage: React.FC = () => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await alertsApi.getNotifications();
      setNotifications(res);
    } catch (err: any) {
      toast.error('Failed to load notifications: ' + (err.message || 'Error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      setIsMarkingRead(true);
      await alertsApi.markAllNotificationsRead();
      toast.success('All notifications marked as read.');
      loadNotifications();
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark notifications read');
    } finally {
      setIsMarkingRead(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-8 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="elder-card p-6 sm:p-8 bg-gradient-to-r from-teal-900 to-teal-850 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-teal-300">
            CareCircle Activity Center
          </span>
          <h1 className="text-3xl sm:text-5xl font-black mt-1">
            {t('notifications')}
          </h1>
          <p className="text-lg font-bold text-teal-100 mt-1">
            Dose reminders, health check updates, and clinical alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={isMarkingRead}
              onClick={handleMarkAllRead}
              aria-label="Mark all notifications as read"
              className="px-5 py-3 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white font-black text-sm sm:text-base flex items-center gap-2 border-2 border-teal-500 shadow-md touch-target transition-all disabled:opacity-60"
            >
              {isMarkingRead ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCheck className="w-5 h-5 text-teal-200" />
              )}
              <span>Mark all as read</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadNotifications}
            aria-label="Refresh notifications"
            className="w-12 h-12 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white flex items-center justify-center border border-teal-600 transition-colors touch-target"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <section aria-labelledby="notifications-list-heading">
        <h2 id="notifications-list-heading" className="sr-only">
          Recent Notifications
        </h2>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-warm-800">
            <Loader2 className="w-12 h-12 animate-spin text-teal-800" />
            <p className="text-2xl font-black">{t('loading')}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="elder-card p-12 text-center text-warm-700">
            <Bell className="w-16 h-16 mx-auto mb-4 text-warm-400" />
            <h3 className="text-2xl sm:text-3xl font-black text-teal-950">
              No Notifications Yet
            </h3>
            <p className="text-base sm:text-lg font-bold text-warm-700 mt-2 max-w-md mx-auto">
              You are all caught up! When you have dose reminders, appointments, or alerts, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3" aria-live="polite">
            {notifications.map((n) => {
              const isUnread = !n.is_read;
              const isCritical = n.severity === 'critical' || n.title?.toLowerCase().includes('emergency') || n.title?.toLowerCase().includes('sos');

              return (
                <div
                  key={n.id}
                  className={`elder-card p-5 sm:p-6 transition-all flex items-start gap-4 ${
                    isUnread
                      ? 'border-2 border-teal-600 bg-teal-50/40 shadow-md ring-2 ring-teal-600/10'
                      : 'border-2 border-warm-200 bg-white'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isCritical
                        ? 'bg-red-100 text-red-700'
                        : isUnread
                        ? 'bg-teal-100 text-teal-900'
                        : 'bg-warm-100 text-warm-700'
                    }`}
                  >
                    {isCritical ? (
                      <ShieldAlert className="w-7 h-7" />
                    ) : isUnread ? (
                      <Bell className="w-7 h-7" />
                    ) : (
                      <Info className="w-7 h-7" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl sm:text-2xl font-black text-teal-950 truncate">
                          {n.title}
                        </h3>
                        {isUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" />
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-warm-600 flex items-center gap-1 shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(n.created_at).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-base sm:text-lg font-bold text-warm-900 leading-snug">
                      {n.body || n.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
