import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'indigo' | 'violet' | 'cyan';
  statusText?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'cyan',
  statusText,
}) => {
  const borderClasses = {
    blue: 'border-l-4 border-l-blue-500',
    green: 'border-l-4 border-l-emerald-500',
    yellow: 'border-l-4 border-l-amber-500',
    red: 'border-l-4 border-l-rose-500',
    indigo: 'border-l-4 border-l-indigo-500',
    violet: 'border-l-4 border-l-violet-500',
    cyan: 'border-l-4 border-l-cyan-500',
  };

  const iconBgClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    yellow: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    red: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400',
  };

  const statusBgClasses = {
    blue: 'bg-blue-50/50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
    green: 'bg-emerald-50/50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
    yellow: 'bg-amber-50/50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
    red: 'bg-rose-50/50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
    indigo: 'bg-indigo-50/50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30',
    violet: 'bg-violet-50/50 text-violet-700 border-violet-100 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/30',
    cyan: 'bg-cyan-50/50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30',
  };

  return (
    <div className={clsx(
      "glass relative overflow-hidden rounded-2xl p-6 group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border border-slate-200/80 dark:border-slate-800/80",
      borderClasses[color]
    )}>
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</p>
          
          {trend && (
            <p className="mt-2 text-sm flex items-center gap-1">
              <span
                className={clsx(
                  "font-medium px-2 py-0.5 rounded-full text-xs",
                  trend.isPositive 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-xs">from last month</span>
            </p>
          )}

          {statusText && (
            <div className="mt-4">
              <span className={clsx(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors",
                statusBgClasses[color]
              )}>
                {statusText}
              </span>
            </div>
          )}
        </div>
        
        <div className={clsx(
          "p-3 rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-sm",
          iconBgClasses[color]
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

