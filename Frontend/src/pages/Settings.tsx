import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StaffManagement from '../components/StaffManagement';
import { Settings as SettingsIcon, User, Lock, Mail, Phone, Building2, Shield, Sparkles, Star, Zap, Crown, Award, Palette, Globe, Save, Eye, EyeOff, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Define interfaces
interface UserData {
  id: number;
  username: string;
  fullName: string | null;
  email: string | null;
  role: string;
  permissions: string[];
}

interface UserProfile {
  user: UserData;
}

interface ProfileUpdateData {
  fullName: string | null;
  email: string | null;
}

interface PasswordUpdateData {
  currentPassword: string;
  newPassword: string;
}

interface NewUserData {
  username: string;
  password: string;
  role: 'admin' | 'staff';
  permissions: string[];
}

interface SettingsData {
  brevoTemplateId: string;
  daysBeforeExpiration: number;
}

interface FormData {
  fullName: string;
  email: string;
  libraryName: string; // For owners
  ownerPhone: string; // For owners
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Settings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();



  const { data: profileData, isLoading, error } = useQuery<any>({
    queryKey: ['userProfile'],
    queryFn: () => (user?.isOwner ? api.getOwnerProfile() : api.getUserProfile()),
    enabled: !!user, // Fetch only when user is loaded
  });

  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery<SettingsData>({
    queryKey: ['settings'],
    queryFn: api.getSettings,
    enabled: user?.role === 'admin',
  });

  const [formData, setFormData] = useState<FormData>({
    fullName: '', email: '', libraryName: '', ownerPhone: '', oldPassword: '', newPassword: '', confirmPassword: '',
  });

  const [settingsForm, setSettingsForm] = useState({
    brevoTemplateId: '', daysBeforeExpiration: '',
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const data = profileData?.owner || profileData?.user;
    if (data) {
      setFormData((prev) => ({
        ...prev,
        fullName: data.ownerName || data.fullName || '',
        email: data.ownerEmail || data.email || '',
        libraryName: data.libraryName || '',
        ownerPhone: data.ownerPhone || '',
      }));
    }
  }, [profileData]);

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        brevoTemplateId: settings.brevoTemplateId || '',
        daysBeforeExpiration: settings.daysBeforeExpiration?.toString() || '',
      });
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };



  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettingsForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.isOwner) {
      ownerProfileMutation.mutate({ 
        libraryName: formData.libraryName,
        ownerName: formData.fullName,
        ownerEmail: formData.email,
        ownerPhone: formData.ownerPhone,
      });
    } else {
      profileMutation.mutate({ fullName: formData.fullName, email: formData.email });
    }
  };

  const profileMutation = useMutation({
    mutationFn: (data: ProfileUpdateData) => api.updateUserProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update profile'),
  });

  const ownerProfileMutation = useMutation({
    mutationFn: (data: any) => api.updateOwnerProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update profile'),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordUpdateData) => {
      if (user?.isOwner) {
        // Ensure the payload is correctly structured for the owner endpoint
        return api.changeOwnerPassword({ 
          currentPassword: data.currentPassword, 
          newPassword: data.newPassword 
        });
      } else {
        return api.changeUserPassword(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast.success('Password changed successfully!');
      setFormData((prev) => ({ ...prev, oldPassword: '', newPassword: '', confirmPassword: '' }));
    },
    onError: (error: any) => toast.error(error.message || 'Failed to change password'),
  });



  const settingsMutation = useMutation({
    mutationFn: (data: { brevoTemplateId: string; daysBeforeExpiration: number }) => api.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings updated successfully!');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update settings'),
  });

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.oldPassword || !formData.newPassword) {
      toast.error('Please fill current and new password fields');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    // Ensure we're using the correct field names that the API expects
    passwordMutation.mutate({ 
      currentPassword: formData.oldPassword, 
      newPassword: formData.newPassword 
    });
  };



  const handleSettingsUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const daysBeforeExpiration = parseInt(settingsForm.daysBeforeExpiration, 10);
    if (isNaN(daysBeforeExpiration) || daysBeforeExpiration <= 0) {
      toast.error('Days Before Expiration must be a positive number');
      return;
    }
    settingsMutation.mutate({ brevoTemplateId: settingsForm.brevoTemplateId, daysBeforeExpiration });
  };

  if (!user) return <div>Please log in to access settings.</div>;
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading profile: {error.message}</div>;

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div
        className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-40 ${isCollapsed ? 'md:w-16' : 'md:w-64'}`}>
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={() => {}} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Clean Responsive Header */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 sm:p-4 rounded-2xl shadow-lg">
                  <SettingsIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
                    Settings & Configuration
                  </h1>
                  <p className="text-gray-600 text-sm sm:text-base lg:text-lg font-medium">
                    Manage your profile, security, and system preferences
                  </p>
                </div>
              </div>
              
              {/* Feature badges - responsive */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 mt-6">
                <div className="bg-blue-50 text-blue-700 rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold">
                  🔒 Secure
                </div>
                <div className="bg-green-50 text-green-700 rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold">
                  ⚡ Fast
                </div>
                <div className="bg-purple-50 text-purple-700 rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold">
                  🎨 Modern
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Personal Information Card */}
              <div className="bg-gradient-to-br from-white via-blue-50 to-purple-50 rounded-3xl shadow-2xl border-2 border-blue-200 p-8 relative overflow-hidden group hover:shadow-3xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 group-hover:from-blue-600/10 group-hover:to-purple-600/10 transition-all duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-center mb-6">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl mr-4 shadow-xl">
                      <User className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        👤 Personal Information
                      </h3>
                      <p className="text-gray-600 font-medium">Update your profile details</p>
                    </div>
                  </div>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {user?.isOwner && (
                        <div className="md:col-span-2">
                          <label htmlFor="libraryName" className="flex items-center text-sm font-bold text-gray-700 mb-2">
                            <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                            🏛️ Library Name
                          </label>
                          <Input 
                            id="libraryName" 
                            name="libraryName" 
                            value={formData.libraryName} 
                            onChange={handleChange}
                            className="border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white/80 hover:bg-white font-medium p-4"
                          />
                        </div>
                      )}
                      <div>
                        <label htmlFor="fullName" className="flex items-center text-sm font-bold text-gray-700 mb-2">
                          <User className="h-4 w-4 mr-2 text-blue-600" />
                          {user?.isOwner ? '👑 Owner Name' : '🙋 Full Name'}
                        </label>
                        <Input 
                          id="fullName" 
                          name="fullName" 
                          value={formData.fullName} 
                          onChange={handleChange}
                          className="border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white/80 hover:bg-white font-medium p-4"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="flex items-center text-sm font-bold text-gray-700 mb-2">
                          <Mail className="h-4 w-4 mr-2 text-blue-600" />
                          📧 Email Address
                        </label>
                        <Input 
                          id="email" 
                          name="email" 
                          type="email" 
                          value={formData.email} 
                          onChange={handleChange}
                          className="border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white/80 hover:bg-white font-medium p-4"
                        />
                      </div>
                      {user?.isOwner && (
                        <div>
                          <label htmlFor="ownerPhone" className="flex items-center text-sm font-bold text-gray-700 mb-2">
                            <Phone className="h-4 w-4 mr-2 text-blue-600" />
                            📱 Owner Phone
                          </label>
                          <Input 
                            id="ownerPhone" 
                            name="ownerPhone" 
                            value={formData.ownerPhone} 
                            onChange={handleChange}
                            className="border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white/80 hover:bg-white font-medium p-4"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={profileMutation.isPending || ownerProfileMutation.isPending}
                        className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                      >
                        <Save className="h-5 w-5 mr-2" />
                        {profileMutation.isPending || ownerProfileMutation.isPending ? '💾 Saving...' : '✨ Save Changes'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Password Security Card */}
              <div className="bg-gradient-to-br from-white via-green-50 to-emerald-50 rounded-3xl shadow-2xl border-2 border-green-200 p-8 relative overflow-hidden group hover:shadow-3xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 to-emerald-600/5 group-hover:from-green-600/10 group-hover:to-emerald-600/10 transition-all duration-300"></div>
                <div className="relative z-10">
                  <div className="flex items-center mb-6">
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-3 rounded-2xl mr-4 shadow-xl">
                      <Lock className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        🔒 Security Settings
                      </h3>
                      <p className="text-gray-600 font-medium">Update your password securely</p>
                    </div>
                  </div>
                  <form onSubmit={handlePasswordUpdate} className="space-y-6">
                    <div>
                      <label htmlFor="oldPassword" className="flex items-center text-sm font-bold text-gray-700 mb-2">
                        <Shield className="h-4 w-4 mr-2 text-green-600" />
                        🔑 Current Password
                      </label>
                      <Input 
                        id="oldPassword" 
                        name="oldPassword" 
                        value={formData.oldPassword} 
                        onChange={handleChange} 
                        type="password"
                        className="border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-white/80 hover:bg-white font-medium p-4"
                      />
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="flex items-center text-sm font-bold text-gray-700 mb-2">
                        <Lock className="h-4 w-4 mr-2 text-green-600" />
                        🆕 New Password
                      </label>
                      <Input 
                        id="newPassword" 
                        name="newPassword" 
                        value={formData.newPassword} 
                        onChange={handleChange} 
                        type="password"
                        className="border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-white/80 hover:bg-white font-medium p-4"
                      />
                    </div>
                    <div>
                      <label htmlFor="confirmPassword" className="flex items-center text-sm font-bold text-gray-700 mb-2">
                        <Shield className="h-4 w-4 mr-2 text-green-600" />
                        ✅ Confirm New Password
                      </label>
                      <Input 
                        id="confirmPassword" 
                        name="confirmPassword" 
                        value={formData.confirmPassword} 
                        onChange={handleChange} 
                        type="password"
                        className="border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-white/80 hover:bg-white font-medium p-4"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        type="submit"
                        className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 hover:from-green-700 hover:via-emerald-700 hover:to-green-800 text-white font-bold py-3 px-8 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                      >
                        <Lock className="h-5 w-5 mr-2" />
                        🔐 Update Password
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {user.role === 'admin' && (
              <div className="space-y-8">
                {/* Email Settings Card */}
                <div className="bg-gradient-to-br from-white via-orange-50 to-red-50 rounded-3xl shadow-2xl border-2 border-orange-200 p-8 relative overflow-hidden group hover:shadow-3xl transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 to-red-600/5 group-hover:from-orange-600/10 group-hover:to-red-600/10 transition-all duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center mb-6">
                      <div className="bg-gradient-to-r from-orange-600 to-red-600 p-3 rounded-2xl mr-4 shadow-xl">
                        <Mail className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                          📧 Email Configuration
                        </h3>
                        <p className="text-gray-600 font-medium">Configure email templates and notifications</p>
                      </div>
                    </div>
                    {settingsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                        <span className="ml-3 text-orange-600 font-medium">Loading settings...</span>
                      </div>
                    ) : settingsError ? (
                      <div className="bg-red-100 border-2 border-red-200 rounded-xl p-4 text-red-700 font-medium">
                        ❌ Error loading settings
                      </div>
                    ) : (
                      <form onSubmit={handleSettingsUpdate} className="space-y-6">
                        <div>
                          <label htmlFor="brevoTemplateId" className="flex items-center text-sm font-bold text-gray-700 mb-2">
                            <Globe className="h-4 w-4 mr-2 text-orange-600" />
                            🌐 Brevo Template ID
                          </label>
                          <Input 
                            id="brevoTemplateId" 
                            name="brevoTemplateId" 
                            value={settingsForm.brevoTemplateId} 
                            onChange={handleSettingsChange}
                            className="border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 bg-white/80 hover:bg-white font-medium p-4"
                          />
                        </div>
                        <div>
                          <label htmlFor="daysBeforeExpiration" className="flex items-center text-sm font-bold text-gray-700 mb-2">
                            <Zap className="h-4 w-4 mr-2 text-orange-600" />
                            ⏰ Remind Before Expiration (Days)
                          </label>
                          <Input 
                            id="daysBeforeExpiration" 
                            name="daysBeforeExpiration" 
                            type="number" 
                            value={settingsForm.daysBeforeExpiration} 
                            onChange={handleSettingsChange}
                            className="border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 bg-white/80 hover:bg-white font-medium p-4"
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button 
                            type="submit"
                            className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 hover:from-orange-700 hover:via-red-700 hover:to-orange-800 text-white font-bold py-3 px-8 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                          >
                            <Save className="h-5 w-5 mr-2" />
                            📧 Save Email Settings
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* Staff Management Section */}
                <div className="bg-gradient-to-br from-white via-purple-50 to-indigo-50 rounded-3xl shadow-2xl border-2 border-purple-200 p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-indigo-600/5"></div>
                  <div className="relative z-10">
                    <div className="flex items-center mb-6">
                      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 rounded-2xl mr-4 shadow-xl">
                        <Crown className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                          👥 Staff Management
                        </h3>
                        <p className="text-gray-600 font-medium">Manage team members and permissions</p>
                      </div>
                    </div>
                    <StaffManagement />
                  </div>
                </div>
              </div>
            )}
            {user?.isOwner && (
              <div className="bg-gradient-to-br from-white via-rose-50 to-red-50 rounded-3xl shadow-2xl border-2 border-rose-200 p-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-rose-600/5"></div>
                <div className="relative z-10">
                  <div className="flex items-center mb-6">
                    <div className="bg-gradient-to-r from-red-600 to-rose-600 p-3 rounded-2xl mr-4 shadow-xl">
                      <Trash2 className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                        ⚠️ Danger Zone
                      </h3>
                      <p className="text-gray-600 font-medium">Permanently delete your account and all data</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <p className="text-red-700 text-sm">This action cannot be undone. Please be sure before proceeding.</p>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      type="button"
                      onClick={() => navigate('/delete-account')}
                      className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:via-rose-700 hover:to-red-800 text-white font-bold py-3 px-8 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                    >
                      <Trash2 className="h-5 w-5 mr-2" />
                      Go to Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
