import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  User, 
  Globe, 
  Lock,
  MoreVertical,
  Trash2,
  Share2,
  Eye
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Document {
  id: string;
  title: string;
  content: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  userPermission?: 'view' | 'edit';
}

interface DocumentListProps {
  showSharedOnly?: boolean;
}

const DocumentList: React.FC<DocumentListProps> = ({ showSharedOnly = false }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const { request } = useApi();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchDocuments();
  }, [showSharedOnly]);

  const fetchDocuments = async () => {
    try {
      const data = await request('/documents');
      
      let filteredDocs = data;
      if (showSharedOnly) {
        filteredDocs = data.filter((doc: Document) => doc.author.id !== user?.id);
      }
      
      setDocuments(filteredDocs);
    } catch (error) {
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await request(`/documents/${docId}`, { method: 'DELETE' });
      setDocuments(docs => docs.filter(doc => doc.id !== docId));
      setSelectedDoc(null);
      toast.success('Document deleted successfully');
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const getContentPreview = (content: string) => {
    // Strip HTML tags and get first 150 characters
    const text = content.replace(/<[^>]*>/g, '');
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {showSharedOnly ? 'No shared documents' : 'No documents yet'}
        </h3>
        <p className="text-gray-500 mb-6">
          {showSharedOnly 
            ? 'Documents shared with you will appear here.'
            : 'Get started by creating your first document.'
          }
        </p>
        {!showSharedOnly && (
          <Link
            to="/documents/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Document
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((document) => (
        <div
          key={document.id}
          className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Link
                    to={`/documents/${document.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate"
                  >
                    {document.title || 'Untitled Document'}
                  </Link>
                  <div className="flex items-center space-x-1">
                    {document.is_public ? (
                      <Globe className="h-4 w-4 text-green-500" title="Public" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-400" title="Private" />
                    )}
                    {document.userPermission && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {document.userPermission}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {getContentPreview(document.content)}
                </p>

                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>
                      {document.author.first_name} {document.author.last_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      Updated {formatDistanceToNow(new Date(document.updated_at))} ago
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <button
                  onClick={() => setSelectedDoc(selectedDoc === document.id ? null : document.id)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {selectedDoc === document.id && (
                  <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 w-48">
                    <Link
                      to={`/documents/${document.id}`}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setSelectedDoc(null)}
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </Link>
                    
                    {document.author.id === user?.id && (
                      <>
                        <Link
                          to={`/documents/${document.id}/share`}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={() => setSelectedDoc(null)}
                        >
                          <Share2 className="h-4 w-4" />
                          <span>Share</span>
                        </Link>
                        
                        <button
                          onClick={() => handleDelete(document.id)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors w-full"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DocumentList;