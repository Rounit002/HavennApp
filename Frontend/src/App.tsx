import { Toaster } from 'sonner';
import { Toaster as HotToaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TooltipProvider } from './components/ui/tooltip';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RevenueCatProvider } from './context/RevenueCatContext';
import Paywall from './components/Paywall';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ActiveStudents from './pages/ActiveStudents';
import AllStudents from './pages/AllStudents';
import ExpiringMembershipsPage from './pages/ExpiringMembershipsPage';
import ExpiredMemberships from './pages/ExpiredMemberships';
import StudentDetails from './pages/StudentDetails';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import AdminRoute from './components/AdminRoute';
import AddUserForm from './components/AddUserForm';
import AddStudentForm from './components/AddStudentForm';
import EditStudentForm from './components/EditStudentForm';
import SeatsPage from './pages/SeatsPage';
import ShiftList from './pages/ShiftList';
import ShiftStudents from './pages/ShiftStudents';
import HostelPage from './pages/HostelPage';
import BranchStudentsPage from './pages/BranchStudentsPage';
import HostelStudentDetails from './pages/HostelStudentDetails';
import EditHostelStudent from './pages/EditHostelStudent';
import TransactionsPage from './pages/TransactionsPage';
import CollectionDue from './pages/CollectionDue';
import Expenses from './pages/Expenses';
import ProfitLoss from './pages/ProfitLoss';
import HostelCollectionDue from './pages/HostelCollectionDue';
import ExpiredHostelMemberships from './pages/ExpiredHostelMemberships';
import ManageBranches from './pages/ManageBranches'; 
import ProductsPage from './pages/ProductsPage'; 
import HostelDashboard from './pages/HostelDashboard';
import ActiveHostelStudents from './pages/ActiveHostelStudents';
import InactiveStudents from './pages/InactiveStudents';
import LockerManagement from './pages/LockerManagement';
import EnhancedAttendance from './pages/EnhancedAttendance';
import QRCodeTest from './components/QRCodeTest';
import SubscriptionPlans from './pages/SubscriptionPlans';
import DeleteAccount from './pages/DeleteAccount';
import { isCordova } from './utils/platformUtils';

