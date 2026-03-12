// src/core/constants.ts

/**
 * Global Constants & Enums
 * * Defines the single source of truth for IDs and fixed values.
 */

export enum TrackId {
    HIFZ = 1,
    MINOR_REVIEW = 2,
    MAJOR_REVIEW = 3
}

export enum EventType {
    MEMORIZATION = 'MEMORIZATION',
    REVIEW = 'REVIEW',
    BREAK = 'BREAK'
}


/**
 * 🪟 Window Review Mode
 *
 * GRADUAL: builds up from plan history, excludes today.
 *          Day 1 = no review, Day N = N-1 lessons (up to count).
 *          Suitable when student is starting fresh with no prior memorization.
 *
 * FIXED:   always shows exactly `count` lessons from day 1.
 *          Computes backward from cumulative array to fill prior memorization.
 *          Suitable when student has prior memorization before this plan.
 */
export enum WindowMode {
    GRADUAL = 'GRADUAL',
    FIXED = 'FIXED'
}

