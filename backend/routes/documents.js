import express from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Validation schemas
const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string(),
  isPublic: z.boolean().default(false)
});

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  isPublic: z.boolean().optional()
});

// Get all documents (user's documents + shared documents)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select(`
        *,
        author:users!documents_author_id_fkey(id, first_name, last_name, email),
        document_shares!inner(permission)
      `)
      .or(`author_id.eq.${req.user.id},document_shares.user_id.eq.${req.user.id}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get single document
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // First, get the document
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select(`
        *,
        author:users!documents_author_id_fkey(id, first_name, last_name, email)
      `)
      .eq('id', id)
      .single();

    if (error || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    if (document.is_public) {
      // Public document - anyone can view
      return res.json(document);
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is author or has been shared access
    if (document.author_id === req.user.id) {
      return res.json(document);
    }

    const { data: share } = await supabaseAdmin
      .from('document_shares')
      .select('permission')
      .eq('document_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!share) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ ...document, userPermission: share.permission });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Create document
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content, isPublic } = createDocumentSchema.parse(req.body);

    const documentId = uuidv4();
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .insert({
        id: documentId,
        title,
        content,
        is_public: isPublic,
        author_id: req.user.id
      })
      .select(`
        *,
        author:users!documents_author_id_fkey(id, first_name, last_name, email)
      `)
      .single();

    if (error) throw error;

    // Create initial version
    await supabaseAdmin
      .from('document_versions')
      .insert({
        document_id: documentId,
        content,
        title,
        version_number: 1,
        created_by: req.user.id,
        change_summary: 'Initial version'
      });

    res.status(201).json(document);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update document
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = updateDocumentSchema.parse(req.body);

    // Check if user has edit permission
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('author_id, title, content, version')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    let hasEditPermission = document.author_id === req.user.id;

    if (!hasEditPermission) {
      const { data: share } = await supabaseAdmin
        .from('document_shares')
        .select('permission')
        .eq('document_id', id)
        .eq('user_id', req.user.id)
        .single();

      hasEditPermission = share && share.permission === 'edit';
    }

    if (!hasEditPermission) {
      return res.status(403).json({ error: 'Edit permission required' });
    }

    // Update document
    const { data: updatedDocument, error } = await supabaseAdmin
      .from('documents')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        version: document.version + 1
      })
      .eq('id', id)
      .select(`
        *,
        author:users!documents_author_id_fkey(id, first_name, last_name, email)
      `)
      .single();

    if (error) throw error;

    // Create version if content changed
    if (updates.content && updates.content !== document.content) {
      await supabaseAdmin
        .from('document_versions')
        .insert({
          document_id: id,
          content: updates.content,
          title: updates.title || document.title,
          version_number: document.version + 1,
          created_by: req.user.id,
          change_summary: 'Content updated'
        });
    }

    res.json(updatedDocument);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is the author
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('author_id')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the author can delete this document' });
    }

    // Delete document (cascade will handle shares and versions)
    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Share document
router.post('/:id/share', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail, permission } = req.body;

    if (!userEmail || !['view', 'edit'].includes(permission)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // Check if user is the author
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('author_id')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the author can share this document' });
    }

    // Find user to share with
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('email', userEmail)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create or update share
    const { data: share, error: shareError } = await supabaseAdmin
      .from('document_shares')
      .upsert({
        document_id: id,
        user_id: targetUser.id,
        permission,
        shared_by: req.user.id
      })
      .select('*')
      .single();

    if (shareError) throw shareError;

    res.json({
      share,
      user: {
        id: targetUser.id,
        name: `${targetUser.first_name} ${targetUser.last_name}`,
        email: targetUser.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to share document' });
  }
});

// Get document shares
router.get('/:id/shares', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is the author
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('author_id')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the author can view shares' });
    }

    const { data: shares, error } = await supabaseAdmin
      .from('document_shares')
      .select(`
        *,
        user:users!document_shares_user_id_fkey(id, first_name, last_name, email),
        shared_by_user:users!document_shares_shared_by_fkey(id, first_name, last_name, email)
      `)
      .eq('document_id', id);

    if (error) throw error;

    res.json(shares);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shares' });
  }
});

// Remove document share
router.delete('/:id/shares/:userId', authenticateToken, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check if user is the author
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('author_id')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the author can remove shares' });
    }

    const { error } = await supabaseAdmin
      .from('document_shares')
      .delete()
      .eq('document_id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ message: 'Share removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove share' });
  }
});

// Get document versions
router.get('/:id/versions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has access to the document
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('author_id, is_public')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    let hasAccess = document.is_public || document.author_id === req.user.id;

    if (!hasAccess) {
      const { data: share } = await supabaseAdmin
        .from('document_shares')
        .select('permission')
        .eq('document_id', id)
        .eq('user_id', req.user.id)
        .single();

      hasAccess = !!share;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: versions, error } = await supabaseAdmin
      .from('document_versions')
      .select(`
        *,
        created_by_user:users!document_versions_created_by_fkey(id, first_name, last_name, email)
      `)
      .eq('document_id', id)
      .order('version_number', { ascending: false });

    if (error) throw error;

    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

export default router;