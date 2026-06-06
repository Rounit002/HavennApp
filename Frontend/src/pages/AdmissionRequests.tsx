import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  UserCheck,
  UserX,
  Users,
  Filter,
  Search,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Building2,
  AlertCircle,
  ArrowLeft,
  Rows3,
  Grid as GridIcon,
  PanelTop
} from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/apiConfig';

interface AdmissionRequest {
  id: number;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  father_name?: string;
  aadhar_number?: string;
  registration_number?: string;
  branch_name?: string;
  seat_number?: string;
  locker_number?: string;
  membership_start?: string;
  membership_end?: string;
  total_fee: number;
  amount_paid: number;
  due_amount: number;
  cash: number;
  online: number;
  security_money: number;
  discount: number;
  remark?: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  processed_at?: string;
  processed_by_username?: string;
  rejection_reason?: string;
  shift_ids: number[];
}

interface Stats {
  pending: number;
  accepted: number;
  rejected: number;
  total: number;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

const AdmissionRequests: React.FC = () => {
  const [requests, setRequests] = useState<AdmissionRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, accepted: 0, rejected: 0, total: 0 });
  const [pagination, setPagination] = useState<Pagination>({ currentPage: 1, totalPages: 1, totalCount: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedRequest, setSelectedRequest] = useState<AdmissionRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'compact'>('grid');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigate = useNavigate();

  // Auth context for user information
  const { user } = useAuth();

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [statusFilter, currentPage]);

  const handleBarcodeClick = () => {
    console.log('Barcode clicked in AdmissionRequests');
    // Navigate to barcode page or show barcode modal
    navigate('/barcode');
  };

  if (!user) {
    return null;
  }

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await authFetch(
        `/admission-requests?status=${statusFilter}&page=${currentPage}&limit=20`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch admission requests');
      }
      const data = await response.json();
      setRequests(data.requests);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load admission requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await authFetch('/admission-requests/stats/summary');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      setProcessing(requestId);
      const response = await authFetch(`/admission-requests/${requestId}/accept`, {
        method: 'POST',
      });
      if (!response.ok) {
        let message = 'Failed to accept request';
        try {
          const result = await response.json();
          message = result.message || message;
        } catch {}
        throw new Error(message);
      }
      toast.success('Registration request accepted successfully!');
      if (showDetailsModal) setShowDetailsModal(false);
      fetchRequests();
      fetchStats();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to accept request');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    try {
      setProcessing(selectedRequest.id);
      const response = await authFetch(`/admission-requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      if (!response.ok) {
        let message = 'Failed to reject request';
        try {
          const result = await response.json();
          message = result.message || message;
        } catch {}
        throw new Error(message);
      }
      toast.success('Registration request rejected');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRequest(null);
      if (showDetailsModal) setShowDetailsModal(false);
      fetchRequests();
      fetchStats();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={handleBarcodeClick} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <TooltipProvider>
              <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-2">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admission Requests</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage student registration requests</p>
                  </div>
                  <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-indigo-500 to-violet-600 border-0 text-white ring-1 ring-white/10 transition-transform duration-200 ease-out transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:rotate-[1deg]">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white/80">Total Requests</p>
                          <p className="text-2xl font-bold">{stats.total}</p>
                        </div>
                        <Users className="h-8 w-8 text-white" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0 text-white ring-1 ring-white/10 transition-transform duration-200 ease-out transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:rotate-[1deg]">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white/80">Pending</p>
                          <p className="text-2xl font-bold">{stats.pending}</p>
                        </div>
                        <Clock className="h-8 w-8 text-white" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 text-white ring-1 ring-white/10 transition-transform duration-200 ease-out transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:rotate-[1deg]">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white/80">Accepted</p>
                          <p className="text-2xl font-bold">{stats.accepted}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-white" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-rose-500 to-red-600 border-0 text-white ring-1 ring-white/10 transition-transform duration-200 ease-out transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:rotate-[1deg]">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white/80">Rejected</p>
                          <p className="text-2xl font-bold">{stats.rejected}</p>
                        </div>
                        <XCircle className="h-8 w-8 text-white" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Filter className="h-4 w-4" />
                        <Label>Filter by Status:</Label>
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Requests</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <CardTitle>Registration Requests</CardTitle>
                        <CardDescription>
                          {pagination.totalCount} total requests • Page {pagination.currentPage} of {pagination.totalPages}
                        </CardDescription>
                      </div>
                      <div className="flex bg-slate-100 rounded-lg p-1 w-fit">
                        <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-sm ${viewMode==='table'?'bg-white text-indigo-600 shadow-sm':'text-gray-600'}`} title="Table View"><Rows3 className="h-4 w-4"/></button>
                        <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-md text-sm ${viewMode==='grid'?'bg-white text-indigo-600 shadow-sm':'text-gray-600'}`} title="Grid View"><GridIcon className="h-4 w-4"/></button>
                        <button onClick={() => setViewMode('compact')} className={`px-3 py-1.5 rounded-md text-sm ${viewMode==='compact'?'bg-white text-indigo-600 shadow-sm':'text-gray-600'}`} title="Compact"><PanelTop className="h-4 w-4"/></button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : requests.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No requests found</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {statusFilter === 'all'
                            ? 'No admission requests have been submitted yet.'
                            : `No ${statusFilter} requests found.`
                          }
                        </p>
                      </div>
                    ) : (
                      <>
                        {viewMode === 'table' ? (
                          <>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                                    <TableHead className="hidden lg:table-cell">Branch</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="hidden xl:table-cell">Submitted</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {requests.map((request) => (
                                    <TableRow key={request.id}>
                                      <TableCell>
                                        <div>
                                          <p className="font-medium">{request.name}</p>
                                          <p className="text-sm text-gray-500">ID: #{request.id}</p>
                                        </div>
                                      </TableCell>
                                      <TableCell className="hidden md:table-cell">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-1 text-sm">
                                            <Phone className="h-3 w-3" />
                                            {request.phone}
                                          </div>
                                          {request.email && (
                                            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                              <Mail className="h-3 w-3" />
                                              {request.email}
                                            </div>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="hidden lg:table-cell">
                                        <div className="flex items-center gap-1">
                                          <Building2 className="h-3 w-3" />
                                          {request.branch_name || 'Not specified'}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={`${getStatusColor(request.status)} flex items-center gap-1 w-fit`}>
                                          {getStatusIcon(request.status)}
                                          <span className="capitalize">{request.status}</span>
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="hidden xl:table-cell">
                                        <div className="flex items-center gap-1 text-sm">
                                          <Calendar className="h-3 w-3" />
                                          {formatDate(request.created_at)}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center justify-end gap-2">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                  setSelectedRequest(request);
                                                  setShowDetailsModal(true);
                                                }}
                                              >
                                                <Eye className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View Details</TooltipContent>
                                          </Tooltip>
                                          {request.status === 'pending' ? (
                                            <>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => handleAcceptRequest(request.id)}
                                                    disabled={processing === request.id}
                                                  >
                                                    {processing === request.id ? (
                                                      <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                      <UserCheck className="h-4 w-4" />
                                                    )}
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Accept Request</TooltipContent>
                                              </Tooltip>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => {
                                                      setSelectedRequest(request);
                                                      setShowRejectModal(true);
                                                    }}
                                                    disabled={processing === request.id}
                                                  >
                                                    <UserX className="h-4 w-4" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Reject Request</TooltipContent>
                                              </Tooltip>
                                            </>
                                          ) : null}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </>
                        ) : (
                          <div className={`grid gap-4 sm:gap-6 ${viewMode==='compact' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                            {requests.map((request) => (
                              <div key={request.id} className={`rounded-xl border-0 ring-1 ring-white/10 shadow-md p-4 flex flex-col h-full text-white bg-gradient-to-br ${request.status==='accepted' ? 'from-emerald-500 to-teal-600' : request.status==='rejected' ? 'from-rose-500 to-red-600' : 'from-amber-500 to-orange-600'} transition-transform duration-200 ease-out transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:rotate-[1deg]`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-semibold text-white">{request.name}</p>
                                    <p className="text-xs text-white/80">ID: #{request.id}</p>
                                  </div>
                                  <Badge className={`bg-white/20 text-white border border-white/30 flex items-center gap-1 w-fit`}>
                                    {getStatusIcon(request.status)}
                                    <span className="capitalize">{request.status}</span>
                                  </Badge>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-white">
                                  <div className="rounded-lg p-3 bg-white/10 border border-white/20">
                                    <div className="text-[11px] uppercase tracking-wide text-white/80 flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-white/80"/> Phone</div>
                                    <div className="mt-0.5 font-semibold text-white">{request.phone}</div>
                                  </div>
                                  <div className="rounded-lg p-3 bg-white/10 border border-white/20">
                                    <div className="text-[11px] uppercase tracking-wide text-white/80 flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-white/80"/> Branch</div>
                                    <div className="mt-0.5 font-semibold text-white">{request.branch_name || 'Not specified'}</div>
                                  </div>
                                  <div className="rounded-lg p-3 bg-white/10 border border-white/20 col-span-2">
                                    <div className="text-[11px] uppercase tracking-wide text-white/80 flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-white/80"/> Submitted</div>
                                    <div className="mt-0.5 font-semibold text-white">{formatDate(request.created_at)}</div>
                                  </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(request); setShowDetailsModal(true); }} title="View Details" className="border-white/40 text-white hover:bg-white/10"><Eye className="h-4 w-4"/></Button>
                                  </div>
                                  {request.status === 'pending' && (
                                    <div className="flex items-center gap-2">
                                      <Button size="sm" onClick={() => handleAcceptRequest(request.id)} disabled={processing === request.id} className="bg-white/20 hover:bg-white/30 text-white">
                                        {processing === request.id ? (<Loader2 className="h-4 w-4 animate-spin" />) : (<UserCheck className="h-4 w-4" />)}
                                      </Button>
                                      <Button size="sm" variant="destructive" onClick={() => { setSelectedRequest(request); setShowRejectModal(true); }} disabled={processing === request.id} className="bg-white/20 hover:bg-white/30 text-white border-0">
                                        <UserX className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {pagination.totalPages > 1 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4 px-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} requests
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                              >
                                Previous
                              </Button>
                              <span className="text-sm font-medium">
                                Page {pagination.currentPage} of {pagination.totalPages}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                                disabled={currentPage === pagination.totalPages}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                  <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Registration Request Details</DialogTitle>
                      <DialogDescription>
                        Request ID: #{selectedRequest?.id} • Submitted: {selectedRequest && formatDate(selectedRequest.created_at)}
                      </DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                      <div className="space-y-6 flex-grow overflow-y-auto -mx-6 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Status:</span>
                          <Badge className={`${getStatusColor(selectedRequest.status)} flex items-center gap-1`}>
                            {getStatusIcon(selectedRequest.status)}
                            <span className="capitalize">{selectedRequest.status}</span>
                          </Badge>
                        </div>

                        <Tabs defaultValue="personal" className="w-full">
                          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                            <TabsTrigger value="personal">Personal</TabsTrigger>
                            <TabsTrigger value="membership">Membership</TabsTrigger>
                            <TabsTrigger value="payment">Payment</TabsTrigger>
                            <TabsTrigger value="status">Status</TabsTrigger>
                          </TabsList>

                          <div className="pt-4">
                            <TabsContent value="personal" className="space-y-4 m-0">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label>Full Name</Label>
                                  <p className="text-sm font-medium">{selectedRequest.name}</p>
                                </div>
                                <div>
                                  <Label>Father's Name</Label>
                                  <p className="text-sm">{selectedRequest.father_name || 'Not provided'}</p>
                                </div>
                                <div>
                                  <Label>Phone</Label>
                                  <p className="text-sm">{selectedRequest.phone}</p>
                                </div>
                                <div>
                                  <Label>Email</Label>
                                  <p className="text-sm">{selectedRequest.email || 'Not provided'}</p>
                                </div>
                                <div>
                                  <Label>Aadhar Number</Label>
                                  <p className="text-sm">{selectedRequest.aadhar_number || 'Not provided'}</p>
                                </div>
                                <div>
                                  <Label>Registration Number</Label>
                                  <p className="text-sm">{selectedRequest.registration_number || 'Not provided'}</p>
                                </div>
                              </div>
                              {selectedRequest.address && (
                                <div className="md:col-span-2">
                                  <Label>Address</Label>
                                  <p className="text-sm">{selectedRequest.address}</p>
                                </div>
                              )}
                            </TabsContent>

                            <TabsContent value="membership" className="space-y-4 m-0">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label>Branch</Label>
                                  <p className="text-sm">{selectedRequest.branch_name || 'Not specified'}</p>
                                </div>
                                <div>
                                  <Label>Seat</Label>
                                  <p className="text-sm">{selectedRequest.seat_number || 'No preference'}</p>
                                </div>
                                <div>
                                  <Label>Locker</Label>
                                  <p className="text-sm">{selectedRequest.locker_number || 'Not requested'}</p>
                                </div>
                                <div>
                                  <Label>Membership Start</Label>
                                  <p className="text-sm">{selectedRequest.membership_start ? formatDate(selectedRequest.membership_start) : 'Not specified'}</p>
                                </div>
                                <div>
                                  <Label>Membership End</Label>
                                  <p className="text-sm">{selectedRequest.membership_end ? formatDate(selectedRequest.membership_end) : 'Not specified'}</p>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="payment" className="space-y-4 m-0">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                  <Label>Total Fee</Label>
                                  <p className="text-sm font-medium">{formatCurrency(selectedRequest.total_fee)}</p>
                                </div>
                                <div>
                                  <Label>Cash Payment</Label>
                                  <p className="text-sm">{formatCurrency(selectedRequest.cash)}</p>
                                </div>
                                <div>
                                  <Label>Online Payment</Label>
                                  <p className="text-sm">{formatCurrency(selectedRequest.online)}</p>
                                </div>
                                <div>
                                  <Label>Security Money</Label>
                                  <p className="text-sm">{formatCurrency(selectedRequest.security_money)}</p>
                                </div>
                                <div>
                                  <Label>Discount</Label>
                                  <p className="text-sm">{formatCurrency(selectedRequest.discount)}</p>
                                </div>
                                <div>
                                  <Label>Due Amount</Label>
                                  <p className="text-sm font-medium text-red-600">{formatCurrency(selectedRequest.due_amount)}</p>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="status" className="space-y-4 m-0">
                              <div className="space-y-3">
                                <div>
                                  <Label>Current Status</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={`${getStatusColor(selectedRequest.status)} flex items-center gap-1`}>
                                      {getStatusIcon(selectedRequest.status)}
                                      <span className="capitalize">{selectedRequest.status}</span>
                                    </Badge>
                                  </div>
                                </div>

                                {selectedRequest.processed_at && (
                                  <div>
                                    <Label>Processed At</Label>
                                    <p className="text-sm">{formatDate(selectedRequest.processed_at)}</p>
                                  </div>
                                )}

                                {selectedRequest.processed_by_username && (
                                  <div>
                                    <Label>Processed By</Label>
                                    <p className="text-sm">{selectedRequest.processed_by_username}</p>
                                  </div>
                                )}

                                {selectedRequest.rejection_reason && (
                                  <div>
                                    <Label>Rejection Reason</Label>
                                    <p className="text-sm text-red-600">{selectedRequest.rejection_reason}</p>
                                  </div>
                                )}

                                {selectedRequest.remark && (
                                  <div>
                                    <Label>Student's Notes</Label>
                                    <p className="text-sm">{selectedRequest.remark}</p>
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                          </div>
                        </Tabs>
                      </div>
                    )}

                    <DialogFooter className="pt-4 mt-auto">
                      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
                        <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                          Close
                        </Button>
                        {selectedRequest?.status === 'pending' && (
                          <>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                setShowDetailsModal(false);
                                setShowRejectModal(true);
                              }}
                              disabled={processing === selectedRequest?.id}
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Reject Request
                            </Button>
                            <Button
                              onClick={() => selectedRequest && handleAcceptRequest(selectedRequest.id)}
                              disabled={processing === selectedRequest?.id}
                            >
                              {processing === selectedRequest?.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <UserCheck className="mr-2 h-4 w-4" />
                              )}
                              Accept Request
                            </Button>
                          </>
                        )}
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Registration Request</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to reject this registration request? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                      <div>
                        <Label htmlFor="rejectionReason">Reason for Rejection (Optional)</Label>
                        <Textarea
                          id="rejectionReason"
                          placeholder="Provide a reason for rejection..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={3}
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
                        <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleRejectRequest}
                          disabled={processing === selectedRequest?.id}
                        >
                          {processing === selectedRequest?.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <UserX className="mr-2 h-4 w-4" />
                          )}
                          Reject Request
                        </Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdmissionRequests;