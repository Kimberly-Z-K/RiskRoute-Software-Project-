import React from 'react';
import { Download, Bell, RefreshCw } from 'lucide-react';

const Header = ({ activeTab, navItems }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {navItems.find(i => i.id === activeTab)?.label || 'Dashboard'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Real-time fleet operations • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div className="flex gap-2">
        <button className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition">
          <Download className="w-5 h-5 text-gray-600" />
        </button>
        <button className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
        </button>
        <button className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition">
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

export default Header;