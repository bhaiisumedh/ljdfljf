import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Share2, 
  Clock, 
  User,
  Globe,
  Lock,
  History
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import DocumentEditor from '../components/Editor/DocumentEditor';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Document {
  id: string;
  title: string;
  content: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  version: number;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  userPermission?: 'view' | 'edit';
}

const DocumentView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const { request } = useApi();
  const { user } = useAuthStore();

  useEffect(() => {
    if (id) {
      fetchDocument();
    }
  }, [id]);

  const fetchDocument = async () => {
    try {
      const data = await request(`/documents/${id}`, { requireAuth: false });
      setDocument(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch document');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (title: string, content: string) => {
    if (!document) return;

    try {
      const updated = await request(`/documents/${document.id}`, {
        method: 'PUT',
        body: { title, content }
      });
      
      setDocument(updated);
      setEditMode(false);
      toast.success('Document saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save document');
      throw error;
    }
  };

  const canEdit = () => {
    if (!document || !user) return false;
    return document.author.id === user.id || document.userPermission === 'edit';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Document not found</h2>
          <p className="text-gray-600 mb-4">The document you're looking for doesn't exist or you don't have access to it.</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-4">
          <Link
            to="/dashboard"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          
          <div className="flex items-center space-x-2">
            {document.is_public ? (
              <Globe className="h-5 w-5 text-green-500" title="Public" />
            ) : (
              <Lock className="h-5 w-5 text-gray-400" title="Private" />
            )}
            <h1 className="text-xl font-semibold text-gray-900">
              {document.title || 'Untitled Document'}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span>
                {document.author.first_name} {document.author.last_name}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>
                Updated {formatDistanceToNow(new Date(document.updated_at))} ago
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              to={`/documents/${document.id}/versions`}
              className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <History className="h-4 w-4" />
              <span>v{document.version}</span>
            </Link>

            {document.author.id === user?.id && (
              <Link
                to={`/documents/${document.id}/share`}
                className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </Link>
            )}

            {canEdit() && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                  editMode
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Edit className="h-4 w-4" />
                <span>{editMode ? 'View' : 'Edit'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white">
        <DocumentEditor
          documentId={document.id}
          initialTitle={document.title}
          initialContent={document.content}
          onSave={handleSave}
          readOnly={!editMode}
        />
      </div>
    </div>
  );
};

export default DocumentView;