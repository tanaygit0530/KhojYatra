import { z } from 'zod';

// ==========================================
// 1. Error Codes & Envelope Schemas
// ==========================================
export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'FORBIDDEN',
  'CONFLICT',
  'UPSTREAM_UNAVAILABLE',
  'INTERNAL'
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorDetailSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.any().optional()
});
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

export const ApiErrorResponseSchema = z.object({
  error: ApiErrorDetailSchema
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export function createSuccessResponse<T>(data: T, meta?: Record<string, any>) {
  return { data, meta };
}

export function createErrorResponse(code: ErrorCode, message: string, details?: any): ApiErrorResponse {
  return { error: { code, message, details } };
}

// ==========================================
// 2. Postgres Enum Equivalents
// ==========================================
export const UserRoleSchema = z.enum(['traveler', 'provider', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const ExperienceCategorySchema = z.enum([
  'food_culinary',
  'cultural_heritage',
  'festivals_events',
  'workshops_classes',
  'adventure_outdoor',
  'hidden_gems',
  'shopping_markets',
  'nightlife_entertainment'
]);
export type ExperienceCategory = z.infer<typeof ExperienceCategorySchema>;

export const VerificationStatusSchema = z.enum(['pending', 'verified']);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const OfferingStatusSchema = z.enum(['draft', 'published', 'paused']);
export type OfferingStatus = z.infer<typeof OfferingStatusSchema>;

export const ItineraryVisibilitySchema = z.enum(['public', 'anonymous', 'private']);
export type ItineraryVisibility = z.infer<typeof ItineraryVisibilitySchema>;

export const IngestionStatusSchema = z.enum(['pending_review', 'approved', 'rejected']);
export type IngestionStatus = z.infer<typeof IngestionStatusSchema>;

// ==========================================
// 3. Location & Constraint Intake
// ==========================================
export const LocationContextSchema = z.object({
  mode: z.enum(['current', 'planned']),
  lat: z.number(),
  lng: z.number(),
  effective_time: z.string().datetime().or(z.string())
});
export type LocationContext = z.infer<typeof LocationContextSchema>;

export const GroupContextSchema = z.object({
  size: z.number().int().min(1).default(1),
  type: z.enum(['solo', 'couple', 'family', 'friends'])
});
export type GroupContext = z.infer<typeof GroupContextSchema>;

export const BudgetContextSchema = z.object({
  min: z.number().min(0),
  max: z.number().min(0)
});
export type BudgetContext = z.infer<typeof BudgetContextSchema>;

export const ConstraintIntakeSchema = z.object({
  location_context: LocationContextSchema,
  duration_minutes: z.number().int().min(15).max(1440),
  budget: BudgetContextSchema,
  group: GroupContextSchema,
  interests: z.array(ExperienceCategorySchema),
  accessibility_tags: z.array(z.string()).default([]),
  weather_condition: z.enum(['clear', 'rain', 'extreme']).optional().default('clear'),
  group_session_id: z.string().uuid().optional()
});
export type ConstraintIntake = z.infer<typeof ConstraintIntakeSchema>;

// ==========================================
// 4. Experience & Recommendation Entities
// ==========================================
export const ExperienceSchema = z.object({
  id: z.string().uuid(),
  provider_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: ExperienceCategorySchema,
  price_min: z.number(),
  price_max: z.number(),
  duration_min: z.number().int(),
  lat: z.number(),
  lng: z.number(),
  accessibility_tags: z.array(z.string()).default([]),
  interest_tags: z.array(z.string()).default([]),
  rating_avg: z.number().default(0),
  locality_score: z.number().int().min(0).max(100).default(50),
  offering_status: OfferingStatusSchema.default('published'),
  photo_urls: z.array(z.string()).default([]),
  // Computed fields
  distance_km: z.number().optional(),
  travel_time_min: z.number().optional(),
  provider_name: z.string().optional(),
  provider_verified: z.boolean().optional(),
  provider_trust_score: z.number().optional(),
  badge_label: z.string().optional()
});
export type Experience = z.infer<typeof ExperienceSchema>;

export const RecommendationScoreBreakdownSchema = z.object({
  preference_match: z.number(),
  time_fit: z.number(),
  budget_fit: z.number(),
  distance_fit: z.number(),
  availability_confidence: z.number(),
  rating_avg_normalized: z.number(),
  locality_score_factor: z.number(),
  weather_multiplier: z.number().optional()
});
export type RecommendationScoreBreakdown = z.infer<typeof RecommendationScoreBreakdownSchema>;

export const RecommendationItemSchema = z.object({
  experience: ExperienceSchema,
  score: z.number(),
  score_breakdown: RecommendationScoreBreakdownSchema.optional(),
  reasons: z.array(z.string()),
  ai_explanation: z.string().optional()
});
export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;

export const RecommendationResponseSchema = z.object({
  recommendations: z.array(RecommendationItemSchema),
  session_id: z.string().uuid().optional(),
  relaxed_constraints: z.array(z.string()).optional()
});
export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;

// Replan types
export const ReplanChangeTypeSchema = z.enum([
  'unavailable',
  'time_reduced',
  'budget_reduced',
  'weather'
]);
export type ReplanChangeType = z.infer<typeof ReplanChangeTypeSchema>;

export const ReplanRequestSchema = z.object({
  session_id: z.string().uuid(),
  change: z.object({
    type: ReplanChangeTypeSchema,
    value: z.any()
  }),
  current_experience_ids: z.array(z.string().uuid())
});
export type ReplanRequest = z.infer<typeof ReplanRequestSchema>;

export const ReplanResponseSchema = z.object({
  recommendations: z.array(RecommendationItemSchema),
  diff: z.object({
    removed: z.array(z.string().uuid()),
    added: z.array(z.string().uuid()),
    unchanged: z.array(z.string().uuid())
  }),
  explanation: z.string().optional()
});
export type ReplanResponse = z.infer<typeof ReplanResponseSchema>;

// ==========================================
// 5. Itinerary Types
// ==========================================
export const ItineraryItemSchema = z.object({
  id: z.string().uuid(),
  itinerary_id: z.string().uuid(),
  experience_id: z.string().uuid(),
  position: z.number().int(),
  start_time: z.string().datetime().or(z.string()),
  price_committed: z.number(),
  experience: ExperienceSchema.optional()
});
export type ItineraryItem = z.infer<typeof ItineraryItemSchema>;

export const ItinerarySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().optional().nullable(),
  session_id: z.string().uuid().optional().nullable(),
  date: z.string(),
  status: z.string().default('draft'),
  budget_cap: z.number().optional().nullable(),
  group_session_id: z.string().uuid().optional().nullable(),
  items: z.array(ItineraryItemSchema).default([])
});
export type Itinerary = z.infer<typeof ItinerarySchema>;

export const ItineraryFeasibilitySchema = z.object({
  feasible: z.boolean(),
  conflicts: z.array(
    z.object({
      item_id: z.string().uuid(),
      message: z.string(),
      severity: z.enum(['warning', 'error'])
    })
  )
});
export type ItineraryFeasibility = z.infer<typeof ItineraryFeasibilitySchema>;

// ==========================================
// 6. Phase 16: Locality & Trust Breakdown Types
// ==========================================
export const LocalityBreakdownSchema = z.object({
  total_score: z.number().min(0).max(100),
  locally_operated: z.number(),
  community_hosted: z.number(),
  hidden_gem: z.number(),
  tag_authenticity: z.number(),
  sentiment_base: z.number(),
  explanation: z.string()
});
export type LocalityBreakdown = z.infer<typeof LocalityBreakdownSchema>;

export const ProviderTrustBreakdownSchema = z.object({
  total_score: z.number().min(0).max(100),
  verification_bonus: z.number(),
  locally_operated_bonus: z.number(),
  community_vouch_bonus: z.number(),
  reputation_base: z.number(),
  explanation: z.string()
});
export type ProviderTrustBreakdown = z.infer<typeof ProviderTrustBreakdownSchema>;

// ==========================================
// 7. Phase 17: Real-Time Budget Status
// ==========================================
export const BudgetStatusSchema = z.object({
  itinerary_id: z.string(),
  budget_cap: z.number(),
  total_committed: z.number(),
  remaining_budget: z.number(),
  currency: z.string().default('INR'),
  is_exceeded: z.boolean(),
  soft_warning: z.string().optional().nullable()
});
export type BudgetStatus = z.infer<typeof BudgetStatusSchema>;

// ==========================================
// 8. Phase 18: Group Reconciliation & Consensus
// ==========================================
export const GroupMemberSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  name: z.string(),
  intake: ConstraintIntakeSchema.optional().nullable(),
  joined_at: z.string()
});
export type GroupMember = z.infer<typeof GroupMemberSchema>;

