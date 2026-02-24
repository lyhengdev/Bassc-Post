import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Save, Send, Eye, Image as ImageIcon, X, ArrowLeft, BarChart3, Languages, CheckCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCreateArticle, useUpdateArticle, useArticleById, useCategories, useUploadMedia, useAI } from '../../hooks/useApi';
import { Button, Input, ContentLoader } from '../../components/common/index.jsx';
import EditorComponent from '../../components/common/EditorJS';
import { buildMediaUrl } from '../../utils';
import { useAuthStore } from '../../stores/authStore';
import translationAPI from '../../services/translationAPI';
import toast from 'react-hot-toast';
import useLanguage from '../../hooks/useLanguage';

const TRANSLATION_LANGUAGES = [
  { code: 'km', label: 'Khmer' },
  { code: 'zh', label: 'Chinese' },
];

export function ArticleEditorPage() {
  const { translateText } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editorRef = useRef(null);
  const translationEditorRef = useRef(null);
  const translationFormInitializedRef = useRef(false);
  const autoTranslatedLanguagesRef = useRef(new Set());
  const isEditMode = Boolean(id);
  const user = useAuthStore((state) => state.user);
  const canManageTranslations = ['admin', 'editor'].includes(user?.role);

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBreaking, setIsBreaking] = useState(false);
  const [editorData, setEditorData] = useState({ blocks: [] });
  const editorContentRef = useRef({ blocks: [] });
  const [isEditorReady, setIsEditorReady] = useState(!id);
  const [translationLanguage, setTranslationLanguage] = useState('km');
  const [translationTitle, setTranslationTitle] = useState('');
  const [translationExcerpt, setTranslationExcerpt] = useState('');
  const [translationEditorData, setTranslationEditorData] = useState({ blocks: [] });
  const translationContentRef = useRef({ blocks: [] });
  const [translationEditorNonce, setTranslationEditorNonce] = useState(0);
  const [isTranslationMachine, setIsTranslationMachine] = useState(false);

  const normalizeContent = (content) => {
    if (!content) return { blocks: [] };
    const normalized = Array.isArray(content) ? { blocks: content } : content;
    const blocks = Array.isArray(normalized.blocks) ? normalized.blocks : [];
    const withIds = blocks.map((block, index) => ({
      id: block.id || `block_${index}_${Date.now()}`,
      ...block,
    }));
    return { ...normalized, blocks: withIds };
  };
  const [isUploading, setIsUploading] = useState(false);

  const { data: articleResponse, isLoading: isLoadingArticle, isError: isArticleError } = useArticleById(id);
  const { data: categoriesData } = useCategories();
  const { mutate: createArticle, isPending: isCreating } = useCreateArticle();
  const { mutate: updateArticle, isPending: isUpdating } = useUpdateArticle();
  const { mutate: uploadMedia } = useUploadMedia();
  const { data: translationsData, isLoading: isLoadingTranslations } = useQuery({
    queryKey: ['article-translations', id],
    queryFn: async () => {
      const response = await translationAPI.getArticleTranslations(id);
      return response.data.data;
    },
    enabled: isEditMode && canManageTranslations,
  });
  const { mutate: saveTranslation, isPending: isSavingTranslation } = useMutation({
    mutationFn: async (payload) => {
      const existing = translationsData?.translations?.find((item) => item.language === payload.language);
      if (existing) {
        return translationAPI.updateArticleTranslation(id, payload.language, payload);
      }
      return translationAPI.createArticleTranslation(id, payload);
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ['article-translations', id] });
      toast.success(`${payload.language.toUpperCase()} ${translateText('translation saved')}`);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || translateText('Failed to save translation'));
    },
  });
  const { mutate: publishTranslation, isPending: isPublishingTranslation } = useMutation({
    mutationFn: async (languageCode) => translationAPI.publishArticleTranslation(id, languageCode),
    onSuccess: (_, languageCode) => {
      queryClient.invalidateQueries({ queryKey: ['article-translations', id] });
      toast.success(`${languageCode.toUpperCase()} ${translateText('translation published')}`);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || translateText('Failed to publish translation'));
    },
  });
  const { mutateAsync: translateArticleWithAI, isPending: isAutoTranslating } = useAI('translate-article');
  const categories = categoriesData || [];
  const isSaving = isCreating || isUpdating;
  const baseLanguage = articleResponse?.data?.article?.language || 'en';
  const translations = translationsData?.translations || [];
  const editableTranslationLanguages = TRANSLATION_LANGUAGES.filter((lang) => lang.code !== baseLanguage);
  const selectedTranslation = translations.find((item) => item.language === translationLanguage);
  const translationEditorKey = `${id || 'new'}-${translationLanguage}-${selectedTranslation?._id || 'new'}-${selectedTranslation?.updatedAt || '0'}-${translationEditorNonce}`;

  const getSourceContentForTranslation = async () => {
    if (editorRef.current?.save) {
      try {
        const saved = await editorRef.current.save();
        if (saved?.blocks?.length) {
          const normalized = normalizeContent(saved);
          editorContentRef.current = normalized;
          return normalized;
        }
      } catch (error) {
        console.warn('Failed to save source editor before translation:', error);
      }
    }

    if (editorContentRef.current?.blocks?.length) {
      return normalizeContent(editorContentRef.current);
    }

    return normalizeContent({ blocks: [] });
  };

  const runAutoTranslate = async (languageCode, options = {}) => {
    const { silent = false, force = false } = options;
    const lang = String(languageCode || translationLanguage || '').trim().toLowerCase();
    if (!lang) return;
    if (!force && autoTranslatedLanguagesRef.current.has(lang)) return;

    const sourceContent = await getSourceContentForTranslation();
    if (!sourceContent?.blocks?.length) {
      if (!silent) toast.error(translateText('Source news content is required before translation'));
      return;
    }

    try {
      const response = await translateArticleWithAI({
        sourceLanguage: baseLanguage,
        targetLanguage: lang,
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: sourceContent,
      });
      const payload = response?.data?.data || {};
      const translated = normalizeContent(payload.content);

      setTranslationLanguage(lang);
      setTranslationTitle(payload.title || title);
      setTranslationExcerpt(payload.excerpt || excerpt);
      setTranslationEditorData(translated);
      translationContentRef.current = translated;
      setIsTranslationMachine(true);
      setTranslationEditorNonce((value) => value + 1);
      autoTranslatedLanguagesRef.current.add(lang);
      if (!silent) toast.success(`${translateText('Auto-translated to')} ${lang.toUpperCase()}`);
    } catch (error) {
      if (!silent) {
        toast.error(error?.response?.data?.message || translateText('Auto translation failed'));
      }
    }
  };

  const loadTranslationForm = (languageCode) => {
    const lang = languageCode?.trim().toLowerCase();
    if (!lang) return;

    const existing = translations.find((item) => item.language === lang);
    const content = existing?.content?.blocks?.length
      ? normalizeContent(existing.content)
      : normalizeContent({ blocks: [] });

    setTranslationLanguage(lang);
    setTranslationTitle(existing?.title || title);
    setTranslationExcerpt(existing?.excerpt || excerpt);
    setIsTranslationMachine(Boolean(existing?.isMachineTranslated));
    setTranslationEditorData(content);
    translationContentRef.current = content;
    setTranslationEditorNonce((value) => value + 1);
    translationFormInitializedRef.current = true;

    if (!existing && lang === 'km') {
      void runAutoTranslate(lang, { silent: true });
    }
  };

  // Load article data when editing
  useEffect(() => {
    if (articleResponse?.data?.article) {
      const article = articleResponse.data.article;
      setTitle(article.title || '');
      setExcerpt(article.excerpt || '');
      setCategoryId(article.category?._id || '');
      setFeaturedImage(article.featuredImage || '');
      setImagePreview(article.featuredImage || '');
      setTags(article.tags || []);
      setIsFeatured(article.isFeatured || false);
      setIsBreaking(article.isBreaking || false);
      const content = normalizeContent(article.content);
      setEditorData(content);
      editorContentRef.current = content;
      setTranslationTitle(article.title || '');
      setTranslationExcerpt(article.excerpt || '');
      setIsEditorReady(true);
      translationFormInitializedRef.current = false;
      autoTranslatedLanguagesRef.current = new Set();
    }
  }, [articleResponse]);

  useEffect(() => {
    if (isEditMode && isArticleError) {
      setIsEditorReady(true);
    }
  }, [isEditMode, isArticleError]);

  useEffect(() => {
    if (!isEditMode || !canManageTranslations || !articleResponse?.data?.article || isLoadingTranslations) return;
    if (editableTranslationLanguages.length === 0) return;

    const hasCurrentLanguage = editableTranslationLanguages.some((lang) => lang.code === translationLanguage);
    const fallbackLanguage = editableTranslationLanguages[0].code;
    const initialLanguage = hasCurrentLanguage ? translationLanguage : fallbackLanguage;

    if (!translationFormInitializedRef.current || !hasCurrentLanguage) {
      loadTranslationForm(initialLanguage);
    }
  }, [
    isEditMode,
    canManageTranslations,
    articleResponse,
    isLoadingTranslations,
    editableTranslationLanguages,
    translationLanguage,
    translations,
  ]);

  const handleFeaturedImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(translateText('Please upload an image file'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(translateText('Image size must be less than 5MB'));
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
        toast.success(translateText('Image uploaded successfully'));
      },
      onError: () => {
        toast.error(translateText('Failed to upload image'));
        setIsUploading(false);
      }
    });
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      if (tags.length >= 10) {
        toast.error(translateText('Maximum 10 tags allowed'));
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
    editorContentRef.current = data;
  };

  const handleTranslationEditorChange = (data) => {
    translationContentRef.current = data;
  };

  const validateForm = () => {
    if (!title.trim()) {
      toast.error(translateText('Title is required'));
      return false;
    }

    if (title.length > 200) {
      toast.error(translateText('Title must be less than 200 characters'));
      return false;
    }

    if (!categoryId) {
      toast.error(translateText('Please select a category'));
      return false;
    }

    if (excerpt && excerpt.length > 500) {
      toast.error(translateText('Excerpt must be less than 500 characters'));
      return false;
    }

    return true;
  };

  const handleSave = async (status = 'draft') => {
    if (!validateForm()) return;

    try {
      const content = await editorRef.current?.save();

      if (!content || !content.blocks || content.blocks.length === 0) {
        toast.error(translateText('News content is required'));
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
        const message = status === 'draft' ? translateText('Draft saved successfully') : translateText('News submitted for review');
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
      toast.error(translateText('Failed to save news'));
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
      toast.error(translateText('Failed to generate preview'));
    }
  };

  const handleSaveTranslation = async () => {
    if (!isEditMode || !id) return;
    const lang = translationLanguage.trim().toLowerCase();
    if (!lang) {
      toast.error(translateText('Select translation language'));
      return;
    }
    if (!translationTitle.trim()) {
      toast.error(translateText('Translation title is required'));
      return;
    }

    try {
      const savedContent = await translationEditorRef.current?.save();
      const content = normalizeContent(savedContent || translationContentRef.current);
      if (!content?.blocks?.length) {
        toast.error(translateText('News content is required for translation'));
        return;
      }

      saveTranslation({
        language: lang,
        title: translationTitle.trim(),
        excerpt: translationExcerpt.trim(),
        content,
        isMachineTranslated: isTranslationMachine,
      });
    } catch (error) {
      console.error('Translation save error:', error);
      toast.error(translateText('Failed to prepare translation content'));
    }
  };

  return (
    <>
      <Helmet>
        <title>{`${translateText(id ? 'Edit News' : 'New News')} - Bassac Post`}</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/dashboard/articles')}
          >
            {translateText('Back')}
          </Button>
          <div>
            <h1 className="text-2xl sm:text-2xl font-bold text-dark-900 dark:text-white">
              {translateText(id ? 'Edit News' : 'New News')}
            </h1>
            <p className="text-sm text-dark-500">{translateText('Create and publish amazing content')}</p>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
          {id && (
            <Link to={`/dashboard/articles/${id}/insights`}>
              <Button variant="outline" leftIcon={<BarChart3 className="w-4 h-4" />}>
                {translateText('Insights')}
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            leftIcon={<Eye className="w-4 h-4" />}
            onClick={handlePreview}
            disabled={!title || !editorData}
          >
            {translateText('Preview')}
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={() => handleSave('draft')}
            isLoading={isSaving}
          >
            {translateText('Save Draft')}
          </Button>
          <Button
            leftIcon={<Send className="w-4 h-4" />}
            onClick={() => handleSave('pending')}
            isLoading={isSaving}
          >
            {translateText('Submit for Review')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24 md:pb-0">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="card p-4 sm:p-6">
            <Input
              label={translateText('News Title *')}
              placeholder={translateText('Enter a compelling title...')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl sm:text-2xl font-bold"
              required
              maxLength={200}
            />
            <p className="text-xs text-dark-500 mt-1">{title.length}/200 {translateText('characters')}</p>
          </div>

          {/* Featured Image */}
          <div className="card p-4 sm:p-6">
            <label className="label">{translateText('Featured Image')}</label>
            {isUploading ? (
              <div className="border-2 border-dashed border-primary-300 dark:border-primary-700 rounded-lg p-6 sm:p-8 text-center bg-primary-50 dark:bg-primary-900/20">
                <div className="animate-spin w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-3"></div>
                <p className="text-primary-600 dark:text-primary-400 font-medium">
                  {translateText('Uploading image...')}
                </p>
                <p className="text-xs text-dark-500 mt-1">
                  {translateText('Please wait while your image is being uploaded')}
                </p>
              </div>
            ) : imagePreview ? (
              <div className="relative group">
                <img loading="lazy"
                  src={buildMediaUrl(imagePreview)}
                  alt={translateText('Featured')}
                  className="w-full h-48 sm:h-64 object-cover rounded-lg"
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
                  {translateText('Upload a featured image for your news')}
                </p>
                <p className="text-xs text-dark-500 mb-3">
                  {translateText('JPG, PNG or WEBP. Max 5MB.')}
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
                  {translateText('Choose Image')}
                </label>
              </div>
            )}
          </div>

          {/* Editor.js Container */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="label mb-0">{translateText('News Content *')}</label>
              <p className="text-xs text-dark-500">{translateText('Use rich text formatting')}</p>
            </div>
            {isEditMode && isArticleError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {translateText('Failed to load news content. Please refresh or try again.')}
              </div>
            )}
            {isEditMode && !isEditorReady ? (
              <ContentLoader mode="spinner" className="min-h-[320px]" />
            ) : (
              <EditorComponent
                ref={editorRef}
                key={isEditMode ? id : 'new'}
                data={editorData}
                onChange={handleEditorChange}
                placeholder={translateText('Start writing your news...')}
              />
            )}
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {translateText('Tip: Use "/" to see formatting options. Drag blocks to reorder them.')}
              </p>
            </div>
          </div>

          {isEditMode && canManageTranslations && editableTranslationLanguages.length > 0 && (
            <div className="card p-6 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-primary-600" />
                  <label className="label mb-0">
                    {translateText('Translation Content')} ({translationLanguage.toUpperCase()}) *
                  </label>
                </div>
                <div className="w-full md:w-56">
                  <select
                    value={translationLanguage}
                    onChange={(e) => loadTranslationForm(e.target.value)}
                    className="input"
                  >
                  {editableTranslationLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {translateText(lang.label)} ({lang.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-dark-500">
              <span>
                {selectedTranslation
                  ? `${translateText('Status')}: ${translateText(selectedTranslation.translationStatus)}`
                  : `${translateText('No translation yet')}: ${translationLanguage.toUpperCase()}`}
              </span>
              <span>{translateText('Target language')}: {translationLanguage.toUpperCase()}</span>
            </div>

            <Input
              value={translationTitle}
              onChange={(e) => setTranslationTitle(e.target.value)}
              placeholder={translateText('Translated title')}
              maxLength={200}
            />
            <textarea
              value={translationExcerpt}
              onChange={(e) => setTranslationExcerpt(e.target.value)}
              className="input min-h-[90px]"
              placeholder={translateText('Translated excerpt')}
              maxLength={500}
            />

              <label className="flex items-center gap-2 text-sm text-dark-600 dark:text-dark-300">
                <input
                  type="checkbox"
                  checked={isTranslationMachine}
                  onChange={(e) => setIsTranslationMachine(e.target.checked)}
                  className="w-4 h-4"
                />
                {translateText('Mark as machine translated')}
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runAutoTranslate(translationLanguage, { force: true })}
                  isLoading={isAutoTranslating}
                >
                  {translateText('Auto Translate')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveTranslation}
                  isLoading={isSavingTranslation}
                >
                  {translateText('Save Translation')}
                </Button>
                {selectedTranslation && selectedTranslation.translationStatus !== 'published' && (
                  <Button
                    size="sm"
                    onClick={() => publishTranslation(translationLanguage)}
                    isLoading={isPublishingTranslation}
                    leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                  >
                    {translateText('Publish')}
                  </Button>
                )}
              </div>

              <EditorComponent
                ref={translationEditorRef}
                key={translationEditorKey}
                data={translationEditorData}
                onChange={handleTranslationEditorChange}
                placeholder={`${translateText('Write translated content in')} ${translationLanguage.toUpperCase()}...`}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Excerpt */}
          <div className="card p-4 sm:p-6">
            <label className="label">{translateText('Excerpt')}</label>
            <textarea
              placeholder={translateText('Brief description of your news (shown in previews)')}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="input min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-dark-500 mt-1">{excerpt.length}/500 {translateText('characters')}</p>
          </div>

          {/* Category */}
          <div className="card p-4 sm:p-6">
            <label className="label">{translateText('Category *')}</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input"
              required
            >
              <option value="">{translateText('Select a category')}</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {translateText(cat.name)}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">
                {translateText('No categories available. Ask an admin to create some.')}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="card p-4 sm:p-6">
            <label className="label">{translateText('Tags')}</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder={translateText('Add a tag...')}
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
              <Button size="sm" onClick={handleAddTag}>{translateText('Add')}</Button>
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
                      className="transition-colors hover:text-primary-800 dark:hover:text-primary-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-dark-500 mt-2">
              {translateText('Press Enter or click Add to add tags')} ({tags.length}/10)
            </p>
          </div>

          {/* Options */}
          <div className="card p-4 sm:p-6 space-y-3">
            <label className="label">{translateText('News Options')}</label>
            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-dark-50 dark:hover:bg-dark-800 rounded-lg">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
              />
              <div>
                <span className="text-dark-700 dark:text-dark-300 font-medium">{translateText('Featured News')}</span>
                <p className="text-xs text-dark-500">{translateText('Show in featured section')}</p>
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
                <span className="text-dark-700 dark:text-dark-300 font-medium">{translateText('Breaking News')}</span>
                <p className="text-xs text-dark-500">{translateText('Mark as breaking news')}</p>
              </div>
            </label>
          </div>

          {/* Publishing Info */}
          <div className="card p-4 sm:p-6 bg-dark-50 dark:bg-dark-800">
            <h3 className="font-medium text-dark-900 dark:text-white mb-3">{translateText('Publishing Info')}</h3>
            <div className="space-y-2 text-sm text-dark-600 dark:text-dark-400">
              <div className="flex justify-between">
                <span>{translateText('Status')}:</span>
                <span className="font-medium">
                  {id ? translateText(articleResponse?.data?.status) : translateText('Draft')}
                </span>
              </div>
              {id && articleResponse?.data?.createdAt && (
                <div className="flex justify-between">
                  <span>{translateText('Created')}:</span>
                  <span className="font-medium">
                    {new Date(articleResponse.data.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-dark-900/95 border-t border-dark-200 dark:border-dark-800 md:hidden safe-bottom">
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              leftIcon={<Eye className="w-4 h-4" />}
            onClick={handlePreview}
            disabled={!title || !editorData}
          >
            {translateText('Preview')}
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={() => handleSave('draft')}
            isLoading={isSaving}
          >
            {translateText('Save')}
          </Button>
          <Button
            leftIcon={<Send className="w-4 h-4" />}
            onClick={() => handleSave('pending')}
            isLoading={isSaving}
            className="col-span-2"
          >
            {translateText('Submit for Review')}
          </Button>
        </div>
        {id && (
          <div className="mt-2">
            <Link to={`/dashboard/articles/${id}/insights`}>
              <Button variant="ghost" leftIcon={<BarChart3 className="w-4 h-4" />} className="w-full">
                {translateText('Insights')}
              </Button>
            </Link>
          </div>
          )}
        </div>
      </div>
    </>
  );
}
