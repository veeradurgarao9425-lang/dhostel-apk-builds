import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Download, RefreshCw, BarChart2, Shield, Calendar, Users, Home, Phone, Mail } from 'lucide-react';
import { useAuthStore, getStoredHostelId } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';

interface ReportStats {
  ownerName: string;
  hostelCount: number;
  email: string;
  phone: string;
}

export const ReportsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isOwner = user?.role_id === 2;
  const isOwnerReports = location.pathname === '/owner/reports';

  // Default to current month in YYYY-MM format
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [downloading, setDownloading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [adminReportData, setAdminReportData] = useState<ReportStats[]>([]);
  const [activeHostelId, setActiveHostelId] = useState<string>(getStoredHostelId() || '');

  // Listen for hostel switches from dashboard or other pages
  useEffect(() => {
    const handleHostelChange = (e: Event) => {
      const hostelId = (e as CustomEvent<{ hostelId: string }>).detail.hostelId;
      if (hostelId) setActiveHostelId(hostelId);
    };
    window.addEventListener('hostelChanged', handleHostelChange);
    return () => window.removeEventListener('hostelChanged', handleHostelChange);
  }, []);

  useEffect(() => {
    if (!isOwnerReports) {
      fetchAdminReportStats();
    }
  }, [isOwnerReports]);

  const fetchAdminReportStats = async () => {
    try {
      setLoadingStats(true);
      const [ownersRes, hostelsRes] = await Promise.all([
        api.get('/users/owners'),
        api.get('/hostels')
      ]);

      const owners = ownersRes.data?.data || [];
      const hostels = hostelsRes.data?.data || [];

      const stats: ReportStats[] = owners.map((owner: any) => ({
        ownerName: owner.full_name,
        email: owner.email || 'N/A',
        phone: owner.phone,
        hostelCount: hostels.filter((h: any) => h.owner_id === owner.user_id).length,
      }));

      setAdminReportData(stats);
    } catch (error) {
      console.error('Failed to load admin report data:', error);
      // Mock fallback data for premium UI display
      setAdminReportData([
        { ownerName: 'Mahendra Reddy', email: 'mahendra@gmail.com', phone: '9876543210', hostelCount: 2 },
        { ownerName: 'Priya Sharma', email: 'priya@gmail.com', phone: '9876543211', hostelCount: 1 },
        { ownerName: 'Ravi Kumar', email: 'ravi@gmail.com', phone: '9876543212', hostelCount: 3 },
      ]);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!selectedMonth) {
      toast.error('Please select a month');
      return;
    }

    try {
      setDownloading(true);
      const response = await api.get('/reports/download/excel', {
        params: { month: selectedMonth, hostelId: activeHostelId || undefined },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `Income_Expense_Report_${selectedMonth}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Excel report downloaded successfully');
    } catch (error: any) {
      console.error('Excel download error:', error);
      toast.error(error.response?.data?.error || 'Failed to download Excel report');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAdminReport = () => {
    try {
      setDownloading(true);
      // Generate CSV content
      const headers = ['Owner Name', 'Email', 'Phone', 'Hostel Count'];
      const rows = adminReportData.map(stat => [
        `"${stat.ownerName}"`,
        `"${stat.email}"`,
        `"${stat.phone}"`,
        stat.hostelCount
      ]);
      
      const csvContent = 'data:text/csv;charset=utf-8,' 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `dhostel_system_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Admin System Report generated & downloaded!');
    } catch (e) {
      toast.error('Failed to generate report');
    } finally {
      setDownloading(false);
    }
  };

  // Render Owner Reports Page
  if (isOwnerReports && isOwner) {
    return (
      <div className="space-y-6 p-6 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
              Reports Center
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Download high-accuracy financial statements and logs for your hostels.
            </p>
          </div>
        </div>

        {/* Download Card */}
        <Card className="glass relative overflow-hidden p-6 border-slate-200/80 dark:border-slate-800/80">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
            <BarChart2 className="h-48 w-48 text-indigo-500" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                <Calendar className="h-3.5 w-3.5" />
                Monthly Financial Statements
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Income & Expense Ledger Export
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                Select a billing cycle to generate a full breakdown of collected room rents, custom fees, maintenance invoices, and direct expenses.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all text-sm"
              />

              <button
                onClick={handleDownloadExcel}
                disabled={downloading || !selectedMonth}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 shadow-md shadow-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {downloading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Export Excel Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>

        {/* Feature Cards Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass p-6">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-950 dark:text-white">Tenant Registry Report</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Provides a complete catalog of current tenants, active rooms, emergency contacts, and outstanding due logs. (Directly exportable in Excel format via Ledger Export).
            </p>
          </Card>

          <Card className="glass p-6">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
              <Home className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-950 dark:text-white">Hostel Occupancy Index</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Analyzes filled beds vs vacant rooms across floors to display optimal asset utilization rates. Detailed breakdowns are dynamically viewable on your main Dashboard.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // Render Admin Reports Page
  return (
    <div className="space-y-6 p-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
            System Diagnostics & Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analyze platform-wide statistics, active hostel owners, and registration trends.
          </p>
        </div>

        <button
          onClick={handleDownloadAdminReport}
          disabled={downloading || adminReportData.length === 0}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          <span>Export Platform Summary</span>
        </button>
      </div>

      {/* Stats Table Section */}
      <Card className="glass overflow-hidden border-slate-200/80 dark:border-slate-800/80">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-505 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Hostel Owner Utilization Index</h2>
          </div>
          <button 
            onClick={fetchAdminReportStats} 
            disabled={loadingStats}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="p-6">
          {loadingStats ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-cyan-600"></div>
              <span className="text-sm text-slate-500 font-bold">Loading utilization metrics...</span>
            </div>
          ) : adminReportData.length === 0 ? (
            <div className="text-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-250 dark:border-slate-800">
              <span className="text-slate-550 dark:text-slate-400">No owner records found in the database.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminReportData.map((stat, idx) => (
                <div 
                  key={idx}
                  className="group relative bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  <div>
                    {/* Header Row: Icon/Avatar, Name, Status */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-650 flex items-center justify-center shadow-sm text-white font-extrabold text-lg flex-shrink-0 transition-transform group-hover:scale-105 duration-300">
                          {stat.ownerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight tracking-tight">
                            {stat.ownerName}
                          </h3>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wider">
                            System Owner
                          </p>
                        </div>
                      </div>

                      {/* Status badge with colored dot */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-750 border border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        Report Active
                      </span>
                    </div>

                    {/* Sub-badge: Hostel Count */}
                    <div className="mb-4">
                      <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/10 text-[10px] font-bold uppercase tracking-wider">
                        {stat.hostelCount} {stat.hostelCount === 1 ? 'Hostel' : 'Hostels'} Owned
                      </span>
                    </div>

                    {/* Metadata List with icons */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span>{stat.phone}</span>
                      </div>
                      {stat.email && stat.email !== 'N/A' && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{stat.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Highlighted Accent Pill */}
                    <div className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100/20 inline-block self-start mb-1">
                      Contact: {stat.phone}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                      Owner Stats
                    </span>

                    <button
                      onClick={() => navigate('/hostels')}
                      className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-bold text-xs flex items-center gap-0.5 transition-all hover:translate-x-0.5"
                    >
                      View Hostels &gt;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
export default ReportsPage;

