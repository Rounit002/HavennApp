import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api, { Query, Comment } from '../services/api';
import { useAuth } from '../context/AuthContext';

const QueryDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [query, setQuery] = useState<Query | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    if (query) {
      setSelectedStatus(query.status);
    }
  }, [query]);

  useEffect(() => {
    if (id) {
      fetchQueryDetails(parseInt(id, 10));
    }
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!id || !selectedStatus) return;

    try {
      await api.updateQueryStatus(parseInt(id, 10), selectedStatus);
      fetchQueryDetails(parseInt(id, 10)); // Refresh query details
    } catch (error) {
      console.error('Error updating query status:', error);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;

    try {
      await api.postComment(parseInt(id, 10), newComment);
      setNewComment('');
      fetchQueryDetails(parseInt(id, 10)); // Refresh comments
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const fetchQueryDetails = async (queryId: number) => {
    try {
      setLoading(true);
      const response = await api.getQueryDetails(queryId);
      setQuery(response);
    } catch (error) {
      console.error('Error fetching query details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!query) {
    return <div>Query not found.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">{query.title}</h1>
      <p className="text-sm text-gray-600 mb-4">
        Posted by {query.studentName} on {new Date(query.createdAt).toLocaleDateString()}
      </p>
      <p className="mb-6">{query.description}</p>

      {user && user.role === 'admin' && (
        <div className="mb-6 p-4 border rounded-md bg-gray-100">
          <h3 className="text-lg font-semibold mb-2">Admin Controls</h3>
          <div className="flex items-center space-x-4">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="Posted">Posted</option>
              <option value="Approved">Approved</option>
              <option value="Not Approved">Not Approved</option>
              <option value="Done">Done</option>
              <option value="Not Done">Not Done</option>
            </select>
            <button
              onClick={handleStatusUpdate}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Update Status
            </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-4">Comments</h2>
        <form onSubmit={handleCommentSubmit} className="mb-6">
          <textarea
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="Add a public comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            required
          ></textarea>
          <button type="submit" className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Post Comment
          </button>
        </form>

        <div className="space-y-4">
          {query.comments && query.comments.length > 0 ? (
            query.comments.map(comment => (
              <div key={comment.id} className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="font-semibold">{comment.studentName}</p>
                <p className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</p>
              </div>
            ))
          ) : (
            <p>No comments yet. Be the first to comment!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueryDetails;
