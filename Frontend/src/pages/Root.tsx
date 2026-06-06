import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LandingPage from './LandingPage';

const Root: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-lg font-semibold text-gray-700">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    const dashboardPath = user?.role === 'student' ? '/student-dashboard' : '/dashboard';
    return <Navigate to={dashboardPath} replace />;
  }

  return <LandingPage />;
};

export default Root;
