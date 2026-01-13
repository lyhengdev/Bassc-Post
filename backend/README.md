# Bassac Media Center - Backend API

A production-ready Node.js + Express + MongoDB backend for the Bassac Media Center digital publishing platform.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication with access & refresh tokens
  - Role-based access control (Admin, Editor, Writer, User)
  - Email verification & password reset
  
- **Article Management**
  - Editor.js block-style content storage
  - Draft → Pending → Published workflow
  - Featured & breaking news support
  - Full-text search
  - View counting & analytics

- **AI Integration (OpenAI)**
  - Grammar checking
  - Headline generation
  - Content summarization
  - Sentiment analysis
  - Writing improvement

- **File Storage**
  - Cloud-ready architecture (local → S3/Cloudinary)
  - Automatic image thumbnails
  - Image optimization with Sharp

- **Security**
  - Helmet.js security headers
  - Rate limiting
  - XSS protection
  - Input validation & sanitization
  - CORS configuration

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── server.js      # Main config
│   │   └── database.js   # MongoDB connection
│   ├── controllers/      # Route handlers
│   ├── middleware/       # Express middleware
│   ├── models/           # Mongoose models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utilities
│   ├── validators/       # Input validation
│   └── server.js          # Entry point
├── uploads/              # Local file storage
├── .env.example          # Environment template
├── package.json
└── README.md
```

## 🛠️ Installation

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 6.0
- npm or yarn

### Setup

1. **Clone and install dependencies:**

```bash
cd backend
npm install
```

2. **Configure environment:**

```bash
cp .env .env
# Edit .env with your settings
```

3. **Start MongoDB:**

```bash
# If using local MongoDB
mongod
```

4. **Seed the database:**

```bash
npm run seed
```

5. **Start development server:**

```bash
npm run dev
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/bassac_media_center` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | Access token expiry | `7d` |
| `OPENAI_API_KEY` | OpenAI API key | Optional |
| `SMTP_HOST` | Email server host | Optional |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register       # Register new user
POST   /api/auth/login          # Login
POST   /api/auth/logout         # Logout
POST   /api/auth/refresh        # Refresh token
GET    /api/auth/me             # Get current user
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/verify-email
```

### Articles
```
GET    /api/articles            # List published articles
GET    /api/articles/featured   # Get featured articles
GET    /api/articles/latest     # Get latest articles
GET    /api/articles/search     # Search articles
GET    /api/articles/slug/:slug # Get by slug
GET    /api/articles/my         # Writer's articles
POST   /api/articles            # Create article (Writer)
PUT    /api/articles/:id        # Update article
DELETE /api/articles/:id        # Delete article
GET    /api/articles/pending    # Pending review (Editor)
PUT    /api/articles/:id/approve
PUT    /api/articles/:id/reject
POST   /api/articles/:id/view   # Record view
```

### Categories
```
GET    /api/categories          # List categories
GET    /api/categories/:slug    # Get by slug
POST   /api/categories          # Create (Admin)
PUT    /api/categories/:id      # Update (Admin)
DELETE /api/categories/:id      # Delete (Admin)
```

### Users
```
GET    /api/users               # List users (Admin)
GET    /api/users/:id           # Get user (Admin)
PUT    /api/users/:id           # Update user (Admin)
DELETE /api/users/:id           # Delete user (Admin)
PUT    /api/users/profile       # Update own profile
POST   /api/users/avatar        # Upload avatar
```

### Uploads
```
POST   /api/uploads             # Upload file
POST   /api/uploads/multiple    # Upload multiple
GET    /api/uploads             # List media
GET    /api/uploads/:id         # Get media
DELETE /api/uploads/:id         # Delete media
```

### AI
```
POST   /api/ai/grammar-check
POST   /api/ai/headline-generator
POST   /api/ai/summary
POST   /api/ai/sentiment-analysis
POST   /api/ai/improve-writing
```

### Analytics
```
GET    /api/dashboard/summary   # Dashboard data
GET    /api/analytics/views     # View analytics (Admin)
GET    /api/analytics/articles  # Article stats (Admin)
GET    /api/analytics/users     # User stats (Admin)
```

### Contact
```
POST   /api/contact             # Submit contact form
GET    /api/contact             # List messages (Admin)
POST   /api/contact/:id/reply   # Reply (Admin)
```

## 👥 Default Users (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@bassacmedia.com | Admin@123 |
| Editor | editor@bassacmedia.com | Editor@123 |
| Writer | writer@bassacmedia.com | Writer@123 |

## 🗃️ Database Models

### User
- Authentication & profile data
- Role-based permissions
- Email verification status

### Article
- Editor.js block content
- Status workflow (draft/pending/published/rejected)
- SEO metadata
- View tracking

### Category
- Hierarchical structure
- Article count caching
- Custom colors for UI

### Media
- File metadata
- Cloud-ready storage keys
- Thumbnail URLs

## 🔒 Security Features

1. **Password Security**
   - bcrypt hashing (12 rounds)
   - Minimum 8 characters with complexity requirements

2. **Rate Limiting**
   - General API: 100 requests/15 min
   - Auth: 10 requests/15 min
   - AI: 10 requests/min

3. **Input Validation**
   - express-validator for all inputs
   - XSS sanitization
   - MongoDB injection prevention

## 📦 Scripts

```bash
npm start       # Production server
npm run dev     # Development with nodemon
npm run seed    # Seed database
npm test        # Run tests
```

## 🚢 Deployment

1. Set `NODE_ENV=production`
2. Configure production MongoDB URI
3. Set secure JWT secrets
4. Configure email service
5. Set up cloud storage (S3/Cloudinary)
6. Use process manager (PM2)

```bash
# Example PM2 deployment
pm2 start src/server.js --name bassac-api
```

## 📄 License

MIT License - Bassac Media Center