export const GroupVoteSchema = z.object({
  member_session_id: z.string(),
  experience_id: z.string(),
  vote: z.union([z.literal(1), z.literal(-1)])
});
export type GroupVote = z.infer<typeof GroupVoteSchema>;

export const GroupSessionSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  creator_session_id: z.string(),
  created_at: z.string(),
  members: z.array(GroupMemberSchema),
  votes: z.array(GroupVoteSchema).default([])
});
export type GroupSession = z.infer<typeof GroupSessionSchema>;

export const ConsensusRecommendationSchema = z.object({
  experience: ExperienceSchema,
  score: z.number(),
  vote_count: z.number(),
  group_pick: z.boolean(),
  matched_interests: z.array(z.string()),
  reasons: z.array(z.string())
});
export type ConsensusRecommendation = z.infer<typeof ConsensusRecommendationSchema>;

// ==========================================
export const DetourEvaluationResultSchema = z.object({
  candidate_experience_id: z.string(),
  candidate_title: z.string(),
  worth_it: z.boolean(),
  added_minutes: z.number(),
  added_cost: z.number(),
  still_on_time: z.boolean(),
  buffer_remaining_minutes: z.number(),
  reason: z.string(),
  next_commitment: z.object({
    title: z.string(),
    start_time: z.string()
  }).optional().nullable()
});
export type DetourEvaluationResult = z.infer<typeof DetourEvaluationResultSchema>;

