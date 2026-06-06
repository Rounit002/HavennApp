import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, PlusCircle, Loader2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

interface Seat {
  id: number;
  seatNumber: string;
  branchId?: number;
  shifts: Array<{
    shiftId: number;
    shiftTitle: string;
    description: string | null;
    isAssigned: boolean;
    studentName: string | null;
  }>;
}

interface Schedule {
  id: number;
  title: string;
  description?: string | null;
  time: string;
  eventDate: string;
}

const SeatsPage = () => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSeatNumbers, setNewSeatNumbers] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);

  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const handleBarcodeClick = () => {
    toast.info('Barcode scanning functionality is not yet implemented.');
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const fetchBranches = async () => {
    try {
      const branchesData = await api.getBranches();
      setBranches(branchesData || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load branches');
      setBranches([]);
    }
  };

  const fetchSeats = async (retryCount = 0) => {
    const maxRetries = 2;
    try {
      setLoading(true);
      const params: any = {};
      if (selectedBranchId) params.branchId = selectedBranchId;
      if (selectedShiftId) params.shiftId = selectedShiftId;
      const response = await api.getSeats(params);
      if (response.seats && Array.isArray(response.seats)) {
        setSeats(response.seats.sort((a, b) => parseInt(a.seatNumber) - parseInt(b.seatNumber)));
        setError(null);
      } else {
        throw new Error('Invalid data format from API');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch seats. Please try again.');
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        await fetchSeats(retryCount + 1);
      } else {
        toast.error(err.message || 'Failed to fetch seats after multiple attempts');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async (branchId: number | null = null) => {
    try {
      // Pass the selected branch ID to get schedules for that branch only
      const response = await api.getSchedules(branchId);
      
      if (response.schedules && Array.isArray(response.schedules)) {
        const sortedSchedules = response.schedules.sort((a: Schedule, b: Schedule) => {
          const dateComparison = a.eventDate.localeCompare(b.eventDate);
          if (dateComparison !== 0) return dateComparison;
          return a.time.localeCompare(b.time);
        });
        setSchedules(sortedSchedules);
      } else {
        throw new Error('Invalid schedules data format from API');
      }
    } catch (err: any) {
      console.error('Failed to fetch schedules:', err);
      toast.error(err.message || 'Failed to fetch schedules');
      setSchedules([]);
    }
  };

  const handleAddSeats = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!selectedBranchId) {
      toast.error('Please select a branch before adding seats');
      return;
    }
    setIsAdding(true);
    try {
      const response = await api.addSeats({ seatNumbers: newSeatNumbers, branchId: selectedBranchId });
      toast.success(response.message || 'Seats added successfully');
      setNewSeatNumbers('');
      await fetchSeats();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add seats');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSeat = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this seat?')) {
      try {
        const response = await api.deleteSeat(id);
        toast.success(response.message || 'Seat deleted successfully');
        await fetchSeats();
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete seat');
      }
    }
  };

  // Fetch branches when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchBranches();
    }
  }, [isAuthenticated]);

  // Fetch schedules when branch changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchSchedules(selectedBranchId);
    }
  }, [isAuthenticated, selectedBranchId]);

  // Fetch seats when branch or shift filter changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchSeats();
      
      // Reset selected shift if it's no longer valid for the selected branch
      if (selectedShiftId && schedules.length > 0) {
        const shiftExists = schedules.some(s => s.id === selectedShiftId);
        if (!shiftExists) {
          setSelectedShiftId(null);
        }
      }
    }
  }, [isAuthenticated, selectedBranchId, selectedShiftId, schedules]);

  const filteredSeats = seats.filter((seat) => {
    return seat.seatNumber.includes(searchQuery);
  });

  // Derive simple contextual stats for the current filter/selection
  const totalSeats = filteredSeats.length;
  const assignedSeats = selectedShiftId
    ? filteredSeats.filter(seat => seat.shifts.some(s => s.shiftId === selectedShiftId && s.isAssigned)).length
    : filteredSeats.filter(seat => seat.shifts.some(s => s.isAssigned)).length;
  const availableSeats = selectedShiftId
    ? filteredSeats.filter(seat => {
        const sh = seat.shifts.find(s => s.shiftId === selectedShiftId);
        // If no record for this shift, treat as available
        return !sh || (sh && !sh.isAssigned);
      }).length
    : filteredSeats.filter(seat => seat.shifts.some(s => !s.isAssigned) || seat.shifts.length === 0).length;

  if (authLoading) {
    return (
      <div className="flex min-h-screen justify-center items-center">
        <Loader2 size={24} className="animate-spin text-gray-500 dark:text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={handleBarcodeClick} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200">Seat Assignments</h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">Manage library seat availability</p>
                <div className="mt-3 h-2 rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-500 dark:from-indigo-600 dark:via-fuchsia-600 dark:to-sky-600 shadow-sm ring-1 ring-white/30" />
              </div>
              <button onClick={() => navigate(-1)} className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors">
                <ArrowLeft size={20} className="mr-1" /> Back
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-4">
              <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-2 shadow-sm ring-1 ring-indigo-100/80 dark:ring-indigo-900/40 hover:ring-indigo-300/60 transition">
                <label htmlFor="branch-select" className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mr-2">Branch</label>
                <select
                  id="branch-select"
                  value={selectedBranchId ?? ''}
                  onChange={(e) => setSelectedBranchId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="border border-indigo-200 dark:border-indigo-700 rounded-md px-3 py-2 text-sm bg-white/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id.toString()}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div className="rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 p-2 shadow-sm ring-1 ring-cyan-100/80 dark:ring-cyan-900/40 hover:ring-cyan-300/60 transition">
                <label className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 mr-2">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter seat number"
                  className="border border-cyan-200 dark:border-cyan-700 rounded-md px-3 py-2 text-sm bg-white/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-cyan-400 focus:outline-none shadow-sm"
                />
              </div>
              <div className="rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 p-2 shadow-sm ring-1 ring-sky-100/80 dark:ring-sky-900/40 hover:ring-sky-300/60 transition">
                <label className="text-xs font-semibold text-sky-700 dark:text-sky-300 mr-2">Shift</label>
                <select
                  value={selectedShiftId ?? ''}
                  onChange={(e) => setSelectedShiftId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="border border-sky-200 dark:border-sky-700 rounded-md px-3 py-2 text-sm bg-white/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-sky-400 focus:outline-none shadow-sm"
                >
                  <option value="">All Shifts</option>
                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>{schedule.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contextual Stats */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-gray-800 dark:to-gray-800 border border-indigo-200/70 dark:border-gray-700/70 ring-1 ring-indigo-100/60 shadow">
                <span className="text-xs font-medium text-gray-500">Total</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{totalSeats}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-300 dark:border-emerald-800/70 ring-1 ring-emerald-200/70 shadow">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Available</span>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{availableSeats}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/20 border border-rose-300 dark:border-rose-800/70 ring-1 ring-rose-200/70 shadow">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-xs font-medium text-rose-700 dark:text-rose-300">Assigned</span>
                <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">{assignedSeats}</span>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 size={24} className="animate-spin text-gray-500 dark:text-gray-400" />
              </div>
            ) : error ? (
              <div className="text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-4 rounded-lg mb-6">{error}</div>
            ) : filteredSeats.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">No seats found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                {filteredSeats.map((seat) => (
                  <div
                    key={seat.id}
                    className="rounded-2xl p-[3px] bg-gradient-to-br from-indigo-600/80 via-fuchsia-600/80 to-sky-500/80 hover:from-indigo-600/90 hover:via-fuchsia-600/90 hover:to-sky-500/90 transition-colors hover:shadow-xl shadow-lg"
                  >
                    <div className={`rounded-[14px] border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all min-h-[180px] overflow-hidden 
                      ${(() => {
                        const assigned = selectedShiftId
                          ? seat.shifts.some(s => s.shiftId === selectedShiftId && s.isAssigned)
                          : seat.shifts.some(s => s.isAssigned);
                        return assigned 
                          ? 'bg-gradient-to-b from-rose-100 to-rose-200 dark:from-gray-800 dark:to-gray-800'
                          : 'bg-gradient-to-b from-emerald-100 to-emerald-200 dark:from-gray-800 dark:to-gray-800';
                      })()}
                    `}>
                      {(() => {
                        const assigned = selectedShiftId
                          ? seat.shifts.some(s => s.shiftId === selectedShiftId && s.isAssigned)
                          : seat.shifts.some(s => s.isAssigned);
                        const bandClass = assigned
                          ? 'from-rose-600 to-pink-600'
                          : 'from-emerald-600 to-teal-600';
                        const labelText = assigned ? 'Assigned' : 'Available';
                        return (
                          <div className={`h-9 rounded-t-[14px] bg-gradient-to-r ${bandClass} flex items-center justify-between px-3 text-white`}>
                            <span className="text-sm font-semibold">Seat {seat.seatNumber}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 border border-white/30">{labelText}</span>
                          </div>
                        );
                      })()}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {/* Secondary small chip retained for quick scanning */}
                            {(() => {
                              const hasAssignedForSelected = selectedShiftId ? seat.shifts.some(s => s.shiftId === selectedShiftId && s.isAssigned) : seat.shifts.some(s => s.isAssigned);
                              return hasAssignedForSelected ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 ring-1 ring-rose-200/70 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">Assigned</span>
                              ) : (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 ring-1 ring-emerald-200/70 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">Available</span>
                              );
                            })()}
                          </div>
                          <button onClick={() => handleDeleteSeat(seat.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-800/50">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {seat.shifts.length === 0 ? (
                          <p className="text-gray-500 dark:text-gray-400 text-xs">No shifts available.</p>
                        ) : (
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {seat.shifts.map((shift) => (
                              <div
                                key={shift.shiftId}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs border ${shift.isAssigned
                                  ? 'bg-rose-200/90 dark:bg-red-900/30 text-rose-800 dark:text-red-300 border-rose-300 dark:border-red-800 ring-1 ring-rose-200/70'
                                  : 'bg-emerald-200/90 dark:bg-green-900/30 text-emerald-800 dark:text-green-300 border-emerald-300 dark:border-green-800 ring-1 ring-emerald-200/70'}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${shift.isAssigned ? 'bg-rose-500' : 'bg-emerald-600'}`} />
                                <span className="flex-1 truncate">
                                  {shift.shiftTitle}
                                  {shift.description && ` (${shift.description})`}
                                </span>
                                {shift.isAssigned && shift.studentName && (
                                  <span className="text-[11px] font-medium truncate">{shift.studentName}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label htmlFor="seat-numbers" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add New Seats</label>
                  <input
                    id="seat-numbers"
                    type="text"
                    value={newSeatNumbers}
                    onChange={(e) => setNewSeatNumbers(e.target.value)}
                    placeholder="Enter seat numbers (e.g., 1,2,3)"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                    disabled={isAdding || !selectedBranchId}
                  />
                </div>
                <button
                  onClick={handleAddSeats}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 text-white px-4 py-2 rounded-md shadow-md hover:from-violet-500 hover:via-fuchsia-400 hover:to-sky-400 focus:ring-2 focus:ring-violet-300 ring-1 ring-white/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAdding || !newSeatNumbers.trim() || !selectedBranchId}
                >
                  {isAdding ? (<><Loader2 size={16} className="animate-spin" /> Adding...</>) : (<><PlusCircle size={16} /> Add Seats</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatsPage;