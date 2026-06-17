import React from 'react';
import { 
  Home, 
  MapPin, 
  Navigation, 
  Shield, 
  Zap, 
  TrendingUp, 
  User, 
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
  { id: 'simulation', label: 'What-If', icon: Zap },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
];


const Sidebar = ({ sidebarOpen, setSidebarOpen, activeTab, setActiveTab }) => {
  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <div className={`flex items-center gap-2 ${!sidebarOpen && 'justify-center w-full'}`}>
          <div className="bg-blue-600 p-1.5 rounded-md">
            <Truck className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && <span className="font-bold text-gray-900 text-lg">FleetManager</span>}
        </div>
        {sidebarOpen && (
          <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-md hover:bg-gray-100 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>
      
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)} 
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${
              activeTab === item.id 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>
      
      <div className="p-2 border-t border-gray-200 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition">
          <User className="w-5 h-5 text-gray-600" />
          {sidebarOpen && <span className="text-sm">Fleet Manager</span>}
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition text-red-600">
          <LogOut className="w-5 h-5" />
          {sidebarOpen && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
};


export default Sidebar;