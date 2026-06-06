import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../services/api';
import Select from 'react-select';
import { Trash2, Edit, Save, X, Plus } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

// Interfaces
interface Locker {
  id: number;
  lockerNumber: string;
  isAssigned: boolean;
  studentId?: number;
  studentName?: string;
  branchId?: number | null;
  branchName?: string | null;
}

interface Branch {
  id: number;
  name: string;
}

interface SelectOption {
  value: number | null;
  label: string;
}

const LockerManagement: React.FC = () => {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<SelectOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingLocker, setEditingLocker] = useState<Locker | null>(null);
  const [newLockerData, setNewLockerData] = useState({ lockerNumber: '', branchId: null as number | null });
  // Sidebar layout state to match admin pages
  const [isCollapsed, setIsCollapsed] = useState(false);
  const handleBarcodeClick = () => {};

  // ✅ Fetch branches on initial load
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const branchesData = await api.getBranches();
        setBranches(branchesData);
      } catch (error) {
        toast.error('Failed to load branches');
        console.error('Failed to fetch branches:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, []);

  // ✅ Fetch lockers whenever a branch is selected
  useEffect(() => {
    const fetchLockers = async () => {
      if (selectedBranch && selectedBranch.value) {
        setLoading(true);
        try {
          const lockersData = await api.getLockers(selectedBranch.value); // Adjusted to pass number directly
          setLockers(lockersData.lockers);
        } catch (error) {
          toast.error('Failed to load lockers for this branch');
          console.error('Failed to fetch lockers:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLockers([]); // Clear lockers if no branch is selected
      }
    };
    fetchLockers();
  }, [selectedBranch]);

  const handleCreateLocker = async () => {
    if (!newLockerData.lockerNumber) {
      toast.error('Locker number is required');
      return;
    }
    if (!selectedBranch || !selectedBranch.value) {
      toast.error('Please select a branch first');
      return;
    }
    try {
      const response = await api.createLocker({ 
        lockerNumber: newLockerData.lockerNumber, 
        branchId: selectedBranch.value 
      });
      setLockers(prev => [response.locker, ...prev]);
      setNewLockerData({ lockerNumber: '', branchId: null });
      toast.success('Locker created successfully');
    } catch (error: any) {
      console.error('Failed to create locker:', error);
      toast.error(error.message || 'Failed to create locker');
    }
  };

  const handleUpdateLocker = async () => {
    if (!editingLocker || !newLockerData.lockerNumber || !newLockerData.branchId) {
      toast.error('Locker number and branch are required');
      return;
    }
    try {
      const response = await api.updateLocker(editingLocker.id, {
        lockerNumber: newLockerData.lockerNumber,
        branchId: newLockerData.branchId
      });
      if (selectedBranch && selectedBranch.value) {
        const lockersData = await api.getLockers(selectedBranch.value);
        setLockers(lockersData.lockers);
      }
      setEditingLocker(null);
      setNewLockerData({ lockerNumber: '', branchId: null });
      toast.success('Locker updated successfully');
    } catch (error: any) {
      console.error('Failed to update locker:', error);
      toast.error(error.message || 'Failed to update locker');
    }
  };

  const handleDeleteLocker = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this locker? This action cannot be undone.')) return;
    try {
      await api.deleteLocker(id);
      setLockers(lockers.filter(locker => locker.id !== id));
      toast.success('Locker deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete locker:', error);
      toast.error(error.message || 'Failed to delete locker');
    }
  };

  const branchOptions: SelectOption[] = branches.map(branch => ({
    value: branch.id,
    label: branch.name,
  }));
  
  const startEdit = (locker: Locker) => {
    setEditingLocker(locker);
    setNewLockerData({
      lockerNumber: locker.lockerNumber,
      branchId: locker.branchId || null // Handle null case
    });
  };

  const cancelEdit = () => {
    setEditingLocker(null);
    setNewLockerData({ lockerNumber: '', branchId: null });
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={handleBarcodeClick} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 sm:mb-3 text-gray-800 dark:text-gray-100">Locker Management</h1>
            <div className="mb-6 h-2 rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-500 dark:from-indigo-600 dark:via-fuchsia-600 dark:to-sky-600 shadow-sm ring-1 ring-white/30" />

            {/* Branch Selector */}
            <div className="mb-6 max-w-sm">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Branch</label>
              <Select
                options={branchOptions}
                value={selectedBranch}
                onChange={(option) => setSelectedBranch(option as SelectOption)}
                placeholder="Select a branch to view lockers"
                isClearable
              />
            </div>

            {/* Create/Edit Locker Form */}
            <div className={`mb-6 bg-white/95 dark:bg-gray-800/95 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 ring-1 ring-indigo-100/70 dark:ring-indigo-900/40 ${!selectedBranch ? 'opacity-50' : ''}`}>
              <h2 className="text-lg font-medium mb-4">{editingLocker ? `Editing Locker: ${editingLocker.lockerNumber}` : 'Add New Locker'}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <input
                  type="text"
                  value={newLockerData.lockerNumber}
                  onChange={(e) => setNewLockerData(prev => ({ ...prev, lockerNumber: e.target.value }))}
                  placeholder="Enter locker number"
                  className="flex-1 px-4 py-2 border border-indigo-200 dark:border-indigo-700 rounded-lg bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                  disabled={!selectedBranch && !editingLocker}
                />
                {editingLocker && (
                  <div className="w-full sm:w-48">
                    <Select
                      options={branchOptions}
                      value={branchOptions.find(b => b.value === newLockerData.branchId)}
                      onChange={(option) => setNewLockerData(prev => ({ ...prev, branchId: (option as SelectOption)?.value || null }))}
                    />
                  </div>
                )}
                {editingLocker ? (
                  <div className="flex gap-2 sm:gap-3">
                    <button onClick={handleUpdateLocker} className="flex items-center px-4 py-2 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 text-white rounded-md shadow-md hover:from-violet-500 hover:via-fuchsia-400 hover:to-sky-400 focus:ring-2 focus:ring-violet-300 ring-1 ring-white/20">
                      <Save size={16} className="mr-2" /> Save
                    </button>
                    <button onClick={cancelEdit} className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                      <X size={16} className="mr-2" /> Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={handleCreateLocker} disabled={!selectedBranch} className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-md shadow-md hover:from-emerald-500 hover:to-teal-400 disabled:bg-gray-400">
                    <Plus size={16} className="mr-2" /> Add Locker
                  </button>
                )}
              </div>
              {!selectedBranch && !editingLocker && <p className="text-xs text-gray-500 mt-2">Please select a branch to add a new locker.</p>}
            </div>

            {/* Locker List */}
            <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-50 via-amber-50 to-rose-50 dark:from-gray-700 dark:via-gray-700 dark:to-gray-700">
                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500">Locker Number</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500">Branch</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500">Status</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500">Assigned Student</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
                  ) : lockers.length > 0 ? (
                    lockers.map(locker => (
                      <tr key={locker.id} className="border-t">
                        <td className="px-4 sm:px-6 py-4 font-medium">{locker.lockerNumber}</td>
                        <td className="px-4 sm:px-6 py-4 text-gray-600">{locker.branchName}</td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${locker.isAssigned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {locker.isAssigned ? 'Assigned' : 'Available'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-gray-600">{locker.studentName || 'N/A'}</td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex gap-3 sm:gap-4">
                            <button onClick={() => startEdit(locker)} className="px-2 py-1 text-xs rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800" title="Edit Locker">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDeleteLocker(locker.id)} className="px-2 py-1 text-xs rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800" title="Delete Locker">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="text-center py-4 text-gray-500">{selectedBranch ? 'No lockers found for this branch.' : 'Please select a branch to view lockers.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LockerManagement;