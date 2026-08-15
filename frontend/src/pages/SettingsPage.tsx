import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Settings, Sun, Moon, Database, HardDrive, Terminal, Shield, RefreshCw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import api from '../services/api';
import clsx from 'clsx';

interface DbHealth {
  success: boolean;
  tables?: string[];
  fee_payments?: any[];
  error?: string;
}

export const SettingsPage: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const { theme, setThemeMode, setPrimaryColor, setFontSize, setFontFamily } = useTheme();
  
  const isAdmin = user?.role_id === 1;
  const isOwner = user?.role_id === 2;
  const isOwnerSettings = location.pathname === '/owner/settings';
  const isAdminSettings = location.pathname === '/settings';

  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);
  const [loadingDb, setLoadingDb] = useState(false);

  useEffect(() => {
    if (isAdmin && isAdminSettings) {
      fetchDbHealth();
    }
  }, [isAdmin, isAdminSettings]);

  const fetchDbHealth = async () => {
    try {
      setLoadingDb(true);
      const res = await api.get('/health-db');
      setDbHealth(res.data);
    } catch (e: any) {
      console.error(e);
      setDbHealth({
        success: false,
        error: e.response?.data?.error || e.message || 'Failed to connect to database diagnostic API'
      });
    } finally {
      setLoadingDb(false);
    }
  };

  const fontOptions = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Montserrat', label: 'Montserrat' },
    { value: 'System Default', label: 'System Default' },
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];

  if (isAdminSettings && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Settings className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-spin" />
          <p className="text-sm text-slate-500">Access denied. Admin settings are for Main Admin only.</p>
        </div>
      </div>
    );
  }

  if (isOwnerSettings && !isOwner) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Settings className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-spin" />
          <p className="text-sm text-slate-500">Access denied. Owner settings are for Hostel Owners only.</p>
        </div>
      </div>
    );
  }

  // Shared Theme Customizer Component
  const ThemeCustomizer = () => {
    const colorPresets = [
      { name: 'Teal/Cyan (Default)', value: '#0891b2', bg: 'bg-cyan-600' },
      { name: 'Indigo Blue', value: '#4f46e5', bg: 'bg-indigo-600' },
      { name: 'Emerald Green', value: '#10b981', bg: 'bg-emerald-600' },
      { name: 'Amethyst Violet', value: '#8b5cf6', bg: 'bg-violet-650' },
      { name: 'Rose Petal', value: '#f43f5e', bg: 'bg-rose-500' },
      { name: 'Charcoal Slate', value: '#475569', bg: 'bg-slate-600' },
    ];

    return (
      <div className="space-y-8 font-sans">
        {/* Theme Mode Card Grid */}
        <div className="border-b border-slate-100 dark:border-slate-800/80 pb-6">
          <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-4">
            Interface Theme Mode
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setThemeMode('light')}
              className={clsx(
                "p-5 rounded-2xl border text-left flex items-start gap-4 transition-all",
                theme.mode === 'light'
                  ? "border-cyan-500 bg-cyan-50/20 dark:bg-cyan-950/10 text-slate-900 dark:text-white ring-2 ring-cyan-500/20"
                  : "border-slate-205 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-slate-500"
              )}
            >
              <div className={clsx(
                "p-2.5 rounded-xl",
                theme.mode === 'light' ? "bg-amber-100 text-amber-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              )}>
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight text-slate-900 dark:text-white">Light Mode</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">Clean light dashboard layout and styling</p>
              </div>
            </button>

            <button
              onClick={() => setThemeMode('dark')}
              className={clsx(
                "p-5 rounded-2xl border text-left flex items-start gap-4 transition-all",
                theme.mode === 'dark'
                  ? "border-cyan-500 bg-cyan-50/20 dark:bg-cyan-950/10 text-slate-900 dark:text-white ring-2 ring-cyan-500/20"
                  : "border-slate-205 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-slate-500"
              )}
            >
              <div className={clsx(
                "p-2.5 rounded-xl",
                theme.mode === 'dark' ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              )}>
                <Moon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight text-slate-900 dark:text-white">Dark Mode</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">Premium immersive dark interface</p>
              </div>
            </button>
          </div>
        </div>

        {/* Brand highlight customization */}
        <div className="border-b border-slate-100 dark:border-slate-800/80 pb-6">
          <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
            Brand Color Accent
          </label>
          <p className="text-xs text-slate-450 dark:text-slate-400 mb-4">Choose a preset palette or pick a custom tone.</p>
          
          <div className="flex flex-col gap-4">
            {/* Color chips */}
            <div className="flex flex-wrap gap-2.5">
              {colorPresets.map((preset) => {
                const isSelected = theme.primaryColor.toLowerCase() === preset.value.toLowerCase();
                return (
                  <button
                    key={preset.value}
                    onClick={() => setPrimaryColor(preset.value)}
                    className={clsx(
                      "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all hover:scale-102",
                      isSelected
                        ? "border-slate-800 dark:border-white bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-655 dark:text-slate-300"
                    )}
                  >
                    <span className={clsx("h-3.5 w-3.5 rounded-full flex-shrink-0 border border-black/10 dark:border-white/10", preset.bg)} />
                    {preset.name}
                  </button>
                );
              })}
            </div>

            {/* Custom Color Picker input row */}
            <div className="flex items-center gap-3.5 mt-2 bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 max-w-sm">
              <input
                type="color"
                value={theme.primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom Hex Color</p>
                <input
                  type="text"
                  value={theme.primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full mt-0.5 border-0 bg-transparent text-sm font-bold focus:outline-none focus:ring-0 text-slate-905 dark:text-white"
                  placeholder="#0891b2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Text Size pill toggler */}
        <div className="border-b border-slate-100 dark:border-slate-800/80 pb-6">
          <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-4">
            Text Size Scale
          </label>
          <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl max-w-sm border border-slate-200/50 dark:border-slate-800/50">
            {fontSizeOptions.map((option) => {
              const isSelected = theme.fontSize === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setFontSize(option.value as 'small' | 'medium' | 'large')}
                  className={clsx(
                    "flex-1 text-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all",
                    isSelected
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Family selector */}
        <div>
          <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-3">
            Typography Font Family
          </label>
          <select
            value={theme.fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full sm:w-72 px-4 py-3 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/50 outline-none bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium"
          >
            {fontOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
          Settings & Configurations
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isAdminSettings ? 'Configure system behavior, theme interface, and view database diagnostics.' : 'Customize the look and feel of your workspace.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Theme / Customizer */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass p-6">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-6">Visual Customizations</h2>
            <ThemeCustomizer />
          </Card>

          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
              <strong>Auto-save:</strong> Preferences are automatically applied and synchronized across tabs for this account. No manual restart is required.
            </p>
          </div>
        </div>

        {/* Right Column: Admin System Diagnostics */}
        {isAdmin && isAdminSettings && (
          <div className="space-y-6">
            <Card className="glass p-6 border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-indigo-500" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Database Health</h2>
                </div>
                <button
                  onClick={fetchDbHealth}
                  disabled={loadingDb}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingDb ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingDb ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  <span className="text-xs text-slate-500">Querying status...</span>
                </div>
              ) : dbHealth?.success ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Status</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                      Connected
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Total Tables</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {dbHealth.tables?.length || 0} Tables
                    </span>
                  </div>

                  {/* Diagnostic Table List */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Active Tables Schema
                    </span>
                    <div className="bg-slate-900 text-slate-300 text-xs font-mono p-3 rounded-xl max-h-36 overflow-y-auto border border-slate-800">
                      {dbHealth.tables && Array.isArray(dbHealth.tables) ? (
                        dbHealth.tables.map((t: any, idx: number) => {
                          const tableName = typeof t === 'object' ? Object.values(t)[0] as string : String(t);
                          return (
                            <div key={idx} className="flex items-center gap-1.5 py-0.5">
                              <span className="text-indigo-400">⚡</span>
                              <span>{tableName}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div>No tables listed.</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-sm">
                    <HardDrive className="h-4 w-4" />
                    <span>Connection Failure</span>
                  </div>
                  <p className="text-xs text-rose-500 dark:text-rose-300 leading-normal">
                    {dbHealth?.error || 'Database check failed to execute.'}
                  </p>
                </div>
              )}
            </Card>

            {/* Diagnostic Logs Panel */}
            <Card className="glass p-6">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="h-5 w-5 text-indigo-500" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Developer Diagnostics</h2>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <span className="text-slate-500">API Gateway URL</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">Local (Port 5000)</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <span className="text-slate-500">Node Environment</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">development</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client Engine</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">Vite / React 18</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
export default SettingsPage;
