import React, { useState, useEffect, useCallback } from 'react';
import { Search, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  titleMatch: boolean;
  contentMatch: boolean;
  snippet: string;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { request } = useApi();

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await request(`/search?q=${encodeURIComponent(searchQuery)}`);
      setResults(data);
    } catch (error: any) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Search Documents
          </h1>
          <p className="text-gray-600">
            Find documents by title or content across your knowledge base.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for documents..."
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            autoFocus
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Search Results */}
        {!loading && query && (
          <div className="space-y-6">
            {results.length > 0 ? (
              <>
                <div className="text-sm text-gray-500">
                  Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
                </div>
                
                <div className="space-y-4">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/documents/${result.id}`}
                            className="block group"
                          >
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                              {result.titleMatch ? (
                                highlightText(result.title, query)
                              ) : (
                                result.title || 'Untitled Document'
                              )}
                            </h3>
                            
                            {result.snippet && (
                              <p className="text-gray-600 mb-3 line-clamp-3">
                                {result.contentMatch ? (
                                  highlightText(result.snippet, query)
                                ) : (
                                  result.snippet
                                )}
                              </p>
                            )}
                          </Link>

                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>
                              By {result.author.first_name} {result.author.last_name}
                            </span>
                            <span>
                              Updated {formatDistanceToNow(new Date(result.updated_at))} ago
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              result.is_public 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {result.is_public ? 'Public' : 'Private'}
                            </span>
                          </div>
                        </div>

                        <div className="ml-4">
                          <FileText className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No results found
                </h3>
                <p className="text-gray-500">
                  Try searching with different keywords or check your spelling.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !query && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Start searching
            </h3>
            <p className="text-gray-500">
              Enter a search term to find documents in your knowledge base.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;