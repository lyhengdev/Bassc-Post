# Bassac Media Center - Frontend

React + Vite + Tailwind CSS frontend for Bassac Media Center.

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **React Router v6** - Routing
- **Axios** - HTTP client
- **Lucide React** - Icons
- **React Hot Toast** - Notifications

## Features

- 🏠 **Public Pages**: Home, Articles, Article Detail, Categories, Contact, About
- 🔐 **Authentication**: Login, Register with JWT
- 📊 **Dashboard**: Role-based dashboards (Admin/Editor/Writer)
- ✍️ **Article Management**: Create, Edit, Delete articles
- 📝 **Review System**: Editors can approve/reject pending articles
- 🌙 **Dark Mode**: Theme toggle support
- 📱 **Responsive**: Mobile-first design

## Project Structure

```
src/
├── components/
│   ├── common/       # Button, Input, Avatar, Badge, Modal, Loading
│   ├── layout/       # Header, Footer, Sidebar, Layouts
│   └── article/      # ArticleCard, FeaturedArticle, ArticleContent
├── pages/
│   ├── public/       # HomePage, ArticlesPage, LoginPage, etc.
│   └── dashboard/    # DashboardHome, MyArticles, Profile, etc.
├── hooks/            # useApi.js - React Query hooks
├── services/         # api.js - Axios API service
├── stores/           # authStore.js - Zustand stores
├── utils/            # Utility functions
├── App.jsx           # Main app with routing
├── main.jsx          # Entry point
└── index.css         # Tailwind + custom styles
```

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create `.env` file (optional, defaults work for development):

```env
VITE_API_URL=/api
```

## Routes

### Public
| Route | Description |
|-------|-------------|
| `/` | Home page with featured articles |
| `/articles` | Articles listing with search/filters |
| `/article/:slug` | Article detail page |
| `/category/:slug` | Articles by category |
| `/about` | About page |
| `/contact` | Contact form |
| `/login` | Login page |
| `/register` | Registration page |

### Dashboard (Protected)
| Route | Roles | Description |
|-------|-------|-------------|
| `/dashboard` | All | Dashboard home |
| `/dashboard/articles` | Writer+ | My articles |
| `/dashboard/articles/new` | Writer+ | Create article |
| `/dashboard/pending` | Editor+ | Pending review |
| `/dashboard/categories` | Admin | Category management |
| `/dashboard/users` | Admin | User management |
| `/dashboard/profile` | All | User profile |

## Demo Accounts

After running backend seed:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@bassacmedia.com | Admin@123 |
| Editor | editor@bassacmedia.com | Editor@123 |
| Writer | writer@bassacmedia.com | Writer@123 |

## Development

The frontend proxies `/api` requests to `http://localhost:8888` in development.

Make sure the backend is running on port 8888.

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
```

Output will be in the `dist` folder.
