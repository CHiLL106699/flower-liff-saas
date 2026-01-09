import { SuperAdminAuthProvider, useSuperAdminAuth } from '../../contexts/SuperAdminAuthContext';
import SuperAdminLogin from './SuperAdminLogin';
import SuperAdminDashboard from './SuperAdminDashboard';

function SuperAdminContent() {
  const { isAuthenticated, isLoading } = useSuperAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return isAuthenticated ? <SuperAdminDashboard /> : <SuperAdminLogin />;
}

export default function SuperAdminPage() {
  return (
    <SuperAdminAuthProvider>
      <SuperAdminContent />
    </SuperAdminAuthProvider>
  );
}
