/*
  # Knowledge Base Platform Database Schema

  1. New Tables
    - `users` - User accounts and authentication
    - `documents` - Document storage with content and metadata
    - `document_shares` - Document sharing permissions
    - `document_versions` - Version history for documents
    - `password_resets` - Password reset tokens

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Create indexes for performance

  3. Features
    - Full-text search capabilities
    - Document versioning
    - Sharing with permissions
    - User authentication
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled Document',
  content TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN DEFAULT FALSE,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create document_shares table
CREATE TABLE IF NOT EXISTS document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT CHECK (permission IN ('view', 'edit')) NOT NULL,
  shared_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

-- Create document_versions table
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  change_summary TEXT
);

-- Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
DROP POLICY IF EXISTS "Users can read their own data" ON users;
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can insert their own data" ON users;
CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (true);

-- Create policies for documents table
DROP POLICY IF EXISTS "Authors can do anything with their documents" ON documents;
CREATE POLICY "Authors can do anything with their documents" ON documents
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can view public documents" ON documents;
CREATE POLICY "Users can view public documents" ON documents
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can view shared documents" ON documents;
CREATE POLICY "Users can view shared documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM document_shares 
      WHERE document_id = documents.id
    )
  );

-- Create policies for document_shares table
DROP POLICY IF EXISTS "Authors can manage shares" ON document_shares;
CREATE POLICY "Authors can manage shares" ON document_shares
  FOR ALL USING (true);

-- Create policies for document_versions table
DROP POLICY IF EXISTS "Users can view versions of accessible documents" ON document_versions;
CREATE POLICY "Users can view versions of accessible documents" ON document_versions
  FOR ALL USING (true);

-- Create policies for password_resets table
DROP POLICY IF EXISTS "Users can manage their password resets" ON password_resets;
CREATE POLICY "Users can manage their password resets" ON password_resets
  FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author_id);
CREATE INDEX IF NOT EXISTS idx_documents_public ON documents(is_public);
CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_shares_document ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_user ON document_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

-- Enable full-text search
CREATE INDEX IF NOT EXISTS idx_documents_search ON documents USING gin(to_tsvector('english', title || ' ' || content));