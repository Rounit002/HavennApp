// src/pages/AllStudents.tsx
import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import BarcodeGenerator from '../components/BarcodeGenerator';
import InvoiceModal from '../components/InvoiceModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '../services/api';

interface Branch {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}
import { Search, ChevronLeft, ChevronRight, Trash2, Eye, ArrowUp, ArrowDown, ToggleLeft, ToggleRight, FileText, ChevronUp, ChevronDown, Grid, Rows3, Phone, IdCard, Armchair, Calendar, CheckCircle2, AlertTriangle, XCircle, Users, UserCheck, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';

interface Student {
  id: number;
  name: string;
  registrationNumber?: string | null;
  fatherName?: string | null;
  aadharNumber?: string | null;
  email?: string;
  phone: string;
  address?: string | null;
  branchId?: number;
  branchName?: string | null;
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
  aadhaarFrontUrl?: string | null;
  aadhaarBackUrl?: string | null;
  discount?: number;
  createdAt: string;
  updatedAt?: string;
  status: string;
  seatNumber?: string | null;
  lockerNumber?: string | null;
  isActive: boolean;
  gender?: string | null;
  assignments?: Array<{
    seatId: number;
    shiftId: number;
    seatNumber: string;
    shiftTitle: string;
  }>;
}

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toISOString().split('T')[0];
};

