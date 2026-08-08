import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const Sidebar = ({ sidebarOpen, setSidebarOpen, activeTab, setActiveTab, onLogout }) => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    // Call the onLogout function from App.js
    if (onLogout) {
      onLogout();
    }
    // Navigate to login page
    navigate('/login');
    setShowLogoutModal(false);
  };

  return (
    <>
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
          <button 
            onClick={() => setShowLogoutModal(true)} 
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50 transition text-red-600"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Confirm Logout</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to logout? You'll need to sign in again to access your dashboard.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;