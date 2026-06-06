/**
 * Utility functions for attendance calculations and formatting
 */

/**
 * Calculate duration between first check-in and last check-out
 * @param firstIn - First check-in time (ISO string or null)
 * @param lastOut - Last check-out time (ISO string or null)
 * @returns Formatted duration string (e.g., "3h 45m") or null if incomplete
 */
export const calculateDuration = (firstIn: string | null, lastOut: string | null): string | null => {
  if (!firstIn || !lastOut) {
    return null; // Cannot calculate duration without both times
  }

  try {
    const checkInTime = new Date(firstIn);
    const checkOutTime = new Date(lastOut);
    
    // Validate dates
    if (isNaN(checkInTime.getTime()) || isNaN(checkOutTime.getTime())) {
      return null;
    }
    
    // Calculate difference in milliseconds
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    
    // If check-out is before check-in, return null (invalid data)
    if (diffMs < 0) {
      return null;
    }
    
    // Convert to hours and minutes
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    // Format the duration
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  } catch (error) {
    console.error('Error calculating duration:', error);
    return null;
  }
};

/**
 * Format time from ISO string to readable format
 * @param timeString - ISO time string
 * @returns Formatted time (e.g., "2:30 PM") or "N/A" if invalid
 */
export const formatTime = (timeString: string | null): string => {
  if (!timeString) return "N/A";
  
  try {
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return "N/A";
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return "N/A";
  }
};

/**
 * Format date from ISO string to readable format
 * @param dateString - ISO date string
 * @returns Formatted date (e.g., "Dec 25, 2023") or "N/A" if invalid
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return "N/A";
  }
};

/**
 * Get attendance status based on check-in/out times
 * @param firstIn - First check-in time
 * @param lastOut - Last check-out time
 * @returns Status string
 */
export const getAttendanceStatus = (firstIn: string | null, lastOut: string | null): string => {
  if (!firstIn) return "Absent";
  if (!lastOut) return "Present";
  return "Completed";
};

/**
 * Get status color classes for badges
 * @param status - Attendance status
 * @returns CSS classes for styling
 */
export const getStatusColorClasses = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'present':
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'absent':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
