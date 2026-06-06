// src/pages/InactiveStudents.tsx
import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '../services/api';
import { toast } from 'sonner';
import { ToggleRight, Users, UserCheck, AlertTriangle, Clock, Grid, Rows3, Phone, IdCard, Building2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface InactiveStudent {
  id: number;
  name: string;
  phone: string;
  registrationNumber?: string | null;
  branchName?: string;
}

const InactiveStudents = () => {
  const [students, setStudents] = useState<InactiveStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const location = useLocation();
  const navigate = useNavigate();

  const fetchInactiveStudents = async () => {
    try {
      setLoading(true);
      const response = await api.getInactiveStudents();
      setStudents(response.students);
    } catch (error: any) {
      console.error('Failed to fetch inactive students:', error.message);
      toast.error('Failed to fetch inactive students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInactiveStudents();
  }, []);

  const handleActivate = async (id: number) => {
    if (window.confirm('Are you sure you want to reactivate this student?')) {
      try {
        await api.updateStudentStatus(id, { isActive: true });
        toast.success('Student activated successfully');
        fetchInactiveStudents(); // Refetch the list
      } catch (error: any) {
        console.error('Failed to activate student:', error.message);
        toast.error('Failed to activate student');
      }
    }
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phone && s.phone.includes(searchTerm)) ||
    (s.registrationNumber && s.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.branchName && s.branchName.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const indexOfLast = currentPage * perPage;
  const indexOfFirst = indexOfLast - perPage;
  const currentSlice = filtered.slice(indexOfFirst, indexOfLast);

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
              <h1 className="text-2xl font-bold text-gray-800">Inactive Students</h1>
              <p className="text-gray-500">List of all manually deactivated students.</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full">
                  <h3 className="text-lg font-medium flex-1">Inactive Students</h3>
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
                  <input
                    type="text"
                    placeholder="Search inactive students..."
                    className="w-full pl-3 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-300"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              {viewMode === 'list' ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Registration Number</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : filtered.length > 0 ? (
                      currentSlice.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.registrationNumber || 'N/A'}</TableCell>
                          <TableCell>{student.phone}</TableCell>
                          <TableCell>{student.branchName || 'N/A'}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleActivate(student.id)}
                              className="flex items-center gap-2 text-green-600 hover:text-green-800 font-semibold p-2"
                              title="Reactivate Student"
                            >
                              <ToggleRight size={18} />
                              <span>Activate</span>
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No inactive students found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              ) : (
              <div className="p-4">
                {loading ? (
                  <div className="text-center text-gray-500 py-8">Loading...</div>
                ) : currentSlice.length > 0 ? (
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
                    {currentSlice.map((student) => (
                      <div key={student.id} className="rounded-xl border shadow-md p-4 flex flex-col h-full bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 border-amber-200 ring-1 ring-white/60 transition-transform duration-200 ease-out transform-gpu will-change-transform hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:rotate-[1.5deg]">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-800">{student.name}</h4>
                            <p className="mt-0.5 text-xs text-gray-600 flex items-center gap-1">
                              <IdCard className="h-3.5 w-3.5 text-amber-500/80" /> Reg: {student.registrationNumber || 'N/A'}
                            </p>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Inactive</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-700">
                          <div className="rounded-lg p-3 bg-white/70 border border-white/60">
                            <div className="text-[11px] uppercase tracking-wide text-slate-600 flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-slate-400"/> Phone</div>
                            <div className="mt-0.5 font-semibold text-slate-800">{student.phone}</div>
                          </div>
                          <div className="rounded-lg p-3 bg-white/70 border border-white/60">
                            <div className="text-[11px] uppercase tracking-wide text-slate-600 flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-slate-400"/> Branch</div>
                            <div className="mt-0.5 font-semibold text-slate-800">{student.branchName || 'N/A'}</div>
                          </div>
                          <div className="rounded-lg p-3 bg-white/70 border border-white/60 col-span-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-600">Actions</div>
                            <div className="mt-1">
                              <button
                                onClick={() => handleActivate(student.id)}
                                className="inline-flex items-center gap-2 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-md text-sm font-semibold"
                                title="Reactivate Student"
                              >
                                <ToggleRight size={16} /> Activate
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">No inactive students found.</div>
                )}
              </div>
              )}
            </div>
            {!loading && filtered.length > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between border-t p-4 gap-4">
                <div className="flex items-center space-x-2">
                  <select
                    value={perPage}
                    onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="text-sm border rounded py-2 px-3"
                  >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                  <span className="text-sm text-gray-500">per page</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50"
                  >Prev</button>
                  <span className="text-sm text-gray-600">Page {currentPage} of {Math.max(1, Math.ceil(filtered.length / perPage))}</span>
                  <button
                    disabled={indexOfLast >= filtered.length}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50"
                  >Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InactiveStudents;