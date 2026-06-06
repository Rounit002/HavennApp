import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authFetch } from '../utils/apiConfig';
import { Eye, EyeOff, GraduationCap, Code, Phone, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface StudentLoginData {
  libraryCode: string;
  phone: string;
  password: string;
}

const StudentLogin: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<StudentLoginData>({
    libraryCode: '',
    phone: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'libraryCode' ? value.toUpperCase() : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.libraryCode || !formData.phone || !formData.password) {
      toast.error('All fields are required');
      return;
    }

    if (formData.phone.length !== 10 || !/^\d+$/.test(formData.phone)) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authFetch("/student-auth/login", {
        method: "POST",
        body: JSON.stringify({
          libraryCode: formData.libraryCode,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Welcome, ${data.student.name}!`);
        navigate('/student-dashboard');
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Student login error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-cyan-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-sm border border-white/20">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-xl">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">Student Login</h1>
            <p className="text-gray-600 font-medium">Access your library account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Enhanced Library Code */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🏛️ Library Code
              </label>
              <div className="relative">
                <Code className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="libraryCode"
                  value={formData.libraryCode}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white font-medium uppercase"
                  placeholder="Enter library code"
                  maxLength={20}
                  required
                />
              </div>
              <p className="text-xs text-blue-600 mt-2 font-medium">
                💡 Ask your library for the library code
              </p>
            </div>

            {/* Enhanced Phone Number */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📱 Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white font-medium"
                  placeholder="Enter your phone number"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            {/* Enhanced Password */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🔒 Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white font-medium"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-blue-600 mt-2 font-medium">
                💡 Your password is the same as your phone number
              </p>
            </div>

            {/* Enhanced Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl font-black text-lg hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
            >
              {isLoading ? '🔄 Signing In...' : '🎓 Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl p-4">
              <p className="text-gray-700 text-sm font-medium">
                📚 Don't have an account? Contact your library to get registered.
              </p>
            </div>
          </div>

          <div className="mt-4 text-center space-y-2">
            <Link to="/owner-login" className="block text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors duration-200">
              🏢 Library Owner Login →
            </Link>
            <Link to="/" className="block text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors duration-200">
              ← 🏛️ Register Library
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
