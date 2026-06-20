import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface ExpenseCategory {
  category_id: number;
  category_name: string;
  amount: number;
  count: number;
  percentage: number;
}

interface MonthData {
  month: string;
  monthLabel: string;
  feeCollection: number;
  otherIncome: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  expenseBreakdown: ExpenseCategory[];
  rentDue: number;
  rentPending: number;
  rentCollected: number;
  feeCount: number;
}

interface TrendItem {
  month: string;
  monthLabel: string;
  year: number;
  income: number;
  feeCollection: number;
  otherIncome: number;
  expenses: number;
  profit: number;
}

interface OverviewData {
  currentMonth: MonthData;
  trend: TrendItem[];
}

// Category colors for expense breakdown
const CATEGORY_COLORS: Record<string, string> = {
  'Electricity': '#F59E0B',
  'Utilities': '#3B82F6',
  'Maintenance': '#8B5CF6',
  'Salaries': '#EC4899',
  'Staff Salary': '#EC4899',
  'Groceries': '#F97316',
  'Kitchen': '#F97316',
  'Supplies': '#06B6D4',
  'Rent': '#6366F1',
  'Internet': '#14B8A6',
  'Cleaning': '#EF4444',
  'Water': '#0EA5E9',
  'Other': '#64748B',
};

const getCategoryColor = (name: string): string => {
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#64748B';
};

