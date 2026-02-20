import { useState } from 'react';
import { Check } from 'lucide-react';

const PLACEMENTS = [
  {
    id: 'popup',
    name: 'Popup / Modal',
    icon: '🎯',
    description: 'Center screen overlay - High impact',
    features: ['Center overlay', 'Auto-close option', 'High visibility'],
    bestFor: 'Important announcements, special offers',
    preview: '/images/placements/popup.svg',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'top_banner',
    name: 'Top Banner',
    icon: '📍',
    description: 'Top of page banner - Always visible',
    features: ['Site-wide notice', 'Sticky option', 'Dismissible'],
    bestFor: 'Ongoing promotions, news updates',
    preview: '/images/placements/top-banner.svg',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'in_content',
    name: 'In-Content',
    icon: '📰',
    description: 'Native ads within articles - Blends naturally',
    features: ['Between paragraphs', 'Native style', 'Non-intrusive'],
    bestFor: 'Sponsored content, related products',
    preview: '/images/placements/in-content.svg',
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'sidebar',
    name: 'Sidebar',
    icon: '📊',
    description: 'Right/left sidebar - Persistent visibility',
    features: ['Sticky scroll', 'Multiple ads', 'Responsive'],
    bestFor: 'Display ads, partner logos',
    preview: '/images/placements/sidebar.svg',
    color: 'from-orange-500 to-amber-500',
  },
  {
    id: 'floating',
    name: 'Floating / Sticky',
    icon: '🎈',
    description: 'Bottom-right corner - Always present',
    features: ['Fixed position', 'Minimizable', 'Dismissible'],
    bestFor: 'Chat prompts, persistent CTAs',
    preview: '/images/placements/floating.svg',
    color: 'from-red-500 to-rose-500',
  },
  {
    id: 'footer_banner',
    name: 'Footer Banner',
    icon: '📝',
    description: 'Bottom of page - End-of-content',
    features: ['Full-width', 'Sticky option', 'Low intrusion'],
    bestFor: 'Newsletter signup, footer promotions',
    preview: '/images/placements/footer-banner.svg',
    color: 'from-indigo-500 to-violet-500',
  },
];

export default function PlacementPicker({ value, onChange, className = '' }) {
  const [hoveredPlacement, setHoveredPlacement] = useState(null);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Choose Placement
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select where your campaign will be displayed
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLACEMENTS.map((placement) => {
          const isSelected = value === placement.id;
          const isHovered = hoveredPlacement === placement.id;

          return (
            <button
              key={placement.id}
              onClick={() => onChange(placement.id)}
              onMouseEnter={() => setHoveredPlacement(placement.id)}
              onMouseLeave={() => setHoveredPlacement(null)}
              className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Icon with gradient */}
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${placement.color} flex items-center justify-center mb-3`}>
                <span className="text-2xl">{placement.icon}</span>
              </div>

              {/* Name */}
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                {placement.name}
              </h4>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {placement.description}
              </p>

              {/* Features */}
              <div className="space-y-1.5 mb-3">
                {placement.features.slice(0, 3).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                    {feature}
                  </div>
                ))}
              </div>

              {/* Best for */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  BEST FOR
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {placement.bestFor}
                </p>
              </div>

              {/* Hover effect */}
              {isHovered && !isSelected && (
                <div className="absolute inset-0 bg-blue-500/5 rounded-xl pointer-events-none"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected placement details */}
      {value && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            {(() => {
              const selected = PLACEMENTS.find(p => p.id === value);
              return (
                <>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selected.color} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-2xl">{selected.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {selected.name} Selected
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selected.description}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// Export placements for use in other components
export { PLACEMENTS };
