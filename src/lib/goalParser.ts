import { ExtractedGoalDraft, GoalCategory, GoalType, GoalImportance } from '../types';

export interface JargonFilterReport {
  originalWordCount: number;
  fillerPhrasesRemoved: string[];
  summary: string;
}

export interface ParseGoalsResult {
  goals: ExtractedGoalDraft[];
  jargonReport: JargonFilterReport;
}

/**
 * Intelligent client-side parser to filter conversational jargon & filler phrases
 * and break down run-on voice sentences into distinct individual goals.
 */
export function filterJargonAndExtractGoals(
  rawText: string,
  contexts: string[] = ['work', 'personal', 'business', 'health']
): ParseGoalsResult {
  if (!rawText || !rawText.trim()) {
    return {
      goals: [],
      jargonReport: {
        originalWordCount: 0,
        fillerPhrasesRemoved: [],
        summary: 'No voice prompt detected.',
      },
    };
  }

  const words = rawText.trim().split(/\s+/);
  const originalWordCount = words.length;

  // 1. Detect and eliminate common conversational speech fillers & corporate jargon
  const fillerPatterns = [
    { pattern: /\b(um+|uh+|er+|ah+)\b/gi, label: 'um/uh vocal filler' },
    { pattern: /\b(you know|you see|ya know)\b/gi, label: 'you know' },
    { pattern: /\b(so basically|basically|essentially)\b/gi, label: 'basically' },
    { pattern: /\b(like i said|kind of like|like)\b/gi, label: 'like' },
    { pattern: /\b(to be honest|honestly|truth be told)\b/gi, label: 'honestly' },
    { pattern: /\b(at the end of the day)\b/gi, label: 'at the end of the day' },
    { pattern: /\b(there is a lot going on|there's a lot on my plate|i have so much on my plate|i have so much to do)\b/gi, label: 'a lot on plate' },
    { pattern: /\b(what i was thinking is|what i'm trying to say is|what i mean is)\b/gi, label: 'conversational setup' },
    { pattern: /\b(we gotta circle back|touch base on|sync up on)\b/gi, label: 'corporate jargon' },
    { pattern: /\b(i guess|i suppose|as far as i know)\b/gi, label: 'filler qualifier' },
  ];

  const detectedFillers = new Set<string>();
  let cleaned = rawText;

  for (const { pattern, label } of fillerPatterns) {
    if (pattern.test(cleaned)) {
      detectedFillers.add(label);
      cleaned = cleaned.replace(pattern, ' ');
    }
  }

  // 2. Intelligent multi-clause segmentation
  // Splits by:
  // - Punctuations: period, exclamation, question mark, semicolon, newline
  // - Transition connectors: and then, as well as, on top of that, in addition to, not to mention, along with, meanwhile, after that, oh and, plus, also
  // - Verbal triggers: I need to, I have to, I want to, I gotta, I must, we need to, we have to, we should, gotta, need to, have to, want to, make sure to, remember to, don't forget to, plan to, trying to
  // - Comma preceded or followed by conjunctions or verbs
  const splitRegex = /(?:\n+|\r+|\. |\? |\! |; |,\s*(?:and\s+|also\s+|then\s+|plus\s+|or\s+)|(?:\b(?:and\s+then|as\s+well\s+as|on\s+top\s+of\s+that|in\s+addition\s+to|not\s+to\s+mention|along\s+with|meanwhile|after\s+that|oh\s+and|plus|also)\b)|(?:\b(?:i\s+need\s+to|i\s+have\s+to|i\s+want\s+to|i\s+gotta|i\s+must|we\s+need\s+to|we\s+have\s+to|we\s+should|gotta|need\s+to|have\s+to|want\s+to|make\s+sure\s+to|remember\s+to|don't\s+forget\s+to|plan\s+to|trying\s+to)\b)|,\s*(?=[a-z]+ing\b|[a-z]+\s+the\b))/i;

  let segments = cleaned
    .split(splitRegex)
    .map((s) => s.trim().replace(/^[-*•\d.)\s]+/, '').replace(/^[,\s;]+|[,\s;]+$/g, ''))
    .filter((s) => s.length >= 3);

  // If only 1 clause was found but sentence has commas or 'and', split deeper
  if (segments.length <= 1 && (cleaned.includes(',') || cleaned.toLowerCase().includes(' and '))) {
    const deeper = cleaned
      .split(/,\s*|\s+and\s+/i)
      .map((s) => s.trim().replace(/^[-*•\d.)\s]+/, '').replace(/^[,\s;]+|[,\s;]+$/g, ''))
      .filter((s) => s.length >= 3);
    if (deeper.length > segments.length) {
      segments = deeper;
    }
  }

  const goals: ExtractedGoalDraft[] = [];
  const seenTitles = new Set<string>();

  for (let idx = 0; idx < segments.length; idx++) {
    const rawSeg = segments[idx];

    // Strip leading conversational connector words
    let stripped = rawSeg
      .replace(/^(and|also|then|plus|so|that|to|i|we|my)\s+/i, '')
      .replace(/^(need to|have to|want to|gotta|should|must|plan to|trying to)\s+/i, '')
      .trim();

    if (stripped.length < 3) continue;

    // Capitalize first letter
    let title = stripped.charAt(0).toUpperCase() + stripped.slice(1);
    if (title.length > 55) {
      title = title.slice(0, 52).trim() + '...';
    }

    const titleLower = title.toLowerCase();
    if (seenTitles.has(titleLower)) continue;
    seenTitles.add(titleLower);

    // Categorization
    let category: GoalCategory = (contexts[0] as GoalCategory) || 'work';
    let goalType: GoalType = 'project';
    let importance: GoalImportance = 'high';

    if (/\b(health|workout|gym|run|running|sleep|diet|exercise|water|doctor|dentist|weight|walk|walks|cardio)\b/i.test(titleLower)) {
      category = 'health';
      goalType = 'habit';
    } else if (/\b(family|personal|habit|read|book|home|apartment|car|passport|dog|groceries|laundry|clean|chores)\b/i.test(titleLower)) {
      category = 'personal';
      goalType = 'project';
    } else if (/\b(revenue|sales|client|customer|market|business|mrr|arr|leads|conversion|launch|pitch|investor|investors)\b/i.test(titleLower)) {
      category = 'business';
      goalType = 'target';
    } else if (/\b(study|exam|learn|cert|degree|skill|course|system design|interview|resume)\b/i.test(titleLower)) {
      category = 'career';
      goalType = 'milestone';
    } else if (/\b(save|invest|debt|money|budget|tax|taxes|invoice|accounting|bank|expenses)\b/i.test(titleLower)) {
      category = 'finance';
      goalType = 'target';
    }

    // Deadlines
    let deadline: string | undefined = undefined;
    const deadlineMatch = rawSeg.match(/\b(today|tomorrow(?:\s+morning|\s+afternoon)?|friday|monday|tuesday|wednesday|thursday|saturday|sunday|next week|end of month|q[1-4]|by\s+[a-z]+)\b/i);
    if (deadlineMatch) {
      deadline = deadlineMatch[0].charAt(0).toUpperCase() + deadlineMatch[0].slice(1);
    }

    // Target values
    let targetValue: string | undefined = undefined;
    let unit: string | undefined = undefined;
    const numMatch = rawSeg.match(/\$?(\d+(?:\.\d+)?(?:k|m|%)?)/i);
    if (numMatch) {
      targetValue = numMatch[0];
    }
    if (/\b(\d+)\s*(times|days|hours|mins|minutes|miles|km|pages)\b/i.test(rawSeg)) {
      const uMatch = rawSeg.match(/\b(\d+)\s*(times|days|hours|mins|minutes|miles|km|pages)\b/i);
      if (uMatch) {
        targetValue = uMatch[1];
        unit = uMatch[2];
      }
    }

    const cleanName = title.replace(/\.+$/, '');
    const suggestedFirstMove = `Define the first 15-minute action step for "${cleanName}".`;

    goals.push({
      tempId: `draft_${Date.now()}_${idx}`,
      title,
      category,
      goalType,
      targetValue,
      unit,
      deadline,
      importance,
      notes: 'Outlined from your voice prompt',
      isInferred: false,
      isConfirmedByUser: true,
      suggestedFirstMove,
    });
  }

  // Fallback if no goals could be extracted
  if (goals.length === 0) {
    const clean = cleaned.trim().slice(0, 50);
    goals.push({
      tempId: `draft_${Date.now()}_0`,
      title: clean.length > 3 ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Primary Focus Goal',
      category: (contexts[0] as GoalCategory) || 'work',
      goalType: 'project',
      importance: 'high',
      notes: 'Outlined from your voice prompt',
      isInferred: false,
      isConfirmedByUser: true,
      suggestedFirstMove: 'Review initial requirements and begin the first 15-minute task.',
    });
  }

  const fillerList = Array.from(detectedFillers);
  const summary = fillerList.length > 0
    ? `Filtered ${fillerList.length} filler pattern${fillerList.length === 1 ? '' : 's'} (${fillerList.join(', ')}) and separated speech into ${goals.length} distinct goals.`
    : `Separated spoken prompt into ${goals.length} distinct goals ready for NEXT5 prioritization.`;

  return {
    goals,
    jargonReport: {
      originalWordCount,
      fillerPhrasesRemoved: fillerList,
      summary,
    },
  };
}
