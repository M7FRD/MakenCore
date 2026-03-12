import { TrackState, StepResult } from '../core/types';
import { PlanContext } from '../core/PlanContext';
import { IMovementStrategy } from '../strategies/IMovementStrategy';

/**
 * Track interface exposed to TrackManager.
 */
export interface ITrack {
    readonly id: number;
    readonly name: string;
    readonly type: string;
    state: TrackState;
    calculateNextStep(context: PlanContext): StepResult | null;
    // 🚀 FIX: Accept simulation date to ensure history accuracy
    commitStep(step: StepResult, currentDate: Date): void;
}

/**
 * BaseTrack
 * * Abstract base for all track implementations.
 * Handles state management, delegates movement logic to Strategy.
 * * STRATEGY PATTERN: Movement logic is injected, not hardcoded.
 */
export abstract class BaseTrack implements ITrack {
    public state: TrackState;

    constructor(
        public readonly id: number,
        public readonly name: string,
        public readonly type: string,
        protected strategy: IMovementStrategy,
        protected config: any,
        startIdx: number = 0
    ) {
        this.state = {
            currentIdx: startIdx,
            history: [],
            isCompleted: false,
            extraData: {}
        };
        this.config.trackId = id; // Inject ID for strategies that need it
    }

    calculateNextStep(context: PlanContext): StepResult | null {
        if (this.state.isCompleted) return null;
        return this.strategy.calculateNextStep(this.state, context, this.config);
    }

    // 🚀 FIX: Added currentDate parameter
    commitStep(step: StepResult, currentDate: Date): void {
        if (!step) return;

        // Record history
        this.state.history.push({
            // 🚀 FIX: Use simulation date instead of system clock (new Date())
            date: currentDate.toISOString(),
            startIdx: step.startIdx,
            endIdx: step.endIdx
        });

        // Update position
        if (step.flags?.includes('reset')) {
            this.state.currentIdx = 0; // Loop back to start
        } else if (step.endIdx >= step.startIdx) {
            // When completed, stay at the last valid index (never go out of bounds).
            // WallConstraint (useHistory:false) reads currentIdx directly on the Quran array,
            // so endIdx+1 would be undefined/NaN on the final lesson.
            this.state.currentIdx = step.flags?.includes('completed')
                ? step.endIdx
                : step.endIdx + 1;
        }

        // 🚀 NEW: Handle Completion Flag
        // If the strategy says we are done (e.g., hit the target endIdx), 
        // we lock the track state.
        if (step.flags?.includes('completed')) {
            this.state.isCompleted = true;
        }
    }
}