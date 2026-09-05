import { Itinerary, ItineraryItem, ItineraryFeasibility, Experience } from '@khojyatra/types';
import { calculateDistanceKm, estimateTravelTimeMinutes } from './decisionEngine.js';
import { store } from '../data/store.js';

export interface AddItemResult {
  itinerary: Itinerary;
  newItem: ItineraryItem;
  feasibility: ItineraryFeasibility;
}

class ItineraryPlanner {
  // In-memory active itinerary map by session_id
  private sessionItineraries: Map<string, Itinerary> = new Map();

  public getOrCreateItinerary(sessionId: string, userId?: string | null): Itinerary {
    let itin = this.sessionItineraries.get(sessionId);
    if (!itin) {
      itin = {
        id: `itin-${sessionId.slice(0, 8)}`,
        user_id: userId || null,
        session_id: sessionId,
        date: new Date().toISOString().slice(0, 10),
        status: 'draft',
        budget_cap: 3000,
        items: []
      };
      this.sessionItineraries.set(sessionId, itin);
    }
    return itin;
  }

  public getItineraryById(id: string): Itinerary | undefined {
    return Array.from(this.sessionItineraries.values()).find(i => i.id === id);
  }

  // Phase 17: Real-Time Budget Status
  public getBudgetStatus(sessionId: string, itineraryId?: string) {
    const itin = itineraryId
      ? Array.from(this.sessionItineraries.values()).find(i => i.id === itineraryId) || this.getOrCreateItinerary(sessionId)
      : this.getOrCreateItinerary(sessionId);

    const budgetCap = itin.budget_cap || 3000;
    const totalCommitted = itin.items.reduce((sum, it) => sum + (it.price_committed || 0), 0);
    const remainingBudget = Math.max(0, budgetCap - totalCommitted);
    const isExceeded = totalCommitted > budgetCap;
    const softWarning = isExceeded
      ? `Committed ₹${totalCommitted} exceeds planned cap of ₹${budgetCap} by ₹${totalCommitted - budgetCap}`
      : null;

    return {
      itinerary_id: itin.id,
      budget_cap: budgetCap,
      total_committed: totalCommitted,
      remaining_budget: remainingBudget,
      currency: 'INR',
      is_exceeded: isExceeded,
      soft_warning: softWarning
    };
  }

  // Greedy time-window packing algorithm
  public addItem(
    sessionId: string,
    experienceId: string,
    userId?: string | null
  ): AddItemResult {
    const itin = this.getOrCreateItinerary(sessionId, userId);
    const exp = store.getExperienceById(experienceId);
    if (!exp) {
      throw new Error(`Experience ${experienceId} not found`);
    }

    const currentItems = [...itin.items].sort((a, b) => a.position - b.position);

    let scheduledStart: Date;
    let position = 0;

    if (currentItems.length === 0) {
      // First item starts at 10:00 AM today
      scheduledStart = new Date();
      scheduledStart.setHours(10, 0, 0, 0);
      position = 1;
    } else {
      // Greedy insertion: Place after the last current stop plus duration & transit time
      const lastItem = currentItems[currentItems.length - 1];
      const lastExp = lastItem.experience || store.getExperienceById(lastItem.experience_id);

      const lastStart = new Date(lastItem.start_time);
      const lastDuration = lastExp ? lastExp.duration_min : 90;

      // Distance between previous stop and new stop
      const transitDistKm = lastExp ? calculateDistanceKm(lastExp.lat, lastExp.lng, exp.lat, exp.lng) : 3;
      const transitMin = estimateTravelTimeMinutes(transitDistKm);

      scheduledStart = new Date(lastStart.getTime() + (lastDuration + transitMin) * 60 * 1000);
      position = currentItems.length + 1;
    }

    const priceCommitted = exp.price_min;

    const newItem: ItineraryItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      itinerary_id: itin.id,
      experience_id: exp.id,
      position,
      start_time: scheduledStart.toISOString(),
      price_committed: priceCommitted,
      experience: exp
    };

    itin.items.push(newItem);
    itin.items.sort((a, b) => a.position - b.position);

    // Feasibility analysis
    const feasibility = this.checkFeasibility(itin);

    return {
      itinerary: itin,
      newItem,
      feasibility
    };
  }

  // Conflict and feasibility verification
  public checkFeasibility(itin: Itinerary): ItineraryFeasibility {
    const conflicts: Array<{ item_id: string; message: string; severity: 'warning' | 'error' }> = [];
    const items = [...itin.items].sort((a, b) => a.position - b.position);

    // 1. Time overlap & buffer check
    for (let i = 0; i < items.length - 1; i++) {
      const current = items[i];
      const next = items[i + 1];

      const currentExp = current.experience || store.getExperienceById(current.experience_id);
      const nextExp = next.experience || store.getExperienceById(next.experience_id);

      const currentStart = new Date(current.start_time).getTime();
      const nextStart = new Date(next.start_time).getTime();
      const currentDurationMin = currentExp ? currentExp.duration_min : 90;

      const transitKm = (currentExp && nextExp)
        ? calculateDistanceKm(currentExp.lat, currentExp.lng, nextExp.lat, nextExp.lng)
        : 5;
      const transitMin = estimateTravelTimeMinutes(transitKm);

      const earliestArrivalAtNext = currentStart + (currentDurationMin + transitMin) * 60 * 1000;

      if (earliestArrivalAtNext > nextStart) {
        const overflowMin = Math.round((earliestArrivalAtNext - nextStart) / (60 * 1000));
        conflicts.push({
          item_id: next.id,
          message: `Transit conflict: Arrives ${overflowMin}m late for ${nextExp?.title || 'next stop'} due to ${transitMin}m travel time from previous stop.`,
          severity: 'error'
        });
      }
    }

    // 2. Budget cap check
    if (itin.budget_cap) {
      const totalCommitted = items.reduce((sum, it) => sum + (it.price_committed || 0), 0);
      if (totalCommitted > itin.budget_cap) {
        conflicts.push({
          item_id: items[items.length - 1]?.id || itin.id,
          message: `Budget warning: Committed ₹${totalCommitted} exceeds cap of ₹${itin.budget_cap} by ₹${totalCommitted - itin.budget_cap}`,
          severity: 'warning'
        });
      }
    }

    return {
      feasible: conflicts.filter(c => c.severity === 'error').length === 0,
      conflicts
    };
  }

  public removeItem(sessionId: string, itemId: string): Itinerary {
    const itin = this.getOrCreateItinerary(sessionId);
    itin.items = itin.items.filter(i => i.id !== itemId);
    itin.items.forEach((it, idx) => {
      it.position = idx + 1;
    });
    return itin;
  }
}

export const itineraryPlanner = new ItineraryPlanner();
