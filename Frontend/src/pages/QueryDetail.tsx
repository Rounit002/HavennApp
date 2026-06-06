import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Query, Comment } from '../services/api';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ThumbsUp, ThumbsDown, ArrowLeft, Send, MessageSquare } from 'lucide-react';

const QueryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [query, setQuery] = useState<Query | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const fetchQuery = async () => {
    try {
      setLoading(true);
      const data = await api.getQueryById(Number(id));
      // Simple transformation to build a tree for rendering
      const comments = data.comments || [];
      const commentMap: { [key: number]: Comment & { replies: Comment[] } } = {};
      comments.forEach(comment => {
        commentMap[comment.id] = { ...comment, replies: [] };
      });
      const commentTree: Comment[] = [];
      comments.forEach(comment => {
        if (comment.parentCommentId && commentMap[comment.parentCommentId]) {
          commentMap[comment.parentCommentId].replies.push(commentMap[comment.id]);
        } else {
          commentTree.push(commentMap[comment.id]);
        }
      });
      setQuery({ ...data, comments: commentTree });
    } catch (err) {
      setError('Failed to load query');
      console.error('Error fetching query:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuery();
  }, [id]);

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!query) return;
    try {
      await api.voteOnQuery(query.id, voteType);
      await fetchQuery(); // Refetch
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleStatusUpdate = async (status: 'Approved' | 'Not Approved' | 'Done' | 'Not Done') => {
    if (!query) return;
    try {
      await api.updateQueryStatus(query.id, status);
      await fetchQuery(); // Refetch
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !query) return;

    try {
      const commentData = {
        comment_text: newComment,
        parent_comment_id: replyingTo
      };
      await api.postComment(query.id, commentData);
      setNewComment('');
      setReplyingTo(null);
      await fetchQuery(); // Refetch to get the new comment
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  const renderComments = (comments: Comment[], level = 0) => {
    return comments.map(comment => (
      <div key={comment.id} className={`flex space-x-4 mt-4 ${level > 0 ? 'pl-6' : ''}`}>
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
            {comment.commenterName.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="flex-grow">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm text-gray-800">{comment.commenterName}</span>
              <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-gray-700 mt-1 text-sm">{comment.commentText}</p>
          </div>
          <button 
            onClick={() => setReplyingTo(comment.id)}
            className="text-xs text-indigo-600 hover:underline mt-1 pl-1"
          >
            Reply
          </button>

          {replyingTo === comment.id && (
            <form onSubmit={handleCommentSubmit} className="mt-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
                placeholder="Write your reply..."
                rows={2}
              />
              <div className="mt-2 space-x-2">
                <button type="submit" className="bg-indigo-600 text-white px-3 py-1 rounded text-sm shadow-sm">Post</button>
                <button type="button" onClick={() => setReplyingTo(null)} className="text-gray-600 text-sm">Cancel</button>
              </div>
            </form>
          )}

          {comment.replies && renderComments(comment.replies, level + 1)}
        </div>
      </div>
    ));
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!query) return <div className="p-6 text-center">Query not found</div>;

  const statusColors: { [key: string]: string } = {
    'Posted': 'bg-yellow-100 text-yellow-800',
    'Approved': 'bg-green-100 text-green-800',
    'Not Approved': 'bg-red-100 text-red-800',
    'Done': 'bg-blue-100 text-blue-800',
    'Not Done': 'bg-orange-100 text-orange-800',
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-4 text-indigo-600 hover:underline flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Queries
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">{query.title}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[query.status]}`}>
              {query.status}
            </span>
          </div>
          <div className="text-sm text-gray-500 mb-4 border-b pb-4">
            Posted by <span className="font-medium text-gray-700">{query.studentName}</span> on {new Date(query.createdAt).toLocaleDateString()}
          </div>
          <p className="text-gray-700 mb-5">{query.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => handleVote('up')} className={`flex items-center space-x-1.5 text-gray-600 hover:text-green-600 ${query.userVote === 'upvote' ? 'text-green-600 font-semibold' : ''}`}>
                <ThumbsUp className="w-5 h-5" />
                <span>{query.upvotes}</span>
              </button>
              <button onClick={() => handleVote('down')} className={`flex items-center space-x-1.5 text-gray-600 hover:text-red-600 ${query.userVote === 'downvote' ? 'text-red-600 font-semibold' : ''}`}>
                <ThumbsDown className="w-5 h-5" />
                <span>{query.downvotes}</span>
              </button>
            </div>
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <select onChange={(e) => handleStatusUpdate(e.target.value as any)} value={query.status} className="text-xs border-gray-300 rounded-md shadow-sm">
                  <option>Posted</option>
                  <option>Approved</option>
                  <option>Not Approved</option>
                  <option>Done</option>
                  <option>Not Done</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-500" />
            Discussion ({query.comments?.length || 0})
          </h2>
          <form onSubmit={handleCommentSubmit} className="mb-6 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0"></div>
            <div className="flex-grow">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-2 border rounded-md mb-2 text-sm"
                placeholder={replyingTo ? 'Write your reply...' : 'Add to the discussion...'}
                rows={replyingTo ? 2 : 3}
              />
              <div className="flex items-center justify-between">
                <button type="submit" className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Post
                </button>
                {replyingTo && (
                  <button type="button" onClick={() => { setReplyingTo(null); setNewComment(''); }} className="text-gray-600 text-sm">Cancel Reply</button>
                )}
              </div>
            </div>
          </form>

          <div>
            {query.comments && query.comments.length > 0 ? (
              renderComments(query.comments)
            ) : (
              <p className="text-gray-500 text-center py-4">No comments yet. Be the first to say something!</p>
            )}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">
          {query.comments?.length || 0} {query.comments?.length === 1 ? 'Comment' : 'Comments'}
        </h2>

        {/* Comment Form */}
        <form onSubmit={handleCommentSubmit} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add a comment..."
            rows={3}
          />
          <div className="mt-2 flex justify-end">
            <button 
              type="submit" 
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              disabled={!newComment.trim()}
            >
              Post Comment
            </button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {query.comments && query.comments.length > 0 ? (
            renderComments(query.comments)
          ) : (
            <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueryDetail;
