import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>; // Or a more sophisticated spinner component
  }

  if (!user || user.role !== 'admin') {
    // Redirect to the owner login page, which handles admin/staff roles
    return <Navigate to="/owner-login" />;
  }
  return <>{children}</>;
};

export default AdminRoute;