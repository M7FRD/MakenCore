// src/builders/PlanBuilder.ts
import { TrackManager } from '../core/TrackManager';
import { PlanMode, ScheduleConfig, LocationConfig, TrackRequest } from './PlanTypes';
import { HifzSystem } from './HifzSystem';
import { QuranRepository } from '../core/QuranRepository';
import { WindowMode } from '../core/constants';
import { PlanError, PlanErrorCode, Severity } from '../errors';

/**
 * PlanBuilder
 * * Fluent API for building complex plans.
 * * 🚀 REFACTORED: Injects QuranRepository into TrackManager.
 */
export class PlanBuilder {
    private requests: TrackRequest[] = [];
    private scheduleConfig: ScheduleConfig | null = null;
    private currentMode: PlanMode = 'NONE';
    private stopOnCompletion: boolean = false;

    // ... (setSchedule, addHifz, addMinor, addMajor methods remain same) ...
    // Note: Ensure addHifz/addMinor methods are unchanged, omitted here for brevity

    public setSchedule(config: ScheduleConfig): PlanBuilder {
        this.scheduleConfig = config;
        return this;
    }

    public addHifz(amountLines: number, startLocation: LocationConfig, endLocation?: LocationConfig): PlanBuilder {
        // ... (Logic unchanged)
        if (this.currentMode === 'WERD_ECOSYSTEM') throw new PlanError(
            PlanErrorCode.MODE_MIXING,
            Severity.ERROR,
            'لا يمكن الخلط بين أنظمة HIFZ و WERD في نفس الخطة.'
        );
        this.currentMode = 'HIFZ_ECOSYSTEM';
        this.requests.push({ type: 'HIFZ', params: { amountLines, startLocation, endLocation } });
        return this;
    }

    public addMinorReview(
        lessonCount: number,
        mode: WindowMode = WindowMode.GRADUAL  // ← اختياري، default = سلوك قديم
    ): PlanBuilder {
        if (this.currentMode === 'NONE') this.currentMode = 'HIFZ_ECOSYSTEM';
        this.requests.push({
            type: 'MINOR_REVIEW',
            params: { lessonCount, mode }  // ← mode محفوظ في الـ request
        });
        return this;
    }


    public addMajorReview(amountLines: number, startLocation?: LocationConfig): PlanBuilder {
        // ... (Logic unchanged)
        if (this.currentMode === 'NONE') this.currentMode = 'HIFZ_ECOSYSTEM';
        this.requests.push({ type: 'MAJOR_REVIEW', params: { amountLines, startLocation } });
        return this;
    }

    public stopWhenCompleted(): PlanBuilder {
        this.stopOnCompletion = true;
        return this;
    }

    public build(): TrackManager {
        if (!this.scheduleConfig) {
            throw new PlanError(
                PlanErrorCode.MISSING_SCHEDULE,
                Severity.ERROR,
                'يجب استدعاء setSchedule() قبل build().'
            );
        }

        // 🚀 DI Injection Point
        // The Builder is the "Composition Root" here (or close to it).
        const repository = QuranRepository.getInstance();

        const manager = new TrackManager({
            startDate: this.scheduleConfig.startDate,
            daysPerWeek: this.scheduleConfig.daysPerWeek,
            limitDays: this.scheduleConfig.limitDays || 0,
            endDate: this.scheduleConfig.endDate,
            isReverse: this.scheduleConfig.isReverse || false
        }, repository); // 👈 Passing the dependency

        const context = { isReverse: this.scheduleConfig.isReverse || false };

        const priorityMap: Record<string, number> = {
            'HIFZ': 1,
            'MINOR_REVIEW': 2,
            'MAJOR_REVIEW': 3
        };
        this.requests.sort((a, b) => priorityMap[a.type] - priorityMap[b.type]);

        this.requests.forEach(req => {
            switch (req.type) {
                case 'HIFZ':
                    HifzSystem.createHifzTrack(
                        manager,
                        context,
                        req.params.amountLines,
                        req.params.startLocation,
                        req.params.endLocation
                    );
                    break;
                case 'MINOR_REVIEW':
                    HifzSystem.createMinorReview(
                        manager,
                        req.params.lessonCount,
                        req.params.mode
                    );
                    break;
                case 'MAJOR_REVIEW':
                    HifzSystem.createMajorReview(
                        manager,
                        context,
                        req.params.amountLines,
                        req.params.startLocation
                    );
                    break;
            }
        });

        if (this.currentMode === 'HIFZ_ECOSYSTEM' && this.stopOnCompletion) {
            manager.setStopCondition(HifzSystem.getCompletionCondition());
        }

        return manager;
    }
}