import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, ArrowLeft, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { NotificationItem } from '../../types/api';
import { api } from '../../services/api';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsRead();
      loadData();
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-sand/20 dark:bg-ink py-8 px-4 sm:px-6 lg:px-8 text-ink dark:text-paper pb-20">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          to="/home"
          className="inline-flex items-center gap-2 text-sm font-semibold text-teal dark:text-mint hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">Notifications</h1>
            <p className="text-sm text-ink/70 dark:text-sand/70">
              Reminders, family updates, and medication logs.
            </p>
          </div>
          {notifications.length > 0 && (
            <Button size="sm" variant="secondary" onClick={handleMarkAllRead}>
              <CheckCheck className="w-4 h-4 mr-1" />
              <span>Mark all as read</span>
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <Card className="p-8 text-center text-ink/60">No notifications at this time.</Card>
          ) : (
            notifications.map((n) => (
              <Card
                key={n.id}
                className={`p-5 space-y-2 border transition-all ${
                  !n.is_read
                    ? 'border-teal bg-paper dark:bg-teal-950/60 shadow-sm'
                    : 'border-sand dark:border-teal-900/60 bg-sand/20 dark:bg-ink/30 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-base text-ink dark:text-paper">
                      {n.title}
                    </span>
                    {n.severity && (
                      <Badge variant={n.severity === 'critical' ? 'clay' : n.severity === 'high' ? 'amber' : 'teal'}>
                        {n.severity}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-ink/50 dark:text-sand/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-ink/80 dark:text-sand/80">{n.message}</p>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
