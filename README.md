# 🎯 Bassac CMS - Professional Media Platform

Modern, production-ready Content Management System built with MERN stack.

## ✨ Features

- 📝 Article Management with Rich Text Editor
- 👥 Multi-role User System (Admin/Editor/Writer/User)
- 📁 Category Management with Translations
- 💬 Comment System
- 📊 Advanced Analytics Dashboard
- 🖼️ Media Library with Image Optimization
- 📧 Newsletter Management
- 🔔 Real-time Notifications (Socket.io)
- 📱 Fully Responsive Design
- 🌙 Dark Mode Support
- 🔍 SEO Optimized
- ⚡ High Performance (handles 500K+ articles)
- 🎨 Modern UI with Loading States
- 🔒 Secure (JWT, bcrypt, validation)

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+
- MongoDB 6+

### Installation

```bash
# Optional (from repo root): install both apps
npm run install

# 1. Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm run dev

# 2. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev

# 3. Open http://localhost:5173
```

### Cleanup (optional)

```bash
# Remove node_modules and frontend build output
npm run clean
```

### Minimum Configuration

**backend/.env:**
```env
MONGODB_URI=mongodb://localhost:27017/bassac-media
JWT_SECRET=your-secret-min-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-min-32-characters
FRONTEND_URL=http://localhost:5173
```

**frontend/.env:**
```env
VITE_API_URL=/api
# For split-domain hosting, use full URL, e.g. https://api.example.com/api
```

## 🎯 What Works Out of the Box

✅ **No Redis Required** - Uses in-memory cache  
✅ **No Email Setup Required** - Works without SMTP  
✅ **No Elasticsearch Required** - Basic search works  
✅ **No Cloud Storage Required** - Local uploads work

Just MongoDB + Node.js and you're ready!

## 📊 Tech Stack

**Backend:** Node.js, Express, MongoDB, Socket.io, JWT  
**Frontend:** React 18, Vite, TailwindCSS, React Query, Zustand

## 📝 Default Login

After seeding: admin@bassac.media / admin123  
⚠️ Change in production!

## 🛠️ Optional Enhancements

- **Redis** - For production caching (4x faster)
- **Elasticsearch** - For advanced search
- **Cloudinary** - For cloud storage
- **OpenAI** - For AI assistant
- **SMTP** - For emails

## 📚 Documentation

- Complete API documentation in `/backend/API.md`
- Frontend guide in `/frontend/README.md`
- See `.env.example` files for all options

## 🚀 Production Ready

- Strong JWT validation
- Input sanitization
- Rate limiting
- CORS configuration
- Error handling
- Security headers
- Connection pooling
- Optimized queries

## 🆘 Troubleshooting

**Redis warnings?** - Redis is optional, app works without it  
**MongoDB error?** - Run `mongod` to start MongoDB  
**Port in use?** - Change PORT in .env

## 📄 License

MIT License

---

**Production-ready CMS for modern media platforms** 🚀
