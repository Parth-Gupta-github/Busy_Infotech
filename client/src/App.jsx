import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-emerald-400 mb-2">Restaurant Orders</h1>
        <p className="text-slate-400 text-sm mb-6">Replace paper tickets with a reliable digital order management workflow.</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          System Scaffolding Complete
        </div>
      </div>
    </div>
  );
}
