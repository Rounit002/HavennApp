import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { Clock, Calendar, Users, Loader2, ChevronRight, UserCheck, UserX, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ShiftList: React.FC = () => {
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const response = await api.getSchedulesWithStudents();
        setShifts(response.schedules || []);
      } catch (err) {
        setError('Failed to load shifts. Please try again later.');
        console.error('Failed to fetch shifts:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchShifts();
  }, []);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await api.getBranches();
        setBranches(data || []);
      } catch (err) {
        console.error('Failed to load branches:', err);
      }
    };
    fetchBranches();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    return new Intl.DateTimeFormat('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };
  
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours > 24) {
      return `${Math.floor(diffInHours / 24)}d`;
    } else if (diffInHours > 0) {
      return `${diffInHours}h`;
    } else if (diffInHours > -24) {
      return 'Ongoing';
    } else {
      return 'Completed';
    }
  };
  
  const getStatusColor = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours > 24) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (diffInHours > 0) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    if (diffInHours > -3) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  };

  const formatTime = (timeString: string) => {
    if (!timeString || !timeString.includes(':')) return 'N/A';
    const [hour, minute] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const visibleShifts = React.useMemo(() => {
    if (selectedBranchId === 'all') return shifts;
    const branchIdNum = parseInt(selectedBranchId, 10);
    if (Number.isNaN(branchIdNum)) return shifts;
    return shifts.filter((s: any) => s.branchId === branchIdNum);
  }, [shifts, selectedBranchId]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm animate-fade-in">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-2xl sm:text-3xl font-bold">
                  <Clock size={24} className="text-white" />
                  Shifts Overview
                </CardTitle>
                <p className="text-sm text-white/80 mt-1">View and manage your scheduled shifts</p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
                  <div className="w-full sm:w-64">
                    <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                      <SelectTrigger className="ring-1 ring-indigo-100/70 dark:ring-indigo-900/40">
                        <SelectValue placeholder="Filter by branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All branches</SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 size={28} className="animate-spin text-indigo-500" />
                  </div>
                ) : error ? (
                  <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700">
                    <AlertTitle className="text-red-700 dark:text-red-300">Error</AlertTitle>
                    <AlertDescription className="text-red-600 dark:text-red-400">{error}</AlertDescription>
                  </Alert>
                ) : visibleShifts.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12 px-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-800/50 rounded-xl border border-dashed border-indigo-200 dark:border-gray-700"
                  >
                    <Calendar size={48} className="mx-auto text-indigo-400 dark:text-indigo-500 mb-3" />
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-1">No shifts scheduled</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                      Get started by adding a new shift to your schedule.
                    </p>
                  </motion.div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {visibleShifts.map((shift, index) => {
                      const timeAgo = getTimeAgo(shift.eventDate);
                      const statusColor = getStatusColor(shift.eventDate);
                      
                      return (
                        <motion.div
                          key={shift.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group relative"
                        >
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-100 blur transition duration-200 group-hover:duration-300"></div>
                          
                          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-5 h-full border border-gray-200 dark:border-gray-700 hover:border-transparent group-hover:shadow-lg transition-all duration-200">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                                  {shift.title}
                                </h3>
                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                                  <Calendar size={14} className="mr-1.5" />
                                  {formatDate(shift.eventDate)}
                                </div>
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                {timeAgo}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex -space-x-2">
                                {[1, 2, 3].map((_, i) => (
                                  <div key={i} className="h-8 w-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                                    {i < shift.studentCount ? (
                                      <UserCheck size={14} className="text-emerald-500" />
                                    ) : (
                                      <UserX size={14} />
                                    )}
                                  </div>
                                ))}
                                {shift.studentCount > 3 && (
                                  <div className="h-8 w-8 rounded-full border-2 border-white dark:border-gray-800 bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-medium text-indigo-600 dark:text-indigo-300">
                                    +{shift.studentCount - 3}
                                  </div>
                                )}
                              </div>
                              
                              <Link
                                to={`/shifts/${shift.id}/students`}
                                className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors group/button"
                              >
                                View details
                                <ChevronRight size={16} className="ml-1 group-hover/button:translate-x-0.5 transition-transform" />
                              </Link>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                                <div className="flex items-center">
                                  <div className="p-2 rounded-lg bg-white dark:bg-gray-700/50 shadow-sm mr-3">
                                    <Clock size={16} className="text-indigo-600 dark:text-indigo-300" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Shift Time</p>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                      {shift.description || 'All day'}
                                    </p>
                                  </div>
                                </div>
                                <div className="h-10 w-px bg-gray-200 dark:bg-gray-600 mx-3"></div>
                                <div className="flex items-center">
                                  <div className="p-2 rounded-lg bg-white dark:bg-gray-700/50 shadow-sm mr-3">
                                    <Users size={16} className="text-indigo-600 dark:text-indigo-300" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Students</p>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                      {shift.studentCount} {shift.studentCount === 1 ? 'Student' : 'Students'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInRow {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-fade-in-row {
          animation: fadeInRow 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ShiftList;