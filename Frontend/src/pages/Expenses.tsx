import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import api from '../services/api';

interface Expense {
  id: number;
  title: string;
  amount: number;
  date: string;
  remark: string | null;
  branchId?: number | null;
  branchName?: string | null;
}

interface Product {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface ApiExpenseResponse {
  id: number;
  title: string;
  amount: number | string;
  date: string;
  remark: string | null;
  branchId?: number | null;
  branchName?: string | null;
}

const Expenses: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
  const [formData, setFormData] = useState({ title: '', amount: '', date: '', remark: '', branchId: '' });
  const [customTitle, setCustomTitle] = useState('');
  const [isOtherTitle, setIsOtherTitle] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightedMonth, setHighlightedMonth] = useState<string | null>(null);

  // Initialize from URL parameters
  useEffect(() => {
    const monthParam = searchParams.get('month');
    const viewParam = searchParams.get('view');
    
    if (monthParam) {
      setHighlightedMonth(monthParam);
    }
    
    if (viewParam === 'profit') {
      toast.info('Viewing profit/loss details for the selected month');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await api.getBranches();
        console.log('Fetched branches:', data);
        setBranches(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch branches:', error);
        toast.error('Failed to load branches');
        setBranches([]);
      }
    };
    fetchBranches();
  }, []);

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      try {
        console.log('Fetching expenses with branchId:', selectedBranchId);
        const data = await api.getExpenses(selectedBranchId);
        console.log('API response for expenses:', data);

        if (!data || !Array.isArray(data.expenses)) {
          throw new Error('Invalid API response: expenses is not an array');
        }

        const parsedExpenses: Expense[] = data.expenses.map((expense: ApiExpenseResponse) => {
          const amount = parseFloat(String(expense.amount));
          return {
            id: expense.id,
            title: expense.title,
            amount: isNaN(amount) ? 0 : amount,
            date: expense.date,
            remark: expense.remark,
            branchId: expense.branchId ?? null,
            branchName: expense.branchName ?? null,
          };
        });
        console.log('Parsed expenses:', parsedExpenses);

        setExpenses(parsedExpenses);
        setProducts(Array.isArray(data.products) ? data.products : []);
      } catch (error) {
        console.error('Failed to fetch expenses:', error);
        toast.error('Failed to load expenses');
        setExpenses([]);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, [selectedBranchId]);

  useEffect(() => {
    if (editingExpense) {
      const formattedDate = editingExpense.date.includes('T')
        ? editingExpense.date.split('T')[0]
        : editingExpense.date;
      const isPredefinedTitle = products.some(p => p.name === editingExpense.title);
      setFormData({
        title: isPredefinedTitle ? editingExpense.title : 'Other',
        amount: editingExpense.amount.toString(),
        date: formattedDate,
        remark: editingExpense.remark || '',
        branchId: editingExpense.branchId?.toString() || '',
      });
      setIsOtherTitle(!isPredefinedTitle);
      setCustomTitle(isPredefinedTitle ? '' : editingExpense.title);
    } else {
      setFormData({ title: '', amount: '', date: '', remark: '', branchId: selectedBranchId?.toString() || '' });
      setIsOtherTitle(false);
      setCustomTitle('');
    }
  }, [editingExpense, products, selectedBranchId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'title') {
      setIsOtherTitle(value === 'Other');
      if (value !== 'Other') {
        setCustomTitle(''); // Clear custom title when a predefined title is selected
      }
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTitle(e.target.value);
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const branchId = e.target.value ? parseInt(e.target.value, 10) : undefined;
    setSelectedBranchId(branchId);
  };

  const handleSubmit = async () => {
    const finalTitle = isOtherTitle && customTitle ? customTitle : formData.title;
    if (!finalTitle || !formData.amount || !formData.date) {
      toast.error('Title, amount, and date are required');
      return;
    }
    try {
      const expenseData = {
        title: finalTitle,
        amount: formData.amount,
        date: formData.date,
        remark: formData.remark,
        branchId: formData.branchId ? parseInt(formData.branchId, 10) : null,
      };
      console.log('Submitting expense data:', expenseData);

      if (editingExpense) {
        const updatedExpenseRaw = await api.updateExpense(editingExpense.id, expenseData);
        const updatedExpense: Expense = {
          ...updatedExpenseRaw,
          amount: parseFloat(String(updatedExpenseRaw.amount)),
          branchId: updatedExpenseRaw.branchId ?? null,
          branchName: updatedExpenseRaw.branchName ?? null,
        };
        setExpenses(prev => prev.map(exp => (exp.id === updatedExpense.id ? updatedExpense : exp)));
        setEditingExpense(null);
        toast.success('Expense updated successfully');
      } else {
        const newExpenseRaw = await api.addExpense(expenseData);
        const newExpense: Expense = {
          ...newExpenseRaw,
          amount: parseFloat(String(newExpenseRaw.amount)),
          branchId: newExpenseRaw.branchId ?? null,
          branchName: newExpenseRaw.branchName ?? null,
        };
        setExpenses(prev => [newExpense, ...prev]);
        setFormData({ title: '', amount: '', date: '', remark: '', branchId: selectedBranchId?.toString() || '' });
        setIsOtherTitle(false);
        setCustomTitle('');
        toast.success('Expense added successfully');
      }
    } catch (error) {
      console.error('Failed to save expense:', error);
      toast.error('Failed to save expense');
    }
  };

  const handleEdit = (expense: Expense) => {
    console.log('Editing expense:', expense);
    setEditingExpense(expense);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await api.deleteExpense(id);
        setExpenses(prev => prev.filter(exp => exp.id !== id));
        if (editingExpense && editingExpense.id === id) {
          setEditingExpense(null);
        }
        toast.success('Expense deleted successfully');
      } catch (error) {
        console.error('Failed to delete expense:', error);
        toast.error('Failed to delete expense');
      }
    }
  };

  const groupedExpenses = expenses.reduce((acc, expense) => {
    const date = new Date(expense.date);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date for expense ${expense.id}: ${expense.date}`);
      return acc;
    }
    const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date string: ${dateString}`);
        return dateString;
      }
      return dateString.includes('T') ? dateString.split('T')[0] : dateString;
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return dateString;
    }
  };

  const getBranchName = (expense: Expense): string => {
    if (expense.branchName) {
      return expense.branchName;
    }
    if (expense.branchId) {
      const branch = branches.find(b => b.id === expense.branchId);
      return branch ? branch.name : 'Global';
    }
    return 'Global';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={() => {}} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : (
          <motion.div
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h1
              className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              💸 Expenses
            </motion.h1>
            <div className="mb-6 h-2 rounded-full bg-gradient-to-r from-indigo-500 via-amber-500 to-rose-500 dark:from-indigo-600 dark:via-amber-600 dark:to-rose-600 shadow-sm ring-1 ring-white/30" />
            <motion.div
              className="bg-white/95 dark:bg-gray-800/95 shadow-sm rounded-xl p-6 mb-4 border border-gray-200 dark:border-gray-700 ring-1 ring-indigo-100/70 dark:ring-indigo-900/40"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
            >
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">Filter by Branch</label>
              <select
                value={selectedBranchId ?? ''}
                onChange={handleBranchChange}
                className="w-full sm:w-1/3 px-4 py-2 border border-indigo-200 dark:border-indigo-700 rounded-md bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
              >
                <option value="">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </motion.div>
            <motion.div
              className="bg-white/95 dark:bg-gray-800/95 shadow-sm rounded-xl p-6 mb-8 border border-gray-200 dark:border-gray-700 ring-1 ring-indigo-100/70 dark:ring-indigo-900/40"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
            >
              <h2 className="text-lg font-semibold mb-4">{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <select
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-indigo-200 dark:border-indigo-700 rounded-md bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                >
                  <option value="">Select Title</option>
                  {products.map(product => (
                    <option key={product.id} value={product.name}>{product.name}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {isOtherTitle && (
                  <input
                    type="text"
                    name="customTitle"
                    value={customTitle}
                    onChange={handleCustomTitleChange}
                    placeholder="Enter custom title"
                    className="w-full px-4 py-2 border border-cyan-200 dark:border-cyan-700 rounded-md bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-300 shadow-sm"
                  />
                )}
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="Amount"
                  step="0.01"
                  className="w-full px-4 py-2 border border-emerald-200 dark:border-emerald-700 rounded-md bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm"
                />
                <input
                  type="text"
                  name="remark"
                  value={formData.remark}
                  onChange={handleChange}
                  placeholder="Remark"
                  className="w-full px-4 py-2 border border-violet-200 dark:border-violet-700 rounded-md bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-300 shadow-sm"
                />
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-sky-200 dark:border-sky-700 rounded-md bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-300 shadow-sm"
                />
                <select
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-emerald-200 dark:border-emerald-700 rounded-md bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm"
                >
                  <option value="">Select Branch (Optional)</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 text-white px-6 py-2 rounded-md shadow-md hover:from-violet-500 hover:via-fuchsia-400 hover:to-sky-400 focus:ring-2 focus:ring-violet-300 ring-1 ring-white/20 transition"
                >
                  {editingExpense ? 'Update Expense' : 'Add Expense'}
                </button>
                {editingExpense && (
                  <button
                    onClick={() => setEditingExpense(null)}
                    className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </motion.div>
            {Object.entries(groupedExpenses)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([monthYear, monthExpenses], index) => {
                const total = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
                const isHighlighted = highlightedMonth && monthYear.includes(new Date(highlightedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }));
                return (
                  <motion.div
                    key={monthYear}
                    className={`mb-8 ${isHighlighted ? 'ring-2 ring-blue-500 rounded-lg p-4 bg-blue-50' : ''}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                  >
                    <h2 className={`text-xl font-semibold mb-4 ${isHighlighted ? 'text-blue-800' : 'text-gray-800'}`}>
                      {monthYear} {isHighlighted && '🎯'}
                    </h2>
                    <div className="overflow-x-auto bg-white/95 dark:bg-gray-800/95 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gradient-to-r from-indigo-50 via-amber-50 to-rose-50 dark:from-gray-700 dark:via-gray-700 dark:to-gray-700 text-gray-700 dark:text-gray-200 font-semibold">
                          <tr>
                            <th className="py-3 px-4 text-left">Title</th>
                            <th className="py-3 px-4 text-left">Amount</th>
                            <th className="py-3 px-4 text-left">Remark</th>
                            <th className="py-3 px-4 text-left">Date</th>
                            <th className="py-3 px-4 text-left">Branch</th>
                            <th className="py-3 px-4 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthExpenses.map((expense, idx) => (
                            <motion.tr
                              key={expense.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.25 + idx * 0.02 }}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                            >
                              <td className="py-3 px-4 border-b">{expense.title || 'Untitled'}</td>
                              <td className="py-3 px-4 border-b">{(expense.amount || 0).toFixed(2)}</td>
                              <td className="py-3 px-4 border-b">{expense.remark || '-'}</td>
                              <td className="py-3 px-4 border-b">{formatDate(expense.date)}</td>
                              <td className="py-3 px-4 border-b">{getBranchName(expense)}</td>
                              <td className="py-3 px-4 border-b">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEdit(expense)}
                                    className="px-2 py-1 text-xs rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(expense.id)}
                                    className="px-2 py-1 text-xs rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 text-right font-semibold">
                      Total for {monthYear}: Rs. {total.toFixed(2)}
                    </div>
                  </motion.div>
                );
              })}
            {expenses.length === 0 && !loading && (
              <div className="p-6 text-center text-gray-500">
                No expenses found.
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Expenses;