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

// 1. Goal Extraction Endpoint (Intelligent Jargon Filtering & Multi-Goal Breakdown)
app.post("/api/extract-goals", async (req, res) => {
  try {
    const { text, contexts } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `You are NEXT5's advanced voice extraction and intelligent goal decomposition engine.
The user provided a raw voice prompt or conversational stream-of-consciousness thought dump describing what they want to accomplish, juggle, build, fix, finish, or organize.

User contexts: ${(contexts || []).join(", ") || "General"}
Raw User Voice Prompt:
"""${text}"""

CRITICAL INTELLIGENCE & JARGON FILTERING MANDATES:
1. RUTHLESSLY FILTER CONVERSATIONAL JARGON & FILLER:
   - Voice transcripts contain excessive verbal filler, hesitations, and colloquial clutter (e.g., "um", "uh", "you know", "like", "so basically what I was thinking is", "there is just a lot on my plate right now", "to be honest", "at the end of the day", "my boss was saying", "we gotta touch base and circle back", "I'm feeling like I need to").
   - Strip out ALL conversational filler and non-actionable fluff.
   - Discern the real, concrete commitments, deliverables, projects, habits, and targets underneath.

2. EXHAUSTIVE MULTI-GOAL BREAKDOWN (NEVER OUTPUT JUST ONE GOAL IF MULTIPLE ARE MENTIONED):
   - Users often speak in one single, continuous, breathless run-on sentence containing 3, 4, 5, 6, 8 or more different desires or tasks.
   - YOU MUST SPLIT AND SEPARATE EVERY DISTINCT INTENTION INTO ITS OWN INDEPENDENT GOAL ITEM.
   - NEVER collapse multiple distinct tasks or desires into one vague overarching umbrella goal!
   - Example: If the user says: "I need to fix the website and also review the investor deck by tomorrow morning and I gotta start hitting the gym three days a week and renew my expired passport and finalize the quarterly budget",
     YOU MUST OUTPUT 5 DISTINCT GOALS:
     1. "Fix website technical issues"
     2. "Review investor pitch deck"
     3. "Work out at gym 3 days per week"
     4. "Renew expired passport"
     5. "Finalize quarterly budget spreadsheet"
   - Output as many separate goals as the user mentioned!

3. CRISP, ACTION-ORIENTED GOAL TITLES:
   - Begin each title with a strong action verb (e.g., "Build...", "Finalize...", "Review...", "Call...", "Schedule...", "Implement...", "Exercise...", "Save...").
   - Keep titles clean, professional, and concise (under 50 characters).

4. ACCURATE CATEGORIZATION:
   - 'work': Professional assignments, coding, client deliverables, meetings, corporate tasks.
   - 'business': Revenue, sales, company growth, marketing, fundraising, hiring.
   - 'career': Skill development, certifications, interviews, resume, education.
   - 'personal': Home errands, family, personal life, legal, administrative chores.
   - 'health': Fitness, nutrition, sleep, mental wellbeing, doctor/dentist appointments.
   - 'finance': Budgeting, investments, taxes, debt payoff, savings targets.

5. ACCURATE GOAL TYPES & IMPORTANCE:
   - goalType: 'target' | 'project' | 'habit' | 'milestone' | 'outcome'.
   - importance: 'high' | 'medium' | 'low'.

6. EXTRACT PARAMETERS:
   - deadline: Pinpoint explicit or implied deadlines (e.g., "Friday", "Tomorrow morning", "Next month", "Thursday 3pm").
   - targetValue & unit: Extract metrics (e.g., "$10,000", "3", "days/week", "10k run").

7. GENERATE IMMEDIATE FIRST MOVE (15-30 MIN STARTER):
   - For every extracted goal, formulate a crisp, concrete "suggestedFirstMove" (a low-friction 15-30 minute action the user can immediately execute today). This directly feeds NEXT5's prioritization engine to create their Next 5 Moves!

8. JARGON FILTERING SUMMARY:
   - In 'jargonFiltered', list 2-5 filler phrases or chatter eliminated, and state briefly in summary how the raw sentence was distilled into distinct goals.`;

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
                      suggestedFirstMove: { type: Type.STRING },
                    },
                    required: ["title", "category", "goalType", "importance", "isInferred"],
                  },
                },
                jargonFiltered: {
                  type: Type.OBJECT,
                  properties: {
                    originalWordCount: { type: Type.NUMBER },
                    fillerPhrasesRemoved: { type: Type.ARRAY, items: { type: Type.STRING } },
                    summary: { type: Type.STRING },
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

    // Heuristic Fallback (Multi-pass intelligent filter)
    const fallbackResult = generateFallbackGoals(text, contexts);
    return res.json({
      goals: fallbackResult.goals,
      jargonFiltered: fallbackResult.jargonFiltered,
      extractedContext: {
        immediateDeadlines: [],
        statedEnergy: text.toLowerCase().includes("exhausted") || text.toLowerCase().includes("tired") ? "low" : "normal",
        keyPressures: ["Extracted from voice prompt"],
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

// 4. Executive Audio Briefing Generator
app.post("/api/generate-briefing", async (req, res) => {
  try {
    const { confirmedGoals, currentRecommendations, dailyContext, userName = "Leader" } = req.body;
    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `You are NEXT5's Executive Audio Briefing anchor. Prepare an ultra-concise, spoken-word executive priority briefing for ${userName}.
Context:
- Available Time: ${dailyContext?.availableTime || "Normal"}
- Energy Level: ${dailyContext?.energy || "70"}%
- Daily Reality / Pressures: "${dailyContext?.freeformContext || "Standard operational day"}"
- Active NEXT5 Prioritized Moves: ${JSON.stringify(currentRecommendations?.map((r: any) => `#${r.priorityRank}: ${r.action} (${r.estimatedMinutes}m, ${r.category})`) || [])}
- Primary Confirmed Goals: ${JSON.stringify(confirmedGoals?.map((g: any) => g.title) || [])}

Requirements:
1. "script": Write a punchy, spoken briefing (around 120-180 words, ~60-80 seconds when read aloud). Natural spoken cadence, no robotic lists or awkward markdown syntax. Greet them warmly, name the single most critical #1 anchor move, explain why it's #1 right now, give the sequencing for the other moves, and issue a clear strategic boundary ("What to ignore today").
2. "bulletSummary": 3-4 crisp high-level bullet takeaways.
3. "estimatedDurationSeconds": 60 to 90 seconds.
4. "keyAnchor": The single top priority move action title.
5. "keyBoundary": Clear statement of what NOT to do today to protect focus.`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                script: { type: Type.STRING },
                bulletSummary: { type: Type.ARRAY, items: { type: Type.STRING } },
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
      } catch (err: any) {
        console.log("[Notice] Using fallback briefing generation:", err?.message || err);
      }
    }

    // Heuristic Fallback
    const topRec = currentRecommendations?.[0];
    const recCount = currentRecommendations?.length || 0;
    const anchorText = topRec ? topRec.action : "Review and advance your highest leverage objective";
    const boundaryRec = currentRecommendations?.find((r: any) => r.isNegativeConstraint);
    const boundaryText = boundaryRec ? boundaryRec.action : "Avoid non-essential chat notifications and low-priority emails until your #1 anchor move is complete.";

    const fallbackScript = `Good day, ${userName}. Here is your NEXT5 priority briefing. Given your available time of ${dailyContext?.availableTime || "one hour"} and current energy level, your day hinges on a single anchor: ${anchorText}. Focus exclusively on locking this down before fragmenting your attention. You have ${recCount} prioritized move${recCount === 1 ? "" : "s"} locked in. Your strategic boundary today is clear: ${boundaryText}. Execute your top move, trust the sequence, and make today count.`;

    return res.json({
      script: fallbackScript,
      bulletSummary: [
        `Anchor Move: ${anchorText}`,
        `Sequence: Focus on priority #1 before addressing secondary items`,
        `Boundary: ${boundaryText}`,
      ],
      estimatedDurationSeconds: 60,
      keyAnchor: anchorText,
      keyBoundary: boundaryText,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error in /api/generate-briefing:", err);
    res.status(500).json({ error: err.message || "Failed to generate briefing" });
  }
});

// 5. Voice Friction Decompressor Endpoint
app.post("/api/decompress-friction", async (req, res) => {
  try {
    const { voiceNoteOrText, currentRecommendations, dailyContext } = req.body;
    const text = (voiceNoteOrText || "").trim();
    if (!text) {
      return res.status(400).json({ error: "Input text is required" });
    }

    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `You are NEXT5's Cognitive Friction Breaker and Tactical Unblocker.
The user is experiencing friction, procrastination, hesitation, overwhelm, or dread.
User expressed: "${text}"

Current context:
- Available Time: ${dailyContext?.availableTime || "Normal"}
- Energy Level: ${dailyContext?.energy || "70"}%
- Pending Moves: ${JSON.stringify(currentRecommendations?.filter((r: any) => r.status === 'pending').map((r: any) => ({ id: r.id, rank: r.priorityRank, action: r.action })) || [])}

Tasks:
1. "rootFriction": Diagnose the exact psychological or practical bottleneck (e.g., Task Ambiguity, Fear of Imperfection, Low Cognitive Energy, Scope Creep, Emotional Dread).
2. "fiveMinuteMicroMove": Create a ridiculously small, zero-resistance, 5-minute physical action that gets them moving with zero cognitive friction. (e.g. "Open the document and write 2 bullet points with your eyes half closed", "Draft a 1-sentence placeholder email").
3. "recommendedMode": Choose best EngineMode: '15min' | 'low_energy' | 'bad_day' | 'normal' | 'high_energy' | 'catch_up'.
4. "strategicReassurance": A grounded 1-2 sentence tactical reassurance that eliminates guilt and restores agency.
5. "suggestedActionId": If this pertains to one of their pending moves, return its ID; otherwise null.`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                rootFriction: { type: Type.STRING },
                fiveMinuteMicroMove: { type: Type.STRING },
                recommendedMode: { type: Type.STRING },
                strategicReassurance: { type: Type.STRING },
                suggestedActionId: { type: Type.STRING },
              },
              required: ["rootFriction", "fiveMinuteMicroMove", "strategicReassurance"],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return res.json(parsed);
        }
      } catch (err: any) {
        console.log("[Notice] Using fallback friction decompression:", err?.message || err);
      }
    }

    // Heuristic Fallback
    const lower = text.toLowerCase();
    let rootFriction = "Initiation Friction: The cognitive activation energy to begin feels disproportionately heavy right now.";
    let recMode = "15min";
    if (lower.includes("tired") || lower.includes("exhausted") || lower.includes("sleep")) {
      rootFriction = "Depleted Cognitive Energy: Your battery is running low, making complex decision-making feel exhausting.";
      recMode = "low_energy";
    } else if (lower.includes("overwhelm") || lower.includes("too much") || lower.includes("chaos")) {
      rootFriction = "Working Memory Overload: Too many competing loops are open simultaneously.";
      recMode = "bad_day";
    }

    const firstPending = currentRecommendations?.find((r: any) => r.status === "pending" && !r.isNegativeConstraint);

    return res.json({
      rootFriction,
      fiveMinuteMicroMove: firstPending 
        ? `Open the workspace for "${firstPending.action}" and set a timer for 5 minutes. Do nothing else except writing 1 rough sentence or bullet point.`
        : "Close all open tabs except one. Write down the single next word or sentence required to move forward, then take a deep breath.",
      recommendedMode: recMode,
      strategicReassurance: "You do not need to finish the whole project today. Momentum doesn't require motivation—it only requires starting the first micro-step.",
      suggestedActionId: firstPending?.id,
    });
  } catch (err: any) {
    console.error("Error in /api/decompress-friction:", err);
    res.status(500).json({ error: err.message || "Failed to decompress friction" });
  }
});

