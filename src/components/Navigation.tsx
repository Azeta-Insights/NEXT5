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
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 py-1 sm:py-1.5 safe-area-pb">
      <div className="max-w-md mx-auto px-2 flex items-center justify-between">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl relative transition-all duration-150 min-h-[44px] cursor-pointer ${
                isActive
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-500 hover:text-slate-300 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform ${isActive ? 'stroke-[2.2] scale-105 text-emerald-400' : 'stroke-[1.8]'}`} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[16px] h-4 bg-emerald-400 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight whitespace-nowrap select-none ${isActive ? 'text-emerald-400 font-bold' : 'text-slate-500 font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
