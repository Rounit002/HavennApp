import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Megaphone, 
  Edit, 
  Trash2, 
  Plus, 
  Calendar, 
  User, 
  Globe,
  MapPin,
  AlertCircle,
  Clock
} from 'lucide-react';
import api from '../services/api';

// --- Type Definitions ---
interface Announcement {
  id: number;
  title: string;
  content: string;
  branchId: number | null;
  branchName?: string | null;
  isGlobal: boolean;
  startDate: string | null;
  endDate: string | null;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface AnnouncementListProps {
  isAdmin?: boolean;
  branchId?: number;
  onEdit?: (announcement: Announcement) => void;
  onAdd?: () => void;
  viewMode?: 'list' | 'grid' | 'compact';
}

// --- Helper Components ---

// A more visually appealing loading spinner
const LoadingSpinner = () => (
  <div className="flex justify-center items-center w-full h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

// An enhanced empty state message
const EmptyState = ({ isAdmin, onAdd }: { isAdmin?: boolean; onAdd?: () => void; }) => (
  <div className="text-center bg-white rounded-xl shadow-sm border border-gray-200 p-12 mt-6">
    <Megaphone className="h-16 w-16 text-gray-300 mx-auto mb-4" />
    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Announcements Yet</h3>
    <p className="text-gray-500 max-w-md mx-auto">
      {isAdmin 
        ? "It's a bit quiet in here. Click 'New Announcement' to share updates with everyone." 
        : 'There are currently no announcements to display. Please check back later.'}
    </p>
    {isAdmin && onAdd && (
      <button
        onClick={onAdd}
        className="mt-6 flex items-center mx-auto space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <Plus className="h-5 w-5" />
        <span>Create First Announcement</span>
      </button>
    )}
  </div>
);

// --- Main Component ---

const AnnouncementList: React.FC<AnnouncementListProps> = ({ 
  isAdmin = false, 
  branchId,
  onEdit,
  onAdd,
  viewMode = 'list'
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // --- Data Fetching ---
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const params = branchId && !isAdmin ? { branch_id: branchId } : {};
      const response = await api.getAnnouncements(params);
      // Normalize keys and provide safe defaults
      const normalized: Announcement[] = response.map((a: any) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        branchId: a.branchId ?? a.branch_id ?? null,
        branchName: a.branchName ?? a.branch_name ?? null,
        isGlobal: a.isGlobal ?? a.is_global ?? false,
        startDate: a.startDate ?? a.start_date ?? null,
        endDate: a.endDate ?? a.end_date ?? null,
        createdBy: a.createdBy ?? a.created_by ?? 0,
        createdByName: a.createdByName ?? a.created_by_name ?? '',
        createdAt: a.createdAt ?? a.created_at ?? new Date().toISOString(),
        updatedAt: a.updatedAt ?? a.updated_at ?? new Date().toISOString(),
        // Default to true if server omits isActive
        isActive: (a.isActive ?? a.is_active)
        	// if undefined or null, treat as true on admin side so new items don't appear inactive
            ?? true,
      }));
      // Sort announcements by creation date, newest first
      setAnnouncements(normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- API Calls ---
  const handleDelete = async (id: number) => {
    setDeletingId(id); // Show loading state on the button
    try {
      await api.deleteAnnouncement(id);
      toast.success('Announcement deleted successfully');
      // Refresh list by removing the deleted item instantly for better UX
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [branchId]); // Dependency array ensures this runs when branchId changes

  // --- Utility Functions ---
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // --- Render Logic ---
  if (loading) {
    return <LoadingSpinner />;
  }

  const isGrid = viewMode !== 'list';
  const cardBaseClasses = "rounded-xl border shadow-md transition-transform duration-200 ease-out transform-gpu will-change-transform ring-1 ring-white/20 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:rotate-[1.25deg] overflow-hidden text-white";
  const pickGradient = (ann: Announcement) => {
    // Strong, dashboard-like gradients
    if (ann.isGlobal) return 'bg-gradient-to-br from-indigo-500 to-violet-600 border-transparent';
    // Branch-specific: alternate by id for visual interest
    const mod = ann.id % 3;
    if (mod === 0) return 'bg-gradient-to-br from-emerald-500 to-teal-600 border-transparent';
    if (mod === 1) return 'bg-gradient-to-br from-amber-500 to-orange-600 border-transparent';
    return 'bg-gradient-to-br from-rose-500 to-red-600 border-transparent';
  };

  return (
    <div className={isGrid ? "space-y-6" : "space-y-6"}>
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {isAdmin ? 'Manage Announcements' : 'Latest Updates'}
          </h1>
          <p className="mt-1 text-md text-gray-500">
            View, create, and manage all company-wide and branch-specific announcements.
          </p>
        </div>
        {isAdmin && onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:block">New Announcement</span>
          </button>
        )}
      </div>

      {/* Announcements List or Empty State */}
      {announcements.length === 0 ? (
        <EmptyState isAdmin={isAdmin} onAdd={onAdd} />
      ) : (
        <div className={isGrid ? "grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`${cardBaseClasses} ${pickGradient(ann)} ${!ann.isActive ? 'opacity-90' : ''}`}
            >
              {/* Card Header with Status and Actions */}
              <div className={`${viewMode === 'compact' ? 'p-3' : 'p-5'} border-b border-white/20 flex justify-between items-start gap-4`}
              >
                <div>
                  <h3 className={`${viewMode === 'compact' ? 'text-lg' : 'text-xl'} font-bold text-white`}>
                    {ann.title}
                  </h3>
                  {!ann.isActive && (
                    <span className="text-xs font-medium bg-white/20 text-white px-2 py-0.5 rounded-full mt-2 inline-block border border-white/20">
                      Inactive
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex space-x-1 flex-shrink-0">
                    <button
                      onClick={() => onEdit && onEdit(ann)}
                      className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                      title="Edit announcement"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      disabled={deletingId === ann.id}
                      className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
                      title="Delete announcement"
                    >
                       {deletingId === ann.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className={`${viewMode === 'compact' ? 'p-3' : 'p-5'} text-white/95 text-base leading-relaxed whitespace-pre-wrap`}>
                {ann.content}
              </div>

              {/* Card Footer with Metadata */}
              <div className={`${viewMode === 'compact' ? 'px-3 py-3' : 'px-5 py-4'} bg-white/10 border-t border-white/20 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/90`}
              >
                <div className="flex items-center space-x-2" title="Author">
                  <User className="h-4 w-4" />
                  <span>{ann.createdByName}</span>
                </div>
                <div className="flex items-center space-x-2" title={`Published on ${formatDate(ann.createdAt)}`}>
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(ann.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-2" title={ann.isGlobal ? "Global Announcement" : `Branch: ${ann.branchName || 'Unknown'}` }>
                  {ann.isGlobal ? <Globe className="h-4 w-4 text-white" /> : <MapPin className="h-4 w-4 text-white" />}
                  <span>
                    {ann.isGlobal ? 'Global' : (ann.branchName ? `Branch: ${ann.branchName}` : 'Branch Specific')}
                  </span>
                </div>
                {(ann.startDate || ann.endDate) && (
                  <div className="flex items-center space-x-2" title="Active Dates">
                    <Clock className="h-4 w-4 text-white" />
                    <span>
                      {formatDate(ann.startDate)} - {formatDate(ann.endDate) || 'Ongoing'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementList;