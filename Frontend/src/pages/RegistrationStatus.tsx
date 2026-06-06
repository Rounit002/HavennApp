import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/apiConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle, Search, Building2, User, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface Library {
  name: string;
  code: string;
}

interface RegistrationRequest {
  id: number;
  name: string;
  status: 'pending' | 'accepted' | 'rejected';
  submittedAt: string;
  lastUpdated: string;
  processedAt?: string;
  rejectionReason?: string;
}

interface StatusData {
  library: Library;
  request: RegistrationRequest;
}

const RegistrationStatus: React.FC = () => {
  const { libraryCode: urlLibraryCode, phone: urlPhone } = useParams<{ libraryCode?: string; phone?: string }>();
  const navigate = useNavigate();
  
  const [libraryCode, setLibraryCode] = useState(urlLibraryCode || '');
  const [phone, setPhone] = useState(urlPhone || '');
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (urlLibraryCode && urlPhone) {
      handleSearch();
    }
  }, [urlLibraryCode, urlPhone]);

  const handleSearch = async () => {
    if (!libraryCode || !phone) {
      toast.error('Please enter both library code and phone number');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSearched(true);

      const response = await fetch(`${API_BASE_URL}/public-registration/library/${libraryCode}/status/${phone}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          const result = await response.json();
          throw new Error(result.message || 'No registration request found');
        }
        throw new Error('Failed to check registration status');
      }

      const data = await response.json();
      setStatusData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check registration status';
      setError(errorMessage);
      setStatusData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-6 w-6" />
              Check Registration Status
            </CardTitle>
            <CardDescription>
              Enter your library code and phone number to check your registration request status
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Search Form */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="libraryCode">Library Code</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="libraryCode"
                      placeholder="e.g., LIB001"
                      className="pl-10"
                      value={libraryCode}
                      onChange={(e) => setLibraryCode(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Your phone number"
                      className="pl-10"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSearch} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Check Status
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && searched && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status Results */}
        {statusData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {statusData.library.name}
              </CardTitle>
              <CardDescription>
                Library Code: {statusData.library.code}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Student Information */}
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">{statusData.request.name}</p>
                  <p className="text-sm text-gray-500">Request ID: #{statusData.request.id}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge className={`${getStatusColor(statusData.request.status)} flex items-center gap-1`}>
                  {getStatusIcon(statusData.request.status)}
                  {statusData.request.status.charAt(0).toUpperCase() + statusData.request.status.slice(1)}
                </Badge>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium">Submitted</span>
                  <span className="text-sm text-gray-600">
                    {formatDate(statusData.request.submittedAt)}
                  </span>
                </div>

                {statusData.request.lastUpdated !== statusData.request.submittedAt && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Last Updated</span>
                    <span className="text-sm text-gray-600">
                      {formatDate(statusData.request.lastUpdated)}
                    </span>
                  </div>
                )}

                {statusData.request.processedAt && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Processed</span>
                    <span className="text-sm text-gray-600">
                      {formatDate(statusData.request.processedAt)}
                    </span>
                  </div>
                )}
              </div>

              {/* Status-specific Information */}
              {statusData.request.status === 'pending' && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Your registration request is currently being reviewed by the library administration. 
                    You will be contacted once a decision is made.
                  </AlertDescription>
                </Alert>
              )}

              {statusData.request.status === 'accepted' && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Congratulations! Your registration request has been accepted. 
                    You should have received contact information from the library administration.
                  </AlertDescription>
                </Alert>
              )}

              {statusData.request.status === 'rejected' && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your registration request has been rejected.
                    {statusData.request.rejectionReason && (
                      <>
                        <br />
                        <strong>Reason:</strong> {statusData.request.rejectionReason}
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => navigate(`/register/${statusData.library.code}`)}
                  variant="outline"
                  className="flex-1"
                >
                  New Registration
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1"
                >
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No results message */}
        {searched && !statusData && !error && !loading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Registration Found</h3>
              <p className="text-gray-600 mb-4">
                No registration request was found for the provided library code and phone number.
              </p>
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
              >
                Go Home
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RegistrationStatus;
