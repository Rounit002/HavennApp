import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode-generator';
import { QrCode, Download, Copy, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BarcodeGeneratorProps {
  libraryCode: string;
  libraryName: string;
  libraryId: number;
  isOpen: boolean;
  onClose: () => void;
}

const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({
  libraryCode,
  libraryName,
  libraryId,
  isOpen,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [barcodeData, setBarcodeData] = useState('');
  const [qrCodeSvg, setQrCodeSvg] = useState('');

  useEffect(() => {
    if (isOpen && libraryCode && libraryId) {
      generateBarcode();
    }
  }, [isOpen, libraryCode, libraryId]);

  const generateBarcode = () => {
    // Create static attendance QR code data for this library (no timestamp for consistency)
    const attendanceQrData = {
      libraryId: libraryId,
      libraryCode: libraryCode,
      libraryName: libraryName,
      type: 'attendance'
    };
    
    const barcodeContent = JSON.stringify(attendanceQrData);
    setBarcodeData(barcodeContent);

    // Generate QR Code
    try {
      const qr = QRCode(0, 'M');
      qr.addData(barcodeContent);
      qr.make();
      
      // Create SVG with proper parameters for visibility
      const svgString = qr.createSvgTag(4, 0); // cellSize=4, margin=0
      
      setQrCodeSvg(svgString);
      
      // Also draw on canvas for download
      drawQRCodeOnCanvas(qr);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate barcode');
    }
  };

  const drawQRCodeOnCanvas = (qr: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const moduleCount = qr.getModuleCount();
    const cellSize = 8;
    const margin = 32;
    const canvasSize = moduleCount * cellSize + margin * 2;

    canvas.width = canvasSize;
    canvas.height = canvasSize + 60; // Extra space for text

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw QR code
    ctx.fillStyle = '#000000';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(
            col * cellSize + margin,
            row * cellSize + margin,
            cellSize,
            cellSize
          );
        }
      }
    }

    // Add library name text
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      libraryName,
      canvas.width / 2,
      canvasSize + 25
    );

    // Add library code text
    ctx.font = '12px Arial';
    ctx.fillText(
      `Code: ${libraryCode}`,
      canvas.width / 2,
      canvasSize + 45
    );
  };

  const downloadBarcode = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${libraryCode}_barcode.png`;
    link.href = canvas.toDataURL();
    link.click();
    
    toast.success('Barcode downloaded successfully!');
  };

  const copyBarcodeData = () => {
    navigator.clipboard.writeText(barcodeData).then(() => {
      toast.success('Barcode data copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy barcode data');
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <QrCode className="w-5 h-5 mr-2 text-blue-600" />
            Library Barcode
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <h4 className="text-xl font-semibold text-gray-900 mb-2">{libraryName}</h4>
            <p className="text-sm text-gray-600">
              Students can scan this QR code to check in/out for attendance
            </p>
          </div>

          {/* QR Code Display */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
              {qrCodeSvg ? (
                <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
              ) : (
                <canvas 
                  ref={canvasRef} 
                  className="border border-gray-300"
                  style={{ maxWidth: '200px', maxHeight: '200px' }}
                />
              )}
            </div>
          </div>

          {/* Library Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Library Code:</p>
                <p className="text-gray-900 font-mono">{libraryCode}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Library ID:</p>
                <p className="text-gray-900 font-mono">{libraryId}</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="font-medium text-gray-700 mb-1">Barcode Data:</p>
              <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border break-all">
                {barcodeData}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={downloadBarcode}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>
            <button
              onClick={copyBarcodeData}
              className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Data
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">Instructions:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Print this QR code and display it prominently in your library</li>
              <li>• Students can scan this code to check in when arriving</li>
              <li>• Students can scan again to check out when leaving</li>
              <li>• Each library has a unique QR code for security</li>
              <li>• Students can only mark attendance using their registered library's QR code</li>
            </ul>
          </div>
        </div>

        {/* Hidden canvas for download */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default BarcodeGenerator;
