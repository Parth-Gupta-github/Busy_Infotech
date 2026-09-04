import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MenuPage from './pages/MenuPage';
import OrdersPage from './pages/OrdersPage';
import DashboardPage from './pages/DashboardPage';
import KitchenView from './pages/KitchenView';
import { apiFetch } from './services/api';
import {
  Utensils,
  LayoutDashboard,
  LogOut,
  Shield,
  User,
  ShoppingBag,
  ChefHat,
  Sun,
  Moon,
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';

function MainLayout({ children }) {
  const { user, logout, isManager } = useAuth();
  const location = useLocation();

  // Dark / Light Theme State with LocalStorage Persistence
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'dark';
  });

  // Slow-Order Alerts State (Goal #10)
  const [slowOrders, setSlowOrders] = useState([]);
  const [slowCount, setSlowCount] = useState(0);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [ackLoadingId, setAckLoadingId] = useState(null);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('app_theme', nextTheme);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Fetch Slow-Order Alerts (Goal #10 - 15 mins threshold, 10 mins suppression)
  const fetchSlowOrders = async () => {
    if (!user) return;
    try {
      const data = await apiFetch('/alerts/slow-orders?thresholdMinutes=15&suppressMinutes=10');
      setSlowOrders(data.slowOrders || []);
      setSlowCount(data.count || 0);
    } catch (err) {
      console.error('Failed to load slow-order alerts:', err);
    }
  };

  // Poll for slow orders every 30 seconds
  useEffect(() => {
    fetchSlowOrders();
    const interval = setInterval(fetchSlowOrders, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Acknowledge Slow Order Alert
  const handleAcknowledgeAlert = async (orderId) => {
    try {
      setAckLoadingId(orderId);
      await apiFetch('/alerts/acknowledge', {
        method: 'POST',
        body: JSON.stringify({ orderId })
      });
      await fetchSlowOrders();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    } finally {
      setAckLoadingId(null);
    }
  };

  const navLinks = [
    ...(isManager ? [{ name: 'Dashboard', path: '/', icon: LayoutDashboard }] : []),
    { name: 'Orders', path: '/orders', icon: ShoppingBag },
    { name: 'Kitchen Screen', path: '/kitchen', icon: ChefHat },
    ...(isManager ? [{ name: 'Menu Management', path: '/menu', icon: Utensils }] : [])
  ];

  const isDarkMode = theme === 'dark';

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col font-sans ${
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Navbar Header */}
      <header className={`sticky top-0 z-30 shadow-lg border-b backdrop-blur-xl transition-colors ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo & Navigation Links */}
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <Link to={isManager ? "/" : "/orders"} className="flex items-center gap-2.5 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                R
              </div>
              <div className="hidden sm:block">
                <span className={`font-bold text-sm block tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  Restaurant Orders
                </span>
                <span className={`text-[10px] block -mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Management System
                </span>
              </div>
            </Link>

            <nav className={`flex items-center gap-1 pl-3 sm:pl-4 border-l overflow-x-auto py-1 ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200'
            }`}>
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                        : isDarkMode
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Theme Toggle, Slow-Order Alerts, User Profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Slow-Order Alerts Bell Button (Goal #10) */}
            <button
              onClick={() => setShowAlertModal(true)}
              className={`relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                slowCount > 0
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 shadow-md shadow-red-500/10'
                  : isDarkMode
                    ? 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
              title={slowCount > 0 ? `${slowCount} Slow Orders Alert!` : 'No slow order alerts'}
            >
              <Bell className={`w-4 h-4 ${slowCount > 0 ? 'animate-bounce text-red-400' : ''}`} />
              {slowCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white font-bold text-[10px] flex items-center justify-center shadow-lg border-2 border-slate-950">
                  {slowCount}
                </span>
              )}
            </button>

            {/* Dark / Light Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isDarkMode
                  ? 'bg-slate-950/80 border-slate-800 text-indigo-400 hover:bg-slate-800 hover:text-indigo-300'
                  : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
              }`}
              title={isDarkMode ? 'Current mode: Dark Mode. Click to switch to Light Mode' : 'Current mode: Light Mode. Click to switch to Dark Mode'}
            >
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* User Profile Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              {isManager ? (
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <User className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <div className="text-left hidden sm:block">
                <span className={`font-medium text-xs block leading-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {user?.name}
                </span>
                <span
                  className={`text-[9px] font-bold tracking-wider uppercase ${
                    isManager ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={logout}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-800/60 hover:bg-red-500/10 hover:text-red-400 border-slate-700/50 text-slate-400'
                  : 'bg-slate-100 hover:bg-red-50 hover:text-red-600 border-slate-300 text-slate-600'
              }`}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Page Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* 🚨 Slow-Order Alerts Drawer Modal (Goal #10) */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Slow-Order Alerts</h3>
                  <p className="text-[11px] text-slate-400">Orders open &gt; 15 mins without reaching Ready</p>
                </div>
              </div>

              <button
                onClick={() => setShowAlertModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {slowOrders.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-slate-200">All orders running on schedule!</p>
                  <p className="text-[11px] text-slate-500 mt-1">No delayed orders exceeding 15 minutes.</p>
                </div>
              ) : (
                slowOrders.map((so) => (
                  <div
                    key={so.orderId}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">{so.tableNumber}</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                          {so.status}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-mono font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {so.elapsedMinutes} mins open
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Primary Waiter: <strong className="text-slate-200 font-medium">{so.primaryWaiterName}</strong>
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        Running Total: <strong className="text-emerald-400 font-bold">₹{so.totalAmount.toFixed(2)}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => handleAcknowledgeAlert(so.orderId)}
                      disabled={ackLoadingId === so.orderId}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/40 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {ackLoadingId === so.orderId ? (
                        <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Acknowledge</span>
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-950/60 border-t border-slate-800 text-right">
              <button
                onClick={() => setShowAlertModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HomeRoute() {
  const { isManager } = useAuth();
  return isManager ? <DashboardPage /> : <OrdersPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <HomeRoute />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <OrdersPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/menu"
            element={
              <ProtectedRoute allowedRoles={['MANAGER']}>
                <MainLayout>
                  <MenuPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/kitchen"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <KitchenView />
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
