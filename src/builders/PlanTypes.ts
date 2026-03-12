/**
 * PlanTypes.ts
 * Type definitions for the Quran Planning Engine.
 * Establishes type-safe contracts across all modules.
 */

/**
 * Execution mode for plan building.
 * Prevents incompatible track combinations (e.g., can't mix Hifz with Werd).
 */
export type PlanMode = 'NONE' | 'HIFZ_ECOSYSTEM' | 'WERD_ECOSYSTEM';

/**
 * Track request types (sorted by priority during build phase).
 */
export type TrackRequestType = 'HIFZ' | 'MINOR_REVIEW' | 'MAJOR_REVIEW';

/**
 * Internal request object for deferred execution pattern.
 */
export interface TrackRequest {
    type: TrackRequestType;
    params: any; // Polymorphic - contents vary by track type
}

/**
 * Quranic location in user-friendly coordinates.
 */
export interface LocationConfig {
    surah: number;  // 1-114
    ayah: number;   // Varies by surah
}

/**
 * Temporal configuration for the plan execution.
 */
export interface ScheduleConfig {
    startDate: string;       // ISO format (YYYY-MM-DD)
    daysPerWeek: number;     // 1-7 working days
    limitDays?: number;      // Max days (0 = run to completion)
    endDate?: string;        // Optional deadline
    isReverse?: boolean;     // false = Fatiha→Nas, true = Nas→Fatiha
    
    // NOTE: Stop conditions are NOT defined here to keep ScheduleConfig pure.
    // Use PlanBuilder methods (e.g., .stopWhenCompleted()) instead.
}

/**
 * Shared context passed to subsystems during build phase.
 */
export interface BuilderContext {
    isReverse: boolean;
}

/**
 * 🚀 NEW: Configuration interface for Linear Strategy
 * Explicitly defines that a track can have an optional end boundary.
 */
export interface LinearTrackConfig {
    amount: number;
    endIdx?: number; // Optional: If undefined, runs to end of Quran
}