import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
  en: {
    translation: {
      // Common
      common: {
        loading: 'Loading...',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        update: 'Update',
        search: 'Search',
        filter: 'Filter',
        clear: 'Clear',
        submit: 'Submit',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        confirm: 'Confirm',
        yes: 'Yes',
        no: 'No',
        close: 'Close',
        view: 'View',
        download: 'Download',
        upload: 'Upload',
        language: 'Language',
      },

      // Navigation
      nav: {
        home: 'Home',
        articles: 'News',
        categories: 'Categories',
        about: 'About',
        contact: 'Contact',
        dashboard: 'Dashboard',
        profile: 'Profile',
        settings: 'Settings',
        logout: 'Logout',
        login: 'Login',
        signup: 'Sign Up',
      },

      // Dashboard
      dashboard: {
        welcome: 'Welcome',
        overview: 'Overview',
        analytics: 'Analytics',
        myArticles: 'My News',
        allArticles: 'All News',
        pendingArticles: 'Pending News',
        users: 'Users',
        media: 'Media',
        comments: 'Comments',
        pages: 'Pages',
        settings: 'Settings',
        ads: 'Ads & Collections',
        newsletter: 'Newsletter',
      },

      // News
      articles: {
        title: 'News',
        newArticle: 'Create News',
        editArticle: 'Edit News',
        deleteArticle: 'Delete News',
        publishArticle: 'Publish News',
        draftArticle: 'Draft News',
        searchArticles: 'Search news...',
        noArticles: 'No news found',
        readMore: 'Read more',
        author: 'Author',
        category: 'Category',
        publishedOn: 'Published on',
        readTime: 'min read',
        views: 'Views',
        featured: 'Featured',
        breaking: 'Breaking',
        status: 'Status',
      },

      // Categories
      categories: {
        title: 'Categories',
        newCategory: 'New Category',
        editCategory: 'Edit Category',
        deleteCategory: 'Delete Category',
        searchCategories: 'Search categories...',
        noCategories: 'No categories found',
        articlesCount: 'news',
      },

      // Translations
      translations: {
        title: 'Translations',
        addTranslation: 'Add Translation',
        editTranslation: 'Edit Translation',
        deleteTranslation: 'Delete Translation',
        selectLanguage: 'Select Language',
        originalLanguage: 'Original Language',
        targetLanguage: 'Target Language',
        translationStatus: 'Translation Status',
        machineTranslated: 'Machine Translated',
        humanTranslated: 'Human Translated',
        draft: 'Draft',
        inProgress: 'In Progress',
        review: 'Review',
        published: 'Published',
        noTranslations: 'No translations available',
        availableLanguages: 'Available Languages',
        translateArticle: 'Translate News',
        translateCategory: 'Translate Category',
        viewOriginal: 'View Original',
        qualityScore: 'Quality Score',
      },

      // Language names
      languages: {
        en: 'English',
        km: 'Khmer',
        zh: 'Chinese',
        ja: 'Japanese',
        ko: 'Korean',
        th: 'Thai',
        vi: 'Vietnamese',
        fr: 'French',
        de: 'German',
        es: 'Spanish',
        pt: 'Portuguese',
        ru: 'Russian',
        ar: 'Arabic',
        hi: 'Hindi',
      },

      // Status
      status: {
        draft: 'Draft',
        pending: 'Pending',
        published: 'Published',
        rejected: 'Rejected',
        archived: 'Archived',
        active: 'Active',
        inactive: 'Inactive',
      },

      // Messages
      messages: {
        success: 'Success!',
        error: 'Error!',
        warning: 'Warning!',
        info: 'Info',
        saved: 'Saved successfully',
        updated: 'Updated successfully',
        deleted: 'Deleted successfully',
        created: 'Created successfully',
        published: 'Published successfully',
        unpublished: 'Unpublished successfully',
        confirmDelete: 'Are you sure you want to delete this?',
        confirmPublish: 'Are you sure you want to publish this?',
        noChanges: 'No changes to save',
        unsavedChanges: 'You have unsaved changes. Are you sure you want to leave?',
      },

      // Forms
      form: {
        title: 'Title',
        slug: 'Slug',
        content: 'Content',
        excerpt: 'Excerpt',
        description: 'Description',
        name: 'Name',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        image: 'Image',
        featuredImage: 'Featured Image',
        category: 'Category',
        tags: 'Tags',
        author: 'Author',
        date: 'Date',
        status: 'Status',
        seo: 'SEO',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta Description',
        metaKeywords: 'Meta Keywords',
        required: 'This field is required',
        invalid: 'This field is invalid',
        tooShort: 'This field is too short',
        tooLong: 'This field is too long',
      },

      // Errors
      errors: {
        general: 'Something went wrong',
        network: 'Network error. Please check your connection.',
        unauthorized: 'You are not authorized to perform this action',
        notFound: 'The requested resource was not found',
        serverError: 'Server error. Please try again later.',
        validation: 'Please check your input and try again',
      },
    },
  },

  km: {
    translation: {
      // Common
      common: {
        loading: 'កំពុងផ្ទុក...',
        save: 'រក្សាទុក',
        cancel: 'បោះបង់',
        delete: 'លុប',
        edit: 'កែសម្រួល',
        create: 'បង្កើត',
        update: 'ធ្វើបច្ចុប្បន្នភាព',
        search: 'ស្វែងរក',
        filter: 'តម្រង',
        clear: 'សម្អាត',
        submit: 'ដាក់ស្នើ',
        back: 'ថយក្រោយ',
        next: 'បន្ទាប់',
        previous: 'មុន',
        confirm: 'បញ្ជាក់',
        yes: 'បាទ/ចាស',
        no: 'ទេ',
        close: 'បិទ',
        view: 'មើល',
        download: 'ទាញយក',
        upload: 'ផ្ទុកឡើង',
        language: 'ភាសា',
      },

      // Navigation
      nav: {
        home: 'ទំព័រដើម',
        articles: 'អត្ថបទ',
        categories: 'ប្រភេទ',
        about: 'អំពី',
        contact: 'ទំនាក់ទំនង',
        dashboard: 'ផ្ទាំងគ្រប់គ្រង',
        profile: 'ប្រវត្តិរូប',
        settings: 'ការកំណត់',
        logout: 'ចាកចេញ',
        login: 'ចូល',
        signup: 'ចុះឈ្មោះ',
      },

      // Dashboard
      dashboard: {
        welcome: 'សូមស្វាគមន៍',
        overview: 'ទិដ្ឋភាពទូទៅ',
        analytics: 'វិភាគ',
        myArticles: 'អត្ថបទរបស់ខ្ញុំ',
        allArticles: 'អត្ថបទទាំងអស់',
        pendingArticles: 'អត្ថបទរង់ចាំ',
        users: 'អ្នកប្រើប្រាស់',
        media: 'មេឌៀ',
        comments: 'មតិយោបល់',
        pages: 'ទំព័រ',
        settings: 'ការកំណត់',
        ads: 'ការផ្សាយពាណិជ្ជកម្ម',
        newsletter: 'ព័ត៌មានសំខាន់ៗ',
      },

      // News
      articles: {
        title: 'អត្ថបទ',
        newArticle: 'អត្ថបទថ្មី',
        editArticle: 'កែសម្រួលអត្ថបទ',
        deleteArticle: 'លុបអត្ថបទ',
        publishArticle: 'បោះពុម្ពអត្ថបទ',
        draftArticle: 'សេចក្តីព្រាង',
        searchArticles: 'ស្វែងរកអត្ថបទ...',
        noArticles: 'រកមិនឃើញអត្ថបទ',
        readMore: 'អានបន្ថែម',
        author: 'អ្នកនិពន្ធ',
        category: 'ប្រភេទ',
        publishedOn: 'ផ្សាយនៅ',
        readTime: 'នាទីអាន',
        views: 'ទស្សនា',
        featured: 'លេចធ្លោ',
        breaking: 'ព័ត៌មានបន្ទាន់',
        status: 'ស្ថានភាព',
      },

      // Categories
      categories: {
        title: 'ប្រភេទ',
        newCategory: 'ប្រភេទថ្មី',
        editCategory: 'កែសម្រួលប្រភេទ',
        deleteCategory: 'លុបប្រភេទ',
        searchCategories: 'ស្វែងរកប្រភេទ...',
        noCategories: 'រកមិនឃើញប្រភេទ',
        articlesCount: 'អត្ថបទ',
      },

      // Translations
      translations: {
        title: 'ការបកប្រែ',
        addTranslation: 'បន្ថែមការបកប្រែ',
        editTranslation: 'កែសម្រួលការបកប្រែ',
        deleteTranslation: 'លុបការបកប្រែ',
        selectLanguage: 'ជ្រើសរើសភាសា',
        originalLanguage: 'ភាសាដើម',
        targetLanguage: 'ភាសាគោលដៅ',
        translationStatus: 'ស្ថានភាពការបកប្រែ',
        machineTranslated: 'បកប្រែដោយម៉ាស៊ីន',
        humanTranslated: 'បកប្រែដោយមនុស្ស',
        draft: 'សេចក្តីព្រាង',
        inProgress: 'កំពុងដំណើរការ',
        review: 'ពិនិត្យ',
        published: 'បានផ្សាយ',
        noTranslations: 'មិនមានការបកប្រែ',
        availableLanguages: 'ភាសាដែលមាន',
        translateArticle: 'បកប្រែអត្ថបទ',
        translateCategory: 'បកប្រែប្រភេទ',
        viewOriginal: 'មើលដើម',
        qualityScore: 'ពិន្ទុគុណភាព',
      },

      // Language names in Khmer
      languages: {
        en: 'អង់គ្លេស',
        km: 'ខ្មែរ',
        zh: 'ចិន',
        ja: 'ជប៉ុន',
        ko: 'កូរ៉េ',
        th: 'ថៃ',
        vi: 'វៀតណាម',
        fr: 'បារាំង',
        de: 'អាល្លឺម៉ង់',
        es: 'អេស្ប៉ាញ',
        pt: 'ព័រទុយហ្គាល់',
        ru: 'រុស្ស៊ី',
        ar: 'អារ៉ាប់',
        hi: 'ហិណ្ឌូ',
      },

      // Status
      status: {
        draft: 'សេចក្តីព្រាង',
        pending: 'រង់ចាំ',
        published: 'បានផ្សាយ',
        rejected: 'បដិសេធ',
        archived: 'ទុកក្នុងប័ណ្ណសារ',
        active: 'សកម្ម',
        inactive: 'អសកម្ម',
      },

      // Messages
      messages: {
        success: 'ជោគជ័យ!',
        error: 'កំហុស!',
        warning: 'ការព្រមាន!',
        info: 'ព័ត៌មាន',
        saved: 'រក្សាទុកដោយជោគជ័យ',
        updated: 'ធ្វើបច្ចុប្បន្នភាពដោយជោគជ័យ',
        deleted: 'លុបដោយជោគជ័យ',
        created: 'បង្កើតដោយជោគជ័យ',
        published: 'ផ្សាយដោយជោគជ័យ',
        unpublished: 'ឈប់ផ្សាយដោយជោគជ័យ',
        confirmDelete: 'តើអ្នកប្រាកដថាចង់លុបនេះទេ?',
        confirmPublish: 'តើអ្នកប្រាកដថាចង់ផ្សាយនេះទេ?',
        noChanges: 'មិនមានការផ្លាស់ប្តូរដែលត្រូវរក្សាទុក',
        unsavedChanges: 'អ្នកមានការផ្លាស់ប្តូរដែលមិនបានរក្សាទុក។ តើអ្នកប្រាកដថាចង់ចាកចេញទេ?',
      },

      // Forms
      form: {
        title: 'ចំណងជើង',
        slug: 'Slug',
        content: 'មាតិកា',
        excerpt: 'សង្ខេប',
        description: 'ការពិពណ៌នា',
        name: 'ឈ្មោះ',
        email: 'អ៊ីមែល',
        password: 'ពាក្យសម្ងាត់',
        confirmPassword: 'បញ្ជាក់ពាក្យសម្ងាត់',
        image: 'រូបភាព',
        featuredImage: 'រូបភាពលេចធ្លោ',
        category: 'ប្រភេទ',
        tags: 'ស្លាក',
        author: 'អ្នកនិពន្ធ',
        date: 'កាលបរិច្ឆេទ',
        status: 'ស្ថានភាព',
        seo: 'SEO',
        metaTitle: 'ចំណងជើង Meta',
        metaDescription: 'ការពិពណ៌នា Meta',
        metaKeywords: 'ពាក្យគន្លឹះ Meta',
        required: 'វាលនេះត្រូវបានទាមទារ',
        invalid: 'វាលនេះមិនត្រឹមត្រូវ',
        tooShort: 'វាលនេះខ្លីពេក',
        tooLong: 'វាលនេះវែងពេក',
      },

      // Errors
      errors: {
        general: 'មានអ្វីមួយខុសប្រក្រតី',
        network: 'កំហុសបណ្តាញ។ សូមពិនិត្យមើលការភ្ជាប់របស់អ្នក។',
        unauthorized: 'អ្នកមិនត្រូវបានអនុញ្ញាតឱ្យធ្វើសកម្មភាពនេះទេ',
        notFound: 'រកមិនឃើញធនធានដែលបានស្នើសុំ',
        serverError: 'កំហុសម៉ាស៊ីនមេ។ សូមព្យាយាមម្តងទៀតនៅពេលក្រោយ។',
        validation: 'សូមពិនិត្យមើលការបញ្ចូលរបស់អ្នក ហើយព្យាយាមម្តងទៀត',
      },
    },
  },
};

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: 'en',
    lng: 'en', // Default language
    debug: import.meta.env.DEV, // Enable debug mode in development

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      // Order of language detection
      order: ['querystring', 'cookie', 'localStorage', 'navigator'],
      // Keys for language detection
      lookupQuerystring: 'lang',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
      // Cache user language
      caches: ['localStorage', 'cookie'],
    },

    react: {
      useSuspense: true,
    },
  });

export default i18n;
