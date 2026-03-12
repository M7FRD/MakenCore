// src/errors/PlanErrorCode.ts

/**
 * PlanErrorCode
 * * Single source of truth for all error codes in the system.
 * * Used by PlanError to identify the error type in a structured way.
 */
export enum PlanErrorCode {

    // ── Builder Errors ────────────────────────────────────────────
    /** build() called without prior setSchedule(). */
    MISSING_SCHEDULE = 'MISSING_SCHEDULE',

    /** Tried to mix HIFZ and WERD ecosystems in the same plan. */
    MODE_MIXING = 'MODE_MIXING',

    /** Hifz start location is at/after end location. */
    START_AFTER_END = 'START_AFTER_END',

    /** Major review start is ahead of hifz start index. */
    MAJOR_REVIEW_AHEAD = 'MAJOR_REVIEW_AHEAD_OF_HIFZ',

    // ── Data Errors ───────────────────────────────────────────────
    /** Location (surah:ayah) not found in the Quran index map. */
    INVALID_LOCATION = 'INVALID_LOCATION',
}
