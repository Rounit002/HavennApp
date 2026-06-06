import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MessageSquare, Filter } from 'lucide-react'; // Using a suitable icon for WhatsApp
import api from '../services/api';

// Define the structure for student data
interface Student {
  id: number;
  name: string;
  phone: string;
  membershipEnd: string;
}

const ExpiringMembershipsPage = () => {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<string>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Initialize range from URL params
  useEffect(() => {
    const range = searchParams.get('range') || 'all';
    setSelectedRange(range);
  }, [searchParams]);

  // Fetches students with expiring memberships when the page loads or range changes
  useEffect(() => {
    const fetchExpiringStudents = async () => {
      setLoading(true);
      try {
        let response;
        
        switch (selectedRange) {
          case '1-2':
            response = await api.getExpiringByRange(undefined, 0, 2);
            break;
          case '3-5':
            response = await api.getExpiringByRange(undefined, 2, 5);
            break;
          case '5-7':
            response = await api.getExpiringByRange(undefined, 5, 7);
            break;
          default:
            response = await api.getExpiringSoon();
            break;
        }
        
        setStudents(response.students);
      } catch (error: any) {
        toast.error(error.message || 'Failed to fetch expiring memberships.');
      } finally {
        setLoading(false);
      }
    };

    fetchExpiringStudents();
  }, [selectedRange]);

  /**
   * Handles the click on the WhatsApp icon.
   * It formats the phone number and opens the WhatsApp chat link in a new tab.
   * @param phoneNumber The student's phone number.
   */
  const handleWhatsAppClick = (phoneNumber: string) => {
    if (!phoneNumber) {
      toast.error('No phone number available for this student.');
      return;
    }
    // Clean up the number by removing any non-digit characters.
    let cleanedNumber = phoneNumber.replace(/\D/g, '');

    // Prepend Indian country code '91' if it's a 10-digit number.
    if (cleanedNumber.length === 10) {
      cleanedNumber = `91${cleanedNumber}`;
    }

    const whatsappUrl = `https://wa.me/${cleanedNumber}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // A small helper function to format date strings for better readability.
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getRangeTitle = () => {
    switch (selectedRange) {
      case '1-2':
        return 'Memberships Expiring in 1-2 Days';
      case '3-5':
        return 'Memberships Expiring in 3-5 Days';
      case '5-7':
        return 'Memberships Expiring in 5-7 Days';
      default:
        return 'All Expiring Memberships';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        onBarcodeClick={() => {}} 
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">{getRangeTitle()}</h1>
              <p className="text-gray-500">View memberships expiring in the selected time range.</p>
              <div className="mt-3 rounded-xl p-4 text-white bg-gradient-to-br from-amber-500 to-orange-600 ring-1 ring-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm sm:text-base font-medium text-white/90">Reach out proactively to reduce expiries</div>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md">Reminder</span>
                </div>
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="mb-6 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter by:</span>
              </div>
              <select
                value={selectedRange}
                onChange={(e) => setSelectedRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="all">All Expiring Soon</option>
                <option value="1-2">1-2 Days</option>
                <option value="3-5">3-5 Days</option>
                <option value="5-7">5-7 Days</option>
              </select>
            </div>
            
            {/* The list of students is now rendered directly on this page. */}
            <div className="rounded-lg border bg-white shadow-sm">
              {loading ? (
                <p className="p-4 text-center text-gray-500">Loading...</p>
              ) : students.length === 0 ? (
                <p className="p-4 text-center text-gray-500">No memberships are expiring soon.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days Until Expiry</TableHead>
                      <TableHead className="text-right">Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const daysUntilExpiry = Math.ceil(
                        (new Date(student.membershipEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.phone}</TableCell>
                          <TableCell>{formatDate(student.membershipEnd)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              daysUntilExpiry <= 2 ? 'bg-red-100 text-red-800' :
                              daysUntilExpiry <= 5 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleWhatsAppClick(student.phone)}
                              title={`Send WhatsApp message to ${student.name}`}
                            >
                              <MessageSquare className="h-5 w-5 text-green-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpiringMembershipsPage;