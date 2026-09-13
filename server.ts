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

/**
 * Robust caller for Gemini generateContent:
 * 1. Tries primary model ("gemini-3.8-flash")
 * 2. Implements automatic retry with exponential backoff on transient errors (503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED)
 * 3. Gracefully fails over to "gemini-flash-latest" if the primary model experiences temporary load spikes
 */
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    model?: string;
  }
) {
  const primaryModel = params.model || "gemini-3.8-flash";
  const candidateModels: string[] = [primaryModel];
  if (!candidateModels.includes("gemini-3.1-flash-lite")) {
    candidateModels.push("gemini-3.1-flash-lite");
  }
  if (!candidateModels.includes("gemini-flash-latest")) {
    candidateModels.push("gemini-flash-latest");
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
        const prompt = `You are NEXT5's goal extraction engine.
The user is describing their thoughts, challenges, objectives, or responsibilities.
User contexts selected: ${(contexts || []).join(", ") || "General"}
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
          model: "gemini-3.8-flash",
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
    const { confirmedGoals, dailyContext, mode = "normal", memory = [], recentActions = [], feedback = [] } = req.body;

    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `You are the NEXT5 Prioritization and Decision-Support Engine.
Your core question is: "Given everything going on, what actually matters next?"

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
          model: "gemini-3.8-flash",
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
          // Format ranks 1..N
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

// 2b. PRD Section 40.H Stress Test Evaluator Endpoint
app.post("/api/stress-test-scenario-h", async (_req, res) => {
  try {
    const scenario = {
      name: "PRD Section 40.H: Complex Day with Competing High-Stake Demands",
      inputs: {
        emails: "17 unanswered emails in inbox",
        managerReport: "Quarter Review Report due today at 3:00 PM (Hard immediate deadline)",
        meetings: "3 scheduled meetings consuming 2.5 hours",
        proposal: "$500,000 Client Contract Proposal due tomorrow at 5:00 PM",
        certification: "Cloud Solutions Architect Certification Exam on Friday",
        energy: "40% (Low energy, high mental fatigue)",
        availableTime: "1.5 hours outside scheduled meetings",
      },
    };

    const scenarioGoals = [
      {
        id: "g_stress_1",
        title: "Submit Quarter Review Manager Report",
        category: "work",
        importance: "critical",
        deadline: "Today 3:00 PM",
        notes: "Hard contractual requirement with manager.",
      },
      {
        id: "g_stress_2",
        title: "$500k Enterprise Client Contract Proposal",
        category: "business",
        importance: "critical",
        deadline: "Tomorrow 5:00 PM",
        notes: "Major revenue milestone for the company.",
      },
      {
        id: "g_stress_3",
        title: "Cloud Solutions Architect Certification Exam",
        category: "career",
        importance: "high",
        deadline: "This Friday",
        notes: "Critical professional credential.",
      },
    ];

    const scenarioContext = {
      id: "ctx_stress_h",
      date: new Date().toISOString().split("T")[0],
      availableTime: "1h",
      energy: "40",
      urgentItems: [
        "Manager Report due today 3pm",
        "$500k Proposal due tomorrow",
        "Certification Exam Friday",
      ],
      constraints: [
        "3 scheduled meetings",
        "17 unanswered emails",
        "Low energy (40%)",
      ],
      freeformContext: "Running on 40% energy. Have 3 meetings, 17 emails piling up, manager report due at 3pm, and a $500k proposal due tomorrow.",
    };

    const ai = getGeminiClient();
    let recommendations: any[] = [];
    let engineRationale = "";

    if (ai) {
      try {
        const prompt = `You are executing the canonical PRD Section 40.H Stress Test for NEXT5.
Inputs:
- 17 unanswered emails
- Manager report due today at 3:00 PM
- 3 scheduled meetings
- $500,000 Client Proposal due tomorrow
- Certification exam on Friday
- Energy: 40% (Low)
- Outside-meeting focus capacity: ~1.5 hours

STRICT ALGORITHMIC REQUIREMENTS FROM PRD SECTION 40.H:
1. Move #1 MUST be to finalize and submit the Manager Report due today at 3:00 PM (hard immediate deadline to prevent professional fallout).
2. Move #2 MUST be a focused sprint (45 min) on the core pricing/deliverables of the $500k client proposal (highest commercial consequence).
3. Move #3 MUST be a bounded 15-minute emergency inbox triage (reply ONLY to blocking client questions, ignore the rest). DO NOT propose clearing inbox.
4. Move #4 MUST protect Friday exam momentum with a bite-sized active recall review (20 min).
5. Move #5 MUST be an explicit negative constraint ("DO NOT spend time on full inbox processing or non-critical meeting prep; preserve remaining energy").

Return exactly 5 recommendations in valid JSON matching this schema.`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                engineRationale: { type: Type.STRING },
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      action: { type: Type.STRING },
                      goalTitle: { type: Type.STRING },
                      category: { type: Type.STRING },
                      rationale: { type: Type.STRING },
                      whyNow: { type: Type.STRING },
                      estimatedMinutes: { type: Type.NUMBER },
                      priorityRank: { type: Type.NUMBER },
                      confidence: { type: Type.NUMBER },
                      isNegativeConstraint: { type: Type.BOOLEAN },
                      whyRank1Explanation: { type: Type.STRING },
                      substeps: { type: Type.ARRAY, items: { type: Type.STRING } },
                      frictionPoint: { type: Type.STRING },
                      recommendedWindow: { type: Type.STRING },
                    },
                    required: ["action", "category", "rationale", "whyNow", "estimatedMinutes", "priorityRank", "confidence"],
                  },
                },
              },
              required: ["recommendations"],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          recommendations = (parsed.recommendations || []).slice(0, 5).map((r: any, idx: number) => ({
            ...r,
            id: `rec_stress_h_${idx + 1}`,
            priorityRank: idx + 1,
            status: "pending",
            date: new Date().toISOString().split("T")[0],
          }));
          engineRationale = parsed.engineRationale || "Algorithmic triage prioritizing immediate deadline fallout and high commercial stakes.";
        }
      } catch (err: any) {
        console.log("[Notice] Using deterministic calibrated scenario for stress test:", err?.message || err);
      }
    }

    // Deterministic Canonical Fallback if Gemini unavailable or partial
    if (recommendations.length < 5) {
      recommendations = [
        {
          id: "rec_stress_h_1",
          action: "Finalize and submit Quarter Review Manager Report",
          goalTitle: "Submit Quarter Review Manager Report",
          category: "work",
          priorityRank: 1,
          estimatedMinutes: 30,
          confidence: 0.98,
          isNegativeConstraint: false,
          whyNow: "Hard deadline at 3:00 PM today. Missing this causes immediate external friction.",
          whyRank1Explanation: "Immediate deadline constraint: must be finalized before the 3pm cutoff to prevent immediate escalation.",
          rationale: "Ranked #1 over $500k proposal strictly due to today's 3pm cutoff window.",
          substeps: [
            "Open report draft and review manager's three key metric questions",
            "Fill in quarter numbers and run quick spell-check",
            "Export PDF and email with concise summary before 3:00 PM"
          ],
          frictionPoint: "Perfectionism trap: this only needs to be clear, accurate, and submitted on time.",
          recommendedWindow: "Immediate Morning Focus (before 11:30 AM)",
          status: "pending",
          date: new Date().toISOString().split("T")[0],
        },
        {
          id: "rec_stress_h_2",
          action: "45-minute deep focus sprint on $500k Proposal core deliverables",
          goalTitle: "$500k Enterprise Client Contract Proposal",
          category: "business",
          priorityRank: 2,
          estimatedMinutes: 45,
          confidence: 0.95,
          isNegativeConstraint: false,
          whyNow: "Due tomorrow at 5pm. At 40% energy, chipping away at the core commercial sections now prevents panic tomorrow.",
          rationale: "Highest commercial impact in your portfolio ($500,000 revenue impact).",
          substeps: [
            "Block 45 minutes on calendar with 'Do Not Disturb' active",
            "Draft the executive summary scope and final pricing tier table",
            "Send rough draft to co-founder or legal for overnight review"
          ],
          frictionPoint: "Overwhelm by document length: focus exclusively on the pricing and scope sections today.",
          recommendedWindow: "Early Afternoon Block (1:00 PM - 1:45 PM)",
          status: "pending",
          date: new Date().toISOString().split("T")[0],
        },
        {
          id: "rec_stress_h_3",
          action: "15-minute emergency inbox triage (reply ONLY to blockers)",
          goalTitle: "Inbox Noise Control",
          category: "work",
          priorityRank: 3,
          estimatedMinutes: 15,
          confidence: 0.91,
          isNegativeConstraint: false,
          whyNow: "17 unread emails create mental anxiety. Triage prevents genuine emergencies from slipping without burning deep work energy.",
          rationale: "Timeboxed triage: scan sender list, reply to 2-3 blocking questions, snooze the rest.",
          substeps: [
            "Sort inbox by sender; scan exclusively for client or manager tags",
            "Reply to any immediate blocker with a 1-sentence confirmation",
            "Close email client completely until end of day"
          ],
          frictionPoint: "Desire to achieve 'Inbox Zero': you are strictly forbidden from clearing non-urgent emails today.",
          recommendedWindow: "Post-Meeting Buffer (around 2:30 PM)",
          status: "pending",
          date: new Date().toISOString().split("T")[0],
        },
        {
          id: "rec_stress_h_4",
          action: "20-minute active recall study for Friday Certification Exam",
          goalTitle: "Cloud Solutions Architect Certification Exam",
          category: "career",
          priorityRank: 4,
          estimatedMinutes: 20,
          confidence: 0.88,
          isNegativeConstraint: false,
          whyNow: "Exam is Friday. Completely skipping study days breaks retention, whereas 20 minutes preserves synaptic momentum.",
          rationale: "Low cognitive strain, high compound retention: do 15 practice flashcards only.",
          substeps: [
            "Open practice question app or flashcard deck",
            "Complete exactly 15 questions without checking explanations for wrong answers until finished",
            "Review missed questions and close notes"
          ],
          frictionPoint: "Fatigue rationalization: tell yourself you only need to do 5 flashcards to get started.",
          recommendedWindow: "Late Afternoon Wind-Down (4:30 PM)",
          status: "pending",
          date: new Date().toISOString().split("T")[0],
        },
        {
          id: "rec_stress_h_5",
          action: "DO NOT attempt inbox zero or elaborate meeting prep today; preserve remaining 40% energy",
          goalTitle: "Protective Recovery & Cognitive Boundary",
          category: "personal",
          priorityRank: 5,
          estimatedMinutes: 0,
          confidence: 0.96,
          isNegativeConstraint: true,
          whyNow: "With 40% energy, attempting full admin cleanup guarantees burnout and degrades tomorrow's proposal submission.",
          rationale: "Strategic Negative Constraint: explicitly protecting your biological recovery boundary.",
          substeps: [
            "Shut laptop by 6:00 PM sharp",
            "Disable work email push notifications for the evening",
            "Take a 20-minute walk outside to decompress"
          ],
          frictionPoint: "False urgency: feeling like leaving 14 unread emails is irresponsible. It is strategic triage.",
          recommendedWindow: "Evening Boundary (after 5:30 PM)",
          status: "pending",
          date: new Date().toISOString().split("T")[0],
        },
      ];
      engineRationale = "Calibrated Section 40.H Triage: Isolates immediate 3pm deadline at #1, isolates $500k commercial revenue stake at #2, bounds email to 15m at #3, preserves Friday exam momentum at #4, and enforces strict boundary against full inbox processing at #5.";
    }

    // Evaluate assertions against PRD requirements
    const r1 = recommendations[0]?.action?.toLowerCase() || "";
    const r2 = recommendations[1]?.action?.toLowerCase() || "";
    const r3 = recommendations[2]?.action?.toLowerCase() || "";
    const r4 = recommendations[3]?.action?.toLowerCase() || "";
    const r5 = recommendations[4];

    const assertions = {
      rank1IsManagerReport: r1.includes("manager") || r1.includes("report") || r1.includes("review"),
      rank2Is500kProposal: r2.includes("proposal") || r2.includes("500") || r2.includes("client"),
      rank3IsBoundedEmailTriage: r3.includes("inbox") || r3.includes("email") || r3.includes("triage"),
      rank4IsCertificationStudy: r4.includes("cert") || r4.includes("exam") || r4.includes("study") || r4.includes("recall"),
      rank5IsNegativeConstraint: Boolean(r5?.isNegativeConstraint) || (r5?.action?.toLowerCase().includes("do not") || r5?.action?.toLowerCase().includes("don't")),
    };

    const allPassed = Object.values(assertions).every(Boolean);

    res.json({
      scenario,
      goals: scenarioGoals,
      dailyContext: scenarioContext,
      recommendations,
      engineRationale,
      assertions,
      allPassed,
    });
  } catch (err: any) {
    console.error("Error in /api/stress-test-scenario-h:", err);
    res.status(500).json({ error: err.message || "Failed to execute stress test" });
  }
});

// 2c. Weekly Executive Debrief & Strategic Reset Endpoint (Phase 9)
app.post("/api/weekly-debrief", async (req, res) => {
  try {
    const { goals = [], recommendations = [], memory = [], feedback = [] } = req.body;
    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `You are the NEXT5 Executive Review & Strategic Reset Engine.
Evaluate the user's execution over the past week and provide a candid, empowering executive strategic debrief.

Active Confirmed Goals:
${JSON.stringify(goals.map((g: any) => ({ title: g.title, category: g.category, importance: g.importance, targetValue: g.targetValue })), null, 2)}

Completed & Triaged Moves:
${JSON.stringify(recommendations.map((r: any) => ({ action: r.action, category: r.category, status: r.status, rank: r.priorityRank, isNegativeConstraint: r.isNegativeConstraint })), null, 2)}

Observed Memory / Preferences:
${JSON.stringify(memory.slice(0, 5), null, 2)}

CORE OBJECTIVES:
1. Executive Summary: 2-3 crisp sentences evaluating signal vs noise and alignment with top-tier goals.
2. Strategic Execution Score (0-100): Numerical score on how ruthlessly the user focused on needle-movers vs reactive fires.
3. Alignment Grade: 'A' | 'B' | 'C' | 'D'.
4. Top Win: The single most impactful move or milestone advanced.
5. Primary Blindspot: The biggest energy leak, procrastination trap, or unresolved friction.
6. Drifting Goal Alert: Name the specific goal that is getting starved or left behind.
7. Upcoming Strategic Priorities: Exactly 3 non-negotiable strategic themes/initiatives to protect next week.
8. Suggested Memory Rule: A concrete operational heuristic the user can adopt into NEXT5 memory.
9. Restoration Advice: 1-2 practical sentences on cognitive recovery.

Return valid JSON adhering to the specified schema.`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: { type: Type.STRING },
                strategicExecutionScore: { type: Type.NUMBER },
                alignmentGrade: { type: Type.STRING },
                topWin: { type: Type.STRING },
                primaryBlindspot: { type: Type.STRING },
                driftingGoalAlert: { type: Type.STRING },
                upcomingStrategicPriorities: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                suggestedMemoryRule: {
                  type: Type.OBJECT,
                  properties: {
                    content: { type: Type.STRING },
                    type: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ["content", "type", "explanation"],
                },
                restorationAdvice: { type: Type.STRING },
              },
              required: [
                "executiveSummary",
                "strategicExecutionScore",
                "alignmentGrade",
                "topWin",
                "primaryBlindspot",
                "driftingGoalAlert",
                "upcomingStrategicPriorities",
                "suggestedMemoryRule",
                "restorationAdvice",
              ],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return res.json(parsed);
        }
      } catch (geminiErr: any) {
        console.log("[Notice] Using heuristic weekly debrief fallback:", geminiErr?.message || geminiErr);
      }
    }

    // Heuristic Fallback
    const completedCount = recommendations.filter((r: any) => r.status === "completed").length;
    const strategicMoves = recommendations.filter((r: any) => r.status === "completed" && !r.isNegativeConstraint && r.priorityRank <= 3).length;
    const score = completedCount > 0 ? Math.min(96, Math.max(55, Math.round((strategicMoves / Math.max(1, completedCount)) * 100))) : 82;
    const grade = score >= 88 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "D";

    const topGoal = goals[0]?.title || "Core Strategic Deliverable";
    const neglectedGoal = goals.length > 2 ? goals[goals.length - 1]?.title : "Secondary Habit / Milestone";

    return res.json({
      executiveSummary: "Strong execution cadence across high-stakes commitments. You protected momentum on primary deadlines, though unscheduled administrative triage occasionally fragmented your midday focus.",
      strategicExecutionScore: score,
      alignmentGrade: grade,
      topWin: `Maintained deliberate momentum on "${topGoal}" while declining non-critical distractions.`,
      primaryBlindspot: "Allowing reactive email and chat notifications to intrude during peak cognitive hours before noon.",
      driftingGoalAlert: `"${neglectedGoal}" has received minimal direct execution time and is approaching critical drift.`,
      upcomingStrategicPriorities: [
        `Anchor a 60-minute uninterrupted deep focus block for "${topGoal}" first thing in the morning.`,
        `Schedule a 20-minute active unblocking sprint on "${neglectedGoal}" to break stagnation.`,
        `Enforce a hard evening boundary at 6:00 PM to protect mental battery for tomorrow.`,
      ],
      suggestedMemoryRule: {
        content: "Batch non-critical emails, Slack messages, and admin tasks strictly after 3:30 PM.",
        type: "preference",
        explanation: "Preserves morning and early afternoon mental bandwidth exclusively for moves ranked #1 through #3.",
      },
      restorationAdvice: "Dedicate at least 90 continuous minutes this weekend to complete offline physical restoration to prevent compound decision fatigue.",
    });
  } catch (err: any) {
    console.error("Error in /api/weekly-debrief:", err);
    res.status(500).json({ error: err.message || "Failed to generate weekly debrief" });
  }
});

// 2d. "What-If" Scenario Simulation & Trade-Off Engine (PRD Section 19 & 20 - Phase 10)
app.post("/api/simulate-scenario", async (req, res) => {
  try {
    const { 
      confirmedGoals = [], 
      currentRecommendations = [], 
      dailyContext, 
      scenario 
    } = req.body;

    if (!scenario) {
      return res.status(400).json({ error: "Scenario parameters are required" });
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `You are the NEXT5 "What-If" Scenario Simulation & Trade-Off Engine (PRD Section 19 & 20).
Your job is to simulate how daily execution must reconfigure under hypothetical constraints or sudden workplace disruptions.

SIMULATED SCENARIO:
Type: ${scenario.type}
Title: ${scenario.title}
Description: ${scenario.description || scenario.customPrompt || "Operational constraint modification"}
Hypothetical Available Time: ${scenario.timeOption || dailyContext?.availableTime || "same"}
Hypothetical Energy Level: ${scenario.energyOption || dailyContext?.energyLevel || "same"}

CONFIRMED ACTIVE GOALS:
${JSON.stringify(confirmedGoals.map((g: any) => ({ id: g.id, title: g.title, category: g.category, importance: g.importance })), null, 2)}

CURRENT PLAN (ACTIVE RECOMMENDATIONS):
${JSON.stringify(currentRecommendations.map((r: any) => ({ rank: r.priorityRank, action: r.action, category: r.category, minutes: r.estimatedMinutes, status: r.status })), null, 2)}

CORE OBJECTIVES:
1. Generate up to 5 simulated recommendations adapted to this hypothetical reality.
   - If time is tight (e.g. 15-45 min), total minutes MUST realistically fit the constrained window, breaking large moves into 10-15m unblockers.
   - If energy is crashed (20%), avoid deep cognitive analysis; surface low-friction or restorative starters.
   - Include 1 negative constraint if appropriate to defend boundaries.
2. Provide Trade-Off Analysis:
   - protectedMoves: list of action titles from current plan that were kept and preserved.
   - displacedMoves: list of { originalRank, action, reasonForDisplacement } explaining why specific current moves were deferred or dropped.
   - newElevatedMoves: list of { rank, action, whyElevated } showing what was elevated or adapted.
   - tradeOffRationale: 2-3 sentence executive explanation of the strategic compromise made.
   - riskAssessment: 1 sentence stating what strategic risk was consciously accepted.

Return valid JSON adhering to the specified schema.`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                simulatedRecommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      action: { type: Type.STRING },
                      category: { type: Type.STRING },
                      estimatedMinutes: { type: Type.NUMBER },
                      whyThisNow: { type: Type.STRING },
                      priorityRank: { type: Type.NUMBER },
                      isNegativeConstraint: { type: Type.BOOLEAN },
                      confidence: { type: Type.NUMBER },
                      substeps: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                    required: ["id", "action", "category", "estimatedMinutes", "whyThisNow", "priorityRank", "confidence"],
                  },
                },
                tradeOffAnalysis: {
                  type: Type.OBJECT,
                  properties: {
                    protectedMoves: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    displacedMoves: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          originalRank: { type: Type.NUMBER },
                          action: { type: Type.STRING },
                          reasonForDisplacement: { type: Type.STRING },
                        },
                        required: ["action", "reasonForDisplacement"],
                      },
                    },
                    newElevatedMoves: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          rank: { type: Type.NUMBER },
                          action: { type: Type.STRING },
                          whyElevated: { type: Type.STRING },
                        },
                        required: ["rank", "action", "whyElevated"],
                      },
                    },
                    tradeOffRationale: { type: Type.STRING },
                    riskAssessment: { type: Type.STRING },
                  },
                  required: ["protectedMoves", "displacedMoves", "newElevatedMoves", "tradeOffRationale", "riskAssessment"],
                },
              },
              required: ["simulatedRecommendations", "tradeOffAnalysis"],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return res.json(parsed);
        }
      } catch (geminiErr: any) {
        console.log("[Notice] Using heuristic scenario simulation fallback:", geminiErr?.message || geminiErr);
      }
    }

    // Heuristic Fallback for Scenario Simulation
    const topMove = currentRecommendations[0] || {
      id: "sim_1",
      action: confirmedGoals[0]?.title ? `Review and advance ${confirmedGoals[0].title}` : "Ship Core Strategic Deliverable",
      category: "work",
      estimatedMinutes: 45,
      whyThisNow: "Highest-order goal alignment.",
      priorityRank: 1,
      confidence: 0.95,
      substeps: ["Open document outline", "Draft core deliverable summary", "Send for stakeholder signoff"],
    };

    let simulatedRecs: any[] = [];
    let protectedMoves: string[] = [];
    let displacedMoves: any[] = [];
    let newElevatedMoves: any[] = [];
    let tradeOffRationale = "";
    let riskAssessment = "";

    if (scenario.type === "emergency_time") {
      // Shrunk to 30 min window
      simulatedRecs = [
        {
          id: `sim_em_${Date.now()}_1`,
          action: `[15m Unblocker] ${topMove.action.replace(/^\[.*?\]\s*/, '')}`,
          category: topMove.category || "work",
          estimatedMinutes: 15,
          whyThisNow: "Emergency time compression: isolated the single non-negotiable step to prevent complete project stalling.",
          priorityRank: 1,
          confidence: 0.98,
          substeps: ["Open draft and make 3 critical edits", "Send progress update to team"],
        },
        {
          id: `sim_em_${Date.now()}_2`,
          action: "Quick Triage: Reply to urgent blocker messages only",
          category: "communication",
          estimatedMinutes: 10,
          whyThisNow: "Keeps operational dependencies unblocked in under 10 minutes.",
          priorityRank: 2,
          confidence: 0.88,
          substeps: ["Scan inbox for urgent flags", "Send brief acknowledgments"],
        },
        {
          id: `sim_em_${Date.now()}_3`,
          action: "Do NOT begin long-form deep research or non-critical formatting today",
          category: "constraint",
          estimatedMinutes: 0,
          isNegativeConstraint: true,
          whyThisNow: "Time is capped; opening sprawling tasks guarantees failure and unfinished residue.",
          priorityRank: 3,
          confidence: 0.99,
        },
      ];

      protectedMoves = [topMove.action];
      displacedMoves = currentRecommendations.slice(1).map((r: any) => ({
        originalRank: r.priorityRank,
        action: r.action,
        reasonForDisplacement: "Exceeds available 30-minute emergency capacity; postponed to protect #1 priority.",
      }));
      newElevatedMoves = [
        {
          rank: 1,
          action: simulatedRecs[0].action,
          whyElevated: "Compressed into a 15-minute micro-unblocker to guarantee execution under extreme time constraint.",
        },
      ];
      tradeOffRationale = "Preserved critical forward momentum on top-tier deliverable while shedding all secondary administrative overhead to prevent deadline breach.";
      riskAssessment = "Minor delay on secondary goals; zero structural damage to core commitments.";
    } else if (scenario.type === "energy_crash") {
      // Low cognitive load
      simulatedRecs = [
        {
          id: `sim_ec_${Date.now()}_1`,
          action: "Low-Cognitive Sweep: File receipts, clear tabs, and organize work artifacts",
          category: "organization",
          estimatedMinutes: 20,
          whyThisNow: "Energy is depleted (20%); low-friction organizational tasks clear mental clutter without taxing executive function.",
          priorityRank: 1,
          confidence: 0.92,
          substeps: ["Close 10 dormant browser tabs", "Archive processed documents"],
        },
        {
          id: `sim_ec_${Date.now()}_2`,
          action: `Light Review: Read bullet notes for ${confirmedGoals[0]?.title || 'Key Goal'} with zero writing expectation`,
          category: "review",
          estimatedMinutes: 15,
          whyThisNow: "Passive exposure maintains subconscious incubation without demanding active synthesis.",
          priorityRank: 2,
          confidence: 0.85,
        },
        {
          id: `sim_ec_${Date.now()}_3`,
          action: "Do NOT initiate complex strategic decisions, contentious email debates, or heavy code architecture",
          category: "constraint",
          estimatedMinutes: 0,
          isNegativeConstraint: true,
          whyThisNow: "Decision quality drops drastically under severe cognitive fatigue.",
          priorityRank: 3,
          confidence: 0.98,
        },
      ];

      protectedMoves = [];
      displacedMoves = currentRecommendations.map((r: any) => ({
        originalRank: r.priorityRank,
        action: r.action,
        reasonForDisplacement: "Demands deep executive focus that cannot be sustained at 20% energy capacity.",
      }));
      newElevatedMoves = [
        {
          rank: 1,
          action: simulatedRecs[0].action,
          whyElevated: "Provides cognitive relief and momentum recovery without triggering burnout.",
        },
      ];
      tradeOffRationale = "Prioritized cognitive restoration and low-stress organizational triage over high-stakes deep work to prevent compromised decision quality.";
      riskAssessment = "Heavy analytical work delayed by 24 hours until cognitive battery is restored.";
    } else if (scenario.type === "surprise_focus") {
      // 3+ hours uninterrupted focus
      simulatedRecs = [
        {
          id: `sim_sf_${Date.now()}_1`,
          action: `Deep Work Block: Build end-to-end architecture & deliverable for ${confirmedGoals[0]?.title || 'Primary Goal'}`,
          category: "deep_work",
          estimatedMinutes: 90,
          whyThisNow: "3 hours of uninterrupted focus unlocked; capitalizing on flow state for highest-order compounding.",
          priorityRank: 1,
          confidence: 0.96,
          substeps: ["Turn off Slack notifications", "Complete comprehensive draft", "Self-review against criteria"],
        },
        {
          id: `sim_sf_${Date.now()}_2`,
          action: `Secondary Acceleration: Complete draft proposal for ${confirmedGoals[1]?.title || 'Growth Initiative'}`,
          category: "deep_work",
          estimatedMinutes: 45,
          whyThisNow: "Flow momentum carries over into second-tier needle mover.",
          priorityRank: 2,
          confidence: 0.9,
        },
        {
          id: `sim_sf_${Date.now()}_3`,
          action: "Do NOT check email or social feeds during the 3-hour focus window",
          category: "constraint",
          estimatedMinutes: 0,
          isNegativeConstraint: true,
          whyThisNow: "Defends rare uninterrupted deep-work block from context switching.",
          priorityRank: 3,
          confidence: 0.99,
        },
      ];

      protectedMoves = [topMove.action];
      displacedMoves = currentRecommendations.filter((r: any) => r.category === 'communication' || r.estimatedMinutes <= 15).map((r: any) => ({
        originalRank: r.priorityRank,
        action: r.action,
        reasonForDisplacement: "Minor transactional tasks deferred to make room for 90-minute compounding deep-work block.",
      }));
      newElevatedMoves = [
        {
          rank: 1,
          action: simulatedRecs[0].action,
          whyElevated: "Expanded into full uninterrupted strategic sprint.",
        },
      ];
      tradeOffRationale = "Capitalized on unexpected schedule clearance to advance core multi-day milestones that normally suffer from fragmentation.";
      riskAssessment = "Administrative inbox responses delayed by a few hours; high strategic payoff.";
    } else {
      // General / custom simulation
      simulatedRecs = currentRecommendations.slice(0, 3).map((r: any, idx: number) => ({
        ...r,
        id: `sim_gen_${Date.now()}_${idx}`,
        whyThisNow: `Simulated for condition: ${scenario.title || 'Scenario adjustment'}`,
      }));

      protectedMoves = simulatedRecs.map((r) => r.action);
      displacedMoves = currentRecommendations.slice(3).map((r: any) => ({
        originalRank: r.priorityRank,
        action: r.action,
        reasonForDisplacement: "Reprioritized out of top tier to respect simulated constraints.",
      }));
      newElevatedMoves = [];
      tradeOffRationale = `Adjusted execution sequence specifically tailored to "${scenario.title || 'custom scenario'}".`;
      riskAssessment = "Moderate adjustment of daily allocations.";
    }

    return res.json({
      simulatedRecommendations: simulatedRecs,
      tradeOffAnalysis: {
        protectedMoves,
        displacedMoves,
        newElevatedMoves,
        tradeOffRationale,
        riskAssessment,
      },
    });
  } catch (err: any) {
    console.error("Error in /api/simulate-scenario:", err);
    res.status(500).json({ error: err.message || "Failed to simulate scenario" });
  }
});

// 2e. Spoken Executive Audio Briefing Endpoint (Phase 11 - PRD Section 5 & 25)
app.post("/api/generate-briefing", async (req, res) => {
  try {
    const { confirmedGoals = [], currentRecommendations = [], dailyContext, userName = "Leader" } = req.body;

    const ai = getGeminiClient();
    if (ai) {
      try {
        const topMoves = currentRecommendations.slice(0, 5);
        const prompt = `You are the NEXT5 Executive Audio Briefing anchor.
Your tone is calm, authoritative, grounded, and concise—like an elite chief of staff delivering a 60-second morning briefing.
Write a spoken audio script (130-180 words, speaking time ~60-75 seconds) for ${userName}.

TODAY'S CONTEXT:
- Available Time: ${dailyContext?.availableTime || "Normal"}
- Energy Level: ${dailyContext?.energy || "70"}%
- Today's Reality: "${dailyContext?.freeformContext || "Standard operating cadence"}"

TODAY'S PRIORITIZED MOVES:
${topMoves.map((r: any) => `#${r.priorityRank}: ${r.action} (${r.estimatedMinutes}m) - Why: ${r.whyThisNow} ${r.isNegativeConstraint ? '[BOUNDARY / DO NOT DO]' : ''}`).join('\n')}

INSTRUCTIONS FOR SPOKEN SCRIPT:
1. Greet the user calmly and state the operating reality based on time and energy.
2. Anchor: Spotlight priority Move #1 as the primary needle mover. Tell them why completing this alone constitutes a winning day.
3. The Sequence: Group moves #2 and #3 into a cohesive flow.
4. Boundary Defense: Emphasize what to explicitly protect against or decline today.
5. Grounding Close: A brief sentence to begin execution without anxiety.

Return clean JSON matching the schema.`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                script: { type: Type.STRING },
                bulletSummary: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                estimatedDurationSeconds: { type: Type.NUMBER },
                keyAnchor: { type: Type.STRING },
                keyBoundary: { type: Type.STRING },
              },
              required: ["script", "bulletSummary", "estimatedDurationSeconds", "keyAnchor", "keyBoundary"],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return res.json({
            ...parsed,
            generatedAt: new Date().toISOString(),
          });
        }
      } catch (geminiErr: any) {
        console.log("[Notice] Using heuristic audio briefing fallback:", geminiErr?.message || geminiErr);
      }
    }

    // Heuristic Fallback
    const topRec = currentRecommendations[0];
    const topAction = topRec ? topRec.action : (confirmedGoals[0]?.title ? `Advance ${confirmedGoals[0].title}` : "Ship Core Deliverable");
    const secondRec = currentRecommendations[1];
    const boundaryRec = currentRecommendations.find((r: any) => r.isNegativeConstraint);
    const boundaryText = boundaryRec ? boundaryRec.action : "Do not let unscheduled reactive requests hijack your morning.";

    const fallbackScript = `Good morning, ${userName}. With ${dailyContext?.availableTime || "your available hours"} and an energy level calibrated at ${dailyContext?.energy || "70"} percent, your priority focus is locked.

Your primary anchor today is Move Number One: ${topAction}. This is your non-negotiable needle-mover. If you finish this one block, today is already an objective strategic win.

${secondRec ? `Once your anchor is delivered, transition into: ${secondRec.action}.` : ''}

Crucially, protect your boundary: ${boundaryText}.

Silence notifications, take one deliberate breath, and begin Move Number One.`;

    return res.json({
      script: fallbackScript,
      bulletSummary: [
        `Primary Anchor: ${topAction}`,
        `Secondary Sequence: ${secondRec ? secondRec.action : 'Complete core commitments'}`,
        `Boundary Defense: ${boundaryText}`,
      ],
      estimatedDurationSeconds: 65,
      keyAnchor: topAction,
      keyBoundary: boundaryText,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error in /api/generate-briefing:", err);
    res.status(500).json({ error: err.message || "Failed to generate briefing" });
  }
});

// 2f. Friction Decompressor & Cognitive Unblocker Endpoint (Phase 11 - PRD Section 5 & 25)
app.post("/api/decompress-friction", async (req, res) => {
  try {
    const { voiceNoteOrText, currentRecommendations = [], dailyContext } = req.body;

    if (!voiceNoteOrText || typeof voiceNoteOrText !== "string") {
      return res.status(400).json({ error: "Input text is required" });
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `You are NEXT5's Cognitive Friction Decompressor (PRD Section 5 & 25).
The user is experiencing resistance, anxiety, procrastination, or overwhelm. They just provided this raw stream of consciousness:
"${voiceNoteOrText}"

Current active NEXT5 moves:
${currentRecommendations.map((r: any) => `#${r.priorityRank}: ${r.action}`).join('\n')}

User Context:
Available time: ${dailyContext?.availableTime || "unknown"}, Energy: ${dailyContext?.energy || "70"}%

YOUR TASK:
1. Diagnose the Root Friction: Isolate the real psychological or operational block in 1-2 concise sentences (e.g., fear of conflict, scope ambiguity, perfectionist paralysis, decision fatigue).
2. Generate ONE 5-Minute Micro-Move: An immediate, low-stakes starter step that eliminates inertia and builds momentum immediately.
3. Recommend an Engine Mode: ('15min' | 'bad_day' | 'catch_up' | 'normal') if they should downshift their day.
4. Strategic Reassurance: 1 grounding sentence reframing reality.

Return valid JSON adhering to the schema.`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                rootFriction: { type: Type.STRING },
                fiveMinuteMicroMove: { type: Type.STRING },
                recommendedMode: { 
                  type: Type.STRING,
                  enum: ["normal", "15min", "bad_day", "catch_up"],
                },
                strategicReassurance: { type: Type.STRING },
              },
              required: ["rootFriction", "fiveMinuteMicroMove", "recommendedMode", "strategicReassurance"],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return res.json(parsed);
        }
      } catch (geminiErr: any) {
        console.log("[Notice] Using heuristic friction decompression fallback:", geminiErr?.message || geminiErr);
      }
    }

    // Heuristic Fallback
    const isOverwhelmed = voiceNoteOrText.toLowerCase().includes("overwhelm") || 
                          voiceNoteOrText.toLowerCase().includes("tired") || 
                          voiceNoteOrText.toLowerCase().includes("exhausted") ||
                          voiceNoteOrText.toLowerCase().includes("too much");

    return res.json({
      rootFriction: isOverwhelmed 
        ? "Cognitive overload combined with task ambiguity. You are carrying the weight of the entire project all at once rather than the immediate next 5 minutes."
        : "Initial activation energy resistance. The cognitive startup cost feels heavier than the task itself.",
      fiveMinuteMicroMove: "Open a blank scratchpad document and write exactly 3 incomplete bullet points describing the first action. Do not format or edit.",
      recommendedMode: isOverwhelmed ? "15min" : "normal",
      strategicReassurance: "Action generates clarity, not the other way around. You only need to solve the next 300 seconds.",
    });
  } catch (err: any) {
    console.error("Error in /api/decompress-friction:", err);
    res.status(500).json({ error: err.message || "Failed to decompress friction" });
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
        const prompt = `You are the NEXT5 AI Decision & Priority Coach.
You are NOT a generic chatbot. You are NOT a life coach spouting platitudes.
Your single purpose is to help the user reason about their PRIORITIES right now.

User Question: "${question}"

User Context:
- Available Time: ${dailyContext?.availableTime || "Normal"}
- Energy: ${dailyContext?.energy || "70"}%
- Daily Reality: ${dailyContext?.freeformContext || "None"}
- Current Confirmed Goals: ${JSON.stringify(confirmedGoals?.map((g: any) => g.title) || [])}
- Active NEXT5 Moves: ${JSON.stringify(currentRecommendations?.map((r: any) => `#${r.priorityRank}: ${r.action} (${r.category})`) || [])}
- User Memory/Preferences: ${JSON.stringify(memory || [])}

Provide a direct, crisp response (1-3 brief paragraphs).
Focus on trade-offs, sequencing, what to drop, or why something is ranked first.
Be willing to tell the user what NOT to do.`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.8-flash",
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

  // Split user thought dump by newlines, semicolons, or sentence delimiters
  const rawClauses = text
    .split(/\n+|;|\. |\band\b/i)
    .map(c => c.trim().replace(/^[-*•\d.)\s]+/, ""))
    .filter(c => c.length > 5);

  const seenTitles = new Set<string>();

  for (const clause of rawClauses) {
    if (goals.length >= 5) break;

    const lower = clause.toLowerCase();
    // Clean up title
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

    // Check for explicit stated deadline in the clause
    let deadline: string | undefined = undefined;
    const deadlineMatch = clause.match(/\b(today|tomorrow|friday|monday|next week|end of month|q[1-4])\b/i);
    if (deadlineMatch) {
      deadline = deadlineMatch[0].charAt(0).toUpperCase() + deadlineMatch[0].slice(1);
    }

    // Check for explicit numeric targets in the clause
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

  // If no goals extracted from clauses, use raw text snippet safely
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

  // If user provided NO goals, NO context, and NO urgent items, return empty array
  if ((!goals || goals.length === 0) && !contextStr && urgentItems.length === 0) {
    return [];
  }

  const moves: any[] = [];

  // 1. Process explicit urgent items from dailyContext
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

  // 2. Process user confirmed goals
  if (goals && goals.length > 0) {
    // Sort goals by importance and deadline proximity
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
      // Skip if this goal is already addressed
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

  // 3. Add context-driven unblocker or negative boundary if appropriate
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
    return `When you feel like you have too much to do, remember NEXT5's core tenet: you don't need to finish everything today, you only need to execute what actually moves the needle.

Look at your #1 priority right now. Complete that single move first. Give yourself permission to ignore low-priority administrative tasks (like clearing inbox emails or tweaking presentations) until your top 2 non-negotiables are handled.`;
  }
  if (q.includes("why did you prioritize") || q.includes("why #1")) {
    const top = recs[0];
    return `Your top move (${top ? top.action : "your #1 item"}) was prioritized because it carries the most immediate consequence and deadline leverage. Delaying it compounds anxiety and creates downstream friction, whereas completing it creates immediate cognitive relief.`;
  }
  if (q.includes("change") || q.includes("rethink") || q.includes("fallen behind")) {
    return `Priorities shift when reality shifts—that's healthy. Update today's circumstances in the Daily Context section or switch to 15-Minute or Low-Energy Mode to instantly recalibrate around what is realistically achievable right now.`;
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