// ==========================================
// 10. Phase 21: Community Itinerary Similarity
// ==========================================
export const CommunityItineraryItemSchema = z.object({
  id: z.string().optional(),
  experience_id: z.string(),
  day_number: z.number().default(1),
  position: z.number(),
  notes: z.string().default(''),
  experience: ExperienceSchema.optional()
});
export type CommunityItineraryItem = z.infer<typeof CommunityItineraryItemSchema>;

export const CommunityItinerarySchema = z.object({
  id: z.string(),
  title: z.string(),
  destination: z.string(),
  duration_days: z.number(),
  budget: z.number(),
  group_type: z.string(),
  interests: z.array(ExperienceCategorySchema),
  travel_style: z.string(),
  visibility: ItineraryVisibilitySchema.default('public'),
  items: z.array(CommunityItineraryItemSchema)
});
export type CommunityItinerary = z.infer<typeof CommunityItinerarySchema>;

export const CommunityItinerarySimilaritySchema = z.object({
  itinerary: CommunityItinerarySchema,
  similarity_pct: z.number().min(0).max(100),
  matched_dimensions: z.array(z.string())
});
export type CommunityItinerarySimilarity = z.infer<typeof CommunityItinerarySimilaritySchema>;

// ==========================================
// 11. Phase 22: Provider Demand Heatmap Insights
// ==========================================
export const DemandInsightSchema = z.object({
  category: ExperienceCategorySchema,
  time_window: z.string(),
  search_count: z.number(),
  provider_has_coverage: z.boolean(),
  message: z.string()
});
export type DemandInsight = z.infer<typeof DemandInsightSchema>;

// ==========================================
// 12. Phase 23: WhatsApp Voice Supply Extraction
// ==========================================
export const VoiceExtractedSlotSchema = z.object({
  experience_title: z.string().optional(),
  date: z.string(),
  time: z.string(),
  capacity: z.number(),
  price: z.number()
});
export type VoiceExtractedSlot = z.infer<typeof VoiceExtractedSlotSchema>;

export const WhatsAppVoiceExtractionSchema = z.object({
  id: z.string(),
  provider_id: z.string(),
  transcript: z.string(),
  extracted_json: VoiceExtractedSlotSchema,
  status: z.enum(['pending_confirmation', 'confirmed', 'rejected']),
  created_at: z.string()
});
export type WhatsAppVoiceExtraction = z.infer<typeof WhatsAppVoiceExtractionSchema>;

// ==========================================
// 13. Phase 24: Social-to-Geo Staging
// ==========================================
export const SocialStagingItemSchema = z.object({
  id: z.string(),
  source_handle: z.string(),
  source_url: z.string(),
  raw_caption: z.string(),
  extracted_title: z.string(),
  extracted_description: z.string(),
  lat: z.number(),
  lng: z.number(),
  category: ExperienceCategorySchema,
  price_estimate: z.number(),
  trust_label: z.literal('social_signal_unverified'),
  status: z.enum(['pending', 'approved', 'rejected']),
  created_at: z.string()
});
export type SocialStagingItem = z.infer<typeof SocialStagingItemSchema>;

// ==========================================
// 14. Phase 26: Safety Check-in
// ==========================================
export const SafetyCheckinSchema = z.object({
  id: z.string(),
  itinerary_id: z.string(),
  share_token: z.string(),
  expires_at: z.string(),
  created_at: z.string()
});
export type SafetyCheckin = z.infer<typeof SafetyCheckinSchema>;

// ==========================================
// 15. Phase 27: Mock Reservation & Booking
// ==========================================
export const BookingSchema = z.object({
  id: z.string(),
  booking_id: z.string(), // KY-DEMO-####
  experience_id: z.string(),
  slot_id: z.string(),
  session_id: z.string(),
  traveler_name: z.string(),
  party_size: z.number().min(1),
  total_amount: z.number().min(0),
  payment_method: z.enum(['upi', 'card', 'netbanking']),
  status: z.enum(['confirmed', 'cancelled']),
  created_at: z.string()
});
export type Booking = z.infer<typeof BookingSchema>;
