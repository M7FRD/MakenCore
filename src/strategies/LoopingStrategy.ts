import { IMovementStrategy } from './IMovementStrategy';
import { TrackState, StepResult } from '../core/types';
import { PlanContext } from '../core/PlanContext';
import { findExponentialStopIndex } from '../utils/Algorithms';

/**
 * LoopingStrategy
 * 
 * For Major Review: continuous cycling with barrier awareness.
 * 
 * BEHAVIOR:
 * - Moves forward by fixed amount
 * - Stops at "wall" (constraint from other tracks)
 * - Resets to 0 when hitting end or wall
 */
export class LoopingStrategy implements IMovementStrategy {
    calculateNextStep(
        state: TrackState, 
        context: PlanContext, 
        config: { amount: number, trackId: number }
    ): StepResult | null {
        const currentIdx = state.currentIdx;
        const maxIndex = context.cumulativeArray.length - 1;

        // Check for barrier (wall constraint)
        const meTrack = context.allTracks.get(config.trackId);
        let wallIdx = maxIndex;
        
        if (meTrack) {
            const barrier = context.constraintManager.getBarrierIndex(meTrack, context.allTracks);
            if (barrier !== null) {
                wallIdx = barrier;
            }
        }

        // Calculate target
        const currentCum = currentIdx > 0 ? context.cumulativeArray[currentIdx - 1] : 0;
        const targetCum = currentCum + config.amount;

        const effectiveSearchLimit = Math.min(wallIdx, maxIndex);

        let stopIdx = findExponentialStopIndex(
            context.cumulativeArray,
            targetCum,
            currentIdx,
            effectiveSearchLimit
        );

        // Check if we hit the wall
        let hitWall = false;
        
        if (stopIdx >= wallIdx) {
            stopIdx = wallIdx;
            hitWall = true;
        }
        
        if (stopIdx === maxIndex && wallIdx === maxIndex) {
            hitWall = true;
        }

        // Silence logic: if no movement possible, return null (track waits)
        if (stopIdx === currentIdx) {
            return null;
        }

        const result: StepResult = {
            startIdx: currentIdx,
            endIdx: stopIdx,
            start: context.quranRepo.getLocationFromIndex(currentIdx, context.indexMap),
            end: context.quranRepo.getLocationFromIndex(stopIdx, context.indexMap),
            linesProcessed: parseFloat((context.cumulativeArray[stopIdx] - currentCum).toFixed(2)),
            flags: []
        };

        if (hitWall) {
            result.flags?.push('reset');
        }

        return result;
    }
}