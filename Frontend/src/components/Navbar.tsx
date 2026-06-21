import React from 'react';
import { Search, Star, Award, LogOut, ArrowUp, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { isCordova } from '../utils/platformUtils';
import { useRevenueCat } from '../context/RevenueCatContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  // Paywall control comes from RevenueCatContext, which owns all platform
  // branching (web vs. Cordova). Navbar never talks to the SDK directly.
  const { openPaywall, isPremium, isReady } = useRevenueCat();

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

  // Determine if user should see upgrade button. Subscription management is an
  // admin concern; trial users still see the CTA so they can upgrade early.
  // Premium (non-trial) users have no upgrade CTA – the active-subscription
  // banner above already communicates their status.
  const showUpgradeButton = user?.role === 'admin' && (!isPremium || user?.is_trial);

  return (
    <div className="flex flex-col bg-transparent">
      {/* Clean Subscription Status Banner */}
      {user?.is_trial && daysLeft !== null && daysLeft > 0 && (
        <div className="bg-black text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center space-x-2">
            <Star className="h-4 w-4" />
            <span>14-Day Free Trial · {subscriptionDateRange} · {daysLeft} Days Left</span>
          </div>
        </div>
      )}
      {user?.is_subscription_active && !user?.is_trial && (
        <div className="bg-gradient-to-r from-[#1D9E75] to-[#1A8FA8] text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center space-x-2">
            <Award className="h-4 w-4" />
            <span>{subscriptionDateRange}</span>
          </div>
        </div>
      )}
      {isCordova && !user?.is_subscription_active && !user?.is_trial && user?.role === 'admin' && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center space-x-2">
            <ArrowUp className="h-4 w-4" />
            <span>No Active Subscription -</span>
            <Link to="/subscription" className="underline font-semibold hover:text-yellow-200 transition-colors">
              Subscribe Now
            </Link>
          </div>
        </div>
      )}

      {/* Modern Navbar - Green Theme with Glassmorphism */}
      <div className="flex items-center justify-between py-3 px-6 bg-gradient-to-r from-[#1D9E75]/90 to-[#1A8FA8]/90 backdrop-blur-md border border-white/20 shadow-lg rounded-xl m-3">
        
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/30 bg-white/20 backdrop-blur-sm placeholder-white/70 text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>
      
        {/* User Actions */}
        <div className="flex items-center gap-3 ml-6">
          {/* Upgrade Button - Only show for trial or non-subscribed admins.
              Always opens the global Paywall modal; the Paywall/Context handle
              platform-specific messaging. Disabled until RevenueCat/subscription
              state has finished loading. */}
          {showUpgradeButton && (
            <button
              onClick={openPaywall}
              disabled={!isReady}
              aria-busy={!isReady}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#1D9E75] font-semibold hover:bg-white/90 transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white disabled:hover:shadow-md"
            >
              {isReady ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <span className="hidden md:inline">{isReady ? 'Upgrade' : 'Loading...'}</span>
            </button>
          )}

          {/* User Profile */}
          <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-lg p-2 hover:bg-white/30 transition-colors">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-[#1D9E75] font-bold text-sm">
              {user && user.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-white">
                {user?.username || 'User'}
              </p>
            </div>
          </div>

          {/* Sign Out Button */}
          <button 
            onClick={handleLogout} 
            className="p-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
