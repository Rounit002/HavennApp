import React, { useState, useEffect, Fragment } from 'react';
import { toast } from 'sonner';
import { X, Save, Globe, MapPin } from 'lucide-react';
import api from '../services/api';
import { Transition, Dialog } from '@headlessui/react';

// --- Type Definitions ---
interface Branch {
  id: number;
  name: string;
}

interface Announcement {
  id?: number;
  title: string;
  content: string;
  branchId: number | null;
  isGlobal: boolean;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

interface AnnouncementFormProps {
  announcement?: Announcement;
  onClose: () => void;
  onSuccess: () => void;
}

// --- Helper Components ---

// A modern toggle switch for the 'is_active' state
const ToggleSwitch = ({ enabled, setEnabled }: { enabled: boolean, setEnabled: (enabled: boolean) => void }) => (
  <button
    type="button"
    onClick={() => setEnabled(!enabled)}
    className={`${
      enabled ? 'bg-indigo-600' : 'bg-gray-200'
    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
  >
    <span
      className={`${
        enabled ? 'translate-x-5' : 'translate-x-0'
      } inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
    />
  </button>
);


// --- Main Component ---

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
  announcement,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<Announcement>({
    title: '',
    content: '',
    branchId: null,
    isGlobal: true, // Default to global for a cleaner initial state
    startDate: null,
    endDate: null,
    isActive: true
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // --- Effects ---
  useEffect(() => {
    // Fetch branches for the dropdown
    const fetchBranches = async () => {
      try {
        const response = await api.getBranches();
        setBranches(response);
      } catch (error) {
        toast.error('Failed to load branches');
      }
    };
    fetchBranches();
  }, []);

  useEffect(() => {
    // Pre-fill form if we are editing an announcement
    if (announcement) {
      setFormData({
        ...announcement,
        startDate: announcement.startDate ? announcement.startDate.split('T')[0] : (announcement.startDate === null ? null : ''),
        endDate: announcement.endDate ? announcement.endDate.split('T')[0] : (announcement.endDate === null ? null : ''),
      });
    }
  }, [announcement]);

  // --- Form Logic ---
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.title.trim()) newErrors.title = 'Title cannot be empty.';
    if (!formData.content.trim()) newErrors.content = 'Content is required.';
    if (!formData.isGlobal && !formData.branchId) newErrors.branchId = 'Please select a branch for a non-global announcement.';
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = 'End date cannot be before the start date.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.warning('Please fix the errors before submitting.');
      return;
    }

    setLoading(true);
    try {
      // Ensure branchId is null if the announcement is global
      const submitData = { ...formData, branchId: formData.isGlobal ? null : formData.branchId };

      if (announcement?.id) {
        await api.updateAnnouncement(announcement.id, submitData);
        toast.success('Announcement updated successfully!');
      } else {
        await api.createAnnouncement(submitData);
        toast.success('Announcement created successfully!');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save announcement.');
    } finally {
      setLoading(false);
    }
  };

  // Generic handler for form field changes
  const handleChange = (field: keyof Announcement, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for the field being edited
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Transition.Root show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-60 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <form onSubmit={handleSubmit}>
                  {/* Form Header */}
                  <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900">
                      {announcement ? 'Edit Announcement' : 'Create New Announcement'}
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Form Body */}
                  <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className={`w-full form-input ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="e.g., System Maintenance Alert"
                      />
                      {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                    </div>

                    {/* Content */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                      <textarea
                        value={formData.content}
                        onChange={(e) => handleChange('content', e.target.value)}
                        rows={5}
                        className={`w-full form-input ${errors.content ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Provide details about the announcement..."
                      />
                       {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
                    </div>

                    {/* Visibility */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                      <div className="flex rounded-lg p-1 bg-gray-100">
                        <button type="button" onClick={() => handleChange('isGlobal', true)} className={`w-1/2 py-2 text-sm rounded-md flex items-center justify-center gap-2 transition-colors ${formData.isGlobal ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                          <Globe className="h-4 w-4"/> Global
                        </button>
                        <button type="button" onClick={() => handleChange('isGlobal', false)} className={`w-1/2 py-2 text-sm rounded-md flex items-center justify-center gap-2 transition-colors ${!formData.isGlobal ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                          <MapPin className="h-4 w-4"/> Branch Specific
                        </button>
                      </div>
                    </div>
                    
                    {/* Branch Selection */}
                    {!formData.isGlobal && (
                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                         <select
                           value={formData.branchId || ''}
                           onChange={(e) => handleChange('branchId', e.target.value ? parseInt(e.target.value) : null)}
                           className={`w-full form-select ${errors.branchId ? 'border-red-500' : 'border-gray-300'}`}
                         >
                           <option value="">Select a branch...</option>
                           {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                         </select>
                         {errors.branchId && <p className="mt-1 text-sm text-red-600">{errors.branchId}</p>}
                      </div>
                    )}

                    {/* Scheduling Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (Optional)</label>
                        <input
                          type="date"
                          value={formData.startDate || ''}
                          onChange={(e) => handleChange('startDate', e.target.value || null)}
                          className="w-full form-input"
                        />
                      </div>
                       <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                        <input
                          type="date"
                          value={formData.endDate || ''}
                          onChange={(e) => handleChange('endDate', e.target.value || null)}
                          className={`w-full form-input ${errors.endDate ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
                      </div>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-700">Set as Active</h4>
                        <p className="text-xs text-gray-500">Inactive announcements will be hidden from view.</p>
                      </div>
                      <ToggleSwitch enabled={formData.isActive} setEnabled={(value) => handleChange('isActive', value)} />
                    </div>
                  </div>

                  {/* Form Footer / Actions */}
                  <div className="flex justify-end space-x-3 p-5 bg-gray-50 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center space-x-2 px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      <span>{loading ? 'Saving...' : (announcement ? 'Save Changes' : 'Create Announcement')}</span>
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default AnnouncementForm;