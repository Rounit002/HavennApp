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
  ChevronLeft,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import BarcodeGenerator from '../components/BarcodeGenerator';
import api from '../services/api';

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
}

interface DashboardStats {
  totalCollection: number;
  totalDue: number;
  totalExpense: number;
  profitLoss: number;
  totalStudents?: number;
  activeStudents?: number;
  todayAttendance?: number;
  monthlyAttendance?: number;
}

interface Branch {
  id: number;
  name: string;
  code?: string | null;
}

const EnhancedAttendance: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false);
  const [library, setLibrary] = useState<{id: number; library_code: string; name: string} | null>(null);
  
  // Branch state for filtering
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);

  // Enhanced state for new features
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent'>('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });

  // Handler functions for filters
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewModeChange = (mode: 'daily' | 'monthly') => {
    setViewMode(mode);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterStatusChange = (status: 'all' | 'present' | 'absent') => {
    setFilterStatus(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleBranchChange = (branchId: number | null) => {
    setSelectedBranch(branchId);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedMonth(new Date().toISOString().slice(0, 7));
    setFilterStatus('all');
    setSelectedBranch(null);
    setShowFilters(false);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  useEffect(() => {
    loadAttendance();
    loadStats();
    loadLibraryInfo();
    loadBranches();
  }, [viewMode, selectedDate, selectedMonth, filterStatus, searchTerm, pagination.page, selectedBranch]);

  const loadLibraryInfo = async () => {
    try {
      const response = await api.getLibraryProfile();
      setLibrary({
        id: response.library.id,
        library_code: response.library.libraryCode,
        name: response.library.libraryName
      });
    } catch (error) {
      console.error('Error loading library info:', error);
    }
  };

  const loadBranches = async () => {
    try {
      const branchesData = await api.getBranches();
      setBranches(branchesData);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadAttendance = async () => {
    setIsLoading(true);
    try {
      const filters: any = {
        page: pagination.page,
        limit: pagination.limit,
        view: viewMode,
        search: searchTerm.trim()
      };

      // Add branch filter if selected
      if (selectedBranch) {
        filters.branchId = selectedBranch;
      }

      if (viewMode === 'daily') {
        if (showFilters && dateRange.startDate && dateRange.endDate) {
          // For date range filtering, use the date parameter with start date
          filters.date = dateRange.startDate;
          // Note: Backend currently doesn't support date ranges, using single date
        } else {
          filters.date = selectedDate;
        }
      } else if (viewMode === 'monthly') {
        // Extract month and year from selectedMonth (format: YYYY-MM)
        const [year, month] = selectedMonth.split('-');
        filters.month = parseInt(month);
        filters.year = parseInt(year);
      }

      // Remove status filter as backend doesn't currently support it
      // Backend filters by presence/absence based on data availability

      console.log('Loading attendance with filters:', filters);
      const data = await api.fetchAttendance(filters);
      
      setAttendance(data.attendance || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.totalRecords || 0
      }));
      
    } catch (error: any) {
      console.error('Error loading attendance:', error);
      toast.error(error.message || 'Failed to load attendance records');
      setAttendance([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [dashboardStats, totalStudentsResp, activeStudentsResp] = await Promise.all([
        api.getDashboardStats(),
        api.getTotalStudentsCount().catch(() => 0),
        api.getActiveStudentsCount().catch(() => 0)
      ]);
      
      setStats({
        totalCollection: dashboardStats.totalCollection || 0,
        totalDue: dashboardStats.totalDue || 0,
        totalExpense: dashboardStats.totalExpense || 0,
        profitLoss: dashboardStats.profitLoss || 0,
        totalStudents: Number(totalStudentsResp) || 0,
        activeStudents: Number(activeStudentsResp) || 0,
        todayAttendance: attendance.length,
        monthlyAttendance: attendance.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set default stats if API fails
      setStats({
        totalCollection: 0,
        totalDue: 0,
        totalExpense: 0,
        profitLoss: 0,
        totalStudents: 0,
        activeStudents: 0,
        todayAttendance: attendance.length,
        monthlyAttendance: attendance.length
      });
    }
  };

  const handleBarcodeClick = () => {
    setShowBarcodeGenerator(true);
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    try {
      return new Date(timeString).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '--:--';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Registration Number', 'Phone', 'Date', 'First In', 'Last Out', 'Total Scans'];
    const csvContent = [
      headers.join(','),
      ...attendance.map(record => [
        record.studentName,
        record.registrationNumber,
        record.phone,
        formatDate(record.date),
        formatTime(record.firstIn),
        formatTime(record.lastOut),
        record.totalScans
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${viewMode}-${selectedDate || selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={handleBarcodeClick} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Enhanced Header with View Mode Toggle */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 sm:p-6 text-white">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">Attendance Management</h2>
                  <p className="text-blue-100 text-sm sm:text-base">Monitor and analyze student attendance patterns</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
                  {/* View Mode Toggle */}
                  <div className="flex bg-white/20 backdrop-blur-sm rounded-lg p-1 w-full sm:w-auto">
                    <button
                      onClick={() => handleViewModeChange('daily')}
                      className={`px-3 sm:px-4 py-2 rounded-md transition-all duration-200 flex items-center justify-center space-x-2 flex-1 sm:flex-none ${
                        viewMode === 'daily'
                          ? 'bg-white text-blue-600 shadow-lg'
                          : 'text-white hover:bg-white/20'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span className="text-sm sm:text-base">Daily</span>
                    </button>
                    <button
                      onClick={() => handleViewModeChange('monthly')}
                      className={`px-3 sm:px-4 py-2 rounded-md transition-all duration-200 flex items-center justify-center space-x-2 flex-1 sm:flex-none ${
                        viewMode === 'monthly'
                          ? 'bg-white text-blue-600 shadow-lg'
                          : 'text-white hover:bg-white/20'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span className="text-sm sm:text-base">Monthly</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    {/* Advanced Filters Toggle */}
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`bg-white/20 backdrop-blur-sm hover:bg-white/30 px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 flex-1 sm:flex-none ${
                        showFilters ? 'ring-2 ring-white/50' : ''
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      <span className="text-sm sm:text-base">Filters</span>
                    </button>

                    {/* Export Button */}
                    <button
                      onClick={exportToCSV}
                      className="bg-white/20 backdrop-blur-sm hover:bg-white/30 px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 flex-1 sm:flex-none"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm sm:text-base">Export</span>
                    </button>

                    {/* Refresh Button */}
                    <button
                      onClick={loadAttendance}
                      disabled={isLoading}
                      className="bg-white/20 backdrop-blur-sm hover:bg-white/30 disabled:opacity-50 px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 flex-1 sm:flex-none"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                      <span className="text-sm sm:text-base">Refresh</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/20">
                  {/* Mobile: Stack vertically, Desktop: Grid layout */}
                  <div className="flex flex-col space-y-4 xl:grid xl:grid-cols-4 xl:gap-4 xl:space-y-0">
                    {/* Search Input - spans full width on mobile, 2 cols on xl */}
                    <div className="xl:col-span-2">
                      <label className="block text-sm font-medium text-blue-100 mb-2">Search Students</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-200" />
                        <input
                          type="text"
                          placeholder="Name, phone, or reg. no."
                          value={searchTerm}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          className="w-full max-w-lg pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                        />
                      </div>
                    </div>

                    {/* Date/Month Selector and Branch Filter in same row */}
                    <div className="xl:col-span-2 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-100 mb-2">
                          {viewMode === 'daily' ? 'Date Range' : 'Select Month'}
                        </label>
                        {viewMode === 'daily' ? (
                          <div className="flex space-x-2">
                            <input
                              type="date"
                              value={dateRange.startDate}
                              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                              className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
                            />
                            <input
                              type="date"
                              value={dateRange.endDate}
                              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                              className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
                            />
                          </div>
                        ) : (
                          <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => handleMonthChange(e.target.value)}
                            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-blue-100 mb-2">Branch</label>
                        <select
                          value={selectedBranch || ''}
                          onChange={(e) => handleBranchChange(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
                        >
                          <option value="" className="text-gray-800">All Branches</option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id} className="text-gray-800">
                              {branch.name} {branch.code ? `(${branch.code})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Status Filter and Apply Button in same row */}
                    <div className="xl:col-span-2 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-100 mb-2">Filter by Status</label>
                        <select
                          value={filterStatus}
                          onChange={(e) => handleFilterStatusChange(e.target.value as 'all' | 'present' | 'absent')}
                          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
                        >
                          <option value="all" className="text-gray-800">All Students</option>
                          <option value="present" className="text-gray-800">Present Only</option>
                          <option value="absent" className="text-gray-800">Absent Only</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-blue-100 opacity-0 mb-2">Action</label>
                        <button
                          onClick={loadAttendance}
                          className="w-full bg-white/30 hover:bg-white/40 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Apply Filters</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {(searchTerm || filterStatus !== 'all' || selectedBranch) && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <button
                        onClick={clearAllFilters}
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center">
                    <UserCheck className="w-8 h-8 text-green-300 mr-3" />
                    <div>
                      <p className="text-2xl font-bold">{attendance.length}</p>
                      <p className="text-blue-100 text-sm">
                        {viewMode === 'daily' ? 'Present Today' : 'Monthly Records'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center">
                    <User className="w-8 h-8 text-blue-300 mr-3" />
                    <div>
                      <p className="text-2xl font-bold">{stats?.totalStudents || 0}</p>
                      <p className="text-blue-100 text-sm">Total Students</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center">
                    <Clock className="w-8 h-8 text-yellow-300 mr-3" />
                    <div>
                      <p className="text-2xl font-bold">
                        {attendance.length > 0 ? formatTime(attendance[0]?.firstIn) : '--:--'}
                      </p>
                      <p className="text-blue-100 text-sm">First Check-in</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center">
                    <TrendingUp className="w-8 h-8 text-purple-300 mr-3" />
                    <div>
                      <p className="text-2xl font-bold">
                        {stats ? Math.round((attendance.length / stats.totalStudents) * 100) : 0}%
                      </p>
                      <p className="text-blue-100 text-sm">Attendance Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Attendance Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-600">Loading attendance records...</span>
                </div>
              ) : attendance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Student Details</span>
                            <span className="sm:hidden">Student</span>
                          </div>
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Date</span>
                            <span className="sm:hidden">Date</span>
                          </div>
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">First In</span>
                            <span className="sm:hidden">In</span>
                          </div>
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Last Out</span>
                            <span className="sm:hidden">Out</span>
                          </div>
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Scans</span>
                            <span className="sm:hidden">#</span>
                          </div>
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Status</span>
                            <span className="sm:hidden">Status</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {attendance.map((record, index) => (
                        <tr key={`${record.studentId}-${record.date}`} className={`hover:bg-blue-50 transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-xs sm:text-sm">
                                  {record.studentName?.charAt(0)?.toUpperCase() || 'S'}
                                </span>
                              </div>
                              <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                                <div className="text-sm font-semibold text-gray-900 truncate">{record.studentName}</div>
                                <div className="text-xs sm:text-sm text-gray-500 flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  <span className="truncate">{record.phone}</span>
                                </div>
                                {record.registrationNumber && (
                                  <div className="text-xs text-gray-400">
                                    Reg: {record.registrationNumber}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(record.date)}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="bg-green-100 p-1.5 sm:p-2 rounded-lg mr-2 sm:mr-3">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                              </div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatTime(record.firstIn)}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="bg-red-100 p-1.5 sm:p-2 rounded-lg mr-2 sm:mr-3">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                              </div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatTime(record.lastOut)}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {record.totalScans}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              record.lastOut 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {record.lastOut ? 'Out' : 'In'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <AlertTriangle className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No attendance records found</h3>
                  <p className="text-sm sm:text-base text-gray-500">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'Try adjusting your filters or search terms.'
                      : `No attendance records for ${viewMode === 'daily' ? 'this date' : 'this month'}.`
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-4 sm:px-6 py-3 rounded-lg border border-gray-200">
                <div className="flex items-center text-sm text-gray-700">
                  <span className="text-xs sm:text-sm">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="p-1.5 sm:p-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-700">
                    Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(Math.ceil(pagination.total / pagination.limit), prev.page + 1) }))}
                    disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                    className="p-1.5 sm:p-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Barcode Generator Modal */}
      {library && showBarcodeGenerator && (
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

export default EnhancedAttendance;
