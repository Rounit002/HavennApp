import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Share, Download, Printer, AlertCircle } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import api from '../services/api'; // Make sure this path is correct
import { toast } from 'sonner';

// --- Interfaces ---
interface StudentAssignment {
  seatId: number;
  shiftId: number;
  seatNumber: string;
  shiftTitle: string;
}

interface Student {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  registrationNumber?: string | null;
  fatherName?: string | null;
  aadharNumber?: string | null;
  branchId: number;
  branchName?: string;
  membershipStart: string;
  membershipEnd: string;
  status: 'active' | 'expired';
  totalFee: number;
  amountPaid: number;
  dueAmount: number;
  cash: number;
  online: number;
  securityMoney: number;
  remark: string | null;
  profileImageUrl?: string | null;
  aadhaarFrontUrl?: string | null;
  aadhaarBackUrl?: string | null;
  lockerId?: number | null;
  lockerNumber?: string | null;
  createdAt: string;
  assignments?: Array<{
    seatId: number;
    shiftId: number;
    seatNumber: string;
    shiftTitle: string;
  }>;
  discount?: number;
}

interface LibraryInfo {
  libraryName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number | null;
}

// --- Helper Functions ---
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// --- Component ---
const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, studentId }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [libraryInfo, setLibraryInfo] = useState<LibraryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const componentRef = useRef<HTMLDivElement>(null);

  const fetchStudentData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const [studentData, ownerProfile] = await Promise.all([
        api.getStudent(studentId) as Promise<Student & { discount?: number }>,
        api.getOwnerProfile()
      ]);

      const formattedStudent: Student = {
        ...studentData,
        name: studentData.name || '',
        email: studentData.email || '',
        phone: studentData.phone || '',
        address: studentData.address || '',
        membershipStart: studentData.membershipStart || new Date().toISOString(),
        membershipEnd: studentData.membershipEnd || new Date().toISOString(),
        status: studentData.status || 'active',
        totalFee: studentData.totalFee ?? 0,
        amountPaid: studentData.amountPaid ?? 0,
        dueAmount: studentData.dueAmount ?? 0,
        cash: studentData.cash ?? 0,
        online: studentData.online ?? 0,
        securityMoney: studentData.securityMoney ?? 0,
        branchId: studentData.branchId ?? 0,
        remark: studentData.remark || null,
        createdAt: studentData.createdAt || new Date().toISOString(),
        discount: Number(studentData.discount) || 0
      };
      
      setStudent(formattedStudent);

      if (ownerProfile && ownerProfile.owner) {
        setLibraryInfo({
          libraryName: ownerProfile.owner.libraryName || 'Library',
          ownerName: ownerProfile.owner.ownerName || '',
          ownerEmail: ownerProfile.owner.ownerEmail || '',
          ownerPhone: ownerProfile.owner.ownerPhone || ''
        });
      }

    } catch (err) {
      console.error('Error fetching student data:', err);
      setError('Failed to load student data');
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (isOpen && studentId) {
      fetchStudentData();
    }
  }, [isOpen, studentId, fetchStudentData]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    pageStyle: `
      @page { 
        size: A5 portrait; 
        margin: 0;
      }
      @media print {
        body { 
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          margin: 0;
          padding: 0;
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print { 
          display: none !important; 
        }
      }
    `,
    documentTitle: `Invoice_${student?.name || 'Student'}_${new Date().toISOString().split('T')[0]}`,
  });

  const generatePdf = useCallback(async () => {
    const element = componentRef.current;
    if (!element) return null;
    
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png', 1.0);

    const pageWidth = 148.5;
    const pageHeight = 210;
    
    const pdf = new jsPDF('p', 'mm', [pageWidth, pageHeight]);
    
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    return pdf;
  }, []);

  const handleDownload = useCallback(async () => {
    if (!student) return;
    toast.info('Generating PDF...');
    try {
      const pdf = await generatePdf();
      if (!pdf) throw new Error('PDF generation failed');
      
      const fileName = `invoice_${student.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  }, [student, generatePdf]);

  const handleWhatsAppShare = useCallback(async () => {
    if (!student) return;
    
    try {
      const pdf = await generatePdf();
      if (!pdf) return;
      
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `invoice_${student.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
      
      const message = `Here's the invoice for ${student.name}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      toast.success('Downloaded PDF. Please attach it to WhatsApp.');
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      toast.error('Failed to share via WhatsApp');
    }
  }, [student, generatePdf]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
          
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-white">
              {student ? `Invoice - ${student.name}` : 'Invoice'}
            </h3>
            <div className="flex space-x-2">
              <button onClick={handlePrint} className="p-1 rounded-full text-white hover:bg-blue-700">
                <Printer className="h-5 w-5" />
              </button>
              <button onClick={onClose} className="p-1 rounded-full text-white hover:bg-blue-700">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Modal body with scroll */}
          <div className="flex-grow overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">Error loading invoice</h3>
                <p className="mt-1 text-sm text-gray-500">{error}</p>
                <button
                  onClick={fetchStudentData}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : student ? (
              <div>
                <div
                  ref={componentRef}
                  className="bg-white"
                  style={{
                    width: '800px',
                    height: '1132px',
                    margin: '0 auto',
                    padding: '40px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Header */}
                  <div style={{ paddingBottom: '8px', marginBottom: '20px' }} className="border-b-2 border-blue-600">
                    <div className="flex justify-between items-center mb-0">
                      <div className="flex-1 text-center">
                        <h1 className="font-bold text-blue-800 uppercase" style={{ fontSize: '24px', lineHeight: '1.3' }}>
                          {libraryInfo?.libraryName || 'Library'}
                        </h1>
                        <p style={{ fontSize: '16px', lineHeight: '1.3' }} className="text-gray-600">Membership Invoice</p>
                      </div>
                      {student.assignments && student.assignments.length > 0 && student.assignments[0].seatNumber && (
                        <div className="bg-blue-600 text-white px-3 py-1 rounded">
                          <p style={{ fontSize: '14px', lineHeight: '1.3' }} className="font-semibold uppercase">Seat</p>
                          <p className="font-bold" style={{ fontSize: '24px', lineHeight: '1.3' }}>
                            {student.assignments[0].seatNumber}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center" style={{ fontSize: '16px', lineHeight: '1.4' }}>
                      <div>
                        <p className="text-gray-600">Date: <span className="font-semibold">{formatDate(new Date().toISOString())}</span></p>
                        {student.registrationNumber && (
                          <p className="text-gray-600">Reg: <span className="font-semibold">{student.registrationNumber}</span></p>
                        )}
                      </div>
                      {student.assignments && student.assignments.length > 0 && student.assignments[0].shiftTitle && (
                        <div className="text-right">
                          <p className="text-gray-600">Shift: <span className="font-semibold">{student.assignments[0].shiftTitle}</span></p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Student & Membership Info */}
                  <div style={{ marginBottom: '20px', gap: '12px' }} className="grid grid-cols-2">
                    <div>
                      <h3 style={{ fontSize: '16px', lineHeight: '1.4', marginBottom: '8px' }} className="font-semibold text-gray-600 uppercase">Student Details:</h3>
                      <div style={{ lineHeight: '1.5' }}>
                        <p style={{ fontSize: '18px', lineHeight: '1.5' }} className="font-bold text-gray-900">{student.name}</p>
                        {student.fatherName && <p style={{ fontSize: '16px', lineHeight: '1.5' }} className="text-gray-600">S/O: {student.fatherName}</p>}
                        <p style={{ fontSize: '16px', lineHeight: '1.5' }} className="text-gray-600">{student.phone}</p>
                        {student.branchName && <p style={{ fontSize: '16px', lineHeight: '1.5' }} className="text-gray-600">Branch: {student.branchName}</p>}
                        {/* 💡 REMOVED: student.address was here */}
                      </div>
                    </div>
                    <div style={{ padding: '12px' }} className="bg-blue-50 rounded">
                      <h3 style={{ fontSize: '16px', lineHeight: '1.4', marginBottom: '8px' }} className="font-semibold text-blue-900 uppercase">Membership</h3>
                      <div style={{ lineHeight: '1.5' }}>
                        <div className="flex justify-between" style={{ fontSize: '16px', lineHeight: '1.5' }}>
                          <span className="text-gray-600">Start:</span>
                          <span className="font-semibold">{formatDate(student.membershipStart)}</span>
                        </div>
                        <div className="flex justify-between" style={{ fontSize: '16px', lineHeight: '1.5' }}>
                          <span className="text-gray-600">Expiry:</span>
                          <span className="font-semibold">{formatDate(student.membershipEnd)}</span>
                        </div>
                        <div className="flex justify-between" style={{ fontSize: '16px', lineHeight: '1.5' }}>
                          <span className="text-gray-600">Status:</span>
                          <span className={`font-semibold ${student.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                            {student.status.toUpperCase()}
                          </span>
                        </div>
                        {student.assignments && student.assignments.length > 0 && student.assignments[0].shiftTitle && (
                          <div className="flex justify-between border-t border-blue-200" style={{ fontSize: '16px', lineHeight: '1.5', paddingTop: '8px', marginTop: '8px' }}>
                            <span className="text-gray-600">Shift:</span>
                            <span className="font-semibold">{student.assignments[0].shiftTitle}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Billing Details */}
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', lineHeight: '1.4', marginBottom: '8px' }} className="font-semibold text-gray-600 uppercase">Billing Details</h3>
                    <table className="w-full border-collapse border border-gray-300" style={{ fontSize: '16px', lineHeight: '1.4' }}>
                      <thead>
                        <tr className="bg-gray-100">
                          <th style={{ padding: '10px 12px' }} className="border border-gray-300 text-left font-semibold">Description</th>
                          <th style={{ padding: '10px 12px' }} className="border border-gray-300 text-right font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: '10px 12px' }} className="border border-gray-300">Membership Fee</td>
                          <td style={{ padding: '10px 12px' }} className="border border-gray-300 text-right font-semibold">{formatCurrency(student.totalFee)}</td>
                        </tr>
                        {(student.discount && student.discount > 0) && (
                          <tr>
                            <td style={{ padding: '10px 12px' }} className="border border-gray-300">Discount</td>
                            <td style={{ padding: '10px 12px' }} className="border border-gray-300 text-right font-semibold text-green-600">- {formatCurrency(student.discount)}</td>
                          </tr>
                        )}
                        {student.securityMoney > 0 && (
                          <tr>
                            <td style={{ padding: '10px 12px' }} className="border border-gray-300">Security Deposit</td>
                            <td style={{ padding: '10px 12px' }} className="border border-gray-300 text-right font-semibold">{formatCurrency(student.securityMoney)}</td>
                          </tr>
                        )}
                        {/* 💡 REMOVED: The extra <tr> that was rendering "0" */}
                        <tr className="bg-gray-50 font-bold">
                          <td style={{ padding: '10px 12px' }} className="border border-gray-300">Total Amount</td>
                          <td style={{ padding: '10px 12px' }} className="border border-gray-300 text-right">{formatCurrency((student.totalFee - (student.discount || 0)))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Payment Details */}
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', lineHeight: '1.4', marginBottom: '8px' }} className="font-semibold text-gray-600 uppercase">Payment Details</h3>
                    <div style={{ padding: '12px' }} className="bg-gray-50 rounded">
                      <div className="grid grid-cols-2" style={{ gap: '4px', marginBottom: '8px', fontSize: '16px', lineHeight: '1.5' }}>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cash:</span>
                          <span className="font-semibold">{formatCurrency(student.cash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Online:</span>
                          <span className="font-semibold">{formatCurrency(student.online)}</span>
                        </div>
                      </div>
                      <div className="border-t border-gray-300 grid grid-cols-2" style={{ paddingTop: '8px', gap: '4px', fontSize: '16px', lineHeight: '1.5' }}>
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-900">Total Paid:</span>
                          <span className="font-bold text-green-600">{formatCurrency(student.amountPaid)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-900">Balance Due:</span>
                          <span className={`font-bold ${student.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(student.dueAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Remarks */}
                  {student.remark && (
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '16px', lineHeight: '1.4', marginBottom: '8px' }} className="font-semibold text-gray-600 uppercase">Remarks</h3>
                      <p style={{ fontSize: '16px', lineHeight: '1.5', padding: '12px' }} className="text-gray-700 bg-yellow-50 rounded border-l-2 border-yellow-400">
                        {student.remark}
                      </p>
                    </div>
                  )}

                  {/* Footer (uses margin-top: auto to push to bottom) */}
                  <div style={{ marginTop: 'auto', paddingTop: '12px' }} className="border-t border-gray-300">
                    <div className="text-center" style={{ lineHeight: '1.4' }}>
                      <p style={{ fontSize: '14px', lineHeight: '1.4' }} className="text-gray-600">Computer-generated invoice. No signature required.</p>
                      {libraryInfo?.ownerPhone && (
                        <p style={{ fontSize: '14px', lineHeight: '1.4' }} className="text-gray-600">Contact: {libraryInfo.ownerPhone}</p>
                      )}
                      <p style={{ fontSize: '13px', lineHeight: '1.4' }} className="text-gray-500">Generated: {new Date().toLocaleString('en-IN', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons (not part of printed/PDF content) */}
                <div className="flex justify-end space-x-3 mt-6 no-print">
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                  <button
                    onClick={handleWhatsAppShare}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                  >
                    <Share className="h-4 w-4 mr-2" />
                    Share via WhatsApp
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(InvoiceModal);