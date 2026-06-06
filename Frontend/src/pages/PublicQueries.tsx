import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { Query } from '../services/api';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Approved':
      return 'bg-green-100 text-green-800';
    case 'Not Approved':
      return 'bg-red-100 text-red-800';
    case 'Done':
      return 'bg-blue-100 text-blue-800';
    case 'Not Done':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const PublicQueries: React.FC = () => {
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQueries = async () => {
      try {
        setLoading(true);
        const data = await api.getQueries();
        const sortedData = data.sort((a, b) => b.upvotes - a.upvotes);
        setQueries(sortedData);
      } catch (err) {
        setError('Failed to load queries');
        console.error('Error fetching queries:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQueries();
  }, []);

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Public Queries</h1>
          <button 
            onClick={() => navigate('/queries/new')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Ask a Question
          </button>
        </div>

        <div className="space-y-4">
          {queries.map(query => (
            <div 
              key={query.id} 
              className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
              onClick={() => navigate(`/queries/${query.id}`)}
            >
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-semibold text-gray-800 mb-1">{query.title}</h2>
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(query.status)}`}>
                  {query.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-3">
                Posted by <span className="font-medium text-gray-700">{query.studentName}</span> on {new Date(query.createdAt).toLocaleDateString()}
              </p>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{query.description}</p>
              <div className="flex justify-between items-center text-sm text-gray-500 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <ThumbsUp className="w-4 h-4 text-green-500" />
                    {query.upvotes}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ThumbsDown className="w-4 h-4 text-red-500" />
                    {query.downvotes}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(query.updatedAt).toLocaleDateString() !== new Date(query.createdAt).toLocaleDateString() 
                    ? `Updated on ${new Date(query.updatedAt).toLocaleDateString()}`
                    : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PublicQueries;
