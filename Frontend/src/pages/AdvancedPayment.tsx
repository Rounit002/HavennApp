import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { 
  CreditCard, Search, Plus, Calendar, MapPin, User, 
  DollarSign, X, Loader2, LayoutGrid, List, Pencil, Trash2, CheckCircle2, Circle
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Student {
  id: number;
  name: string;
  phone: string;
  fatherName?: string | null;
  branchId: number;
  branchName?: string;
  membershipEnd: string;
  status: 'active' | 'expired';
}

interface AdvancePaymentRecord {
  id: number;
  studentId: number;
  studentName: string;
  student_name?: string;
  registrationNumber: string;
  registration_number?: string;
  seatNumber: string;
  seat_number?: string;
  branchName: string;
  branch_name?: string;
  membershipExpiry: string;
  membership_expiry?: string;
  amount: number;
  paymentDate: string;
  payment_date?: string;
  createdAt: string;
  isDone?: boolean;
  is_done?: boolean;
  notes?: string | null;
}

interface Branch {
  id: number;
  name: string;
}

const AdvancedPayment: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // UI State
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  
  // Filter State
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  // Default to current month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Form State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AdvancePaymentRecord | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  
  // Fetch advance payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['advancePayments'],
    queryFn: async () => {
      const response = await api.getAdvancePayments();
      return response;
    },
  });

  const advancePayments = paymentsData?.advancePayments || [];

  const handleBarcodeClick = () => {
    toast.info('Barcode scanning functionality');
  };

  // Fetch branches
  React.useEffect(() => {
    api.getBranches()
      .then(setBranches)
      .catch(() => toast.error('Failed to load branches'));
  }, []);

  // Fetch all students
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['allStudents'],
    queryFn: async () => {
      const response = await api.getStudents(undefined, undefined, undefined);
      return response;
    },
  });

  const students = studentsData?.students || [];

  // Filter students based on search
  const filteredStudents = students.filter((student: Student) => 
    searchTerm && (
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phone.includes(searchTerm)
    )
  );

  // Add advance payment mutation
  const addPaymentMutation = useMutation({
    mutationFn: async (data: { studentId: number; amount: number; paymentDate: string }) => {
      await api.addAdvancePayment(data);
    },
    onSuccess: () => {
      toast.success('Advance payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['advancePayments'] });
      closeModal();
    },
    onError: () => {
      toast.error('Failed to record advance payment');
    },
  });

  // Update advance payment
  const updatePaymentMutation = useMutation({
    mutationFn: async (payload: { id: number; amount?: number; paymentDate?: string; notes?: string }) => {
      const { id, ...data } = payload;
      await api.updateAdvancePayment(id, data);
    },
    onSuccess: () => {
      toast.success('Advance payment updated');
      queryClient.invalidateQueries({ queryKey: ['advancePayments'] });
      closeEdit();
    },
    onError: () => toast.error('Failed to update advance payment')
  });

  // Toggle done
  const toggleDoneMutation = useMutation({
    mutationFn: async (payload: { id: number; isDone: boolean }) => {
      await api.toggleAdvancePaymentDone(payload.id, payload.isDone);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advancePayments'] });
    },
    onError: () => toast.error('Failed to update status')
  });

  // Delete payment
  const deletePaymentMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.deleteAdvancePayment(id);
    },
    onSuccess: () => {
      toast.success('Advance payment deleted');
      queryClient.invalidateQueries({ queryKey: ['advancePayments'] });
    },
    onError: () => toast.error('Failed to delete advance payment')
  });

  const handleSubmit = () => {
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }
    
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!paymentDate) {
      toast.error('Please select a payment date');
      return;
    }

    addPaymentMutation.mutate({
      studentId: selectedStudent.id,
      amount: amountValue,
      paymentDate,
    });
  };

  const openModal = () => {
    setIsModalOpen(true);
    setSearchTerm('');
    setSelectedStudent(null);
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSearchTerm('');
    setSelectedStudent(null);
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
  };

  // Edit helpers
  const openEdit = (record: AdvancePaymentRecord) => {
    setEditRecord(record);
    setEditAmount(String(record.amount ?? ''));
    const date = (record.paymentDate || record.payment_date || '').slice(0,10);
    setEditDate(date);
    setEditNotes(record.notes || '');
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditRecord(null);
    setEditAmount('');
    setEditDate('');
    setEditNotes('');
  };

  const handleEditSave = () => {
    if (!editRecord) return;
    const amt = parseFloat(editAmount);
    if (!isFinite(amt) || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!editDate) {
      toast.error('Select a payment date');
      return;
    }
    updatePaymentMutation.mutate({ id: editRecord.id, amount: amt, paymentDate: editDate, notes: editNotes || undefined });
  };

  const handleToggleDone = (record: AdvancePaymentRecord) => {
    const done = !!(record.isDone ?? record.is_done);
    toggleDoneMutation.mutate({ id: record.id, isDone: !done });
  };

  const handleDelete = (record: AdvancePaymentRecord) => {
    if (window.confirm('Delete this advance payment?')) {
      deletePaymentMutation.mutate(record.id);
    }
  };

  const selectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchTerm('');
  };

  // Filter advance payments
  const filteredPayments = advancePayments.filter((payment: AdvancePaymentRecord) => {
    // Branch filter
    if (selectedBranchId && payment.branch_name) {
      const paymentBranch = branches.find(b => b.name === payment.branch_name);
      if (!paymentBranch || paymentBranch.id !== selectedBranchId) return false;
    }

    // Month filter (by payment date month)
    if (selectedMonth) {
      const payDate = (payment.payment_date || payment.paymentDate || '').substring(0, 7);
      if (payDate !== selectedMonth) return false;
    }

    // Date range filter (for payment date)
    if (fromDate && toDate) {
      const payDate = payment.payment_date || payment.paymentDate;
      if (payDate < fromDate || payDate > toDate) return false;
    }

    return true;
  });

  // Quick stats for current filter
  const totalAmount = filteredPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const totalCount = filteredPayments.length;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={handleBarcodeClick} />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-auto p-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-6 md:p-8 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
                  <CreditCard size={40} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1">Advanced Payment</h1>
                  <p className="text-indigo-100">Record advance payments from students</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* View toggle */}
                <div className="bg-white/20 rounded-xl p-1 hidden sm:flex">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 text-white transition ${viewMode === 'card' ? 'bg-white/30' : 'hover:bg-white/10'}`}
                    title="Card view"
                  >
                    <LayoutGrid size={18} />
                    <span className="hidden md:inline text-sm">Cards</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 text-white transition ${viewMode === 'table' ? 'bg-white/30' : 'hover:bg-white/10'}`}
                    title="Table view"
                  >
                    <List size={18} />
                    <span className="hidden md:inline text-sm">Table</span>
                  </button>
                </div>
                <button
                  onClick={openModal}
                  className="bg-white text-indigo-600 px-4 md:px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl"
                >
                  <Plus size={20} />
                  Add Payment
                </button>
              </div>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
              {/* Quick stats */}
              <div className="flex items-center gap-4">
                <div className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-sm font-semibold">{totalCount} payments</div>
                <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-sm font-semibold">₹{totalAmount.toFixed(2)}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Branch Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                <select
                  value={selectedBranchId || ''}
                  onChange={(e) => setSelectedBranchId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>

              {/* Payment Month Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* From Date (Payment Date) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* To Date (Payment Date) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Quick actions */}
              <div className="flex items-end gap-2">
                <button
                  onClick={() => {
                    const current = new Date().toISOString().slice(0, 7);
                    setSelectedMonth(current);
                    setFromDate('');
                    setToDate('');
                    setSelectedBranchId(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium w-full"
                >
                  This Month
                </button>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(selectedBranchId || selectedMonth || fromDate || toDate) && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    setSelectedBranchId(null);
                    setSelectedMonth('');
                    setFromDate('');
                    setToDate('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </motion.div>

          {/* Advance Payments - Views */}
          {viewMode === 'table' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Advanced Payment Records</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Showing {filteredPayments.length} of {advancePayments.length} payments
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Student Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ID/Reg No.</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Seat Number</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Branch</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Payment Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Membership Expiry</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <CreditCard className="mx-auto text-gray-300 mb-3" size={48} />
                          <p className="text-gray-500">
                            {advancePayments.length === 0 ? 'No advance payments recorded yet' : 'No payments match the selected filters'}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            {advancePayments.length === 0 ? 'Click "Add Payment" to record one' : 'Try adjusting your filters'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-900 font-medium">{payment.studentName || payment.student_name}</td>
                          <td className="px-6 py-4 text-gray-600">{payment.registrationNumber || payment.registration_number || 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-600">{payment.seatNumber || payment.seat_number || 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-600">{payment.branchName || payment.branch_name || 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-900 font-semibold">₹{parseFloat(payment.amount).toFixed(2)}</td>
                          <td className="px-6 py-4 text-gray-600">{new Date(payment.paymentDate || payment.payment_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-gray-600">{new Date(payment.membershipExpiry || payment.membership_expiry).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            {payment.isDone || payment.is_done ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700">
                                <CheckCircle2 size={14} /> Done
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-amber-50 text-amber-700">
                                <Circle size={14} /> Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEdit(payment)}
                                className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium"
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleToggleDone(payment)}
                                className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium"
                                title={payment.isDone || payment.is_done ? 'Mark as Pending' : 'Mark as Done'}
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(payment)}
                                className="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-medium"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className=""
            >
              {filteredPayments.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <CreditCard className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">
                    {advancePayments.length === 0 ? 'No advance payments recorded yet' : 'No payments match the selected filters'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {advancePayments.length === 0 ? 'Click "Add Payment" to record one' : 'Try adjusting your filters'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100 hover:shadow-xl transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-gray-500">{new Date(payment.paymentDate || payment.payment_date).toLocaleDateString()}</div>
                        <div className="flex items-center gap-2">
                          {payment.isDone || payment.is_done ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700">
                              <CheckCircle2 size={14} /> Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-amber-50 text-amber-700">
                              <Circle size={14} /> Pending
                            </span>
                          )}
                          <div className="px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                            ₹{parseFloat(payment.amount).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold">
                          {(payment.studentName || payment.student_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{payment.studentName || payment.student_name}</div>
                          <div className="text-xs text-gray-500">{payment.registrationNumber || payment.registration_number || 'N/A'}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2"><MapPin size={14} />{payment.branchName || payment.branch_name || 'N/A'}</div>
                        <div className="flex items-center gap-2"><Calendar size={14} />Expiry: {new Date(payment.membershipExpiry || payment.membership_expiry).toLocaleDateString()}</div>
                        <div className="col-span-2 text-xs text-gray-500">Seat: {payment.seatNumber || payment.seat_number || 'N/A'}</div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => openEdit(payment)}
                          className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium flex items-center gap-1"
                        >
                          <Pencil size={16} /> Edit
                        </button>
                        <button
                          onClick={() => handleToggleDone(payment)}
                          className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium flex items-center gap-1"
                        >
                          <CheckCircle2 size={16} /> {payment.isDone || payment.is_done ? 'Undo' : 'Mark Done'}
                        </button>
                        <button
                          onClick={() => handleDelete(payment)}
                          className="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-medium flex items-center gap-1"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Add Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">Add Advanced Payment</h3>
                <button
                  onClick={closeModal}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Student Selection */}
              {!selectedStudent ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Select Student *
                  </label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search student by name or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      autoFocus
                    />
                  </div>
                  
                  {/* Student List */}
                  <div className="border-2 border-gray-200 rounded-xl max-h-64 overflow-y-auto">
                    {studentsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                      </div>
                    ) : !searchTerm ? (
                      <div className="text-center py-8 text-gray-500">
                        <User className="mx-auto mb-2 text-gray-300" size={40} />
                        <p>Start typing to search students</p>
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <User className="mx-auto mb-2 text-gray-300" size={40} />
                        <p>No students found</p>
                      </div>
                    ) : (
                      filteredStudents.map((student: Student) => (
                        <button
                          key={student.id}
                          onClick={() => selectStudent(student)}
                          className="w-full px-4 py-3 hover:bg-indigo-50 border-b border-gray-100 text-left transition-colors"
                        >
                          <div className="font-semibold text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.phone} • {student.branchName}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Selected Student</label>
                  <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-indigo-900">{selectedStudent.name}</p>
                      <p className="text-sm text-indigo-700">{selectedStudent.phone}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-indigo-600">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {selectedStudent.branchName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          Expires: {new Date(selectedStudent.membershipEnd).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="text-indigo-600 hover:bg-indigo-100 rounded-lg p-2 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Advance Amount (₹) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter advance amount"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={!selectedStudent}
                  />
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={!selectedStudent}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={addPaymentMutation.isPending || !selectedStudent}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {addPaymentMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Recording...
                    </>
                  ) : (
                    'Record Payment'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {isEditOpen && editRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Edit Advance Payment</h3>
              <button onClick={closeEdit} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={closeEdit} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold">Cancel</button>
                <button
                  onClick={handleEditSave}
                  disabled={updatePaymentMutation.isPending}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {updatePaymentMutation.isPending ? (<><Loader2 size={18} className="animate-spin" /> Saving...</>) : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdvancedPayment;
