import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
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
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: {
          items: async ({ query }) => {
            if (query.length < 2) return [];
            
            try {
              const users = await request(`/users/search?q=${query}`);
              return users;
            } catch (error) {
              return [];
            }
          },
          render: () => {
            let component: any;
            let popup: any;

            return {
              onStart: (props: any) => {
                component = new MentionList(props);
                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },
              onUpdate(props: any) {
                component.updateProps(props);
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                });
              },
              onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }
                return component.onKeyDown(props);
              },
              onExit() {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
        },
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      // Auto-save after 2 seconds of inactivity
      if (!readOnly && documentId) {
        debounceAutoSave();
      }
    },
  });

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
      toast.error('Failed to save document');
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

// Mention component for user suggestions
class MentionList {
  items: any[];
  selectedIndex: number;
  element: HTMLElement;

  constructor({ items }: { items: any[] }) {
    this.items = items;
    this.selectedIndex = 0;
    this.element = document.createElement('div');
    this.element.className = 'mention-suggestions';
    this.render();
  }

  updateProps({ items }: { items: any[] }) {
    this.items = items;
    this.selectedIndex = 0;
    this.render();
  }

  onKeyDown({ event }: { event: KeyboardEvent }) {
    if (event.key === 'ArrowDown') {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      this.render();
      return true;
    }

    if (event.key === 'ArrowUp') {
      this.selectedIndex = (this.selectedIndex + this.items.length - 1) % this.items.length;
      this.render();
      return true;
    }

    if (event.key === 'Enter') {
      this.selectItem(this.selectedIndex);
      return true;
    }

    return false;
  }

  selectItem(index: number) {
    const item = this.items[index];
    if (item) {
      // This would be handled by the mention extension
    }
  }

  render() {
    if (this.items.length === 0) {
      this.element.innerHTML = '<div class="mention-suggestion">No users found</div>';
      return;
    }

    this.element.innerHTML = this.items
      .map((item, index) => `
        <div class="mention-suggestion ${index === this.selectedIndex ? 'selected' : ''}" 
             data-index="${index}">
          <div class="mention-user">
            <strong>${item.name}</strong>
            <div class="mention-email">${item.email}</div>
          </div>
        </div>
      `)
      .join('');

    // Add click handlers
    this.element.querySelectorAll('.mention-suggestion').forEach((element, index) => {
      element.addEventListener('click', () => this.selectItem(index));
    });
  }

  destroy() {
    // Cleanup
  }
}

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