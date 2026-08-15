import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
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
  Bell,
  LayoutDashboard,
  Building,
  UserCheck,
  History,
  FileSpreadsheet,
  User,
  AlertTriangle,
  Mail
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import hostixLogo from '../../assets/HostixNew.jpeg';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme.mode === 'dark';

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  useEffect(() => {
    const handleSubscriptionExpired = () => setIsSubscriptionExpired(true);
    window.addEventListener('subscriptionExpired', handleSubscriptionExpired);
    return () => window.removeEventListener('subscriptionExpired', handleSubscriptionExpired);
  }, []);

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
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, badge: { text: 'Live', type: 'pulse' } },
        { name: 'Hostels', href: '/hostels', icon: Building, badge: { text: '3', type: 'count' } },
        { name: 'Owners', href: '/owners', icon: UserCheck, badge: { text: 'New', type: 'info' } },
        { name: 'Activity Logs', href: '/activity-logs', icon: History, badge: { text: 'Sync', type: 'pulse-blue' } },
        { name: 'System Logs', href: '/system-logs', icon: Mail },
        { name: 'Reports', href: '/reports', icon: FileSpreadsheet, badge: { text: 'Excel', type: 'excel' } },
      ]
    : [
        { name: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard, badge: { text: 'Live', type: 'pulse' } },
        { name: 'Rooms', href: '/owner/rooms', icon: Building, badge: { text: '56', type: 'count' } },
        { name: 'Students', href: '/owner/students', icon: Users, badge: { text: '120', type: 'count' } },
        { name: 'Monthly Fees', href: '/owner/monthly-fees', icon: DollarSign, badge: { text: 'Due', type: 'warning' } },
        { name: 'Collections', href: '/owner/collections', icon: CreditCard },
        { name: 'Incomes', href: '/owner/income', icon: TrendingUp },
        { name: 'Expenses', href: '/owner/expenses', icon: FileText },
        { name: 'Overview', href: '/owner/overview', icon: BarChart3 },
        { name: 'Reports', href: '/owner/reports', icon: FileSpreadsheet, badge: { text: 'Excel', type: 'excel' } },
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

  const renderBadge = (badge?: { text: string; type: string }) => {
    if (!badge) return null;
    switch (badge.type) {
      case 'pulse':
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 ml-auto uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {badge.text}
          </span>
        );
      case 'pulse-blue':
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 ml-auto uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            {badge.text}
          </span>
        );
      case 'count':
        return (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50 ml-auto min-w-[20px] text-center">
            {badge.text}
          </span>
        );
      case 'info':
        return (
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/30 ml-auto uppercase tracking-wider">
            {badge.text}
          </span>
        );
      case 'warning':
        return (
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 ml-auto uppercase tracking-wider">
            {badge.text}
          </span>
        );
      case 'excel':
        return (
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 ml-auto uppercase tracking-wider">
            {badge.text}
          </span>
        );
      default:
        return null;
    }
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-900 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-0 shadow-sm",
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-24 px-6 border-b border-slate-100 dark:border-slate-900 flex-shrink-0 relative">
          <div className="flex items-center gap-3">
            <img src={hostixLogo} alt="Hostix Logo" className="h-14 w-auto object-contain" />
            <div className="flex flex-col">
              <span className="text-lg font-black text-slate-950 dark:text-white tracking-tight leading-none">Hostix</span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">System</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto pt-3.5 pb-6 space-y-1.5">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  "flex items-center py-3 px-4 mx-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative",
                  isActive
                    ? "bg-cyan-500/5 text-cyan-600 dark:text-cyan-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {/* Floating left active indicator pill */}
                {isActive && (
                  <span className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#00bcd4] rounded-r-full shadow-[0_0_8px_rgba(0,188,212,0.4)]" />
                )}
                
                {/* Icon wrapper with hover transition */}
                <div className={clsx(
                  "p-1.5 rounded-lg mr-3 transition-all duration-200",
                  isActive
                    ? "bg-cyan-500/10 text-cyan-500"
                    : "bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 group-hover:bg-white dark:group-hover:bg-slate-800 group-hover:text-slate-800 dark:group-hover:text-white shadow-sm"
                )}>
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                  {item.name}
                </span>

                {renderBadge(item.badge)}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions - User Info */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-900 bg-slate-100/20 dark:bg-slate-950/20">
          <div className="flex items-center p-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-650 flex items-center justify-center text-white text-xs font-bold uppercase flex-shrink-0">
                {user?.full_name?.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">{user?.full_name}</p>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top bar - Header */}
        <header className="h-20 flex-shrink-0 bg-slate-50/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-900/50 z-30">
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
              <div className="flex items-center gap-3">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-905 dark:text-white tracking-tight flex items-center gap-2">
                  <span className="text-cyan-600 dark:text-cyan-400 font-black text-sm uppercase tracking-wider">Hostix</span>
                  <span className="text-slate-300 dark:text-slate-750 font-normal">|</span>
                  <span className="text-slate-500 dark:text-slate-400 font-bold text-xs">
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

              {/* User Profile Info & Avatar Dropdown Container */}
              <div className="relative">
                <div 
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30 rounded-2xl p-1 pr-3.5 transition-colors duration-200 cursor-pointer hover:bg-slate-105 dark:hover:bg-slate-800/60"
                >
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-sm flex items-center justify-center hover:scale-105 transition-all">
                    <span className="text-xs font-bold text-white uppercase">{user?.full_name?.charAt(0)}</span>
                  </div>

                  <div className="hidden sm:flex flex-col items-start min-w-[80px]">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight truncate w-full">{user?.full_name}</p>
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{user?.role}</p>
                  </div>
                </div>

                {/* Profile Dropdown Menu */}
                {profileDropdownOpen && (
                  <>
                    {/* Backdrop Overlay for closing */}
                    <div 
                      onClick={() => setProfileDropdownOpen(false)}
                      className="fixed inset-0 z-40 cursor-default"
                    />
                    
                    {/* Dropdown Panel */}
                    <div className="absolute right-0 mt-2.5 w-64 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4 animate-fade-in">
                      {/* User Info Header */}
                      <div className="pb-3 flex flex-col items-center text-center border-b border-slate-100 dark:border-slate-800/80">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-650 flex items-center justify-center text-white text-lg font-black shadow-md shadow-cyan-500/10 mb-2 uppercase">
                          {user?.full_name?.charAt(0)}
                        </div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm leading-tight">{user?.full_name}</h4>
                        <p className="text-[10px] text-slate-450 dark:text-slate-550 mt-1 uppercase font-bold tracking-widest">{user?.role}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate w-full">{user?.email || 'No email registered'}</p>
                      </div>

                      {/* Menu List */}
                      <div className="py-2 space-y-1">
                        <button
                          onClick={() => {
                            navigate(isAdmin ? '/profile' : '/owner/profile');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full flex items-center py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-950 dark:hover:text-white transition-all duration-200 group"
                        >
                          <div className="p-1.5 rounded-lg mr-2 bg-slate-50 dark:bg-slate-800 text-slate-550 dark:text-slate-450 group-hover:bg-white dark:group-hover:bg-slate-750 transition-colors shadow-sm">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-slate-750 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white">My Profile</span>
                        </button>

                        <button
                          onClick={() => {
                            navigate(isAdmin ? '/settings' : '/owner/settings');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full flex items-center py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-955 dark:hover:text-white transition-all duration-200 group"
                        >
                          <div className="p-1.5 rounded-lg mr-2 bg-slate-50 dark:bg-slate-800 text-slate-555 dark:text-slate-450 group-hover:bg-white dark:group-hover:bg-slate-750 transition-colors shadow-sm">
                            <Settings className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-slate-750 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white">Settings</span>
                        </button>
                      </div>

                      {/* Logout Action */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            handleLogoutClick();
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-all active:scale-98"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-y-auto relative">
          {/* Subtle background pattern/gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent dark:from-cyan-500/5 dark:via-transparent dark:to-transparent pointer-events-none" />
          
          <div className="p-4 sm:p-6 lg:p-8 pt-2.5 sm:pt-3.5 lg:pt-4.5 w-full relative z-10 animate-fade-in">
            {isSubscriptionExpired ? (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-200 p-8 rounded-2xl flex flex-col items-center justify-center text-center mt-10 max-w-2xl mx-auto shadow-sm">
                <AlertTriangle className="h-16 w-16 text-rose-500 mb-5" />
                <h2 className="text-2xl font-bold mb-3 text-rose-700 dark:text-rose-400">Subscription Expired</h2>
                <p className="mb-8 max-w-md text-rose-600 dark:text-rose-300">
                  Your free trial or subscription plan for this hostel has ended. You can still view your data, but all management features are temporarily locked. Please renew your plan to continue managing this hostel.
                </p>
                <button 
                  onClick={() => alert("Renewal functionality coming soon")} 
                  className="bg-rose-600 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-rose-700 shadow-lg shadow-rose-500/30 transition-all duration-200 hover:-translate-y-0.5"
                >
                  Renew Subscription
                </button>
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>



      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-slide-up">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                  <LogOut className="h-6 w-6 text-rose-600 dark:text-rose-455" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Confirm Logout</h2>
                  <p className="text-xs text-slate-450 dark:text-slate-500 font-bold mt-0.5">Please confirm your action</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 text-slate-705 dark:text-slate-300 text-sm leading-relaxed">
              <p className="font-medium">
                Are you sure you want to log out of your session? You will need to log in again to access the dashboard.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-150 dark:border-slate-800/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleLogoutCancel}
                disabled={isLoggingOut}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-750 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogoutConfirm}
                disabled={isLoggingOut}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-md shadow-rose-500/10 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoggingOut ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Logging out...</span>
                  </>
                ) : (
                  <span>Logout</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
