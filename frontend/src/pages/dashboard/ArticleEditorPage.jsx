import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Save, Send, Eye, Image as ImageIcon, X, ArrowLeft } from 'lucide-react';
import { useCreateArticle, useUpdateArticle, useArticleById, useCategories, useUploadMedia } from '../../hooks/useApi';
import { Button, Input, ContentLoader } from '../../components/common/index.jsx';
import EditorComponent from '../../components/common/EditorJS';
import toast from 'react-hot-toast';

export function ArticleEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBreaking, setIsBreaking] = useState(false);
  const [editorData, setEditorData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: articleResponse, isLoading: isLoadingArticle } = useArticleById(id);
  const { data: categoriesData } = useCategories();
  const { mutate: createArticle, isPending: isCreating } = useCreateArticle();
  const { mutate: updateArticle, isPending: isUpdating } = useUpdateArticle();
  const { mutate: uploadMedia } = useUploadMedia();

  // Load article data when editing
  useEffect(() => {
    if (articleResponse?.data) {
      const article = articleResponse.data;
      setTitle(article.title || '');
      setExcerpt(article.excerpt || '');
      setCategoryId(article.category?._id || '');
      setFeaturedImage(article.featuredImage || '');
      setImagePreview(article.featuredImage || '');
      setTags(article.tags || []);
      setIsFeatured(article.isFeatured || false);
      setIsBreaking(article.isBreaking || false);
      setEditorData(article.content || { blocks: [] });
    }
  }, [articleResponse]);

  const handleFeaturedImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('images', file);

    uploadMedia(formData, {
      onSuccess: (response) => {
        const uploadedUrl = response.data.data.uploaded[0].url;
        setFeaturedImage(uploadedUrl);
        setImagePreview(uploadedUrl);
        setIsUploading(false);
        toast.success('Image uploaded successfully');
      },
      onError: () => {
        toast.error('Failed to upload image');
        setIsUploading(false);
      }
    });
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      if (tags.length >= 10) {
        toast.error('Maximum 10 tags allowed');
        return;
      }
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleEditorChange = (data) => {
    setEditorData(data);
  };

  const validateForm = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return false;
    }

    if (title.length > 200) {
      toast.error('Title must be less than 200 characters');
      return false;
    }

    if (!categoryId) {
      toast.error('Please select a category');
      return false;
    }

    if (excerpt && excerpt.length > 500) {
      toast.error('Excerpt must be less than 500 characters');
      return false;
    }

    return true;
  };

  const handleSave = async (status = 'draft') => {
    if (!validateForm()) return;

    try {
      const content = await editorRef.current?.save();

      if (!content || !content.blocks || content.blocks.length === 0) {
        toast.error('Article content is required');
        return;
      }

      const articleData = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content,
        category: categoryId,
        featuredImage,
        tags,
        isFeatured,
        isBreaking,
        status
      };

      const onSuccess = () => {
        const message = status === 'draft' ? 'Draft saved successfully' : 'Article submitted for review';
        toast.success(message);
        navigate('/dashboard/articles');
      };

      if (id) {
        updateArticle({ id, data: articleData }, { onSuccess });
      } else {
        createArticle(articleData, { onSuccess });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save article');
    }
  };

  const handlePreview = async () => {
    try {
      const content = await editorRef.current?.save();
      sessionStorage.setItem('articlePreview', JSON.stringify({
        title,
        excerpt,
        content,
        featuredImage,
        tags
      }));
      window.open('/preview', '_blank');
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to generate preview');
    }
  };

  if (id && isLoadingArticle) {
    return <ContentLoader />;
  }

  // categoriesData is already an array from useCategories hook
  const categories = categoriesData || [];
  const isSaving = isCreating || isUpdating;

  return (
    <>
      <Helmet>
        <title>{id ? 'Edit Article' : 'New Article'} - Bassac Media Center</title>
      </Helmet>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/dashboard/articles')}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
              {id ? 'Edit Article' : 'New Article'}
            </h1>
            <p className="text-sm text-dark-500">Create and publish amazing content</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            leftIcon={<Eye className="w-4 h-4" />}
            onClick={handlePreview}
            disabled={!title || !editorData}
          >
            Preview
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={() => handleSave('draft')}
            isLoading={isSaving}
          >
            Save Draft
          </Button>
          <Button
            leftIcon={<Send className="w-4 h-4" />}
            onClick={() => handleSave('pending')}
            isLoading={isSaving}
          >
            Submit for Review
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="card p-6">
            <Input
              label="Article Title *"
              placeholder="Enter a compelling title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-bold"
              required
              maxLength={200}
            />
            <p className="text-xs text-dark-500 mt-1">{title.length}/200 characters</p>
          </div>

          {/* Featured Image */}
          <div className="card p-6">
            <label className="label">Featured Image</label>
            {isUploading ? (
              <div className="border-2 border-dashed border-primary-300 dark:border-primary-700 rounded-lg p-8 text-center bg-primary-50 dark:bg-primary-900/20">
                <div className="animate-spin w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-3"></div>
                <p className="text-primary-600 dark:text-primary-400 font-medium">
                  Uploading image...
                </p>
                <p className="text-xs text-dark-500 mt-1">
                  Please wait while your image is being uploaded
                </p>
              </div>
            ) : imagePreview ? (
              <div className="relative group">
                <img
                  src={imagePreview}
                  alt="Featured"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setFeaturedImage('');
                      setImagePreview('');
                    }}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <label htmlFor="featured-image" className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer">
                    <ImageIcon className="w-4 h-4" />
                  </label>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-dark-200 dark:border-dark-700 rounded-lg p-8 text-center hover:border-primary-400 dark:hover:border-primary-600 transition-colors">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-dark-400" />
                <p className="text-dark-600 dark:text-dark-400 mb-3">
                  Upload a featured image for your article
                </p>
                <p className="text-xs text-dark-500 mb-3">
                  JPG, PNG or WEBP. Max 5MB.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFeaturedImageUpload}
                  className="hidden"
                  id="featured-image"
                />
                <label
                  htmlFor="featured-image"
                  className="btn btn-secondary cursor-pointer"
                >
                  Choose Image
                </label>
              </div>
            )}
          </div>

          {/* Editor.js Container */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="label mb-0">Article Content *</label>
              <p className="text-xs text-dark-500">Use rich text formatting</p>
            </div>
            <EditorComponent
              ref={editorRef}
              data={editorData}
              onChange={handleEditorChange}
              placeholder="Start writing your article..."
            />
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 <strong>Tip:</strong> Use "/" to see formatting options. Drag blocks to reorder them.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Excerpt */}
          <div className="card p-6">
            <label className="label">Excerpt</label>
            <textarea
              placeholder="Brief description of your article (shown in previews)"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="input min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-dark-500 mt-1">{excerpt.length}/500 characters</p>
          </div>

          {/* Category */}
          <div className="card p-6">
            <label className="label">Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input"
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">
                No categories available. Ask an admin to create some.
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="card p-6">
            <label className="label">Tags</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="input flex-1"
              />
              <Button size="sm" onClick={handleAddTag}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-primary-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-dark-500 mt-2">
              Press Enter or click Add to add tags ({tags.length}/10)
            </p>
          </div>

          {/* Options */}
          <div className="card p-6 space-y-3">
            <label className="label">Article Options</label>
            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-dark-50 dark:hover:bg-dark-800 rounded-lg">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
              />
              <div>
                <span className="text-dark-700 dark:text-dark-300 font-medium">Featured Article</span>
                <p className="text-xs text-dark-500">Show in featured section</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-dark-50 dark:hover:bg-dark-800 rounded-lg">
              <input
                type="checkbox"
                checked={isBreaking}
                onChange={(e) => setIsBreaking(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
              />
              <div>
                <span className="text-dark-700 dark:text-dark-300 font-medium">Breaking News</span>
                <p className="text-xs text-dark-500">Mark as breaking news</p>
              </div>
            </label>
          </div>

          {/* Publishing Info */}
          <div className="card p-6 bg-dark-50 dark:bg-dark-800">
            <h3 className="font-medium text-dark-900 dark:text-white mb-3">Publishing Info</h3>
            <div className="space-y-2 text-sm text-dark-600 dark:text-dark-400">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium">
                  {id ? articleResponse?.data?.status : 'Draft'}
                </span>
              </div>
              {id && articleResponse?.data?.createdAt && (
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium">
                    {new Date(articleResponse.data.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
