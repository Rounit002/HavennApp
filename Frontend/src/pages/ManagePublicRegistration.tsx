import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import RegistrationLinkCard from '../components/RegistrationLinkCard';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'sonner';

interface LibraryInfo {
  id: number;
  library_code: string;
  name: string;
}

const ManagePublicRegistration: React.FC = () => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [library, setLibrary] = useState<LibraryInfo | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const profileData = await api.getLibraryProfile();
        if (profileData && profileData.library) {
          setLibrary({
            id: profileData.library.id,
            library_code: profileData.library.libraryCode,
            name: profileData.library.libraryName,
          });
        }
      } catch (err) {
        console.error('Failed to load library profile', err);
        toast.error('Could not load library information');
      }
    };
    if (user) load();
  }, [user]);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={() => {}} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Public Registration</h1>
          {library ? (
            <RegistrationLinkCard
              libraryCode={library.library_code}
              libraryName={library.name}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-gray-500">Loading library information...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagePublicRegistration;
