import { IConstraint } from './ConstraintManager';
import { ITrack } from '../tracks/BaseTrack';

/**
 * WallConstraint
 *
 * Prevents one track from overtaking another.
 *
 * 🚀 UPDATED: Added `fallbackTargetId` to handle the "bootstrapping" phase
 * where the primary target track has no history yet.
 *
 * EXAMPLE PROBLEM (without fallback):
 *   - Major Review starts at Al-Mulk (index M, high in reverse array)
 *   - Minor Review has no history yet → limitIdx falls back to 0
 *   - wallIdx(0) < currentIdx(M) → nonsensical backward "jump" + reset
 *
 * EXAMPLE SOLUTION (with fallback):
 *   - Minor has no history → use Hifz track's current position as wall
 *   - wallIdx = Hifz.startIdx (valid position ahead of Major Review)
 *   - Major Review moves correctly within bounds
 */
export class WallConstraint implements IConstraint {
    constructor(
        private sourceTrackId: number,      // Who is being constrained
        private targetTrackId: number,      // The primary "wall" track
        private useHistory: boolean = false, // Use history startIdx instead of currentIdx
        private buffer: number = 0,          // Safety margin (ayahs before wall)
        private fallbackTargetId?: number   // 🚀 NEW: Fallback when primary has no history
    ) { }

    getLimitIndex(sourceTrack: ITrack, allTracks: Map<number, ITrack>): number | null {
        if (sourceTrack.id !== this.sourceTrackId) return null;

        const target = allTracks.get(this.targetTrackId);
        if (!target) return null;

        let limitIdx = target.state.currentIdx;

        if (this.useHistory) {
            if (target.state.history.length > 0) {
                // ✅ Normal case: use start of last recorded lesson
                const lastHistory = target.state.history[target.state.history.length - 1];
                limitIdx = lastHistory.startIdx;
            } else {
                // 🚀 Bootstrapping phase: primary track has no history yet
                // Try the fallback track (e.g., Hifz) to get a meaningful wall position
                const fallback = this.fallbackTargetId !== undefined
                    ? allTracks.get(this.fallbackTargetId)
                    : null;

                if (fallback) {
                    // Fallback also uses history if available, otherwise its current position
                    limitIdx = fallback.state.history.length > 0
                        ? fallback.state.history[fallback.state.history.length - 1].startIdx
                        : fallback.state.currentIdx;
                } else {
                    // Original behavior: no fallback defined → 0
                    limitIdx = 0;
                }
            }
        }

        return Math.max(0, limitIdx - this.buffer);
    }

    validate(sourceTrack: ITrack, allTracks: Map<number, ITrack>): boolean {
        return true; // Soft constraint
    }
}