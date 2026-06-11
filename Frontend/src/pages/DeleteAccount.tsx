import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Trash2, Shield, Lock, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const DeleteAccount: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [libraryCode, setLibraryCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Preload owner profile to show library code hint
    const loadProfile = async () => {
      try {
        const data = await api.getOwnerProfile();
        const code = data?.owner?.libraryCode || '';
        setLibraryCode(code);
      } catch (e) {
        // ignore
      }
    };
    if (user?.isOwner) loadProfile();
  }, [user]);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.isOwner) {
      toast.error('Only the owner can delete the account');
      return;
    }
    if (!currentPassword || !confirmation) {
      toast.error('Please enter current password and confirmation');
      return;
    }
    if (confirmation !== libraryCode) {
      toast.error('Confirmation must exactly match your library code');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.deleteOwnerAccount({ currentPassword, confirmation });
      toast.success('Account deleted successfully');
      try { await logout(); } catch {}
      // As session is destroyed on server, ensure redirect to landing
      window.location.href = '/#/';
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.friendlyMessage || 'Failed to delete account';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-rose-50 via-white to-red-50">
      <div
        className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-40 ${isCollapsed ? 'md:w-16' : 'md:w-64'}`}>
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={() => {}} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-red-600 to-rose-600 p-3 rounded-2xl shadow-lg">
                  <Trash2 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Delete Account</h1>
                  <p className="text-gray-600">Permanently delete your library account and all associated data</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white via-rose-50 to-red-50 rounded-3xl shadow-2xl border-2 border-rose-200 p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-rose-600/5"></div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-red-700 font-semibold">This action is irreversible.</p>
                    <p className="text-red-700">Deleting your account will permanently remove your library, staff, students, transactions, and all other data.</p>
                  </div>
                </div>

                <form onSubmit={handleDelete} className="space-y-6">
                  <div>
                    <label className="flex items-center text-sm font-bold text-gray-700 mb-2">
                      <Building2 className="h-4 w-4 mr-2 text-rose-600" />
                      Library Code Confirmation
                    </label>
                    <Input
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
                      placeholder={libraryCode ? `Type ${libraryCode} to confirm` : 'Enter your library code'}
                      className="border-2 border-gray-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="flex items-center text-sm font-bold text-gray-700 mb-2">
                      <Shield className="h-4 w-4 mr-2 text-rose-600" />
                      Current Password
                    </label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="border-2 border-gray-200 rounded-xl"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Button type="button" variant="secondary" onClick={() => navigate('/settings')}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white hover:from-red-700 hover:via-rose-700 hover:to-red-800"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Deleting...' : 'Permanently Delete'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DeleteAccount;

