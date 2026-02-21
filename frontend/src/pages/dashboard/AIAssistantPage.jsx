import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { useAI } from '../../hooks/useApi';
import { Button, Textarea, Badge } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

export function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('grammar');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const { mutate: checkGrammar, isPending: isCheckingGrammar } = useAI('grammar-check');
  const { mutate: generateHeadline, isPending: isGeneratingHeadline } = useAI('headline-generator');
  const { mutate: generateSummary, isPending: isGeneratingSummary } = useAI('summary');
  const { mutate: analyzeSentiment, isPending: isAnalyzingSentiment } = useAI('sentiment-analysis');
  const { mutate: improveWriting, isPending: isImprovingWriting } = useAI('improve-writing');

  const tools = [
    { id: 'grammar', label: 'Grammar Check', icon: '📝', description: 'Fix grammar and spelling errors' },
    { id: 'headline', label: 'Headlines', icon: '📰', description: 'Generate catchy headlines' },
    { id: 'summary', label: 'Summarize', icon: '📋', description: 'Create concise summaries' },
    { id: 'sentiment', label: 'Sentiment', icon: '😊', description: 'Analyze text sentiment' },
    { id: 'improve', label: 'Improve', icon: '✨', description: 'Enhance your writing' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!inputText.trim()) {
      toast.error('Please enter some text');
      return;
    }

    setResult(null);

    const callbacks = {
      onSuccess: (response) => {
        setResult(response.data.data);
        toast.success('Analysis complete!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'AI analysis failed');
      }
    };

    switch (activeTab) {
      case 'grammar':
        checkGrammar({ text: inputText }, callbacks);
        break;
      case 'headline':
        generateHeadline({ text: inputText }, callbacks);
        break;
      case 'summary':
        generateSummary({ text: inputText }, callbacks);
        break;
      case 'sentiment':
        analyzeSentiment({ text: inputText }, callbacks);
        break;
      case 'improve':
        improveWriting({ text: inputText }, callbacks);
        break;
      default:
        break;
    }
  };

  const isLoading = isCheckingGrammar || isGeneratingHeadline || isGeneratingSummary || 
                     isAnalyzingSentiment || isImprovingWriting;

  return (
    <>
      <Helmet><title>AI Assistant - Bassac Post</title></Helmet>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-primary-600" />
          AI Writing Assistant
        </h1>
        <p className="text-dark-500">Enhance your content with AI-powered tools</p>
      </div>

      {/* Tool Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              setActiveTab(tool.id);
              setResult(null);
            }}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              activeTab === tool.id
                ? 'bg-primary-600 text-white'
                : 'bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
            }`}
          >
            <span className="mr-2">{tool.icon}</span>
            {tool.label}
          </button>
        ))}
      </div>

      {/* Active Tool Info */}
      <div className="card p-4 mb-6 bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500">
        <p className="text-sm text-dark-700 dark:text-dark-300">
          {tools.find(t => t.id === activeTab)?.description}
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <Textarea
            label="Your Text"
            placeholder={`Enter text to ${activeTab === 'grammar' ? 'check grammar' : 
                         activeTab === 'headline' ? 'generate headlines for' :
                         activeTab === 'summary' ? 'summarize' :
                         activeTab === 'sentiment' ? 'analyze sentiment of' :
                         'improve'}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-h-[200px]"
            required
          />
          
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-dark-500">
              {inputText.length} characters
            </p>
            <Button
              type="submit"
              isLoading={isLoading}
              leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            >
              Analyze
            </Button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="card p-6">
            <h2 className="font-semibold text-dark-900 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600" />
              Results
            </h2>

            {/* Grammar Check Results */}
            {activeTab === 'grammar' && result.corrections && (
              <div className="space-y-4">
                {result.corrections.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="warning">{result.corrections.length} issues found</Badge>
                    </div>
                    {result.corrections.map((correction, index) => (
                      <div key={index} className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-300 mb-2">
                          {correction.type || 'Suggestion'}
                        </p>
                        <p className="text-dark-700 dark:text-dark-300 mb-2">
                          <span className="line-through text-red-600">{correction.original}</span>
                          {' → '}
                          <span className="text-emerald-600 font-medium">{correction.suggestion}</span>
                        </p>
                        {correction.explanation && (
                          <p className="text-sm text-dark-600 dark:text-dark-400">
                            {correction.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">✓</span>
                    </div>
                    <p className="text-emerald-600 font-medium">No issues found!</p>
                    <p className="text-sm text-dark-500">Your text looks great.</p>
                  </div>
                )}
              </div>
            )}

            {/* Headline Generation Results */}
            {activeTab === 'headline' && result.headlines && (
              <div className="space-y-3">
                {result.headlines.map((headline, index) => (
                  <div
                    key={index}
                    className="p-4 bg-dark-50 dark:bg-dark-800 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors cursor-pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(headline);
                      toast.success('Headline copied to clipboard!');
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-primary-600 font-bold text-lg">{index + 1}</span>
                      <p className="text-dark-900 dark:text-white font-medium flex-1">
                        {headline}
                      </p>
                    </div>
                  </div>
                ))}
                <p className="text-sm text-dark-500 text-center mt-4">
                  Click any headline to copy
                </p>
              </div>
            )}

            {/* Summary Results */}
            {activeTab === 'summary' && result.summary && (
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <p className="text-dark-700 dark:text-dark-300 leading-relaxed">
                  {result.summary}
                </p>
              </div>
            )}

            {/* Sentiment Analysis Results */}
            {activeTab === 'sentiment' && result.sentiment && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-2xl font-bold ${
                    result.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                    result.sentiment === 'negative' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                  }`}>
                    {result.sentiment === 'positive' ? '😊' : result.sentiment === 'negative' ? '😞' : '😐'}
                    <span className="capitalize">{result.sentiment}</span>
                  </div>
                </div>
                {result.confidence && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-dark-500">Confidence</span>
                      <span className="font-medium text-dark-900 dark:text-white">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-dark-100 dark:bg-dark-800 rounded-full h-3">
                      <div
                        className="bg-primary-600 h-3 rounded-full transition-all"
                        style={{ width: `${result.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {result.explanation && (
                  <p className="text-dark-600 dark:text-dark-400 text-center">
                    {result.explanation}
                  </p>
                )}
              </div>
            )}

            {/* Writing Improvement Results */}
            {activeTab === 'improve' && result.improved && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-l-4 border-emerald-500">
                  <h3 className="font-medium text-emerald-900 dark:text-emerald-300 mb-2">
                    Improved Version
                  </h3>
                  <p className="text-dark-700 dark:text-dark-300 leading-relaxed whitespace-pre-wrap">
                    {result.improved}
                  </p>
                </div>
                {result.suggestions && result.suggestions.length > 0 && (
                  <div>
                    <h3 className="font-medium text-dark-900 dark:text-white mb-3">
                      Suggestions
                    </h3>
                    <ul className="space-y-2">
                      {result.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2 text-dark-600 dark:text-dark-400">
                          <span className="text-primary-600">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </form>

      {/* Info Card */}
      <div className="card p-6 mt-6 bg-dark-50 dark:bg-dark-800">
        <h3 className="font-medium text-dark-900 dark:text-white mb-2">
          💡 Tip: Make the most of AI Assistant
        </h3>
        <ul className="space-y-1 text-sm text-dark-600 dark:text-dark-400">
          <li>• Use Grammar Check to catch errors before publishing</li>
          <li>• Generate multiple headline options and pick the best</li>
          <li>• Create summaries for long articles to use as excerpts</li>
          <li>• Check sentiment to ensure your tone matches your intent</li>
          <li>• Use Improve to enhance clarity and readability</li>
        </ul>
      </div>
    </>
  );
}
