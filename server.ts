import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;
app.use(express.json());

// Initialize Gemini SDK with safe check
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Robust caller for Gemini generateContent:
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    model?: string;
  }
) {
  const primaryModel = params.model || "gemini-3.6-flash";
  const candidateModels: string[] = [primaryModel];

  if (!candidateModels.includes("gemini-3.6-flash")) {
    candidateModels.push("gemini-3.6-flash");
  }
  if (!candidateModels.includes("gemini-3.8-flash")) {
    candidateModels.push("gemini-3.8-flash");
  }

  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("overloaded") ||
          errMsg.includes("500") ||
          errMsg.includes("504");

        if (isTransient && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          continue;
        }
        break;
      }
    }
  }
  throw lastError;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// 1. Goal Extraction Endpoint
app.post("/api/extract-goals", async (req, res) => {
  try {
    const { text, contexts } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `You are NEXT5's goal extraction engine. The user is describing their thoughts, challenges, objectives, or responsibilities. User contexts selected: ${(contexts || []).join(", ") || "General"}
User thought dump: "${text}"

CORE DIRECTIVE:
1. Extract individual goals, measurable targets, projects, habits, or responsibilities.
2. DO NOT fabricate information: if a deadline, target number, or metric was not mentioned or clearly implied, leave it null or undefined.
3. Distinguish between what was CONFIRMED (explicitly stated) and what is INFERRED (reasonable deduction). Mark isInferred=true if you inferred a target/category/deadline.
4. Categorize as: 'work' | 'career' | 'business' | 'personal' | 'health' | 'finance'.
5. Set goalType as: 'target' | 'project' | 'habit' | 'milestone' | 'outcome'.
6. Set importance as: 'high' | 'medium' | 'low'.
7. Provide any key context notes extracted (e.g. "proposal due tomorrow", "exhausted", "manager wants report by 3").`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                goals: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      category: { type: Type.STRING },
                      goalType: { type: Type.STRING },
                      targetValue: { type: Type.STRING },
                      currentValue: { type: Type.STRING },
                      unit: { type: Type.STRING },
                      deadline: { type: Type.STRING },
                      importance: { type: Type.STRING },
                      notes: { type: Type.STRING },
                      isInferred: { type: Type.BOOLEAN },
                    },
                    required: ["title", "category", "goalType", "importance", "isInferred"],
                  },
                },
                extractedContext: {
                  type: Type.OBJECT,
                  properties: {
                    immediateDeadlines: { type: Type.ARRAY, items: { type: Type.STRING } },
                    statedEnergy: { type: Type.STRING },
                    keyPressures: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                },
              },
              required: ["goals"],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return res.json(parsed);
        }
      } catch (geminiError: any) {
        console.log("[Notice] Using heuristic goal extraction fallback:", geminiError?.message || geminiError);
      }
    }

    // Heuristic Fallback
    const fallbackGoals = generateFallbackGoals(text, contexts);
    return res.json({
      goals: fallbackGoals,
      extractedContext: {
        immediateDeadlines: [],
        statedEnergy: text.toLowerCase().includes("exhausted") || text.toLowerCase().includes("tired") ? "low" : "normal",
        keyPressures: ["Extracted from user input"],
      },
    });

  } catch (err: any) {
    console.error("Error in /api/extract-goals:", err);
    res.status(500).json({ error: err.message || "Failed to extract goals" });
  }
});

// 2. Prioritization Engine Endpoint
app.post("/api/prioritize", async (req, res) => {
  try {
    const { confirmedGoals, dailyContext, mode = "normal", memory = [] } = req.body;

    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `You are the NEXT5 Prioritization and Decision-Support Engine. Your core question is: "Given everything going on, what actually matters next?"

CORE PRODUCT PRINCIPLES:
1. Prioritize meaningful progress over busywork/activity.
2. The user does the deciding, but NEXT5 does the ruthless organizing.
3. Maximum 5 moves. If fewer than 5 meaningful moves exist, RETURN FEWER. Never invent filler tasks!
4. Can say "DON'T" (e.g. "Don't start another project today", "Stop working tonight and rest", "Postpone inbox zero").
5. Consider:
   - Goal impact & outcome value
   - Immediate deadlines (urgent consequences)
   - Available time: ${dailyContext?.availableTime || "1 hour"}
   - Energy level: ${dailyContext?.energy || "70"}%
   - Urgent Items: ${JSON.stringify(dailyContext?.urgentItems || [])}
   - Constraints / Calendar Locks: ${JSON.stringify(dailyContext?.constraints || [])}
   - Today's reality: "${dailyContext?.freeformContext || "None specified"}"
   - Engine Mode: ${mode}
     * "normal": Standard balanced multi-factor prioritization.
     * "high_energy": High energy/deep focus! Assign bold, ambitious deep work blocks (45-60 min) on highest outcome goals first.
     * "low_energy": Low energy! Realistic, gentle high-leverage unblockers (15-25 min) + recovery boundary.
     * "15min": User only has 15 minutes! Max 1-2 ultra-targeted moves <= 15 min + strict boundary against communications.
     * "bad_day": Bad day / Crisis / Emergency! 1 essential work move to prevent fallout, 1 communication unblocker, 1 recovery move, zero filler.
     * "catch_up": Focus on neglected or stalled priorities that haven't moved recently. Break friction with rapid restart moves.
   - Long-term memory & past feedback: ${JSON.stringify(memory.slice(0, 5))}

CONFIRMED GOALS:
${JSON.stringify(confirmedGoals || [], null, 2)}

STRICT GROUNDING & COLD-START DIRECTIVES:
- BASE RECOMMENDATIONS SOLELY ON THE CONFIRMED GOALS AND DAILY CONTEXT PROVIDED ABOVE.
- NEVER fabricate unmentioned deliverables, proposals, certifications, or personas.
- If the user provided only 1 or 2 goals, generate ONLY 1 to 3 strictly justified, high-impact moves. It is completely acceptable and encouraged to return fewer than 5 moves. NEVER invent filler tasks to reach 5.
- If the user provides competing commitments (e.g. today's hard deadline vs tomorrow's deliverable) and limited energy/time, ruthlessly prioritize today's hard deadline first, followed by key preparation, and add a strategic negative constraint ("Don't...") to protect them from low-value busywork.

Return structured JSON.`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      action: { type: Type.STRING },
                      goalId: { type: Type.STRING },
                      goalTitle: { type: Type.STRING },
                      category: { type: Type.STRING },
                      rationale: { type: Type.STRING },
                      whyNow: { type: Type.STRING },
                      estimatedMinutes: { type: Type.NUMBER },
                      priorityRank: { type: Type.NUMBER },
                      confidence: { type: Type.NUMBER },
                      isNegativeConstraint: { type: Type.BOOLEAN },
                      whyRank1Explanation: { type: Type.STRING },
                      substeps: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: "2-3 ultra-concrete, bite-sized physical steps to execute this move immediately."
                      },
                      frictionPoint: { 
                        type: Type.STRING,
                        description: "The primary psychological or practical hurdle and how to avoid getting stuck."
                      },
                      recommendedWindow: { 
                        type: Type.STRING,
                        description: "Optimal time window today (e.g. 'Morning Deep Work', 'Pre-lunch unblocker', 'Post-4pm admin')."
                      },
                    },
                    required: [
                      "action",
                      "category",
                      "rationale",
                      "whyNow",
                      "estimatedMinutes",
                      "priorityRank",
                      "confidence",
                    ],
                  },
                },
                engineRationale: { type: Type.STRING },
                modeNotes: { type: Type.STRING },
              },
              required: ["recommendations"],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          const recs = (parsed.recommendations || []).slice(0, 5).map((r: any, idx: number) => ({
            ...r,
            id: `rec_${Date.now()}_${idx}`,
            priorityRank: idx + 1,
            status: "pending",
            date: dailyContext?.date || new Date().toISOString().split("T")[0],
          }));
          return res.json({ recommendations: recs, engineRationale: parsed.engineRationale });
        }
      } catch (geminiErr: any) {
        console.log("[Notice] Using heuristic prioritizer fallback:", geminiErr?.message || geminiErr);
      }
    }

    // Heuristic Prioritizer Fallback
    const fallbackRecs = calculateHeuristicPriorities(confirmedGoals, dailyContext, mode);
    return res.json({
      recommendations: fallbackRecs,
      engineRationale: "Calculated using NEXT5 multi-factor scoring (Goal Impact, Urgency, Energy Fit, Reality Context).",
    });

  } catch (err: any) {
    console.error("Error in /api/prioritize:", err);
    res.status(500).json({ error: err.message || "Failed to generate priorities" });
  }
});

// 3. AI Coach Endpoint
app.post("/api/ai-coach", async (req, res) => {
  try {
    const { question, confirmedGoals, currentRecommendations, dailyContext, memory } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `You are the NEXT5 AI Decision & Priority Coach. You are NOT a generic chatbot. You are NOT a life coach spouting platitudes. Your single purpose is to help the user reason about their PRIORITIES right now.

User Question: "${question}"

User Context:
- Available Time: ${dailyContext?.availableTime || "Normal"}
- Energy: ${dailyContext?.energy || "70"}%
- Daily Reality: ${dailyContext?.freeformContext || "None"}
- Current Confirmed Goals: ${JSON.stringify(confirmedGoals?.map((g: any) => g.title) || [])}
- Active NEXT5 Moves: ${JSON.stringify(currentRecommendations?.map((r: any) => `#${r.priorityRank}: ${r.action} (${r.category})`) || [])}
- User Memory/Preferences: ${JSON.stringify(memory || [])}

Provide a direct, crisp response (1-3 brief paragraphs). Focus on trade-offs, sequencing, what to drop, or why something is ranked first. Be willing to tell the user what NOT to do.`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.6-flash",
          contents: prompt,
        });

        if (response.text) {
          return res.json({ answer: response.text });
        }
      } catch (err: any) {
        console.log("[Notice] Using heuristic AI coach fallback:", err?.message || err);
      }
    }

    // Fallback AI Coach reasoning
    const answer = getFallbackCoachResponse(question, currentRecommendations, dailyContext);
    return res.json({ answer });

  } catch (err: any) {
    console.error("Error in /api/ai-coach:", err);
    res.status(500).json({ error: err.message || "Failed to query AI coach" });
  }
});

// Helper: Heuristic goal extraction fallback
function generateFallbackGoals(text: string, contexts: string[] = []): any[] {
  const goals: any[] = [];
  if (!text || !text.trim()) return goals;

  const rawClauses = text
    .split(/\n+|;|\. |\band\b/i)
    .map(c => c.trim().replace(/^[-* \d.)\s]+/, ""))
    .filter(c => c.length > 5);

  const seenTitles = new Set<string>();

  for (const clause of rawClauses) {
    if (goals.length >= 5) break;

    const lower = clause.toLowerCase();
    let title = clause.charAt(0).toUpperCase() + clause.slice(1);
    if (title.length > 65) {
      title = title.slice(0, 62).trim() + "...";
    }

    if (seenTitles.has(title.toLowerCase())) continue;
    seenTitles.add(title.toLowerCase());

    let category = (contexts[0] as any) || "work";
    let goalType = "project";
    let importance = "high";

    if (lower.includes("health") || lower.includes("workout") || lower.includes("gym") || lower.includes("run") || lower.includes("sleep") || lower.includes("diet")) {
      category = "health";
      goalType = "habit";
    } else if (lower.includes("family") || lower.includes("personal") || lower.includes("habit") || lower.includes("read") || lower.includes("book")) {
      category = "personal";
      goalType = "habit";
    } else if (lower.includes("revenue") || lower.includes("sales") || lower.includes("client") || lower.includes("customer") || lower.includes("market") || lower.includes("business")) {
      category = "business";
      goalType = "target";
    } else if (lower.includes("study") || lower.includes("exam") || lower.includes("learn") || lower.includes("cert") || lower.includes("degree") || lower.includes("skill")) {
      category = "career";
      goalType = "milestone";
    } else if (lower.includes("save") || lower.includes("invest") || lower.includes("debt") || lower.includes("money") || lower.includes("budget")) {
      category = "finance";
      goalType = "target";
    }

    let deadline: string | undefined = undefined;
    const deadlineMatch = clause.match(/\b(today|tomorrow|friday|monday|next week|end of month|q[1-4])\b/i);
    if (deadlineMatch) {
      deadline = deadlineMatch[0].charAt(0).toUpperCase() + deadlineMatch[0].slice(1);
    }

    let targetValue: string | undefined = undefined;
    const numMatch = clause.match(/\$?(\d+(?:\.\d+)?(?:k|m|%)?)/i);
    if (numMatch && (category === "business" || category === "finance" || category === "health")) {
      targetValue = numMatch[0];
    }

    goals.push({
      title,
      category,
      goalType,
      targetValue,
      deadline,
      importance,
      notes: "Derived from your thoughts",
      isInferred: false,
    });
  }

  if (goals.length === 0) {
    const clean = text.trim().slice(0, 60);
    goals.push({
      title: clean.length > 5 ? clean : "Primary Objective",
      category: (contexts[0] as any) || "work",
      goalType: "project",
      importance: "high",
      notes: "Extracted from your notes",
      isInferred: true,
    });
  }

  return goals;
}

// Helper: Generic, Context-Aware Dynamic Prioritization Fallback
function calculateHeuristicPriorities(goals: any[] = [], dailyContext: any, mode: string = "normal"): any[] {
  const energy = parseInt(dailyContext?.energy || "70", 10);
  const time = dailyContext?.availableTime || "1h";
  const contextStr = (dailyContext?.freeformContext || "").trim();
  const contextLower = contextStr.toLowerCase();
  
  const urgentItems: string[] = Array.isArray(dailyContext?.urgentItems) ? dailyContext.urgentItems : [];
  const today = dailyContext?.date || new Date().toISOString().split("T")[0];

  if ((!goals || goals.length === 0) && !contextStr && urgentItems.length === 0) {
    return [];
  }

  const moves: any[] = [];

  urgentItems.forEach((urgent) => {
    if (moves.length < 5) {
      const cleanAction = urgent.startsWith("!") ? urgent.slice(1).trim() : urgent;
      moves.push({
        action: cleanAction,
        category: "work",
        rationale: "Flagged with urgent priority in today's circumstances.",
        whyNow: "Immediate deadline or unblocker; delay causes immediate operational drag.",
        estimatedMinutes: mode === "15min" ? 15 : 25,
        priorityRank: moves.length + 1,
        confidence: 0.95,
        whyRank1Explanation: moves.length === 0 ? "Highest immediate urgency explicitly indicated in your circumstances." : undefined,
        substeps: [
          `Review exact requirements for: ${cleanAction}`,
          "Execute the critical deliverable or unblocker without distractions",
          "Confirm completion and notify relevant stakeholders"
        ],
        frictionPoint: "Hesitation to begin: commit to just the first 5 minutes.",
        recommendedWindow: "Immediate Morning Focus",
        status: "pending",
        date: today,
      });
    }
  });

  if (goals && goals.length > 0) {
    const sortedGoals = [...goals].sort((a, b) => {
      const getScore = (g: any) => {
        let score = 0;
        if (g.importance === "high") score += 30;
        if (g.importance === "medium") score += 15;
        if (g.deadline) {
          const dl = g.deadline.toLowerCase();
          if (dl.includes("today") || dl.includes("immediate") || dl.includes("urgent")) score += 50;
          else if (dl.includes("tomorrow") || dl.includes("this week")) score += 25;
        }
        if (contextLower && (g.title || "").toLowerCase().split(" ").some((w: string) => w.length > 3 && contextLower.includes(w))) {
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
      if (mode === "15min") estMinutes = 15;
      else if (mode === "low_energy" || energy < 40) estMinutes = 20;
      else if (mode === "high_energy" || energy > 85) estMinutes = 45;

      const title = goal.title || "Key Goal";
      let actionTitle = `Advance ${title}`;
      if (goal.goalType === "habit") {
        actionTitle = `Complete daily habit for ${title}`;
        estMinutes = Math.min(estMinutes, 20);
      } else if (goal.goalType === "target") {
        actionTitle = `Make measurable progress on ${title}${goal.targetValue ? ` (${goal.targetValue})` : ""}`;
      } else if (goal.goalType === "project") {
        actionTitle = `Execute key milestone for ${title}`;
      }

      let rationale = `Directly moves forward your confirmed ${goal.category || "priority"} goal.`;
      if (goal.deadline) {
        rationale += ` Target: ${goal.deadline}.`;
      }

      const isTodayDeadline = goal.deadline?.toLowerCase().includes("today");

      moves.push({
        action: actionTitle,
        goalId: goal.id,
        goalTitle: goal.title,
        category: goal.category || "work",
        rationale,
        whyNow: isTodayDeadline
          ? "Hard deadline today requires direct execution."
          : "Consistent daily momentum prevents goal drift.",
        estimatedMinutes: estMinutes,
        priorityRank: moves.length + 1,
        confidence: 0.9,
        whyRank1Explanation: moves.length === 0
          ? `Top priority: directly impacts your high-leverage goal "${goal.title}".`
          : undefined,
        substeps: [
          `Identify the immediate next physical micro-step for ${goal.title}`,
          `Execute in a focused ${estMinutes}-minute block`,
          `Record milestone progress and close feedback loop`
        ],
        frictionPoint: "Resistance to sustained focus: set a timer and focus on one task.",
        recommendedWindow: moves.length === 0 ? "Morning peak focus" : "Mid-day focus block",
        status: "pending",
        date: today,
      });
    }
  }

  if (moves.length > 0 && moves.length < 5) {
    if (energy < 40 || mode === "bad_day" || mode === "low_energy") {
      moves.push({
        action: "Enforce early recovery boundary: stop after completing essential priorities",
        category: "boundary",
        rationale: "With lower energy, pushing into low-value secondary tasks causes cognitive fatigue for tomorrow.",
        whyNow: "Protecting recovery capacity is a strategic requirement.",
        estimatedMinutes: 0,
        priorityRank: moves.length + 1,
        confidence: 0.94,
        isNegativeConstraint: true,
        status: "pending",
        date: today,
      });
    } else if (mode === "15min") {
      moves.push({
        action: "Don't open email, chat feeds, or low-priority notifications right now",
        category: "boundary",
        rationale: "In a 15-minute window, reactive communications destroy your single momentum window.",
        whyNow: "Protects your limited time constraint.",
        estimatedMinutes: 0,
        priorityRank: moves.length + 1,
        confidence: 0.95,
        isNegativeConstraint: true,
        status: "pending",
        date: today,
      });
    } else if (moves.length >= 3) {
      moves.push({
        action: "Avoid low-impact administrative tasks until core moves are complete",
        category: "boundary",
        rationale: "Shields your prime focus hours from reactive busywork.",
        whyNow: "Deep work compounds only when free from micro-distractions.",
        estimatedMinutes: 0,
        priorityRank: moves.length + 1,
        confidence: 0.92,
        isNegativeConstraint: true,
        status: "pending",
        date: today,
      });
    }
  }

  return moves.slice(0, 5).map((m, idx) => ({
    ...m,
    id: m.id || `rec_${Date.now()}_${idx}`,
    priorityRank: idx + 1,
  }));
}

function getFallbackCoachResponse(question: string, recs: any[] = [], dailyContext: any): string {
  const q = question.toLowerCase();
  
  if (q.includes("too much") || q.includes("overwhelm") || q.includes("busy")) {
    return `When you feel like you have too much to do, remember NEXT5's core tenet: you don't need to finish everything today, you only need to execute what actually moves the needle. Look at your #1 priority right now. Complete that single move first. Give yourself permission to ignore low-priority administrative tasks (like clearing inbox emails or tweaking presentations) until your top 2 non-negotiables are handled.`;
  }
  if (q.includes("why did you prioritize") || q.includes("why #1")) {
    const top = recs[0];
    return `Your top move (${top ? top.action : "your #1 item"}) was prioritized because it carries the most immediate consequence and deadline leverage. Delaying it compounds anxiety and creates downstream friction, whereas completing it creates immediate cognitive relief.`;
  }
  if (q.includes("change") || q.includes("rethink") || q.includes("fallen behind")) {
    return `Priorities shift when reality shifts that's healthy. Update today's circumstances in the Daily Context section or switch to 15-Minute or Low-Energy Mode to instantly recalibrate around what is realistically achievable right now.`;
  }
  
  return `Focus on the immediate next action. Avoid jumping between tasks. By finishing one meaningful move before looking at the next, you build momentum without cognitive fatigue.`;
}

// Vite middleware and Server setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NEXT5 server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
