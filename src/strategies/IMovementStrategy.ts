import { TrackState, StepResult } from '../core/types';
import { PlanContext } from '../core/PlanContext';

/**
 * Strategy interface for track movement logic.
 * 
 * STRATEGY PATTERN: Separates "how tracks move" from track infrastructure.
 * 
 * IMPLEMENTATIONS:
 * - LinearStrategy: Move forward until completion
 * - LoopingStrategy: Move forward, reset at end/barrier
 * - WindowStrategy: Review sliding window of history
 */
export interface IMovementStrategy {
    /**
     * Calculates next step for a track.
     * @returns StepResult if movement possible, null if track should wait/pause
     */
    calculateNextStep(
        state: TrackState,
        context: PlanContext,
        config: Record<string, any>
    ): StepResult | null;
}