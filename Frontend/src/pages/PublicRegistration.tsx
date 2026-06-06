import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/apiConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Building2, User, Phone, Mail, MapPin, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface Library {
  id: number;
  name: string;
  owner: string;
  code: string;
}

interface Branch {
  id: number;
  name: string;
}

interface Seat {
  id: number;
  seat_number: string;
}

interface Shift {
  id: number;
  title: string;
  description: string;
  time: string;
}

interface Locker {
  id: number;
  locker_number: string;
}

interface LibraryData {
  library: Library;
  branches: Branch[];
  seats: Seat[];
  shifts: Shift[];
  lockers: Locker[];
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  father_name: string;
  aadhar_number: string;
  registration_number: string;
  branch_id: string;
  membership_start: string;
  membership_end: string;
  total_fee: string;
  amount_paid: string;
  cash: string;
  online: string;
  security_money: string;
  discount: string;
  shift_ids: string[];
  seat_id: string;
  locker_id: string;
  remark: string;
}

const PublicRegistration: React.FC = () => {
  const { libraryCode } = useParams<{ libraryCode: string }>();
  const navigate = useNavigate();
  
  const [libraryData, setLibraryData] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    father_name: '',
    aadhar_number: '',
    registration_number: '',
    branch_id: '',
    membership_start: '',
    membership_end: '',
    total_fee: '0',
    amount_paid: '0',
    cash: '0',
    online: '0',
    security_money: '0',
    discount: '0',
    shift_ids: [],
    seat_id: '',
    locker_id: '',
    remark: ''
  });

  useEffect(() => {
    if (libraryCode) {
      fetchLibraryData();
    }
  }, [libraryCode]);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/public-registration/library/${libraryCode}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Library not found. Please check the registration link.');
        }
        throw new Error('Failed to load library information');
      }

      const data = await response.json();
      setLibraryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load library information');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.branch_id) {
      toast.error('Please fill in all required fields (Name, Phone, Branch)');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/public-registration/library/${libraryCode}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          shift_ids: formData.shift_ids.map(id => parseInt(id)),
          branch_id: parseInt(formData.branch_id),
          seat_id: formData.seat_id && formData.seat_id !== 'none' ? parseInt(formData.seat_id) : null,
          locker_id: formData.locker_id && formData.locker_id !== 'none' ? parseInt(formData.locker_id) : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      setSuccess(true);
      setRequestId(result.requestId);
      toast.success('Registration request submitted successfully!');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading registration form...</p>
        </div>
      </div>
    );
  }

  if (error && !libraryData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Registration Submitted!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600 mb-2">
                Your registration request has been submitted successfully.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Request ID: <span className="font-mono font-medium">#{requestId}</span>
              </p>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your request is now pending review by the library administration. 
                You will be contacted once your request is processed.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button 
                onClick={() => navigate(`/registration-status/${libraryCode}/${formData.phone}`)}
                className="w-full"
              >
                Check Status
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="w-full"
              >
                Submit Another Request
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              {libraryData?.library.name}
            </CardTitle>
            <CardDescription>
              Student Registration Form • Library Code: {libraryData?.library.code}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Student Registration</CardTitle>
            <CardDescription>
              Please fill out all required information. Your request will be reviewed by the library administration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="father_name">Father's Name</Label>
                    <Input
                      id="father_name"
                      value={formData.father_name}
                      onChange={(e) => handleInputChange('father_name', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        className="pl-10"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-10"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="aadhar_number">Aadhar Number</Label>
                    <Input
                      id="aadhar_number"
                      value={formData.aadhar_number}
                      onChange={(e) => handleInputChange('aadhar_number', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="registration_number">Registration Number</Label>
                    <Input
                      id="registration_number"
                      value={formData.registration_number}
                      onChange={(e) => handleInputChange('registration_number', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Textarea
                      id="address"
                      className="pl-10"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Library Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Library Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="branch_id">Branch *</Label>
                    <Select value={formData.branch_id} onValueChange={(value) => handleInputChange('branch_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {libraryData?.branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id.toString()}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="seat_id">Preferred Seat (Optional)</Label>
                    <Select value={formData.seat_id} onValueChange={(value) => handleInputChange('seat_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a seat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No preference</SelectItem>
                        {libraryData?.seats.map((seat) => (
                          <SelectItem key={seat.id} value={seat.id.toString()}>
                            Seat {seat.seat_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="locker_id">Preferred Locker (Optional)</Label>
                    <Select value={formData.locker_id} onValueChange={(value) => handleInputChange('locker_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a locker" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No locker needed</SelectItem>
                        {libraryData?.lockers.map((locker) => (
                          <SelectItem key={locker.id} value={locker.id.toString()}>
                            Locker {locker.locker_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Membership Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Membership Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="membership_start">Membership Start Date</Label>
                    <Input
                      id="membership_start"
                      type="date"
                      value={formData.membership_start}
                      onChange={(e) => handleInputChange('membership_start', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="membership_end">Membership End Date</Label>
                    <Input
                      id="membership_end"
                      type="date"
                      value={formData.membership_end}
                      onChange={(e) => handleInputChange('membership_end', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Information (Optional)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="total_fee">Total Fee</Label>
                    <Input
                      id="total_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.total_fee}
                      onChange={(e) => handleInputChange('total_fee', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cash">Cash Payment</Label>
                    <Input
                      id="cash"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cash}
                      onChange={(e) => handleInputChange('cash', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="online">Online Payment</Label>
                    <Input
                      id="online"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.online}
                      onChange={(e) => handleInputChange('online', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="security_money">Security Money</Label>
                    <Input
                      id="security_money"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.security_money}
                      onChange={(e) => handleInputChange('security_money', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="discount">Discount</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount}
                      onChange={(e) => handleInputChange('discount', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="remark">Additional Notes</Label>
                  <Textarea
                    id="remark"
                    value={formData.remark}
                    onChange={(e) => handleInputChange('remark', e.target.value)}
                    rows={3}
                    placeholder="Any additional information you'd like to share..."
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Registration Request'
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicRegistration;
