import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { alertsApi } from '../../services/api';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import {
  Heart,
  LogOut,
  User as UserIcon,
  Bell,
  Home,
  Activity,
  Calendar,
  Users,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, getDashboardPath } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const notifs = await alertsApi.getNotifications();
        const count = notifs.filter((n) => !n.is_read).length;
        setUnreadCount(count);
      } catch {
        // ignore background poll errors
      }
    };

    fetchUnread();
    const timer = setInterval(fetchUnread, 20000);
    return () => clearInterval(timer);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const homeLink = user ? getDashboardPath() : '/';

  return (
    <header className="bg-white border-b-2 border-warm-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <Link
          to={homeLink}
          aria-label="CareCircle home page"
          className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-teal-700 rounded-xl p-1"
        >
          <div className="w-12 h-12 rounded-2xl bg-teal-900 flex items-center justify-center text-rose-400 shadow-md">
            <Heart className="w-7 h-7 fill-rose-500 text-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-teal-950 tracking-tight">CareCircle</span>
              {user && (
                <span className="text-xs font-bold uppercase tracking-wider bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full border border-teal-300">
                  {user.role}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-semibold text-warm-800 hidden sm:block">
              {t('tagline')}
            </p>
          </div>
        </Link>

        {/* Center Nav Links (for authenticated users) */}
        {user && (
          <nav aria-label="Main Navigation" className="flex items-center gap-1 sm:gap-2">
            {user.role === 'patient' && (
              <>
                <Link
                  to="/home"
                  aria-label="Home Dashboard"
                  className={`px-3 py-2 rounded-xl font-bold text-sm sm:text-base flex items-center gap-1.5 transition-colors ${
                    location.pathname === '/home'
                      ? 'bg-teal-100 text-teal-950 font-black'
                      : 'text-warm-800 hover:bg-warm-100'
                  }`}
                >
                  <Home className="w-4 h-4 text-teal-800" />
                  <span className="hidden md:inline">{t('home')}</span>
                </Link>

                <Link
                  to="/me/lifestyle"
                  aria-label="Daily Lifestyle Plan"
                  className={`px-3 py-2 rounded-xl font-bold text-sm sm:text-base flex items-center gap-1.5 transition-colors ${
                    location.pathname.startsWith('/me/lifestyle')
                      ? 'bg-teal-100 text-teal-950 font-black'
                      : 'text-warm-800 hover:bg-warm-100'
                  }`}
                >
                  <Activity className="w-4 h-4 text-teal-800" />
                  <span className="hidden md:inline">{t('lifestyle')}</span>
                </Link>

                <Link
                  to="/appointments"
                  aria-label="Scheduled Appointments"
                  className={`px-3 py-2 rounded-xl font-bold text-sm sm:text-base flex items-center gap-1.5 transition-colors ${
                    location.pathname.startsWith('/appointments')
                      ? 'bg-teal-100 text-teal-950 font-black'
                      : 'text-warm-800 hover:bg-warm-100'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-teal-800" />
                  <span className="hidden md:inline">{t('appointments')}</span>
                </Link>

                <Link
                  to="/people"
                  aria-label="Manage Care Circle"
                  className={`px-3 py-2 rounded-xl font-bold text-sm sm:text-base flex items-center gap-1.5 transition-colors ${
                    location.pathname.startsWith('/people')
                      ? 'bg-teal-100 text-teal-950 font-black'
                      : 'text-warm-800 hover:bg-warm-100'
                  }`}
                >
                  <Users className="w-4 h-4 text-teal-800" />
                  <span className="hidden md:inline">{t('people')}</span>
                </Link>
              </>
            )}

            {user.role === 'relative' && (
              <Link
                to="/family"
                aria-label="Family Dashboard"
                className={`px-3 py-2 rounded-xl font-bold text-sm sm:text-base flex items-center gap-1.5 transition-colors ${
                  location.pathname === '/family'
                    ? 'bg-teal-100 text-teal-950 font-black'
                    : 'text-warm-800 hover:bg-warm-100'
                }`}
              >
                <Users className="w-4 h-4 text-teal-800" />
                <span>Family Dashboard</span>
              </Link>
            )}

            {user.role === 'doctor' && (
              <Link
                to="/doctor"
                aria-label="Doctor Clinical Dashboard"
                className={`px-3 py-2 rounded-xl font-bold text-sm sm:text-base flex items-center gap-1.5 transition-colors ${
                  location.pathname === '/doctor'
                    ? 'bg-teal-100 text-teal-950 font-black'
                    : 'text-warm-800 hover:bg-warm-100'
                }`}
              >
                <Activity className="w-4 h-4 text-teal-800" />
                <span>Clinical Roster</span>
              </Link>
            )}
          </nav>
        )}

        {/* Controls: Language, Notifications Bell + Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher compact />

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notification Bell */}
              <Link
                to="/notifications"
                aria-label={`View notifications (${unreadCount} unread)`}
                className="relative min-h-[48px] min-w-[48px] p-2.5 rounded-xl bg-warm-100 hover:bg-teal-100 text-warm-900 flex items-center justify-center transition-colors border border-warm-300"
              >
                <Bell className="w-5 h-5 text-teal-950" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center border-2 border-white animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out of CareCircle"
                className="min-h-[48px] px-3.5 py-2 rounded-xl bg-warm-100 hover:bg-warm-200 border-2 border-warm-300 text-warm-900 font-bold flex items-center gap-2 text-base transition-colors"
              >
                <LogOut className="w-5 h-5 text-warm-800" />
                <span className="hidden sm:inline">{t('signOut')}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                aria-label="Sign in"
                className="min-h-[48px] px-4 py-2 rounded-xl bg-teal-900 text-white hover:bg-teal-850 font-bold text-base transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <UserIcon className="w-5 h-5" />
                <span>{t('signIn')}</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
