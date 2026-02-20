// ==================== LOADING STATES - BEFORE & AFTER EXAMPLES ====================
// This file shows real examples of how to improve your loading states

// ==================== EXAMPLE 1: News List Page ====================

// ❌ BEFORE - Generic loading
function ArticlesPageOld() {
  const { data, isLoading } = useArticles();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {data.articles.map(article => (
        <ArticleCard key={article.id} {...article} />
      ))}
    </div>
  );
}

// ✅ AFTER - Skeleton loading
import { ArticleGridSkeleton } from '@/components/common';

function ArticlesPageNew() {
  const { data, isLoading } = useArticles();

  if (isLoading) {
    return <ArticleGridSkeleton count={6} />;
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {data.articles.map(article => (
        <ArticleCard key={article.id} {...article} />
      ))}
    </div>
  );
}

// ==================== EXAMPLE 2: Form Submission ====================

// ❌ BEFORE - Button doesn't show loading
function ArticleFormOld() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (data) => {
    setIsSaving(true);
    await api.post('/articles', data);
    setIsSaving(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" />
      <textarea name="content" />
      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save News'}
      </button>
    </form>
  );
}

// ✅ AFTER - Better loading state
import { Button } from '@/components/common';

function ArticleFormNew() {
  const { mutate, isPending } = useSaveArticle();

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      mutate(new FormData(e.target));
    }}>
      <input name="title" />
      <textarea name="content" />
      <Button type="submit" isLoading={isPending}>
        Save News
      </Button>
    </form>
  );
}

// ==================== EXAMPLE 3: Delete Action ====================

// ❌ BEFORE - No feedback during deletion
function DeleteButtonOld({ articleId }) {
  const handleDelete = async () => {
    await api.delete(`/articles/${articleId}`);
  };

  return (
    <button onClick={handleDelete} className="btn-danger">
      Delete
    </button>
  );
}

// ✅ AFTER - Clear overlay during deletion
import { OverlayLoader } from '@/components/common';

function DeleteButtonNew({ articleId }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/articles/${articleId}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button onClick={handleDelete} className="btn-danger">
        Delete
      </button>
      <OverlayLoader 
        isLoading={isDeleting}
        message="Deleting news..."
      />
    </>
  );
}

// ==================== EXAMPLE 4: File Upload ====================

// ❌ BEFORE - No progress indication
function MediaUploadOld() {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file) => {
    setIsUploading(true);
    await api.post('/media', file);
    setIsUploading(false);
  };

  return (
    <div>
      <input type="file" onChange={e => handleUpload(e.target.files[0])} />
      {isUploading && <span>Uploading...</span>}
    </div>
  );
}

// ✅ AFTER - Progress bar shows upload status
import { Button, ProgressBar } from '@/components/common';

function MediaUploadNew() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const isUploading = uploadProgress > 0 && uploadProgress < 100;

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    await api.post('/media', formData, {
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(progress);
      }
    });

    setTimeout(() => setUploadProgress(0), 1000);
  };

  return (
    <div className="space-y-3">
      <input 
        type="file" 
        onChange={e => handleUpload(e.target.files[0])}
        disabled={isUploading}
      />
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <ProgressBar progress={uploadProgress} />
        </div>
      )}
    </div>
  );
}

// ==================== EXAMPLE 5: Dashboard Cards ====================

// ❌ BEFORE - Generic loading
function DashboardOld() {
  const { data, isLoading } = useDashboard();

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <StatsCard title="Views" value={data.views} />
      <StatsCard title="News" value={data.articles} />
      <StatsCard title="Users" value={data.users} />
    </div>
  );
}

// ✅ AFTER - Skeleton cards
import { Skeleton } from '@/components/common';

function DashboardNew() {
  const { data, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-6 space-y-3">
            <Skeleton variant="text" className="w-20" />
            <Skeleton variant="title" className="w-32" />
            <Skeleton variant="text" className="w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <StatsCard title="Views" value={data.views} />
      <StatsCard title="News" value={data.articles} />
      <StatsCard title="Users" value={data.users} />
    </div>
  );
}

// ==================== EXAMPLE 6: Refresh Button ====================

// ❌ BEFORE - No visual feedback
function RefreshButtonOld({ onRefresh }) {
  return (
    <button onClick={onRefresh}>
      <RefreshIcon className="w-5 h-5" />
      Refresh
    </button>
  );
}

// ✅ AFTER - Spinning icon during refresh
import { RefreshIndicator } from '@/components/common';

function RefreshButtonNew({ onRefresh }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  return (
    <button onClick={handleRefresh} disabled={isRefreshing}>
      <RefreshIndicator isRefreshing={isRefreshing} />
      Refresh
    </button>
  );
}

// ==================== EXAMPLE 7: Data Table ====================

// ❌ BEFORE - Empty table during load
function UsersTableOld() {
  const { data, isLoading } = useUsers();

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <tr><td colSpan="4">Loading...</td></tr>
        ) : (
          data.users.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.status}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

// ✅ AFTER - Skeleton rows
import { TableLoader } from '@/components/common';

function UsersTableNew() {
  const { data, isLoading } = useUsers();

  if (isLoading) {
    return <TableLoader rows={10} columns={4} />;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {data.users.map(user => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>{user.role}</td>
            <td>{user.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ==================== EXAMPLE 8: Inline Saving ====================

// ❌ BEFORE - No feedback
function InlineEditOld({ value, onSave }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      {isEditing ? (
        <input 
          defaultValue={value}
          onBlur={e => {
            onSave(e.target.value);
            setIsEditing(false);
          }}
        />
      ) : (
        <span onClick={() => setIsEditing(true)}>{value}</span>
      )}
    </div>
  );
}

// ✅ AFTER - Shows saving state
import { InlineLoader } from '@/components/common';

function InlineEditNew({ value, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (newValue) => {
    setIsSaving(true);
    await onSave(newValue);
    setIsSaving(false);
    setIsEditing(false);
  };

  if (isSaving) {
    return <InlineLoader text="Saving..." />;
  }

  return (
    <div>
      {isEditing ? (
        <input 
          defaultValue={value}
          onBlur={e => handleSave(e.target.value)}
          autoFocus
        />
      ) : (
        <span onClick={() => setIsEditing(true)}>{value}</span>
      )}
    </div>
  );
}

// ==================== EXAMPLE 9: Progressive Loading ====================

// ❌ BEFORE - Shows loading immediately (flashes for fast loads)
function ArticleDetailOld() {
  const { data, isLoading } = useArticle(id);

  return (
    <>
      {isLoading && <div>Loading article...</div>}
      {data && <ArticleContent article={data} />}
    </>
  );
}

// ✅ AFTER - Progressive loading (no flash for fast loads)
import { ProgressiveLoader } from '@/components/common';

function ArticleDetailNew() {
  const { data, isLoading } = useArticle(id);

  return (
    <>
      <ProgressiveLoader 
        isLoading={isLoading}
        delay={300}        // Only show after 300ms
        slowDelay={3000}   // Show "taking longer" message after 3s
      />
      {data && <ArticleContent article={data} />}
    </>
  );
}

// ==================== EXAMPLE 10: Infinite Scroll ====================

// ❌ BEFORE - No loading indicator
function InfiniteArticlesOld() {
  const { data, fetchNextPage } = useInfiniteArticles();

  return (
    <div>
      {data.pages.map(page => 
        page.articles.map(article => (
          <ArticleCard key={article.id} {...article} />
        ))
      )}
      <button onClick={fetchNextPage}>Load More</button>
    </div>
  );
}

// ✅ AFTER - Loading indicator for next page
import { InlineLoader } from '@/components/common';

function InfiniteArticlesNew() {
  const { data, fetchNextPage, isFetchingNextPage } = useInfiniteArticles();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        {data.pages.map(page => 
          page.articles.map(article => (
            <ArticleCard key={article.id} {...article} />
          ))
        )}
      </div>

      {isFetchingNextPage ? (
        <div className="flex justify-center py-8">
          <InlineLoader text="Loading more news..." />
        </div>
      ) : (
        <button onClick={fetchNextPage} className="btn-primary mx-auto">
          Load More
        </button>
      )}
    </div>
  );
}

// ==================== SUMMARY ====================
/*
KEY IMPROVEMENTS:

1. ✅ Skeleton > Spinner
   - Shows expected layout
   - Better perceived performance

2. ✅ Progress Bars
   - Shows actual progress
   - Users know how long

3. ✅ Overlay for Blocking Actions
   - Prevents accidental clicks
   - Clear feedback

4. ✅ Progressive Loading
   - No flashing for fast loads
   - Smooth UX

5. ✅ Inline Indicators
   - Small, contextual
   - Doesn't block interface

6. ✅ Refresh Feedback
   - Visual confirmation
   - Better UX

7. ✅ Table Skeletons
   - Maintains layout
   - Professional look

8. ✅ Save States
   - Clear feedback
   - Prevents double-save

9. ✅ Smart Delays
   - 300ms threshold
   - No unnecessary loading

10. ✅ Infinite Scroll
    - Clear loading state
    - Smooth pagination
*/

export {
  ArticlesPageNew,
  ArticleFormNew,
  DeleteButtonNew,
  MediaUploadNew,
  DashboardNew,
  RefreshButtonNew,
  UsersTableNew,
  InlineEditNew,
  ArticleDetailNew,
  InfiniteArticlesNew,
};
