import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Trash2, Eye, EyeOff, Users, Building, Shield } from 'lucide-react';
import api from '../services/api';
import { allPermissions, Permission } from '../config/permission';

interface Branch {
  id: number;
  name: string;
  code?: string;
}

interface StaffUser {
  id: number;
  username: string;
  role: string;
  permissions: string[] | null;
  branch_access?: number[]; // may arrive as camelCase in API, keep optional here
  full_name?: string;
  fullName?: string;
  email?: string;
  branch_details?: Array<{id: number, name: string}>;
  branchDetails?: Array<{id: number, name: string}>;
}

interface NewStaffData {
  username: string;
  password: string;
  role: 'staff';
  full_name: string;
  email: string;
  permissions: string[];
  branch_access: number[];
}

const StaffManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [newStaffData, setNewStaffData] = useState<NewStaffData>({
    username: '',
    password: '',
    role: 'staff',
    full_name: '',
    email: '',
    permissions: [],
    branch_access: []
  });

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: api.getAllUsers,
  });

  // Fetch all branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: api.getBranches,
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: (data: NewStaffData) => api.addUser(data),
    onSuccess: () => {
      toast.success('Staff member created successfully!');
      setNewStaffData({
        username: '',
        password: '',
        role: 'staff',
        full_name: '',
        email: '',
        permissions: [],
        branch_access: []
      });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to create staff member'),
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => api.deleteUser(userId),
    onSuccess: () => {
      toast.success('Staff member deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to delete staff member'),
  });

  // Group permissions by category
  const groupedPermissions = allPermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setNewStaffData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(p => p !== permissionId)
    }));
  };

  const handleBranchAccessChange = (branchId: number, checked: boolean) => {
    setNewStaffData(prev => ({
      ...prev,
      branch_access: checked 
        ? [...prev.branch_access, branchId]
        : prev.branch_access.filter(id => id !== branchId)
    }));
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newStaffData.username || !newStaffData.password) {
      toast.error('Username and password are required');
      return;
    }

    if (!newStaffData.full_name) {
      toast.error('Full name is required');
      return;
    }

    if (newStaffData.permissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    if (newStaffData.branch_access.length === 0) {
      toast.error('Please select at least one branch for access');
      return;
    }

    createStaffMutation.mutate(newStaffData);
  };

  const handleDeleteUser = (userId: number, username: string) => {
    if (window.confirm(`Are you sure you want to delete staff member "${username}"?`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  // Normalize users to avoid undefined/non-array fields during render
  const staffUsers = (Array.isArray(users) ? users : [])
    .filter((user: StaffUser) => user.role === 'staff')
    .map((user: StaffUser) => ({
      ...user,
      permissions: Array.isArray((user as any).permissions) ? (user as any).permissions : [],
      branch_details: Array.isArray((user as any).branch_details)
        ? (user as any).branch_details
        : Array.isArray((user as any).branchDetails)
          ? (user as any).branchDetails
          : [],
    }));

  if (usersLoading || branchesLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create New Staff Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Create New Staff Member
          </CardTitle>
          <CardDescription>
            Create a new staff account with customizable permissions and branch access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateStaff} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={newStaffData.username}
                  onChange={(e) => setNewStaffData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={newStaffData.full_name}
                  onChange={(e) => setNewStaffData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newStaffData.email}
                  onChange={(e) => setNewStaffData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={newStaffData.password}
                    onChange={(e) => setNewStaffData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Feature Permissions Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <Label className="text-base font-semibold">Feature Permissions *</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(groupedPermissions).map(([category, permissions]) => (
                  <Card key={category} className="p-4">
                    <h4 className="font-medium mb-3 text-sm text-gray-700">{category}</h4>
                    <div className="space-y-2">
                      {permissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission.id}
                            checked={newStaffData.permissions.includes(permission.id)}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(permission.id, checked as boolean)
                            }
                          />
                          <Label 
                            htmlFor={permission.id} 
                            className="text-sm font-normal cursor-pointer"
                          >
                            {permission.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Branch Access Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                <Label className="text-base font-semibold">Branch Access *</Label>
              </div>
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {branches.map((branch) => (
                    <div key={branch.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`branch-${branch.id}`}
                        checked={newStaffData.branch_access.includes(branch.id)}
                        onCheckedChange={(checked) => 
                          handleBranchAccessChange(branch.id, checked as boolean)
                        }
                      />
                      <Label 
                        htmlFor={`branch-${branch.id}`} 
                        className="text-sm font-normal cursor-pointer"
                      >
                        {branch.name} {branch.code && `(${branch.code})`}
                      </Label>
                    </div>
                  ))}
                </div>
                {branches.length === 0 && (
                  <p className="text-sm text-gray-500">No branches available. Please create branches first.</p>
                )}
              </Card>
            </div>

            <Button 
              type="submit" 
              className="w-full md:w-auto"
              disabled={createStaffMutation.isPending}
            >
              {createStaffMutation.isPending ? 'Creating...' : 'Create Staff Member'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Staff Members */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Staff Members</CardTitle>
          <CardDescription>
            Manage existing staff accounts and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staffUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No staff members found.</p>
          ) : (
            <div className="space-y-4">
              {staffUsers.map((user: StaffUser) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{user.full_name || user.fullName || user.username}</span>
                        <Badge variant="secondary">{user.role}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                      {user.email && <p className="text-sm text-gray-600">{user.email}</p>}
                      
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium">Permissions: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.isArray(user.permissions) && user.permissions.map((permId) => {
                              const perm = allPermissions.find(p => p.id === permId);
                              return perm ? (
                                <Badge key={permId} variant="outline" className="text-xs">
                                  {perm.label}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-sm font-medium">Branch Access: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(
                              Array.isArray(user.branch_details)
                                ? user.branch_details
                                : Array.isArray(user.branchDetails)
                                  ? user.branchDetails
                                  : []
                            ).map((branch) => (
                              <Badge key={branch.id} variant="outline" className="text-xs">
                                {branch.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      disabled={deleteUserMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffManagement;
