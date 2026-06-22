import React, { useState } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  Home,
  Building2,
  Users,
  DollarSign,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  CreditCard,
  BarChart3,
  Moon,
  Sun,
  Activity,
  Bell
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme.mode === 'dark';

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
      setIsLoggingOut(false);
    } finally {
      setShowLogoutConfirm(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const isAdmin = user?.role_id === 1;

  const navigation = isAdmin
    ? [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Hostels', href: '/hostels', icon: Building2 },
        { name: 'Owners', href: '/owners', icon: Users },
        { name: 'Activity Logs', href: '/activity-logs', icon: Activity },
        { name: 'Reports', href: '/reports', icon: FileText },
        { name: 'Settings', href: '/settings', icon: Settings },
      ]
    : [
        { name: 'Dashboard', href: '/owner/dashboard', icon: Home },
        { name: 'Rooms', href: '/owner/rooms', icon: Building2 },
        { name: 'Students', href: '/owner/students', icon: Users },
        { name: 'Monthly Fees', href: '/owner/monthly-fees', icon: DollarSign },
        { name: 'Collections', href: '/owner/collections', icon: CreditCard },
        { name: 'Incomes', href: '/owner/income', icon: TrendingUp },
        { name: 'Expenses', href: '/owner/expenses', icon: FileText },
        { name: 'Overview', href: '/owner/overview', icon: BarChart3 },
        { name: 'Reports', href: '/owner/reports', icon: FileText },
        { name: 'Settings', href: '/owner/settings', icon: Settings },
      ];

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('hostels')) return 'Hostels';
    if (path.includes('owners')) return 'Owners';
    if (path.includes('activity-logs')) return 'Activity Logs';
    if (path.includes('rooms')) return 'Rooms';
    if (path.includes('students')) return 'Students';
    if (path.includes('monthly-fees')) return 'Monthly Fees';
    if (path.includes('income')) return 'Income';
    if (path.includes('expenses')) return 'Expenses';
    if (path.includes('collections')) return 'Collections';
    if (path.includes('overview')) return 'Financial Overview';
    if (path.includes('reports')) return 'Reports';
    if (path.includes('settings')) return 'Settings';
    if (path.includes('profile')) return 'Profile';
    return 'Dashboard';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed on desktop, slide-in on mobile */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-0 shadow-sm",
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 relative">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/10">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              HMS
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  "flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 group border-l-4",
                  isActive
                    ? "bg-cyan-50/80 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 border-cyan-500 rounded-r-xl"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"
                )}
              >
                <item.icon className={clsx(
                  "h-5 w-5 mr-3 transition-colors duration-200",
                  isActive ? "text-cyan-500" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                )} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions - Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleLogoutClick}
            className="flex items-center w-full px-4 py-3 text-sm font-semibold rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 dark:text-rose-400 transition-all duration-200"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top bar - Header */}
        <header className="h-20 flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-10">
          <div className="h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none"
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Application Brand / Title in Header */}
              <div className="flex items-center gap-2">
                <span className="text-cyan-500 font-bold text-lg hidden sm:inline">★</span>
                <h1 className="text-md sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Hostel Administrator System</span>
                  <span className="text-slate-300 dark:text-slate-700 hidden md:inline">|</span>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs sm:text-sm hidden md:inline">
                    {getPageTitle()}
                  </span>
                </h1>
              </div>
            </div>

            {/* Right side - Theme, Notifications, Avatar */}
            <div className="flex items-center gap-3">
              {/* Dark/Light mode toggle in Header */}
              <button
                onClick={toggleTheme}
                className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-all duration-200"
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5 text-amber-400 animate-spin-slow" />
                ) : (
                  <Moon className="h-5 w-5 text-indigo-500" />
                )}
              </button>

              {/* Notification bell */}
              <button className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-all duration-200 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              </button>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>

              {/* User Profile Info & Avatar */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30 rounded-2xl p-1 pr-3.5 transition-colors duration-200">
                <button
                  onClick={() => navigate(isAdmin ? '/profile' : '/owner/profile')}
                  className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-sm flex items-center justify-center hover:scale-105 transition-all group"
                >
                  <span className="text-xs font-bold text-white uppercase">{user?.full_name?.charAt(0)}</span>
                </button>

                <div className="hidden sm:flex flex-col items-start min-w-[80px]">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight truncate w-full">{user?.full_name}</p>
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-y-auto relative">
          {/* Subtle background pattern/gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent dark:from-cyan-500/5 dark:via-transparent dark:to-transparent pointer-events-none" />
          
          <div className="p-4 sm:p-6 lg:p-8 w-full relative z-10 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-slide-up">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                  <LogOut className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Confirm Logout</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Please confirm your action</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              <p className="text-slate-700 dark:text-slate-300">
                Are you sure you want to log out of your session? You will need to log in again to access the dashboard.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleLogoutCancel}
                disabled={isLoggingOut}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogoutConfirm}
                disabled={isLoggingOut}
                className="px-5 py-2.5 text-sm font-medium text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-sm shadow-rose-500/20 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoggingOut ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Logging out...
                  </>
                ) : (
                  'Logout'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
