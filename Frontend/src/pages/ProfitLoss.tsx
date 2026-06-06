import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Calendar, Building2, Download, Printer } from 'lucide-react';

interface Branch {
  id: number;
  name: string;
}

const ProfitLoss: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const branchesData = await api.getBranches();
        setBranches(branchesData);
      } catch (error) {
        console.error('Failed to fetch branches:', error);
        toast.error('Failed to load branches');
      }
    };
    fetchBranches();
  }, []);

  const handleFetch = async () => {
    try {
      const params = { month, branchId: selectedBranchId };
      const response = await api.getProfitLoss(params);
      setData(response);
    } catch (error) {
      console.error('Failed to fetch profit/loss:', error);
      toast.error('Failed to load profit/loss data');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={() => {}} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.h1
            className="text-2xl md:text-3xl font-bold mb-2 text-gray-800 dark:text-gray-100 flex items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            📈 Profit & Loss
          </motion.h1>
          <div className="mb-6 h-2 rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-500 dark:from-indigo-600 dark:via-fuchsia-600 dark:to-sky-600 shadow-sm ring-1 ring-white/30" />

          <motion.div
            className="bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700 ring-1 ring-indigo-100/70 dark:ring-indigo-900/40"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
          >
            <label
              htmlFor="month"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select Month
            </label>
            <input
              type="month"
              id="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-4 py-2 border border-indigo-200 dark:border-indigo-700 rounded-lg bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm mb-4"
            />
            <label
              htmlFor="branch"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select Branch
            </label>
            <select
              id="branch"
              value={selectedBranchId || ''}
              onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white/95 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm mb-4"
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleFetch}
              className="w-full sm:w-auto bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 text-white px-6 py-2 rounded-md shadow-md hover:from-violet-500 hover:via-fuchsia-400 hover:to-sky-400 focus:ring-2 focus:ring-violet-300 ring-1 ring-white/20 transition"
            >
              Fetch Report
            </button>
          </motion.div>

          {data && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-6"
            >
              {/* Header with Actions */}
              <div className="flex justify-between items-center no-print">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{formatMonth(data.month)}</h2>
                    <p className="text-sm text-gray-600">
                      {selectedBranchId ? branches.find(b => b.id === selectedBranchId)?.name : 'All Branches'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Collections Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 border-2 border-green-200 shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-green-500 rounded-lg">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-sm font-medium text-green-800 mb-1">Total Collections</h3>
                  <p className="text-3xl font-bold text-green-900">{formatCurrency(data.totalCollected)}</p>
                  <p className="text-xs text-green-700 mt-2">Revenue from memberships</p>
                </motion.div>

                {/* Total Expenses Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 }}
                  className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl p-6 border-2 border-red-200 shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-red-500 rounded-lg">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-sm font-medium text-red-800 mb-1">Total Expenses</h3>
                  <p className="text-3xl font-bold text-red-900">{formatCurrency(data.totalExpenses)}</p>
                  <p className="text-xs text-red-700 mt-2">Operating costs</p>
                </motion.div>

                {/* Net Profit/Loss Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className={`bg-gradient-to-br rounded-xl p-6 border-2 shadow-lg ${
                    data.profitLoss >= 0
                      ? 'from-blue-50 to-indigo-100 border-blue-200'
                      : 'from-orange-50 to-amber-100 border-orange-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${
                      data.profitLoss >= 0 ? 'bg-blue-500' : 'bg-orange-500'
                    }`}>
                      {data.profitLoss >= 0 ? (
                        <TrendingUp className="w-6 h-6 text-white" />
                      ) : (
                        <TrendingDown className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <Building2 className={`w-5 h-5 ${
                      data.profitLoss >= 0 ? 'text-blue-600' : 'text-orange-600'
                    }`} />
                  </div>
                  <h3 className={`text-sm font-medium mb-1 ${
                    data.profitLoss >= 0 ? 'text-blue-800' : 'text-orange-800'
                  }`}>
                    Net {data.profitLoss >= 0 ? 'Profit' : 'Loss'}
                  </h3>
                  <p className={`text-3xl font-bold ${
                    data.profitLoss >= 0 ? 'text-blue-900' : 'text-orange-900'
                  }`}>
                    {formatCurrency(Math.abs(data.profitLoss))}
                  </p>
                  <p className={`text-xs mt-2 ${
                    data.profitLoss >= 0 ? 'text-blue-700' : 'text-orange-700'
                  }`}>
                    {data.profitLoss >= 0 ? 'Positive cash flow' : 'Negative cash flow'}
                  </p>
                </motion.div>
              </div>

              {/* Detailed Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Financial Breakdown</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Revenue Section */}
                    <div className="border-b border-gray-200 pb-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Revenue</span>
                        <span className="text-lg font-bold text-green-600">{formatCurrency(data.totalCollected)}</span>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Membership Collections</span>
                          <span className="font-semibold text-gray-800">{formatCurrency(data.totalCollected)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expenses Section */}
                    <div className="border-b border-gray-200 pb-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Expenses</span>
                        <span className="text-lg font-bold text-red-600">{formatCurrency(data.totalExpenses)}</span>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Operating Expenses</span>
                          <span className="font-semibold text-gray-800">{formatCurrency(data.totalExpenses)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Result */}
                    <div className={`rounded-lg p-4 ${
                      data.profitLoss >= 0 ? 'bg-blue-50 border-2 border-blue-200' : 'bg-orange-50 border-2 border-orange-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className={`text-sm font-semibold uppercase tracking-wide ${
                            data.profitLoss >= 0 ? 'text-blue-700' : 'text-orange-700'
                          }`}>
                            Net {data.profitLoss >= 0 ? 'Profit' : 'Loss'}
                          </span>
                          <p className="text-xs text-gray-600 mt-1">
                            {data.profitLoss >= 0 ? 'Revenue exceeds expenses' : 'Expenses exceed revenue'}
                          </p>
                        </div>
                        <span className={`text-2xl font-bold ${
                          data.profitLoss >= 0 ? 'text-blue-900' : 'text-orange-900'
                        }`}>
                          {formatCurrency(Math.abs(data.profitLoss))}
                        </span>
                      </div>
                    </div>

                    {/* Profit Margin */}
                    {data.totalCollected > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-700">Profit Margin</span>
                          <span className={`text-lg font-bold ${
                            (data.profitLoss / data.totalCollected * 100) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {((data.profitLoss / data.totalCollected) * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (data.profitLoss / data.totalCollected * 100) >= 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(Math.abs((data.profitLoss / data.totalCollected) * 100), 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfitLoss;