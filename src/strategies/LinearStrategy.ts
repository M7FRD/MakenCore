import { IMovementStrategy } from './IMovementStrategy';
import { TrackState, StepResult } from '../core/types';
import { PlanContext } from '../core/PlanContext';
import { findExponentialStopIndex } from '../utils/Algorithms';
import { LinearTrackConfig } from '../builders/PlanTypes';

/**
 * LinearStrategy
 * * Simple forward progression (used for new Hifz).
 * Moves by fixed amount each day until completion.
 * * 🚀 UPDATED: Handles optional 'End Index' and prevents overshoot.
 */
export class LinearStrategy implements IMovementStrategy {
    calculateNextStep(
        state: TrackState, 
        context: PlanContext, 
        config: LinearTrackConfig
    ): StepResult {
        const currentIdx = state.currentIdx;
        
        // 1. Determine Effective Limit (The "Ceiling")
        // It's either the user-defined endIdx OR the absolute end of the Quran.
        const globalMax = context.cumulativeArray.length - 1;
        const targetMax = config.endIdx !== undefined ? config.endIdx : globalMax;
        
        // Safety clamp to ensure we never look beyond array bounds
        const effectiveMax = Math.min(targetMax, globalMax);

        // 2. Calculate Target Cumulative Value
        const currentCum = currentIdx > 0 ? context.cumulativeArray[currentIdx - 1] : 0;
        const targetCum = currentCum + config.amount;

        // 3. Find Stop Index using Exponential Search (O(log n))
        // We limit the search range to 'effectiveMax' to optimize performance.
        let stopIdx = findExponentialStopIndex(
            context.cumulativeArray,
            targetCum,
            currentIdx,
            effectiveMax
        );

        // 4. 🛡️ OVERSHOOT PROTECTION (Edge Case Handling)
        // If the calculated step goes beyond the user's defined end,
        // we clamp it exactly to the end index.
        if (stopIdx >= effectiveMax) {
            stopIdx = effectiveMax;
        }

        const result: StepResult = {
            startIdx: currentIdx,
            endIdx: stopIdx,
            start: context.quranRepo.getLocationFromIndex(currentIdx, context.indexMap),
            end: context.quranRepo.getLocationFromIndex(stopIdx, context.indexMap),
            linesProcessed: parseFloat((context.cumulativeArray[stopIdx] - currentCum).toFixed(2)),
            flags: []
        };

        // 5. 🏁 COMPLETION FLAG
        // If we reached (or exceeded) the effective max, mark as completed.
        if (stopIdx >= effectiveMax) {
            result.flags?.push('completed');
        }

        return result;
    }
}