// src/strategies/WindowStrategy.ts
import { IMovementStrategy } from './IMovementStrategy';
import { TrackState, StepResult } from '../core/types';
import { PlanContext } from '../core/PlanContext';
import { WindowMode } from '../core/constants';
import { findBinaryStopIndex } from '../utils/Algorithms';

interface WindowStrategyConfig {
    historySourceId: number;
    count: number;
    mode: WindowMode;
}

/**
 * WindowStrategy
 *
 * ── GRADUAL ──────────────────────────────────────────────────────
 * Source: past history only (excludes today). Builds 0 → count.
 * Day 1 = nothing. Day count+1 = full window.
 *
 * ── FIXED ────────────────────────────────────────────────────────
 * Always shows exactly `count` completed lessons.
 * KEY INVARIANT: Today's lesson NEVER enters the window (both modes).
 *
 *   Case A: pastLessons.length >= count
 *     → Exact lesson boundaries from history. Zero approximation.
 *
 *   Case B: pastLessons.length < count
 *     → Fill gap with pre-plan memorization via backward search.
 *
 *     endIdx anchor:
 *       - pastLessons exist → last past lesson's endIdx       (normal)
 *       - no pastLessons    → planStartIdx - 1                (Day 1 edge case)
 *         "end just before the plan starts"
 *
 *     searchFrom anchor (where to search backward from):
 *       - pastLessons exist → earliest past lesson's startIdx
 *       - no pastLessons    → planStartIdx
 *
 *     If no pre-plan material found → degrade to GRADUAL.
 */
export class WindowStrategy implements IMovementStrategy {

    calculateNextStep(
        state: TrackState,
        context: PlanContext,
        config: WindowStrategyConfig
    ): StepResult | null {
        const sourceTrack = context.allTracks.get(config.historySourceId);
        if (!sourceTrack) return null;

        // Single extraction point — both modes receive the same pastLessons
        const pastLessons = sourceTrack.state.history.slice(0, -1);

        return config.mode === WindowMode.FIXED
            ? this.calcFixed(pastLessons, sourceTrack.state.history, context, config.count)
            : this.calcGradual(pastLessons, context, config.count);
    }

    // ─────────────────────────────────────────────────────────────
    // GRADUAL
    // ─────────────────────────────────────────────────────────────
    private calcGradual(
        pastLessons: TrackState['history'],
        context: PlanContext,
        count: number
    ): StepResult | null {
        if (pastLessons.length === 0) return null;

        const window = pastLessons.slice(-count);
        const startIdx = window[0].startIdx;
        const endIdx = window[window.length - 1].endIdx;

        return this.buildResult(startIdx, endIdx, context);
    }

    // ─────────────────────────────────────────────────────────────
    // FIXED
    // ─────────────────────────────────────────────────────────────
    private calcFixed(
        pastLessons: TrackState['history'],  // excludes today
        fullHistory: TrackState['history'],  // needed for planStartIdx + size estimate
        context: PlanContext,
        count: number
    ): StepResult | null {
        if (fullHistory.length === 0) return null;

        // ── Case A: enough in-plan past lessons ──────────────────
        if (pastLessons.length >= count) {
            const window = pastLessons.slice(-count);
            return this.buildResult(
                window[0].startIdx,
                window[window.length - 1].endIdx,
                context
            );
        }

        // ── Case B: need pre-plan material ───────────────────────
        const planStartIdx = fullHistory[0].startIdx;

        // endIdx: last position of the window (never includes today)
        //   - Day 1 (no pastLessons): end = position just before plan starts
        //   - Day N:                  end = last past lesson's endIdx
        const endIdx = pastLessons.length > 0
            ? pastLessons[pastLessons.length - 1].endIdx
            : Math.max(0, planStartIdx - 1);

        // No pre-plan material possible → plan started at direction beginning
        if (planStartIdx === 0 && pastLessons.length === 0) {
            return this.calcGradual(pastLessons, context, count);
        }

        // searchFrom: earliest available start (pre-plan search origin)
        //   - pastLessons exist → earliest past lesson's start
        //   - no pastLessons    → planStartIdx (search backward from plan origin)
        const searchFromIdx = pastLessons.length > 0
            ? pastLessons[0].startIdx
            : planStartIdx;

        // Estimate lesson size from the first plan lesson (most stable reference)
        const anchorLesson = fullHistory[0];
        const anchorStartCum = anchorLesson.startIdx > 0
            ? context.cumulativeArray[anchorLesson.startIdx - 1]
            : 0;
        const anchorEndCum = context.cumulativeArray[anchorLesson.endIdx];
        const linesPerLesson = anchorEndCum - anchorStartCum;

        const missingCount = count - pastLessons.length;
        const searchFromCum = searchFromIdx > 0
            ? context.cumulativeArray[searchFromIdx - 1]
            : 0;
        const windowStartCum = Math.max(0, searchFromCum - linesPerLesson * missingCount);

        const startIdx = findBinaryStopIndex(
            context.cumulativeArray,
            windowStartCum,
            0,
            searchFromIdx
        );

        // No pre-plan material → degrade to GRADUAL
        if (startIdx >= planStartIdx) {
            return this.calcGradual(pastLessons, context, count);
        }

        return this.buildResult(startIdx, endIdx, context);
    }

    // ─────────────────────────────────────────────────────────────
    // Shared builder
    // ─────────────────────────────────────────────────────────────
    private buildResult(
        startIdx: number,
        endIdx: number,
        context: PlanContext
    ): StepResult {
        return {
            startIdx,
            endIdx,
            start: context.quranRepo.getLocationFromIndex(startIdx, context.indexMap),
            end: context.quranRepo.getLocationFromIndex(endIdx, context.indexMap),
            linesProcessed: 0,
            flags: ['review']
        };
    }
}