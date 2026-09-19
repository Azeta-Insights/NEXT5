import { Goal, DailyContext, Recommendation, EngineMode } from '../types';

/**
 * Robust Client-Side Heuristic Prioritizer
 * Ensures NEXT5 always has intelligent, deterministic recommendations even when
 * offline, under network latency, or if the server response is interrupted.
 */
export function calculateClientHeuristicPriorities(
  goals: Goal[] = [],
  dailyContext?: DailyContext,
  mode: EngineMode = 'normal'
): Recommendation[] {
  const energy = parseInt(dailyContext?.energy || '70', 10);
  const contextStr = (dailyContext?.freeformContext || '').trim();
  const contextLower = contextStr.toLowerCase();
  const urgentItems: string[] = Array.isArray(dailyContext?.urgentItems) ? dailyContext.urgentItems : [];
  const today = dailyContext?.date || new Date().toISOString().split('T')[0];

  const activeGoals = goals.filter((g) => g.status === 'active' && g.confirmed !== false);

  if (activeGoals.length === 0 && !contextStr && urgentItems.length === 0) {
    return [];
  }

  const moves: Recommendation[] = [];

  // 1. Process explicit urgent items from daily context
  urgentItems.forEach((urgent) => {
    if (moves.length < 5) {
      const cleanAction = urgent.startsWith('!') ? urgent.slice(1).trim() : urgent;
      moves.push({
        id: `rec_urgent_${Date.now()}_${moves.length}`,
        userId: dailyContext?.userId || 'user_active',
        date: today,
        action: cleanAction,
        category: 'work',
        rationale: "Flagged with urgent priority in today's daily circumstances.",
        whyNow: 'Immediate blocker or deliverable; postponement risks operational delay.',
        estimatedMinutes: mode === '15min' ? 15 : 25,
        priorityRank: moves.length + 1,
        confidence: 0.95,
        status: 'pending',
        whyRank1Explanation: moves.length === 0 ? "Highest immediate urgency explicitly indicated in today's circumstances." : undefined,
        substeps: [
          `Review core requirements for: ${cleanAction}`,
          'Execute the primary deliverable without task-switching',
          'Confirm completion and notify relevant stakeholders',
        ],
        frictionPoint: 'Hesitation to dive in: commit to just the first 5 minutes of focused effort.',
        recommendedWindow: 'Immediate Morning Focus',
      });
    }
  });

  // 2. Score and sort active goals
  if (activeGoals.length > 0) {
    const sortedGoals = [...activeGoals].sort((a, b) => {
      const getScore = (g: Goal) => {
        let score = 0;
        if (g.importance === 'high') score += 30;
        if (g.importance === 'medium') score += 15;
        if (g.deadline) {
          const dl = g.deadline.toLowerCase();
          if (dl.includes('today') || dl.includes('immediate') || dl.includes('urgent')) score += 50;
          else if (dl.includes('tomorrow') || dl.includes('this week')) score += 25;
        }
        if (contextLower && (g.title || '').toLowerCase().split(' ').some((w) => w.length > 3 && contextLower.includes(w))) {
          score += 20;
        }
        return score;
      };
      return getScore(b) - getScore(a);
    });

    for (const goal of sortedGoals) {
      if (moves.length >= 4) break;
      if (moves.some((m) => m.goalId === goal.id)) continue;

      let estMinutes = 30;
      if (mode === '15min') estMinutes = 15;
      else if (mode === 'low_energy' || energy < 40) estMinutes = 20;
      else if (mode === 'high_energy' || energy > 85) estMinutes = 45;

      const title = goal.title || 'Key Goal';
      let actionTitle = `Advance ${title}`;
      if (goal.goalType === 'habit') {
        actionTitle = `Complete daily habit for ${title}`;
        estMinutes = Math.min(estMinutes, 20);
      } else if (goal.goalType === 'target') {
        actionTitle = `Make measurable progress on ${title}${goal.targetValue ? ` (${goal.targetValue})` : ''}`;
      } else if (goal.goalType === 'project') {
        actionTitle = `Execute key milestone for ${title}`;
      }

      moves.push({
        id: `rec_goal_${Date.now()}_${moves.length}`,
        userId: goal.userId || dailyContext?.userId || 'user_active',
        goalId: goal.id,
        goalTitle: goal.title,
        date: today,
        action: actionTitle,
        category: goal.category || 'work',
        rationale: `Directly drives "${goal.title}" (${goal.category}) with high outcome leverage.`,
        whyNow: goal.deadline
          ? `Target milestone deadline approaching: ${goal.deadline}.`
          : 'High-impact progression move with compounding weekly value.',
        estimatedMinutes: estMinutes,
        priorityRank: moves.length + 1,
        confidence: 0.88,
        status: 'pending',
        whyRank1Explanation: moves.length === 0 ? `Core driver of ${goal.title}, ranked highest for strategic leverage.` : undefined,
        substeps: [
          `Open workspace/context for ${title}`,
          `Spend uninterrupted ${estMinutes} min making tangible progress`,
          'Log progress and define tomorrow’s next step',
        ],
        frictionPoint: 'Scope creep: focus strictly on finishing this specific increment.',
        recommendedWindow: moves.length === 0 ? 'Peak Energy Block' : 'Mid-Day Focus Window',
      });
    }
  }

  // 3. Add strategic negative constraint or recovery if appropriate
  if (moves.length > 0 && moves.length < 5) {
    if (mode === 'bad_day' || energy < 35) {
      moves.push({
        id: `rec_boundary_${Date.now()}`,
        userId: dailyContext?.userId || 'user_active',
        date: today,
        action: 'Hard stop: protect recovery tonight. Do not start secondary projects.',
        category: 'recovery',
        rationale: 'Energy reserves are depleted; fatigue guarantees declining decision quality.',
        whyNow: 'Resting today prevents multi-day burnout and operational errors.',
        estimatedMinutes: 0,
        priorityRank: moves.length + 1,
        confidence: 0.95,
        status: 'pending',
        isNegativeConstraint: true,
        substeps: [
          'Close secondary browser tabs and Slack',
          'Step away from desk at the scheduled hour',
        ],
        frictionPoint: 'Guilt over uncompleted backlog: remember rest is productive.',
        recommendedWindow: 'Evening Boundary',
      });
    } else if (mode === '15min') {
      moves.push({
        id: `rec_boundary_${Date.now()}`,
        userId: dailyContext?.userId || 'user_active',
        date: today,
        action: 'Do not check reactive email or social feeds during this 15-minute sprint.',
        category: 'boundary',
        rationale: 'Severe time constraint requires 100% focused momentum on the single move above.',
        whyNow: 'Context switching instantly consumes available time window.',
        estimatedMinutes: 0,
        priorityRank: moves.length + 1,
        confidence: 0.98,
        status: 'pending',
        isNegativeConstraint: true,
        substeps: [
          'Silence phone notifications',
          'Keep single focus tab open',
        ],
        frictionPoint: 'Impulse to check notifications: place phone out of reach.',
        recommendedWindow: 'Sprint Duration',
      });
    }
  }

  return moves;
}
