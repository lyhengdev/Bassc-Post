import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Save, Send, Eye, Image as ImageIcon, X, ArrowLeft, BarChart3, CheckCircle, ExternalLink, FileText, Clapperboard } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useCreateArticle,
  useUpdateArticle,
  useArticleById,
  useCategories,
  useUploadMedia,
  useAI,
  useWorkflowSourceApprove,
  useWorkflowSourceRequestChanges,
  useWorkflowTranslationSubmit,
  useWorkflowTranslationApprove,
  useWorkflowTranslationRequestChanges,
  useWorkflowFinalApprove,
  useWorkflowFinalReject,
} from '../../hooks/useApi';
import { Button, Input, ContentLoader, StatusBadge } from '../../components/common/index.jsx';
import EditorComponent from '../../components/common/EditorJS';
import { buildMediaUrl } from '../../utils';
import { buildFacebookEmbedConfig, normalizeExternalUrl, normalizeFacebookUrl } from '../../utils/facebookEmbed';
import { useAuthStore } from '../../stores/authStore';
import translationAPI from '../../services/translationAPI';
import toast from 'react-hot-toast';
import useLanguage from '../../hooks/useLanguage';

const CMS_LANGUAGES = [
  { code: 'en', label: 'English' },
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
  const translationWorkspaceInitializedRef = useRef(false);
  const isEditMode = Boolean(id);
  const user = useAuthStore((state) => state.user);
  const isTranslationContributorRole = ['translator', 'writer'].includes(user?.role);
  const isEditorRole = user?.role === 'editor';
  const isAdminRole = user?.role === 'admin';
  const isContentStaffRole = ['writer', 'editor', 'translator', 'admin'].includes(user?.role);
  const canManageTranslations = [isTranslationContributorRole, isEditorRole, isAdminRole].some(Boolean);
  const canEditSourceContent = isContentStaffRole;
  const canViewInsights = isContentStaffRole;

  const [articleLanguage, setArticleLanguage] = useState('en');
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [postType, setPostType] = useState('news');
  const [videoUrl, setVideoUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBreaking, setIsBreaking] = useState(false);
  const [editorData, setEditorData] = useState({ blocks: [] });
  const [hasEditorContent, setHasEditorContent] = useState(false);
  const editorContentRef = useRef({ blocks: [] });
  const [isEditorReady, setIsEditorReady] = useState(!id);
  const [workspaceLanguage, setWorkspaceLanguage] = useState('en');
  const [translationLanguage, setTranslationLanguage] = useState('km');
  const [translationTitle, setTranslationTitle] = useState('');
  const [translationExcerpt, setTranslationExcerpt] = useState('');
  const [translationEditorData, setTranslationEditorData] = useState({ blocks: [] });
  const translationContentRef = useRef({ blocks: [] });
  const [translationEditorNonce, setTranslationEditorNonce] = useState(0);
  const [isTranslationMachine, setIsTranslationMachine] = useState(false);

  const normalizeContent = useCallback((content) => {
    if (!content) return { blocks: [] };
    const normalized = Array.isArray(content) ? { blocks: content } : content;
    const blocks = Array.isArray(normalized.blocks) ? normalized.blocks : [];
    const withIds = blocks.map((block, index) => ({
      id: block.id || `block_${index}_${Date.now()}`,
      ...block,
    }));
    return { ...normalized, blocks: withIds };
  }, []);

  const buildVideoFallbackContent = useCallback(() => ({
    time: Date.now(),
    blocks: [
      {
        id: `video-summary-${Date.now().toString(36)}`,
        type: 'paragraph',
        data: { text: excerpt.trim() || title.trim() || 'Video post' },
      },
    ],
    version: '2.28.2',
  }), [excerpt, title]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: articleResponse, isLoading: _isLoadingArticle, isError: isArticleError } = useArticleById(id);
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
  const { mutateAsync: saveTranslation, isPending: isSavingTranslation } = useMutation({
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
  const { mutate: workflowApproveSource, isPending: isApprovingSource } = useWorkflowSourceApprove();
  const { mutate: workflowRequestSourceChanges, isPending: isRejectingSource } = useWorkflowSourceRequestChanges();
  const { mutate: workflowSubmitTranslation, isPending: isSubmittingTranslation } = useWorkflowTranslationSubmit();
  const { mutate: workflowApproveTranslation, isPending: isApprovingTranslation } = useWorkflowTranslationApprove();
  const { mutate: workflowRequestTranslationChanges, isPending: isRejectingTranslation } = useWorkflowTranslationRequestChanges();
  const { mutate: workflowFinalApprove, isPending: isFinalApproving } = useWorkflowFinalApprove();
  const { mutate: workflowFinalReject, isPending: isFinalRejecting } = useWorkflowFinalReject();
  const { mutateAsync: translateArticleWithAI, isPending: isAutoTranslating } = useAI('translate-article');
  const sourceArticle = articleResponse?.data?.article;
  const sourceWorkflow = sourceArticle?.workflow || {};
  const sourceAuthorId = sourceArticle?.author?._id || sourceArticle?.author || null;
  const isSourceOwner =
    !sourceAuthorId ||
    sourceAuthorId?.toString?.() === user?._id?.toString?.();
  const canSaveSourceContent = canEditSourceContent && (!isEditMode || isSourceOwner || isEditorRole || isAdminRole);
  const sourceReviewState = sourceWorkflow?.sourceReviewState || 'draft';
  const translationWorkflowState = sourceWorkflow?.translationState || 'not_required';
  const adminApprovalState = sourceWorkflow?.adminApprovalState || 'not_ready';
  const assignedTranslatorId = sourceWorkflow?.assignedTranslator?._id || sourceWorkflow?.assignedTranslator || null;
  const isAssignedTranslator = !assignedTranslatorId || assignedTranslatorId?.toString?.() === user?._id?.toString?.();
  const editorCanReviewSource = isEditMode && isEditorRole && sourceReviewState === 'submitted';
  const editorCanReviewTranslation =
    isEditMode &&
    isEditorRole &&
    sourceReviewState === 'approved' &&
    translationWorkflowState === 'submitted';
  const adminCanFinalReview =
    isEditMode &&
    isAdminRole &&
    sourceReviewState === 'approved' &&
    translationWorkflowState === 'approved' &&
    adminApprovalState === 'pending_final_review';
  const translatorCanSubmitTranslation =
    isEditMode &&
    isTranslationContributorRole &&
    isAssignedTranslator &&
    ['in_translation', 'changes_requested'].includes(translationWorkflowState);
  const sourceTitle = String(sourceArticle?.title ?? title ?? '');
  const sourceExcerpt = String(sourceArticle?.excerpt ?? excerpt ?? '');
  const categories = categoriesData || [];
  const isSaving = isCreating || isUpdating;
  const baseLanguage = sourceArticle?.language || articleLanguage || 'en';
  const translations = useMemo(
    () => translationsData?.translations || [],
    [translationsData?.translations]
  );
  const editableTranslationLanguages = useMemo(
    () => CMS_LANGUAGES.filter((lang) => lang.code !== baseLanguage),
    [baseLanguage]
  );
  const languageLabelMap = useMemo(
    () => CMS_LANGUAGES.reduce((acc, item) => ({ ...acc, [item.code]: item.label }), {}),
    []
  );
  const selectedTranslation = translations.find((item) => item.language === translationLanguage);
  const workspaceTranslation = translations.find((item) => item.language === workspaceLanguage);
  const submittedTranslationLanguage =
    translations.find((item) => item?.workflow?.translationState === 'submitted')?.language || '';
  const translationEditorKey = `${id || 'new'}-${translationLanguage}-${selectedTranslation?._id || 'new'}-${selectedTranslation?.updatedAt || '0'}-${translationEditorNonce}`;
  const normalizedVideoUrl = postType === 'video' ? normalizeFacebookUrl(videoUrl) : '';
  const videoEmbed = postType === 'video' ? buildFacebookEmbedConfig(normalizedVideoUrl) : null;
  const videoUrlError = postType === 'video' && videoUrl.trim() && !normalizedVideoUrl
    ? translateText('Use a valid Facebook link (post/video/reel)')
    : '';
  const isSourceWorkspace = !isEditMode || workspaceLanguage === baseLanguage;
  const isTranslationWorkspace = isEditMode && workspaceLanguage !== baseLanguage;
  const activeTitle = isSourceWorkspace ? title : translationTitle;
  const activeExcerpt = isSourceWorkspace ? excerpt : translationExcerpt;
  const hasTranslationContent = Boolean(
    (translationContentRef.current?.blocks && translationContentRef.current.blocks.length > 0) ||
    (translationEditorData?.blocks && translationEditorData.blocks.length > 0)
  );
  const activeHasContent = isSourceWorkspace ? hasEditorContent : hasTranslationContent;
  const activeLanguageCode = isSourceWorkspace ? baseLanguage : workspaceLanguage;
  const activeLanguageLabel = languageLabelMap[activeLanguageCode] || activeLanguageCode.toUpperCase();
  const activeTranslationRecord = isTranslationWorkspace ? workspaceTranslation : selectedTranslation;
  const activeTranslationStatus =
    activeTranslationRecord?.workflow?.translationState ||
    activeTranslationRecord?.translationStatus ||
    'draft';

  useEffect(() => {
    translationWorkspaceInitializedRef.current = false;
  }, [id]);

  const getSourceContentForTranslation = useCallback(async () => {
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

    if (postType === 'video') {
      const fallback = normalizeContent(buildVideoFallbackContent());
      editorContentRef.current = fallback;
      return fallback;
    }

    return normalizeContent({ blocks: [] });
  }, [normalizeContent, postType, buildVideoFallbackContent]);

  const runAutoTranslate = useCallback(async (languageCode, options = {}) => {
    const { silent = false, force = false } = options;
    const lang = String(languageCode || translationLanguage || '').trim().toLowerCase();
    if (!lang) return;
    if (!force && autoTranslatedLanguagesRef.current.has(lang)) return;

    const sourceContent = await getSourceContentForTranslation();
    if (!sourceContent?.blocks?.length) {
      if (!silent) toast.error(translateText('Source post content is required before translation'));
      return;
    }

    try {
      const response = await translateArticleWithAI({
        sourceLanguage: baseLanguage,
        targetLanguage: lang,
        title: sourceTitle.trim(),
        excerpt: sourceExcerpt.trim(),
        content: sourceContent,
      });
      const payload = response?.data?.data || {};
      const translated = normalizeContent(payload.content);

      setTranslationLanguage(lang);
      setTranslationTitle(payload.title || sourceTitle);
      setTranslationExcerpt(payload.excerpt || sourceExcerpt);
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
  }, [
    translationLanguage,
    getSourceContentForTranslation,
    translateArticleWithAI,
    baseLanguage,
    sourceTitle,
    sourceExcerpt,
    normalizeContent,
    translateText,
  ]);

  const loadTranslationForm = useCallback((languageCode) => {
    const lang = languageCode?.trim().toLowerCase();
    if (!lang) return;

    const existing = translations.find((item) => item.language === lang);
    const content = existing?.content?.blocks?.length
      ? normalizeContent(existing.content)
      : normalizeContent({ blocks: [] });

    setTranslationLanguage(lang);
    setTranslationTitle(existing?.title || sourceTitle);
    setTranslationExcerpt(existing?.excerpt || sourceExcerpt);
    setIsTranslationMachine(Boolean(existing?.isMachineTranslated));
    setTranslationEditorData(content);
    translationContentRef.current = content;
    setTranslationEditorNonce((value) => value + 1);
    translationFormInitializedRef.current = true;
  }, [translations, normalizeContent, sourceTitle, sourceExcerpt]);

  // Load article data when editing
  useEffect(() => {
    if (articleResponse?.data?.article) {
      const article = articleResponse.data.article;
      setArticleLanguage(article.language || 'en');
      setTitle(article.title || '');
      setExcerpt(article.excerpt || '');
      setPostType(article.postType || 'news');
      setVideoUrl(article.videoUrl || '');
      setCategoryId(article.category?._id || '');
      setFeaturedImage(article.featuredImage || '');
      setImagePreview(article.featuredImage || '');
      setTags(article.tags || []);
      setIsFeatured(article.isFeatured || false);
      setIsBreaking(article.isBreaking || false);
      const content = normalizeContent(article.content);
      setEditorData(content);
      editorContentRef.current = content;
      setHasEditorContent(Array.isArray(content?.blocks) && content.blocks.length > 0);
      setTranslationTitle(article.title || '');
      setTranslationExcerpt(article.excerpt || '');
      setIsEditorReady(true);
      translationFormInitializedRef.current = false;
      autoTranslatedLanguagesRef.current = new Set();
    }
  }, [articleResponse, normalizeContent]);

  useEffect(() => {
    if (isEditMode && isArticleError) {
      setIsEditorReady(true);
    }
  }, [isEditMode, isArticleError]);

  useEffect(() => {
    if (!isEditMode || !canManageTranslations || !articleResponse?.data?.article || isLoadingTranslations) return;
    if (editableTranslationLanguages.length === 0) return;

    const hasCurrentLanguage = editableTranslationLanguages.some((lang) => lang.code === translationLanguage);
    const preferredSubmittedLanguage = translations.find((item) => item?.workflow?.translationState === 'submitted')?.language;
    const fallbackLanguage = preferredSubmittedLanguage || editableTranslationLanguages[0].code;
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
    loadTranslationForm,
  ]);

  useEffect(() => {
    if (!isEditMode || !isTranslationContributorRole || !articleResponse?.data?.article || isLoadingTranslations) return;
    if (!['in_translation', 'changes_requested'].includes(translationWorkflowState)) return;
    if (editableTranslationLanguages.length === 0) return;
    if (translationWorkspaceInitializedRef.current) return;

    if (workspaceLanguage !== baseLanguage) {
      translationWorkspaceInitializedRef.current = true;
      return;
    }

    const currentLanguage = String(translationLanguage || '').trim().toLowerCase();
    const hasCurrentLanguage = editableTranslationLanguages.some((lang) => lang.code === currentLanguage);
    const changesRequestedLanguage = translations.find((item) => item?.workflow?.translationState === 'changes_requested')?.language || '';
    const preferredLanguage = changesRequestedLanguage || (hasCurrentLanguage ? currentLanguage : editableTranslationLanguages[0].code);

    if (!preferredLanguage) return;

    translationWorkspaceInitializedRef.current = true;
    setWorkspaceLanguage(preferredLanguage);
    setTranslationLanguage(preferredLanguage);
    loadTranslationForm(preferredLanguage);
  }, [
    isEditMode,
    isTranslationContributorRole,
    articleResponse,
    isLoadingTranslations,
    translationWorkflowState,
    editableTranslationLanguages,
    workspaceLanguage,
    baseLanguage,
    translationLanguage,
    translations,
    loadTranslationForm,
  ]);

  useEffect(() => {
    if (!isEditMode) {
      setWorkspaceLanguage(articleLanguage || 'en');
      return;
    }

    const allowedLanguages = [baseLanguage, ...editableTranslationLanguages.map((lang) => lang.code)];
    if (!allowedLanguages.includes(workspaceLanguage)) {
      setWorkspaceLanguage(baseLanguage);
      return;
    }

    if (workspaceLanguage !== baseLanguage) {
      const shouldLoadLanguage =
        translationLanguage !== workspaceLanguage || !translationFormInitializedRef.current;

      if (shouldLoadLanguage) {
        setTranslationLanguage(workspaceLanguage);
        loadTranslationForm(workspaceLanguage);
      }
    }
  }, [
    isEditMode,
    articleLanguage,
    baseLanguage,
    editableTranslationLanguages,
    workspaceLanguage,
    translationLanguage,
    loadTranslationForm,
  ]);

  useEffect(() => {
    if (!isEditMode || !isTranslationContributorRole || !isTranslationWorkspace) return;
    if (isAutoTranslating) return;

    const lang = String(workspaceLanguage || '').trim().toLowerCase();
    if (!lang || lang === baseLanguage) return;

    const existingTranslation = translations.find((item) => item.language === lang);
    const hasSavedContent = Array.isArray(existingTranslation?.content?.blocks) && existingTranslation.content.blocks.length > 0;
    const hasLoadedEditorContent =
      translationLanguage === lang &&
      Array.isArray(translationContentRef.current?.blocks) &&
      translationContentRef.current.blocks.length > 0;

    if (hasSavedContent || hasLoadedEditorContent) return;
    if (autoTranslatedLanguagesRef.current.has(lang)) return;

    void runAutoTranslate(lang, { silent: true });
  }, [
    isEditMode,
    isTranslationContributorRole,
    isTranslationWorkspace,
    isAutoTranslating,
    workspaceLanguage,
    baseLanguage,
    translations,
    translationLanguage,
    runAutoTranslate,
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
    setHasEditorContent(Array.isArray(data?.blocks) && data.blocks.length > 0);
  };

  const handleTranslationEditorChange = (data) => {
    translationContentRef.current = data;
  };

  const handleWorkspaceLanguageChange = (nextLanguageCode) => {
    const normalized = String(nextLanguageCode || '').trim().toLowerCase();
    if (!normalized) return;

    if (!isEditMode) {
      setArticleLanguage(normalized);
      setWorkspaceLanguage(normalized);
      return;
    }

    setWorkspaceLanguage(normalized);
    if (normalized !== baseLanguage) {
      setTranslationLanguage(normalized);
      loadTranslationForm(normalized);
    }
  };

  const validateForm = () => {
    if (!articleLanguage || !CMS_LANGUAGES.some((option) => option.code === articleLanguage)) {
      toast.error(translateText('Select language'));
      return false;
    }

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

    if (postType === 'video') {
      const normalized = normalizeFacebookUrl(videoUrl);
      if (!normalized) {
        toast.error(translateText('Valid Facebook video URL is required for video posts'));
        return false;
      }
      setVideoUrl(normalized);
    }

    return true;
  };

  const handleSave = async (status = 'draft') => {
    if (!canSaveSourceContent) {
      toast.error(translateText('You do not have permission to edit source posts'));
      return;
    }

    if (!validateForm()) return;

    try {
      const content = await editorRef.current?.save();
      const hasBlocks = !!(content && Array.isArray(content.blocks) && content.blocks.length > 0);
      const finalContent = hasBlocks
        ? content
        : postType === 'video'
          ? buildVideoFallbackContent()
          : null;

      if (!finalContent) {
        toast.error(translateText('Post content is required'));
        return;
      }

      const articleData = {
        language: articleLanguage,
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: finalContent,
        postType,
        videoUrl: postType === 'video' ? normalizeFacebookUrl(videoUrl) : '',
        category: categoryId,
        featuredImage,
        tags,
        isFeatured,
        isBreaking,
        status
      };

      const onSuccess = () => {
        const message = status === 'draft' ? translateText('Draft saved successfully') : translateText('Post submitted for review');
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
      toast.error(translateText('Failed to save post'));
    }
  };

  const handlePreview = async () => {
    try {
      const content = await editorRef.current?.save();
      sessionStorage.setItem('articlePreview', JSON.stringify({
        title,
        excerpt,
        content,
        postType,
        videoUrl: postType === 'video' ? normalizeFacebookUrl(videoUrl) : '',
        featuredImage,
        tags
      }));
      window.open('/preview', '_blank');
    } catch (error) {
      console.error('Preview error:', error);
      toast.error(translateText('Failed to generate preview'));
    }
  };

  const promptForNotes = (promptMessage) => {
    const value = window.prompt(promptMessage, '');
    if (value === null) return null;
    if (!value.trim()) {
      toast.error(translateText('Notes are required'));
      return null;
    }
    return value.trim();
  };

  const handleSaveTranslation = async () => {
    if (!id) {
      toast.error(translateText('Save the post first, then save/submit this translation.'));
      return false;
    }
    if (isTranslationContributorRole && !isAssignedTranslator) {
      toast.error(translateText('This task is assigned to another translator'));
      return false;
    }

    const lang = String(isTranslationWorkspace ? workspaceLanguage : translationLanguage).trim().toLowerCase();
    if (!lang) {
      toast.error(translateText('Select translation language'));
      return false;
    }
    if (!translationTitle.trim()) {
      toast.error(translateText('Translation title is required'));
      return false;
    }

    let content;
    try {
      const savedContent = await translationEditorRef.current?.save();
      content = normalizeContent(savedContent || translationContentRef.current);
      if (!content?.blocks?.length) {
        toast.error(translateText('Post content is required for translation'));
        return false;
      }
    } catch (error) {
      console.error('Translation save error:', error);
      toast.error(translateText('Failed to prepare translation content'));
      return false;
    }

    try {
      await saveTranslation({
        language: lang,
        title: translationTitle.trim(),
        excerpt: translationExcerpt.trim(),
        content,
        isMachineTranslated: isTranslationMachine,
      });
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmitTranslationForReview = async () => {
    if (!id) return;
    if (isTranslationContributorRole && !isAssignedTranslator) {
      toast.error(translateText('This task is assigned to another translator'));
      return;
    }
    const lang = String(isTranslationWorkspace ? workspaceLanguage : translationLanguage).trim().toLowerCase();
    if (!lang) {
      toast.error(translateText('Select translation language'));
      return;
    }
    if (!translationTitle.trim()) {
      toast.error(translateText('Translation title is required'));
      return;
    }

    const saved = await handleSaveTranslation();
    if (!saved) {
      return;
    }

    workflowSubmitTranslation(
      { id, language: lang },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['article', 'id', id] });
          queryClient.invalidateQueries({ queryKey: ['article-translations', id] });
          queryClient.invalidateQueries({ queryKey: ['articles', 'workflow'] });
          if (isTranslationContributorRole) {
            navigate('/dashboard/pending', {
              replace: true,
              state: {
                from: 'translation-submit',
                articleId: id,
                language: lang,
              },
            });
          }
        },
      }
    );
  };

  const handleApproveSource = () => {
    if (!id) return;
    workflowApproveSource(
      { id, notes: '' },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['article', 'id', id] }) }
    );
  };

  const handleRejectSource = () => {
    if (!id) return;
    const reason = promptForNotes(translateText('Enter source review change request:'));
    if (!reason) return;
    workflowRequestSourceChanges(
      { id, reason },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['article', 'id', id] }) }
    );
  };

  const handleApproveTranslation = () => {
    if (!id) return;
    const languageCode = selectedTranslation?.language || submittedTranslationLanguage || translationLanguage;
    workflowApproveTranslation(
      { id, language: languageCode, notes: '' },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['article', 'id', id] }) }
    );
  };

  const handleRejectTranslation = () => {
    if (!id) return;
    const languageCode = selectedTranslation?.language || submittedTranslationLanguage || translationLanguage;
    const reason = promptForNotes(translateText('Enter translation review change request:'));
    if (!reason) return;
    workflowRequestTranslationChanges(
      { id, language: languageCode, reason },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['article', 'id', id] }) }
    );
  };

  const handleFinalApprove = () => {
    if (!id) return;
    workflowFinalApprove(
      { id, notes: '' },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['article', 'id', id] }) }
    );
  };

  const handleFinalReject = () => {
    if (!id) return;
    const reason = promptForNotes(translateText('Enter final rejection reason:'));
    if (!reason) return;
    workflowFinalReject(
      { id, reason },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['article', 'id', id] }) }
    );
  };

  const auditTrail = Array.isArray(sourceWorkflow?.auditTrail)
    ? [...sourceWorkflow.auditTrail].sort((a, b) => new Date(b?.at || 0).getTime() - new Date(a?.at || 0).getTime())
    : [];

  const formatAuditActor = (entry) => {
    const actor = entry?.actor;
    if (actor?.firstName || actor?.lastName) {
      return `${actor.firstName || ''} ${actor.lastName || ''}`.trim();
    }
    return actor?.username || actor?.email || translateText('System');
  };

  const formatAuditAction = (value = '') =>
    String(value || '')
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const requiredFields = isTranslationWorkspace
    ? [
      { key: 'translationTitle', label: translateText('Translation title'), done: Boolean(translationTitle.trim()) },
      { key: 'translationContent', label: translateText('Translation Content'), done: activeHasContent },
    ]
    : postType === 'video'
    ? [
      { key: 'language', label: translateText('Language'), done: Boolean(articleLanguage) },
      { key: 'title', label: translateText('Post Title'), done: Boolean(title.trim()) },
      { key: 'category', label: translateText('Category'), done: Boolean(categoryId) },
      { key: 'videoUrl', label: translateText('Facebook URL'), done: Boolean(normalizedVideoUrl) },
    ]
    : [
      { key: 'language', label: translateText('Language'), done: Boolean(articleLanguage) },
      { key: 'title', label: translateText('Post Title'), done: Boolean(title.trim()) },
      { key: 'category', label: translateText('Category'), done: Boolean(categoryId) },
      { key: 'content', label: translateText('Post Content'), done: hasEditorContent },
    ];
  const completedRequiredCount = requiredFields.filter((field) => field.done).length;

  return (
    <>
      <Helmet>
        <title>{`${translateText(id ? 'Edit Post' : 'New Post')} - Bassac Post`}</title>
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
              {translateText(id ? 'Edit Post' : 'New Post')}
            </h1>
            <p className="text-sm text-dark-500">{translateText('Create and publish amazing content')}</p>
          </div>
        </div>
        <div className="hidden md:flex gap-2 items-center">
          {id && canViewInsights && (
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
            disabled={!isSourceWorkspace || !title || !editorData}
          >
            {translateText('Preview')}
          </Button>
          {canSaveSourceContent && isSourceWorkspace && (
            <>
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
            </>
          )}
          {isTranslationContributorRole && isEditMode && isTranslationWorkspace && (
            <>
              <Button
                leftIcon={<Send className="w-4 h-4" />}
                onClick={handleSubmitTranslationForReview}
                isLoading={isSavingTranslation || isSubmittingTranslation}
                disabled={!translatorCanSubmitTranslation}
              >
                {translateText('Submit Translation')}
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={handleSaveTranslation}
                isLoading={isSavingTranslation}
                disabled={!isAssignedTranslator}
              >
                {translateText('Save Translation')}
              </Button>
            </>
          )}
          {isEditorRole && editorCanReviewSource && (
            <>
              <Button
                leftIcon={<CheckCircle className="w-4 h-4" />}
                onClick={handleApproveSource}
                isLoading={isApprovingSource}
              >
                {translateText('Approve Source')}
              </Button>
              <Button
                variant="danger"
                onClick={handleRejectSource}
                isLoading={isRejectingSource}
              >
                {translateText('Request Changes')}
              </Button>
            </>
          )}
          {isEditorRole && editorCanReviewTranslation && (
            <>
              <Button
                leftIcon={<CheckCircle className="w-4 h-4" />}
                onClick={handleApproveTranslation}
                isLoading={isApprovingTranslation}
              >
                {translateText('Approve Translation')}
              </Button>
              <Button
                variant="danger"
                onClick={handleRejectTranslation}
                isLoading={isRejectingTranslation}
              >
                {translateText('Request Translation Changes')}
              </Button>
            </>
          )}
          {isAdminRole && adminCanFinalReview && (
            <>
              <Button
                leftIcon={<CheckCircle className="w-4 h-4" />}
                onClick={handleFinalApprove}
                isLoading={isFinalApproving}
              >
                {translateText('Publish')}
              </Button>
              <Button
                variant="danger"
                onClick={handleFinalReject}
                isLoading={isFinalRejecting}
              >
                {translateText('Reject')}
              </Button>
            </>
          )}
          {(isEditorRole || isAdminRole) &&
            !editorCanReviewSource &&
            !editorCanReviewTranslation &&
            !adminCanFinalReview && (
              <span className="text-xs px-3 py-2 rounded-lg bg-dark-100 dark:bg-dark-800 text-dark-500">
                {translateText('No stage actions available')}
              </span>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24 md:pb-0">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <label className="label mb-1">{translateText('Post Type *')}</label>
                  <p className="text-xs text-dark-500">
                    {translateText('Select type first. Required fields update automatically.')}
                  </p>
                </div>
                <div className="inline-flex rounded-xl border border-dark-200 dark:border-dark-700 p-1 bg-dark-50 dark:bg-dark-800">
                  <button
                    type="button"
                    onClick={() => setPostType('news')}
                    disabled={isTranslationWorkspace}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${postType === 'news'
                      ? 'bg-white dark:bg-dark-900 text-primary-700 dark:text-primary-300 shadow-sm'
                      : 'text-dark-600 dark:text-dark-300 hover:text-dark-900 dark:hover:text-white'
                      }`}
                  >
                    <FileText className="w-4 h-4" />
                    {translateText('News')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType('video')}
                    disabled={isTranslationWorkspace}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${postType === 'video'
                      ? 'bg-white dark:bg-dark-900 text-primary-700 dark:text-primary-300 shadow-sm'
                      : 'text-dark-600 dark:text-dark-300 hover:text-dark-900 dark:hover:text-white'
                      }`}
                  >
                    <Clapperboard className="w-4 h-4" />
                    {translateText('Video')}
                  </button>
                </div>
              </div>

              {!isEditMode ? (
                <div className="w-full sm:w-60">
                  <label className="label mb-1">{translateText('Language *')}</label>
                  <select
                    value={articleLanguage}
                    onChange={(event) => handleWorkspaceLanguageChange(event.target.value)}
                    className="input"
                    disabled={!canSaveSourceContent}
                  >
                    {CMS_LANGUAGES.map((languageOption) => (
                      <option key={languageOption.code} value={languageOption.code}>
                        {translateText(languageOption.label)} ({languageOption.code.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="w-full sm:w-80">
                  <label className="label mb-1">{translateText('Edit language')}</label>
                  <select
                    value={workspaceLanguage}
                    onChange={(event) => handleWorkspaceLanguageChange(event.target.value)}
                    className="input"
                  >
                    <option value={baseLanguage}>
                      {translateText('Source')} - {translateText(languageLabelMap[baseLanguage] || baseLanguage.toUpperCase())} ({baseLanguage.toUpperCase()})
                    </option>
                    {editableTranslationLanguages.map((languageOption) => (
                      <option key={languageOption.code} value={languageOption.code}>
                        {translateText(languageLabelMap[languageOption.code] || languageOption.code.toUpperCase())} ({languageOption.code.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded-xl border border-dark-200 dark:border-dark-700 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-dark-900 dark:text-white">{translateText('Required Fields')}</p>
                  <span className="text-xs text-dark-500">
                    {completedRequiredCount}/{requiredFields.length} {translateText('completed')}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {requiredFields.map((field) => (
                    <div
                      key={field.key}
                      className={`rounded-lg px-3 py-2 text-sm border ${field.done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
                        : 'border-dark-200 bg-dark-50 text-dark-600 dark:border-dark-700 dark:bg-dark-800/60 dark:text-dark-300'
                        }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {field.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {isSourceWorkspace && postType === 'video' && (
                <div className="rounded-xl border border-primary-200 dark:border-primary-900/40 bg-primary-50/60 dark:bg-primary-900/10 p-3 sm:p-4">
                  <Input
                    label="Facebook URL *"
                    placeholder="https://www.facebook.com/.../videos/..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onBlur={(e) => {
                      const normalizedFacebook = normalizeFacebookUrl(e.target.value);
                      if (normalizedFacebook) {
                        setVideoUrl(normalizedFacebook);
                        return;
                      }
                      const normalizedExternal = normalizeExternalUrl(e.target.value);
                      if (normalizedExternal) {
                        setVideoUrl(normalizedExternal);
                      }
                    }}
                    error={videoUrlError}
                  />
                  <p className="text-xs text-dark-500 mt-2">
                    {translateText('Paste a public Facebook video, reel, or post link')}
                  </p>
                  {videoEmbed && (
                    <div className="mt-3 rounded-xl border border-dark-200 dark:border-dark-700 overflow-hidden bg-white dark:bg-dark-900">
                      <div className={videoEmbed.aspectClass}>
                        <iframe
                          title={translateText('Video preview')}
                          src={videoEmbed.src}
                          className="w-full h-full border-0"
                          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="origin-when-cross-origin"
                        />
                      </div>
                      <div className="p-3 bg-dark-50 dark:bg-dark-800/60">
                        <a
                          href={normalizedVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm link-primary"
                        >
                          {translateText('Open on Facebook')} <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="card p-4 sm:p-6">
            <Input
              label={isSourceWorkspace ? translateText('Post Title *') : `${translateText('Translation title')} *`}
              placeholder={isSourceWorkspace ? translateText('Enter a compelling title...') : translateText('Translated title')}
              value={activeTitle}
              onChange={(e) => {
                if (isSourceWorkspace) {
                  setTitle(e.target.value);
                } else {
                  setTranslationTitle(e.target.value);
                }
              }}
              className="text-2xl sm:text-2xl font-bold"
              required
              maxLength={200}
            />
            <p className="text-xs text-dark-500 mt-1">{activeTitle.length}/200 {translateText('characters')}</p>
          </div>

          {/* Featured Image */}
          {isSourceWorkspace ? (
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
                    {translateText('Upload a featured image for your post')}
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
          ) : (
            <div className="card p-4 sm:p-6 bg-dark-50 dark:bg-dark-800">
              <p className="text-sm text-dark-600 dark:text-dark-300">
                {translateText('Featured image is managed in source language mode.')}
              </p>
            </div>
          )}

          {/* Editor.js Container */}
          <div className="card p-6">
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="label mb-0">
                  {isSourceWorkspace
                    ? postType === 'video'
                      ? translateText('Post Content (optional for video)')
                      : translateText('Post Content *')
                    : `${translateText('Translation Content')} (${activeLanguageCode.toUpperCase()}) *`}
                </label>
                {isTranslationWorkspace && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300">
                    {workspaceTranslation
                      ? `${translateText('Status')}: ${translateText(activeTranslationStatus)}`
                      : `${translateText('No translation yet')}: ${activeLanguageCode.toUpperCase()}`}
                  </span>
                )}
              </div>
              <p className="text-xs text-dark-500">
                {isSourceWorkspace
                  ? postType === 'video'
                    ? translateText('Optional caption or context for this video post')
                    : translateText('Use rich text formatting')
                  : `${translateText('Editing translation in')} ${translateText(activeLanguageLabel)} (${activeLanguageCode.toUpperCase()})`}
              </p>
            </div>
            {isEditMode && isArticleError && isSourceWorkspace && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {translateText('Failed to load post content. Please refresh or try again.')}
              </div>
            )}
            {isEditMode && !isEditorReady ? (
              <ContentLoader mode="spinner" className="min-h-[320px]" />
            ) : (
              isSourceWorkspace ? (
                <EditorComponent
                  ref={editorRef}
                  key={isEditMode ? id : 'new'}
                  data={editorData}
                  onChange={handleEditorChange}
                  placeholder={postType === 'video'
                    ? translateText('Optional caption, context, or transcript...')
                    : translateText('Start writing your post...')}
                />
              ) : (
                <EditorComponent
                  ref={translationEditorRef}
                  key={translationEditorKey}
                  data={translationEditorData}
                  onChange={handleTranslationEditorChange}
                  placeholder={`${translateText('Write translated content in')} ${activeLanguageCode.toUpperCase()}...`}
                />
              )
            )}
            {isTranslationWorkspace && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between text-xs text-dark-500">
                  <span>
                    {translateText('Source language')}: {baseLanguage.toUpperCase()} • {translateText('Target language')}: {activeLanguageCode.toUpperCase()}
                  </span>
                </div>
                {isTranslationContributorRole && !isAssignedTranslator && (
                  <p className="text-xs text-amber-600">
                    {translateText('This post is assigned to another translator. You can view but cannot submit translation.')}
                  </p>
                )}
                {isTranslationContributorRole && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-xs text-dark-500">
                      <input
                        type="checkbox"
                        checked={isTranslationMachine}
                        onChange={(event) => setIsTranslationMachine(event.target.checked)}
                        className="rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                      />
                      {translateText('Mark as machine translated')}
                    </label>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => runAutoTranslate(activeLanguageCode, { force: true })}
                      isLoading={isAutoTranslating}
                      disabled={!translatorCanSubmitTranslation}
                    >
                      {translateText('Auto Translate')}
                    </Button>
                  </div>
                )}
                {(isEditorRole || isAdminRole) && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-dark-100 dark:bg-dark-800 text-dark-500 inline-flex">
                    {translateText('Review actions are in the top bar based on current stage')}
                  </span>
                )}
              </div>
            )}
            {isSourceWorkspace && (
              postType === 'video' ? (
                <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <p className="text-sm text-primary-800 dark:text-primary-300">
                    {translateText('If left empty, excerpt/title will be used as fallback content automatically.')}
                  </p>
                </div>
              ) : (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {translateText('Tip: Use "/" to see formatting options. Drag blocks to reorder them.')}
                  </p>
                </div>
              )
            )}
            {isTranslationWorkspace && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  {translateText('Switch language to edit another translation in the same workspace.')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Excerpt */}
          <div className="card p-4 sm:p-6">
            <label className="label">
              {isSourceWorkspace ? translateText('Excerpt') : translateText('Translation excerpt')}
            </label>
            <textarea
              placeholder={
                isSourceWorkspace
                  ? translateText('Brief description of your post (shown in previews)')
                  : translateText('Brief translated description')
              }
              value={activeExcerpt}
              onChange={(e) => {
                if (isSourceWorkspace) {
                  setExcerpt(e.target.value);
                } else {
                  setTranslationExcerpt(e.target.value);
                }
              }}
              className="input min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-dark-500 mt-1">{activeExcerpt.length}/500 {translateText('characters')}</p>
          </div>

          {isTranslationWorkspace && (
            <div className="card p-4 sm:p-6 bg-dark-50 dark:bg-dark-800">
              <p className="text-sm text-dark-600 dark:text-dark-300">
                {translateText('Category, tags, and publish options are managed in source language mode.')}
              </p>
            </div>
          )}

          {isSourceWorkspace && (
            <>
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
                <label className="label">{translateText('Post Options')}</label>
                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-dark-50 dark:hover:bg-dark-800 rounded-lg">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-dark-700 dark:text-dark-300 font-medium">{translateText('Featured Post')}</span>
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
                    <span className="text-dark-700 dark:text-dark-300 font-medium">{translateText('Breaking Post')}</span>
                    <p className="text-xs text-dark-500">{translateText('Mark as breaking content')}</p>
                  </div>
                </label>
              </div>
            </>
          )}

          {/* Publishing Info */}
          <div className="card p-4 sm:p-6 bg-dark-50 dark:bg-dark-800">
            <h3 className="font-medium text-dark-900 dark:text-white mb-3">{translateText('Publishing Info')}</h3>
            <div className="space-y-2 text-sm text-dark-600 dark:text-dark-400">
              <div className="flex justify-between">
                <span>{translateText('Status')}:</span>
                <span className="font-medium">
                  {id ? translateText(articleResponse?.data?.article?.status) : translateText('Draft')}
                </span>
              </div>
              {id && articleResponse?.data?.article?.createdAt && (
                <div className="flex justify-between">
                  <span>{translateText('Created')}:</span>
                  <span className="font-medium">
                    {new Date(articleResponse.data.article.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {id && (
                <>
                  <div className="flex justify-between">
                    <span>{translateText('Source Stage')}:</span>
                    <span className="font-medium">{translateText(sourceReviewState)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{translateText('Translation Stage')}:</span>
                    <span className="font-medium">{translateText(translationWorkflowState)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{translateText('Admin Stage')}:</span>
                    <span className="font-medium">{translateText(adminApprovalState)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {id && (
            <div className="card p-4 sm:p-6">
              <h3 className="font-medium text-dark-900 dark:text-white mb-3">{translateText('Workflow Audit Trail')}</h3>
              {auditTrail.length > 0 ? (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {auditTrail.map((entry, index) => (
                    <div
                      key={`${entry?.action || 'entry'}-${entry?.at || index}-${index}`}
                      className="rounded-lg border border-dark-100 dark:border-dark-800 p-3"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-dark-900 dark:text-white">
                          {formatAuditAction(entry?.action)}
                        </span>
                        <StatusBadge status={entry?.after?.status || sourceArticle?.status || 'draft'} />
                      </div>
                      <p className="text-xs text-dark-500">
                        {translateText('By')}: {formatAuditActor(entry)} {entry?.actorRole ? `(${entry.actorRole})` : ''}
                      </p>
                      <p className="text-xs text-dark-500">
                        {entry?.at ? new Date(entry.at).toLocaleString() : '-'}
                      </p>
                      {entry?.notes ? (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/10 rounded px-2 py-1">
                          {entry.notes}
                        </p>
                      ) : null}
                      {entry?.before && entry?.after ? (
                        <p className="mt-2 text-[11px] text-dark-500">
                          {entry.before.sourceReviewState}/{entry.before.translationState}/{entry.before.adminApprovalState}
                          {' -> '}
                          {entry.after.sourceReviewState}/{entry.after.translationState}/{entry.after.adminApprovalState}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-dark-500">{translateText('No workflow transitions recorded yet')}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-dark-900/95 border-t border-dark-200 dark:border-dark-800 md:hidden safe-bottom">
        <div className="px-4 py-3">
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              leftIcon={<Eye className="w-4 h-4" />}
              onClick={handlePreview}
              disabled={!isSourceWorkspace || !title || !editorData}
            >
              {translateText('Preview')}
            </Button>

            {canSaveSourceContent && isSourceWorkspace && (
              <div className="grid grid-cols-2 gap-2">
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
            )}

            {isTranslationContributorRole && isEditMode && isTranslationWorkspace && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => runAutoTranslate(activeLanguageCode, { force: true })}
                  isLoading={isAutoTranslating}
                  disabled={!translatorCanSubmitTranslation}
                >
                  {translateText('Auto Translate')}
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<Save className="w-4 h-4" />}
                  onClick={handleSaveTranslation}
                  isLoading={isSavingTranslation}
                  disabled={!isAssignedTranslator}
                >
                  {translateText('Save Translation')}
                </Button>
                <Button
                  leftIcon={<Send className="w-4 h-4" />}
                  onClick={handleSubmitTranslationForReview}
                  isLoading={isSavingTranslation || isSubmittingTranslation}
                  disabled={!translatorCanSubmitTranslation}
                  className="col-span-2"
                >
                  {translateText('Submit Translation')}
                </Button>
              </div>
            )}

            {isEditorRole && editorCanReviewSource && (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleApproveSource} isLoading={isApprovingSource}>
                  {translateText('Approve Source')}
                </Button>
                <Button variant="danger" onClick={handleRejectSource} isLoading={isRejectingSource}>
                  {translateText('Request Changes')}
                </Button>
              </div>
            )}

            {isEditorRole && editorCanReviewTranslation && (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleApproveTranslation} isLoading={isApprovingTranslation}>
                  {translateText('Approve Translation')}
                </Button>
                <Button variant="danger" onClick={handleRejectTranslation} isLoading={isRejectingTranslation}>
                  {translateText('Reject Translation')}
                </Button>
              </div>
            )}

            {isAdminRole && adminCanFinalReview && (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleFinalApprove} isLoading={isFinalApproving}>
                  {translateText('Publish')}
                </Button>
                <Button variant="danger" onClick={handleFinalReject} isLoading={isFinalRejecting}>
                  {translateText('Reject')}
                </Button>
              </div>
            )}

            {(isEditorRole || isAdminRole) &&
              !editorCanReviewSource &&
              !editorCanReviewTranslation &&
              !adminCanFinalReview && (
                <p className="text-xs text-dark-500 text-center py-1">
                  {translateText('No stage actions available')}
                </p>
              )}
          </div>
          {id && canViewInsights && (
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
