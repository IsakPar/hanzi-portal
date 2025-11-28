import React, { useEffect, useState } from 'react';
import { authStorage } from '@/services/authAPI';
import { Download, RefreshCw } from 'lucide-react';
import { logger } from '@/utils/logger';

interface WaitlistEntry {
  id: string;
  email: string;
  source: string;
  createdAt: string;
}

export const WaitlistPage: React.FC = () => {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const fetchWaitlist = async () => {
    try {
      const token = authStorage.getToken();
      
      if (!token) {
        throw new Error('Authentication token not available. Please sign in again.');
      }
      
      // Ensure we point to the local backend during dev, or prod URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
      
      const response = await fetch(`${apiUrl}/v1/admin/waitlist`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch waitlist (${response.status})`);
      }
      
      const data = await response.json();
      setEntries(data.waitlist || []);
    } catch (err: any) {
      logger.error('Waitlist fetch error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (entries.length === 0) {
      alert('No entries to export');
      return;
    }

    // Create CSV content
    const headers = ['Email', 'Source', 'Signed Up'];
    const rows = entries.map(entry => [
      entry.email,
      entry.source || 'website',
      new Date(entry.createdAt).toISOString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      {/* Header with Actions */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waitlist</h1>
          <p className="text-gray-500 mt-1">
            {entries.length} {entries.length === 1 ? 'signup' : 'signups'} from PolymasterLabs website
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setError('');
              setLoading(true);
              fetchWaitlist();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          <button 
            onClick={exportToCSV}
            disabled={entries.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg">
          <h3 className="font-bold mb-2">⚠️ Error Loading Waitlist</h3>
          <p className="text-sm mb-4">{error}</p>
          <button 
            onClick={() => {
              setError('');
              setLoading(true);
              fetchWaitlist();
            }}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signed Up</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {entry.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 font-mono">
                      {entry.source || 'website'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(entry.createdAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {entries.length === 0 && (
             <div className="text-center py-12 text-gray-500">No signups yet.</div>
          )}
        </div>
      )}
    </div>
  );
};