const AllStudents = () => {
  const [library, setLibrary] = useState<{
    id: number;
    library_code: string;
    name: string;
  } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // New sorting state for all columns
  const [sortField, setSortField] = useState<string>('createdAt');
  const [columnSortDirection, setColumnSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleInvoiceClick = (studentId: number) => {
    setSelectedStudentId(studentId);
    setShowInvoiceModal(true);
  };

  const handleBarcodeClick = () => {
    setShowBarcodeGenerator(true);
  };

  const fetchLibraryData = async () => {
    try {
      const response = await api.getLibraryProfile();
      setLibrary({
        id: response.library.id,
        library_code: response.library.libraryCode,
        name: response.library.libraryName
      });
    } catch (error) {
      console.error('Error fetching library data:', error);
      toast.error('Failed to load library information');
    }
  };

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.getStudents(fromDate || undefined, toDate || undefined, selectedBranchId);
      const updatedStudents = response.students.map((student: any) => {
        const membershipEndDate = student.membershipEnd ? new Date(student.membershipEnd) : null;
        const isExpired = membershipEndDate ? membershipEndDate < new Date() : false;
        return {
          ...student,
          status: student.status || (isExpired ? 'expired' : 'active'),
          createdAt: student.createdAt || 'N/A',
          updatedAt: student.updatedAt || 'N/A',
          membershipStart: student.membershipStart || 'N/A',
          membershipEnd: student.membershipEnd || 'N/A',
          totalFee: typeof student.totalFee === 'number' ? student.totalFee : Number(student.totalFee) || 0,
          amountPaid: typeof student.amountPaid === 'number' ? student.amountPaid : Number(student.amountPaid) || 0,
          dueAmount: typeof student.dueAmount === 'number' ? student.dueAmount : Number(student.dueAmount) || 0,
          cash: typeof student.cash === 'number' ? student.cash : Number(student.cash) || 0,
          online: typeof student.online === 'number' ? student.online : Number(student.online) || 0,
          securityMoney: typeof student.securityMoney === 'number' ? student.securityMoney : Number(student.securityMoney) || 0,
          discount: typeof student.discount === 'number' ? student.discount : Number(student.discount) || 0,
          isActive: Boolean(student.isActive),
        } as Student;
      });
      setStudents(updatedStudents);
    } catch (error: any) {
      console.error('Failed to fetch students:', error.message);
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const branchesData = await api.getBranches();
        // getBranches now returns the array directly
        setBranches(branchesData || []);
      } catch (error: any) {
        console.error('Failed to fetch branches:', error.message);
        toast.error('Failed to fetch branches');
        setBranches([]);
      }
    };
    fetchBranches();
    fetchStudents();
    fetchLibraryData();
  }, [selectedBranchId, fromDate, toDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBranchId, fromDate, toDate]);

  const handleSort = () => {
    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // New sorting function for all columns
  const handleColumnSort = (field: string) => {
    if (sortField === field) {
      setColumnSortDirection(columnSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setColumnSortDirection('asc');
    }
  };

  // Render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return columnSortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  const handleStatusToggle = async (id: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'activate' : 'deactivate';
    if (window.confirm(`Are you sure you want to ${action} this student?${!newStatus ? '\nThis will unassign their seat.' : ''}`)) {
      try {
        await api.updateStudentStatus(id, { isActive: newStatus });
        toast.success(`Student ${action}d successfully`);
        fetchStudents(); // Refetch the list to show updated status and seat number
      } catch (error: any) {
        toast.error(`Failed to ${action} student`);
      }
    }
  };
  
  const sortedStudents = React.useMemo(() => {
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
        case 'createdAt':
        default:
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          aValue = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
          bValue = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
          break;
      }
      
      if (aValue < bValue) return columnSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return columnSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [students, sortField, columnSortDirection]);

  const filteredStudents = sortedStudents.filter((student: Student) =>
    (student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     student.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (student.registrationNumber && student.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()))) &&
    (selectedGender === '' || student.gender === selectedGender)
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

  const getSeatDisplay = (student: Student) =>
    student.seatNumber || student.assignments?.[0]?.seatNumber || 'N/A';

  const getBranchDisplay = (student: Student) => {
    if (student.branchName) return student.branchName;
    if (student.branchId) {
      const branch = branches.find((b) => b.id === student.branchId);
      if (branch) return branch.name;
    }
    return 'N/A';
  };

  const getStatusDisplay = (student: Student) => {
    if (!student.isActive) return 'Inactive';
    return student.status === 'active' ? 'Active' : 'Expired';
  };

  const formatCurrencyValue = (value?: number) => {
    if (value === null || value === undefined) return '0.00';
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00';
  };

  const formatCurrencyLabel = (value?: number) => `₹${formatCurrencyValue(value)}`;

  const formatDisplay = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    return String(value);
  };

  const formatDateValue = (value?: string) => (value && value !== 'N/A' ? value : 'N/A');

  const essentialFields = React.useMemo(
    () => [
      { label: 'Name', getValue: (s: Student) => formatDisplay(s.name) },
      { label: "Father's Name", getValue: (s: Student) => formatDisplay(s.fatherName) },
      { label: 'Registration Number', getValue: (s: Student) => formatDisplay(s.registrationNumber) },
      { label: 'Phone', getValue: (s: Student) => formatDisplay(s.phone) },
      { label: 'Branch', getValue: (s: Student) => getBranchDisplay(s) },
      { label: 'Status', getValue: (s: Student) => getStatusDisplay(s) },
      { label: 'Seat Number', getValue: (s: Student) => getSeatDisplay(s) },
      { label: 'Total Fee', getValue: (s: Student) => formatCurrencyLabel(s.totalFee) },
      { label: 'Amount Paid', getValue: (s: Student) => formatCurrencyLabel(s.amountPaid) },
      { label: 'Created On', getValue: (s: Student) => formatDateValue(s.createdAt) },
    ],
    [branches]
  );

  const formatNumberForExport = (value?: number) => {
    if (value === null || value === undefined) return '0';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0';
    return Number.isInteger(numeric) ? numeric.toString() : numeric.toFixed(2);
  };

  const csvFields = React.useMemo(
    () => [
      { label: 'Name', getValue: (s: Student) => formatDisplay(s.name) },
      { label: "Father's Name", getValue: (s: Student) => formatDisplay(s.fatherName) },
      { label: 'Registration Number', getValue: (s: Student) => formatDisplay(s.registrationNumber) },
      { label: 'Phone', getValue: (s: Student) => formatDisplay(s.phone) },
      { label: 'Branch', getValue: (s: Student) => getBranchDisplay(s) },
      { label: 'Status', getValue: (s: Student) => getStatusDisplay(s) },
      { label: 'Seat Number', getValue: (s: Student) => getSeatDisplay(s) },
      { label: 'Membership Start', getValue: (s: Student) => formatDateValue(s.membershipStart) },
      { label: 'Membership End', getValue: (s: Student) => formatDateValue(s.membershipEnd) },
      { label: 'Total Fee', getValue: (s: Student) => formatNumberForExport(s.totalFee) },
      { label: 'Amount Paid', getValue: (s: Student) => formatNumberForExport(s.amountPaid) },
      { label: 'Created On', getValue: (s: Student) => formatDateValue(s.createdAt) },
    ],
    [branches]
  );

  const csvEscape = (value: string) =>
    `"${value.replace(/"/g, '""').replace(/\r?\n|\r/g, ' ').trim()}"`;

  const htmlEscape = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const handleExportCSV = () => {
    if (!filteredStudents.length) {
      toast.error('No students available to export.');
      return;
    }

    const headers = csvFields.map((field) => csvEscape(field.label)).join(',');
    const rows = filteredStudents.map((student) =>
      csvFields
        .map((field) => csvEscape(field.getValue(student)))
        .join(',')
    );

    const csvContent = [headers, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `students-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportXLS = () => {
    if (!filteredStudents.length) {
      toast.error('No students available to export.');
      return;
    }

    const headerRow = csvFields
      .map(
        (field) =>
          `<th style="background:#f3f4f6;text-align:left;padding:6px;border:1px solid #e5e7eb;">${htmlEscape(
            field.label
          )}</th>`
      )
      .join('');

    const bodyRows = filteredStudents
      .map((student) => {
        const cells = csvFields
          .map(
            (field) =>
              `<td style="padding:6px;border:1px solid #e5e7eb;">${htmlEscape(field.getValue(student))}</td>`
          )
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    const worksheet = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8" /><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Students</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml></head><body><table>${headerRow ? `<thead><tr>${headerRow}</tr></thead>` : ''}<tbody>${bodyRows}</tbody></table></body></html>`;

    const blob = new Blob([worksheet], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `students-${Date.now()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!filteredStudents.length) {
      toast.error('No students available to export.');
      return;
    }

    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 14;
    const marginY = 18;
    const lineHeight = 6;
    const columnGap = 1;
    const contentWidth = pageWidth - marginX * 2;

    const columnWidths = [32, 32, 28, 28, 30, 18, 22, 24, 24, 31];
    const pdfColumns = essentialFields.map((field, idx) => ({
      ...field,
      width: columnWidths[idx] || contentWidth / essentialFields.length,
    }));

    const columnPositions: number[] = [];
    pdfColumns.forEach((column, idx) => {
      const prevPos = columnPositions[idx - 1] ?? marginX;
      const prevWidth = pdfColumns[idx - 1]?.width ?? 0;
      columnPositions[idx] = idx === 0 ? marginX : prevPos + prevWidth + columnGap;
    });

    pdf.setFontSize(16);
    pdf.text('All Students Export (Essential Fields)', marginX, marginY - 6);
    pdf.setFontSize(10);
    pdf.text(
      `Generated on ${new Date().toLocaleString()}`,
      marginX,
      marginY - 1
    );

    let currentY = marginY;

    const drawHeader = () => {
      pdf.setFont(undefined, 'bold');
      pdfColumns.forEach((column, idx) => {
        pdf.text(column.label, columnPositions[idx], currentY, {
          baseline: 'top',
        });
      });
      currentY += lineHeight;
      pdf.setFont(undefined, 'normal');
      pdf.line(marginX, currentY - 2, pageWidth - marginX, currentY - 2);
    };

    drawHeader();

    filteredStudents.forEach((student) => {
      if (currentY + lineHeight * 2 > pageHeight - marginY) {
        pdf.addPage();
        currentY = marginY;
        drawHeader();
      }

      let rowHeight = lineHeight;
      const wrappedValues = pdfColumns.map((column, idx) => {
        const text = column.getValue(student);
        const wrapped = pdf.splitTextToSize(text, column.width - 1);
        const height = wrapped.length * lineHeight;
        if (height > rowHeight) rowHeight = height;
        return { wrapped, idx };
      });

      wrappedValues.forEach(({ wrapped, idx }) => {
        pdf.text(wrapped, columnPositions[idx], currentY, {
          baseline: 'top',
        });
      });

      currentY += rowHeight + 1.5;
    });

    pdf.save(`students-${Date.now()}.pdf`);
  };

  const selectedBranchName = selectedBranchId
    ? branches.find(branch => branch.id === selectedBranchId)?.name
    : null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={handleBarcodeClick} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        {/* Sub Navigation */}
        <div className="border-b bg-white/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-3 overflow-x-auto py-3">
              <Link
                to="/students"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm md:text-base font-medium shadow-sm bg-gradient-to-r from-[#E1F5EE] via-sky-50 to-[#E1F5EE] text-[#0F6E56] ring-1 ring-[#9FE1CB]/50 ${location.pathname.startsWith('/students') && !location.pathname.startsWith('/students/') ? 'ring-2 ring-[#9FE1CB]' : ''}`}
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
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm md:text-base font-medium shadow-sm bg-gradient-to-r from-rose-50 via-[#E1F5EE] to-rose-100 text-rose-700 ring-1 ring-rose-200/50 ${location.pathname.startsWith('/expired-memberships') ? 'ring-2 ring-rose-300' : ''}`}
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
              <h1 className="text-2xl font-bold text-gray-800">All Students</h1>
              <p className="text-gray-500">Manage all your students</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full">
                  <h3 className="text-lg font-medium flex-1">Students</h3>
                  <div className="flex bg-slate-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${viewMode === 'list' ? 'bg-white text-[#1D9E75] shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                      title="List View"
                    >
                      <Rows3 className="h-4 w-4" />
                      <span className="hidden sm:inline">List</span>
                    </button>
                    <button
                      onClick={() => setViewMode('card')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${viewMode === 'card' ? 'bg-white text-[#1D9E75] shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
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
                    className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#5DCAA5]"
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="bg-gray-50 border-b border-gray-200">
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Branch Filter */}
                    <div className="flex flex-col space-y-1">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Branch</label>
                      <select
                        value={selectedBranchId ?? ''}
                        onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : undefined)}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition-all"
                      >
                        <option value="">All Branches</option>
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Gender Filter */}
                    <div className="flex flex-col space-y-1">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Gender</label>
                      <select
                        value={selectedGender}
                        onChange={(e) => setSelectedGender(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition-all"
                      >
                        <option value="">All Genders</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="">N/A</option>
                      </select>
                    </div>

                    {/* From Date */}
                    <div className="flex flex-col space-y-1">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">From Date</label>
                      <input 
                        type="date" 
                        value={fromDate} 
                        onChange={(e) => setFromDate(e.target.value)} 
                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition-all" 
                      />
                    </div>

                    {/* To Date */}
                    <div className="flex flex-col space-y-1">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">To Date</label>
                      <input 
                        type="date" 
                        value={toDate} 
                        onChange={(e) => setToDate(e.target.value)} 
                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition-all" 
                      />
                    </div>

                    {/* Export Buttons */}
                    <div className="flex flex-col space-y-1">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Export</label>
                      <div className="flex gap-2">
                        <button
                          onClick={handleExportCSV}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
                          title="Export table as CSV"
                        >
                          <Download className="h-4 w-4" />
                          CSV
                        </button>
                        <button
                          onClick={handleExportXLS}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-teal-700 bg-white border border-teal-300 hover:bg-teal-50 hover:border-teal-400 transition-all shadow-sm"
                          title="Export table as XLS"
                        >
                          <Download className="h-4 w-4" />
                          XLS
                        </button>
                        <button
                          onClick={handleExportPDF}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-white bg-[#1D9E75] border border-[#1D9E75] hover:bg-[#0F6E56] transition-all shadow-sm"
                          title="Export table as PDF"
                        >
                          <FileText className="h-4 w-4" />
                          PDF
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {viewMode === 'list' ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleColumnSort('name')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Name</span>
                          {renderSortIcon('name')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleColumnSort('registrationNumber')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Registration</span>
                          {renderSortIcon('registrationNumber')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleColumnSort('phone')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Phone</span>
                          {renderSortIcon('phone')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleColumnSort('status')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Status</span>
                          {renderSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleColumnSort('seat')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Seat</span>
                          {renderSortIcon('seat')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleColumnSort('createdAt')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Added On</span>
                          {renderSortIcon('createdAt')}
                        </div>
                      </TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8">Loading...</TableCell></TableRow>
                    ) : currentStudents.length > 0 ? (
                      currentStudents.map((student) => (
                        <TableRow key={student.id} className={`${!student.isActive ? 'bg-gray-100 text-gray-400' : ''}`}>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.registrationNumber || 'N/A'}</TableCell>
                          <TableCell>{student.phone}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              !student.isActive ? 'bg-yellow-100 text-yellow-800' :
                              student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {!student.isActive ? 'Inactive' : student.status === 'active' ? 'Active' : 'Expired'}
                            </span>
                          </TableCell>
                          <TableCell>{student.seatNumber || student.assignments?.[0]?.seatNumber || 'N/A'}</TableCell>
                          <TableCell>{formatDate(student.createdAt)}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleInvoiceClick(student.id)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                              title="View Invoice"
                            >
                              <FileText size={16} />
                              <span className="text-xs font-medium">Invoice</span>
                            </button>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleStatusToggle(student.id, student.isActive)}
                              className={`flex items-center gap-1 text-xs p-1 rounded font-semibold ${student.isActive ? 'text-yellow-600 hover:bg-yellow-100' : 'text-green-600 hover:bg-green-100'}`}
                              title={student.isActive ? 'Deactivate Student' : 'Activate Student'}
                            >
                              {student.isActive ? <ToggleLeft size={16}/> : <ToggleRight size={16}/>}
                              {student.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </TableCell>
                          <TableCell>
                            <button onClick={() => handleViewDetails(student.id)} className="mr-2 text-blue-600 hover:text-blue-800 p-2"><Eye size={16} /></button>
                            <button onClick={() => handleDelete(student.id)} className="text-red-600 hover:text-red-800 p-2"><Trash2 size={16} /></button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={9} className="text-center py-8">No students found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              ) : (
              <div className="p-4">
                {loading ? (
                  <div className="text-center text-gray-500 py-8">Loading...</div>
                ) : currentStudents.length > 0 ? (
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
                    {currentStudents.map((student) => (
                      <div key={student.id} className={`rounded-xl border shadow-md p-4 flex flex-col h-full bg-gradient-to-br ${!student.isActive ? 'from-amber-50 via-orange-50 to-amber-100 border-amber-200' : (student.status === 'active' ? 'from-emerald-50 via-teal-50 to-emerald-100 border-emerald-200' : 'from-rose-50 via-[#E1F5EE] to-rose-100 border-rose-200')} ring-1 ring-white/60 transition-transform duration-200 ease-out transform-gpu will-change-transform hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:rotate-[1.5deg]`}> 
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-800">{student.name}</h4>
                            <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
                              <IdCard className="h-3.5 w-3.5 text-[#5DCAA5]" /> Reg: {student.registrationNumber || 'N/A'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${!student.isActive ? 'bg-yellow-100 text-yellow-800' : (student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}`}>
                            { !student.isActive ? <AlertTriangle className="h-3.5 w-3.5"/> : (student.status === 'active' ? <CheckCircle2 className="h-3.5 w-3.5"/> : <XCircle className="h-3.5 w-3.5"/>) }
                            { !student.isActive ? 'Inactive' : (student.status === 'active' ? 'Active' : 'Expired') }
                          </span>
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
                          <div className="rounded-lg p-3 bg-white/70 border border-white/60">
                            <div className="text-[11px] uppercase tracking-wide text-slate-600 flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-slate-400"/> Added</div>
                            <div className="mt-0.5 font-semibold text-slate-800">{formatDate(student.createdAt)}</div>
                          </div>
                          <div className="rounded-lg p-3 bg-white/70 border border-white/60">
                            <div className="text-[11px] uppercase tracking-wide text-slate-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-slate-400"/> Status</div>
                            <div className="mt-0.5 font-semibold text-slate-800 capitalize">{!student.isActive ? 'inactive' : student.status}</div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleViewDetails(student.id)} className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50" title="View Details"><Eye size={16} /></button>
                            <button onClick={() => handleInvoiceClick(student.id)} className="text-[#1D9E75] hover:text-[#0F6E56] p-2 rounded hover:bg-[#E1F5EE]" title="Invoice"><FileText size={16} /></button>
                            <button onClick={() => handleDelete(student.id)} className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50" title="Delete"><Trash2 size={16} /></button>
                          </div>
                          <button
                            onClick={() => handleStatusToggle(student.id, student.isActive)}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded font-semibold ${student.isActive ? 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100' : 'text-green-700 bg-green-50 hover:bg-green-100'}`}
                            title={student.isActive ? 'Deactivate Student' : 'Activate Student'}
                          >
                            {student.isActive ? <ToggleLeft size={16}/> : <ToggleRight size={16}/>}
                            {student.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">No students found.</div>
                )}
              </div>
              )}
              {!loading && filteredStudents.length > 0 && (
                <div className="flex flex-col md:flex-row items-center justify-between border-t p-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <select
                      value={studentsPerPage}
                      onChange={(e) => setStudentsPerPage(Number(e.target.value))}
                      className="text-sm border rounded py-2 px-3"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-500">per page</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded border disabled:opacity-50"><ChevronLeft size={16} /></button>
                    <span className="text-sm">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded border disabled:opacity-50"><ChevronRight size={16} /></button>
                  </div>
                  <div className="text-sm text-gray-500">
                    Showing {indexOfFirstStudent + 1}-{Math.min(indexOfLastStudent, filteredStudents.length)} of {filteredStudents.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Barcode Generator Modal */}
      {library && (
        <BarcodeGenerator
          isOpen={showBarcodeGenerator}
          onClose={() => setShowBarcodeGenerator(false)}
          libraryCode={library.library_code}
          libraryName={library.name}
          libraryId={library.id}
        />
      )}
      
      {/* Invoice Modal */}
      {selectedStudentId && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedStudentId(null);
          }}
          studentId={selectedStudentId}
        />
      )}
    </div>
  );
};

export default AllStudents;



