import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Trash2, Save, X, Users, MapPin } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  studentCount: number;
}

interface BranchListProps {
  branches: Branch[];
  onUpdateBranch: (id: string, name: string) => void;
  onDeleteBranch: (id: string) => void;
}

const BranchList: React.FC<BranchListProps> = ({ branches, onUpdateBranch, onDeleteBranch }) => {
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editName, setEditName] = useState('');

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setEditName(branch.name);
  };

  const handleSave = () => {
    if (editingBranch) {
      onUpdateBranch(editingBranch.id, editName);
      setEditingBranch(null);
    }
  };

  const handleCancel = () => {
    setEditingBranch(null);
  };

  return (
    <div className="space-y-3">
      {branches.map((branch) => (
        <div key={branch.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
          {editingBranch?.id === branch.id ? (
            <div className="flex items-center space-x-3 w-full">
              <div className="flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Branch name"
                />
              </div>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Link
                to={`/hostel/branches/${branch.id}/students`}
                className="flex items-center gap-3 text-gray-800 hover:text-blue-600 font-medium transition-colors group"
              >
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-2 rounded-lg group-hover:from-blue-200 group-hover:to-indigo-200 transition-all">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{branch.name}</div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    {branch.studentCount} students
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(branch)}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => onDeleteBranch(branch.id)}
                  disabled={branch.studentCount > 0}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    branch.studentCount > 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default BranchList;