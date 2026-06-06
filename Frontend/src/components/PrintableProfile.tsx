import React from 'react';
import { Printer, Calendar, User, Phone, Mail, MapPin, Clock, CheckCircle } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  phone: string;
  email: string;
  registrationNumber: string;
  address: string;
  membershipStart: string;
  membershipEnd: string;
  status: string;
}

interface AttendanceRecord {
  id: number;
  checkInTime: string;
  checkOutTime?: string;
  date: string;
  status: string;
  notes?: string;
}

interface PrintableProfileProps {
  student: Student;
  attendanceHistory: AttendanceRecord[];
  libraryName: string;
  onClose: () => void;
  isOpen: boolean;
}

const PrintableProfile: React.FC<PrintableProfileProps> = ({
  student,
  attendanceHistory,
  libraryName,
  onClose,
  isOpen
}) => {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const isExpired = (membershipEnd: string) => {
    return new Date(membershipEnd) < new Date();
  };

  const isExpiringSoon = (membershipEnd: string) => {
    const endDate = new Date(membershipEnd);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with Print Button */}
        <div className="flex items-center justify-between p-4 border-b print:hidden">
          <h3 className="text-lg font-semibold text-gray-900">Student Profile & Attendance Record</h3>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="p-6 print:p-8">
          {/* Header */}
          <div className="text-center mb-8 print:mb-12">
            <h1 className="text-2xl font-bold text-gray-900 print:text-3xl">{libraryName}</h1>
            <h2 className="text-lg text-gray-600 mt-2 print:text-xl">Student Profile & Attendance Record</h2>
            <div className="w-24 h-1 bg-blue-600 mx-auto mt-4"></div>
          </div>

          {/* Student Information */}
          <div className="mb-8 print:mb-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center print:text-2xl">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              Student Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 print:text-base">Full Name</p>
                  <p className="text-lg font-semibold text-gray-900 print:text-xl">{student.name}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500 print:text-base">Registration Number</p>
                  <p className="text-gray-900 print:text-lg">{student.registrationNumber || 'Not assigned'}</p>
                </div>

                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 print:text-base">Phone</p>
                    <p className="text-gray-900 print:text-lg">{student.phone}</p>
                  </div>
                </div>

                {student.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 print:text-base">Email</p>
                      <p className="text-gray-900 print:text-lg">{student.email}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {student.address && (
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 print:text-base">Address</p>
                      <p className="text-gray-900 print:text-lg">{student.address}</p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-500 print:text-base">Status</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold print:text-base ${
                    student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Membership Information - PROMINENT DISPLAY */}
          <div className="mb-8 print:mb-12 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg print:bg-gray-50">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center print:text-2xl">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Membership Information
            </h3>
            
            <div className="text-center space-y-4">
              {/* PROMINENT MEMBERSHIP DATES */}
              <div className="bg-white p-6 rounded-lg shadow-sm print:shadow-none print:border-2 print:border-gray-300">
                <p className="text-lg font-medium text-gray-600 mb-2 print:text-xl">Membership Period</p>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-blue-600 print:text-4xl print:text-black">
                    {formatDate(student.membershipStart)}
                  </p>
                  <p className="text-xl font-semibold text-gray-500 print:text-2xl">TO</p>
                  <p className={`text-3xl font-bold print:text-4xl ${
                    isExpired(student.membershipEnd) 
                      ? 'text-red-600 print:text-black' 
                      : isExpiringSoon(student.membershipEnd)
                      ? 'text-yellow-600 print:text-black'
                      : 'text-green-600 print:text-black'
                  }`}>
                    {formatDate(student.membershipEnd)}
                  </p>
                </div>
              </div>

              {/* Status Alerts */}
              {isExpired(student.membershipEnd) && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 print:bg-white print:border-red-500">
                  <p className="text-red-800 font-bold text-lg print:text-xl">⚠️ MEMBERSHIP EXPIRED</p>
                  <p className="text-red-600 text-sm print:text-base">Please contact your library to renew</p>
                </div>
              )}

              {!isExpired(student.membershipEnd) && isExpiringSoon(student.membershipEnd) && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 print:bg-white print:border-yellow-500">
                  <p className="text-yellow-800 font-bold text-lg print:text-xl">⚠️ MEMBERSHIP EXPIRING SOON</p>
                  <p className="text-yellow-600 text-sm print:text-base">Please contact your library to renew</p>
                </div>
              )}
            </div>
          </div>

          {/* Attendance History */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center print:text-2xl">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Recent Attendance History
            </h3>
            
            {attendanceHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 print:text-sm">
                  <thead>
                    <tr className="bg-gray-50 print:bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Date</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Check In</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Check Out</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Status</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceHistory.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 print:hover:bg-transparent">
                        <td className="border border-gray-300 px-4 py-2">{formatDate(record.date)}</td>
                        <td className="border border-gray-300 px-4 py-2">{formatTime(record.checkInTime)}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          {record.checkOutTime ? formatTime(record.checkOutTime) : '-'}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'present' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {record.status}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm">
                          {record.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No attendance records found</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t print:text-xs">
            <p>Generated on {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p className="mt-1">© {new Date().getFullYear()} {libraryName}. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableProfile;
