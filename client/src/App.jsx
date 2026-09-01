import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MenuPage from './pages/MenuPage';
import OrdersPage from './pages/OrdersPage';
import DashboardPage from './pages/DashboardPage';
import { Utensils, LayoutDashboard, LogOut, Shield, User, ShoppingBag, Sun, Moon } from 'lucide-react';

function MainLayout({ children }) {
  const { user, logout, isManager } = useAuth();
  const location = useLocation();

  // Dark / Light Theme State with LocalStorage Persistence
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'dark';
  });

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

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Orders', path: '/orders', icon: ShoppingBag },
    { name: 'Menu Management', path: '/menu', icon: Utensils }
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
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
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

          {/* Theme Toggle, User Profile & Logout */}
          <div className="flex items-center gap-3 shrink-0">
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
    </div>
  );
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
                  <DashboardPage />
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
              <ProtectedRoute>
                <MainLayout>
                  <MenuPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
