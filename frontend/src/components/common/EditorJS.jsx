import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Paragraph from '@editorjs/paragraph';
import Quote from '@editorjs/quote';
import ImageTool from '@editorjs/image';
import CodeTool from '@editorjs/code';
import Delimiter from '@editorjs/delimiter';
import Table from '@editorjs/table';
import Embed from '@editorjs/embed';
import LinkTool from '@editorjs/link';
import Marker from '@editorjs/marker';
import InlineCode from '@editorjs/inline-code';
import { buildApiUrl } from '../../utils';

// Get auth token from localStorage - moved outside component to avoid recreation
const getAuthToken = () => {
  const state = localStorage.getItem('bassac-auth');
  if (state) {
    try {
      const parsed = JSON.parse(state);
      return parsed.state?.accessToken;
    } catch (e) {
      return null;
    }
  }
  return null;
};

const getCsrfTokenFromCookie = () => {
  const match = document.cookie.match(/csrf-token=([^;]+)/);
  return match ? match[1] : null;
};

const ensureCsrfToken = async () => {
  let token = getCsrfTokenFromCookie();
  if (token) return token;

  try {
    const response = await fetch(buildApiUrl('/auth/csrf-token'), {
      method: 'GET',
      credentials: 'include',
    });
    if (response.ok) {
      const result = await response.json();
      token = result?.data?.csrfToken || getCsrfTokenFromCookie();
    }
  } catch (error) {
    console.warn('Failed to fetch CSRF token:', error);
  }

  return token;
};

const EditorComponent = forwardRef(({ data, onChange, placeholder }, ref) => {
  const editorRef = useRef(null);
  const instanceRef = useRef(null);
  const isInitialized = useRef(false);
  const initialData = useRef(data);

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (instanceRef.current && instanceRef.current.save) {
        try {
          return await instanceRef.current.save();
        } catch (error) {
          console.error('Error saving editor content:', error);
          return null;
        }
      }
      return null;
    },
    clear: () => {
      if (instanceRef.current && instanceRef.current.clear) {
        instanceRef.current.clear();
      }
    },
    destroy: () => {
      if (instanceRef.current && instanceRef.current.destroy) {
        instanceRef.current.destroy();
        instanceRef.current = null;
        isInitialized.current = false;
      }
    }
  }));

  // Update initial data ref when data changes (for edit mode)
  useEffect(() => {
    if (data && !isInitialized.current) {
      initialData.current = data;
    }
  }, [data]);

  // Do not re-render content after initialization to avoid EditorJS reset loops.

  useEffect(() => {
    if (!editorRef.current || isInitialized.current) return;

    const initEditor = async () => {
      // Prevent multiple initializations
      if (isInitialized.current || instanceRef.current) return;
      
      isInitialized.current = true;

      try {
        instanceRef.current = new EditorJS({
          holder: editorRef.current,
          placeholder: placeholder || 'Start writing your article...',
          minHeight: 300,
          data: initialData.current || { blocks: [] },
          onChange: async () => {
            if (onChange && instanceRef.current && instanceRef.current.save) {
              try {
                const content = await instanceRef.current.save();
                onChange(content);
              } catch (error) {
                console.error('Error in onChange:', error);
              }
            }
          },
          tools: {
            header: {
              class: Header,
              config: {
                levels: [1, 2, 3, 4, 5, 6],
                defaultLevel: 2
              }
            },
            paragraph: {
              class: Paragraph,
              inlineToolbar: true
            },
            list: {
              class: List,
              inlineToolbar: true,
              config: {
                defaultStyle: 'unordered'
              }
            },
            quote: {
              class: Quote,
              inlineToolbar: true,
              config: {
                quotePlaceholder: 'Enter a quote',
                captionPlaceholder: 'Quote author'
              }
            },
              image: {
                  class: ImageTool,
                  config: {
                      uploader: {
                          uploadByFile: async (file) => {
                              const formData = new FormData();
                              formData.append('file', file);
                              formData.append('folder', 'articles');

                              try {
                                  const token = getAuthToken();
                                  const csrfToken = await ensureCsrfToken();
                                  const response = await fetch(buildApiUrl('/uploads'), {
                                      method: 'POST',
                                      headers: {
                                          'Authorization': `Bearer ${token}`,
                                          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
                                      },
                                      credentials: 'include',
                                      body: formData
                                  });

                                  if (!response.ok) {
                                      const error = await response.json();
                                      console.error('Upload error:', error);
                                      throw new Error(error.message || 'Upload failed');
                                  }

                                  const result = await response.json();

                                  return {
                                      success: 1,
                                      file: {
                                          url: result.data.media.url
                                      }
                                  };
                              } catch (error) {
                                  console.error('Image upload failed:', error);
                                  return {
                                      success: 0,
                                      message: error.message || 'Upload failed'
                                  };
                              }
                          },
                          uploadByUrl: async (url) => {
                              return {
                                  success: 1,
                                  file: {
                                      url: url
                                  }
                              };
                          }
                      }
                  }
              },
            code: {
              class: CodeTool,
              config: {
                placeholder: 'Enter code here...'
              }
            },
            delimiter: Delimiter,
            table: {
              class: Table,
              inlineToolbar: true
            },
            embed: {
              class: Embed,
              config: {
                services: {
                  youtube: true,
                  twitter: true,
                  instagram: true,
                  codepen: true,
                  vimeo: true
                }
              }
            },
            linkTool: {
              class: LinkTool,
              config: {
                endpoint: buildApiUrl('/fetch-url')
              }
            },
            marker: {
              class: Marker
            },
            inlineCode: {
              class: InlineCode
            }
          },
          onReady: () => {
            // Editor is ready
          }
        });
      } catch (error) {
        console.error('Failed to initialize editor:', error);
        isInitialized.current = false;
      }
    };

    initEditor();

    return () => {
      if (instanceRef.current && instanceRef.current.destroy) {
        try {
          instanceRef.current.destroy();
        } catch (error) {
          console.error('Error destroying editor:', error);
        }
        instanceRef.current = null;
        isInitialized.current = false;
      }
    };
  }, []); // Empty dependency array - only initialize once

  return (
    <div className="editor-wrapper">
      <div 
        ref={editorRef} 
        className="prose prose-lg max-w-none dark:prose-invert min-h-[400px] border border-dark-200 dark:border-dark-700 rounded-lg p-4"
      />
    </div>
  );
});

EditorComponent.displayName = 'EditorComponent';

export default EditorComponent;
