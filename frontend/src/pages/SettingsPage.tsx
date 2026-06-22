import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Settings, Palette, Type, Sun, Moon, Database, HardDrive, Terminal, Shield, RefreshCw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import api from '../services/api';

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
  const ThemeCustomizer = () => (
    <div className="space-y-6">
      {/* Theme Mode */}
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div className="flex items-center gap-2 mb-4">
          {theme.mode === 'light' ? (
            <Sun className="h-5 w-5 text-amber-500" />
          ) : (
            <Moon className="h-5 w-5 text-indigo-500" />
          )}
          <label className="text-sm font-semibold text-slate-900 dark:text-white">Interface Theme Mode</label>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 text-sm font-medium">
            <input
              type="radio"
              name="themeMode"
              value="light"
              checked={theme.mode === 'light'}
              onChange={() => setThemeMode('light')}
              className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-slate-300 dark:border-slate-700"
            />
            <span>Light Mode</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 text-sm font-medium">
            <input
              type="radio"
              name="themeMode"
              value="dark"
              checked={theme.mode === 'dark'}
              onChange={() => setThemeMode('dark')}
              className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-slate-300 dark:border-slate-700"
            />
            <span>Dark Mode</span>
          </label>
        </div>
      </div>

      {/* Primary Theme Color */}
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-indigo-500" />
          <label className="text-sm font-semibold text-slate-900 dark:text-white">Custom Brand Highlight Color</label>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="color"
              value={theme.primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-14 h-10 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer flex-shrink-0 bg-transparent"
            />
            <input
              type="text"
              value={theme.primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="flex-1 sm:w-36 min-w-0 px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/50 outline-none bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white"
              placeholder="#4f46e5"
            />
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Dynamically applies brand accent highlights to headers, active states, and buttons
          </span>
        </div>
      </div>

      {/* Font Size */}
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <Type className="h-5 w-5 text-indigo-500" />
          <label className="text-sm font-semibold text-slate-900 dark:text-white">Text Size Scale</label>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          {fontSizeOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 text-sm font-medium">
              <input
                type="radio"
                name="fontSize"
                value={option.value}
                checked={theme.fontSize === option.value}
                onChange={() => setFontSize(option.value as 'small' | 'medium' | 'large')}
                className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-slate-300 dark:border-slate-700"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Type className="h-5 w-5 text-indigo-500" />
          <label className="text-sm font-semibold text-slate-900 dark:text-white">Typography Font Family</label>
        </div>
        <select
          value={theme.fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="w-full sm:w-64 px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/50 outline-none bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white"
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
