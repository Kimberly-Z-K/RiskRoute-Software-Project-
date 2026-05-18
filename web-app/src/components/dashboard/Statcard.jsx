import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, trend, subtitle }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
        <p className="text-2xl font-bold mt-2 text-gray-800 dark:text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        {trend && <p className="text-xs mt-2 text-green-600 dark:text-green-400 flex items-center gap-1">{trend}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

export default StatCard;