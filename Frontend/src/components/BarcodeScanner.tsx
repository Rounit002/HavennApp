import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, RotateCw, Video, VideoOff, RefreshCw } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onClose, isOpen }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const containerIdRef = useRef<string>('qr-reader-' + Math.random().toString(36).substring(2));
  const startingRef = useRef<boolean>(false);

  // Detect Cordova runtime
  const isCordova = typeof (window as any).cordova !== 'undefined';

  /**
   * requestCameraPermission
   * - On Cordova: uses cordova-plugin-android-permissions to check/request CAMERA
   * - On Web: returns true (browser prompts automatically)
   */
  const requestCameraPermission = async (): Promise<boolean> => {
    if (!isCordova) return true;

    try {
      const perms = (window as any).cordova?.plugins?.permissions;
      if (!perms) {
        // plugin not available, assume permission handled elsewhere
        return true;
      }

      // permission const may exist on plugin or fallback to string
      const CAMERA = perms.CAMERA || 'android.permission.CAMERA';

      return await new Promise<boolean>((resolve) => {
        // first check or hasPermission (depends on plugin version)
        if (typeof perms.hasPermission === 'function') {
          perms.hasPermission(CAMERA, (status: any) => {
            if (status && status.hasPermission) {
              resolve(true);
            } else {
              // request
              perms.requestPermission(
                CAMERA,
                (requestStatus: any) => resolve(!!(requestStatus && requestStatus.hasPermission)),
                () => resolve(false)
              );
            }
          }, () => {
            // fallback to request if check fails
            perms.requestPermission(
              CAMERA,
              (requestStatus: any) => resolve(!!(requestStatus && requestStatus.hasPermission)),
              () => resolve(false)
            );
          });
        } else if (typeof perms.checkPermission === 'function') {
          // older API naming you used earlier in code
          perms.checkPermission(CAMERA, (status: any) => {
            if (status && status.hasPermission) {
              resolve(true);
            } else {
              perms.requestPermission(
                CAMERA,
                (requestStatus: any) => resolve(!!(requestStatus && requestStatus.hasPermission)),
                () => resolve(false)
              );
            }
          }, () => {
            perms.requestPermission(
              CAMERA,
              (requestStatus: any) => resolve(!!(requestStatus && requestStatus.hasPermission)),
              () => resolve(false)
            );
          });
        } else {
          // Unknown plugin API — let it pass
          resolve(true);
        }
      });
    } catch (e) {
      console.warn('requestCameraPermission failed, allowing fallback:', e);
      return true;
    }
  };

  // Cordova native scanner
  const startCordovaScanner = async () => {
    const granted = await requestCameraPermission();
    if (!granted) {
      setError('Camera permission is required to scan QR codes. Please allow it when prompted or enable it in Settings.');
      return;
    }

    try {
      (window as any).cordova.plugins.barcodeScanner.scan(
        (result: any) => {
          if (!result.cancelled) {
            onScanSuccess(result.text);
          }
          onClose();
        },
        (err: any) => {
          console.error('Cordova scan failed:', err);
          setError('Scanning failed: ' + (err?.message || err));
        },
        {
          showTorchButton: true,
          prompt: 'Place a QR code inside the scan area',
          orientation: 'portrait',
        }
      );
    } catch (err) {
      console.error('startCordovaScanner error:', err);
      setError('Failed to start native scanner.');
    }
  };

  // Get available cameras (web)
  const getCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      return videoDevices;
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('Could not access camera devices.');
      return [];
    }
  };

  // Start html5-qrcode scanner (browser)
  const startScanner = async (cameraId?: string, preferFacing?: 'user' | 'environment') => {
    try {
      if (startingRef.current) return;
      startingRef.current = true;
      setError(null);
      setIsScanning(true);

      const permitted = await requestCameraPermission();
      if (!permitted) {
        setIsScanning(false);
        startingRef.current = false;
        setError('Camera permission denied. Please grant camera access in app settings.');
        return;
      }

      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
        try { await scannerRef.current.clear(); } catch {}
        scannerRef.current = null;
      }

      const container = document.getElementById(containerIdRef.current);
      if (container) container.innerHTML = '';

      let attempts = 0;
      while (!document.getElementById(containerIdRef.current) && attempts < 5) {
        await new Promise(requestAnimationFrame);
        attempts++;
      }

      const scanner = new Html5Qrcode(containerIdRef.current);
      scannerRef.current = scanner;

      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

      await scanner.start(
        preferFacing
          ? { facingMode: preferFacing }
          : cameraId
            ? cameraId
            : { facingMode: facingMode },
        config,
        (decodedText) => {
          console.log('Barcode scanned:', decodedText);
          onScanSuccess(decodedText);
        },
        (err) => {
          const msg = typeof err === 'string' ? err : (err && (err as any).message) ? (err as any).message : '';
          if (msg && !msg.includes('No QR code found')) console.warn('QR Code scan error:', err);
        }
      );

      setIsCameraOn(true);
      setIsScanning(false);
      startingRef.current = false;
    } catch (err: any) {
      console.error('Scanner error:', err);
      setError(err.message || 'Failed to start camera');
      setIsScanning(false);
      setIsCameraOn(false);
      startingRef.current = false;
    }
  };

  // Stop scanner (browser)
  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
        try { await scannerRef.current.clear(); } catch {}
        scannerRef.current = null;
      }
      setIsCameraOn(false);
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  // Toggle / Switch / Flip camera helpers
  const toggleCamera = async () => {
    if (startingRef.current) return;
    if (isCameraOn) { await stopScanner(); } else { await startScanner(cameraId || undefined); }
  };

  const switchCamera = async () => {
    if (!cameras.length || startingRef.current) return;
    const currentIndex = cameras.findIndex(cam => cam.deviceId === cameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCameraId = cameras[nextIndex].deviceId;
    setCameraId(nextCameraId);
    await startScanner(nextCameraId);
  };

  const flipFacing = async () => {
    if (startingRef.current) return;
    const nextFacing: 'user' | 'environment' = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setCameraId(null);
    await startScanner(undefined, nextFacing);
  };

  // Main initializer when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isCordova) {
        // For Cordova, request permission then start native scanner
        (async () => {
          const perm = await requestCameraPermission();
          if (!perm) {
            setError('Camera permission is required to scan QR codes.');
            return;
          }
          startCordovaScanner();
        })();
      } else {
        // Browser fallback
        (async () => {
          const perm = await requestCameraPermission();
          if (!perm) {
            setError('Camera permission is required to scan QR codes.');
            return;
          }
          const cams = await getCameras();
          if (cams.length > 0) {
            setCameraId(cams[0].deviceId);
            await startScanner(cams[0].deviceId);
          } else {
            setError('No cameras found on this device.');
          }
        })();
      }
    }

    return () => {
      if (!isCordova) stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;
  if (isCordova) {
    // Cordova native scanner shows its own UI — render nothing or a loading modal if you wish
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Camera className="w-5 h-5 mr-2 text-blue-600" />
            Scan Library Barcode
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="p-4 flex-1 flex flex-col">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex-1 flex flex-col items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
              <p className="text-red-700 text-center mb-4">{error}</p>
              <button
                onClick={() => { setError(null); startScanner(cameraId || undefined); }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <RotateCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
            </div>
          ) : (
            <div className="relative flex-1 bg-black rounded-lg overflow-hidden">
              <div id={containerIdRef.current} className="w-full h-full" style={{ minHeight: '300px' }} />
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                    <span>Initializing camera...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 mb-4">Position the library's barcode within the scanning area</p>
            <div className="flex justify-center space-x-4">
              <button onClick={toggleCamera} className="p-3 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}>
                {isCameraOn ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
              <button onClick={flipFacing} className="p-3 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors"
                title={`Flip to ${facingMode === 'environment' ? 'front' : 'back'} camera`}>
                <RefreshCw className="w-6 h-6" />
              </button>

              {cameras.length > 1 && (
                <button onClick={switchCamera} className="p-3 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                  title="Switch camera">
                  <RotateCw className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button onClick={onClose} className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
