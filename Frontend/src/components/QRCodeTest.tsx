import React, { useState, useEffect } from 'react';
import { QrCode, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import BarcodeGenerator from './BarcodeGenerator';

const QRCodeTest: React.FC = () => {
  const [library, setLibrary] = useState<{id: number; library_code: string; name: string} | null>(null);
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testQRCodeGeneration();
  }, []);

  const testQRCodeGeneration = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Testing QR Code Generation...');
      
      // Test 1: Check if API is accessible
      console.log('Step 1: Testing API accessibility...');
      const profileData = await api.getLibraryProfile();
      console.log('API Response:', profileData);
      
      if (!profileData || !profileData.library) {
        throw new Error('No library data received from API');
      }
      
      // Test 2: Check library data structure
      console.log('Step 2: Checking library data structure...');
      const libraryData = profileData.library;
      
      if (!libraryData.id || !libraryData.libraryCode || !libraryData.libraryName) {
        throw new Error(`Missing required library fields: ${JSON.stringify(libraryData)}`);
      }
      
      // Test 3: Set library data for QR generation
      console.log('Step 3: Setting library data for QR generation...');
      setLibrary({
        id: libraryData.id,
        library_code: libraryData.libraryCode,
        name: libraryData.libraryName
      });
      
      console.log('QR Code test completed successfully!');
      toast.success('QR Code generation test passed!');
      
    } catch (error: any) {
      console.error('QR Code test failed:', error);
      setError(error.message || 'Failed to load library information');
      toast.error(`QR Code test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowQRCode = () => {
    if (!library) {
      toast.error('Library information not available');
      return;
    }
    setShowBarcodeGenerator(true);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto">
      <div className="text-center mb-6">
        <QrCode className="w-12 h-12 mx-auto mb-4 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">QR Code Test</h2>
        <p className="text-gray-600">Testing QR code generation functionality</p>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Testing QR code generation...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <div>
              <h3 className="font-medium text-red-800">Test Failed</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={testQRCodeGeneration}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry Test
          </button>
        </div>
      )}

      {library && !isLoading && !error && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <h3 className="font-medium text-green-800">Test Passed</h3>
                <p className="text-sm text-green-600 mt-1">Library data loaded successfully</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Library Information:</h4>
            <div className="space-y-2 text-sm">
              <div><strong>ID:</strong> {library.id}</div>
              <div><strong>Code:</strong> {library.library_code}</div>
              <div><strong>Name:</strong> {library.name}</div>
            </div>
          </div>

          <button
            onClick={handleShowQRCode}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Generate QR Code
          </button>
        </div>
      )}

      {/* QR Code Generator Modal */}
      {library && showBarcodeGenerator && (
        <BarcodeGenerator
          isOpen={showBarcodeGenerator}
          onClose={() => setShowBarcodeGenerator(false)}
          libraryCode={library.library_code}
          libraryName={library.name}
          libraryId={library.id}
        />
      )}
    </div>
  );
};

export default QRCodeTest;
