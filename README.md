# Knowledge Base Platform

A modern, collaborative knowledge base platform built with React, Node.js, and Supabase. Think Confluence but with a modern, intuitive interface and powerful collaboration features.

## ✨ Features

### Core Functionality
- **User Authentication**: Complete auth system with JWT tokens, email verification, and password reset
- **Rich Document Editor**: WYSIWYG editor with formatting, lists, quotes, and auto-save
- **Real-time Collaboration**: User mentions with automatic access sharing
- **Advanced Search**: Full-text search across all documents and content
- **Privacy Controls**: Public/private documents with granular sharing permissions
- **Version Control**: Complete change history with diff visualization

### User Experience
- **Modern UI/UX**: Clean, professional interface inspired by industry leaders
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Intuitive Navigation**: Sidebar navigation with contextual actions
- **Smart Notifications**: Toast notifications for all user actions
- **Auto-save**: Never lose your work with automatic document saving

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### 1. Clone and Install
```bash
git clone <repository-url>
cd knowledge-base-platform
npm run setup
```

### 2. Database Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. In your Supabase dashboard, go to SQL Editor
3. Run the following SQL to create the database schema:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN DEFAULT FALSE,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create document_shares table
CREATE TABLE document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT CHECK (permission IN ('view', 'edit')) NOT NULL,
  shared_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

-- Create document_versions table
CREATE TABLE document_versions (
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
CREATE TABLE password_resets (
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

-- Create policies
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Document policies
CREATE POLICY "Authors can do anything with their documents" ON documents
  FOR ALL USING (author_id::text = auth.uid()::text);

CREATE POLICY "Users can view public documents" ON documents
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view shared documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM document_shares 
      WHERE document_id = documents.id 
      AND user_id::text = auth.uid()::text
    )
  );

-- Share policies
CREATE POLICY "Authors can manage shares" ON document_shares
  FOR ALL USING (
    shared_by::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM documents 
      WHERE id = document_shares.document_id 
      AND author_id::text = auth.uid()::text
    )
  );

-- Version policies
CREATE POLICY "Users can view versions of accessible documents" ON document_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE id = document_versions.document_id 
      AND (
        author_id::text = auth.uid()::text OR
        is_public = true OR
        EXISTS (
          SELECT 1 FROM document_shares 
          WHERE document_id = documents.id 
          AND user_id::text = auth.uid()::text
        )
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_documents_author ON documents(author_id);
CREATE INDEX idx_documents_public ON documents(is_public);
CREATE INDEX idx_documents_updated ON documents(updated_at DESC);
CREATE INDEX idx_document_shares_document ON document_shares(document_id);
CREATE INDEX idx_document_shares_user ON document_shares(user_id);
CREATE INDEX idx_document_versions_document ON document_versions(document_id);
CREATE INDEX idx_password_resets_user ON password_resets(user_id);
CREATE INDEX idx_password_resets_token ON password_resets(token);

-- Enable full-text search
CREATE INDEX idx_documents_search ON documents USING gin(to_tsvector('english', title || ' ' || content));
```

### 3. Environment Configuration
```bash
# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Edit .env with your Supabase credentials
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Edit backend/.env with your configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secure-jwt-secret
```

### 4. Start Development
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **State Management**: Zustand for global state
- **Routing**: React Router for navigation
- **UI Components**: Custom components with Tailwind CSS
- **Editor**: TipTap for rich text editing
- **API Client**: Custom hook-based API client

### Backend (Node.js + Express)
- **Authentication**: JWT-based with bcrypt password hashing
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **API Design**: RESTful endpoints with proper error handling
- **Security**: Helmet, CORS, rate limiting
- **Email**: Nodemailer for password resets

### Database Schema
- **users**: User accounts and profiles
- **documents**: Document content and metadata
- **document_shares**: Sharing permissions
- **document_versions**: Version history
- **password_resets**: Password reset tokens

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Document Endpoints
- `GET /api/documents` - List user's documents
- `POST /api/documents` - Create new document
- `GET /api/documents/:id` - Get document by ID
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/:id/share` - Share document
- `GET /api/documents/:id/shares` - Get document shares
- `DELETE /api/documents/:id/shares/:userId` - Remove share
- `GET /api/documents/:id/versions` - Get version history

### Search & Users
- `GET /api/search?q=query` - Search documents
- `GET /api/users/search?q=query` - Search users for mentions

## 🔒 Security Features

- **Authentication**: JWT tokens with secure password hashing
- **Authorization**: Row Level Security (RLS) in Supabase
- **Input Validation**: Zod schema validation
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Configured for secure cross-origin requests
- **Helmet**: Security headers for Express

## 🎨 Design System

### Colors
- **Primary**: Blue (#2563eb) - Main actions and links
- **Secondary**: Purple (#7c3aed) - Accent elements
- **Success**: Green (#059669) - Success states
- **Warning**: Orange (#ea580c) - Warning states
- **Error**: Red (#dc2626) - Error states
- **Neutral**: Gray scale for text and backgrounds

### Typography
- **Headings**: Inter font family, 600 weight
- **Body**: Inter font family, 400 weight
- **Code**: Courier New, monospace

### Spacing
- **Base unit**: 8px
- **Consistent spacing**: 4px, 8px, 12px, 16px, 24px, 32px, 48px

## 🚀 Deployment

### Frontend (Netlify/Vercel)
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting provider
3. Configure environment variables

### Backend (Railway/Heroku)
1. Set up your hosting provider
2. Configure environment variables
3. Deploy the `backend` folder

### Database
- Supabase handles hosting and scaling automatically
- Configure RLS policies for security
- Set up backups and monitoring

## 🧪 Testing

### Demo Accounts
Create test accounts with:
- Email: demo@example.com
- Password: demo123

### Test Scenarios
1. **User Registration**: Create new account
2. **Document Creation**: Create and edit documents
3. **Collaboration**: Share documents and mention users
4. **Search**: Test full-text search functionality
5. **Version Control**: Create versions and view history

## 📈 Performance Optimizations

- **Code Splitting**: React lazy loading for routes
- **Image Optimization**: Responsive images with proper sizing
- **Database Indexing**: Optimized queries with proper indexes
- **Caching**: Browser caching for static assets
- **Compression**: Gzip compression for API responses

## 🔧 Development Tools

- **TypeScript**: Full type safety
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks
- **Vite**: Fast development server and building

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

---

Built with ❤️ using modern web technologies for the ultimate knowledge sharing experience.