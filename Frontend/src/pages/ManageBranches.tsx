import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { LayoutGrid, List, Plus, Search, Edit2, Trash2, X, Check, Users, Hash, MapPin, Phone, Mail, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const ManageBranches: React.FC = () => {
  // State management
  const [branches, setBranches] = useState<{
    id: number;
    name: string;
    code?: string | null;
    address?: string;
    phone?: string;
    email?: string;
    studentCount: number;
    color: string;
    cardBg: string;
    accentGradient?: string;
  }[]>([]);
  const [formData, setFormData] = useState({ name: '', code: '', address: '', phone: '', email: '' });
  const [editingBranch, setEditingBranch] = useState<{
    id: number;
    name: string;
    code?: string | null;
    address?: string;
    phone?: string;
    email?: string;
    studentCount: number;
    color: string;
    cardBg: string;
    accentGradient?: string;
  } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { refreshUser } = useAuth();

  // Vibrant but professional color palette for branch cards
  const branchColors = [
    {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800/50',
      accent: 'from-blue-500 to-sky-600',
      hover: 'hover:border-blue-400 dark:hover:border-blue-600/50',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
    },
    {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      accent: 'from-emerald-500 to-teal-600',
      hover: 'hover:border-emerald-400 dark:hover:border-emerald-600/50',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
    },
    {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800/50',
      accent: 'from-purple-500 to-violet-600',
      hover: 'hover:border-purple-400 dark:hover:border-purple-600/50',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
    },
    {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800/50',
      accent: 'from-amber-500 to-orange-600',
      hover: 'hover:border-amber-400 dark:hover:border-amber-600/50',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
    },
    {
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800/50',
      accent: 'from-rose-500 to-pink-600',
      hover: 'hover:border-rose-400 dark:hover:border-rose-600/50',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
    },
    {
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800/50',
      accent: 'from-indigo-500 to-blue-600',
      hover: 'hover:border-indigo-400 dark:hover:border-indigo-600/50',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200'
    }
  ];

  // Helper function to get color by branch ID
  const getBranchColor = (id: number) => {
    return branchColors[id % branchColors.length];
  };

  useEffect(() => {
    const fetchBranches = async () => {
      setIsLoading(true);
      try {
        // First, get all branches
        const branchesData = await api.getBranches();
        
        // Then, fetch student counts for each branch
        const branchesWithStats = await Promise.all(
          (branchesData || []).map(async (branch: any) => {
            try {
              // Mock student count for now - replace with actual API call when available
              const mockStats = { studentCount: Math.floor(Math.random() * 150) + 10 };
              const colorIndex = branch.id % branchColors.length;
              const colors = getBranchColor(branch.id);
              return {
                ...branch,
                studentCount: mockStats.studentCount || 0,
                color: colors.badge,
                cardBg: `${colors.bg} ${colors.border} ${colors.hover} transition-colors duration-200`,
                accentGradient: colors.accent
              };
            } catch (error) {
              console.error(`Failed to fetch stats for branch ${branch.id}:`, error);
              const colorIndex = branch.id % branchColors.length;
              const colors = getBranchColor(branch.id);
              return {
                ...branch,
                studentCount: 0,
                color: colors.badge,
                cardBg: `${colors.bg} ${colors.border} ${colors.hover} transition-colors duration-200`,
                accentGradient: colors.accent
              };
            }
          })
        );
        
        setBranches(branchesWithStats);
      } catch (error: any) {
        console.error('Failed to load branches:', error);
        toast.error(error.message || 'Could not fetch branches');
        setBranches([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBranches();
  }, [refreshUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (name in prev) {
        return { ...prev, [name]: value };
      }
      return prev;
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingBranch) {
        const updated = await api.updateBranch(editingBranch.id, formData);
        setBranches(prev => prev.map(b => b.id === updated.id ? {
          ...updated,
          studentCount: b.studentCount,
          color: b.color,
          cardBg: b.cardBg,
          accentGradient: b.accentGradient
        } : b));
        setEditingBranch(null);
      } else {
        const created = await api.addBranch(formData);
        const colorIndex = created.id % branchColors.length;
        const colors = getBranchColor(created.id);
        setBranches(prev => [...prev, {
          ...created,
          studentCount: 0,
          color: colors.badge,
          cardBg: `${colors.bg} ${colors.border} ${colors.hover} transition-colors duration-200`,
          accentGradient: colors.accent
        }]);
        setFormData({ name: '', code: '', address: '', phone: '', email: '' });
      }
      toast.success('Branch saved successfully');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save branch');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await api.deleteBranch(id);
      setBranches(prev => prev.filter(b => b.id !== id));
      toast.success('Branch deleted');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete branch');
    }
  };

  // Filter branches based on search term
  const filteredBranches = branches.filter(branch => 
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Manage Branches</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {filteredBranches.length} {filteredBranches.length === 1 ? 'branch' : 'branches'} found
                </p>
              </div>
              
              <div className="flex items-center gap-3 mt-4 sm:mt-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search branches..."
                    className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white/50 dark:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <List size={18} />
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    setFormData({ name: '', code: '', address: '', phone: '', email: '' });
                    setEditingBranch(null);
                    setIsFormOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-sm"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Add Branch</span>
                </button>
              </div>
            </div>
            
            {/* Add/Edit Form Modal */}
            <AnimatePresence>
              {isFormOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                        <span className="w-3 h-3 rounded-full mr-2 bg-indigo-500"></span>
                        {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                      </h2>
                      <button
                        onClick={() => {
                          setIsFormOpen(false);
                          setEditingBranch(null);
                        }}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Branch Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter branch name"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 dark:bg-gray-700/50"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Branch Code
                          </label>
                          <input
                            type="text"
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            placeholder="e.g., BR-001"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 dark:bg-gray-700/50"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Address
                          </label>
                          <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Enter full address"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 dark:bg-gray-700/50"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+1 (555) 000-0000"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 dark:bg-gray-700/50"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="branch@example.com"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 dark:bg-gray-700/50"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                        <button
                          type="button"
                          onClick={() => {
                            setIsFormOpen(false);
                            setEditingBranch(null);
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors flex items-center gap-2"
                        >
                          <Check size={16} />
                          {editingBranch ? 'Update Branch' : 'Add Branch'}
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Branches List */}
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : filteredBranches.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <div className="mx-auto w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                  <MapPin size={32} className="text-indigo-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No branches found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
                  {searchTerm ? 'No branches match your search. Try a different term.' 
                    : 'Get started by adding your first branch.'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => {
                      setFormData({ name: '', code: '', address: '', phone: '', email: '' });
                      setEditingBranch(null);
                      setIsFormOpen(true);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    <Plus size={16} className="mr-2" />
                    Add Branch
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBranches.map((branch) => (
                  <motion.div
                    key={branch.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="group relative"
                  >
                    <div className={`p-6 rounded-lg shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-l-4 ${branch.accentGradient ? `border-l-4 bg-gradient-to-r ${branch.accentGradient} bg-[length:200%_100%] hover:bg-[100%_100%]` : ''} ${branch.cardBg} group cursor-pointer`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center mb-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${branch.color}`}>
                              {branch.code || 'BR-' + branch.id.toString().padStart(3, '0')}
                            </span>
                          </div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {branch.name}
                          </h2>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setFormData({
                                name: branch.name,
                                code: branch.code || '',
                                address: branch.address || '',
                                phone: branch.phone || '',
                                email: branch.email || ''
                              });
                              setEditingBranch(branch);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Edit branch"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(branch.id)}
                            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            aria-label="Delete branch"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4 space-y-3 text-sm">
                        {branch.address && (
                          <div className="flex items-start">
                            <MapPin className="flex-shrink-0 h-4 w-4 text-gray-400 mt-0.5 mr-2" />
                            <span className="text-gray-600 dark:text-gray-300">{branch.address}</span>
                          </div>
                        )}
                        
                        {(branch.phone || branch.email) && (
                          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            {branch.phone && (
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 text-gray-400 mr-2" />
                                <a 
                                  href={`tel:${branch.phone}`} 
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                  {branch.phone}
                                </a>
                              </div>
                            )}
                            
                            {branch.email && (
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 text-gray-400 mr-2" />
                                <a 
                                  href={`mailto:${branch.email}`}
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                                >
                                  {branch.email}
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700/50">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          Branch Name
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          Code
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                          Contact
                        </th>
                        <th scope="col" className="relative px-6 py-4">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredBranches.map((branch) => (
                        <motion.tr
                          key={branch.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center mr-3 shadow-sm ${branch.color}`}>
                                <MapPin className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {branch.name}
                                </div>
                                {branch.address && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                    {branch.address}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${branch.color}`}>
                              {branch.code || 'BR-' + branch.id.toString().padStart(3, '0')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              {branch.phone && (
                                <div className="text-sm text-gray-900 dark:text-white">
                                  <a href={`tel:${branch.phone}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                    {branch.phone}
                                  </a>
                                </div>
                              )}
                              {branch.email && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                  <a href={`mailto:${branch.email}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                    {branch.email}
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setFormData({
                                    name: branch.name,
                                    code: branch.code || '',
                                    address: branch.address || '',
                                    phone: branch.phone || '',
                                    email: branch.email || ''
                                  });
                                  setEditingBranch(branch);
                                  setIsFormOpen(true);
                                }}
                                className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Edit branch"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(branch.id)}
                                className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Delete branch"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageBranches;