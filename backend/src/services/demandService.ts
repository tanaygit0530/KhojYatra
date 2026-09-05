import { DemandInsight, ConstraintIntake, ExperienceCategory } from '@khojyatra/types';
import { store } from '../data/store.js';
import { calculateDistanceKm } from './decisionEngine.js';

export interface SearchLogEntry {
  id: string;
  lat: number;
  lng: number;
  category: ExperienceCategory;
  time_window: string;
  created_at: string;
  constraint_json: any;
}

export class DemandService {
  public searchLogs: SearchLogEntry[] = [];

  constructor() {
    this.seedInitialLogs();
  }

  private seedInitialLogs() {
    // Seed initial realistic search logs around Delhi and Jaipur
    const categories: ExperienceCategory[] = ['food_culinary', 'cultural_heritage', 'workshops_classes', 'hidden_gems'];
    const now = Date.now();

    // Delhi cluster (28.6506, 77.2303)
    for (let i = 0; i < 40; i++) {
      this.searchLogs.push({
        id: `log-delhi-${i}`,
        lat: 28.6506 + (Math.random() - 0.5) * 0.05,
        lng: 77.2303 + (Math.random() - 0.5) * 0.05,
        category: 'food_culinary',
        time_window: '18:00-21:00',
        created_at: new Date(now - i * 3600 * 1000).toISOString(),
        constraint_json: { duration_minutes: 180, budget: { max: 1500 } }
      });
    }

    // Additional categories
    for (let i = 0; i < 25; i++) {
      this.searchLogs.push({
        id: `log-craft-${i}`,
        lat: 26.9124 + (Math.random() - 0.5) * 0.05,
        lng: 75.7873 + (Math.random() - 0.5) * 0.05,
        category: 'workshops_classes',
        time_window: '10:00-13:00',
        created_at: new Date(now - i * 7200 * 1000).toISOString(),
        constraint_json: { duration_minutes: 120, budget: { max: 2000 } }
      });
    }
  }

  public logSearch(lat: number, lng: number, intake: ConstraintIntake) {
    const effectiveHour = new Date(intake.location_context.effective_time || Date.now()).getHours();
    let timeWindow = '12:00-15:00';
    if (effectiveHour >= 6 && effectiveHour < 12) timeWindow = '08:00-12:00';
    else if (effectiveHour >= 12 && effectiveHour < 17) timeWindow = '12:00-17:00';
    else if (effectiveHour >= 17 && effectiveHour < 22) timeWindow = '18:00-21:00';
    else timeWindow = '21:00-01:00';

    const cats = intake.interests.length > 0 ? intake.interests : (['cultural_heritage'] as ExperienceCategory[]);
    cats.forEach(cat => {
      this.searchLogs.push({
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        lat,
        lng,
        category: cat,
        time_window: timeWindow,
        created_at: new Date().toISOString(),
        constraint_json: intake
      });
    });
  }

  public getDemandInsights(providerId: string): DemandInsight[] {
    const provider = store.providers.find(p => p.id === providerId) || store.providers[0];
    const providerOfferings = store.experiences.filter(e => e.provider_id === provider.id);
    const providerCategories = new Set(providerOfferings.map(e => e.category));

    // Filter logs within 45 km radius of ANY of the provider's offerings
    const nearbyLogs = this.searchLogs.filter(log => {
      if (providerOfferings.length === 0) return true;
      return providerOfferings.some(offering => {
        const dist = calculateDistanceKm(offering.lat, offering.lng, log.lat, log.lng);
        return dist <= 45;
      });
    });

    // Aggregate counts by category and time window
    const aggregates = new Map<string, { category: ExperienceCategory; time_window: string; count: number }>();

    nearbyLogs.forEach(log => {
      const key = `${log.category}__${log.time_window}`;
      const existing = aggregates.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        aggregates.set(key, {
          category: log.category,
          time_window: log.time_window,
          count: 1
        });
      }
    });

    const insights: DemandInsight[] = [];
    aggregates.forEach(({ category, time_window, count }) => {
      if (count >= 3) {
        const hasCoverage = providerCategories.has(category);
        const categoryLabel = category.replace('_', ' ');
        const message = hasCoverage
          ? `High demand captured: ${count} travelers searched for ${categoryLabel} in your area, and you have active offerings ready.`
          : `${count} travelers searched for ${time_window} ${categoryLabel} experiences near you this week — you currently have no listings in that window.`;

        insights.push({
          category,
          time_window,
          search_count: count,
          provider_has_coverage: hasCoverage,
          message
        });
      }
    });

    // Prioritize unmet demand gaps first
    return insights.sort((a, b) => {
      if (!a.provider_has_coverage && b.provider_has_coverage) return -1;
      if (a.provider_has_coverage && !b.provider_has_coverage) return 1;
      return b.search_count - a.search_count;
    });
  }
}

export const demandService = new DemandService();
