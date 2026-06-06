
import React from 'react';
import { Search, Bell, User, Crown, Sparkles, Star, Award, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { isCordova } from '../utils/platformUtils';
import logo from './logo.jpg';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Calculate days left in trial
  const calculateDaysLeft = () => {
    if (user?.subscription_end_date) {
      const endDate = new Date(user.subscription_end_date);
      const currentDate = new Date();
      const timeDiff = endDate.getTime() - currentDate.getTime();
      const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return days > 0 ? days : 0;
    }
    return null;
  };

  const daysLeft = calculateDaysLeft();

  const formatDateRange = () => {
    const formatDate = (dateString?: string) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };

    return `${formatDate(user?.subscription_start_date)} → ${formatDate(user?.subscription_end_date)}`;
  };

  const subscriptionDateRange = formatDateRange();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Clean Subscription Status Banner */}
      {user?.is_trial && daysLeft !== null && daysLeft > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center space-x-2">
            <Star className="h-4 w-4" />
            <span>{subscriptionDateRange} · {daysLeft} Days Left</span>
          </div>
        </div>
      )}
      {user?.is_subscription_active && !user?.is_trial && (
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center space-x-2">
            <Award className="h-4 w-4" />
            <span>{subscriptionDateRange}</span>
          </div>
        </div>
      )}
      {isCordova && !user?.is_subscription_active && !user?.is_trial && user?.role === 'admin' && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>No Active Subscription -</span>
            <Link to="/subscription" className="underline font-semibold hover:text-yellow-200 transition-colors">
              Subscribe Now
            </Link>
          </div>
        </div>
      )}
      {/* Clean Modern Navbar */}
      <div className="flex items-center justify-between py-3 px-6 bg-white border-b border-gray-200 shadow-sm">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg">
            <img src={logo} alt="HAVENN Logo" className="h-6 w-6 rounded object-cover" />
          </div>
          <div className="hidden md:block">
            <h1 className="text-lg font-bold text-gray-800">HAVENN</h1>
            <p className="text-xs text-gray-500 font-medium">Library Management</p>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>
      
        {/* User Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></div>
          </button>
          
          {/* User Profile */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
              {user && user.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-800">
                {user?.username || 'User'}
              </p>
            </div>
          </div>

          {/* Sign Out Button */}
          <button 
            onClick={handleLogout} 
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
