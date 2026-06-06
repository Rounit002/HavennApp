import React, { useState } from 'react';
import { Mail, Phone, Lock, ArrowLeft, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authFetch } from '../utils/apiConfig';
import api from '../services/api';

interface ForgotPasswordProps {
  onBack: () => void;
  mode: 'owner' | 'user';
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack, mode }) => {
  const [step, setStep] = useState<'verify' | 'reset'>('verify');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationData, setVerificationData] = useState({
    email: '',
    phone: '',
    libraryCode: ''
  });
  const [resetData, setResetData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let response;
      
      if (mode === 'owner') {
        // Owner forgot password
        response = await authFetch('/owner-auth/forgot-password/verify', {
          method: 'POST',
          body: JSON.stringify({
            email: verificationData.email,
            phone: verificationData.phone
          }),
        });
      } else {
        // Staff/Admin forgot password
        response = await authFetch('/auth/forgot-password/verify', {
          method: 'POST',
          body: JSON.stringify({
            email: verificationData.email,
            phone: verificationData.phone,
            libraryCode: verificationData.libraryCode
          }),
        });
      }

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Account verified! You can now reset your password.');
        setStep('reset');
      } else {
        toast.error(data.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (resetData.newPassword !== resetData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (resetData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      let response;
      
      if (mode === 'owner') {
        response = await authFetch('/owner-auth/forgot-password/reset', {
          method: 'POST',
          body: JSON.stringify(resetData),
        });
      } else {
        response = await authFetch('/auth/forgot-password/reset', {
          method: 'POST',
          body: JSON.stringify(resetData),
        });
      }

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Password reset successfully! You can now log in.');
        onBack(); // Go back to login
      } else {
        toast.error(data.message || 'Password reset failed');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-600 to-orange-400 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {step === 'verify' ? 'Forgot Password' : 'Reset Password'}
        </h1>
        <p className="text-gray-600 mt-2">
          {step === 'verify' 
            ? `Verify your ${mode === 'owner' ? 'owner' : 'staff'} account` 
            : 'Enter your new password'
          }
        </p>
      </div>

      {step === 'verify' ? (
        <form onSubmit={handleVerificationSubmit} className="space-y-6">
          {mode === 'user' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Library Code</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={verificationData.libraryCode}
                  onChange={(e) => setVerificationData(prev => ({ ...prev, libraryCode: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter library code"
                  required
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={verificationData.email}
                onChange={(e) => setVerificationData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your email address"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="tel"
                value={verificationData.phone}
                onChange={(e) => setVerificationData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your phone number"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-orange-400 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? 'Verifying...' : 'Verify Account'}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePasswordReset} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={resetData.newPassword}
                onChange={(e) => setResetData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter new password"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={resetData.confirmPassword}
                onChange={(e) => setResetData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-orange-400 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <button
          onClick={onBack}
          className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;
