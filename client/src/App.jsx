import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MenuPage from './pages/MenuPage';
import OrdersPage from './pages/OrdersPage';
import { Utensils, LayoutDashboard, LogOut, Shield, User, ShoppingBag } from 'lucide-react';

function MainLayout({ children }) {
  const { user, logout, isManager } = useAuth();
  const location = useLocation();

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Orders', path: '/orders', icon: ShoppingBag },
    { name: 'Menu Management', path: '/menu', icon: Utensils }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                R
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-slate-100 text-sm block tracking-tight">Restaurant Orders</span>
                <span className="text-[10px] text-slate-400 block -mt-1 font-medium">Management System</span>
              </div>
            </Link>

            <nav className="flex items-center gap-1 pl-3 sm:pl-4 border-l border-slate-800 overflow-x-auto py-1">
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
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
              {isManager ? (
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <User className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <div className="text-left hidden sm:block">
                <span className="font-medium text-slate-200 text-xs block leading-tight">{user?.name}</span>
                <span
                  className={`text-[9px] font-bold tracking-wider uppercase ${
                    isManager ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {user?.role}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/60 hover:bg-red-500/10 hover:text-red-400 border border-slate-700/50 text-slate-400 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}

function PlaceholderHome() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
        <LayoutDashboard className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-2">
        Welcome to Dashboard
      </h1>
      <p className="text-slate-400 text-sm max-w-md mb-6">
        Log in active for <strong className="text-emerald-400">{user?.email}</strong> ({user?.role}).
        Use the top navigation bar to access <strong className="text-slate-200">Orders</strong> and <strong className="text-slate-200">Menu Management</strong>.
      </p>

      <div className="flex items-center gap-3">
        <Link
          to="/orders"
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Go to Orders</span>
        </Link>
        <Link
          to="/menu"
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2"
        >
          <Utensils className="w-4 h-4" />
          <span>Go to Menu</span>
        </Link>
      </div>
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
                  <PlaceholderHome />
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
