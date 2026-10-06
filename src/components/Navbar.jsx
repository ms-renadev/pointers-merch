import React from 'react';

export default function Navbar({ onOpenOrderForm }) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-slate-950 text-lg shadow-lg shadow-indigo-500/20">
            P
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            POINTERS <span className="text-indigo-400 font-medium">Merch</span>
          </span>
        </div>

        <button
          onClick={() => onOpenOrderForm()}
          className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/30 transition-all duration-200 active:scale-95"
        >
          Order Form ↗
        </button>
      </div>
    </header>
  );
}