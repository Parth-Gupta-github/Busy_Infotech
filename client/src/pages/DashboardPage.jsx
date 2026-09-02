import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import {
  LayoutDashboard,
  ShoppingBag,
  Clock,
  CheckCircle,
  IndianRupee,
  TrendingUp,
  User,
  AlertTriangle,
  RefreshCw,
  Award,
  Download
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiFetch('/dashboard/stats');
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  // Export Daily Orders CSV Handler (Goal #7 Part B - Today's Orders Only)
  const handleExportCSV = async () => {
    try {
      const blob = await apiFetch('/orders/export/csv?date=today');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-orders-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Loading live dashboard statistics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchDashboardStats}
          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const { kpis, statusBreakdown, waiterPerformance, trendData } = stats || {};

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-slate-100">Restaurant Analytics Dashboard</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Real-time sales metrics, status distribution, waiter performance, and 14-day served order trends
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Export Daily CSV Button (Goal #7 Part B) */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all border border-slate-700 flex items-center gap-2 cursor-pointer"
            title="Download Daily Orders CSV Report"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Daily CSV</span>
          </button>

          <button
            onClick={fetchDashboardStats}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* 1. Headline KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Orders */}
        <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Open Orders</span>
            <h3 className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">{kpis?.openOrders || 0}</h3>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Active in kitchen/waiters</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Placed Today */}
        <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Orders Placed Today</span>
            <h3 className="text-2xl font-extrabold text-blue-400 mt-1 font-mono">{kpis?.placedToday || 0}</h3>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Total created since midnight</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Served Today */}
        <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Orders Served Today</span>
            <h3 className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">{kpis?.servedToday || 0}</h3>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Completed dining orders</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Revenue Today */}
        <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Revenue Today (₹)</span>
            <h3 className="text-2xl font-extrabold text-indigo-400 mt-1 font-mono">
              ₹{(kpis?.revenueToday || 0).toFixed(2)}
            </h3>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Earned from served orders</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. 14-Day Served Orders & Revenue Trend Line Chart (Goal #8) */}
      <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-slate-100">Served Orders & Revenue Trend</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
              Last 14 Days
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              Served Orders
            </span>
            <span className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block"></span>
              Revenue (₹)
            </span>
          </div>
        </div>

        {(!trendData || trendData.length === 0) ? (
          <p className="text-xs text-slate-500 italic text-center p-8">No historical trend data recorded yet.</p>
        ) : (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#10b981" fontSize={11} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  formatter={(value, name) => [
                    name === 'Revenue (₹)' ? `₹${parseFloat(value).toFixed(2)}` : value,
                    name
                  ]}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="servedOrders"
                  name="Served Orders"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue (₹)"
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ fill: '#6366f1', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 3. Breakdowns Grid: Status & Waiter Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>Order Status Distribution</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-medium">
              All-Time Summary
            </span>
          </div>

          {(!statusBreakdown || statusBreakdown.length === 0) ? (
            <p className="text-xs text-slate-500 italic">No orders found.</p>
          ) : (
            <div className="space-y-3">
              {statusBreakdown.map((sb) => {
                const total = statusBreakdown.reduce((sum, item) => sum + item.count, 0);
                const percent = total > 0 ? Math.round((sb.count / total) * 100) : 0;
                return (
                  <div key={sb.status} className="space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-300">{sb.status}</span>
                      <span className="font-mono text-emerald-400">{sb.count} orders ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Waiter Performance Leaderboard */}
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              <span>Waiter Performance Leaderboard</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-medium">
              All-Time Summary
            </span>
          </div>

          {(!waiterPerformance || waiterPerformance.length === 0) ? (
            <p className="text-xs text-slate-500 italic">No waiter data recorded.</p>
          ) : (
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              {waiterPerformance.map((wp) => {
                const isCurrentUser = user && (wp.waiterId === user.id || wp.waiterName === user.name);
                return (
                  <div
                    key={wp.waiterId}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                      isCurrentUser
                        ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500 font-medium'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                        isCurrentUser
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                      }`}>
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-200">{wp.waiterName}</p>
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold tracking-wide">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {wp.orderCount} total orders ({wp.activeOrderCount} active)
                        </p>
                      </div>
                    </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto font-mono text-xs">
                    {/* Served Revenue Till Now */}
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase font-sans">Served (Till Now)</span>
                      <span className="font-bold text-emerald-400 text-sm">₹{wp.servedRevenue.toFixed(2)}</span>
                    </div>

                    {/* Pending Ongoing Revenue */}
                    <div className="text-right pl-3 border-l border-slate-800">
                      <span className="text-[10px] text-amber-400/80 block uppercase font-sans">Ongoing (Pending)</span>
                      <span className="font-bold text-amber-400 text-sm">₹{wp.pendingRevenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
