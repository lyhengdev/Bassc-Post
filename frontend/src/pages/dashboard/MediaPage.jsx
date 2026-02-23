import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Upload, Image as ImageIcon, Trash2, Search, Grid, List, ExternalLink } from 'lucide-react';
import { useMedia, useUploadMedia, useDeleteMedia } from '../../hooks/useApi';
import { Button, ContentLoader, EmptyState, Modal, ConfirmModal } from '../../components/common/index.jsx';
import { formatBytes, formatRelativeTime, buildMediaUrl } from '../../utils';
import toast from 'react-hot-toast';

export function MediaPage() {
  const { data, isLoading } = useMedia();
  const { mutate: uploadMedia, isPending: isUploading } = useUploadMedia();
  const { mutate: deleteMedia, isPending: isDeleting } = useDeleteMedia();

  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [failedImageIds, setFailedImageIds] = useState(() => new Set());

  const markImageFailed = (fileId) => {
    setFailedImageIds((prev) => {
      if (!fileId || prev.has(fileId)) return prev;
      const next = new Set(prev);
      next.add(fileId);
      return next;
    });
  };

  const canRenderImage = (file) => {
    const isImage = (file.mimeType || file.mimetype)?.startsWith('image/');
    return isImage && file.url && !failedImageIds.has(file._id);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('images', file);
    });

    uploadMedia(formData, {
      onSuccess: () => {
        setIsUploadModalOpen(false);
        setSelectedFiles([]);
        toast.success('Files uploaded successfully');
      },
      onError: () => {
        toast.error('Upload failed');
      }
    });
  };

  const handleDelete = () => {
    if (deleteModal) {
      deleteMedia(deleteModal.id, {
        onSuccess: () => {
          setDeleteModal(null);
          toast.success('File deleted');
        }
      });
    }
  };

  const getArticleLink = (file) => {
    const article = file.usedInArticles?.[0];
    return article?.slug ? `/article/${article.slug}` : null;
  };

  if (isLoading) return <ContentLoader />;

  const mediaFiles = data?.data || [];
  const filteredMedia = mediaFiles.filter(file => 
    file.originalName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet><title>Media Library - Bassac Post</title></Helmet>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Media Library</h1>
          <p className="text-dark-500">Manage your uploaded files</p>
        </div>
        <Button
          leftIcon={<Upload className="w-4 h-4" />}
          onClick={() => setIsUploadModalOpen(true)}
        >
          Upload Files
        </Button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${
              viewMode === 'grid'
                ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30'
                : 'bg-dark-100 text-dark-600 dark:bg-dark-800'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${
              viewMode === 'list'
                ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30'
                : 'bg-dark-100 text-dark-600 dark:bg-dark-800'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media Grid/List */}
      {filteredMedia.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredMedia.map((file) => {
              const articleLink = getArticleLink(file);
              const showImage = canRenderImage(file);
              return (
                <div key={file._id} className="card p-3 group relative">
                <div
                  className={`aspect-square bg-dark-100 dark:bg-dark-800 rounded-lg mb-2 overflow-hidden cursor-pointer ${articleLink ? '' : 'border border-red-300'}`}
                  style={articleLink ? undefined : { borderWidth: '2.5px' }}
                  onClick={() => setPreviewImage(file)}
                >
                  {showImage ? (
                    <img loading="lazy"
                      src={buildMediaUrl(file.url)}
                      alt={file.originalName}
                      className="w-full h-full object-cover"
                      onError={() => markImageFailed(file._id)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-dark-400" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-dark-900 dark:text-white truncate">
                  {file.originalName}
                </p>
                <p className="text-xs text-dark-500">{formatBytes(file.size)}</p>
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {articleLink ? (
                    <Link
                      to={articleLink}
                      className="px-2 py-1 text-xs font-medium bg-emerald-600 text-white rounded-lg inline-flex items-center gap-1"
                      title="Open news"
                    >
                      <ExternalLink className="w-3 h-3" />
                      News
                    </Link>
                  ) : (
                    <span
                      className="px-2 py-1 text-xs font-medium bg-dark-200 text-dark-500 rounded-lg inline-flex items-center gap-1 cursor-not-allowed"
                      title="No news linked"
                    >
                      <ExternalLink className="w-3 h-3" />
                      News
                    </span>
                  )}
                  <button
                    onClick={() => setDeleteModal({ id: file._id, name: file.originalName })}
                    className="inline-flex items-center justify-center p-1.5 bg-red-500 text-white rounded-lg"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-50 dark:bg-dark-800">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Preview</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Name</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Size</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Type</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Uploaded</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {filteredMedia.map((file) => {
                    const articleLink = getArticleLink(file);
                    const showImage = canRenderImage(file);
                    return (
                      <tr key={file._id} className="hover:bg-dark-50 dark:hover:bg-dark-800/50">
                      <td className="px-6 py-4">
                        <div
                          className={`w-12 h-12 bg-dark-100 dark:bg-dark-800 rounded-lg overflow-hidden ${articleLink ? '' : 'border border-red-300'}`}
                          style={articleLink ? undefined : { borderWidth: '2.5px' }}
                        >
                          {showImage ? (
                            <img
                              loading="lazy"
                              src={buildMediaUrl(file.url)}
                              alt={file.originalName}
                              className="w-full h-full object-cover"
                              onError={() => markImageFailed(file._id)}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-dark-400" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-dark-900 dark:text-white truncate max-w-xs">
                          {file.originalName}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-dark-500">{formatBytes(file.size)}</td>
                      <td className="px-6 py-4 text-dark-500">{file.mimeType || file.mimetype}</td>
                      <td className="px-6 py-4 text-dark-500">{formatRelativeTime(file.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {articleLink ? (
                            <Link
                              to={articleLink}
                              className="px-2 py-1 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/20 inline-flex items-center gap-1"
                              title="Open news"
                            >
                              <ExternalLink className="w-3 h-3" />
                              News
                            </Link>
                          ) : (
                            <span
                              className="px-2 py-1 text-xs font-medium rounded-lg border border-dark-200 text-dark-500 inline-flex items-center gap-1 cursor-not-allowed bg-dark-50 dark:bg-dark-800"
                              title="No news linked"
                            >
                              <ExternalLink className="w-3 h-3" />
                              News
                            </span>
                          )}
                          <button
                            onClick={() => setDeleteModal({ id: file._id, name: file.originalName })}
                            className="inline-flex items-center justify-center p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete file"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <EmptyState
          icon={ImageIcon}
          title={searchTerm ? 'No files found' : 'No files uploaded'}
          description={searchTerm ? 'Try a different search term' : 'Upload your first files to get started'}
          action={
            !searchTerm && (
              <Button
                leftIcon={<Upload className="w-4 h-4" />}
                onClick={() => setIsUploadModalOpen(true)}
              >
                Upload Files
              </Button>
            )
          }
        />
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setSelectedFiles([]);
        }}
        title="Upload Files"
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-dark-200 dark:border-dark-700 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-3 text-dark-400" />
            <p className="text-dark-900 dark:text-white font-medium mb-1">
              Choose files to upload
            </p>
            <p className="text-sm text-dark-500 mb-4">
              Supports: Images, Documents, Videos
            </p>
            <input
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="btn btn-primary cursor-pointer inline-block">
              Select Files
            </label>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-dark-700 dark:text-dark-300">
                Selected files ({selectedFiles.length}):
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-dark-50 dark:bg-dark-800 rounded-lg"
                  >
                    <span className="text-sm text-dark-700 dark:text-dark-300 truncate flex-1">
                      {file.name}
                    </span>
                    <span className="text-xs text-dark-500 ml-2">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsUploadModalOpen(false);
                setSelectedFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} isLoading={isUploading}>
              Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      {previewImage && (
        <Modal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          title={previewImage.originalName}
          size="xl"
        >
          <div className="space-y-4">
            <img loading="lazy"
              src={buildMediaUrl(previewImage.url)}
              alt={previewImage.originalName}
              className="w-full rounded-lg"
            />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-dark-500">Size:</span>{' '}
                <span className="text-dark-900 dark:text-white">{formatBytes(previewImage.size)}</span>
              </div>
              <div>
                <span className="text-dark-500">Type:</span>{' '}
                <span className="text-dark-900 dark:text-white">{previewImage.mimetype}</span>
              </div>
              <div>
                <span className="text-dark-500">Uploaded:</span>{' '}
                <span className="text-dark-900 dark:text-white">
                  {formatRelativeTime(previewImage.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-dark-500">URL:</span>{' '}
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  View full size
                </a>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="Delete File"
        message={`Are you sure you want to delete "${deleteModal?.name}"?`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        icon={Trash2}
      />
    </>
  );
}
