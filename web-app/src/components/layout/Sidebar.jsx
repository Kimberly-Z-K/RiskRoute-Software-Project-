import React from 'react';
import { 
  Home, 
  MapPin, 
  Navigation, 
  Shield, 
  Zap, 
  TrendingUp, 
  User, 
  Sun, 
  Moon, 
  LogOut, 
  Menu, 
  X, 
  Truck 
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'monitoring', label: 'Live Monitoring', icon: MapPin },
  { id: 'route-planning', label: 'Route Planning', icon: Navigation },
  { id: 'risk-analysis', label: 'Risk Analysis', icon: Shield },
  { id: 'simulation', label: 'What-If Simulation', icon: Zap },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
];

const Sidebar = ({ sidebarOpen, setSidebarOpen, activeTab, setActiveTab, darkMode, setDarkMode }) => {
  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col z-20`}>
      <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <div className={`flex items-center gap-2 ${!sidebarOpen && 'justify-center w-full'}`}>
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Truck className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && <span className="font-bold text-gray-800 dark:text-white text-lg">FleetManager</span>}
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
          {sidebarOpen ? <Menu className="w-5 h-5 text-gray-600" /> : <X className="w-5 h-5 text-gray-600" />}
        </button>
      </div>
      
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              activeTab === item.id 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            {activeTab === item.id && sidebarOpen && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
          </button>
        ))}
      </nav>
      
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
          <User className="w-5 h-5 text-gray-600" />
          {sidebarOpen && <span className="text-sm">Fleet Manager</span>}
        </button>
        <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
          {darkMode ? <Sun className="w-5 h-5 text-gray-600" /> : <Moon className="w-5 h-5 text-gray-600" />}
          {sidebarOpen && <span className="text-sm">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-red-600">
          <LogOut className="w-5 h-5" />
          {sidebarOpen && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;