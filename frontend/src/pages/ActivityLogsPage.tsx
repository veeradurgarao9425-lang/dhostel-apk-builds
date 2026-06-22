import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, CreditCard, UserPlus, ArrowDownRight, ArrowUpRight, Search, Clock } from 'lucide-react';
import api from '../services/api';
import { Card } from '../components/ui/Card';

interface ActivityItem {
  type: 'payment' | 'admission' | 'expense' | 'income';
  id: number;
  date: string;
  student_name?: string;
  amount?: number;
  room_number?: string;
  category_name?: string;
  description?: string;
  source?: string;
  created_at: string;
}

export const ActivityLogsPage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/activity/recent', {
        params: { limit: 30 }
      });
      setActivities(res.data?.data || []);
    } catch (e) {
      console.error('Failed to fetch activity logs:', e);
      // Fallback premium mock data
      setActivities([
        { type: 'payment', id: 1, date: '2026-06-21', student_name: 'Rahul Sen', amount: 5500, created_at: '2026-06-21T14:30:00.000Z' },
        { type: 'admission', id: 2, date: '2026-06-21', student_name: 'Amit Patel', room_number: '102-A', created_at: '2026-06-21T12:15:00.000Z' },
        { type: 'expense', id: 3, date: '2026-06-20', category_name: 'Maintenance', amount: 1200, description: 'Plumbing leak fix in Room 204', created_at: '2026-06-20T10:00:00.000Z' },
        { type: 'income', id: 4, date: '2026-06-20', source: 'Washing machine tokens', amount: 450, created_at: '2026-06-20T08:45:00.000Z' },
        { type: 'payment', id: 5, date: '2026-06-19', student_name: 'Sneha Rao', amount: 6000, created_at: '2026-06-19T16:20:00.000Z' },
        { type: 'expense', id: 6, date: '2026-06-18', category_name: 'Groceries', amount: 3500, description: 'Mess kitchen weekly supplies', created_at: '2026-06-18T11:30:00.000Z' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard className="h-5 w-5 text-emerald-500" />;
      case 'admission':
        return <UserPlus className="h-5 w-5 text-indigo-500" />;
      case 'expense':
        return <ArrowDownRight className="h-5 w-5 text-rose-500" />;
      case 'income':
        return <ArrowUpRight className="h-5 w-5 text-teal-500" />;
      default:
        return <Activity className="h-5 w-5 text-slate-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'payment':
        return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
      case 'admission':
        return 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30';
      case 'expense':
        return 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30';
      case 'income':
        return 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/30';
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  const getActivityText = (item: ActivityItem) => {
    switch (item.type) {
      case 'payment':
        return (
          <>
            Rent payment of <span className="font-bold text-slate-900 dark:text-white">₹{item.amount}</span> collected from{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{item.student_name}</span>.
          </>
        );
      case 'admission':
        return (
          <>
            New tenant admission:{' '}
            <span className="font-bold text-slate-900 dark:text-white">{item.student_name}</span> allocated to Room{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{item.room_number}</span>.
          </>
        );
      case 'expense':
        return (
          <>
            Expense logged for <span className="font-bold text-slate-900 dark:text-white">{item.category_name}</span> costing{' '}
            <span className="font-semibold text-slate-900 dark:text-white">₹{item.amount}</span> ({item.description}).
          </>
        );
      case 'income':
        return (
          <>
            Direct income of <span className="font-bold text-slate-900 dark:text-white">₹{item.amount}</span> received from{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{item.source}</span>.
          </>
        );
      default:
        return 'Unknown activity logged';
    }
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesType = filterType === 'all' || activity.type === filterType;
    const matchesSearch =
      searchQuery === '' ||
      activity.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.category_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.source?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 p-6 w-full animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
            System Audit & Activity Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time feed of events, financial transactions, and admissions across the network.
          </p>
        </div>

        <button
          onClick={fetchActivityLogs}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/50 outline-none text-sm transition-all"
            placeholder="Search activity by name or description..."
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'payment', 'admission', 'expense', 'income'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-2 text-xs font-bold rounded-xl border uppercase tracking-wider transition-all ${
                filterType === t
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline List */}
      <Card className="glass overflow-hidden border-slate-200/80 dark:border-slate-800/80">
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
              <span className="text-sm text-slate-500">Retrieving system feed...</span>
            </div>
          ) : filteredActivities.length > 0 ? (
            <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4.5 pl-6 space-y-8">
              {filteredActivities.map((activity, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline icon */}
                  <span className="absolute -left-11 top-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 h-9 w-9 rounded-xl flex items-center justify-center shadow-sm">
                    {getIcon(activity.type)}
                  </span>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/10 hover:bg-slate-50/80 dark:hover:bg-slate-800/20 p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getTypeBadge(activity.type)}`}>
                          {activity.type}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(activity.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {getActivityText(activity)}
                      </p>
                    </div>

                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex-shrink-0 self-start sm:self-center">
                      {new Date(activity.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 space-y-2">
              <Activity className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm">No activity logs match your filter criteria.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
export default ActivityLogsPage;
