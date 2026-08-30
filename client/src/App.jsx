import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { LogOut, User, Shield } from 'lucide-react';

function PlaceholderHome() {
  const { user, logout, isManager } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-500/20">
            R
          </div>
          <div>
            <h1 className="font-bold text-slate-100 leading-tight">Restaurant Orders</h1>
            <p className="text-xs text-slate-400">Order Management System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 text-xs">
            {isManager ? (
              <Shield className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <User className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="font-medium text-slate-200">{user?.name}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              isManager ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'
            }`}>
              {user?.role}
            </span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 font-bold">
            ✓
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 mb-2">Phase 2 Complete!</h2>
          <p className="text-slate-400 text-sm mb-6">
            Authentication & server-enforced role permissions are now active for{' '}
            <span className="text-emerald-400 font-semibold">{user?.email}</span> ({user?.role}).
          </p>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 text-left space-y-1">
            <div><span className="text-slate-500">User ID:</span> {user?.id}</div>
            <div><span className="text-slate-500">Name:</span> {user?.name}</div>
            <div><span className="text-slate-500">Role:</span> {user?.role}</div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <PlaceholderHome />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
