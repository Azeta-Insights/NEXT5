import React from 'react';
import { Target, Compass, Brain, Sparkles, MessageSquare } from 'lucide-react';

export type NavTab = 'today' | 'goals' | 'memory' | 'future' | 'coach';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingMovesCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  pendingMovesCount = 0,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'today', label: 'Today', icon: Compass, badge: pendingMovesCount },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'memory', label: 'Memory', icon: Brain },
    { id: 'future', label: 'Future Me', icon: Sparkles },
    { id: 'coach', label: 'AI Coach', icon: MessageSquare },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-stone-50/95 backdrop-blur-md border-t border-stone-200 py-1 sm:py-1.5 safe-area-pb">
      <div className="max-w-md mx-auto px-2 flex items-center justify-between">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl relative transition-all duration-150 min-h-[44px] ${
                isActive
                  ? 'text-stone-900 font-bold'
                  : 'text-stone-400 hover:text-stone-600 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform ${isActive ? 'stroke-[2.2] scale-105' : 'stroke-[1.8]'}`} />
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-stone-900 text-stone-50 text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight whitespace-nowrap select-none ${isActive ? 'text-stone-900 font-bold' : 'text-stone-400 font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-5 h-0.5 bg-stone-900 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
