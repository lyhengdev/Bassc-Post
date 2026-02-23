import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useParams, Link } from 'react-router-dom';
import { useAuthStore, useThemeStore } from './stores/authStore';
import useNotificationStore from './stores/notificationStore';
import { PublicLayout, DashboardLayout } from './components/layout/index.jsx';
import { 
  ContentLoader, 
  ErrorBoundary, 
  PageErrorFallback, 
  TopLoadingBar, 
  LazyLoadFallback 
} from './components/common/index.jsx';

const HomePage = lazy(() => import('./pages/public/home.jsx').then((m) => ({ default: m.HomePage })));
const ArticlesPage = lazy(() => import('./pages/public/articles.jsx').then((m) => ({ default: m.ArticlesPage })));
const ArticlePage = lazy(() => import('./pages/public/article-detail.jsx').then((m) => ({ default: m.ArticlePage })));
const CategoryPage = lazy(() => import('./pages/public/articles.jsx').then((m) => ({ default: m.CategoryPage })));
const CategoriesListPage = lazy(() => import('./pages/public/articles.jsx').then((m) => ({ default: m.CategoriesListPage })));
const LoginPage = lazy(() => import('./pages/public/auth.jsx').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/public/auth.jsx').then((m) => ({ default: m.RegisterPage })));
const SocialAuthCallbackPage = lazy(() => import('./pages/public/auth.jsx').then((m) => ({ default: m.SocialAuthCallbackPage })));
const CompleteProfilePage = lazy(() => import('./pages/public/auth.jsx').then((m) => ({ default: m.CompleteProfilePage })));
const ContactPage = lazy(() => import('./pages/public/misc.jsx').then((m) => ({ default: m.ContactPage })));
const AboutPage = lazy(() => import('./pages/public/misc.jsx').then((m) => ({ default: m.AboutPage })));
const AccountPage = lazy(() => import('./pages/public/auth.jsx').then((m) => ({ default: m.AccountPage })));
const PreviewPage = lazy(() => import('./pages/public/misc.jsx').then((m) => ({ default: m.PreviewPage })));
const PreviewByIdPage = lazy(() => import('./pages/public/misc.jsx').then((m) => ({ default: m.PreviewByIdPage })));
const VerifyEmailPage = lazy(() => import('./pages/public/auth.jsx').then((m) => ({ default: m.VerifyEmailPage })));
const NewsletterConfirmPage = lazy(() => import('./pages/public/auth.jsx').then((m) => ({ default: m.NewsletterConfirmPage })));
const NewsletterUnsubscribePage = lazy(() => import('./pages/public/auth.jsx').then((m) => ({ default: m.NewsletterUnsubscribePage })));
const ForgotPasswordPage = lazy(() => import('./pages/public/auth.jsx').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/public/auth.jsx').then((m) => ({ default: m.ResetPasswordPage })));

const DashboardHome = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.DashboardHome })));
const MyArticlesPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.MyArticlesPage })));
const PendingArticlesPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.PendingArticlesPage })));
const ProfilePage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.ProfilePage })));
const ArticleEditorPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.ArticleEditorPage })));
const DashboardCategoriesPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.CategoriesPage })));
const MediaPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.MediaPage })));
const UsersPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.UsersPage })));
const MessagesPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.MessagesPage })));
const AnalyticsPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.AnalyticsPage })));
const AIAssistantPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.AIAssistantPage })));
const SiteSettingsPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.SiteSettingsPage })));
const HomepageBuilderPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.HomepageBuilderPage })));
const CommentsPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.CommentsPage })));
const NewsletterPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.NewsletterPage })));
const NotificationsPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.NotificationsPage })));
const AdsControlPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.AdsControlPage })));
const AdInsightsPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.AdInsightsPage })));
const ArticleInsightsPage = lazy(() => import('./pages/dashboard/index.jsx').then((m) => ({ default: m.ArticleInsightsPage })));

// NEW: Collection-based Ads System
const AdCollectionsPage = lazy(() => import('./pages/dashboard/ad-collections/AdCollectionsPage.jsx'));
const CreateCollectionWizard = lazy(() => import('./pages/dashboard/ad-collections/CreateCollectionWizard.jsx'));
const AdFormPage = lazy(() => import('./pages/dashboard/AdFormPage.jsx'));

function getPostLoginPath(user) {
  if (!user) return '/';
  if (user.profileCompletionRequired) return '/complete-profile';
  if (user.role === 'user') return '/';
  return '/dashboard';
}

// Protected Route Component - for writer/editor/admin
function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.profileCompletionRequired) {
    return <Navigate to="/complete-profile" replace />;
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

function AccountRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.profileCompletionRequired) {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
}

// Guest Route (redirect if already logged in)
function GuestRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }
  
  return children;
}

function CompleteProfileRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user?.profileCompletionRequired) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }

  return children;
}

// Fallback route for hosts that don't proxy /share/* to backend share pages
function ShareRedirectRoute() {
  const { slug = '' } = useParams();
  const safeSlug = (() => {
    try {
      return decodeURIComponent(slug);
    } catch {
      return slug;
    }
  })();

  return <Navigate to={`/article/${safeSlug}`} replace />;
}

// 404 Page
function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-dark-300 mb-4">404</h1>
        <p className="text-dark-500 mb-6">Page not found</p>
        <Link to="/" className="btn btn-primary">
          Go Home
        </Link>
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
      {/* Top loading bar for page transitions */}
      <TopLoadingBar />
      
      <Suspense fallback={<LazyLoadFallback />}>
        <Routes>
          {/* Public Routes with Header/Footer */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/article/:slug" element={<ArticlePage />} />
            <Route path="/share/:slug" element={<ShareRedirectRoute />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/categories" element={<CategoriesListPage />} />
            <Route path="/newsletter/confirm" element={<NewsletterConfirmPage />} />
            <Route path="/newsletter/unsubscribe" element={<NewsletterUnsubscribePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route
              path="/account"
              element={
                <AccountRoute>
                  <AccountPage />
                </AccountRoute>
              }
            />
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
          <Route
            path="/auth/social/callback"
            element={
              <GuestRoute>
                <SocialAuthCallbackPage />
              </GuestRoute>
            }
          />
          <Route
            path="/complete-profile"
            element={
              <CompleteProfileRoute>
                <CompleteProfilePage />
              </CompleteProfileRoute>
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
            <Route path="articles/:id/insights" element={<ArticleInsightsPage />} />
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
              path="ads"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdsControlPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="ads/:id/insights"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdInsightsPage />
                </ProtectedRoute>
              }
            />
            
            {/* NEW: Collection-based Ads System */}
            <Route
              path="ad-collections"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdCollectionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="ad-collections/new"
              element={
                <ProtectedRoute roles={['admin']}>
                  <CreateCollectionWizard />
                </ProtectedRoute>
              }
            />
            <Route
              path="ad-collections/:collectionId"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdsControlPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="ad-collections/:collectionId/edit"
              element={
                <ProtectedRoute roles={['admin']}>
                  <CreateCollectionWizard />
                </ProtectedRoute>
              }
            />
            <Route
              path="ad-collections/:collectionId/ads/new"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="ad-collections/:collectionId/ads/:adId/edit"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdFormPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Preview Route (no layout, for article preview) */}
          <Route path="/preview" element={<PreviewPage />} />
          <Route
            path="/preview/:id"
            element={
              <ProtectedRoute roles={['admin', 'editor', 'writer']}>
                <PreviewByIdPage />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
