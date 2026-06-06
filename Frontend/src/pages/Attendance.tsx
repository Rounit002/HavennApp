import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  Clock, 
  CheckCircle, 
  User, 
  Phone, 
  Download, 
  Printer,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Filter,
  CalendarDays,
  Eye,
  BarChart3,
  RefreshCw,
  X,
  Users
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import BarcodeGenerator from '../components/BarcodeGenerator';
import api from '../services/api';
import { authFetch } from '../utils/apiConfig';

// Interface for the simplified student list used in filters
interface StudentSelectItem {
  id: number;
  name: string;
}

interface AttendanceRecord {
  studentId: number;
  studentName: string;
  registrationNumber: string;
  phone: string;
  date: string;
  firstIn: string | null;
  lastOut: string | null;
  totalScans: number;
  status?: string;
  notes?: string;
  // Membership information
  membershipStatus?: 'active' | 'expired' | 'inactive';
  membershipEndDate?: string;
  hasDueAmount?: boolean;
  dueAmount?: number;
  // Legacy support for existing code
  id?: number;
  checkInTime?: string;
  checkOutTime?: string;
}

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  todayAttendance: number;
  totalSeats: number;
  occupiedSeats: number;
  monthlyRevenue: number;
  expiredMemberships: number;
}

const Attendance: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false);
  const [library, setLibrary] = useState<{id: number; library_code: string; name: string} | null>(null);
  
  // Enhanced state for new features
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [showFilters, setShowFilters] = useState(false);
  
  // Default date range to the last 30 days for better usability
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  
  const [dateRange, setDateRange] = useState({
    startDate: defaultStartDate.toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent'>('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [sortBy, setSortBy] = useState<'name' | 'time' | 'status'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // New state for Monthly View student selection
  const [allStudents, setAllStudents] = useState<StudentSelectItem[]>([]);
  const [monthlyViewStudentId, setMonthlyViewStudentId] = useState<string>(''); // Use string for select value

  useEffect(() => {
    // Initial data load on component mount
    loadLibraryInfo();
    loadStats();
    loadAllStudentsForFilter();
    
    if (viewMode === 'daily') {
        loadAttendance();
    } else {
        // For monthly view, wait for user to select a student before loading data
        setAttendance([]);
        setIsLoading(false);
    }
  }, []); // Note: This effect runs only once

  useEffect(() => {
      // Reset state when view mode changes to prevent showing stale data
      setAttendance([]);
      setPagination(prev => ({ ...prev, total: 0, page: 1 }));
      if (viewMode !== 'monthly') {
          setMonthlyViewStudentId('');
      } else {
        // Inform user about the next step in the monthly view workflow
        toast.success("Please select a student to view their attendance history.");
      }
  }, [viewMode]);

  const handleBarcodeClick = () => {
    setShowBarcodeGenerator(true);
  };

  const loadAllStudentsForFilter = async () => {
    try {
        const data = await api.getStudents();
        if (data?.students) {
            const studentList = data.students.map(s => ({ 
                id: s.id, 
                name: `${s.name} (${s.phone || 'No Phone'})` 
            }));
            setAllStudents(studentList);
        }
    } catch (error) {
        console.error("Failed to load students for filter", error);
        toast.error("Could not load the student list for filtering.");
    }
  };

  const loadLibraryInfo = async () => {
    try {
      const response = await authFetch('/owner-dashboard/library-info');
      const data = await response.json();
      if (response.ok) {
        setLibrary(data.library);
      }
    } catch (error) {
      console.error('Error loading library info:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await authFetch('/owner-dashboard/stats');
      const data = await response.json();

      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };
  
  /**
   * NOTE FOR BACKEND:
   * To fix the issue of attendance logging past midnight, please ensure the database transaction
   * that records attendance uses the server's current date, adjusted for the library's local timezone
   * (e.g., 'Asia/Kolkata' for IST). Using `CURRENT_DATE` or `NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'`
   * in PostgreSQL at the time of insertion will guarantee that a check-in at 12:05 AM is correctly
   * recorded for the new day.
   */
  const loadAttendance = async (isManualTrigger = false) => {
    setIsLoading(true);
    try {
      const filters: any = {
        page: pagination.page,
        limit: pagination.limit,
        view: viewMode,
        search: attendanceSearchTerm,
        includeMembership: true
      };

      if (viewMode === 'daily') {
        if (showFilters && dateRange.startDate && dateRange.endDate) {
          filters.startDate = dateRange.startDate;
          filters.endDate = dateRange.endDate;
        } else {
          filters.date = selectedDate;
        }
        if (filterStatus !== 'all') {
          filters.status = filterStatus;
        }
      } else if (viewMode === 'monthly') {
        if (!monthlyViewStudentId) {
          if (isManualTrigger) {
            toast.error("Please select a student before applying filters.");
          }
          setAttendance([]);
          setPagination(prev => ({ ...prev, total: 0 }));
          setIsLoading(false);
          return;
        }
        filters.studentId = monthlyViewStudentId;
        filters.startDate = dateRange.startDate;
        filters.endDate = dateRange.endDate;
      }

      console.log('Fetching attendance with filters:', filters);
      const data = await api.fetchAttendance(filters);
      console.log('Raw API response:', data);
      
      if (!data || !Array.isArray(data.attendance)) {
        console.error('Invalid attendance data received:', data);
        setAttendance([]);
        return;
      }
      
      const processedData = processAttendanceData(data.attendance || []);
      setAttendance(processedData);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0
      }));
      
    } catch (error: any) {
      console.error('Error loading attendance:', error);
      toast.error(error.message || 'Failed to load attendance records');
      setAttendance([]);
    } finally {
      setIsLoading(false);
    }
  };

  const processAttendanceData = (records: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return records.map(record => {
      try {
        if (!record) return null;

        let membershipEndDate = null;
        let isExpired = true;
        
        if (record.membershipEndDate) {
          try {
            membershipEndDate = new Date(record.membershipEndDate);
            isExpired = membershipEndDate < today;
          } catch (e) { console.error('Error parsing membership end date:', e); }
        }
        
        let hasDueAmount = false;
        let dueAmount = 0;
        
        if (typeof record.dueAmount === 'number') {
          dueAmount = record.dueAmount;
          hasDueAmount = dueAmount > 0;
        } else if (typeof record.dueAmount === 'string') {
          dueAmount = parseFloat(record.dueAmount) || 0;
          hasDueAmount = dueAmount > 0;
        }
        
        return {
          ...record,
          membershipStatus: isExpired ? 'expired' : 'active',
          membershipEndDate: membershipEndDate ? membershipEndDate.toISOString().split('T')[0] : null,
          hasDueAmount,
          dueAmount
        };
        
      } catch (error) {
        console.error('Error processing record:', error, 'Record:', record);
        return { ...record, membershipStatus: 'error' };
      }
    }).filter(record => record !== null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    try {
      let date;
      if (dateString.includes('T')) {
        date = new Date(dateString);
      } else {
        date = new Date(dateString + 'T00:00:00');
      }
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '--:--';
    try {
      return new Date(timeString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '--:--';
    }
  };
  
  const handleClearFilters = () => {
      setAttendanceSearchTerm('');
      setFilterStatus('all');
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 30);
      setDateRange({
          startDate: defaultStart.toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
      });
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setMonthlyViewStudentId('');
      // Use a timeout to allow state to update before reloading data
      setTimeout(() => loadAttendance(), 0);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={handleBarcodeClick} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Attendance Management</h2>
                  <p className="text-blue-100">Monitor and analyze student attendance patterns</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1 flex">
                    <button
                      onClick={() => setViewMode('daily')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                        viewMode === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span>Daily View</span>
                    </button>
                    <button
                      onClick={() => setViewMode('monthly')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                        viewMode === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Monthly View</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`bg-white/20 backdrop-blur-sm hover:bg-white/30 px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                      showFilters ? 'ring-2 ring-white/50' : ''
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                  </button>
                  <button
                    onClick={() => loadAttendance(true)}
                    disabled={isLoading}
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 disabled:opacity-50 px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    {/* Common Search Filter */}
                    <div className="space-y-2 lg:col-span-1">
                      <label className="text-sm font-medium text-blue-100">Search Students</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-200" />
                        <input
                          type="text"
                          placeholder="Name, phone, or reg. no."
                          value={attendanceSearchTerm}
                          onChange={(e) => setAttendanceSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                        />
                      </div>
                    </div>
                    
                    {/* View-Specific Filters */}
                    {viewMode === 'daily' ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-100">Select Date</label>
                            <input
                              type="date"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-100">Filter by Status</label>
                            <select
                              value={filterStatus}
                              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'present' | 'absent')}
                              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                              <option value="all" className="text-gray-800">All Students</option>
                              <option value="present" className="text-gray-800">Present Only</option>
                              <option value="absent" className="text-gray-800">Absent Only</option>
                            </select>
                          </div>
                        </>
                    ) : (
                        <>
                          <div className="space-y-2 lg:col-span-3">
                            <label className="text-sm font-medium text-blue-100">Select Student</label>
                            <div className="relative">
                               <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-200" />
                               <select
                                   value={monthlyViewStudentId}
                                   onChange={(e) => setMonthlyViewStudentId(e.target.value)}
                                   className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                               >
                                   <option value="" className="text-gray-800">-- Select a Student --</option>
                                   {allStudents.map(student => (
                                       <option key={student.id} value={student.id} className="text-gray-800">
                                           {student.name}
                                       </option>
                                   ))}
                               </select>
                            </div>
                          </div>
                          <div className="space-y-2 lg:col-span-2">
                            <label className="text-sm font-medium text-blue-100">From Date</label>
                            <input
                              type="date"
                              value={dateRange.startDate}
                              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                              disabled={!monthlyViewStudentId}
                              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
                            />
                          </div>
                          <div className="space-y-2 lg:col-span-2">
                            <label className="text-sm font-medium text-blue-100">To Date</label>
                            <input
                              type="date"
                              value={dateRange.endDate}
                              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                              disabled={!monthlyViewStudentId}
                              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
                            />
                          </div>
                        </>
                    )}

                    {/* Common Apply and Clear Buttons */}
                    <div className="space-y-2 flex items-end">
                      <button
                        onClick={() => loadAttendance(true)}
                        className="w-full bg-white/30 hover:bg-white/40 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Apply Filters</span>
                      </button>
                    </div>
                  </div>

                  {(attendanceSearchTerm || filterStatus !== 'all' || monthlyViewStudentId) && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <button
                        onClick={handleClearFilters}
                        className="text-white/80 hover:text-white text-sm flex items-center space-x-1"
                      >
                        <X className="w-4 h-4" />
                        <span>Clear all filters</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center">
                    <UserCheck className="w-8 h-8 text-green-300 mr-3" />
                    <div>
                      <p className="text-2xl font-bold">{attendance.length}</p>
                      <p className="text-blue-100 text-sm">
                        {viewMode === 'daily' ? 'Present Today' : 'Attendance Records Found'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center">
                    <Clock className="w-8 h-8 text-blue-300 mr-3" />
                    <div>
                      <p className="text-2xl font-bold">
                        {attendance.length > 0 ? formatTime(attendance[0]?.firstIn || attendance[0]?.checkInTime || '') : '--:--'}
                      </p>
                      <p className="text-blue-100 text-sm">First Check-in</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center">
                    <TrendingUp className="w-8 h-8 text-yellow-300 mr-3" />
                    <div>
                      <p className="text-2xl font-bold">
                        {stats && stats.totalStudents > 0 ? Math.round((attendance.length / stats.totalStudents) * 100) : 0}%
                      </p>
                      <p className="text-blue-100 text-sm">Attendance Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Attendance Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              {attendance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            Student Details
                          </div>
                        </th>
                        <th className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                           <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            Date
                          </div>
                        </th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            Check-in / Out
                          </div>
                        </th>
                        <th className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Duration
                          </div>
                        </th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Status
                          </div>
                        </th>
                        <th className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center">
                            <UserCheck className="w-4 h-4 mr-2" />
                            Membership
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {attendance.map((record, index) => (
                        <tr 
                          key={record.id || `${record.studentId}-${record.date}`}
                          className={`group relative transition-all duration-200 ${
                            record.membershipStatus === 'expired' 
                              ? 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-600' 
                              : record.hasDueAmount 
                                ? 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-500' 
                                : `hover:bg-blue-50 hover:border-l-2 hover:border-l-blue-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`
                          }`}
                          title={record.membershipStatus === 'expired' 
                            ? `Membership expired on ${formatDate(record.membershipEndDate) || 'unknown'}` 
                            : record.hasDueAmount 
                              ? `Outstanding balance: ₹${Number(record.dueAmount).toFixed(2)}` 
                              : ''
                          }
                        >
                          <td className="px-3 md:px-6 py-3 md:py-4 whitespace-normal sm:whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {record.studentName?.charAt(0)?.toUpperCase() || 'S'}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900">{record.studentName}</div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {record.phone}
                                </div>
                                {record.registrationNumber && (
                                  <div className="text-xs text-gray-400">
                                    Reg: {record.registrationNumber}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                           <td className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(record.date)}
                          </td>
                          <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                                <span className="text-sm font-medium text-green-700">In: {formatTime(record.firstIn)}</span>
                                <span className="text-sm font-medium text-red-700">Out: {record.lastOut ? formatTime(record.lastOut) : 'Still Present'}</span>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                            {(() => {
                              const firstIn = record.firstIn;
                              const lastOut = record.lastOut;
                              
                              if (!firstIn) {
                                return <div className="text-sm text-gray-500">No check-in</div>;
                              }
                              
                              const checkInTime = new Date(firstIn);
                              const endTime = lastOut ? new Date(lastOut) : new Date();
                              const durationMs = endTime.getTime() - checkInTime.getTime();
                              
                              if (durationMs < 0) {
                                return <div className="text-sm text-red-500">Invalid time range</div>;
                              }
                              
                              const hours = Math.floor(durationMs / 3600000);
                              const minutes = Math.floor((durationMs % 3600000) / 60000);
                              const durationText = `${hours}h ${minutes}m`;
                              
                              return (
                                <div className={`flex items-center text-sm ${!lastOut ? 'text-orange-600' : 'text-gray-900'}`}>
                                  {durationText} {!lastOut && <span className="text-xs ml-1">(Ongoing)</span>}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              record.status === 'present' 
                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              {record.status?.charAt(0).toUpperCase() + record.status?.slice(1)}
                            </span>
                          </td>
                          <td className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  record.membershipStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {record.membershipStatus?.toUpperCase()}
                                </span>
                              {record.hasDueAmount && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Due: ₹{Number(record.dueAmount).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attendance Records Found</h3>
                  <p className="text-gray-500 mb-4">
                    {viewMode === 'monthly'
                      ? 'Please select a student and a date range to view their attendance.'
                      : `No records for ${formatDate(selectedDate)}. Try changing the filters.`}
                  </p>
                </div>
              )}
            </div>

            {attendance.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Export Options</h3>
                    <p className="text-gray-500 text-sm">Download or print attendance records</p>
                  </div>
                  <div className="flex space-x-3">
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2">
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2">
                      <Printer className="w-4 h-4" />
                      <span>Print Report</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {library && (
        <BarcodeGenerator
          isOpen={showBarcodeGenerator}
          onClose={() => setShowBarcodeGenerator(false)}
          libraryCode={library.library_code}
          libraryName={library.name}
          libraryId={library.id}
        />
      )}
    </div>
  );
};

export default Attendance;