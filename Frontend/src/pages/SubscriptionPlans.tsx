import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { API_BASE_URL } from '../utils/apiConfig';
import { isWeb, isCordova } from '../utils/platformUtils';
import { PaywallContent } from '../components/PaywallContent';


const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Product ID from environment (frontend)
  const GOOGLE_PLAY_PRODUCT_ID =
    import.meta.env.VITE_GOOGLE_PLAY_PRODUCT_ID ||
    (typeof process !== 'undefined' && (process as any)?.env?.REACT_APP_GOOGLE_PLAY_PRODUCT_ID) ||
    '';

  // Load subscription info on component mount
  useEffect(() => {
    const fetchSubscriptionInfo = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/subscriptions/status`, { withCredentials: true });
        setSubscriptionInfo(response.data.subscription);
      } catch (error) {
        console.error('Error fetching subscription info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionInfo();
  }, []);


  // Calculate end date based on plan
  const calculateEndDate = (planId: string) => {
    const startDate = new Date();
    const endDate = new Date(startDate);

    switch(planId) {
      case '1_day':
        endDate.setDate(endDate.getDate() + 1);
        break;
      case '1_month':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case '3_month':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case '6_month':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case '9_month':
        endDate.setMonth(endDate.getMonth() + 9);
        break;
      case '12_month':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    return endDate;
  };

  // Consider a plan current only if still active and not expired
  const isPlanActive = (planId: string) => {
    if (!subscriptionInfo || subscriptionInfo.plan !== planId) return false;
    const end = subscriptionInfo.endDate ? new Date(subscriptionInfo.endDate) : null;
    const now = new Date();
    return Boolean(subscriptionInfo.isActive) && !!end && end.getTime() > now.getTime();
  };

  // Subscription plans data
  const plans = [
    {
      id: 'free_trial',
      name: 'Free Trial Plan',
      description: 'Kickstart Your Journey – 14 Days Free',
      price: '₹0',
      originalPrice: null,
      amount: 0,
      features: [
        'Full access to all features',
        'Unlimited students & data',
        'Track attendance & reports',
        'All premium features unlocked'
      ],
      cta: 'Current Plan',
      isCurrent: isPlanActive('free_trial'),
      disabled: true,
      discount: null
    },
    {
      id: '1_month',
      name: '1-Month Plan',
      description: 'One Month to Build a Routine',
      price: '₹300',
      originalPrice: null,
      amount: 30000, // ₹300 = 30000 paise
      features: [
        'Unlimited student addition',
        'All library management features',
        'Priority support',
        'No restrictions'
      ],
      cta: 'Get Started',
      isCurrent: isPlanActive('1_month'),
      disabled: false,
      discount: null
    },
    {
      id: '3_month',
      name: '3-Month Plan',
      description: 'Stay Focused for 90 Days',
      price: '₹850',
      originalPrice: null,
      amount: 85000, // ₹850 = 85000 paise
      features: [
        'Unlimited students',
        'All features included',
        'Priority support',
        'Save compared to monthly'
      ],
      cta: 'Choose Plan',
      isCurrent: isPlanActive('3_month'),
      disabled: false,
      discount: null
    },
    {
      id: '6_month',
      name: '6-Month Plan',
      description: 'Make This Your Growth Phase',
      price: '₹1600',
      originalPrice: null,
      amount: 160000, // ₹1600 = 160000 paise
      features: [
        'Great value package',
        'All premium features',
        'Extended support',
        'Best for growing libraries'
      ],
      cta: 'Get Started',
      isCurrent: isPlanActive('6_month'),
      disabled: false,
      discount: null
    },
    {
      id: '12_month',
      name: '12-Month Plan',
      description: 'All In for the Year',
      price: '₹3000',
      originalPrice: null,
      amount: 300000, // ₹3000 = 300000 paise
      features: [
        'Best value',
        'All features unlocked',
        '24/7 priority support',
        'Focus for the long term'
      ],
      cta: 'Get Best Value',
      isCurrent: isPlanActive('12_month'),
      disabled: false,
      discount: null
    },
    {
      id: '1_day',
      name: '1-Day Plan',
      description: 'Full access for 24 hours',
      price: '₹10',
      originalPrice: null,
      amount: 1000, // ₹10 = 1000 paise
      features: [
        'All features for 1 day',
        'Great for quick needs',
        'Priority support'
      ],
      cta: 'Get 1 Day Access',
      isCurrent: isPlanActive('1_day'),
      disabled: false,
      discount: null
    }
  ];

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-[#E1F5EE] via-white to-[#E1F5EE]">
        <div
          className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-40 ${isCollapsed ? 'md:w-16' : 'md:w-64'}`}>
          <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={() => {}} />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1D9E75] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading subscription details...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#E1F5EE] via-white to-[#E1F5EE]">
      <div
        className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-40 ${isCollapsed ? 'md:w-16' : 'md:w-64'}`}>
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={() => {}} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-8">

            <div className="text-center mb-16">
              <h1 className="text-5xl font-black bg-gradient-to-r from-[#0F6E56] via-[#1D9E75] to-[#1A8FA8] bg-clip-text text-transparent mb-6 tracking-tight">Subscription Plans</h1>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto font-medium leading-relaxed">
                Choose a plan that fits your library's growth journey and unlock the full potential of modern library management
              </p>
            </div>
            {/* Platform-specific subscription controls */}
            {isCordova && (
              <div className="mb-10 rounded-2xl border border-[#9FE1CB] bg-white p-6 shadow-xl sm:p-8">
                {/* RevenueCat-powered paywall: fetches offerings dynamically and
                    handles purchase + restore. Premium unlocks automatically via
                    the RevenueCat customer-info listener in RevenueCatContext. */}
                <PaywallContent
                  onPremiumGranted={() => {
                    // Refresh local subscription banner + session after unlock.
                    queryClient.invalidateQueries({ queryKey: ['subscription'] });
                    (async () => {
                      try {
                        const response = await axios.get(`${API_BASE_URL}/subscriptions/status`, { withCredentials: true });
                        setSubscriptionInfo(response.data.subscription);
                        await refreshUser();
                      } catch {}
                    })();
                  }}
                />
              </div>
            )}

            {isWeb && (
              <div className="bg-[#E1F5EE] border border-[#9FE1CB] text-[#0F6E56] rounded-xl p-5 mb-10">
                <div className="font-bold mb-1">Subscriptions are managed in the Havenn mobile app</div>
                <div className="text-sm text-[#0D6B82]">
                  If you’ve already subscribed on the app, your access will be reflected here automatically.
                </div>
              </div>
            )}

        {/* Trial status banner */}
        {user?.is_trial && subscriptionInfo?.daysLeft !== null && subscriptionInfo?.daysLeft > 0 && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-8 text-center">
            <p className="font-bold">🟢 14-Day Free Trial Active – {subscriptionInfo.daysLeft} Days Left</p>
            <p className="text-sm mt-1">Enjoy unlimited students and full access to all features!</p>
          </div>
        )}

        {/* Motivational section */}
        <div className="bg-gradient-to-r from-[#0F6E56] via-[#1D9E75] to-[#1A8FA8] rounded-2xl shadow-2xl p-8 mb-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#5DCAA5] to-[#1A8FA8] opacity-20 animate-pulse"></div>
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 drop-shadow-lg">Most people don't finish what they start. Not you.</h2>
            <p className="text-lg text-[#E1F5EE] font-medium leading-relaxed">
              This subscription isn't just a payment — it's your decision to run things smarter.
              And it starts now.
            </p>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`bg-white rounded-2xl shadow-2xl overflow-hidden border-2 relative transform hover:scale-105 transition-all duration-300 hover:shadow-3xl ${
                plan.isCurrent ? 'border-[#1D9E75] ring-4 ring-[#9FE1CB]' : 'border-gray-200'
              }`}
            >
              {/* Card Header with Gradient */}
              <div className="h-2 bg-gradient-to-r from-[#0F6E56] to-[#9FE1CB]"></div>
              
              <div className="p-8">
                <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">{plan.name}</h3>
                <p className="text-gray-600 mb-6 font-medium text-lg leading-relaxed">{plan.description}</p>
                
                {/* Pricing */}
                <div className="mb-8 space-y-2">
                  {plan.originalPrice && (
                    <div className="text-lg font-semibold text-gray-400 line-through">{plan.originalPrice}</div>
                  )}
                  <div className="text-4xl font-black bg-gradient-to-r from-[#1D9E75] to-[#1A8FA8] bg-clip-text text-transparent">{plan.price}</div>
                  {plan.discount && (
                    <span className="inline-flex items-center px-3 py-1 text-sm font-bold text-white rounded-full bg-gradient-to-r from-red-500 via-[#E1F5EE] to-rose-500 shadow-lg">
                      {plan.discount}
                    </span>
                  )}
                </div>
                
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center group">
                      <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-1 mr-4 group-hover:scale-110 transition-transform duration-200">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-700 font-medium text-lg group-hover:text-gray-900 transition-colors duration-200">{feature}</span>
                    </li>
                  ))}
                </ul>
                
              </div>
            </div>
          ))}
          
          {/* 9-Month Plan */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-200 relative transform hover:scale-105 transition-all duration-300 hover:shadow-3xl">
            {/* Card Header with Standard Gradient */}
            <div className="h-2 bg-gradient-to-r from-[#0F6E56] to-[#9FE1CB]"></div>
            
            <div className="p-8">
              <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">9-Month Plan</h3>
              <p className="text-gray-600 mb-6 font-medium text-lg leading-relaxed">The Transformation Period</p>
              
              {/* Pricing */}
              <div className="mb-8">
                <div className="text-4xl font-black bg-gradient-to-r from-[#1D9E75] to-[#1A8FA8] bg-clip-text text-transparent">₹2800</div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center group">
                  <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-1 mr-4 group-hover:scale-110 transition-transform duration-200">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium text-lg group-hover:text-gray-900 transition-colors duration-200">All premium features</span>
                </li>
                <li className="flex items-center group">
                  <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-1 mr-4 group-hover:scale-110 transition-transform duration-200">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium text-lg group-hover:text-gray-900 transition-colors duration-200">Best value for serious libraries</span>
                </li>
                <li className="flex items-center group">
                  <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-1 mr-4 group-hover:scale-110 transition-transform duration-200">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium text-lg group-hover:text-gray-900 transition-colors duration-200">Extended support period</span>
                </li>
              </ul>
              
              {(() => {
                const current = isPlanActive('9_month');
                return (
                  <>
                    
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Enhanced Motivational Footer */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl shadow-2xl p-8 mb-8">
            <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-black text-white mb-4 drop-shadow-lg">
                💡 Smart Investment, Smarter Results
              </h3>
              <p className="text-xl text-emerald-100 font-bold mb-2">
                "Just ₹10/day to manage your study space professionally."
              </p>
              <p className="text-lg text-emerald-100 font-medium">
                "Join 300+ libraries building distraction-free environments."
              </p>
            </div>
          </div>
          
          {/* Trust indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300">
              <div className="text-3xl mb-3">🚀</div>
              <h4 className="font-bold text-gray-900 mb-2">Fast Setup</h4>
              <p className="text-gray-600">Get started in minutes, not hours</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300">
              <div className="text-3xl mb-3">🔒</div>
              <h4 className="font-bold text-gray-900 mb-2">Secure & Reliable</h4>
              <p className="text-gray-600">Your data is safe with us</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-all duration-300">
              <div className="text-3xl mb-3">💬</div>
              <h4 className="font-bold text-gray-900 mb-2">24/7 Support</h4>
              <p className="text-gray-600">We're here when you need us</p>
            </div>
          </div>
        </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SubscriptionPlans;



