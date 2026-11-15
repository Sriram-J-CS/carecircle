import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Heart, Sun, Moon, Globe, LogOut, Bell, User as UserIcon } from 'lucide-react';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'patient') return '/home';
    if (user.role === 'relative') return '/family';
    if (user.role === 'doctor') return '/doctor';
    return '/';
  };

  return (
    <header className="sticky top-0 z-40 bg-paper/90 dark:bg-ink/90 backdrop-blur-md border-b border-sand dark:border-teal-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand */}
        <Link to={getDashboardLink()} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-teal dark:bg-teal-700 flex items-center justify-center text-paper shadow-sm group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5 fill-mint text-mint" />
          </div>
          <div>
            <span className="font-serif font-bold text-2xl text-ink dark:text-paper tracking-tight">
              CareCircle
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-sans text-teal dark:text-mint font-medium px-2 py-0.5 rounded-full bg-mint/50 dark:bg-teal-900">
              India
            </span>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Language Switcher */}
          <div className="relative flex items-center bg-sand/50 dark:bg-teal-900/40 rounded-full p-1 border border-sand dark:border-teal-800">
            <Globe className="w-4 h-4 ml-2 mr-1 text-ink/60 dark:text-sand/60" />
            {(['en', 'ta', 'hi'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                  language === lang
                    ? 'bg-teal text-white shadow-sm'
                    : 'text-ink/70 dark:text-sand/70 hover:text-ink'
                }`}
                aria-label={`Switch language to ${lang.toUpperCase()}`}
              >
                {lang === 'en' ? 'EN' : lang === 'ta' ? 'தமிழ்' : 'हिंदी'}
              </button>
            ))}
          </div>

          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full text-ink/70 dark:text-sand/70 hover:bg-sand/60 dark:hover:bg-teal-900/50 transition-colors"
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User Section */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link
                to={user.role === 'patient' ? '/me/notifications' : '#'}
                className="p-2.5 rounded-full text-ink/70 dark:text-sand/70 hover:bg-sand/60 dark:hover:bg-teal-900/50 relative transition-colors"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
              </Link>

              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-ink dark:text-paper">{user.name}</span>
                <span className="text-xs text-ink/60 dark:text-sand/60 capitalize font-medium">
                  {user.role}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-clay hover:bg-clay/10 dark:text-clay/90"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">{t('sign_out')}</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                {t('sign_in')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                {t('register')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
