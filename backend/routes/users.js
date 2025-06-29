import express from 'express';
import { supabaseAdmin } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Search users for mentions
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
      .neq('id', req.user.id)
      .limit(10);

    if (error) throw error;

    res.json(users.map(user => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get user profile
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, created_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      createdAt: user.created_at
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;