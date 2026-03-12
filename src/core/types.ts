// src/core/types.ts
import { TrackId, EventType } from './constants';

/**
 * Core type definitions for the engine.
 */

export interface LocationObj {
    surah: number;
    ayah: number;
    is_end: boolean;
}

/**
 * Historical record of a completed step.
 */
export interface HistoryItem {
    date: string;
    startIdx: number;
    endIdx: number;
}

export interface TrackState {
    currentIdx: number;
    history: HistoryItem[];
    isCompleted: boolean;
    extraData: Record<string, any>;
}

export interface StepResult {
    start: LocationObj;
    end: LocationObj;
    startIdx: number;
    endIdx: number;
    linesProcessed: number;
    flags?: string[];
}

/**
 * 🚀 NEW: Dynamic Event Structure
 * Replaces hardcoded columns with a flexible event system.
 */
export interface PlanEvent {
    trackId: number | TrackId;  // Link to the source track
    trackName: string;          // Readable name (for debugging/display)
    eventType: EventType;       // Semantic type
    data: {
        start: LocationObj;
        end: LocationObj;
        lines?: number;
        is_reset?: boolean;     // For looping tracks
    };
}

/**
 * Strictly typed day in the generated plan.
 * 🚀 UPDATED: Now uses an events array instead of fixed fields.
 */
export interface PlanDay {
    dayNum: number;
    date: Date;
    is_off: boolean;
    events: PlanEvent[]; // 👈 المرونة هنا
}