import { ITrack } from '../tracks/BaseTrack';
import { ConstraintManager } from '../constraints/ConstraintManager';
import { QuranRepository } from './QuranRepository';

/**
 * Runtime context passed to strategies during simulation.
 * Bundles all dependencies to avoid parameter drilling.
 */
export class PlanContext {
    constructor(
        public currentDate: Date,
        public quranRepo: QuranRepository,
        public constraintManager: ConstraintManager,
        public allTracks: Map<number, ITrack>,
        public isReverse: boolean,
        public cumulativeArray: Float32Array,
        public indexMap: { [key: string]: number }
    ) {}
}