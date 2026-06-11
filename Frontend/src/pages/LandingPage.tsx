import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { BookOpen, Users, GraduationCap, Zap, Shield, Sparkles } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E1F5EE] via-[#E1F5EE] to-[#9FE1CB] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#1D9E75] to-[#1A8FA8] rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-[#5DCAA5] to-[#1A8FA8] rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full opacity-10 animate-spin" style={{animationDuration: '20s'}}></div>
      </div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="max-w-7xl w-full">
          
          {/* Responsive Main Content */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start justify-center">
            {/* Main Content - Responsive Centered */}
            <div className="flex-1 w-full max-w-4xl mx-auto px-2 sm:px-4 lg:px-0">
              {/* Responsive Header */}
              <div className="text-center mb-8 sm:mb-12 lg:mb-16">
                <div className="flex flex-col sm:flex-row items-center justify-center mb-6 sm:mb-8">
                  <div className="relative mb-4 sm:mb-0">
                    <BookOpen className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 text-transparent bg-gradient-to-r from-[#0F6E56] via-[#1D9E75] to-[#1A8FA8] bg-clip-text sm:mr-4 lg:mr-6" style={{WebkitBackgroundClip: 'text'}} />
                    <Sparkles className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-yellow-400 animate-bounce" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-[#0F6E56] via-[#1D9E75] to-[#1A8FA8] bg-clip-text text-transparent tracking-tight">
                      HAVENN
                    </h1>
                    <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-700 mt-2 lg:mt-3">
                      Library Management System
                    </div>
                  </div>
                </div>
              </div>

              {/* 14-Day Free Trial Banner */}
              <div className="relative mb-8 sm:mb-12">
                <div className="absolute inset-0 blur-xl bg-gradient-to-r from-[#1D9E75]/30 via-[#E1F5EE]/30 to-[#1A8FA8]/30 rounded-3xl"></div>
                <div className="relative bg-white/90 backdrop-blur border border-[#1D9E75]/30 shadow-2xl rounded-3xl p-6 sm:p-8">
                  <div className="text-center">
                    <p className="uppercase text-xs sm:text-sm tracking-[0.3em] font-bold text-[#1D9E75] mb-2">Limited Time Offer</p>
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
                      <span className="bg-gradient-to-r from-[#0F6E56] via-[#1D9E75] to-[#1A8FA8] bg-clip-text text-transparent">
                        14 Days Free Trial
                      </span>
                    </h2>
                    <p className="text-gray-700 text-base sm:text-lg font-semibold mb-4">
                      Unlimited students · Full feature access · No credit card required
                    </p>
                    <button
                      onClick={() => navigate('/owner-register')}
                      className="px-6 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-[#0F6E56] via-[#1D9E75] to-[#1A8FA8] shadow-2xl hover:scale-105 transition-all duration-300"
                    >
                      Start Your Free Trial
                    </button>
                  </div>
                </div>
              </div>

              {/* Responsive User Type Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto mb-8 sm:mb-12 lg:mb-16">
                {/* Library Owner Card */}
                <Card className="relative overflow-hidden bg-gradient-to-br from-white via-[#E1F5EE] to-[#C6F0DF] hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-[#9FE1CB] transform hover:scale-105">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0F6E56]/10 to-[#1A8FA8]/10"></div>
                  <CardHeader className="text-center relative z-10">
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0F6E56] to-[#1A8FA8] rounded-full blur-lg opacity-30"></div>
                        <div className="relative bg-gradient-to-r from-[#0F6E56] to-[#1A8FA8] p-3 rounded-full">
                          <Users className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-xl font-black bg-gradient-to-r from-[#0F6E56] to-[#1A8FA8] bg-clip-text text-transparent">
                      🏢 Library Owner / Staff
                    </CardTitle>
                    <CardDescription className="text-gray-700 font-medium text-sm">
                      Complete library ecosystem management with advanced analytics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 relative z-10 p-4 sm:p-6">
                    <Button 
                      onClick={() => navigate('/owner-login')}
                      className="w-full bg-gradient-to-r from-[#0F6E56] via-[#1D9E75] to-[#1A8FA8] hover:from-[#0F6E56] hover:via-[#0F6E56] hover:to-[#0D6B82] text-white font-bold py-3 sm:py-4 text-sm sm:text-base rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                    >
                      🚀 Owner Login
                    </Button>
                    <Button 
                      onClick={() => navigate('/owner-register')}
                      variant="outline" 
                      className="w-full border-2 border-[#1D9E75] text-[#0F6E56] hover:bg-gradient-to-r hover:from-[#E1F5EE] hover:to-[#C6F0DF] font-bold py-3 sm:py-4 text-sm sm:text-base rounded-xl transition-all duration-300 transform hover:scale-105"
                    >
                      ✨ Register New Library
                    </Button>
                    <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-gray-600 font-medium">
                      <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-[#0D6B82]" />
                      <span>Secure & Multi-tenant</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Student Card */}
                <Card className="relative overflow-hidden bg-gradient-to-br from-white via-[#E1F5EE] to-[#C6F0DF] hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-[#9FE1CB] transform hover:scale-105">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1D9E75]/10 to-[#1A8FA8]/10"></div>
                  <CardHeader className="text-center relative z-10">
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0F6E56] to-[#1A8FA8] rounded-full blur-lg opacity-30"></div>
                        <div className="relative bg-gradient-to-r from-[#0F6E56] to-[#1A8FA8] p-3 rounded-full">
                          <GraduationCap className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-xl font-black bg-gradient-to-r from-[#0F6E56] to-[#1A8FA8] bg-clip-text text-transparent">
                      🎓 Student Access
                    </CardTitle>
                    <CardDescription className="text-gray-700 font-medium text-sm">
                      Smart attendance tracking and personalized dashboard
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 relative z-10 p-4 sm:p-6">
                    <Button 
                      onClick={() => navigate('/student-login')}
                      className="w-full bg-gradient-to-r from-[#0F6E56] via-[#1D9E75] to-[#1A8FA8] hover:from-[#0F6E56] hover:via-[#0F6E56] hover:to-[#0D6B82] text-white font-bold py-3 sm:py-4 text-sm sm:text-base rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                    >
                      🎯 Student Login
                    </Button>
                    <div className="bg-gradient-to-r from-[#E1F5EE] to-[#C6F0DF] rounded-xl p-2 sm:p-3 text-center mb-3">
                      <div className="text-xs sm:text-sm text-[#0F6E56] font-bold">
                        💡 Use library code + phone number
                      </div>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-gray-600 font-medium">
                      <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-[#0D6B82]" />
                      <span>Quick & Easy Access</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;





