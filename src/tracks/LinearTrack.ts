import { BaseTrack } from './BaseTrack';
import { LinearStrategy } from '../strategies/LinearStrategy';

/**
 * LinearTrack
 * Represents a standard memorization path (Point A to Point B).
 * 🚀 UPDATE: Now accepts an optional 'endIdx'.
 */
export class LinearTrack extends BaseTrack {
    constructor(
        id: number, 
        name: string, 
        startIdx: number, 
        amountLines: number,
        endIdx?: number // 🚀 Optional End Boundary
    ) {
        super(
            id, 
            name, 
            'linear', 
            new LinearStrategy(), 
            { amount: amountLines, endIdx }, // Pass to Strategy Config
            startIdx
        );
    }
}