// Multi-tenant pages
import OwnerRegister from './pages/OwnerRegister';
import OwnerLogin from './pages/OwnerLogin';
import StudentLogin from './pages/StudentLogin';
import StudentDashboard from './pages/StudentDashboard';
import LandingPage from './pages/LandingPage';
import Root from './pages/Root';
import BarcodePage from './pages/BarcodePage';
import Announcements from './pages/Announcements';
import PublicQueries from './pages/PublicQueries';
import AdminQueries from './pages/AdminQueries';
import QueryDetail from './pages/QueryDetail';
import NewQuery from './pages/NewQuery';
import AdmissionRequests from './pages/AdmissionRequests';
import PublicRegistration from './pages/PublicRegistration';
import ManagePublicRegistration from './pages/ManagePublicRegistration';
import RegistrationStatus from './pages/RegistrationStatus';
import AdvancedPayment from './pages/AdvancedPayment';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/owner-login" />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Multi-tenant routes */}
      <Route path="/owner-register" element={<OwnerRegister />} />
      <Route path="/owner-login" element={<OwnerLogin />} />
      <Route path="/student-login" element={<StudentLogin />} />
      <Route path="/student-dashboard" element={<StudentDashboard />} />
      

      
      {/* Landing page as default */}
      <Route path="/" element={<Root />} />
      
      {/* Admin/staff access through owner login - dashboard still accessible */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/barcode" element={<ProtectedRoute><BarcodePage /></ProtectedRoute>} />
      
      <Route path="/hostel-dashboard" element={<ProtectedRoute><HostelDashboard /></ProtectedRoute>} />
      <Route path="/hostel/active-students" element={<ProtectedRoute><ActiveHostelStudents /></ProtectedRoute>} />

      <Route path="/students" element={<ProtectedRoute><AllStudents /></ProtectedRoute>} />
      <Route path="/students/add" element={<ProtectedRoute><AddStudentForm /></ProtectedRoute>} />
      <Route path="/students/:id" element={<ProtectedRoute><StudentDetails /></ProtectedRoute>} />
      <Route path="/students/:id/edit" element={<ProtectedRoute><EditStudentForm /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><EnhancedAttendance /></ProtectedRoute>} />
      <Route path="/qr-test" element={<ProtectedRoute><QRCodeTest /></ProtectedRoute>} />
      <Route path="/active-students" element={<ProtectedRoute><ActiveStudents /></ProtectedRoute>} />
      <Route path="/expired-memberships" element={<ProtectedRoute><ExpiredMemberships /></ProtectedRoute>} />
      <Route path="/expiring-memberships" element={<ProtectedRoute><ExpiringMembershipsPage /></ProtectedRoute>} />
      <Route path="/inactive-students" element={<ProtectedRoute><InactiveStudents /></ProtectedRoute>} />
      <Route path="/expiring-memberships" element={<ProtectedRoute><ExpiringMembershipsPage /></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
      <Route path="/shifts" element={<ProtectedRoute><ShiftList /></ProtectedRoute>} />
      <Route path="/shifts/:id/students" element={<ProtectedRoute><ShiftStudents /></ProtectedRoute>} />
      <Route path="/seats" element={<ProtectedRoute><SeatsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/delete-account" element={<ProtectedRoute><DeleteAccount /></ProtectedRoute>} />
      <Route path="/users/new" element={<AdminRoute><AddUserForm /></AdminRoute>} />
      <Route path="/hostel" element={<ProtectedRoute><HostelPage /></ProtectedRoute>} />
      <Route path="/hostel/branches/:branchId/students" element={<ProtectedRoute><BranchStudentsPage /></ProtectedRoute>} />
      <Route path="/hostel/students/:id" element={<ProtectedRoute><HostelStudentDetails /></ProtectedRoute>} />
      <Route path="/hostel/students/:id/edit" element={<ProtectedRoute><EditHostelStudent /></ProtectedRoute>} />
      <Route path="/hostel/collections" element={<ProtectedRoute><HostelCollectionDue /></ProtectedRoute>} />
      <Route path="/hostel/expired" element={<ProtectedRoute><ExpiredHostelMemberships /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
      <Route path="/advanced-payment" element={<ProtectedRoute><AdvancedPayment /></ProtectedRoute>} />
      <Route path="/collections" element={<ProtectedRoute><CollectionDue /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
      <Route path="/profit-loss" element={<ProtectedRoute><ProfitLoss /></ProtectedRoute>} />
      <Route path="/public-registration" element={<ProtectedRoute><ManagePublicRegistration /></ProtectedRoute>} />
      <Route path="/branches" element={<ProtectedRoute><ManageBranches /></ProtectedRoute>} /> 
      <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} /> 
      <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
      <Route path="/admission-requests" element={<ProtectedRoute><AdmissionRequests /></ProtectedRoute>} />
      <Route path="/register/:libraryCode" element={<PublicRegistration />} />
      <Route path="/registration-status/:libraryCode?/:phone?" element={<RegistrationStatus />} />
            <Route path="/public-queries" element={<ProtectedRoute><PublicQueries /></ProtectedRoute>} />
      <Route path="/admin/queries" element={<AdminRoute><AdminQueries /></AdminRoute>} />
      <Route path="/queries/new" element={<ProtectedRoute><NewQuery /></ProtectedRoute>} />
      <Route path="/queries/:id" element={<ProtectedRoute><QueryDetail /></ProtectedRoute>} />
      <Route path="/lockers" element={<ProtectedRoute><LockerManagement /></ProtectedRoute>} />
      {isCordova && (
        <Route path="/subscription" element={<ProtectedRoute><SubscriptionPlans /></ProtectedRoute>} />
      )}
      {!isCordova && (
        <Route path="/subscription" element={<Navigate to="/dashboard" replace />} />
      )}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <RevenueCatProvider>
            <HashRouter>
              <AppRoutes />
              {/* Global paywall modal – opened via useRevenueCat().openPaywall() */}
              <Paywall />
              <Toaster />
              <HotToaster position="top-right" />
            </HashRouter>
          </RevenueCatProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