export const FinancialOverviewPage: React.FC = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchOverview();
  }, [selectedMonth]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/monthly-overview', {
        params: { month: selectedMonth }
      });
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load financial overview');
      console.error('Overview fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const shiftMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatCurrency = (amount: number) => {
    if (Math.abs(amount) >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (Math.abs(amount) >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyFull = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonthDisplay = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Trend chart max value for scaling
  const trendMax = useMemo(() => {
    if (!data?.trend) return 1;
    return Math.max(...data.trend.map(t => Math.max(t.income, t.expenses)), 1);
  }, [data?.trend]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 p-4">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const { currentMonth: cm, trend } = data;
  const isProfit = cm.netProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Header with Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Financial Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Track your hostel's income & expenses</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm">
          <button
            onClick={() => shiftMonth(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2 py-1 text-sm font-medium text-gray-800 border-0 bg-transparent focus:ring-0 focus:outline-none"
          />
          <button
            onClick={() => shiftMonth(1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Hero Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Income */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-emerald-100">Total Income</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{formatCurrencyFull(cm.totalIncome)}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-emerald-100">
              <span>Fees: {formatCurrency(cm.feeCollection)}</span>
              {cm.otherIncome > 0 && (
                <span>• Other: {formatCurrency(cm.otherIncome)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingDown className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-red-100">Total Expenses</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{formatCurrencyFull(cm.totalExpenses)}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-red-100">
              <span>{cm.expenseBreakdown.length} categories</span>
            </div>
          </div>
        </div>

        {/* Net Profit/Loss */}
        <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${
          isProfit 
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-200'
            : 'bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-200'
        }`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                {isProfit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </div>
              <span className="text-sm font-medium opacity-80">
                Net {isProfit ? 'Profit' : 'Loss'}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{formatCurrencyFull(Math.abs(cm.netProfit))}</p>
            <div className="flex items-center gap-3 mt-3 text-xs opacity-80">
              {cm.profitMargin !== 0 && (
                <span>Margin: {cm.profitMargin}%</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rent Collection Status */}
      {cm.rentDue > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-primary-600" />
            <h3 className="text-base font-bold text-gray-900">Rent Collection Status</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-600 font-medium mb-1">Total Due</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(cm.rentDue)}</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <p className="text-xs text-emerald-600 font-medium mb-1">Collected</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(cm.rentCollected)}</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-xl">
              <p className="text-xs text-amber-600 font-medium mb-1">Pending</p>
              <p className="text-lg font-bold text-amber-700">{formatCurrency(cm.rentPending)}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Collection Progress</span>
              <span className="font-semibold text-gray-700">
                {cm.rentDue > 0 ? Math.round((cm.rentCollected / cm.rentDue) * 100) : 0}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${cm.rentDue > 0 ? Math.min(100, (cm.rentCollected / cm.rentDue) * 100) : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary-600" />
              <h3 className="text-base font-bold text-gray-900">Expense Breakdown</h3>
            </div>
            <span className="text-sm font-semibold text-red-600">{formatCurrencyFull(cm.totalExpenses)}</span>
          </div>

          {cm.expenseBreakdown.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No expenses recorded this month</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cm.expenseBreakdown.map((cat, index) => {
                const color = getCategoryColor(cat.category_name);
                return (
                  <div key={cat.category_id || index} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        ></div>
                        <span className="text-sm font-medium text-gray-700">{cat.category_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{formatCurrencyFull(cat.amount)}</span>
                        <span className="text-xs text-gray-400 font-medium w-12 text-right">{cat.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: color,
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 12-Month Trend Chart */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary-600" />
              <h3 className="text-base font-bold text-gray-900">12-Month Trend</h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></div>
                <span className="text-gray-500 font-medium">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-red-400"></div>
                <span className="text-gray-500 font-medium">Expenses</span>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="flex items-end gap-1 h-48">
            {trend.map((t) => {
              const incomeH = Math.max(2, (t.income / trendMax) * 160);
              const expenseH = Math.max(2, (t.expenses / trendMax) * 160);
              const isCurrentMonth = t.month === selectedMonth;

              return (
                <div key={t.month} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip on hover */}
                  <div className="hidden group-hover:block absolute bottom-full mb-2 bg-gray-800 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap z-10 shadow-lg">
                    <p className="font-bold mb-1">{t.monthLabel} {t.year}</p>
                    <p className="text-emerald-300">Income: {formatCurrency(t.income)}</p>
                    <p className="text-red-300">Expenses: {formatCurrency(t.expenses)}</p>
                    <p className={t.profit >= 0 ? 'text-blue-300' : 'text-orange-300'}>
                      {t.profit >= 0 ? 'Profit' : 'Loss'}: {formatCurrency(Math.abs(t.profit))}
                    </p>
                  </div>

                  {/* Bars */}
                  <div className="flex gap-0.5 items-end w-full justify-center">
                    <div
                      className={`rounded-t transition-all duration-500 ${isCurrentMonth ? 'bg-emerald-500' : 'bg-emerald-200'}`}
                      style={{ height: `${incomeH}px`, width: '40%', minWidth: '4px' }}
                    ></div>
                    <div
                      className={`rounded-t transition-all duration-500 ${isCurrentMonth ? 'bg-red-400' : 'bg-red-200'}`}
                      style={{ height: `${expenseH}px`, width: '40%', minWidth: '4px' }}
                    ></div>
                  </div>
                  {/* Month label */}
                  <span className={`text-[9px] mt-1.5 font-semibold ${isCurrentMonth ? 'text-primary-600' : 'text-gray-400'}`}>
                    {t.monthLabel}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Trend Summary */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-500 font-medium">Avg Income</p>
                <p className="text-sm font-bold text-emerald-600">
                  {formatCurrency(trend.reduce((s, t) => s + t.income, 0) / Math.max(trend.filter(t => t.income > 0).length, 1))}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Avg Expenses</p>
                <p className="text-sm font-bold text-red-500">
                  {formatCurrency(trend.reduce((s, t) => s + t.expenses, 0) / Math.max(trend.filter(t => t.expenses > 0).length, 1))}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Avg Profit</p>
                <p className="text-sm font-bold text-blue-600">
                  {formatCurrency(trend.reduce((s, t) => s + t.profit, 0) / Math.max(trend.filter(t => t.income > 0 || t.expenses > 0).length, 1))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Expense Table — Desktop Only */}
      {cm.expenseBreakdown.length > 0 && (
        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary-600" />
              Expense Details — {formatMonthDisplay(selectedMonth)}
            </h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Entries</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Share</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cm.expenseBreakdown.map((cat, index) => {
                const color = getCategoryColor(cat.category_name);
                return (
                  <tr key={cat.category_id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                        <span className="text-sm font-medium text-gray-800">{cat.category_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-gray-900">
                      {formatCurrencyFull(cat.amount)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-600">
                      {cat.count}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-gray-700">
                      {cat.percentage}%
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden w-full">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${cat.percentage}%`, backgroundColor: color }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* Total Row */}
              <tr className="bg-gray-50 font-bold">
                <td className="px-5 py-3 text-sm text-gray-900">Total</td>
                <td className="px-5 py-3 text-right text-sm text-red-600">{formatCurrencyFull(cm.totalExpenses)}</td>
                <td className="px-5 py-3 text-right text-sm text-gray-600">
                  {cm.expenseBreakdown.reduce((s, c) => s + c.count, 0)}
                </td>
                <td className="px-5 py-3 text-right text-sm text-gray-700">100%</td>
                <td className="px-5 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
