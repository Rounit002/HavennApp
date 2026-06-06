import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '../services/api';
import { Search, ChevronLeft, ChevronRight, Trash2, Eye, MessageCircle, ChevronUp, ChevronDown, Grid, Rows3, Phone, Armchair, Calendar as CalendarIcon, Users, UserCheck, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Select, { MultiValue } from 'react-select';

// Comprehensive Student interface combining details from all pages
interface Student {
  id: number;
  name: string;
  registrationNumber?: string | null;
  fatherName?: string | null;
  aadharNumber?: string | null;
  email: string;
  phone: string;
  address?: string | null;
  branchId?: number;
  branchName?: string;
  status?: string;
  membershipStart?: string;
  membershipEnd: string;
  totalFee?: number;
  amountPaid?: number;
  dueAmount?: number;
  cash?: number;
  online?: number;
  securityMoney?: number;
  remark?: string | null;
  profileImageUrl?: string | null;
  createdAt?: string;
  gender?: string | null;
  assignments?: Array<{
    seatId: number;
    shiftId: number;
    seatNumber: string;
    shiftTitle: string;
  }>;
  shiftId?: number;
  shiftTitle?: string;
  seatId?: number;
  seatNumber?: string;
}

interface Seat {
  id: number;
  seatNumber: string;
  studentId?: number | null;
}

const hasPermissions = (user: any): user is { permissions: string[] } => {
  return user && 'permissions' in user && Array.isArray(user.permissions);
};

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toISOString().split('T')[0];
};

