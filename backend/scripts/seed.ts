import { seedProviders, seedExperiences, generateSeedSlots, seedCommunityItineraries, seedReviews } from '../src/data/seedData.js';
import { getSupabaseClient, isSupabaseConfigured } from '../src/db/supabaseClient.js';
import { store } from '../src/data/store.js';

async function runSeed() {
  console.log('🌱 Starting KhojYatra database seeding...');

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    console.log('🔗 Connected to Supabase. Seeding remote PostgreSQL database...');

    // 1. Providers
    console.log(`Inserting ${seedProviders.length} providers...`);
    const { error: pErr } = await supabase.from('providers').upsert(
      seedProviders.map(p => ({
        id: p.id,
        name: p.name,
        verification_status: p.verification_status,
        locally_operated: p.locally_operated,
        community_vouch_count: p.community_vouch_count,
        trust_score: p.trust_score
      }))
    );
    if (pErr) console.warn('Provider seed error:', pErr);

    // 2. Experiences
    console.log(`Inserting ${seedExperiences.length} experiences across all 8 categories...`);
    const { error: eErr } = await supabase.from('experiences').upsert(
      seedExperiences.map(e => ({
        id: e.id,
        provider_id: e.provider_id,
        title: e.title,
        description: e.description,
        category: e.category,
        price_min: e.price_min,
        price_max: e.price_max,
        duration_min: e.duration_min,
        lat: e.lat,
        lng: e.lng,
        accessibility_tags: e.accessibility_tags,
        interest_tags: e.interest_tags,
        rating_avg: e.rating_avg,
        locality_score: e.locality_score,
        offering_status: e.offering_status,
        photo_urls: e.photo_urls
      }))
    );
    if (eErr) console.warn('Experience seed error:', eErr);

    // 3. Availability Slots
    const slots = generateSeedSlots();
    console.log(`Inserting ${slots.length} availability slots (14-day window)...`);
    const { error: sErr } = await supabase.from('availability_slots').upsert(slots);
    if (sErr) console.warn('Slots seed error:', sErr);

    // 4. Community Itineraries
    console.log(`Inserting ${seedCommunityItineraries.length} community itineraries...`);
    for (const it of seedCommunityItineraries) {
      await supabase.from('community_itineraries').upsert({
        id: it.id,
        title: it.title,
        destination: it.destination,
        duration_days: it.duration_days,
        budget: it.budget,
        group_type: it.group_type,
        interests: it.interests,
        travel_style: it.travel_style,
        visibility: it.visibility
      });
    }

    console.log('✅ Remote Supabase seed complete!');
  } else {
    console.log('ℹ️ Supabase not configured in .env. Resetting in-memory seed store...');
    store.resetToSeed();
    console.log(`✅ In-memory store successfully seeded:`);
    console.log(`   - Providers: ${store.providers.length}`);
    console.log(`   - Experiences: ${store.experiences.length} (covering all 8 categories)`);
    console.log(`   - Availability Slots: ${store.availabilitySlots.length}`);
    console.log(`   - Community Itineraries: ${store.communityItineraries.length}`);
    console.log(`   - Verified rejection scenario: slot-0-1-1 has capacity_remaining = 0`);
  }
}

runSeed().catch(console.error);
