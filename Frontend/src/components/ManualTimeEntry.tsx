import React, { useState } from 'react';
import { Clock, X, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ManualTimeEntryProps {
  onSubmit: (timeData: { type: 'in' | 'out'; time: string; notes?: string }) => void;
  onClose: () => void;
  isOpen: boolean;
  hasCheckedInToday: boolean;
}

const ManualTimeEntry: React.FC<ManualTimeEntryProps> = ({ 
  onSubmit, 
  onClose, 
  isOpen, 
  hasCheckedInToday 
}) => {
  const [entryType, setEntryType] = useState<'in' | 'out'>(hasCheckedInToday ? 'out' : 'in');
  const [selectedTime, setSelectedTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:MM format
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTime) {
      toast.error('Please select a time');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        type: entryType,
        time: selectedTime,
        notes: notes.trim() || undefined
      });
      
      // Reset form
      setNotes('');
      setSelectedTime(() => {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
      });
      
    } catch (error) {
      console.error('Error submitting time entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Manual Time Entry
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Entry Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entry Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEntryType('in')}
                disabled={hasCheckedInToday && entryType === 'out'}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                  entryType === 'in'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                } ${hasCheckedInToday && entryType === 'out' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Check In
                </div>
              </button>
              <button
                type="button"
                onClick={() => setEntryType('out')}
                disabled={!hasCheckedInToday}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                  entryType === 'out'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                } ${!hasCheckedInToday ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-center">
                  <X className="w-4 h-4 mr-1" />
                  Check Out
                </div>
              </button>
            </div>
            {!hasCheckedInToday && entryType === 'out' && (
              <p className="text-xs text-gray-500 mt-1">
                You must check in first before checking out
              </p>
            )}
          </div>

          {/* Time Selection */}
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
              Time
            </label>
            <input
              type="time"
              id="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                entryType === 'in'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Submitting...' : `Check ${entryType === 'in' ? 'In' : 'Out'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualTimeEntry;
