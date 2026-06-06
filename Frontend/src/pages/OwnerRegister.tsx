import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authFetch } from '../utils/apiConfig';
import { Eye, EyeOff, Building2, User, Mail, Phone, Lock, Code } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface RegistrationData {
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  libraryName: string;
  password: string;
  confirmPassword: string;
  libraryCode: string;
}

const OwnerRegister: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegistrationData>({
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    libraryName: '',
    password: '',
    confirmPassword: '',
    libraryCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Reset code availability when library code changes
    if (name === 'libraryCode') {
      setCodeAvailable(null);
    }
  };

  const checkLibraryCode = async () => {
    if (!formData.libraryCode || formData.libraryCode.length < 3) {
      setCodeAvailable(null);
      return;
    }

    setCheckingCode(true);
    try {
      const response = await authFetch(`/owner-auth/check-code/${formData.libraryCode}`);
      const data = await response.json();
      setCodeAvailable(data.available);
    } catch (error) {
      console.error('Error checking library code:', error);
      toast.error('Error checking library code availability');
    } finally {
      setCheckingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.ownerName || !formData.ownerEmail || !formData.ownerPhone || 
        !formData.libraryName || !formData.password || !formData.confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (formData.ownerPhone.length !== 10 || !/^\d+$/.test(formData.ownerPhone)) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    if (formData.libraryCode && codeAvailable === false) {
      toast.error('Library code is not available. Please choose a different one.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authFetch('/owner-auth/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Registration successful! Please login with your credentials.');
        navigate('/owner-login');
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-600 to-orange-400 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Register Your Library</h1>
          <p className="text-gray-600 mt-2">Create an account to manage your library</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Owner Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Owner Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your full name"
                required
              />
            </div>
          </div>

          {/* Owner Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                name="ownerEmail"
                value={formData.ownerEmail}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {/* Owner Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="tel"
                name="ownerPhone"
                value={formData.ownerPhone}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter 10-digit phone number"
                maxLength={10}
                required
              />
            </div>
          </div>

          {/* Library Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Library Name *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                name="libraryName"
                value={formData.libraryName}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your library name"
                required
              />
            </div>
          </div>

          {/* Library Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Library Code *
            </label>
            <div className="relative">
              <Code className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                name="libraryCode"
                value={formData.libraryCode}
                onChange={handleInputChange}
                onBlur={checkLibraryCode}
                className={`w-full pl-10 pr-20 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  codeAvailable === true ? 'border-green-300' : 
                  codeAvailable === false ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Leave empty to auto-generate"
                maxLength={20}
              />
              {checkingCode && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                </div>
              )}
              {!checkingCode && codeAvailable === true && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 text-sm">
                  ✓ Available
                </div>
              )}
              {!checkingCode && codeAvailable === false && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-600 text-sm">
                  ✗ Taken
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Students will use this code to log in. If left empty, we'll generate one for you.
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter password (min 6 characters)"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-orange-400 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? 'Creating Account...' : 'Register Library'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/owner-login" className="text-purple-600 hover:text-purple-700 font-medium">
              Sign in here
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link to="/student-login" className="text-sm text-gray-500 hover:text-gray-700">
            Student Login →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OwnerRegister;
