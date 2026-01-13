import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, useThemeStore } from './stores/authStore';
import useNotificationStore from './stores/notificationStore';
import { PublicLayout, DashboardLayout } from './components/layout/index.jsx';
import { ErrorBoundary, PageErrorFallback } from './components/common/index.jsx';
import {
  HomePage,
  ArticlesPage,
  ArticlePage,
  CategoryPage,
  CategoriesListPage,
  LoginPage,
  RegisterPage,
  ContactPage,
  AboutPage,
  PreviewPage,
  VerifyEmailPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  DynamicPage,
} from './pages/public/index.jsx';
import {
  DashboardHome,
  MyArticlesPage,
  PendingArticlesPage,
  ProfilePage,
  ArticleEditorPage,
  CategoriesPage as DashboardCategoriesPage,
  MediaPage,
  UsersPage,
  MessagesPage,
  AnalyticsPage,
  AIAssistantPage,
  SiteSettingsPage,
  HomepageBuilderPage,
  PagesListPage,
  PageEditorPage,
  CommentsPage,
  NewsletterPage,
  NotificationsPage,
  AdsControlPage,
} from './pages/dashboard/index.jsx';

// Protected Route Component - for writer/editor/admin
function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Users with 'user' role should not access dashboard
  if (user?.role === 'user') {
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Guest Route (redirect if already logged in)
function GuestRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (isAuthenticated) {
    // Users go to homepage, staff goes to dashboard
    if (user?.role === 'user') {
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

// 404 Page
function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-dark-300 mb-4">404</h1>
        <p className="text-dark-500 mb-6">Page not found</p>
        <a href="/" className="btn btn-primary">
          Go Home
        </a>
      </div>
    </div>
  );
}

export default function App() {
  const { initTheme } = useThemeStore();
  const { isAuthenticated, accessToken } = useAuthStore();
  const { initSocket, disconnectSocket, requestBrowserPermission } = useNotificationStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Initialize Socket.io when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      initSocket(accessToken);
      requestBrowserPermission();
    } else {
      disconnectSocket();
    }
    return () => disconnectSocket();
  }, [isAuthenticated, accessToken, initSocket, disconnectSocket, requestBrowserPermission]);

  return (
    <ErrorBoundary FallbackComponent={PageErrorFallback}>
      <Routes>
        {/* Public Routes with Header/Footer */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/article/:slug" element={<ArticlePage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/categories" element={<CategoriesListPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/page/:slug" element={<DynamicPage />} />
        </Route>

        {/* Auth Routes (no layout) */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/forgot-password"
          element={
            <GuestRoute>
              <ForgotPasswordPage />
            </GuestRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <GuestRoute>
              <ResetPasswordPage />
            </GuestRoute>
          }
        />

        {/* Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="articles" element={<MyArticlesPage />} />
          <Route path="articles/new" element={<ArticleEditorPage />} />
          <Route path="articles/:id/edit" element={<ArticleEditorPage />} />
          <Route
            path="pending"
            element={
              <ProtectedRoute roles={['editor', 'admin']}>
                <PendingArticlesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="categories"
            element={
              <ProtectedRoute roles={['admin']}>
                <DashboardCategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route path="media" element={<MediaPage />} />
          <Route
            path="users"
            element={
              <ProtectedRoute roles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="messages"
            element={
              <ProtectedRoute roles={['admin']}>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="comments"
            element={
              <ProtectedRoute roles={['admin', 'editor']}>
                <CommentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="newsletter"
            element={
              <ProtectedRoute roles={['admin']}>
                <NewsletterPage />
              </ProtectedRoute>
            }
          />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route
            path="analytics"
            element={
              <ProtectedRoute roles={['admin']}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route path="ai" element={<AIAssistantPage />} />
          <Route path="profile" element={<ProfilePage />} />
          
          {/* New CMS Pages - Admin Only */}
          <Route
            path="settings"
            element={
              <ProtectedRoute roles={['admin']}>
                <SiteSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="homepage"
            element={
              <ProtectedRoute roles={['admin']}>
                <HomepageBuilderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="pages"
            element={
              <ProtectedRoute roles={['admin', 'editor']}>
                <PagesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="pages/new"
            element={
              <ProtectedRoute roles={['admin', 'editor']}>
                <PageEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="pages/:id/edit"
            element={
              <ProtectedRoute roles={['admin', 'editor']}>
                <PageEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="ads"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdsControlPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Preview Route (no layout, for article preview) */}
        <Route path="/preview" element={<PreviewPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
