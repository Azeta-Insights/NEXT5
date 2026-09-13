import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '1 - 5', desc: 'Toggle complete / uncomplete on move #1 to #5' },
    { key: 'A', desc: 'Listen to Executive Audio Briefing (Spoken Standup)' },
    { key: 'V', desc: 'Open Voice Friction Decompressor' },
    { key: 'S', desc: 'Launch Focus Sprint on priority Move #1' },
    { key: 'R', desc: 'Recalculate today’s NEXT5 priorities' },
    { key: 'C', desc: 'Open "What Changed?" Daily Circumstances modal' },
    { key: 'T', desc: 'Open "What-If" Scenario Simulator (Trade-Offs)' },
    { key: 'E', desc: 'Open End-of-Day Closeout & Calibration modal' },
    { key: 'W', desc: 'Open Weekly Executive Debrief & Reset modal' },
    { key: 'B', desc: 'Open Data Sovereignty & Backup modal' },
    { key: '?', desc: 'Toggle this keyboard shortcut helper' },
    { key: 'Esc', desc: 'Close any active modal dialog' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-stone-50 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-stone-900" />
            <h3 className="font-bold text-stone-900 text-sm">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200/80 text-xs"
            >
              <span className="text-stone-600 font-medium">{s.desc}</span>
              <kbd className="px-2 py-1 rounded-md bg-stone-100 text-stone-800 font-mono font-bold text-[11px] border border-stone-300 shadow-2xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-stone-500 text-center">
          Press <kbd className="px-1.5 py-0.5 rounded bg-stone-200 font-mono text-[10px]">Esc</kbd> anytime to dismiss.
        </p>
      </div>
    </div>
  );
};
