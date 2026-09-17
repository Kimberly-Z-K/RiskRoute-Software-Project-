import React, { useEffect, useState } from 'react';
import {
  User,
  Palette,
  Bell,
  Shield,
  Activity,
  ChevronRight,
  Save,
  Moon,
  Sun,
  CheckCircle
} from 'lucide-react';

import AdminAuditLog from '../settings/adminauditlog';

const Settings = ({ darkMode, setDarkMode }) => {
  const [activeSection, setActiveSection] = useState('account');
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState({
    riskAlerts: true,
    trafficAlerts: true,
    weatherAlerts: true,
    systemNotifications: true
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    }
  }, []);

  const userRole = user?.role?.toLowerCase() || '';

const isAdmin =
  userRole === 'admin' ||
  userRole === 'administrator' ||
  userRole.startsWith('admin');

  const sections = [
    {
      id: 'account',
      label: 'Account',
      description: 'Manage your profile information',
      icon: User
    },
    {
      id: 'appearance',
      label: 'Appearance',
      description: 'Customize how RiskRoute looks',
      icon: Palette
    },
    {
      id: 'notifications',
      label: 'Notifications',
      description: 'Manage your alert preferences',
      icon: Bell
    },
    {
      id: 'security',
      label: 'Security',
      description: 'Manage account security',
      icon: Shield
    },
    {
      id: 'activity',
      label: 'Activity & Audit',
      description: 'View account activity',
      icon: Activity
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSection user={user} />;
      case 'appearance':
        return (
          <AppearanceSection
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        );
      case 'notifications':
        return (
          <NotificationsSection
            notifications={notifications}
            setNotifications={setNotifications}
          />
        );
      case 'security':
        return <SecuritySection user={user} />;
      case 'activity':
  return (
    <div className="space-y-8">
      {isAdmin && <AdminAuditLog user={user} />}
    </div>
  );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your RiskRoute account, preferences and security.
        </p>
      </div>

      {/* Settings Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 h-fit">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition mb-1 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{section.label}</p>
                  {!isActive && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {section.description}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">{renderContent()}</div>
      </div>
    </div>
  );
};

/* ============================================
   ACCOUNT
============================================ */
const AccountSection = ({ user }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Account
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your RiskRoute account information.
        </p>
      </div>
      <div className="p-6 space-y-5">
        <div>
          <label className="text-sm text-gray-500 dark:text-gray-400">
            Full Name
          </label>
          <p className="mt-1 font-medium text-gray-900 dark:text-white">
            {user?.name || user?.full_name || 'Unknown User'}
          </p>
        </div>
        <div>
          <label className="text-sm text-gray-500 dark:text-gray-400">
            Email
          </label>
          <p className="mt-1 font-medium text-gray-900 dark:text-white">
            {user?.email || 'Not available'}
          </p>
        </div>
        <div>
          <label className="text-sm text-gray-500 dark:text-gray-400">
            Role
          </label>
          <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
            <Shield className="w-4 h-4" />
            {user?.role || 'User'}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================
   APPEARANCE
============================================ */
const AppearanceSection = ({ darkMode, setDarkMode }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Appearance
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Customize the RiskRoute interface.
        </p>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {darkMode ? (
              <Moon className="w-5 h-5 text-blue-500" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-500" />
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Dark Mode
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Use a darker interface for lower-light environments.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`relative w-12 h-6 rounded-full transition ${
              darkMode ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                darkMode ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================
   NOTIFICATIONS
============================================ */
const NotificationsSection = ({ notifications, setNotifications }) => {
  const toggleNotification = (key) => {
    setNotifications((previous) => ({
      ...previous,
      [key]: !previous[key]
    }));
  };

  const notificationOptions = [
    {
      key: 'riskAlerts',
      title: 'Risk Alerts',
      description: 'Receive alerts when vehicles enter high-risk areas.'
    },
    {
      key: 'trafficAlerts',
      title: 'Traffic Alerts',
      description: 'Receive traffic and congestion warnings.'
    },
    {
      key: 'weatherAlerts',
      title: 'Weather Alerts',
      description: 'Receive severe weather warnings.'
    },
    {
      key: 'systemNotifications',
      title: 'System Notifications',
      description: 'Receive important RiskRoute system notifications.'
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Notifications
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Choose which notifications you want to receive.
        </p>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {notificationOptions.map((option) => (
          <div
            key={option.key}
            className="p-6 flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {option.title}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {option.description}
              </p>
            </div>
            <button
              onClick={() => toggleNotification(option.key)}
              className={`relative w-12 h-6 rounded-full transition ${
                notifications[option.key] ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                  notifications[option.key] ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================
   SECURITY
============================================ */
const SecuritySection = ({ user }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Security
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Review your account security information.
        </p>
      </div>
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-300">
              Account authenticated
            </p>
            <p className="text-sm text-green-700 dark:text-green-400">
              Your current RiskRoute session is active.
            </p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Current role
          </p>
          <p className="font-medium text-gray-900 dark:text-white mt-1">
            {user?.role || 'User'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;