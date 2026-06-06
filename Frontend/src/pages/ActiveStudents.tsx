import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '../services/api';
import { Search, ChevronLeft, ChevronRight, Trash2, Eye, ChevronUp, ChevronDown, Grid, Rows3, Phone, Armchair, Calendar, Users, UserCheck, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Define the Student type with the dynamic status field
interface Student {
  id: number;
  name: string;
  registrationNumber?: string | null;
  email: string;
  phone: string;
  address: string;
  branchId: number;
  membershipStart: string;
  membershipEnd: string;
  totalFee: number;
  amountPaid: number;
  status: string; // Can be 'active', 'expired', etc.
  createdAt: string;
  seatNumber?: string | null;
  gender?: string | null;
  assignments?: Array<{
    seatId: number;
    shiftId: number;
    seatNumber: string;
    shiftTitle: string;
  }>;
}

// Utility function to format date to YYYY-MM-DD
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toISOString().split('T')[0];
};

const ActiveStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);
  const [isCollapsed, setIsCollapsed] = useState(false); // Added for Sidebar
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [selectedGender, setSelectedGender] = useState<string>('');
  
  // Sorting state
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.getActiveStudents();
        if (!response || !Array.isArray(response.students)) {
          throw new Error('Invalid data received for active students');
        }
        setStudents(response.students);
        setLoading(false);
      } catch (error: any) {
        console.error('Failed to fetch active students:', error.message);
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Sorting function
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort students based on current sort field and direction
  const sortedStudents = React.useMemo(() => {
    if (!sortField) return students;
    
    return [...students].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'registrationNumber':
          aValue = a.registrationNumber?.toLowerCase() || '';
          bValue = b.registrationNumber?.toLowerCase() || '';
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'status':
          aValue = a.status?.toLowerCase() || '';
          bValue = b.status?.toLowerCase() || '';
          break;
        case 'seat':
          aValue = a.seatNumber?.toLowerCase() || a.assignments?.[0]?.seatNumber?.toLowerCase() || '';
          bValue = b.seatNumber?.toLowerCase() || b.assignments?.[0]?.seatNumber?.toLowerCase() || '';
          break;
        case 'membershipEnd':
          aValue = new Date(a.membershipEnd || 0).getTime();
          bValue = new Date(b.membershipEnd || 0).getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [students, sortField, sortDirection]);

  // Render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  const filteredStudents = sortedStudents.filter((student: Student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.registrationNumber && student.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  ).filter((student: Student) =>
    selectedGender === '' || student.gender === selectedGender
  );

  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await api.deleteStudent(id);
        setStudents(students.filter((student) => student.id !== id));
        toast.success('Student deleted successfully');
      } catch (error: any) {
        console.error('Failed to delete student:', error.message);
        toast.error('Failed to delete student');
      }
    }
  };

  const handleViewDetails = (id: number) => {
    navigate(`/students/${id}`);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        {/* Sub Navigation */}
        <div className="border-b bg-white/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-3 overflow-x-auto py-3">
              <Link
                to="/students"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm md:text-base font-medium shadow-sm bg-gradient-to-r from-indigo-50 via-sky-50 to-indigo-100 text-indigo-700 ring-1 ring-indigo-200/50 ${location.pathname.startsWith('/students') && !location.pathname.startsWith('/students/') ? 'ring-2 ring-indigo-300' : ''}`}
              >
                <Users className="h-4 w-4" />
                All Students
              </Link>
              <Link
                to="/active-students"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm md:text-base font-medium shadow-sm bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 text-emerald-700 ring-1 ring-emerald-200/50 ${location.pathname.startsWith('/active-students') ? 'ring-2 ring-emerald-300' : ''}`}
              >
                <UserCheck className="h-4 w-4" />
                Active Students
              </Link>
              <Link
                to="/expired-memberships"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm md:text-base font-medium shadow-sm bg-gradient-to-r from-rose-50 via-pink-50 to-rose-100 text-rose-700 ring-1 ring-rose-200/50 ${location.pathname.startsWith('/expired-memberships') ? 'ring-2 ring-rose-300' : ''}`}
              >
                <AlertTriangle className="h-4 w-4" />
                Expired Memberships
              </Link>
              <Link
                to="/expiring-memberships?range=1-2"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm md:text-base font-medium shadow-sm bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 text-amber-700 ring-1 ring-amber-200/50 ${location.pathname.startsWith('/expiring-memberships') ? 'ring-2 ring-amber-300' : ''}`}
              >
                <Clock className="h-4 w-4" />
                Expiring 1–2 Days
              </Link>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Active Students</h1>
              <p className="text-gray-500">Manage all your active students</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full">
                  <h3 className="text-lg font-medium flex-1">Active Students</h3>
                  <div className="flex bg-slate-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                      title="List View"
                    >
                      <Rows3 className="h-4 w-4" />
                      <span className="hidden sm:inline">List</span>
                    </button>
                    <button
                      onClick={() => setViewMode('card')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${viewMode === 'card' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                      title="Card View"
                    >
                      <Grid className="h-4 w-4" />
                      <span className="hidden sm:inline">Cards</span>
                    </button>
                  </div>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-300"
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-500">Gender:</label>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="p-2 border rounded text-sm"
                  >
                    <option value="">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="">N/A</option>
                  </select>
                </div>
              </div>
              {viewMode === 'list' ? (
                loading ? (
                  <div className="flex justify-center p-8">Loading active students...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50 select-none"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Name</span>
                              {renderSortIcon('name')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50 select-none"
                            onClick={() => handleSort('registrationNumber')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Registration Number</span>
                              {renderSortIcon('registrationNumber')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="hidden md:table-cell cursor-pointer hover:bg-gray-50 select-none"
                            onClick={() => handleSort('phone')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Phone</span>
                              {renderSortIcon('phone')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50 select-none"
                            onClick={() => handleSort('status')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Status</span>
                              {renderSortIcon('status')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50 select-none"
                            onClick={() => handleSort('seat')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Seat</span>
                              {renderSortIcon('seat')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="hidden md:table-cell cursor-pointer hover:bg-gray-50 select-none"
                            onClick={() => handleSort('membershipEnd')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Membership End</span>
                              {renderSortIcon('membershipEnd')}
                            </div>
                          </TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentStudents.length > 0 ? (
                          currentStudents.map((student: Student) => (
                            <TableRow key={student.id}>
                              <TableCell>{student.name}</TableCell>
                              <TableCell>{student.registrationNumber || 'N/A'}</TableCell>
                              <TableCell className="hidden md:table-cell">{student.phone}</TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {student.status === 'active' ? 'Active' : 'Expired'}
                                </span>
                              </TableCell>
                              <TableCell>{student.seatNumber || student.assignments?.[0]?.seatNumber || 'N/A'}</TableCell>
                              <TableCell className="hidden md:table-cell">{formatDate(student.membershipEnd)}</TableCell>
                              <TableCell>
                                <button
                                  onClick={() => handleViewDetails(student.id)}
                                  className="mr-2 text-blue-600 hover:text-blue-800 p-2"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(student.id)}
                                  className="text-red-600 hover:text-red-800 p-2"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                              {filteredStudents.length === 0
                                ? 'No active students found matching your search.'
                                : 'No active students on this page.'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )
              ) : (
                <div className="p-4">
                  {loading ? (
                    <div className="text-center text-gray-500 py-8">Loading active students...</div>
                  ) : currentStudents.length > 0 ? (
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
                      {currentStudents.map((student: Student) => (
                        <div key={student.id} className="rounded-xl border shadow-md p-4 flex flex-col h-full bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 border-emerald-200 ring-1 ring-white/60 transition-transform duration-200 ease-out transform-gpu will-change-transform hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:rotate-[1.5deg]">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-800">{student.name}</h4>
                              <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-indigo-400"/> Reg: {student.registrationNumber || 'N/A'}</p>
                            </div>
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Active</span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-700">
                            <div className="rounded-lg p-3 bg-white/70 border border-white/60">
                              <div className="text-[11px] uppercase tracking-wide text-slate-600 flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-slate-400"/> Phone</div>
                              <div className="mt-0.5 font-semibold text-slate-800">{student.phone}</div>
                            </div>
                            <div className="rounded-lg p-3 bg-white/70 border border-white/60">
                              <div className="text-[11px] uppercase tracking-wide text-slate-600 flex items-center gap-1"><Armchair className="h-3.5 w-3.5 text-slate-400"/> Seat</div>
                              <div className="mt-0.5 font-semibold text-slate-800">{student.seatNumber || student.assignments?.[0]?.seatNumber || 'N/A'}</div>
                            </div>
                            <div className="rounded-lg p-3 bg-white/70 border border-white/60 col-span-2">
                              <div className="text-[11px] uppercase tracking-wide text-slate-600 flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-slate-400"/> Membership End</div>
                              <div className="mt-0.5 font-semibold text-slate-800">{formatDate(student.membershipEnd)}</div>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleViewDetails(student.id)} className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50" title="View Details"><Eye size={16} /></button>
                              <button onClick={() => handleDelete(student.id)} className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50" title="Delete"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">No active students found.</div>
                  )}
                </div>
              )}
              {!loading && filteredStudents.length > 0 && (
                <div className="flex flex-col md:flex-row items-center justify-between border-t border-gray-200 px-6 py-3 space-y-2 md:space-y-0">
                  <div className="flex items-center space-x-2">
                    <select
                      value={studentsPerPage}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        setStudentsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="text-sm border rounded py-2 px-3"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-500">students per page</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="text-sm text-gray-500">
                    Showing {indexOfFirstStudent + 1} to {Math.min(indexOfLastStudent, filteredStudents.length)} of {filteredStudents.length} students
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveStudents;