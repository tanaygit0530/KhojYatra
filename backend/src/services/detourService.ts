import { DetourEvaluationResult } from '@khojyatra/types';
import { itineraryPlanner } from './itineraryPlanner.js';
import { store } from '../data/store.js';
import { calculateDistanceKm, estimateTravelTimeMinutes } from './decisionEngine.js';

class DetourService {
  public evaluateDetour(sessionId: string, candidateExperienceId: string): DetourEvaluationResult {
    const itin = itineraryPlanner.getOrCreateItinerary(sessionId);
    const candidate = store.getExperienceById(candidateExperienceId);

    if (!candidate) {
      throw new Error(`Candidate experience ${candidateExperienceId} not found`);
    }

    // Check if already in itinerary
    if (itin.items.some(i => i.experience_id === candidateExperienceId)) {
      return {
        candidate_experience_id: candidate.id,
        candidate_title: candidate.title,
        worth_it: false,
        added_minutes: 0,
        added_cost: 0,
        still_on_time: true,
        buffer_remaining_minutes: 0,
        reason: 'This experience is already confirmed in your current day plan.'
      };
    }

    const items = [...itin.items].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const addedCost = candidate.price_min;

    if (items.length === 0) {
      return {
        candidate_experience_id: candidate.id,
        candidate_title: candidate.title,
        worth_it: true,
        added_minutes: candidate.duration_min + 15,
        added_cost: addedCost,
        still_on_time: true,
        buffer_remaining_minutes: 180,
        reason: 'Your itinerary is wide open — you can comfortably add this experience.',
        next_commitment: null
      };
    }

    // Find the next upcoming fixed commitment
    // In our day planner, fixed commitments are items with a confirmed start_time
    const now = new Date();
    const futureCommitment = items.find(i => new Date(i.start_time).getTime() > now.getTime()) || items[items.length - 1];
    const commitmentExp = futureCommitment.experience || store.getExperienceById(futureCommitment.experience_id);
    const commitmentStart = new Date(futureCommitment.start_time);

    // Reference starting point (previous stop or traveler origin)
    const prevItem = items.filter(i => new Date(i.start_time).getTime() < commitmentStart.getTime()).pop();
    const prevExp = prevItem?.experience || (prevItem ? store.getExperienceById(prevItem.experience_id) : null);

    const startLat = prevExp ? prevExp.lat : candidate.lat;
    const startLng = prevExp ? prevExp.lng : candidate.lng;
    const prevEndTime = prevItem && prevExp
      ? new Date(new Date(prevItem.start_time).getTime() + prevExp.duration_min * 60 * 1000)
      : now;

    // Transit to candidate
    const distToCandidate = calculateDistanceKm(startLat, startLng, candidate.lat, candidate.lng);
    const timeToCandidateMin = estimateTravelTimeMinutes(distToCandidate);

    // Transit from candidate to next fixed commitment
    const distToCommitment = commitmentExp
      ? calculateDistanceKm(candidate.lat, candidate.lng, commitmentExp.lat, commitmentExp.lng)
      : 5;
    const timeToCommitmentMin = estimateTravelTimeMinutes(distToCommitment);

    const totalAddedTransitMin = timeToCandidateMin + timeToCommitmentMin;
    const totalDetourRequiredMin = totalAddedTransitMin + candidate.duration_min;

    // Available window before commitment
    const availableMs = commitmentStart.getTime() - prevEndTime.getTime();
    const availableMin = Math.round(availableMs / (60 * 1000));
    const bufferRemainingMinutes = availableMin - totalDetourRequiredMin;

    // Require at least a 15-minute comfortable buffer before fixed commitment
    const stillOnTime = bufferRemainingMinutes >= 10;
    const worthIt = stillOnTime && bufferRemainingMinutes >= 15;

    const formattedCommitmentTime = commitmentStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const commitmentTitle = commitmentExp?.title || 'Next Scheduled Stop';

    let reason: string;
    if (stillOnTime && worthIt) {
      reason = `Worth the detour! +${totalAddedTransitMin}m travel time and ₹${addedCost} fits comfortably with a ${bufferRemainingMinutes}m safety cushion before "${commitmentTitle}" at ${formattedCommitmentTime}.`;
    } else if (stillOnTime && !worthIt) {
      reason = `Tight squeeze: you will arrive on time with only a ${bufferRemainingMinutes}m safety cushion before "${commitmentTitle}" at ${formattedCommitmentTime}. Proceed with caution.`;
    } else {
      const lateMin = Math.abs(bufferRemainingMinutes);
      reason = `Not recommended: this detour requires ${totalDetourRequiredMin}m total, causing a ${lateMin}m delay for your confirmed booking "${commitmentTitle}" at ${formattedCommitmentTime}.`;
    }

    return {
      candidate_experience_id: candidate.id,
      candidate_title: candidate.title,
      worth_it: worthIt,
      added_minutes: totalDetourRequiredMin,
      added_cost: addedCost,
      still_on_time: stillOnTime,
      buffer_remaining_minutes: bufferRemainingMinutes,
      reason,
      next_commitment: {
        title: commitmentTitle,
        start_time: commitmentStart.toISOString()
      }
    };
  }
}

export const detourService = new DetourService();
