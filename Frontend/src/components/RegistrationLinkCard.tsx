import React, { useState } from 'react';
import { Copy, ExternalLink, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface RegistrationLinkCardProps {
  libraryCode: string;
  libraryName: string;
}

const RegistrationLinkCard: React.FC<RegistrationLinkCardProps> = ({ libraryCode, libraryName }) => {
  const [copied, setCopied] = useState(false);
  
  // Get the current domain from window.location or use a default
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}` 
    : 'https://yourdomain.com';
  
  const registrationUrl = `${baseUrl}/#/register/${libraryCode}`;
  const statusUrl = `${baseUrl}/#/registration-status/${libraryCode}`;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${type} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Register for ${libraryName}`,
          text: `Join ${libraryName} - Register now!`,
          url: registrationUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
        copyToClipboard(registrationUrl, 'Registration link');
      }
    } else {
      copyToClipboard(registrationUrl, 'Registration link');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Share2 className="w-5 h-5 mr-2 text-purple-600" />
          Public Registration Link
        </h3>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          Library Code: {libraryCode}
        </span>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Student Registration URL
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 font-mono break-all">
              {registrationUrl}
            </div>
            <button
              onClick={() => copyToClipboard(registrationUrl, 'Registration link')}
              className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              title="Copy registration link"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => openInNewTab(registrationUrl)}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              title="Open registration page"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Registration Status Check URL
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 font-mono break-all">
              {statusUrl}
            </div>
            <button
              onClick={() => copyToClipboard(statusUrl, 'Status check link')}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              title="Copy status check link"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => openInNewTab(statusUrl)}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              title="Open status check page"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">How to use:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Share the <strong>Registration URL</strong> with prospective students</li>
            <li>• Students can check their application status using the <strong>Status Check URL</strong></li>
            <li>• Review and manage applications in the <strong>Admission Requests</strong> section</li>
            <li>• Approved students will automatically get accounts and membership</li>
          </ul>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={shareLink}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Registration Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationLinkCard;