// 6. Weekly Executive Debrief Endpoint
app.post("/api/weekly-debrief", async (req, res) => {
  try {
    const { goals, recommendations, memory } = req.body;
    const ai = getGeminiClient();

    if (ai) {
      try {
        const completedCount = recommendations?.filter((r: any) => r.status === "completed").length || 0;
        const totalCount = recommendations?.length || 0;

        const prompt = `You are NEXT5's Chief of Staff and Strategic Advisor conducting a weekly executive debrief.
Review the user's weekly execution data:
- Completed Moves: ${completedCount} / ${totalCount}
- Active Goals: ${JSON.stringify(goals?.map((g: any) => ({ title: g.title, category: g.category, deadline: g.deadline, status: g.status })) || [])}
- Past Moves Status: ${JSON.stringify(recommendations?.map((r: any) => ({ action: r.action, status: r.status, category: r.category })) || [])}
- Stored User Memory & Behavioral Patterns: ${JSON.stringify(memory || [])}

Generate an insightful, high-caliber weekly debrief report.
Return JSON matching WeeklyDebriefReport:
- executiveSummary: 2-3 sentences evaluating the week's execution and focus.
- strategicExecutionScore: number 0-100 based on completion and alignment.
- alignmentGrade: letter grade like "A", "A-", "B+", "B", etc.
- topWin: The standout execution highlight of the week.
- primaryBlindspot: Key recurring friction or missed opportunity.
- driftingGoalAlert: Warning if any high-importance goal had no progress or is drifting.
- upcomingStrategicPriorities: 3 key initiatives for next week.
- suggestedMemoryRule: { content: string, type: 'explicit_context'|'inferred_constraint'|'observed_pattern', explanation: string }
- restorationAdvice: Actionable weekend/reset advice to restore cognitive capacity.`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.6-flash",
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
                upcomingStrategicPriorities: { type: Type.ARRAY, items: { type: Type.STRING } },
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
          return res.json({
            ...parsed,
            generatedAt: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        console.log("[Notice] Using fallback weekly debrief generation:", err?.message || err);
      }
    }

    // Heuristic Fallback
    const completedMoves = recommendations?.filter((r: any) => r.status === "completed") || [];
    const compCount = completedMoves.length;
    const score = Math.min(100, Math.max(45, 55 + compCount * 10));
    const grade = score >= 85 ? "A" : score >= 75 ? "B+" : score >= 65 ? "B" : "C+";

    const topGoal = goals?.[0]?.title || "Core Objectives";
    const topCompleted = completedMoves[0]?.action || "Consistently executing daily prioritized moves";

    return res.json({
      executiveSummary: `This week you logged ${compCount} completed moves, maintaining solid focus on core goals without letting secondary busywork overwhelm your schedule.`,
      strategicExecutionScore: score,
      alignmentGrade: grade,
      topWin: `Maintained execution discipline on: ${topCompleted}`,
      primaryBlindspot: "Afternoon attention fragmentation: protect your deep work windows earlier in the day.",
      driftingGoalAlert: goals?.length > 2 ? `Ensure regular touchpoints on "${goals[goals.length - 1]?.title}" to prevent timeline slippage.` : "No major goal drift detected.",
      upcomingStrategicPriorities: [
        `Lock in primary milestone for ${topGoal}`,
        "Protect morning high-energy hours from reactive meetings",
        "Conduct quick mid-week calibration when reality shifts"
      ],
      suggestedMemoryRule: {
        content: "Prefers focused morning execution blocks for complex deliverables.",
        type: "observed_pattern",
        explanation: "Observed higher completion rate when tackling #1 moves early.",
      },
      restorationAdvice: "Step away from screens this weekend to reset your dopamine baseline and recharge working memory.",
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error in /api/weekly-debrief:", err);
    res.status(500).json({ error: err.message || "Failed to generate weekly debrief" });
  }
});

// 7. Scenario Simulation Endpoint
app.post("/api/simulate-scenario", async (req, res) => {
  try {
    const { confirmedGoals, currentRecommendations, dailyContext, scenario } = req.body;
    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `You are NEXT5's Scenario Simulator and Decision Risk Analyzer.
Simulate what happens to the user's priority sequence when a major operational shift occurs.

SCENARIO TRIGGER:
- Title: ${scenario?.title || "Circumstance Shift"}
- Description: ${scenario?.description || "A sudden shift in constraints"}
- Simulated Available Time: ${scenario?.timeOption || dailyContext?.availableTime || "15m"}
- Simulated Energy: ${scenario?.energyOption || dailyContext?.energy || "40"}%
- User Note: "${scenario?.customPrompt || ""}"

CURRENT BASELINE:
- Current Confirmed Goals: ${JSON.stringify(confirmedGoals?.map((g: any) => ({ id: g.id, title: g.title, category: g.category, importance: g.importance })) || [])}
- Current Ranked Moves: ${JSON.stringify(currentRecommendations?.map((r: any) => ({ id: r.id, rank: r.priorityRank, action: r.action, minutes: r.estimatedMinutes, isNegativeConstraint: r.isNegativeConstraint })) || [])}

TASK:
1. Generate up to 3-5 recalculated "simulatedRecommendations" that optimally adapt to this shock. Respect strict time/energy constraints.
2. Provide a rigorous "tradeOffAnalysis":
   - "protectedMoves": Array of move action names that MUST NOT be dropped despite the shock.
   - "displacedMoves": Array of objects { originalRank, action, reasonForDisplacement } explaining what was cut/postponed and why.
   - "newElevatedMoves": Array of objects { rank, action, whyElevated } explaining any new tactical moves or constraints introduced.
   - "tradeOffRationale": Direct explanation of the trade-off calculus.
   - "riskAssessment": What risks are accepted by making this shift vs what risks were averted.`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.6-flash",
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
                      action: { type: Type.STRING },
                      category: { type: Type.STRING },
                      rationale: { type: Type.STRING },
                      whyNow: { type: Type.STRING },
                      estimatedMinutes: { type: Type.NUMBER },
                      priorityRank: { type: Type.NUMBER },
                      confidence: { type: Type.NUMBER },
                      isNegativeConstraint: { type: Type.BOOLEAN },
                      substeps: { type: Type.ARRAY, items: { type: Type.STRING } },
                      frictionPoint: { type: Type.STRING },
                    },
                    required: ["action", "category", "rationale", "estimatedMinutes", "priorityRank", "confidence"],
                  },
                },
                tradeOffAnalysis: {
                  type: Type.OBJECT,
                  properties: {
                    protectedMoves: { type: Type.ARRAY, items: { type: Type.STRING } },
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
          const simulated = (parsed.simulatedRecommendations || []).slice(0, 5).map((r: any, idx: number) => ({
            ...r,
            id: `sim_rec_${Date.now()}_${idx}`,
            priorityRank: idx + 1,
            status: "pending",
            date: dailyContext?.date || new Date().toISOString().split("T")[0],
          }));
          return res.json({
            simulatedRecommendations: simulated,
            tradeOffAnalysis: parsed.tradeOffAnalysis,
          });
        }
      } catch (err: any) {
        console.log("[Notice] Using fallback scenario simulation:", err?.message || err);
      }
    }

    // Heuristic Fallback
    const simTime = scenario?.timeOption || "15m";
    const simEnergy = parseInt(scenario?.energyOption || "40", 10);
    const topMove = currentRecommendations?.[0];

    const simMoves: any[] = [];
    if (topMove) {
      simMoves.push({
        id: `sim_rec_${Date.now()}_0`,
        action: `[Compress to ${simTime}] ${topMove.action}`,
        category: topMove.category || "work",
        rationale: "Preserved as the single non-negotiable anchor, compressed to fit the sudden constraint.",
        whyNow: "Dropping your #1 priority causes compounding fallout; compressing it keeps momentum alive.",
        estimatedMinutes: simTime === "15m" ? 15 : 20,
        priorityRank: 1,
        confidence: 0.95,
        isNegativeConstraint: false,
        status: "pending",
        date: dailyContext?.date || new Date().toISOString().split("T")[0],
      });
    }

    simMoves.push({
      id: `sim_rec_${Date.now()}_1`,
      action: "DON'T accept new inbound requests or open reactive messaging channels",
      category: "boundary",
      rationale: "With severe time/energy constraints, any peripheral interruption will derail your single remaining move.",
      whyNow: "Immediate containment required by current circumstances.",
      estimatedMinutes: 0,
      priorityRank: 2,
      confidence: 0.98,
      isNegativeConstraint: true,
      status: "pending",
      date: dailyContext?.date || new Date().toISOString().split("T")[0],
    });

    const displaced = (currentRecommendations || []).slice(1).map((r: any) => ({
      originalRank: r.priorityRank,
      action: r.action,
      reasonForDisplacement: "Postponed to protect the single critical path under simulated constraints.",
    }));

    return res.json({
      simulatedRecommendations: simMoves,
      tradeOffAnalysis: {
        protectedMoves: topMove ? [topMove.action] : ["Top Strategic Priority"],
        displacedMoves: displaced,
        newElevatedMoves: [
          {
            rank: 2,
            action: "Strict inbound boundary enforcement",
            whyElevated: "Prevents distraction leak during compressed window.",
          },
        ],
        tradeOffRationale: `When available bandwidth shifts to ${simTime} and energy to ${simEnergy}%, ruthlessly shedding secondary tasks prevents total operational paralysis.`,
        riskAssessment: "Accepted risk: secondary milestones are paused for 24 hours. Averted risk: failure on core non-negotiable deliverable.",
      },
    });
  } catch (err: any) {
    console.error("Error in /api/simulate-scenario:", err);
    res.status(500).json({ error: err.message || "Failed to simulate scenario" });
  }
});

// Helper: Heuristic goal extraction fallback with intelligent jargon filtering & multi-goal separation
function generateFallbackGoals(text: string, contexts: string[] = []): { goals: any[]; jargonFiltered: any } {
  if (!text || !text.trim()) {
    return {
      goals: [],
      jargonFiltered: { originalWordCount: 0, fillerPhrasesRemoved: [], summary: "No input provided." },
    };
  }

  // 1. Detect & filter conversational jargon / filler
  const fillerPatterns = [
    /\b(um+|uh+|er+|ah+)\b/gi,
    /\b(you know|you see)\b/gi,
    /\b(so basically|basically|essentially)\b/gi,
    /\b(like i said|like)\b/gi,
    /\b(to be honest|honestly|truth be told)\b/gi,
    /\b(at the end of the day)\b/gi,
    /\b(there is a lot going on|there's a lot on my plate|i have so much to do)\b/gi,
    /\b(what i was thinking is|what i'm trying to say is)\b/gi,
    /\b(we gotta circle back|touch base on)\b/gi,
  ];

  const removedFillers: string[] = [];
  let cleanedText = text;
  for (const pattern of fillerPatterns) {
    const matches = cleanedText.match(pattern);
    if (matches && matches.length > 0) {
      removedFillers.push(...matches.map((m) => m.trim()));
      cleanedText = cleanedText.replace(pattern, " ");
    }
  }

  // 2. Intelligent multi-boundary separation
  // Splits on transitions, conjunctions, verbal intent triggers, punctuation, and bullet markers
  const splitRegex = /(?:\n+|\r+|\. |\? |\! |; |,\s*(?:and\s+|also\s+|then\s+|plus\s+|or\s+)|(?:\b(?:and\s+then|as\s+well\s+as|on\s+top\s+of\s+that|in\s+addition\s+to|not\s+to\s+mention|along\s+with|meanwhile|after\s+that|oh\s+and|plus|also)\b)|(?:\b(?:i\s+need\s+to|i\s+have\s+to|i\s+want\s+to|i\s+gotta|i\s+must|we\s+need\s+to|we\s+have\s+to|we\s+should|gotta|need\s+to|have\s+to|want\s+to|make\s+sure\s+to|remember\s+to|don't\s+forget\s+to|plan\s+to|trying\s+to)\b)|,\s*(?=[a-z]+ing\b|[a-z]+\s+the\b))/i;

  const rawSegments = cleanedText
    .split(splitRegex)
    .map((s) => s.trim().replace(/^[-*•\d.)\s]+/, "").replace(/^[,\s;]+|[,\s;]+$/g, ""))
    .filter((s) => s.length >= 4);

  let candidateSegments = rawSegments;
  if (candidateSegments.length <= 1 && cleanedText.includes(",")) {
    const commaSplit = cleanedText
      .split(/,\s*/)
      .map((s) => s.trim().replace(/^[-*•\d.)\s]+/, ""))
      .filter((s) => s.length >= 4);
    if (commaSplit.length > candidateSegments.length) {
      candidateSegments = commaSplit;
    }
  }

  const goals: any[] = [];
  const seenTitles = new Set<string>();

  for (const seg of candidateSegments) {
    let clean = seg
      .replace(/^(and|also|then|plus|so|that|to|i|we|my)\s+/i, "")
      .replace(/^(need to|have to|want to|gotta|should|must|plan to)\s+/i, "")
      .trim();

    if (clean.length < 3) continue;

    let title = clean.charAt(0).toUpperCase() + clean.slice(1);
    if (title.length > 55) {
      title = title.slice(0, 52).trim() + "...";
    }

    const titleLower = title.toLowerCase();
    if (seenTitles.has(titleLower)) continue;
    seenTitles.add(titleLower);

    let category = (contexts[0] as any) || "work";
    let goalType = "project";
    let importance = "high";

    if (/\b(health|workout|gym|run|running|sleep|diet|exercise|water|doctor|dentist|weight|walk)\b/i.test(titleLower)) {
      category = "health";
      goalType = "habit";
    } else if (/\b(family|personal|habit|read|book|home|apartment|car|passport|dog|groceries|laundry|clean)\b/i.test(titleLower)) {
      category = "personal";
      goalType = "project";
    } else if (/\b(revenue|sales|client|customer|market|business|mrr|arr|leads|conversion|launch|pitch)\b/i.test(titleLower)) {
      category = "business";
      goalType = "target";
    } else if (/\b(study|exam|learn|cert|degree|skill|course|system design|interview)\b/i.test(titleLower)) {
      category = "career";
      goalType = "milestone";
    } else if (/\b(save|invest|debt|money|budget|tax|taxes|invoice|accounting|bank)\b/i.test(titleLower)) {
      category = "finance";
      goalType = "target";
    }

    let deadline: string | undefined = undefined;
    const deadlineMatch = seg.match(/\b(today|tomorrow(?:\s+morning|\s+afternoon)?|friday|monday|tuesday|wednesday|thursday|saturday|sunday|next week|end of month|q[1-4]|by\s+[a-z]+)\b/i);
    if (deadlineMatch) {
      deadline = deadlineMatch[0].charAt(0).toUpperCase() + deadlineMatch[0].slice(1);
    }

    let targetValue: string | undefined = undefined;
    const numMatch = seg.match(/\$?(\d+(?:\.\d+)?(?:k|m|%)?)/i);
    if (numMatch) {
      targetValue = numMatch[0];
    }

    const suggestedFirstMove = `Review initial requirements and outline next action for ${title.toLowerCase().replace(/\.+$/, "")}`;

    goals.push({
      title,
      category,
      goalType,
      targetValue,
      deadline,
      importance,
      notes: "Extracted from your voice thoughts",
      isInferred: false,
      suggestedFirstMove,
    });
  }

  if (goals.length === 0) {
    const clean = cleanedText.trim().slice(0, 50);
    goals.push({
      title: clean.length > 3 ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Primary Focus Goal",
      category: (contexts[0] as any) || "work",
      goalType: "project",
      importance: "high",
      notes: "Extracted from voice prompt",
      isInferred: false,
      suggestedFirstMove: "Define the next concrete 15-minute action step.",
    });
  }

  return {
    goals,
    jargonFiltered: {
      originalWordCount: text.trim().split(/\s+/).length,
      fillerPhrasesRemoved: Array.from(new Set(removedFillers)),
      summary: `Filtered ${removedFillers.length} conversational filler elements and decomposed speech into ${goals.length} distinct goals.`,
    },
  };
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

export default app;
