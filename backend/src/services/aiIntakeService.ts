import { ConstraintIntake, ExperienceCategory } from '@khojyatra/types';
import { llmService } from './llmService.js';
import type { ParsedIntakeResult, ExtractedEntities } from './llmService.js';

export type { ParsedIntakeResult, ExtractedEntities };

export class AiIntakeService {
  /**
   * Phase 20: Natural-Language Intake Parsing
   * Robust dual-mode: Groq LLM (Llama 3.3 70B) if GROQ_API_KEY is configured with strict timeout,
   * with guaranteed deterministic regex/keyword NLP fallback.
   * Feasibility decisions remain strictly deterministic in the backend decision engine.
   */
  public async parseIntake(text: string): Promise<ParsedIntakeResult> {
    // 1. Attempt structured LLM extraction via Groq if configured
    if (llmService.isConfigured()) {
      try {
        const groqResult = await llmService.extractTravelerIntent(text);
        if (groqResult) {
          return groqResult;
        }
      } catch (err: any) {
        console.warn('⚠️ [AiIntakeService] Groq extraction encountered error, falling back to deterministic parser:', err.message);
      }
    }

    // 2. Deterministic entity extraction fallback
    return this.parseDeterministic(text);
  }

  /**
   * Deterministic Entity Extraction fallback for offline/demo/unconfigured modes.
   */
  public parseDeterministic(text: string): ParsedIntakeResult {
    const raw = text.toLowerCase();
    const extracted: ExtractedEntities = {};

    // 1. Duration Extraction (e.g. "6 hours", "3 hours", "180 min", "half day", "2 hrs")
    const hourMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|hours|hrs)/i);
    const minMatch = raw.match(/(\d+)\s*(?:min|minute|minutes|mins)/i);
    if (hourMatch) {
      extracted.duration_minutes = Math.round(parseFloat(hourMatch[1]) * 60);
    } else if (minMatch) {
      extracted.duration_minutes = parseInt(minMatch[1], 10);
    } else if (raw.includes('half day')) {
      extracted.duration_minutes = 240;
    } else if (raw.includes('full day')) {
      extracted.duration_minutes = 480;
    } else if (raw.includes('quick') || raw.includes('short')) {
      extracted.duration_minutes = 90;
    }

    // 2. Budget Extraction (e.g. "₹2000", "₹1200", "rs 1500", "1500 inr", "budget 800", "under 2000", "cheap")
    const budgetMatch = raw.match(/(?:₹|rs\.?|inr|budget|under)\s*(\d+)/i) || raw.match(/(\d+)\s*(?:rs|rupees|inr)/i);
    if (budgetMatch) {
      extracted.budget_max = parseInt(budgetMatch[1], 10);
    } else if (raw.includes('cheap') || raw.includes('low budget') || raw.includes('affordable')) {
      extracted.budget_max = 500;
    }

    // 3. Location / Destination Extraction
    if (raw.includes('delhi') || raw.includes('chandni chowk') || raw.includes('old delhi')) {
      extracted.destination = 'Delhi';
    } else if (raw.includes('varanasi') || raw.includes('banaras') || raw.includes('kashi') || raw.includes('ghat')) {
      extracted.destination = 'Varanasi';
    } else if (raw.includes('jaipur') || raw.includes('rajasthan')) {
      extracted.destination = 'Jaipur';
    } else if (raw.includes('pune')) {
      extracted.destination = 'Pune';
    } else if (raw.includes('mumbai') || raw.includes('bombay')) {
      extracted.destination = 'Mumbai';
    }

    // 4. Group Context Extraction (e.g. "5 people", "we are 5", "with my friend", "couple", "family of 4", "solo")
    const peopleCountMatch = raw.match(/(\d+)\s*(?:people|persons|friends|travelers|members|of us)/i)
      || raw.match(/(?:we are|group of)\s*(\d+)/i);
    if (peopleCountMatch) {
      extracted.group_size = parseInt(peopleCountMatch[1], 10);
      extracted.group_type = extracted.group_size === 1 ? 'solo' : 'friends';
    } else if (raw.includes('solo') || raw.includes('myself') || raw.includes('alone')) {
      extracted.group_type = 'solo';
      extracted.group_size = 1;
    } else if (raw.includes('couple') || raw.includes('partner') || raw.includes('wife') || raw.includes('husband')) {
      extracted.group_type = 'couple';
      extracted.group_size = 2;
    } else if (raw.includes('family') || raw.includes('kids') || raw.includes('parents')) {
      extracted.group_type = 'family';
      const sizeMatch = raw.match(/family of (\d+)/i);
      extracted.group_size = sizeMatch ? parseInt(sizeMatch[1], 10) : 4;
    } else if (raw.includes('friend') || raw.includes('friends') || raw.includes('buddies') || raw.includes('group')) {
      extracted.group_type = 'friends';
      extracted.group_size = 3;
    }

    // 5. Interest Categories Overlap
    const interests: ExperienceCategory[] = [];
    if (raw.includes('food') || raw.includes('culinary') || raw.includes('street') || raw.includes('kebab') || raw.includes('eat') || raw.includes('tasting')) {
      interests.push('food_culinary');
    }
    if (raw.includes('heritage') || raw.includes('culture') || raw.includes('history') || raw.includes('temple') || raw.includes('monument') || raw.includes('boat')) {
      interests.push('cultural_heritage');
    }
    if (raw.includes('workshop') || raw.includes('class') || raw.includes('pottery') || raw.includes('craft') || raw.includes('weaving') || raw.includes('cook')) {
      interests.push('workshops_classes');
    }
    if (raw.includes('festival') || raw.includes('event') || raw.includes('fair') || raw.includes('aarti') || raw.includes('diwali')) {
      interests.push('festivals_events');
    }
    if (raw.includes('outdoor') || raw.includes('adventure') || raw.includes('hike') || raw.includes('climb') || raw.includes('walk')) {
      interests.push('adventure_outdoor');
    }
    if (raw.includes('hidden') || raw.includes('secret') || raw.includes('undiscovered') || raw.includes('offbeat') || raw.includes('gem')) {
      interests.push('hidden_gems');
    }
    if (raw.includes('market') || raw.includes('shop') || raw.includes('bazaar') || raw.includes('antique') || raw.includes('souvenir')) {
      interests.push('shopping_markets');
    }
    if (raw.includes('night') || raw.includes('show') || raw.includes('music') || raw.includes('concert') || raw.includes('poetry') || raw.includes('sitar')) {
      interests.push('nightlife_entertainment');
    }

    if (interests.length > 0) {
      extracted.interests = interests;
    }

    // 6. Accessibility
    const access: string[] = [];
    if (raw.includes('wheelchair') || raw.includes('accessible')) {
      access.push('wheelchair_accessible');
    }
    if (raw.includes('step free') || raw.includes('step-free') || raw.includes('no stairs') || raw.includes('elevator')) {
      access.push('step_free');
    }
    if (raw.includes('visual') || raw.includes('audio guide') || raw.includes('guidance')) {
      access.push('visual_aid');
    }
    if (access.length > 0) {
      extracted.accessibility_tags = access;
    }

    // 7. Transport / Nearby Constraints
    if (raw.includes('train') || raw.includes('flight') || raw.includes('station') || raw.includes('airport')) {
      extracted.transport_constraint = raw.includes('train') ? 'train connection' : 'transit departure';
    }
    if (raw.includes('nearby') || raw.includes('close') || raw.includes('around here') || raw.includes('walkable')) {
      extracted.nearby_required = true;
    }

    // Coordinates mapping by destination hint
    let lat: number | undefined;
    let lng: number | undefined;
    if (extracted.destination === 'Varanasi') {
      lat = 25.3176;
      lng = 82.9739;
    } else if (extracted.destination === 'Jaipur') {
      lat = 26.9124;
      lng = 75.7873;
    } else if (extracted.destination === 'Delhi') {
      lat = 28.6506;
      lng = 77.2303;
    } else if (extracted.destination === 'Pune') {
      lat = 18.5204;
      lng = 73.8567;
    } else if (extracted.destination === 'Mumbai') {
      lat = 18.9220;
      lng = 72.8347;
    }

    const parsedIntake: Partial<ConstraintIntake> = {
      duration_minutes: extracted.duration_minutes || 180,
      budget: { min: 0, max: extracted.budget_max || 1500 },
      group: {
        type: extracted.group_type || 'couple',
        size: extracted.group_size || (extracted.group_type === 'solo' ? 1 : 2)
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

    const hasAnyEntity = Boolean(
      extracted.duration_minutes ||
      extracted.budget_max ||
      extracted.destination ||
      extracted.interests?.length ||
      extracted.group_type ||
      extracted.group_size ||
      extracted.accessibility_tags?.length
    );
    const confidence = hasAnyEntity ? 0.92 : 0.35;
    const explanation = hasAnyEntity
      ? `Parsed ${extracted.destination ? `in ${extracted.destination}, ` : ''}${extracted.duration_minutes ? `${extracted.duration_minutes}m duration, ` : ''}${extracted.budget_max ? `₹${extracted.budget_max} budget, ` : ''}${extracted.interests?.length ? `${extracted.interests.length} categories, ` : ''}ready for review.`
      : 'Could not extract specific constraints from free-text. Loaded standard fallback settings — please review and customize using the chips below.';

    return {
      parsed_intake: parsedIntake,
      confidence,
      extracted_entities: extracted,
      explanation
    };
  }

  /**
   * High performance deterministic explanation synthesizer.
   */
  public synthesizeExplanation(reasons: string[], experienceTitle: string): string {
    return llmService.fallbackSynthesizeExplanation(reasons, experienceTitle);
  }

  /**
   * Async explanation synthesizer that delegates to Groq LLM with deterministic fallback.
   */
  public async synthesizeExplanationAsync(reasons: string[], experienceTitle: string): Promise<string> {
    return llmService.explainRecommendations(experienceTitle, reasons);
  }
}

export const aiIntakeService = new AiIntakeService();
