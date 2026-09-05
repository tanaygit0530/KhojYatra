import Groq from 'groq-sdk';
import { env } from '../config/env.js';
import { ConstraintIntake, ExperienceCategory } from '@khojyatra/types';

export interface ExtractedEntities {
  duration_minutes?: number;
  budget_max?: number;
  destination?: string;
  interests?: ExperienceCategory[];
  group_size?: number;
  group_type?: 'solo' | 'couple' | 'family' | 'friends';
  accessibility_tags?: string[];
  preferred_pace?: 'relaxed' | 'moderate' | 'packed';
  transport_constraint?: string;
  nearby_required?: boolean;
}

export interface ParsedIntakeResult {
  parsed_intake: Partial<ConstraintIntake>;
  confidence: number;
  extracted_entities: ExtractedEntities;
  explanation: string;
}

export interface LLMService {
  extractTravelerIntent(text: string): Promise<ParsedIntakeResult | null>;
  explainRecommendations(experienceTitle: string, reasons: string[]): Promise<string>;
  explainReplan(
    replanType: string,
    diffSummary: string,
    context?: { weather?: string; unavailableTitle?: string; extraDetails?: string }
  ): Promise<string>;
  isConfigured(): boolean;
}

const INTENT_EXTRACTION_SYSTEM_PROMPT = `You are the KhojYatra Intelligent Traveler Intake Parser.
Your primary responsibility is to parse natural-language traveler requirements and extract structured context.

IMPORTANT ARCHITECTURAL RULE:
You must NOT make deterministic feasibility decisions. Hard constraints such as opening hours, distance calculation, transit time, budget limits, and capacity are strictly managed by the backend engine.
Your role is purely intent extraction, structuring natural language, and context parsing.

Return ONLY a JSON object adhering to this schema:
{
  "destination": string | null, // e.g. "Pune", "Delhi", "Varanasi", "Jaipur", "Old Delhi", "Mumbai"
  "duration_minutes": number | null, // Available time in minutes (e.g., "6 hours" -> 360, "3 hours" -> 180, "half day" -> 240, "full day" -> 480)
  "budget_max": number | null, // Maximum budget in INR (e.g., "₹2000" -> 2000, "cheap" -> 500)
  "group_size": number | null, // Number of travelers (e.g. 5, 2, 1)
  "group_type": "solo" | "couple" | "family" | "friends" | null,
  "interests": string[], // Categories: "food_culinary", "cultural_heritage", "festivals_events", "workshops_classes", "adventure_outdoor", "hidden_gems", "shopping_markets", "nightlife_entertainment"
  "accessibility_tags": string[], // e.g. ["wheelchair_accessible", "step_free", "visual_aid"]
  "preferred_pace": "relaxed" | "moderate" | "packed" | null,
  "transport_constraint": string | null, // e.g. "before train", "flight departure", "station transit", "walking only"
  "nearby_required": boolean, // true if user asked for "nearby", "close", "around here", "walkable distance"
  "explanation": string // A clear, concise natural language summary of the parsed context
}
`;

const RECOMMENDATION_EXPLANATION_SYSTEM_PROMPT = `You are the KhojYatra Experience Explainer.
Given a recommended local experience and the backend's deterministic match reasons (such as distance, budget fit, authenticity score, and weather safety), synthesize a concise, engaging 1-2 sentence explanation for the traveler.
DO NOT contradict or fabricate constraints. Keep it authentic, welcoming, and concise.`;

const REPLAN_EXPLANATION_SYSTEM_PROMPT = `You are the KhojYatra Adaptive Replanning Explainer.
The deterministic backend has modified a traveler's itinerary due to a friction trigger (e.g., sudden rain, schedule delay, or host unavailability).
Provide a reassuring, clear 1-2 sentence explanation of the adjusted plan.
Do NOT invent fake opening hours or distances; refer strictly to the supplied diff and reasons.`;

export class GroqLLMService implements LLMService {
  private client: Groq | null = null;
  // Prefer llama-3.3-70b-versatile or configured model, with auto-fallback to account-supported models
  private model: string;
  private readonly fallbackModel = 'openai/gpt-oss-120b';
  private readonly requestTimeoutMs = 3500;

  constructor(apiKey?: string, modelOverride?: string) {
    const key = apiKey ?? env.GROQ_API_KEY;
    this.model = modelOverride ?? env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

    if (key && key.trim().length > 0) {
      try {
        this.client = new Groq({
          apiKey: key.trim(),
          timeout: this.requestTimeoutMs
        });
      } catch (err: any) {
        console.warn('⚠️ [GroqLLMService] Failed to initialize Groq client:', err.message);
        this.client = null;
      }
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.client);
  }

  public getModel(): string {
    return this.model;
  }

  /**
   * Helper to execute chat completion with automatic model failover if primary model is unavailable.
   */
  private async createChatCompletion(params: any): Promise<any> {
    if (!this.client) return null;

    try {
      return await this.client.chat.completions.create(
        { ...params, model: this.model },
        { timeout: this.requestTimeoutMs }
      );
    } catch (err: any) {
      // If primary model returned 404 (model_not_found or not accessible), switch to supported fallback model
      const isModelNotFound = err?.status === 404 || err?.message?.includes('model_not_found') || err?.error?.error?.code === 'model_not_found';
      if (isModelNotFound && this.model !== this.fallbackModel) {
        console.info(`ℹ️ [GroqLLMService] Model '${this.model}' unavailable for account. Auto-switching to '${this.fallbackModel}'.`);
        this.model = this.fallbackModel;
        return await this.client.chat.completions.create(
          { ...params, model: this.model },
          { timeout: this.requestTimeoutMs }
        );
      }
      throw err;
    }
  }

  /**
   * Natural-language intent extraction into structured traveler constraints.
   * Employs Groq chat completion with JSON mode and strict error containment.
   */
  public async extractTravelerIntent(text: string): Promise<ParsedIntakeResult | null> {
    if (!this.client) {
      return null;
    }

    try {
      const completion = await this.createChatCompletion({
        messages: [
          { role: 'system', content: INTENT_EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: text }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 800
      });

      const rawContent = completion?.choices?.[0]?.message?.content;
      if (!rawContent) {
        console.warn('⚠️ [GroqLLMService] Empty response content from Groq.');
        return null;
      }

      const parsedJson = JSON.parse(rawContent);

      // Normalize interest categories
      const normalizedInterests: ExperienceCategory[] = [];
      const rawInterests = Array.isArray(parsedJson.interests) ? parsedJson.interests : [];

      for (const item of rawInterests) {
        const s = String(item).toLowerCase();
        if (s.includes('food') || s.includes('culinary') || s.includes('eat')) {
          if (!normalizedInterests.includes('food_culinary')) normalizedInterests.push('food_culinary');
        } else if (s.includes('cultur') || s.includes('heritage') || s.includes('history')) {
          if (!normalizedInterests.includes('cultural_heritage')) normalizedInterests.push('cultural_heritage');
        } else if (s.includes('workshop') || s.includes('class') || s.includes('craft')) {
          if (!normalizedInterests.includes('workshops_classes')) normalizedInterests.push('workshops_classes');
        } else if (s.includes('festival') || s.includes('event')) {
          if (!normalizedInterests.includes('festivals_events')) normalizedInterests.push('festivals_events');
        } else if (s.includes('adventure') || s.includes('outdoor') || s.includes('hike')) {
          if (!normalizedInterests.includes('adventure_outdoor')) normalizedInterests.push('adventure_outdoor');
        } else if (s.includes('hidden') || s.includes('gem') || s.includes('offbeat')) {
          if (!normalizedInterests.includes('hidden_gems')) normalizedInterests.push('hidden_gems');
        } else if (s.includes('market') || s.includes('shopping') || s.includes('bazaar')) {
          if (!normalizedInterests.includes('shopping_markets')) normalizedInterests.push('shopping_markets');
        } else if (s.includes('night') || s.includes('music') || s.includes('entertainment')) {
          if (!normalizedInterests.includes('nightlife_entertainment')) normalizedInterests.push('nightlife_entertainment');
        }
      }

      // Normalize accessibility tags
      const normalizedAccess: string[] = [];
      const rawAccess = Array.isArray(parsedJson.accessibility_tags) ? parsedJson.accessibility_tags : [];
      for (const item of rawAccess) {
        const s = String(item).toLowerCase();
        if (s.includes('wheelchair')) {
          if (!normalizedAccess.includes('wheelchair_accessible')) normalizedAccess.push('wheelchair_accessible');
        } else if (s.includes('step')) {
          if (!normalizedAccess.includes('step_free')) normalizedAccess.push('step_free');
        } else if (s.includes('visual')) {
          if (!normalizedAccess.includes('visual_aid')) normalizedAccess.push('visual_aid');
        } else {
          normalizedAccess.push(item);
        }
      }

      // Check text for fallback cues if model omitted them
      const rawLower = text.toLowerCase();
      let durationMinutes = typeof parsedJson.duration_minutes === 'number' ? parsedJson.duration_minutes : undefined;
      if (durationMinutes === undefined) {
        if (rawLower.includes('half day')) durationMinutes = 240;
        else if (rawLower.includes('full day')) durationMinutes = 480;
        else if (rawLower.includes('quick') || rawLower.includes('short')) durationMinutes = 90;
      }

      let budgetMax = typeof parsedJson.budget_max === 'number' ? parsedJson.budget_max : undefined;
      if (budgetMax === undefined && (rawLower.includes('cheap') || rawLower.includes('low budget'))) {
        budgetMax = 500;
      }

      let destination = typeof parsedJson.destination === 'string' ? parsedJson.destination : undefined;
      if (destination) {
        const d = destination.toLowerCase();
        if (d.includes('delhi')) destination = 'Delhi';
        else if (d.includes('varanasi') || d.includes('banaras') || d.includes('kashi')) destination = 'Varanasi';
        else if (d.includes('jaipur')) destination = 'Jaipur';
        else if (d.includes('pune')) destination = 'Pune';
        else if (d.includes('mumbai') || d.includes('bombay')) destination = 'Mumbai';
      } else {
        if (rawLower.includes('delhi')) destination = 'Delhi';
        else if (rawLower.includes('varanasi') || rawLower.includes('banaras') || rawLower.includes('kashi')) destination = 'Varanasi';
        else if (rawLower.includes('jaipur')) destination = 'Jaipur';
        else if (rawLower.includes('pune')) destination = 'Pune';
        else if (rawLower.includes('mumbai') || rawLower.includes('bombay')) destination = 'Mumbai';
      }

      let groupType = ['solo', 'couple', 'family', 'friends'].includes(parsedJson.group_type)
        ? parsedJson.group_type
        : undefined;
      if (!groupType) {
        if (rawLower.includes('alone') || rawLower.includes('solo')) groupType = 'solo';
        else if (rawLower.includes('couple') || rawLower.includes('partner')) groupType = 'couple';
        else if (rawLower.includes('friend')) groupType = 'friends';
        else if (rawLower.includes('family')) groupType = 'family';
      }

      let transportConstraint = typeof parsedJson.transport_constraint === 'string'
        ? parsedJson.transport_constraint
        : undefined;
      if (!transportConstraint && rawLower.includes('train')) {
        transportConstraint = 'train connection';
      }

      const nearbyRequired = Boolean(
        parsedJson.nearby_required ||
        rawLower.includes('nearby') ||
        rawLower.includes('close') ||
        rawLower.includes('around here')
      );

      const extracted: ExtractedEntities = {
        duration_minutes: durationMinutes,
        budget_max: budgetMax,
        destination,
        interests: normalizedInterests.length > 0 ? normalizedInterests : undefined,
        group_size: typeof parsedJson.group_size === 'number' ? parsedJson.group_size : (groupType === 'solo' ? 1 : undefined),
        group_type: groupType,
        accessibility_tags: normalizedAccess.length > 0 ? normalizedAccess : undefined,
        preferred_pace: ['relaxed', 'moderate', 'packed'].includes(parsedJson.preferred_pace)
          ? parsedJson.preferred_pace
          : undefined,
        transport_constraint: transportConstraint,
        nearby_required: nearbyRequired
      };

      // Coordinates mapping by destination hint
      let lat: number | undefined;
      let lng: number | undefined;
      const destLower = (extracted.destination || '').toLowerCase();
      if (destLower.includes('delhi')) {
        lat = 28.6506;
        lng = 77.2303;
      } else if (destLower.includes('varanasi') || destLower.includes('banaras') || destLower.includes('kashi')) {
        lat = 25.3176;
        lng = 82.9739;
      } else if (destLower.includes('jaipur')) {
        lat = 26.9124;
        lng = 75.7873;
      } else if (destLower.includes('pune')) {
        lat = 18.5204;
        lng = 73.8567;
      } else if (destLower.includes('mumbai') || destLower.includes('bombay')) {
        lat = 18.9220;
        lng = 72.8347;
      }

      const parsedIntake: Partial<ConstraintIntake> = {
        duration_minutes: extracted.duration_minutes || 180,
        budget: { min: 0, max: extracted.budget_max || 1500 },
        group: {
          type: extracted.group_type || (extracted.group_size === 1 ? 'solo' : 'friends'),
          size: extracted.group_size || 1
        },
        interests: extracted.interests || ['food_culinary', 'cultural_heritage'],
        accessibility_tags: extracted.accessibility_tags || []
      };

      if (lat && lng) {
        parsedIntake.location_context = {
          mode: 'planned',
          lat,
          lng,
          effective_time: new Date(Date.now() + 3600 * 1000).toISOString()
        };
      }

      const explanation = typeof parsedJson.explanation === 'string' && parsedJson.explanation.trim().length > 0
        ? parsedJson.explanation.trim()
        : `Parsed intent: ${extracted.destination ? `in ${extracted.destination}, ` : ''}${extracted.duration_minutes ? `${extracted.duration_minutes}m duration, ` : ''}${extracted.budget_max ? `₹${extracted.budget_max} budget` : ''}.`;

      return {
        parsed_intake: parsedIntake,
        confidence: 0.95,
        extracted_entities: extracted,
        explanation
      };
    } catch (error: any) {
      this.handleLlmError('extractTravelerIntent', error);
      return null;
    }
  }

  /**
   * Synthesize natural language explanation for recommendation cards.
   */
  public async explainRecommendations(experienceTitle: string, reasons: string[]): Promise<string> {
    if (!this.client || !reasons || reasons.length === 0) {
      return this.fallbackSynthesizeExplanation(reasons, experienceTitle);
    }

    try {
      const completion = await this.createChatCompletion({
        messages: [
          { role: 'system', content: RECOMMENDATION_EXPLANATION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Experience: "${experienceTitle}"\nMatch Factors: ${reasons.join('; ')}`
          }
        ],
        temperature: 0.3,
        max_tokens: 120
      });

      const content = completion?.choices?.[0]?.message?.content?.trim();
      return content && content.length > 0
        ? content
        : this.fallbackSynthesizeExplanation(reasons, experienceTitle);
    } catch (error: any) {
      this.handleLlmError('explainRecommendations', error);
      return this.fallbackSynthesizeExplanation(reasons, experienceTitle);
    }
  }

  /**
   * Explain an adaptive replan (e.g. weather adjustment, detour, venue closure).
   */
  public async explainReplan(
    replanType: string,
    diffSummary: string,
    context?: { weather?: string; unavailableTitle?: string; extraDetails?: string }
  ): Promise<string> {
    if (!this.client) {
      return this.fallbackSynthesizeReplan(replanType, diffSummary, context);
    }

    try {
      const completion = await this.createChatCompletion({
        messages: [
          { role: 'system', content: REPLAN_EXPLANATION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Trigger: ${replanType}\nContext: ${JSON.stringify(context || {})}\nPlan Diff: ${diffSummary}`
          }
        ],
        temperature: 0.3,
        max_tokens: 140
      });

      const content = completion?.choices?.[0]?.message?.content?.trim();
      return content && content.length > 0
        ? content
        : this.fallbackSynthesizeReplan(replanType, diffSummary, context);
    } catch (error: any) {
      this.handleLlmError('explainReplan', error);
      return this.fallbackSynthesizeReplan(replanType, diffSummary, context);
    }
  }

  // --- Fallback Synthesizers (100% Deterministic & Safe) ---

  public fallbackSynthesizeExplanation(reasons: string[], experienceTitle: string): string {
    if (!reasons || reasons.length === 0) {
      return `Recommended based on your current preferences for ${experienceTitle}.`;
    }
    const clauses = reasons.map(r => r.trim()).filter(Boolean);
    if (clauses.length === 1) {
      return `A top match because it ${clauses[0].toLowerCase()}.`;
    }
    return `Recommended for ${experienceTitle}: it ${clauses.slice(0, 2).join(' and ')}, offering optimal value for your plan.`;
  }

  public fallbackSynthesizeReplan(
    replanType: string,
    diffSummary: string,
    context?: { weather?: string; unavailableTitle?: string }
  ): string {
    if (replanType === 'weather') {
      const cond = context?.weather || 'rain';
      return `Reordered to prioritize sheltered, indoor cultural experiences during ${cond}.`;
    }
    if (replanType === 'unavailable') {
      return `Replaced unavailable item with feasible alternative.`;
    }
    return `Itinerary successfully updated: ${diffSummary}.`;
  }

  /**
   * Sanitized error logger: never leaks API keys, headers, or full credentials.
   */
  private handleLlmError(operation: string, error: any): void {
    const status = error?.status || error?.statusCode;
    const code = error?.code || error?.error?.code;

    if (status === 401 || status === 403) {
      console.warn(`⚠️ [GroqLLMService] Authentication error on ${operation} (HTTP ${status}). Check GROQ_API_KEY.`);
    } else if (status === 429 || code === 'rate_limit_exceeded') {
      console.warn(`⚠️ [GroqLLMService] Groq API rate limit reached on ${operation}. Falling back to deterministic engine.`);
    } else if (error?.name === 'AbortError' || error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
      console.warn(`⏱️ [GroqLLMService] Groq request timed out on ${operation}. Falling back to deterministic engine.`);
    } else {
      console.warn(`⚠️ [GroqLLMService] Upstream error on ${operation} (${error?.message || 'unknown'}). Falling back.`);
    }
  }
}

export const llmService = new GroqLLMService();
