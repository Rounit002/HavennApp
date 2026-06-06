import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../utils/apiConfig';
import { toast } from 'react-hot-toast';
import { 
  User, 
  Calendar, 
  Clock, 
  CreditCard, 
  QrCode, 
  Phone, 
  Mail, 
  MapPin, 
  IdCard, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  History,
  Wallet,
  FileText,
  LogOut,
  Megaphone,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import InvoiceButton from '../components/InvoiceButton';
import api from '../services/api';
import BarcodeScanner from '../components/BarcodeScanner';
import StudentAnnouncements from '../components/StudentAnnouncements';
import PublicQueries from './PublicQueries';

interface StudentProfile {
  id: number;
  name: string;
  phone: string;
  email: string;
  registrationNumber: string;
  address: string;
  membershipStart: string;
  membershipEnd: string;
  status: string;
  branchId?: number;
  totalFee: number;
  amountPaid: number;
  dueAmount: number;
  cash: number;
  online: number;
  securityMoney: number;
  discount: number;
  fatherName?: string;
  remark?: string;
  profileImageUrl?: string;
  assignments?: Array<{
    seatId: number;
    shiftId: number;
    seatNumber: string;
    shiftTitle: string;
  }>;
}

interface AttendanceHistoryRecord {
  id: number;
  date: string;
  firstIn: string | null;
  lastOut: string | null;
  totalScans?: number;
}

interface MembershipHistoryRecord {
  id: number;
  membershipStart: string;
  membershipEnd: string;
  totalFee: number;
  amountPaid: number;
  dueAmount: number;
  changed_at: string;
  status: string;
  shift_id?: number;
  seat_id?: number;
  email?: string;
  phone?: string;
  address?: string;
  profile_image_url?: string;
  name?: string;
  cash?: number;
  online?: number;
  remark?: string;
}

interface TransactionRecord {
  id: number;
  amount: number;
  date: string;
  created_at: string;
  type: string;
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistoryRecord[]>([]);
  const [membershipHistory, setMembershipHistory] = useState<MembershipHistoryRecord[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<Array<{
    month: string;
    totalFee: number;
    totalPaid: number;
    totalDue: number;
    records: MembershipHistoryRecord[];
  }>>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'membership' | 'transactions' | 'announcements' | 'queries'>('overview');
  
  // New states for interactive attendance
  const [attendanceView, setAttendanceView] = useState<'daily' | 'monthly'>('monthly');
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(new Date());
  const [attendanceLoading, setAttendanceLoading] = useState(false);


  const [attendanceStatus, setAttendanceStatus] = useState<{
    hasMarkedToday: boolean;
    nextAction: 'in' | 'out';
    totalScans: number;
    firstIn?: string | null;
    lastOut?: string | null;
    currentStatus?: 'checked_in' | 'checked_out';
  } | null>(null);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);

  // Fetch attendance status
  const fetchAttendanceStatus = async () => {
    try {
      const status = await api.getAttendanceStatus();
      setAttendanceStatus(status);
    } catch (error) {
      console.error('Error fetching attendance status:', error);
      toast.error('Failed to load attendance status');
    }
  };

  // Handle attendance toggle
  const handleToggleAttendance = async () => {
    if (isMarkingAttendance) return;
    
    try {
      setIsMarkingAttendance(true);
      const result = await api.toggleAttendance('Marked via student dashboard');
      
      // Update local state
      setAttendanceStatus(prev => ({
        ...prev,
        hasMarkedToday: true,
        nextAction: result.action === 'checked in' ? 'out' : 'in',
        totalScans: result.totalToday,
        currentStatus: result.action === 'checked in' ? 'checked_in' : 'checked_out',
        ...(result.action === 'checked in' ? { firstIn: result.record.created_at } : { lastOut: result.record.created_at })
      }));
      
      // Refresh attendance history
      await fetchAttendanceRecords();
      
      toast.success(`Successfully ${result.action}`);
    } catch (error) {
      console.error('Error toggling attendance:', error);
      toast.error(`Failed to mark attendance: ${error.message}`);
    } finally {
      setIsMarkingAttendance(false);
    }
  };
  
    // Function to fetch attendance records with proper date handling for monthly view
    const fetchAttendanceRecords = useCallback(async () => {
        if (!profile) return;
        setAttendanceLoading(true);
        try {
            const params: any = {
                view: attendanceView,
            };

            if (attendanceView === 'monthly') {
                // For monthly view, send month and year as separate parameters
                params.month = selectedAttendanceDate.getMonth() + 1; // getMonth() is 0-indexed
                params.year = selectedAttendanceDate.getFullYear();
            } else {
                // For daily view, send the specific date
                params.date = selectedAttendanceDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            }
            
            console.log('Fetching attendance with params:', params); // Debug log
            const data = await api.getStudentAttendanceHistory(params);
            setAttendanceHistory(data.attendance || []);
        } catch (error) {
            toast.error('Failed to fetch attendance records.');
            console.error('Error fetching attendance data:', error);
        } finally {
            setAttendanceLoading(false);
        }
    }, [profile, attendanceView, selectedAttendanceDate]);


  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [profileData, membershipData, transactionData] = await Promise.all([
          api.getStudentProfile(),
          api.getStudentMembershipHistory(),
          api.getStudentTransactions()
        ]);

        if (profileData && profileData.student) {
          setProfile(profileData.student);
        }

        if (membershipData) {
          if (membershipData.membershipHistory) {
            setMembershipHistory(membershipData.membershipHistory);
          }
          if ((membershipData as any).monthlySummary) {
            setMonthlySummary((membershipData as any).monthlySummary);
          }
        }

        if (transactionData && transactionData.transactions) {
          setTransactions(transactionData.transactions);
        }

        // Fetch attendance status
        await fetchAttendanceStatus();

      } catch (error) {
        toast.error('Failed to load student data.');
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

    // Effect to fetch attendance when tab/view/date changes
    useEffect(() => {
        if (activeTab === 'attendance' && profile) {
            fetchAttendanceRecords();
        }
    }, [activeTab, profile, fetchAttendanceRecords]);

  const handleScanSuccess = async (scannedData: string) => {
    setShowScanner(false);
    try {
      const response = await api.markAttendanceWithQR(scannedData);
      if (response && response.message) {
        toast.success(response.message);
        // Refresh attendance data
        await fetchAttendanceRecords();
      }
    } catch (error) {
      toast.error('Failed to mark attendance.');
      console.error('Error marking attendance with QR:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await authFetch('/student-auth/logout', { method: 'POST' });
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'expired':
        return 'text-red-600 bg-red-100';
      case 'inactive':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'expired':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number | string | undefined | null): string => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (numericAmount === null || numericAmount === undefined || isNaN(numericAmount)) {
      return '₹0.00';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount);
  };

  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | undefined | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpiringSoon = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    return end < now;
  };

  const downloadInvoiceAsPdf = async () => {
    try {
      const invoiceElement = document.getElementById('invoice');
      if (!invoiceElement) return;
      
      const canvas = await html2canvas(invoiceElement, { 
        scale: 2,
        useCORS: true,
        logging: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate invoice PDF');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-center">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Could not load profile</h2>
          <p className="text-gray-600 mb-4">Please try refreshing the page or contact support.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {profile.name}!</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto whitespace-nowrap w-full sm:w-auto">
              <InvoiceButton 
                studentId={profile.id} 
                studentName={profile.name}
                className="mr-2 shrink-0"
                id="invoice"
              >
                <div className="p-8 bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
                  {/* Header */}
                  <div className="border-b-4 border-blue-600 pb-4 mb-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
                        <p className="text-sm text-gray-600 mt-1">Library Membership Receipt</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Invoice Date</p>
                        <p className="text-lg font-semibold">{formatDate(new Date().toISOString())}</p>
                        {profile.registrationNumber && (
                          <>
                            <p className="text-sm text-gray-600 mt-2">Registration No.</p>
                            <p className="font-semibold">{profile.registrationNumber}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bill To & Membership Info */}
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Bill To:</h3>
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-gray-900">{profile.name}</p>
                        {profile.fatherName && <p className="text-sm text-gray-700">S/O: {profile.fatherName}</p>}
                        <p className="text-sm text-gray-700">{profile.phone}</p>
                        {profile.email && <p className="text-sm text-gray-700">{profile.email}</p>}
                        {profile.address && <p className="text-sm text-gray-700">{profile.address}</p>}
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-sm font-semibold text-blue-900 uppercase mb-3">Membership Details</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-700">Start Date:</span>
                          <span className="text-sm font-semibold">{formatDate(profile.membershipStart)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-700">Expiry Date:</span>
                          <span className="text-sm font-semibold">{formatDate(profile.membershipEnd)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-700">Status:</span>
                          <span className={`text-sm font-semibold ${
                            profile.status === 'active' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {profile.status.toUpperCase()}
                          </span>
                        </div>
                        {profile.assignments && profile.assignments.length > 0 && (
                          <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
                            <span className="text-sm text-gray-700">Seat Number:</span>
                            <span className="text-sm font-bold text-blue-900">{profile.assignments[0].seatNumber}</span>
                          </div>
                        )}
                        {profile.assignments && profile.assignments.length > 0 && profile.assignments[0].shiftTitle && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-700">Shift:</span>
                            <span className="text-sm font-semibold">{profile.assignments[0].shiftTitle}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Billing Details Table */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Billing Details</h3>
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">Description</th>
                          <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm">Membership Fee</td>
                          <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold">{formatCurrency(profile.totalFee)}</td>
                        </tr>
                        {profile.discount > 0 && (
                          <tr>
                            <td className="border border-gray-300 px-4 py-3 text-sm">Discount</td>
                            <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-green-600">- {formatCurrency(profile.discount)}</td>
                          </tr>
                        )}
                        {profile.securityMoney > 0 && (
                          <tr>
                            <td className="border border-gray-300 px-4 py-3 text-sm">Security Deposit</td>
                            <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold">{formatCurrency(profile.securityMoney)}</td>
                          </tr>
                        )}
                        <tr className="bg-gray-50 font-bold">
                          <td className="border border-gray-300 px-4 py-3 text-sm">Total Amount</td>
                          <td className="border border-gray-300 px-4 py-3 text-right text-sm">{formatCurrency((profile.amountPaid))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Payment Details */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Payment Details</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-700">Cash Payment:</span>
                          <span className="text-sm font-semibold">{formatCurrency(profile.cash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-700">Online Payment:</span>
                          <span className="text-sm font-semibold">{formatCurrency(profile.online)}</span>
                        </div>
                      </div>
                      <div className="border-t border-gray-300 pt-4 grid grid-cols-2 gap-4">
                        <div className="flex justify-between">
                          <span className="text-sm font-bold text-gray-900">Total Paid:</span>
                          <span className="text-sm font-bold text-green-600">{formatCurrency(profile.amountPaid)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-bold text-gray-900">Balance Due:</span>
                          <span className={`text-sm font-bold ${profile.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(profile.dueAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  {profile.remark && (
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Remarks</h3>
                      <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">{profile.remark}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-12 pt-6 border-t border-gray-300">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">This is a computer-generated invoice and does not require a signature.</p>
                      <p className="text-xs text-gray-600 mt-1">For any queries, please contact the library administration.</p>
                      <p className="text-xs text-gray-500 mt-4">Generated on: {new Date().toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </InvoiceButton>
              <button
                onClick={handleLogout}
                className="shrink-0 flex items-center space-x-2 bg-red-100 text-red-700 px-3 py-2 sm:px-4 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Membership Status Alert */}
        {profile.membershipEnd && (
          <div className={`mb-6 p-4 rounded-lg border ${
            isExpired(profile.membershipEnd) 
              ? 'bg-red-50 border-red-200 text-red-800'
              : isExpiringSoon(profile.membershipEnd)
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <div className="flex items-center space-x-2">
              {isExpired(profile.membershipEnd) ? (
                <XCircle className="w-5 h-5" />
              ) : isExpiringSoon(profile.membershipEnd) ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              <span className="font-medium">
                {isExpired(profile.membershipEnd) 
                  ? 'Membership Expired'
                  : isExpiringSoon(profile.membershipEnd)
                  ? 'Membership Expiring Soon'
                  : 'Membership Active'
                }
              </span>
            </div>
            <p className="mt-1 text-sm">
              {isExpired(profile.membershipEnd) 
                ? `Your membership expired on ${formatDate(profile.membershipEnd)}. Please renew to continue library services.`
                : isExpiringSoon(profile.membershipEnd)
                ? `Your membership expires on ${formatDate(profile.membershipEnd)}. Please renew soon.`
                : `Your membership is active until ${formatDate(profile.membershipEnd)}.`
              }
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <QrCode className="w-5 h-5" />
                <span>Scan QR Code</span>
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <Clock className="w-5 h-5" />
                <span>View Attendance</span>
              </button>
              <button
                onClick={() => setActiveTab('membership')}
                className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
              >
                <History className="w-5 h-5" />
                <span>Membership History</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 overflow-x-auto whitespace-nowrap px-1">
              {[
                { id: 'overview', label: 'Overview', icon: User },
                { id: 'attendance', label: 'Attendance', icon: Clock },
                { id: 'membership', label: 'Membership History', icon: History },
                // { id: 'transactions', label: 'Transactions', icon: Wallet },
                { id: 'announcements', label: 'Announcements', icon: Megaphone },
                { id: 'queries', label: 'Public Queries', icon: HelpCircle }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`shrink-0 flex items-center gap-2 py-3 px-2 sm:px-1 border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Profile Information */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Profile Information</span>
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Full Name</p>
                        <p className="font-medium text-gray-900">{profile.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone Number</p>
                        <p className="font-medium text-gray-900">{profile.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email Address</p>
                        <p className="font-medium text-gray-900">{profile.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <IdCard className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Registration Number</p>
                        <p className="font-medium text-gray-900">{profile.registrationNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium text-gray-900">{profile.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(profile.status)}
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(profile.status)}`}>
                          {profile.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Membership */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Current Membership</span>
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Membership Start Date</p>
                      <p className="text-2xl font-bold text-green-600">{formatDate(profile.membershipStart)}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Membership End Date</p>
                      <p className={`text-2xl font-bold ${
                        isExpired(profile.membershipEnd) 
                          ? 'text-red-600' 
                          : isExpiringSoon(profile.membershipEnd) 
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                      }`}>
                        {formatDate(profile.membershipEnd)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoices Section */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Invoices</span>
                  </div>
                    <InvoiceButton 
                        studentId={profile.id} 
                        studentName={profile.name}
                        className="text-sm"
                        variant="text"
                    >
                        <div className="p-8 bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
                          {/* Header */}
                          <div className="border-b-4 border-blue-600 pb-4 mb-6">
                            <div className="flex justify-between items-start">
                              <div>
                                <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
                                <p className="text-sm text-gray-600 mt-1">Library Membership Receipt</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Invoice Date</p>
                                <p className="text-lg font-semibold">{formatDate(new Date().toISOString())}</p>
                                {profile.registrationNumber && (
                                  <>
                                    <p className="text-sm text-gray-600 mt-2">Registration No.</p>
                                    <p className="font-semibold">{profile.registrationNumber}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Bill To & Membership Info */}
                          <div className="grid grid-cols-2 gap-8 mb-8">
                            <div>
                              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Bill To:</h3>
                              <div className="space-y-1">
                                <p className="text-lg font-bold text-gray-900">{profile.name}</p>
                                {profile.fatherName && <p className="text-sm text-gray-700">S/O: {profile.fatherName}</p>}
                                <p className="text-sm text-gray-700">{profile.phone}</p>
                                {profile.email && <p className="text-sm text-gray-700">{profile.email}</p>}
                                {profile.address && <p className="text-sm text-gray-700">{profile.address}</p>}
                              </div>
                            </div>
                            
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h3 className="text-sm font-semibold text-blue-900 uppercase mb-3">Membership Details</h3>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-700">Start Date:</span>
                                  <span className="text-sm font-semibold">{formatDate(profile.membershipStart)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-700">Expiry Date:</span>
                                  <span className="text-sm font-semibold">{formatDate(profile.membershipEnd)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-700">Status:</span>
                                  <span className={`text-sm font-semibold ${
                                    profile.status === 'active' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {profile.status.toUpperCase()}
                                  </span>
                                </div>
                                {profile.assignments && profile.assignments.length > 0 && (
                                  <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
                                    <span className="text-sm text-gray-700">Seat Number:</span>
                                    <span className="text-sm font-bold text-blue-900">{profile.assignments[0].seatNumber}</span>
                                  </div>
                                )}
                                {profile.assignments && profile.assignments.length > 0 && profile.assignments[0].shiftTitle && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-700">Shift:</span>
                                    <span className="text-sm font-semibold">{profile.assignments[0].shiftTitle}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Billing Details Table */}
                          <div className="mb-8">
                            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Billing Details</h3>
                            <table className="w-full border-collapse border border-gray-300">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">Description</th>
                                  <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="border border-gray-300 px-4 py-3 text-sm">Membership Fee</td>
                                  <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold">{formatCurrency(profile.totalFee)}</td>
                                </tr>
                                {profile.discount > 0 && (
                                  <tr>
                                    <td className="border border-gray-300 px-4 py-3 text-sm">Discount</td>
                                    <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-green-600">- {formatCurrency(profile.discount)}</td>
                                  </tr>
                                )}
                                {profile.securityMoney > 0 && (
                                  <tr>
                                    <td className="border border-gray-300 px-4 py-3 text-sm">Security Deposit</td>
                                    <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold">{formatCurrency(profile.securityMoney)}</td>
                                  </tr>
                                )}
                                <tr className="bg-gray-50 font-bold">
                                  <td className="border border-gray-300 px-4 py-3 text-sm">Total Amount</td>
                                  <td className="border border-gray-300 px-4 py-3 text-right text-sm">{formatCurrency((profile.totalFee - profile.discount))}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Payment Details */}
                          <div className="mb-8">
                            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Payment Details</h3>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-700">Cash Payment:</span>
                                  <span className="text-sm font-semibold">{formatCurrency(profile.cash)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-700">Online Payment:</span>
                                  <span className="text-sm font-semibold">{formatCurrency(profile.online)}</span>
                                </div>
                              </div>
                              <div className="border-t border-gray-300 pt-4 grid grid-cols-2 gap-4">
                                <div className="flex justify-between">
                                  <span className="text-sm font-bold text-gray-900">Total Paid:</span>
                                  <span className="text-sm font-bold text-green-600">{formatCurrency(profile.amountPaid)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm font-bold text-gray-900">Balance Due:</span>
                                  <span className={`text-sm font-bold ${profile.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatCurrency(profile.dueAmount)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Additional Information */}
                          {profile.remark && (
                            <div className="mb-8">
                              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Remarks</h3>
                              <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">{profile.remark}</p>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="mt-12 pt-6 border-t border-gray-300">
                            <div className="text-center">
                              <p className="text-xs text-gray-600">This is a computer-generated invoice and does not require a signature.</p>
                              <p className="text-xs text-gray-600 mt-1">For any queries, please contact the library administration.</p>
                              <p className="text-xs text-gray-500 mt-4">Generated on: {new Date().toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                    </InvoiceButton>
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    View and download your membership invoices. Click the "Download Invoice" button above to get the latest invoice.
                  </p>
                  
                  {membershipHistory.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Invoices</h4>
                      <ul className="divide-y divide-gray-200">
                        {membershipHistory.slice(0, 3).map((membership, index) => (
                          <li key={index} className="py-3 flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatDate(membership.membershipStart)} - {formatDate(membership.membershipEnd)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatCurrency(membership.amountPaid)} paid • {formatDate(membership.changed_at)}
                              </p>
                            </div>
                            <InvoiceButton 
                              studentId={profile.id} 
                              studentName={profile.name}
                              className="text-xs"
                              variant="text"
                            >
                              <div className="p-8 bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
                                {/* Same comprehensive invoice content */}
                                <div className="border-b-4 border-blue-600 pb-4 mb-6">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
                                      <p className="text-sm text-gray-600 mt-1">Library Membership Receipt</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm text-gray-600">Invoice Date</p>
                                      <p className="text-lg font-semibold">{formatDate(new Date().toISOString())}</p>
                                      {profile.registrationNumber && (
                                        <>
                                          <p className="text-sm text-gray-600 mt-2">Registration No.</p>
                                          <p className="font-semibold">{profile.registrationNumber}</p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                  <div>
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Bill To:</h3>
                                    <div className="space-y-1">
                                      <p className="text-lg font-bold text-gray-900">{profile.name}</p>
                                      {profile.fatherName && <p className="text-sm text-gray-700">S/O: {profile.fatherName}</p>}
                                      <p className="text-sm text-gray-700">{profile.phone}</p>
                                      {profile.email && <p className="text-sm text-gray-700">{profile.email}</p>}
                                      {profile.address && <p className="text-sm text-gray-700">{profile.address}</p>}
                                    </div>
                                  </div>
                                  <div className="bg-blue-50 p-4 rounded-lg">
                                    <h3 className="text-sm font-semibold text-blue-900 uppercase mb-3">Membership Details</h3>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-700">Start Date:</span>
                                        <span className="text-sm font-semibold">{formatDate(profile.membershipStart)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-700">Expiry Date:</span>
                                        <span className="text-sm font-semibold">{formatDate(profile.membershipEnd)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-700">Status:</span>
                                        <span className={`text-sm font-semibold ${profile.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>{profile.status.toUpperCase()}</span>
                                      </div>
                                      {profile.assignments && profile.assignments.length > 0 && (
                                        <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
                                          <span className="text-sm text-gray-700">Seat Number:</span>
                                          <span className="text-sm font-bold text-blue-900">{profile.assignments[0].seatNumber}</span>
                                        </div>
                                      )}
                                      {profile.assignments && profile.assignments.length > 0 && profile.assignments[0].shiftTitle && (
                                        <div className="flex justify-between">
                                          <span className="text-sm text-gray-700">Shift:</span>
                                          <span className="text-sm font-semibold">{profile.assignments[0].shiftTitle}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="mb-8">
                                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Billing Details</h3>
                                  <table className="w-full border-collapse border border-gray-300">
                                    <thead>
                                      <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold">Description</th>
                                        <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td className="border border-gray-300 px-4 py-3 text-sm">Membership Fee</td>
                                        <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold">{formatCurrency(profile.totalFee)}</td>
                                      </tr>
                                      {profile.discount > 0 && (
                                        <tr>
                                          <td className="border border-gray-300 px-4 py-3 text-sm">Discount</td>
                                          <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-green-600">- {formatCurrency(profile.discount)}</td>
                                        </tr>
                                      )}
                                      {profile.securityMoney > 0 && (
                                        <tr>
                                          <td className="border border-gray-300 px-4 py-3 text-sm">Security Deposit</td>
                                          <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold">{formatCurrency(profile.securityMoney)}</td>
                                        </tr>
                                      )}
                                      <tr className="bg-gray-50 font-bold">
                                        <td className="border border-gray-300 px-4 py-3 text-sm">Total Amount</td>
                                        <td className="border border-gray-300 px-4 py-3 text-right text-sm">{formatCurrency((profile.totalFee - profile.discount) + profile.securityMoney)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                                <div className="mb-8">
                                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Payment Details</h3>
                                  <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-700">Cash Payment:</span>
                                        <span className="text-sm font-semibold">{formatCurrency(profile.cash)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-700">Online Payment:</span>
                                        <span className="text-sm font-semibold">{formatCurrency(profile.online)}</span>
                                      </div>
                                    </div>
                                    <div className="border-t border-gray-300 pt-4 grid grid-cols-2 gap-4">
                                      <div className="flex justify-between">
                                        <span className="text-sm font-bold text-gray-900">Total Paid:</span>
                                        <span className="text-sm font-bold text-green-600">{formatCurrency(profile.amountPaid)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm font-bold text-gray-900">Balance Due:</span>
                                        <span className={`text-sm font-bold ${profile.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(profile.dueAmount)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {profile.remark && (
                                  <div className="mb-8">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Remarks</h3>
                                    <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">{profile.remark}</p>
                                  </div>
                                )}
                                <div className="mt-12 pt-6 border-t border-gray-300">
                                  <div className="text-center">
                                    <p className="text-xs text-gray-600">This is a computer-generated invoice and does not require a signature.</p>
                                    <p className="text-xs text-gray-600 mt-1">For any queries, please contact the library administration.</p>
                                    <p className="text-xs text-gray-500 mt-4">Generated on: {new Date().toLocaleString()}</p>
                                  </div>
                                </div>
                              </div>
                            </InvoiceButton>
                          </li>
                        ))}
                      </ul>
                      {membershipHistory.length > 3 && (
                        <button 
                          onClick={() => setActiveTab('membership')}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          View all invoices
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
            <div className="space-y-6">
                {/* Today's Status Card */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <Clock className="w-5 h-5"/>
                            <span>Today's Status</span>
                        </h3>
                    </div>
                    <div className="p-6">
                        {attendanceStatus ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                     <div className={`w-3 h-3 rounded-full animate-pulse ${
                                        attendanceStatus.currentStatus === 'checked_in' ? 'bg-green-500' : 'bg-gray-400'
                                    }`}></div>
                                    <div>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {attendanceStatus.currentStatus === 'checked_in' ? 'Currently Checked In' : 'Currently Checked Out'}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {attendanceStatus.hasMarkedToday 
                                                ? `First check-in today at ${attendanceStatus.firstIn ? new Date(attendanceStatus.firstIn).toLocaleTimeString('en-IN') : 'N/A'}`
                                                : 'No attendance recorded yet today.'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Next Action</p>
                                    <p className="text-lg font-semibold text-blue-600 capitalize">
                                        Scan to Check {attendanceStatus.nextAction}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p>Loading today's status...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- NEW Interactive Attendance History --- */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <History className="w-5 h-5"/>
                            <span>Attendance History</span>
                        </h3>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-gray-200 rounded-lg p-1">
                                <button onClick={() => setAttendanceView('daily')} className={`px-3 py-1 text-sm font-medium rounded-md ${attendanceView === 'daily' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-600'}`}>Daily</button>
                                <button onClick={() => setAttendanceView('monthly')} className={`px-3 py-1 text-sm font-medium rounded-md ${attendanceView === 'monthly' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-600'}`}>Monthly</button>
                            </div>
                            {attendanceView === 'daily' && (
                                <input
                                    type="date"
                                    value={selectedAttendanceDate.toISOString().split('T')[0]}
                                    onChange={(e) => setSelectedAttendanceDate(new Date(e.target.value))}
                                    className="p-1.5 border border-gray-300 rounded-lg text-sm"
                                />
                            )}
                            {attendanceView === 'monthly' && (
                                <div className="flex items-center">
                                    <button onClick={() => setSelectedAttendanceDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="p-2 rounded-l-lg bg-gray-200 hover:bg-gray-300"><ChevronLeft className="w-4 h-4"/></button>
                                    <input
                                        type="month"
                                        value={`${selectedAttendanceDate.getFullYear()}-${String(selectedAttendanceDate.getMonth() + 1).padStart(2, '0')}`}
                                        onChange={(e) => setSelectedAttendanceDate(new Date(e.target.value))}
                                        className="p-1.5 border-t border-b border-gray-300 text-sm w-36 text-center"
                                    />
                                    <button onClick={() => setSelectedAttendanceDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="p-2 rounded-r-lg bg-gray-200 hover:bg-gray-300"><ChevronRight className="w-4 h-4"/></button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {attendanceLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Check-in</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Check-out</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {attendanceHistory.length > 0 ? (
                                    attendanceHistory.map((record) => {
                                        const firstIn = record.firstIn ? new Date(record.firstIn) : null;
                                        const lastOut = record.lastOut ? new Date(record.lastOut) : null;
                                        
                                        let durationText = '—';
                                        let statusText = 'Absent';
                                        let statusColor = 'bg-red-100 text-red-800';

                                        if (firstIn) {
                                            if (lastOut) {
                                                const durationMs = lastOut.getTime() - firstIn.getTime();
                                                if(durationMs >= 0) {
                                                    const hours = Math.floor(durationMs / 3600000);
                                                    const minutes = Math.floor((durationMs % 3600000) / 60000);
                                                    durationText = `${hours}h ${minutes}m`;
                                                    statusText = 'Completed';
                                                    statusColor = 'bg-green-100 text-green-800';
                                                } else {
                                                    durationText = 'Error';
                                                    statusText = 'Error';
                                                }
                                            } else {
                                                durationText = 'Ongoing';
                                                statusText = 'Present';
                                                statusColor = 'bg-yellow-100 text-yellow-800';
                                            }
                                        }

                                        return (
                                            <tr key={record.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatDate(record.date)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>{statusText}</span></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{firstIn ? firstIn.toLocaleTimeString('en-IN') : 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lastOut ? lastOut.toLocaleTimeString('en-IN') : 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{durationText}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300"/>
                                            <p>No attendance records found for this period.</p>
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'membership' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <History className="w-5 h-5" />
                <span>Membership History</span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">Complete payment and membership details</p>
            </div>
            <div className="p-4 sm:p-6">
              {membershipHistory.length > 0 ? (
                <div className="space-y-6">
                  {membershipHistory.map((record) => (
                    <div key={record.id} className="border rounded-xl p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                      {/* Header Section */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
                        <div className="mb-2 sm:mb-0">
                          <p className="text-lg font-semibold text-gray-900 mb-1">
                            {formatDate(record.membershipStart)} - {formatDate(record.membershipEnd)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(record.status)} self-start`}>
                          {record.status}
                        </span>
                      </div>

                      {/* Payment Summary Cards - Mobile Optimized */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <CreditCard className="w-4 h-4 text-blue-600" />
                            <p className="text-sm font-medium text-blue-800">Total Fee</p>
                          </div>
                          <p className="text-xl font-bold text-blue-900">{formatCurrency(record.totalFee)}</p>
                        </div>
                        
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <p className="text-sm font-medium text-green-800">Total Paid</p>
                          </div>
                          <p className="text-xl font-bold text-green-900">{formatCurrency(record.amountPaid)}</p>
                        </div>
                        
                        <div className={`rounded-lg p-4 ${record.dueAmount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                          <div className="flex items-center space-x-2 mb-2">
                            <AlertCircle className={`w-4 h-4 ${record.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`} />
                            <p className={`text-sm font-medium ${record.dueAmount > 0 ? 'text-red-800' : 'text-green-800'}`}>Due Amount</p>
                          </div>
                          <p className={`text-xl font-bold ${record.dueAmount > 0 ? 'text-red-900' : 'text-green-900'}`}>
                            {formatCurrency(record.dueAmount)}
                          </p>
                        </div>
                        
                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Wallet className="w-4 h-4 text-purple-600" />
                            <p className="text-sm font-medium text-purple-800">Payment Status</p>
                          </div>
                          <p className={`text-sm font-semibold ${record.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {record.dueAmount > 0 ? 'Pending' : 'Completed'}
                          </p>
                        </div>
                      </div>

                      {/* Payment Breakdown */}
                      <div className="border-t pt-4">
                        <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                          <CreditCard className="w-4 h-4" />
                          <span>Payment Breakdown</span>
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium text-gray-700">Cash Payment</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(record.cash || 0)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-medium text-gray-700">Online Payment</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(record.online || 0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Additional Details */}
                      {(record.remark || record.shift_id || record.seat_id) && (
                        <div className="border-t pt-4 mt-4">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                            <FileText className="w-4 h-4" />
                            <span>Additional Details</span>
                          </h5>
                          <div className="space-y-2">
                            {record.shift_id && (
                              <div className="flex flex-col sm:flex-row sm:items-center">
                                <span className="text-sm font-medium text-gray-500 w-20">Shift ID:</span>
                                <span className="text-sm text-gray-900">{record.shift_id}</span>
                              </div>
                            )}
                            {record.seat_id && (
                              <div className="flex flex-col sm:flex-row sm:items-center">
                                <span className="text-sm font-medium text-gray-500 w-20">Seat ID:</span>
                                <span className="text-sm text-gray-900">{record.seat_id}</span>
                              </div>
                            )}
                            {record.remark && (
                              <div className="flex flex-col sm:flex-row sm:items-start">
                                <span className="text-sm font-medium text-gray-500 w-20 flex-shrink-0">Remark:</span>
                                <span className="text-sm text-gray-900 mt-1 sm:mt-0">{record.remark}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No membership history found</p>
                  <p className="text-sm text-gray-400 mt-1">Your membership records will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Wallet className="w-5 h-5" />
                <span>Transaction History</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type.toLowerCase() === 'payment' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                        <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No transactions found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'announcements' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <StudentAnnouncements branchId={profile?.branchId} />
            </div>
          </div>
        )}
        
        {activeTab === 'queries' && <PublicQueries />}
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          isOpen={showScanner}
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default StudentDashboard;