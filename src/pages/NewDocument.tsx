import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DocumentEditor from '../components/Editor/DocumentEditor';
import { useApi } from '../hooks/useApi';
import toast from 'react-hot-toast';

const NewDocument: React.FC = () => {
  const [saving, setSaving] = useState(false);
  const { request } = useApi();
  const navigate = useNavigate();

  const handleSave = async (title: string, content: string) => {
    setSaving(true);
    try {
      const document = await request('/documents', {
        method: 'POST',
        body: { title, content, isPublic: false }
      });
      
      toast.success('Document created successfully');
      navigate(`/documents/${document.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create document');
      throw error;
    } finally {
      setSaving(false);
    }
  };

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
          <h1 className="text-xl font-semibold text-gray-900">
            New Document
          </h1>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-white">
        <DocumentEditor
          initialTitle=""
          initialContent=""
          onSave={handleSave}
          readOnly={false}
        />
      </div>
    </div>
  );
};

export default NewDocument;