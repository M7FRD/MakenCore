import { ITrack } from '../tracks/BaseTrack';
import { WallConstraint } from './WallConstraint';

/**
 * Interface for constraint implementations.
 */
export interface IConstraint {
    validate(sourceTrack: ITrack, allTracks: Map<number, ITrack>): boolean;
    getLimitIndex(sourceTrack: ITrack, allTracks: Map<number, ITrack>): number | null;
}

/**
 * ConstraintManager
 * 
 * Orchestrates all constraints between tracks.
 * Acts as "Traffic Police" to prevent track collisions.
 * 
 * EXAMPLE: Major Review can't overtake Minor Review's current position.
 */
export class ConstraintManager {
    private constraints: IConstraint[] = [];

    addConstraint(constraint: IConstraint) {
        this.constraints.push(constraint);
    }

    /**
     * Finds the most restrictive barrier across all constraints.
     * @returns Minimum index allowed, or null if no constraints apply
     */
    getBarrierIndex(sourceTrack: ITrack, allTracks: Map<number, ITrack>): number | null {
        let minBarrier = Number.MAX_SAFE_INTEGER;
        let found = false;

        for (const constraint of this.constraints) {
            const limit = constraint.getLimitIndex(sourceTrack, allTracks);
            if (limit !== null) {
                if (limit < minBarrier) {
                    minBarrier = limit;
                    found = true;
                }
            }
        }
        return found ? minBarrier : null;
    }
}