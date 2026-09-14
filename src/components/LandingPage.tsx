import React from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  Sliders, 
  ShieldAlert, 
  Compass, 
  Zap, 
  CheckCircle2, 
  Layers,
  ChevronRight,
  User
} from 'lucide-react';
import { UserProfile } from '../types';

interface LandingPageProps {
  user?: UserProfile;
  onGetStarted: () => void;
  onOpenAuth?: () => void;
}

/**
 * Precision Modern Geometric '5' SVG Logo
 * Replaces the default circle with a sharp, angular, faceted obsidian & emerald monogram.
 */
export const Next5Logo: React.FC<{ className?: string; size?: number }> = ({ 
  className = "w-10 h-10", 
  size = 44 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="NEXT5 Logo"
    >
      <defs>
        {/* Obsidian Glass Gradient for upper chassis */}
        <linearGradient id="n5-obsidian-chassis" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>

        {/* Emerald Core Gradient */}
        <linearGradient id="n5-emerald-primary" x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="45%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* Indigo / Cyan Micro-Accent */}
        <linearGradient id="n5-indigo-glow" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.2" />
        </linearGradient>

        {/* Outer Bevel Shadow */}
        <filter id="n5-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Outer Hexagonal Shield Frame */}
      <rect
        x="2.5"
        y="2.5"
        width="43"
        height="43"
        rx="12"
        fill="url(#n5-obsidian-chassis)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.2"
      />

      {/* Precision Geometric '5' Monogram */}
      <g filter="url(#n5-glow)">
        {/* Top Horizontal Bar with 45° chamfer */}
        <path
          d="M12 11H35.5L32.5 17.5H12V11Z"
          fill="url(#n5-emerald-primary)"
        />

        {/* Vertical Stem dropping to middle nexus */}
        <path
          d="M12 17.5H18.5V23.5H12V17.5Z"
          fill="#34d399"
          fillOpacity="0.9"
        />

        {/* Middle Crossbar with angular bevel */}
        <path
          d="M12 23.5H31L34.5 28.5H16.5L12 23.5Z"
          fill="url(#n5-emerald-primary)"
        />

        {/* Lower Sweeping Angular Loop */}
        <path
          d="M34.5 28.5L35.5 35L29 40H14.5L12 36H27L30 33.5L29 30.5L16.5 30.5L13.5 26.5L16.5 26.5L30.5 26.5L34.5 28.5Z"
          fill="url(#n5-emerald-primary)"
        />

        {/* Strategic Accent Facet (Geometric Diamond Pin) */}
        <path
          d="M36.5 12.5L40 16L36.5 19.5L33 16L36.5 12.5Z"
          fill="#38bdf8"
          fillOpacity="0.85"
        />
      </g>
    </svg>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ user, onGetStarted, onOpenAuth }) => {
  const isUserSignedIn = Boolean(user?.email || (user?.name && user.name !== 'User' && user.name !== 'Private Guest'));

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-50 overflow-hidden flex flex-col justify-between selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* 1. Ambient Obsidian Background Effects */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,rgba(16,185,129,0.18),transparent_70%)]" 
        aria-hidden="true"
      />
      <div 
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_50%_40%_at_85%_25%,rgba(99,102,241,0.12),transparent_65%)]" 
        aria-hidden="true"
      />
      <div 
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_40%_35%_at_15%_80%,rgba(16,185,129,0.08),transparent_60%)]" 
        aria-hidden="true"
      />

      {/* Subtle Noise / Grid Pattern Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" 
        aria-hidden="true"
      />

      {/* 2. Top Header Navigation */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <Next5Logo size={42} className="shrink-0" />
          <div className="flex flex-col">
            <span className="font-extrabold tracking-tight text-xl text-slate-50 font-mono">
              NEXT<span className="text-emerald-400">5</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Focus On What Matters
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isUserSignedIn ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-slate-200">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="font-semibold text-slate-100">{user?.name ? user.name.split(' ')[0] : 'Member'}</span>
            </div>
          ) : onOpenAuth ? (
            <button
              type="button"
              id="landing-login-nav-btn"
              onClick={onOpenAuth}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3.5 py-1.5 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors duration-200 flex items-center gap-1.5 shadow-2xs"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          ) : null}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Ready to prioritize</span>
          </div>
        </div>
      </header>

      {/* 3. Main Hero & Bento-Grid Section */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        <div className="space-y-12 sm:space-y-14">
          
          {/* Hero Headlines & Subtitle */}
          <div className="max-w-3xl space-y-6">
            {/* Pill Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Prioritization Over Procrastination</span>
            </div>

            {/* Massive Commanding Headline with Gradient Text Clip */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.06] text-slate-100">
              Your next{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">
                five moves.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-slate-400 text-lg sm:text-xl font-normal leading-relaxed max-w-2xl">
              You don’t need to figure everything out. Just know what matters next.
              NEXT5 eliminates the cognitive load of endless backlogs and gives you crisp, continuous execution.
            </p>
          </div>

          {/* 4. Glowing Bento-Box Feature Grid (Frosted Micro-Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Bento Card 1: Dynamic Execution */}
            <div className="group relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-emerald-500/40 p-6 sm:p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/40 flex flex-col justify-between overflow-hidden">
              <div 
                className="pointer-events-none absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" 
                aria-hidden="true" 
              />
              
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                    No rigid to-do lists
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Dynamically recalculates your highest-leverage actions based on your actual energy, available time, and changing deadlines.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-emerald-400 font-semibold">DYNAMIC FOCUS</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            {/* Bento Card 2: Negative Constraints */}
            <div className="group relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-indigo-500/40 p-6 sm:p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/40 flex flex-col justify-between overflow-hidden">
              <div 
                className="pointer-events-none absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors" 
                aria-hidden="true" 
              />
              
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                    Negative constraints
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Explicitly dictates what <em>not</em> to do today. Shield yourself from false urgencies and avoid getting trapped in low-impact busywork.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-indigo-400 font-semibold">NO BUSYWORK</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            {/* Bento Card 3: Sovereign Control */}
            <div className="group relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-teal-500/40 p-6 sm:p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/40 flex flex-col justify-between overflow-hidden">
              <div 
                className="pointer-events-none absolute -right-10 -top-10 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-colors" 
                aria-hidden="true" 
              />
              
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                    You stay in control
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                    You make the strategic decisions. NEXT5 does the ruthless sequencing, filtering conversational clutter into actionable moves.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-teal-400 font-semibold">YOU'RE IN CHARGE</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

          </div>

          {/* 5. CTA High-Contrast Focal Point */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <button
              id="onboarding-get-started-btn"
              onClick={onGetStarted}
              className="relative group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-9 py-4 rounded-xl text-base font-extrabold text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 hover:from-emerald-300 hover:to-teal-200 shadow-[0_0_35px_rgba(52,211,153,0.38)] hover:shadow-[0_0_50px_rgba(52,211,153,0.6)] transition-all duration-300 transform active:scale-[0.98] cursor-pointer"
            >
              <span className="tracking-tight">Get started</span>
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>

            <div className="text-xs text-slate-400 flex items-center gap-2 sm:ml-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Voice and text supported</span>
            </div>
          </div>

        </div>
      </main>

      {/* 6. Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>NEXT5</span>
          <span>•</span>
          <span>Five moves. Zero overwhelm.</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Focus on what matters next</span>
        </div>
      </footer>
    </div>
  );
};
