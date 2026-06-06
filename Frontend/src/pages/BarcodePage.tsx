import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, Download, Copy, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import BarcodeGenerator from '../components/BarcodeGenerator';

interface Library {
  id: number;
  library_code: string;
  name: string;
}

const BarcodePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [library, setLibrary] = useState<Library | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeLibraryData();
  }, []);

  const initializeLibraryData = async () => {
    try {
      // For now, we'll use a default library configuration
      // In a real application, this would be fetched from the API based on the logged-in owner
      const defaultLibrary: Library = {
        id: 1,
        library_code: 'MSL001',
        name: 'MAA SARASWATI LIBRARY'
      };
      setLibrary(defaultLibrary);
    } catch (error) {
      console.error('Error loading library data:', error);
      toast.error('Failed to load library information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading barcode...</p>
        </div>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <QrCode className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Failed to load library information</p>
          <button 
            onClick={handleGoBack}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={handleGoBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </button>
            </div>
            <div className="flex items-center">
              <QrCode className="w-6 h-6 text-purple-600 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">Library Barcode</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Library Info Header */}
          <div className="bg-gradient-to-r from-purple-600 to-orange-400 px-6 py-4">
            <h2 className="text-2xl font-bold text-white">{library.name}</h2>
            <p className="text-purple-100 mt-1">Library Code: {library.library_code}</p>
          </div>

          {/* Barcode Section */}
          <div className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Student Attendance Barcode
              </h3>
              <p className="text-gray-600">
                Students can scan this barcode to mark their attendance automatically
              </p>
            </div>

            {/* Barcode Generator Component */}
            <BarcodeGenerator
              libraryCode={library.library_code}
              libraryName={library.name}
              libraryId={library.id}
              isOpen={true}
              onClose={() => {}} // No close functionality on this page
            />

            {/* Instructions */}
            <div className="mt-8 bg-blue-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-blue-900 mb-3">
                How to Use This Barcode
              </h4>
              <div className="space-y-3 text-blue-800">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                    1
                  </div>
                  <p>Display this barcode prominently at your library entrance</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                    2
                  </div>
                  <p>Students can scan it using their phone camera or the scanner in their student account</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                    3
                  </div>
                  <p>Attendance will be marked automatically with in/out toggle functionality</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                    4
                  </div>
                  <p>Only students registered with your library can mark attendance using this barcode</p>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <QrCode className="h-5 w-5 text-amber-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Security Notice
                  </h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      This barcode is unique to your library and contains your library code. 
                      Students from other libraries cannot use this barcode to mark attendance. 
                      Each scan is verified against the student's registered library.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodePage;
