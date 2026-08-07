import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, DollarSign, FileText, TrendingUp, AlertCircle, CreditCard, UserCheck, Building } from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { useAuthStore, setStoredHostelId, getStoredHostelId } from '../store/authStore';

interface DashboardStats {
  totalRooms: number;
  totalStudents: number;
  occupancyRate: number;
  totalBeds: number;
  occupiedBeds: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netProfit: number;
  feeCollection: number;
  feeCollectionCount: number;
  pendingDuesCount: number;
  pendingDuesAmount: number;
}

interface Activity {
  type: 'payment' | 'admission' | 'expense' | 'income';
  id: number;
  date: string;
  student_name?: string;
  room_number?: string;
  amount?: number;
  category_name?: string;
  source?: string;
  description?: string;
  created_at: string;
}

interface PendingRegistration {
  student_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  created_at: string;
}

export const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState<any[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState<string>(
    getStoredHostelId() || user?.hostel_id?.toString() || ''
  );

  const fetchHostels = async () => {
    try {
      const response = await api.get('/hostels');
      const data = response.data.data || [];
      setHostels(data);
      if (data.length > 0 && !selectedHostelId) {
        const firstId = data[0].hostel_id.toString();
        setSelectedHostelId(firstId);
        setStoredHostelId(firstId);
        window.dispatchEvent(new CustomEvent('hostelChanged', { detail: { hostelId: firstId } }));
      }
    } catch (error) {
      console.error('Failed to fetch hostels:', error);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentActivity();
    fetchPendingRegistrations();
  }, [selectedHostelId]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const params = selectedHostelId ? { hostelId: selectedHostelId } : {};
      const response = await api.get('/analytics/dashboard-stats', { params });
      setStats(response.data.data);
    } catch (error: any) {
      toast.error('Failed to fetch dashboard statistics');
      console.error('Dashboard stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const params = selectedHostelId ? { limit: 5, hostelId: selectedHostelId } : { limit: 5 };
      const response = await api.get('/activity/recent', { params });
      setActivities(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch recent activity:', error);
    }
  };

  const fetchPendingRegistrations = async () => {
    try {
      const params = selectedHostelId ? { hostelId: selectedHostelId } : {};
      const response = await api.get('/students/pending-registrations', { params });
      if (response.data?.success) {
        setPendingRegistrations(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch pending registrations:', error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return { icon: DollarSign, bg: 'bg-green-100', color: 'text-green-600' };
      case 'admission':
        return { icon: Users, bg: 'bg-blue-100', color: 'text-blue-600' };
      case 'expense':
        return { icon: FileText, bg: 'bg-red-100', color: 'text-red-600' };
      case 'income':
        return { icon: TrendingUp, bg: 'bg-purple-100', color: 'text-purple-600' };
      default:
        return { icon: AlertCircle, bg: 'bg-gray-100', color: 'text-gray-600' };
    }
  };

  const getActivityTitle = (activity: Activity) => {
    switch (activity.type) {
      case 'payment':
        return 'Payment Received';
      case 'admission':
        return 'New Student Admitted';
      case 'expense':
        return 'Expense Added';
      case 'income':
        return 'Income Recorded';
      default:
        return 'Activity';
    }
  };

  const getActivityDescription = (activity: Activity) => {
    switch (activity.type) {
      case 'payment':
        return `${activity.student_name} paid ₹${activity.amount?.toLocaleString('en-IN')}`;
      case 'admission':
        return `${activity.student_name} allocated to Room ${activity.room_number}`;
      case 'expense':
        return `${activity.category_name} - ₹${activity.amount?.toLocaleString('en-IN')}`;
      case 'income':
        return `${activity.source} - ₹${activity.amount?.toLocaleString('en-IN')}`;
      default:
        return activity.description || '';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full animate-fade-in pb-8">
      {/* Hostel Selector */}
      {hostels.length > 1 && (
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Active Hostel</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Switch between your hostels to see stats</p>
            </div>
          </div>
          <select
            value={selectedHostelId}
            onChange={(e) => {
              const newId = e.target.value;
              setSelectedHostelId(newId);
              setStoredHostelId(newId);
              // Notify all other open pages immediately
              window.dispatchEvent(new CustomEvent('hostelChanged', { detail: { hostelId: newId } }));
            }}
            className="px-4 py-2.5 border border-slate-250 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider min-w-[280px] shadow-sm outline-none"
          >
            {hostels.map((h) => (
              <option key={h.hostel_id} value={h.hostel_id.toString()}>
                {h.hostel_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Banner / Greeting block */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-tr from-slate-900 via-slate-900 to-indigo-950 p-8 md:p-10 text-white shadow-2xl border border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(6,182,212,0.15),transparent)] pointer-events-none" />
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[100%] rounded-full bg-gradient-to-tr from-cyan-550/10 to-teal-500/10 blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-slate-350 border border-white/10 backdrop-blur-md">
              🏢 Hostel Owner Portal
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">
              Your Hostel at a <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">Glance</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
              Track check-ins, record rent payments, log business expenses, and monitor monthly financial health.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate('/owner/students', { state: { openAddModal: true } })}
              className="flex items-center justify-center gap-2 px-5.5 py-3 bg-white text-slate-950 rounded-xl hover:bg-slate-50 transition-all font-bold text-xs uppercase tracking-wider shadow-md hover:scale-102 active:scale-98"
            >
              <Users className="h-4 w-4" /> Add Student
            </button>
            <button
              onClick={() => navigate('/owner/monthly-fees')}
              className="flex items-center justify-center gap-2 px-5.5 py-3 bg-slate-800/60 hover:bg-slate-800/80 text-white rounded-xl transition-all font-bold text-xs uppercase tracking-wider border border-slate-700/50 backdrop-blur-sm hover:scale-102 active:scale-98"
            >
              <DollarSign className="h-4 w-4" /> Collect Rent
            </button>
          </div>
        </div>
      </div>

      {/* Setup Progress Checklist (Shown when setup is incomplete) */}
      {stats && (stats.totalRooms === 0 || stats.totalStudents === 0) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-cyan-500/10 border border-amber-500/30 dark:border-amber-500/20 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                🚀 Setup Progress Checklist
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Complete these 3 steps to set up your hostel and start adding tenants.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full">
              {stats.totalRooms > 0 && stats.totalStudents > 0 ? '3/3 Done' : stats.totalRooms > 0 ? 'Step 2/3 Complete' : 'Step 1/3 Complete'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Step 1: Create Hostel */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Step 1: Hostel Created</h4>
                  <p className="text-[11px] text-slate-500">Hostel active</p>
                </div>
              </div>
            </div>

            {/* Step 2: Create Rooms */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              stats.totalRooms > 0
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  stats.totalRooms > 0
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500 text-white'
                }`}>
                  {stats.totalRooms > 0 ? '✓' : '2'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Step 2: Add Rooms</h4>
                  <p className="text-[11px] text-slate-500">
                    {stats.totalRooms > 0 ? `${stats.totalRooms} Rooms Added` : 'No rooms created yet'}
                  </p>
                </div>
              </div>
              {stats.totalRooms === 0 && (
                <button
                  onClick={() => navigate('/owner/rooms')}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  + Add Rooms
                </button>
              )}
            </div>

            {/* Step 3: Add Students */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              stats.totalStudents > 0
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                : 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-800/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  stats.totalStudents > 0
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                    : 'bg-cyan-600 text-white'
                }`}>
                  {stats.totalStudents > 0 ? '✓' : '3'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Step 3: Add Students</h4>
                  <p className="text-[11px] text-slate-500">
                    {stats.totalStudents > 0 ? `${stats.totalStudents} Active Students` : 'No students added yet'}
                  </p>
                </div>
              </div>
              {stats.totalStudents === 0 && (
                <button
                  onClick={() => navigate('/owner/students', { state: { openAddModal: true } })}
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  + Add Student
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div onClick={() => navigate('/owner/rooms')} className="cursor-pointer">
          <StatCard
            title="Total Rooms"
            value={stats.totalRooms}
            icon={Building2}
            color="blue"
            statusText={`${stats.occupiedBeds}/${stats.totalBeds} Beds Occupied`}
          />
        </div>
        <div onClick={() => navigate('/owner/students')} className="cursor-pointer">
          <StatCard
            title="Total Students"
            value={stats.totalStudents}
            icon={Users}
            color="green"
            statusText={`${stats.occupancyRate}% Occupancy Rate`}
          />
        </div>
        <div onClick={() => navigate('/owner/collections')} className="cursor-pointer">
          <StatCard
            title="Fee Collection"
            value={formatCurrency(stats.feeCollection)}
            icon={CreditCard}
            color="yellow"
            statusText={`${stats.feeCollectionCount} Collections`}
          />
        </div>
        <div onClick={() => navigate('/owner/income')} className="cursor-pointer">
          <StatCard
            title="Monthly Income"
            value={formatCurrency(stats.monthlyIncome)}
            icon={DollarSign}
            color="cyan"
            statusText={`Net Profit: ${formatCurrency(stats.netProfit)}`}
          />
        </div>
        <div onClick={() => navigate('/owner/expenses')} className="cursor-pointer">
          <StatCard
            title="Monthly Expenses"
            value={formatCurrency(stats.monthlyExpenses)}
            icon={FileText}
            color="red"
            statusText="Operational Costs"
          />
        </div>
      </div>

      {/* Alerts, Registrations, and Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="flex flex-col h-full">
          <Card.Header>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Pending Payments</h3>
              {stats.pendingDuesCount > 0 && (
                <span className="px-2.5 py-1 text-xs font-semibold text-rose-800 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 rounded-full border border-rose-200 dark:border-rose-900/30">
                  {stats.pendingDuesCount} pending
                </span>
              )}
            </div>
          </Card.Header>
          <Card.Body className="flex-1 flex flex-col justify-center">
            {stats.pendingDuesCount > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {stats.pendingDuesCount} student{stats.pendingDuesCount > 1 ? 's' : ''} have pending fees
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Total pending: {formatCurrency(stats.pendingDuesAmount)}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/owner/monthly-fees')}
                    className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm px-3.5 py-2 rounded-xl transition-all"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-500 dark:text-slate-400">All payments are up to date! 🎉</p>
              </div>
            )}
          </Card.Body>
        </Card>

        <Card className="flex flex-col h-full">
          <Card.Header>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">New Registrations</h3>
              {pendingRegistrations.length > 0 && (
                <span className="px-2.5 py-1 text-xs font-semibold text-cyan-800 bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-400 rounded-full border border-cyan-200 dark:border-cyan-900/30">
                  {pendingRegistrations.length} new
                </span>
              )}
            </div>
          </Card.Header>
          <Card.Body className="flex-1 flex flex-col justify-center">
            {pendingRegistrations.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center p-4 bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200/50 dark:border-cyan-900/30 rounded-2xl">
                  <UserCheck className="h-5 w-5 text-cyan-600 dark:text-cyan-400 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {pendingRegistrations.length} student{pendingRegistrations.length > 1 ? 's' : ''} awaiting approval
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Verify & assign room
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/owner/students')}
                    className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm px-3.5 py-2 rounded-xl transition-all"
                  >
                    Verify
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-500 dark:text-slate-400">No pending registrations</p>
              </div>
            )}
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Quick Actions</h3>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/owner/rooms')}
                className="p-4 text-center bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-950/40 border border-blue-100/30 dark:border-blue-900/10 rounded-2xl transition-all group hover:scale-102"
              >
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2 transition-transform group-hover:scale-110" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Manage Rooms</span>
              </button>
              <button
                onClick={() => navigate('/owner/students')}
                className="p-4 text-center bg-cyan-50/50 dark:bg-cyan-950/20 hover:bg-cyan-100/50 dark:hover:bg-cyan-950/40 border border-cyan-100/30 dark:border-cyan-900/10 rounded-2xl transition-all group hover:scale-102"
              >
                <Users className="h-6 w-6 text-cyan-600 dark:text-cyan-400 mx-auto mb-2 transition-transform group-hover:scale-110" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Add Student</span>
              </button>
              <button
                onClick={() => navigate('/owner/monthly-fees')}
                className="p-4 text-center bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40 border border-emerald-100/30 dark:border-emerald-900/10 rounded-2xl transition-all group hover:scale-102"
              >
                <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2 transition-transform group-hover:scale-110" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Record Payment</span>
              </button>
              <button
                onClick={() => navigate('/owner/expenses')}
                className="p-4 text-center bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/50 dark:hover:bg-rose-950/40 border border-rose-100/30 dark:border-rose-900/10 rounded-2xl transition-all group hover:scale-102"
              >
                <FileText className="h-6 w-6 text-rose-600 dark:text-rose-400 mx-auto mb-2 transition-transform group-hover:scale-110" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Add Expense</span>
              </button>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <Card.Header>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Activity</h3>
        </Card.Header>
        <Card.Body>
          {activities.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-500 dark:text-slate-400">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const { icon: Icon, bg, color } = getActivityIcon(activity.type);
                // Adjusting standard background classes to premium
                const premiumBg = bg.replace('bg-', 'bg-').replace('-100', '-50/50 dark:bg-').replace('-50/50 dark:bg-', '-950/40');
                const premiumColor = color.replace('text-', 'text-');
                
                return (
                  <div key={`${activity.type}-${activity.id}-${index}`} className="flex items-start">
                    <div className={clsx(
                      "flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm",
                      premiumBg,
                      premiumColor
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{getActivityTitle(activity)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{getActivityDescription(activity)}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};