const ExpiredMemberships = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<string>('membershipEnd');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // State for the new branch filter
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<{ value: number | null; label: string } | null>(null);
  const [branchFilterOptions, setBranchFilterOptions] = useState<any[]>([]);
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('');

  // State for all form fields
  const [nameInput, setNameInput] = useState('');
  const [registrationNumberInput, setRegistrationNumberInput] = useState('');
  const [fatherNameInput, setFatherNameInput] = useState('');
  const [aadharNumberInput, setAadharNumberInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(addMonths(new Date(), 1));
  const [shiftOptions, setShiftOptions] = useState<any[]>([]);
  const [isShiftsLoading, setIsShiftsLoading] = useState(false);
  const [seatOptions, setSeatOptions] = useState<any[]>([]);
  const [branchOptions, setBranchOptions] = useState<any[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<any[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [totalFee, setTotalFee] = useState<string>('');
  const [cash, setCash] = useState<string>('');
  const [online, setOnline] = useState<string>('');
  const [securityMoney, setSecurityMoney] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  const cardSortOptions = [
    { value: 'membershipEnd-desc', label: 'Expiry: Newest → Oldest' },
    { value: 'membershipEnd-asc', label: 'Expiry: Oldest → Newest' },
    { value: 'name-asc', label: 'Name: A → Z' },
    { value: 'name-desc', label: 'Name: Z → A' },
    { value: 'seat-asc', label: 'Seat: A → Z' },
    { value: 'seat-desc', label: 'Seat: Z → A' },
  ];

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
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'membershipEnd':
          aValue = new Date(a.membershipEnd || 0).getTime();
          bValue = new Date(b.membershipEnd || 0).getTime();
          break;
        case 'seat':
          aValue = a.seatNumber?.toLowerCase() || a.assignments?.[0]?.seatNumber?.toLowerCase() || '';
          bValue = b.seatNumber?.toLowerCase() || b.assignments?.[0]?.seatNumber?.toLowerCase() || '';
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [students, sortField, sortDirection]);

  const filteredStudents = React.useMemo(() => {
    return sortedStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone && s.phone.includes(searchTerm)) ||
        (s.registrationNumber && s.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    ).filter(
      (s) => selectedGenderFilter === '' || s.gender === selectedGenderFilter
    );
  }, [sortedStudents, searchTerm, selectedGenderFilter]);

  // Render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  // Effect to fetch branches for filter and dialog
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const branches = await api.getBranches() || [];
        const branchOptions = branches.map((branch: any) => ({ value: branch.id, label: branch.name }));
        setBranchOptions(branchOptions);
        setBranchFilterOptions([{ value: null, label: 'All Branches' }, ...branchOptions]);
      } catch (e: any) {
        console.error('Error fetching branches:', e);
        toast.error(e.message || 'Failed to fetch branches.');
      }
    };
    fetchBranches();
  }, []);

  // Effect to fetch expired students when the component mounts or the branch filter changes
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const studentsResp = await api.getExpiredMemberships(selectedBranchFilter?.value);
        setStudents(studentsResp.students);
      } catch (e: any) {
        console.error('Error fetching expired memberships:', e);
        toast.error(e.message || 'Failed to fetch expired memberships.');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedBranchFilter]);


  // Effect to fetch shifts when the selected branch changes in the renewal dialog
  useEffect(() => {
    if (selectedBranch?.value) {
      const fetchShifts = async () => {
        setIsShiftsLoading(true);
        try {
          const response = await api.getSchedules(selectedBranch.value);
          setShiftOptions(response.schedules.map((s: any) => ({ value: s.id, label: s.title })));
        } catch (error) {
          console.error('Error fetching shifts for branch:', error);
          toast.error('Failed to fetch shifts.');
          setShiftOptions([]);
        } finally {
          setIsShiftsLoading(false);
        }
      };
      fetchShifts();
    } else {
      setShiftOptions([]);
    }
  }, [selectedBranch]);

  // Effect to fetch seats when branch or shifts change
  useEffect(() => {
    if (selectedShifts.length > 0 && selectedBranch?.value && selectedStudent) {
      const fetchSeats = async () => {
        try {
          // Get seats for all selected shifts
          const allAvailableSeats = new Map();
          
          for (const shift of selectedShifts) {
            const response = await api.getSeats({ branchId: selectedBranch.value, shiftId: shift.value });
            const allSeats: any[] = response.seats || [];
            const availableSeats = allSeats.filter((seat: any) => {
              const status = (seat.shifts || []).find((s: any) => s.shiftId === shift.value);
              return status ? !status.isAssigned : true;
            });
            
            // Add available seats to the map
            availableSeats.forEach(seat => {
              if (!allAvailableSeats.has(seat.id)) {
                allAvailableSeats.set(seat.id, seat);
              }
            });
          }
          
          // Ensure current assigned seat remains selectable
          const currentAssignment = selectedStudent.assignments?.[0];
          if (currentAssignment && !allAvailableSeats.has(currentAssignment.seatId)) {
            // Fetch all seats to find the current one
            const response = await api.getSeats({ branchId: selectedBranch.value });
            const allSeats: any[] = response.seats || [];
            const currentSeat = allSeats.find(s => s.id === currentAssignment.seatId);
            if (currentSeat) {
              allAvailableSeats.set(currentSeat.id, currentSeat);
            }
          }

          const seatOptionsArray = Array.from(allAvailableSeats.values());
          setSeatOptions([
            { value: null, label: 'None' },
            ...seatOptionsArray.map((seat: any) => ({ value: seat.id, label: seat.seatNumber }))
          ]);
          
          // Reset seat if the currently selected one is no longer available
          if (selectedSeat && !seatOptionsArray.some(seat => seat.id === selectedSeat.value)) {
            setSelectedSeat(null);
          }
        } catch (error) {
          console.error('Error fetching seats:', error);
          toast.error('Failed to fetch seats.');
          setSeatOptions([]);
        }
      };
      fetchSeats();
    } else {
      setSeatOptions([]);
    }
  }, [selectedShifts, selectedBranch, selectedStudent]);

  const handleRenewClick = async (student: Student) => {
    try {
        setLoading(true);
        const fullStudentDetails = await api.getStudent(student.id);
        setSelectedStudent(fullStudentDetails);

        // Set new membership dates
        setStartDate(new Date());
        setEndDate(addMonths(new Date(), 1));

        // Pre-fill all form fields with the student's existing data
        setNameInput(fullStudentDetails.name || '');
        setRegistrationNumberInput(fullStudentDetails.registrationNumber || '');
        setFatherNameInput(fullStudentDetails.fatherName || '');
        setAadharNumberInput(fullStudentDetails.aadharNumber || '');
        setEmailInput(fullStudentDetails.email || '');
        setPhoneInput(fullStudentDetails.phone || '');
        setAddressInput(fullStudentDetails.address || '');
        setSelectedBranch(fullStudentDetails.branchId ? { value: fullStudentDetails.branchId, label: fullStudentDetails.branchName } : null);
        
        const currentAssignments = fullStudentDetails.assignments || [];
        setSelectedShifts(currentAssignments.map(assignment => ({ 
          value: assignment.shiftId, 
          label: assignment.shiftTitle 
        })));
        
        // This slight delay allows the seat options to populate based on the selected shifts
        // The useEffect for seats will trigger once shifts are set, so we can pre-fill the seat.
        // A small delay might still be needed if state updates are not immediate.
        setTimeout(() => {
          const currentAssignment = currentAssignments[0]; // Use the first assignment for seat selection
          setSelectedSeat(currentAssignment ? { value: currentAssignment.seatId, label: currentAssignment.seatNumber } : null);
        }, 200); // Increased delay slightly to ensure shifts are loaded

        setTotalFee(fullStudentDetails.totalFee ? fullStudentDetails.totalFee.toString() : '0');
        setCash(fullStudentDetails.cash ? fullStudentDetails.cash.toString() : '0');
        setOnline(fullStudentDetails.online ? fullStudentDetails.online.toString() : '0');
        setSecurityMoney(fullStudentDetails.securityMoney ? fullStudentDetails.securityMoney.toString() : '0');
        setRemark(fullStudentDetails.remark || '');
        
        setRenewDialogOpen(true);
    } catch (error) {
        console.error("Failed to fetch student details for renewal:", error);
        toast.error("Failed to load student details for renewal.");
    } finally {
        setLoading(false);
    }
  };

  const handleWhatsAppClick = (phone: string) => {
    // Format phone number to remove any non-digit characters
    const formattedPhone = phone.replace(/\D/g, '');
    // Construct WhatsApp URL (using international format, assuming phone number is valid)
    const whatsappUrl = `https://wa.me/${formattedPhone}`;
    // Open WhatsApp chat in a new tab
    window.open(whatsappUrl, '_blank');
  };

  const handleRenewSubmit = async () => {
    // **FIX START**: Added stricter validation to match backend requirements
    if (
      !selectedStudent || !startDate || !endDate ||
      !nameInput.trim() || !phoneInput.trim() || !addressInput.trim() ||
      selectedShifts.length === 0 || !totalFee || !selectedBranch?.value
    ) {
      toast.error('Please ensure Name, Phone, Address, Branch, at least one Shift, and Fee are filled correctly.');
      return;
    }
    // **FIX END**

    try {
      await api.renewStudent(selectedStudent.id, {
        name: nameInput,
        registrationNumber: registrationNumberInput,
        fatherName: fatherNameInput,
        aadharNumber: aadharNumberInput,
        address: addressInput,
        membershipStart: format(startDate, 'yyyy-MM-dd'),
        membershipEnd: format(endDate, 'yyyy-MM-dd'),
        email: emailInput,
        phone: phoneInput,
        branchId: selectedBranch.value,
        shiftIds: selectedShifts.map(shift => shift.value),
        seatId: selectedSeat ? selectedSeat.value : undefined,
        totalFee: parseFloat(totalFee),
        cash: parseFloat(cash) || 0,
        online: parseFloat(online) || 0,
        securityMoney: parseFloat(securityMoney) || 0,
        remark: remark.trim() || undefined,
      });

      toast.success(`Membership renewed for ${selectedStudent.name}`);
      setRenewDialogOpen(false);

      const resp = await api.getExpiredMemberships(selectedBranchFilter?.value);
      setStudents(resp.students);

      // Navigate to the renewed student's details page to show updated seat information
      navigate(`/students/${selectedStudent.id}`);

    } catch (err: any) {
      console.error('Renew error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Failed to renew membership');
    }
  };

  const cashAmount = parseFloat(cash) || 0;
  const onlineAmount = parseFloat(online) || 0;
  const paid = cashAmount + onlineAmount;
  const due = (parseFloat(totalFee) || 0) - paid;

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={false} setIsCollapsed={() => {}} onBarcodeClick={() => {}} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Navbar />
        {/* Sub Navigation */}
        <div className="border-b bg-white/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex gap-3 overflow-x-auto py-3">
              <Link
                to="/students"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm md:text-base font-medium shadow-sm ring-1 ring-transparent transition-colors ${location.pathname.startsWith('/students') && !location.pathname.startsWith('/students/') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100 hover:ring-slate-200'}`}
              >
                <Users className="h-4 w-4" />
                All Students
              </Link>
              <Link
                to="/active-students"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm md:text-base font-medium shadow-sm ring-1 ring-transparent transition-colors ${location.pathname.startsWith('/active-students') ? 'bg-emerald-100 text-emerald-700' : 'text-slate-700 hover:bg-slate-100 hover:ring-slate-200'}`}
              >
                <UserCheck className="h-4 w-4" />
                Active Students
              </Link>
              <Link
                to="/expired-memberships"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm md:text-base font-medium shadow-sm ring-1 ring-transparent transition-colors ${location.pathname.startsWith('/expired-memberships') ? 'bg-rose-100 text-rose-700' : 'text-slate-700 hover:bg-slate-100 hover:ring-slate-200'}`}
              >
                <AlertTriangle className="h-4 w-4" />
                Expired Memberships
              </Link>
              <Link
                to="/expiring-memberships?range=1-2"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm md:text-base font-medium shadow-sm ring-1 ring-transparent transition-colors ${location.pathname.startsWith('/expiring-memberships') ? 'bg-amber-100 text-amber-700' : 'text-slate-700 hover:bg-slate-100 hover:ring-slate-200'}`}
              >
                <Clock className="h-4 w-4" />
                Expiring 1–2 Days
              </Link>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">Expired Memberships</h2>
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
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search Input */}
                <div className="flex flex-col space-y-1 lg:col-span-1">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Search by name, phone, or Reg. No."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Branch Filter */}
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Branch</label>
                  <Select
                    options={branchFilterOptions}
                    value={selectedBranchFilter}
                    onChange={setSelectedBranchFilter}
                    placeholder="Filter by Branch"
                    isClearable
                    className="react-select-container"
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: '40px',
                        borderRadius: '0.5rem',
                        border: '1px solid #d1d5db',
                        backgroundColor: 'white',
                        fontSize: '0.875rem',
                        '&:hover': {
                          borderColor: '#9333ea'
                        }
                      })
                    }}
                  />
                </div>

                {/* Gender Filter */}
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Gender</label>
                  <select
                    value={selectedGenderFilter}
                    onChange={(e) => setSelectedGenderFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="">N/A</option>
                  </select>
                </div>

                {/* Sort Cards (only visible in card view) */}
                {viewMode === 'card' && (
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Sort Cards</label>
                    <select
                      className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      value={`${sortField}-${sortDirection}`}
                      onChange={(e) => {
                        const [field, direction] = e.target.value.split('-');
                        setSortField(field);
                        setSortDirection(direction as 'asc' | 'desc');
                      }}
                    >
                      {cardSortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
          {loading ? (
            <p>Loading...</p>
          ) : viewMode === 'list' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('name')}>
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      {renderSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('registrationNumber')}>
                    <div className="flex items-center space-x-1">
                      <span>Registration Number</span>
                      {renderSortIcon('registrationNumber')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('email')}>
                    <div className="flex items-center space-x-1">
                      <span>Email</span>
                      {renderSortIcon('email')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('phone')}>
                    <div className="flex items-center space-x-1">
                      <span>Phone</span>
                      {renderSortIcon('phone')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('seat')}>
                    <div className="flex items-center space-x-1">
                      <span>Seat</span>
                      {renderSortIcon('seat')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort('membershipEnd')}>
                    <div className="flex items-center space-x-1">
                      <span>Expiry</span>
                      {renderSortIcon('membershipEnd')}
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.registrationNumber || 'N/A'}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.phone}</TableCell>
                      <TableCell>{student.seatNumber || student.assignments?.[0]?.seatNumber || 'N/A'}</TableCell>
                      <TableCell>{formatDate(student.membershipEnd)}</TableCell>
                      <TableCell className="space-x-2">
                        <Button onClick={() => navigate(`/students/${student.id}`)} variant="outline">
                          <Eye size={16} />
                        </Button>
                        {(user?.role === 'admin' || user?.role === 'staff') && (
                          <Button onClick={() => handleRenewClick(student)}>
                            <ChevronRight size={16} /> Renew
                          </Button>
                        )}
                        {(user?.role === 'admin' ||
                          (hasPermissions(user) && user.permissions.includes('manage_students'))) && (
                          <Button
                            variant="destructive"
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
                                try {
                                    await api.deleteStudent(student.id);
                                    setStudents(students.filter((s) => s.id !== student.id));
                                    toast.success('Student deleted successfully.');
                                } catch(err: any) {
                                    toast.error(err.message || "Failed to delete student.");
                                }
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => handleWhatsAppClick(student.phone)} title="Send WhatsApp Message">
                          <MessageCircle size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-2 sm:p-4">
              {filteredStudents.length > 0 ? (
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
                  {filteredStudents.map((student) => (
                      <div key={student.id} className="rounded-xl border shadow-sm p-4 flex flex-col h-full bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-800">{student.name}</h4>
                            <p className="text-xs text-gray-500 flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5 text-indigo-400"/> Reg: {student.registrationNumber || 'N/A'}</p>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Expired</span>
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
                            <div className="text-[11px] uppercase tracking-wide text-slate-600 flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5 text-slate-400"/> Expiry</div>
                            <div className="mt-0.5 font-semibold text-slate-800">{formatDate(student.membershipEnd)}</div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button onClick={() => navigate(`/students/${student.id}`)} variant="outline" title="View Details"><Eye size={16} /></Button>
                            {(user?.role === 'admin' || user?.role === 'staff') && (
                              <Button onClick={() => handleRenewClick(student)} title="Renew">Renew</Button>
                            )}
                            {(user?.role === 'admin' || (hasPermissions(user) && user.permissions.includes('manage_students'))) && (
                              <Button variant="destructive" onClick={async () => {
                                if (window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
                                  try {
                                    await api.deleteStudent(student.id);
                                    setStudents(students.filter((s) => s.id !== student.id));
                                    toast.success('Student deleted successfully.');
                                  } catch (err: any) {
                                    toast.error(err.message || 'Failed to delete student.');
                                  }
                                }
                              }}><Trash2 size={16} /></Button>
                            )}
                            <Button variant="outline" onClick={() => handleWhatsAppClick(student.phone)} title="Send WhatsApp Message"><MessageCircle size={16} /></Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">No expired students found.</div>
              )}
            </div>
          )}
        </div>

        {/* Renewal Dialog */}
        <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Renew Membership</DialogTitle>
              <DialogDescription>Renew for {selectedStudent?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium">Branch</label>
                <Select
                  options={branchOptions}
                  value={selectedBranch}
                  onChange={(option) => {
                    setSelectedBranch(option);
                    // Reset dependent fields
                    setSelectedShifts([]);
                    setSelectedSeat(null);
                    setTotalFee('');
                  }}
                  placeholder="Select a branch"
                />
              </div>
               <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
              </div>
               <div>
                <label className="block text-sm font-medium">Registration Number</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  type="text"
                  value={registrationNumberInput}
                  onChange={(e) => setRegistrationNumberInput(e.target.value)}
                />
              </div>
               <div>
                <label className="block text-sm font-medium">Father's Name</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  type="text"
                  value={fatherNameInput}
                  onChange={(e) => setFatherNameInput(e.target.value)}
                />
              </div>
                <div>
                <label className="block text-sm font-medium">Aadhar Number</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  type="text"
                  value={aadharNumberInput}
                  onChange={(e) => setAadharNumberInput(e.target.value)}
                />
              </div>
                <div>
                <label className="block text-sm font-medium">Address</label>
                <textarea
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Start Date</label>
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} className="rounded-md border"/>
              </div>
              <div>
                <label className="block text-sm font-medium">End Date</label>
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} className="rounded-md border"/>
              </div>
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Phone</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Branch</label>
                <Select
                  options={branchOptions}
                  value={selectedBranch}
                  onChange={setSelectedBranch}
                  placeholder="Select Branch"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Shifts</label>
                <Select
                  options={shiftOptions}
                  value={selectedShifts}
                  onChange={(selectedOptions: MultiValue<any>) => setSelectedShifts([...selectedOptions])}
                  placeholder="Select Shifts"
                  isMulti
                  closeMenuOnSelect={false}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Seat</label>
                <Select
                  options={seatOptions}
                  value={selectedSeat}
                  onChange={setSelectedSeat}
                  placeholder="Select Seat"
                  isDisabled={selectedShifts.length === 0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Total Fee</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  type="number"
                  value={totalFee}
                  onChange={(e) => setTotalFee(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Cash Payment</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Online Payment</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  type="number"
                  value={online}
                  onChange={(e) => setOnline(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Security Money</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1"
                  type="number"
                  value={securityMoney}
                  onChange={(e) => setSecurityMoney(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Amount Paid</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-100"
                  type="number"
                  value={paid.toFixed(2)}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Due Amount</label>
                <input
                  className="w-full border rounded px-3 py-2 mt-1 bg-gray-100"
                  type="number"
                  value={due.toFixed(2)}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Remark</label>
                <textarea
                  className="w-full border rounded px-3 py-2 mt-1"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenewSubmit}>Renew Membership</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ExpiredMemberships;