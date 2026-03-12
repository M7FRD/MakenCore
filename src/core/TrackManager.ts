// src/core/TrackManager.ts
import { ITrack } from '../tracks/BaseTrack';
import { PlanContext } from './PlanContext';
import { ConstraintManager } from '../constraints/ConstraintManager';
import { QuranRepository } from './QuranRepository'; // Type only!
import { DateUtils } from '../utils/DateUtils';
import { PlanDay, PlanEvent } from './types';
import { EventType } from './constants'; // 👈 Import Enum

export interface ManagerConfig {
    startDate: string;
    endDate?: string;
    daysPerWeek: number;
    limitDays: number;
    isReverse: boolean;
}

export type StopCondition = (tracks: Map<number, ITrack>) => boolean;

/**
 * TrackManager
 * * The core simulation engine.
 * * 🚀 REFACTORED:
 * 1. Uses Constructor Injection for QuranRepository (Pure DI).
 * 2. Generates dynamic 'events' array instead of fixed fields.
 */
export class TrackManager {
    private tracks: Map<number, ITrack> = new Map();
    private constraintManager: ConstraintManager;
    private stopCondition: StopCondition | null = null;

    // 🚀 DI: Repository is injected, not instantiated
    constructor(
        private config: ManagerConfig,
        private quranRepo: QuranRepository
    ) {
        this.constraintManager = new ConstraintManager();
    }

    addTrack(track: ITrack) {
        this.tracks.set(track.id, track);
    }

    hasTrack(id: number): boolean {
        return this.tracks.has(id);
    }

    getTrack(id: number): ITrack | undefined {
        return this.tracks.get(id);
    }

    getConstraintManager() {
        return this.constraintManager;
    }

    setStopCondition(condition: StopCondition) {
        this.stopCondition = condition;
    }

    /**
     * Main simulation loop.
     */
    generatePlan(): PlanDay[] {
        const plan: PlanDay[] = [];
        let currentDate = new Date(this.config.startDate);

        // Use injected repo
        const dirData = this.quranRepo.getDirectionData(this.config.isReverse);
        const endDateObj = this.config.endDate ? new Date(this.config.endDate) : null;

        // Skip to first working day
        while (!DateUtils.isWorkingDay(currentDate, this.config.daysPerWeek)) {
            currentDate = DateUtils.addDays(currentDate, 1);
        }

        let dayCounter = 1;

        while (true) {
            // Stop conditions
            if (this.config.limitDays > 0 && dayCounter > this.config.limitDays) break;
            if (endDateObj && currentDate > endDateObj) break;
            if (dayCounter > 5000) break;

            // Build context (Pass injected repo down to context)
            const dayContext = new PlanContext(
                currentDate,
                this.quranRepo, // 👈 Passing the injected instance
                this.constraintManager,
                this.tracks,
                this.config.isReverse,
                dirData.cumulative_array,
                dirData.index_map
            );

            // 🚀 NEW: Initialize dynamic day structure
            const currentPlanDay: PlanDay = {
                dayNum: dayCounter,
                date: new Date(currentDate),
                is_off: false,
                events: [] // Empty event container
            };

            // Execute tracks in ascending id order — enforces HIFZ(1)→MINOR(2)→MAJOR(3).
            // WindowStrategy depends on Hifz history already being committed before it runs.
            // Sorting here makes that invariant explicit and safe regardless of addTrack() order.
            for (const track of [...this.tracks.values()].sort((a, b) => a.id - b.id)) {
                const step = track.calculateNextStep(dayContext);

                if (step) {
                    track.commitStep(step, currentDate);

                    // 🚀 NEW: Generic Event Creation
                    // Determines event type based on track type/name logic
                    // (Simplification: assuming 'linear' = MEMORIZATION, others = REVIEW)
                    // You can enhance this mapping logic later.
                    let eType = EventType.REVIEW;
                    if (track.type === 'linear') eType = EventType.MEMORIZATION;

                    const event: PlanEvent = {
                        trackId: track.id,
                        trackName: track.name,
                        eventType: eType,
                        data: {
                            start: step.start,
                            end: step.end,
                            lines: step.linesProcessed,
                            is_reset: step.flags?.includes('reset')
                        }
                    };

                    currentPlanDay.events.push(event);
                }
            }

            plan.push(currentPlanDay);

            if (this.stopCondition && this.stopCondition(this.tracks)) {
                break;
            }

            // Advance time
            dayCounter++;
            currentDate = DateUtils.addDays(currentDate, 1);

            while (!DateUtils.isWorkingDay(currentDate, this.config.daysPerWeek)) {
                currentDate = DateUtils.addDays(currentDate, 1);
            }
        }

        return plan;
    }
}