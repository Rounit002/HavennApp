import React, { useState } from 'react';
import { toast } from 'sonner';
import { Plus, MapPin } from 'lucide-react';

interface AddBranchFormProps {
  onSubmit: (branchData: { name: string }) => void;
}

const AddBranchForm: React.FC<AddBranchFormProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error('Branch name is required');
      return;
    }
    onSubmit({ name });
    setName('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-r from-[#E1F5EE] to-[#C6F0DF] p-2 rounded-lg">
          <MapPin className="h-5 w-5 text-[#0F6E56]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Add New Branch</h3>
          <p className="text-sm text-gray-500">Create a new branch location</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Branch Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition-all duration-200 placeholder-gray-400"
            placeholder="Enter branch name"
            required
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#0F6E56] via-[#1D9E75] to-[#1A8FA8] text-white px-6 py-3 rounded-lg hover:from-[#0F6E56] hover:via-[#0F6E56] hover:to-[#0D6B82] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
        >
          <Plus className="h-4 w-4" />
          Add Branch
        </button>
      </form>
    </div>
  );
};

export default AddBranchForm;

