import { socialIngestionService } from '../src/services/socialIngestionService.js';

console.log('--- KhojYatra Phase 24: Social-to-Geo Ingestion Pipeline ---');
console.log('Ingesting authorized sample social submissions per Phase-3 consent policy (no private scrapers)...');

const sampleSubmission = {
  source_handle: '@delhi_unexplored_walks',
  source_url: 'https://instagram.com/p/sample_demo_789',
  caption: 'Tucked away behind Chandni Chowk, 90-year-old Panditji still prepares almond rabri in clay kulhads over slow coal fires. Unmarked door next to the red gate! 📍 Kucha Pati Ram, Old Delhi',
  suggested_category: 'food_culinary' as const,
  lat: 28.6530,
  lng: 77.2315,
  estimated_price: 180
};

const staged = socialIngestionService.ingestSocialPost(sampleSubmission);
console.log('✅ Successfully staged social discovery:');
console.log({
  id: staged.id,
  title: staged.extracted_title,
  category: staged.category,
  price: staged.price_estimate,
  trust_label: staged.trust_label,
  status: staged.status
});
console.log('\nNow available for admin review at /admin/ingestion-queue');
