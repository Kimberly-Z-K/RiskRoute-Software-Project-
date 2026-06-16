import React from 'react';
import { Download, Bell, RefreshCw } from 'lucide-react';


const Header = ({ activeTab, navItems }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {navItems.find(i => i.id === activeTab)?.label || 'Dashboard'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div className="flex gap-2">
        <button className="p-2 rounded-md bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <Download className="w-5 h-5 text-gray-600" />
        </button>
        <button className="p-2 rounded-md bg-white border border-gray-200 hover:bg-gray-50 transition-colors relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <button className="p-2 rounded-md bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
};


export default Header;