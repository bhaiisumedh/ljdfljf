import express from 'express';
import { supabaseAdmin } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Search documents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    // Search in documents user has access to
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select(`
        id, title, content, created_at, updated_at, is_public,
        author:users!documents_author_id_fkey(id, first_name, last_name, email),
        document_shares!left(permission)
      `)
      .or(`
        and(title.ilike.%${q}%,or(author_id.eq.${req.user.id},document_shares.user_id.eq.${req.user.id},is_public.eq.true)),
        and(content.ilike.%${q}%,or(author_id.eq.${req.user.id},document_shares.user_id.eq.${req.user.id},is_public.eq.true))
      `)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Remove duplicates and add search highlights
    const uniqueDocuments = documents.reduce((acc, doc) => {
      if (!acc.find(d => d.id === doc.id)) {
        // Add search highlights
        const titleMatch = doc.title.toLowerCase().includes(q.toLowerCase());
        const contentMatch = doc.content.toLowerCase().includes(q.toLowerCase());
        
        let snippet = '';
        if (contentMatch) {
          const index = doc.content.toLowerCase().indexOf(q.toLowerCase());
          const start = Math.max(0, index - 50);
          const end = Math.min(doc.content.length, index + q.length + 50);
          snippet = '...' + doc.content.substring(start, end) + '...';
        }

        acc.push({
          ...doc,
          titleMatch,
          contentMatch,
          snippet
        });
      }
      return acc;
    }, []);

    res.json(uniqueDocuments);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;