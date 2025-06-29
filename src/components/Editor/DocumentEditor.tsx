import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote,
  Undo,
  Redo,
  Save
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';

interface DocumentEditorProps {
  documentId?: string;
  initialTitle?: string;
  initialContent?: string;
  onSave?: (title: string, content: string) => void;
  readOnly?: boolean;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  documentId,
  initialTitle = '',
  initialContent = '',
  onSave,
  readOnly = false
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { request } = useApi();

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      // Auto-save after 2 seconds of inactivity
      if (!readOnly && documentId) {
        debounceAutoSave();
      }
    },
  });

  // Update editor content when initialContent changes
  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  // Update title when initialTitle changes
  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  // Auto-save functionality
  const debounceAutoSave = React.useCallback(
    debounce(async () => {
      if (editor && documentId && !readOnly) {
        await handleSave(false);
      }
    }, 2000),
    [editor, documentId, readOnly]
  );

  const handleSave = async (showToast = true) => {
    if (!editor || readOnly) return;

    setIsSaving(true);
    try {
      const content = editor.getHTML();
      
      if (onSave) {
        await onSave(title, content);
      } else if (documentId) {
        await request(`/documents/${documentId}`, {
          method: 'PUT',
          body: { title, content }
        });
      }

      setLastSaved(new Date());
      if (showToast) {
        toast.success('Document saved successfully');
      }
    } catch (error) {
      if (showToast) {
        toast.error('Failed to save document');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <div className="p-6 border-b border-gray-200">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title..."
          className="w-full text-3xl font-bold text-gray-900 placeholder-gray-400 border-none outline-none bg-transparent"
          readOnly={readOnly}
        />
        {lastSaved && (
          <p className="text-sm text-gray-500 mt-2">
            Last saved: {lastSaved.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center space-x-2 p-4 border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive('bold')
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Bold className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive('italic')
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Italic className="h-4 w-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive('bulletList')
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <List className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive('orderedList')
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ListOrdered className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive('blockquote')
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Quote className="h-4 w-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Undo className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Redo className="h-4 w-4" />
          </button>

          <div className="flex-1" />

          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <EditorContent 
          editor={editor} 
          className="prose prose-lg max-w-none p-6 h-full focus:outline-none"
        />
      </div>
    </div>
  );
};

// Debounce utility
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default DocumentEditor;