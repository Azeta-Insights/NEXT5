export type GoalCategory = 'work' | 'career' | 'business' | 'personal' | 'health' | 'finance';
export type GoalType = 'target' | 'project' | 'habit' | 'milestone' | 'outcome' | 'boundary' | 'recurring_focus';
export type GoalImportance = 'critical' | 'high' | 'medium' | 'low';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: GoalCategory;
  goalType: GoalType;
  targetValue?: string | number;
  currentValue?: string | number;
  unit?: string;
  deadline?: string;
  importance: GoalImportance;
  status: GoalStatus;
  confirmed: boolean;
  source?: 'user' | 'ai_extracted';
  notes?: string;
  milestones?: string[];
  lastMovedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AvailableTimeOption = '10m' | '30m' | '1h' | '2h_plus' | 'full_day';
export type EnergyOption = '100' | '70' | '40' | '10';
export type EngineMode = 'normal' | 'high_energy' | 'low_energy' | '15min' | 'bad_day' | 'catch_up';

export interface DailyContext {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  availableTime: AvailableTimeOption;
  energy: EnergyOption;
  freeformContext: string;
  urgentItems?: string[];
  constraints?: string[];
  transcription?: string;
  mode?: EngineMode;
  createdAt: string;
}

export type RecommendationStatus = 'pending' | 'completed' | 'not_today' | 'not_relevant';

export interface Recommendation {
  id: string;
  userId: string;
  date: string;
  action: string;
  goalId?: string | null;
  goalTitle?: string;
  category: GoalCategory | 'boundary' | 'recovery' | 'decision';
  rationale: string;
  estimatedMinutes: number;
  priorityRank: number;
  status: RecommendationStatus;
  whyNow: string;
  confidence: number;
  isNegativeConstraint?: boolean; // When NEXT5 says "Don't"
  whyRank1Explanation?: string;
  substeps?: string[]; // Step-by-step breakdown (PRD Section 16 & 23)
  frictionPoint?: string; // Common cognitive hurdle and how to bypass it
  recommendedWindow?: string; // e.g., "Morning peak focus (before 11am)"
  feedback?: string;
  completedAt?: string;
}

export type FeedbackRating = 'exactly_right' | 'somewhat_useful' | 'too_much' | 'too_easy';

export interface DailyFeedback {
  id: string;
  userId: string;
  date: string;
  rating: FeedbackRating;
  comments?: string;
  voiceNote?: string;
  createdAt: string;
}

export type MemoryType = 'preference' | 'observed_pattern' | 'explicit_context' | 'goal_insight';

export interface MemoryItem {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  source: 'user_stated' | 'behavioral_observation' | 'onboarding';
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  preferences?: {
    defaultTime?: AvailableTimeOption;
    defaultEnergy?: EnergyOption;
    voiceEnabled?: boolean;
    highContrastMode?: boolean;
  };
}

export interface ExtractedGoalDraft {
  tempId: string;
  title: string;
  category: GoalCategory;
  goalType: GoalType;
  targetValue?: string;
  currentValue?: string;
  unit?: string;
  deadline?: string;
  importance: GoalImportance;
  notes?: string;
  isInferred: boolean; // Must distinguish confirmed vs inferred
  isConfirmedByUser: boolean;
}

export interface PrioritizationWeights {
  goalImpact: number;
  urgency: number;
  outcomeImpact: number;
  neglect: number;
  momentum: number;
  realityFit: number;
  contextRelevance: number;
}

export interface WeeklyDebriefReport {
  executiveSummary: string;
  strategicExecutionScore: number;
  alignmentGrade: string;
  topWin: string;
  primaryBlindspot: string;
  driftingGoalAlert: string;
  upcomingStrategicPriorities: string[];
  suggestedMemoryRule: {
    content: string;
    type: MemoryType;
    explanation: string;
  };
  restorationAdvice: string;
  generatedAt?: string;
}

export type ScenarioPresetType = 'emergency_time' | 'energy_crash' | 'surprise_focus' | 'inbox_crisis' | 'custom';

export interface SimulatedScenario {
  type: ScenarioPresetType;
  title: string;
  description: string;
  timeOption?: AvailableTimeOption;
  energyOption?: EnergyOption;
  customPrompt?: string;
}

export interface ScenarioSimulationResult {
  simulatedRecommendations: Recommendation[];
  tradeOffAnalysis: {
    protectedMoves: string[];
    displacedMoves: {
      originalRank?: number;
      action: string;
      reasonForDisplacement: string;
    }[];
    newElevatedMoves: {
      rank: number;
      action: string;
      whyElevated: string;
    }[];
    tradeOffRationale: string;
    riskAssessment: string;
  };
}

export interface ExecutiveAudioBriefing {
  script: string;
  bulletSummary: string[];
  estimatedDurationSeconds: number;
  keyAnchor: string;
  keyBoundary: string;
  generatedAt?: string;
}

export interface FrictionDecompressionResult {
  rootFriction: string;
  fiveMinuteMicroMove: string;
  recommendedMode?: EngineMode;
  strategicReassurance: string;
  suggestedActionId?: string;
}


