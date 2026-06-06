import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Download, Eye, Search, Loader2, AlertCircle, FileText, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Interface for a single collection record (renamed to avoid DOM Collection collision)
interface CollectionRecord {
  historyId: number;
  studentId: number | null;
  name: string;
  phone?: string;
  studentStatus?: 'Active' | 'Deleted';
  shiftTitle: string | null;
  totalFee: number;
  amountPaid: number;
  dueAmount: number;
  cash: number;
  online: number;
  securityMoney: number;
  remark: string;
  createdAt: string | null;
  branchId?: number;
  branchName?: string;
  seatNumber?: string | null;
}

// Interface for the branch filter
interface Branch {
  id: number;
  name: string;
}

const CollectionDue: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  // State for UI and filters
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleBarcodeClick = () => {
    // TODO: Implement barcode scanning functionality
    toast.info('Barcode scanning functionality is not yet implemented.');
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  
  // New filter states
  const [showOnlyDue, setShowOnlyDue] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Initialize filters from URL parameters
  useEffect(() => {
    const showOnlyDueParam = searchParams.get('showOnlyDue');
    if (showOnlyDueParam === 'true') {
      setShowOnlyDue(true);
    }
  }, [searchParams]);

  // State for the payment modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<CollectionRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | null>(null);

  // Fetch branches for the filter dropdown
  useEffect(() => {
    api.getBranches().then(setBranches).catch(() => toast.error('Failed to load branches'));
  }, []);

  // --- Data Fetching with React Query ---

  // QUERY 1: Fetch the list of individual collections
  const { data: collectionsData, isLoading: isCollectionsLoading } = useQuery({
    queryKey: ['collections', selectedMonth, selectedBranchId, fromDate, toDate],
    queryFn: () => {
      const params: any = { branchId: selectedBranchId || undefined };
      if (fromDate && toDate) {
        params.fromDate = fromDate;
        params.toDate = toDate;
      } else {
        params.month = selectedMonth;
      }
      return api.getCollections(params);
    },
  });

  // QUERY 2: Fetch aggregate financial statistics (ADMINS ONLY)
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['collectionStats', selectedMonth, selectedBranchId, fromDate, toDate],
    queryFn: () => {
      const params: any = { branchId: selectedBranchId || undefined };
      if (fromDate && toDate) {
        params.fromDate = fromDate;
        params.toDate = toDate;
      } else {
        params.month = selectedMonth;
      }
      return api.getCollectionStats(params);
    },
    enabled: !!user && user.role === 'admin',
  });

  // --- Mutations ---

  const paymentMutation = useMutation({
    mutationFn: (variables: { historyId: number; amount: number; method: 'cash' | 'online' }) =>
      api.updateCollectionPayment(variables.historyId, { amount: variables.amount, method: variables.method }),
    onSuccess: () => {
      toast.success('Payment updated successfully');
      setIsPayModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      if (user?.role === 'admin') {
        queryClient.invalidateQueries({ queryKey: ['collectionStats'] });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update payment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (historyId: number) => api.deleteCollectionRecord(historyId),
    onSuccess: () => {
      toast.success('Collection record deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      if (user?.role === 'admin') {
        queryClient.invalidateQueries({ queryKey: ['collectionStats'] });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete collection record');
    },
  });

  // --- Event Handlers ---

  const handlePayDue = (collection: CollectionRecord) => {
    setSelectedCollection(collection);
    setPaymentAmount(collection.dueAmount.toFixed(2));
    setPaymentMethod(null);
    setIsPayModalOpen(true);
  };

  const handlePaymentSubmit = () => {
    if (!selectedCollection || !paymentMethod || !paymentAmount) {
      toast.error('Please select a payment method and enter a payment amount');
      return;
    }
    const payment = parseFloat(paymentAmount);
    if (isNaN(payment) || payment <= 0 || payment > selectedCollection.dueAmount + 0.01) {
      toast.error('Invalid payment amount. Cannot be zero or more than the due amount.');
      return;
    }
    paymentMutation.mutate({
      historyId: selectedCollection.historyId,
      amount: payment,
      method: paymentMethod,
    });
  };

  const handleDeleteRecord = (collection: CollectionRecord) => {
    if (window.confirm(`Are you sure you want to delete this collection record for ${collection.name}?\n\nThis will:\n- Remove this payment history\n- Update student's total amounts\n- This action cannot be undone!`)) {
      deleteMutation.mutate(collection.historyId);
    }
  };

  const csvEscape = (value: string) =>
    `"${value.replace(/"/g, '""').replace(/\r?\n|\r/g, ' ').trim()}"`;

  const formatCurrency = (value: number) => `₹${(value ?? 0).toFixed(2)}`;

  const getBranchLabel = (record: CollectionRecord) => {
    if (record.branchName) return record.branchName;
    if (record.branchId) {
      const branch = branches.find((b) => b.id === record.branchId);
      if (branch) return branch.name;
    }
    return 'N/A';
  };

  const handleExportCollectionsCsv = () => {
    const data: CollectionRecord[] = collectionsData?.collections || [];
    if (!data.length) {
      toast.error('No collection data available to export.');
      return;
    }

    const headers = [
      'Student Name',
      'Status',
      'Phone',
      'Branch',
      'Shift',
      'Seat',
      'Total Fee',
      'Amount Paid',
      'Due Amount',
      'Cash',
      'Online',
      'Security Money',
      'Remark',
      'Date',
    ];

    const rows = data.map((record) => [
      csvEscape(record.name || 'N/A'),
      csvEscape(record.studentStatus || 'Active'),
      csvEscape(record.phone || 'N/A'),
      csvEscape(getBranchLabel(record)),
      csvEscape(record.shiftTitle || 'N/A'),
      csvEscape(record.seatNumber || 'N/A'),
      csvEscape(formatCurrency(record.totalFee)),
      csvEscape(formatCurrency(record.amountPaid)),
      csvEscape(formatCurrency(record.dueAmount)),
      csvEscape(formatCurrency(record.cash)),
      csvEscape(formatCurrency(record.online)),
      csvEscape(formatCurrency(record.securityMoney)),
      csvEscape(record.remark || 'N/A'),
      csvEscape(record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'N/A'),
    ]);

    const csvContent = [headers.map(csvEscape).join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `collections-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateInvoicePdf = async (collection: CollectionRecord, forDownload = true) => {
    try {
      const invoiceElement = document.getElementById(`invoice-${collection.historyId}`);
      if (!invoiceElement) return null;
      
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
      
      if (forDownload) {
        pdf.save(`invoice-${collection.studentId}-${new Date().toISOString().split('T')[0]}.pdf`);
      }
      
      return pdf;
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate invoice PDF');
      return null;
    }
  };

  const downloadInvoiceAsPdf = async (collection: CollectionRecord) => {
    await generateInvoicePdf(collection, true);
  };

  const shareOnWhatsApp = async (collection: CollectionRecord) => {
    try {
      const pdf = await generateInvoicePdf(collection, false);
      if (!pdf) return;
      
      // Convert PDF to blob
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `invoice-${collection.studentId}.pdf`, { type: 'application/pdf' });
      
      // Create a temporary URL for the blob
      const fileUrl = URL.createObjectURL(pdfFile);
      
      // Create a temporary link to trigger the download
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `invoice-${collection.studentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(fileUrl);
      }, 100);
      
      // Open WhatsApp with the file
      const whatsappUrl = `https://wa.me/?text=Here%20is%20the%20invoice%20for%20${encodeURIComponent(collection.name)}`;
      window.open(whatsappUrl, '_blank');
      
    } catch (error) {
      console.error('Error sharing on WhatsApp:', error);
      toast.error('Failed to share on WhatsApp');
    }
  };

  const closeModal = () => {
    setSelectedCollection(null);
  };

  // Filter collections locally for the search bar and due filter
  const filteredCollections: CollectionRecord[] = (collectionsData?.collections as any[] | undefined)?.filter((col: any) => {
    const matchesSearch = (col.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDueFilter = !showOnlyDue || Number(col.dueAmount) > 0;
    return matchesSearch && matchesDueFilter;
  }) as CollectionRecord[] || [];
  
  // Get total students count from the unfiltered data
  const totalStudents = collectionsData?.collections.length || 0;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={handleBarcodeClick} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <motion.div
          className="max-w-7xl mx-auto"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">📊 Collection & Due</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track fees, dues and payments</p>
            <div className="mt-3 h-2 rounded-full bg-gradient-to-r from-indigo-500 via-amber-500 to-rose-500 dark:from-indigo-600 dark:via-amber-600 dark:to-rose-600 shadow-sm ring-1 ring-white/30" />
          </div>

          <div className="mb-6 space-y-4">
            {/* First row - Search and Due filter */}
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
              <div className="flex-1 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 p-2 shadow-sm ring-1 ring-cyan-100/80 dark:ring-cyan-900/40">
                <label className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 mr-2">Search</label>
                <input
                  type="text"
                  placeholder="Search by student name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-auto p-2 border border-cyan-200 dark:border-cyan-700 rounded-md bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-sm"
                />
              </div>
              <label className="flex items-center space-x-2 p-2 border rounded-md bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 shadow-sm ring-1 ring-amber-100/70 dark:ring-amber-900/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyDue}
                  onChange={(e) => setShowOnlyDue(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Show Only Due</span>
              </label>
            </div>
            
            {/* Second row - All date filters and Branch */}
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-2 shadow-sm ring-1 ring-indigo-100/80 dark:ring-indigo-900/40">
              <label className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mr-2">Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="p-2 border border-indigo-200 dark:border-indigo-700 rounded-md bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400 shadow-sm"
                placeholder="Month"
              />
            </div>
            <div className="rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 p-2 shadow-sm ring-1 ring-sky-100/80 dark:ring-sky-900/40">
              <label className="text-xs font-semibold text-sky-700 dark:text-sky-300 mr-2">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="p-2 border border-sky-200 dark:border-sky-700 rounded-md bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-sky-400 shadow-sm"
                placeholder="From Date"
              />
            </div>
            <div className="rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 p-2 shadow-sm ring-1 ring-sky-100/80 dark:ring-sky-900/40">
              <label className="text-xs font-semibold text-sky-700 dark:text-sky-300 mr-2">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="p-2 border border-sky-200 dark:border-sky-700 rounded-md bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-sky-400 shadow-sm"
                placeholder="To Date"
              />
            </div>
            <div className="rounded-lg bg-emerald-50 dark:bg-green-900/20 border border-emerald-200 dark:border-green-800 p-2 shadow-sm ring-1 ring-emerald-100/80 dark:ring-green-900/40">
              <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mr-2">Branch</label>
              <select
                value={selectedBranchId || ''}
                onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : null)}
                className="p-2 border border-emerald-200 dark:border-green-700 rounded-md bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-emerald-400 shadow-sm"
              >
                <option value="">All Branches</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* CONDITIONAL ADMIN-ONLY STATS BLOCK */}
        {user?.role === 'admin' && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <StatCard title="Total Students" value={totalStudents} isLoading={isCollectionsLoading} />
            <StatCard title="Total Collected" value={statsData?.totalPaid} isLoading={isStatsLoading} isCurrency color="emerald" />
            <StatCard title="Total Due" value={statsData?.totalDue} isLoading={isStatsLoading} isCurrency color="rose" />
            <StatCard title="Cash Collected" value={statsData?.totalCash} isLoading={isStatsLoading} isCurrency color="sky" />
            <StatCard title="Online Collected" value={statsData?.totalOnline} isLoading={isStatsLoading} isCurrency color="violet" />
            
          </motion.div>
        )}

        {/* View Toggle */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2 py-1 rounded-md bg-gradient-to-r from-indigo-500 via-amber-500 to-rose-500 text-white shadow-sm">View</span>
            <div className="inline-flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 ring-1 ring-indigo-200/60 dark:ring-indigo-900/40 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
              <button className={`px-3 py-1.5 text-sm transition-colors ${viewMode==='table' ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`} onClick={() => setViewMode('table')}>Table</button>
              <button className={`px-3 py-1.5 text-sm transition-colors ${viewMode==='cards' ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`} onClick={() => setViewMode('cards')}>Cards</button>
            </div>
          </div>
          <button
            onClick={handleExportCollectionsCsv}
            className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {viewMode === 'table' ? (
          <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
            {isCollectionsLoading ? (
            <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
            ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gradient-to-r from-indigo-50 via-amber-50 to-rose-50 dark:from-gray-700 dark:via-gray-700 dark:to-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase">Student Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seat</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Fee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cash</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Online</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Security</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remark</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCollections.length === 0 ? (
                  <tr><td colSpan={13} className="px-4 py-4 text-center text-gray-500">No collections found.</td></tr>
                ) : (
                  filteredCollections.map((collection) => (
                    <tr key={collection.historyId}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">{collection.name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{branches.find(b => b.id === collection.branchId)?.name || 'N/A'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{collection.shiftTitle || 'N/A'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{collection.seatNumber || 'N/A'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">₹{collection.totalFee.toFixed(2)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">₹{collection.cash.toFixed(2)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">₹{collection.online.toFixed(2)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800">₹{collection.securityMoney.toFixed(2)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-emerald-700 dark:text-emerald-300">₹{collection.amountPaid.toFixed(2)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-rose-700 dark:text-rose-300">₹{collection.dueAmount.toFixed(2)}</td>
                      <td className="px-4 py-4 whitespace-wrap text-sm text-gray-500">{collection.remark || 'N/A'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{collection.createdAt ? new Date(collection.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {collection.dueAmount > 0 && (
                          <button onClick={() => handlePayDue(collection)} className="px-2 py-1 text-xs rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800 mb-2">Pay Due</button>
                        )}
                        <div className="flex space-x-1">
                          <button
                            className="p-1 text-gray-500 hover:text-sky-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadInvoiceAsPdf(collection);
                            }}
                            title="Download Invoice"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            className="p-1 text-gray-500 hover:text-emerald-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              shareOnWhatsApp(collection);
                            }}
                            title="Share on WhatsApp"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.498 14.382v-.002c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.136-.135.297-.354.446-.521.146-.181.194-.296.297-.494.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.15.195 2.105 3.195 5.1 4.485.714.3 1.27.489 1.704.621.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36m-5.446 7.443h-.016a9.87 9.87 0 01-5.031-1.379l-.36-.214-3.75.975 1.005-3.645-.239-.375a9.86 9.86 0 01-1.51-5.26c.001-5.445 4.455-9.885 9.942-9.885 2.654 0 5.145 1.035 7.021 2.91 1.875 1.86 2.909 4.35 2.909 6.99-.004 5.444-4.458 9.885-9.933 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.462 0 .103 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.01 12.01 0 005.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411"/>
                            </svg>
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              className="p-1 text-gray-500 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRecord(collection);
                              }}
                              title="Delete Record"
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isCollectionsLoading ? (
            <div className="text-center p-8 col-span-full"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
          ) : (
            filteredCollections.map((collection) => (
              <motion.div
                key={collection.historyId}
                className="rounded-2xl p-[3px] bg-gradient-to-br from-indigo-600/80 via-amber-500/80 to-rose-500/80 transition-colors shadow-lg"
                whileHover={{ scale: 1.02, rotateX: -2, rotateY: 2 }}
                whileTap={{ scale: 0.99 }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                style={{ transformStyle: 'preserve-3d' as any }}
              >
                <div className="rounded-[14px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl">
                  <div className="h-9 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between px-3">
                    <span className="text-sm font-semibold truncate">{collection.name}</span>
                    {collection.dueAmount > 0 ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 border border-white/30">Due</span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 border border-white/30">Paid</span>
                    )}
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 rounded-md text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">{branches.find(b => b.id === collection.branchId)?.name || 'N/A'}</span>
                      <span className="px-2 py-1 rounded-md text-xs bg-sky-50 text-sky-700 border border-sky-200">{collection.shiftTitle || 'N/A'}</span>
                      <span className="px-2 py-1 rounded-md text-xs bg-violet-50 text-violet-700 border border-violet-200">Seat {collection.seatNumber || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200">Paid: ₹{collection.amountPaid.toFixed(2)}</div>
                      <div className="rounded-md px-2.5 py-1.5 bg-rose-50 text-rose-800 border border-rose-200">Due: ₹{collection.dueAmount.toFixed(2)}</div>
                      <div className="rounded-md px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200">Total: ₹{collection.totalFee.toFixed(2)}</div>
                      <div className="rounded-md px-2.5 py-1.5 bg-sky-50 text-sky-800 border border-sky-200">Cash: ₹{collection.cash.toFixed(2)}</div>
                      <div className="rounded-md px-2.5 py-1.5 bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200">Online: ₹{collection.online.toFixed(2)}</div>
                      <div className="rounded-md px-2.5 py-1.5 bg-teal-50 text-teal-800 border border-teal-200">Security: ₹{collection.securityMoney.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-gray-500">{collection.createdAt ? new Date(collection.createdAt).toLocaleDateString() : 'N/A'}</div>
                      <div className="flex gap-2">
                        {collection.dueAmount > 0 && (
                          <button onClick={() => handlePayDue(collection)} className="px-2 py-1 text-xs rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100">Pay Due</button>
                        )}
                        <button className="p-1 text-gray-500 hover:text-sky-600" onClick={(e) => { e.stopPropagation(); downloadInvoiceAsPdf(collection); }} title="Download Invoice">
                          <Download className="h-4 w-4" />
                        </button>
                        <button className="p-1 text-gray-500 hover:text-emerald-600" onClick={(e) => { e.stopPropagation(); shareOnWhatsApp(collection); }} title="Share on WhatsApp">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.498 14.382v-.002c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.136-.135.297-.354.446-.521.146-.181.194-.296.297-.494.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.15.195 2.105 3.195 5.1 4.485.714.3 1.27.489 1.704.621.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36m-5.446 7.443h-.016a9.87 9.87 0 01-5.031-1.379l-.36-.214-3.75.975 1.005-3.645-.239-.375a9.86 9.86 0 01-1.51-5.26c.001-5.445 4.455-9.885 9.942-9.885 2.654 0 5.145 1.035 7.021 2.91 1.875 1.86 2.909 4.35 2.909 6.99-.004 5.444-4.458 9.885-9.933 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.462 0 .103 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.01 12.01 0 005.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411"/></svg>
                        </button>
                        {user?.role === 'admin' && (
                          <button 
                            className="p-1 text-gray-500 hover:text-red-600" 
                            onClick={(e) => { e.stopPropagation(); handleDeleteRecord(collection); }} 
                            title="Delete Record"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </motion.div>

    {/* Payment Modal */}
    {isPayModalOpen && selectedCollection && (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
        <div className="bg-white dark:bg-gray-800 p-0 rounded-xl shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="h-10 bg-gradient-to-r from-rose-600 to-pink-600 text-white flex items-center px-4 font-semibold">Pay Due</div>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">{selectedCollection.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Due Amount: ₹{selectedCollection.dueAmount.toFixed(2)}</p>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Payment Method:</p>
              <div className="flex space-x-4">
                <label className="flex items-center text-emerald-700 dark:text-emerald-300"><input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="mr-2" />Cash</label>
                <label className="flex items-center text-sky-700 dark:text-sky-300"><input type="radio" name="paymentMethod" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="mr-2" />Online</label>
              </div>
            </div>
            <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Enter payment amount" className="w-full p-2 border rounded-md mb-4 bg-white/95 dark:bg-gray-700/90 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-rose-300" max={selectedCollection.dueAmount.toString()} />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setIsPayModalOpen(false)} className="px-4 py-2 border rounded-md dark:border-gray-600">Cancel</button>
              <button onClick={handlePaymentSubmit} disabled={paymentMutation.isPending} className="px-4 py-2 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 text-white rounded-md shadow-md hover:from-violet-500 hover:via-fuchsia-400 hover:to-sky-400 focus:ring-2 focus:ring-violet-300 disabled:opacity-60">
                {paymentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Payment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
</div>
);
};

// Helper component for rendering the stat cards for admins
const StatCard = ({ title, value, isLoading, isCurrency = false, color = 'indigo' }) => {
  const palette = {
    indigo: 'from-indigo-500 to-violet-500',
    emerald: 'from-emerald-500 to-teal-500',
    rose: 'from-rose-500 to-pink-500',
    sky: 'from-sky-500 to-blue-500',
    violet: 'from-violet-500 to-fuchsia-500',
  } as const;
  const grad = (palette as any)[color] || palette.indigo;
  const numericValue =
    typeof value === 'number'
      ? value
      : value !== undefined && value !== null
        ? Number(value) || 0
        : 0;
  return (
    <div className="rounded-xl border border-white/20 bg-gradient-to-br text-white shadow-sm ring-1 ring-white/10 overflow-hidden"
         style={{ backgroundImage: undefined }}>
      <div className={`bg-gradient-to-r ${grad} px-4 py-2 text-xs font-semibold`}>{title}</div>
      <div className="bg-white/95 dark:bg-gray-800/95 px-4 py-3">
        <div className={`text-xl font-bold ${color === 'rose' ? 'text-rose-600 dark:text-rose-300' : color === 'emerald' ? 'text-emerald-600 dark:text-emerald-300' : color === 'sky' ? 'text-sky-600 dark:text-sky-300' : color === 'violet' ? 'text-violet-600 dark:text-violet-300' : 'text-indigo-600 dark:text-indigo-300'}`}>
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isCurrency ? `₹${numericValue.toFixed(2)}` : numericValue)}
        </div>
      </div>
    </div>
  );
};

export default CollectionDue;
