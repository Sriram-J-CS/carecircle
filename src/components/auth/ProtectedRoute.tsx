import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, getDashboardPathForRole } from '../../context/AuthContext';
import { UserRole } from '../../types/api';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-teal-900">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-xl font-bold">Verifying your CareCircle session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If logged in as wrong role, redirect to their own role dashboard
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  return <>{children}</>;
};
