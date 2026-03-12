import { LocationObj } from './types';
import {
    SURAH_NAMES,
    SURAH_INFO,
    RAW_CUMULATIVE_ARRAY_FORWARD,
    INDEX_MAP_FORWARD,
    REVERSE_INDEX_FORWARD, // 🚀 NEW: Import optimized lookup
    RAW_CUMULATIVE_ARRAY_REVERSE,
    INDEX_MAP_REVERSE,
    REVERSE_INDEX_REVERSE // 🚀 NEW: Import optimized lookup
} from '../data/QuranStaticData';
import { findExponentialStopIndex } from '../utils/Algorithms';
import { PlanError, PlanErrorCode, Severity } from '../errors';

/**
 * Internal data structure for one direction.
 */
interface DirectionData {
    index_map: Record<string, number>;
    cumulative_array: Float32Array;
    // 🚀 NEW: Fast lookup array for O(1) reverse search
    reverse_index: readonly { surah: number, ayah: number, is_end: boolean }[];
}

/**
 * QuranRepository (Singleton)
 * * Central data access layer for all Quran-related queries.
 * * DESIGN PATTERNS:
 * - Singleton: One instance shared across all tracks
 * - Repository: Abstracts data storage from business logic
 * * MEMORY: ~150KB (shared) - Increased slightly for O(1) speed
 */
export class QuranRepository {
    private static instance: QuranRepository;

    private data: {
        forward: DirectionData;
        reverse: DirectionData;
        surah_names: readonly string[];
        surah_info: readonly [string, number][];
    };

    private constructor() {
        // O(1) initialization - just object references
        this.data = {
            surah_names: SURAH_NAMES,
            surah_info: SURAH_INFO,
            forward: {
                index_map: INDEX_MAP_FORWARD,
                cumulative_array: RAW_CUMULATIVE_ARRAY_FORWARD,
                reverse_index: REVERSE_INDEX_FORWARD // 🚀 Connect fast array
            },
            reverse: {
                index_map: INDEX_MAP_REVERSE,
                cumulative_array: RAW_CUMULATIVE_ARRAY_REVERSE,
                reverse_index: REVERSE_INDEX_REVERSE // 🚀 Connect fast array
            }
        };
    }

    public static getInstance(): QuranRepository {
        if (!QuranRepository.instance) {
            QuranRepository.instance = new QuranRepository();
        }
        return QuranRepository.instance;
    }

    /**
     * Gets dataset for specified direction.
     * @complexity O(1)
     */
    public getDirectionData(isReverse: boolean): DirectionData {
        return isReverse ? this.data.reverse : this.data.forward;
    }

    /**
     * Gets Arabic surah name.
     * @param surahNum - Surah number (1-114)
     * @complexity O(1)
     */
    public getSurahName(surahNum: number): string {
        return this.data.surah_names[surahNum - 1] || `سورة ${surahNum}`;
    }

    /**
     * Gets total ayah count for a surah.
     * @complexity O(1)
     */
    public getAyahCount(surahNum: number): number {
        const info = this.data.surah_info[surahNum - 1];
        return info ? info[1] : 0;
    }

    /**
     * Converts location (Surah:Ayah) to cumulative array index.
     * @complexity O(1) - hash table lookup
     */
    public getIndexFromLocation(surah: number, ayah: number, isReverse: boolean): number {
        const map = isReverse ? this.data.reverse.index_map : this.data.forward.index_map;
        const key = `${surah}:${ayah}`;

        // 🚀 FIX: Validate input to prevent silent failures
        if (map[key] === undefined) {
            throw new PlanError(
                PlanErrorCode.INVALID_LOCATION,
                Severity.ERROR,
                `موقع غير صالح: سورة ${surah}، آية ${ayah}`,
                { surah, ayah }
            );
        }

        return map[key];
    }

    /**
     * Reverse lookup: Index → Location.
     * * 🚀 OPTIMIZED: Now uses O(1) direct array access instead of O(n) loop.
     * We determine which array to use by checking the map reference.
     */
    public getLocationFromIndex(index: number, map: Record<string, number>): LocationObj {
        // 🚀 Smart Check: Determine direction based on the map object reference
        let lookupArray;

        if (map === this.data.forward.index_map) {
            lookupArray = this.data.forward.reverse_index;
        } else if (map === this.data.reverse.index_map) {
            lookupArray = this.data.reverse.reverse_index;
        } else {
            // Fallback (should not happen if using PlanContext correctly)
            lookupArray = this.data.forward.reverse_index;
        }

        const loc = lookupArray[index];

        if (!loc) {
            // Fallback for out of bounds (safe guard)
            return { surah: 1, ayah: 1, is_end: false };
        }

        return { surah: loc.surah, ayah: loc.ayah, is_end: loc.is_end };
    }

    /**
     * 🧭 Move Location Forward
     * * Calculates the new location based on lines added.
     * * 🚀 PERFORMANCE: Uses Exponential Search for O(log k) speed.
     * * @param current - Current location (Surah:Ayah)
     * @param linesToAdd - Number of lines accomplished
     * @param isReverse - Direction of memorization (default false)
     */
    public moveLocation(
        current: { surah: number, ayah: number },
        linesToAdd: number,
        isReverse: boolean = false
    ): { surah: number, ayah: number } {

        // 1. Select Data Source based on direction
        const dirData = this.getDirectionData(isReverse);

        // 2. Resolve Current Index (O(1))
        // Where are we exactly in the grand array?
        const currentIdx = this.getIndexFromLocation(current.surah, current.ayah, isReverse);

        // 3. Calculate Target Cumulative Value
        // Get cumulative lines at current position
        const currentCumValue = currentIdx > 0 ? dirData.cumulative_array[currentIdx - 1] : 0;
        const targetCumValue = currentCumValue + linesToAdd;

        // 4. Find New Index (The Search)
        // Full-range search (maxIndex): intentional — the major review can span
        // very large ranges, so capping at +1000 would cause silent failures.
        // findExponentialStopIndex is O(log n), so performance cost is negligible.
        const maxIndex = dirData.cumulative_array.length - 1;

        let newIdx = findExponentialStopIndex(
            dirData.cumulative_array,
            targetCumValue,
            currentIdx,
            maxIndex
        );

        // 🛡️ OVERSHOOT PROTECTION
        // If we hit the end of Quran, stay at the last verse.
        if (newIdx >= maxIndex) {
            newIdx = maxIndex;
        }

        // 5. Convert Index back to Location (O(1))
        const newLoc = this.getLocationFromIndex(newIdx, dirData.index_map);

        return { surah: newLoc.surah, ayah: newLoc.ayah };
    }

    /**
     * 📏 حساب عدد الأسطر (الأوجه) بين موقعين
     *
     * يستخدم Prefix Sum — O(1): عمليتا قراءة + طرح واحد.
     * لا يمكن الحصول على أسرع من هذا نظرياً لاستعلام نطاق على بيانات ثابتة.
     *
     * @param from      - موقع البداية (سورة:آية)
     * @param to        - موقع النهاية (سورة:آية) — شاملة
     * @param direction - اتجاه الحفظ:
     *                    false  = الفاتحة → الناس (اتجاه تقليدي)
     *                    true   = الناس → الفاتحة (اتجاه عكسي)
     *                    'auto' = تلقائي: يُحدَّد من الترتيب النسبي للموقعين (الافتراضي)
     * @returns عدد الأسطر (أوجه) بين الموقعين، مقرّبة لخانتين عشريتين
     * @throws PlanError(INVALID_LOCATION) إذا كان أي موقع غير صالح
     * @complexity O(1)
     */
    public getLinesBetween(
        from: { surah: number, ayah: number },
        to: { surah: number, ayah: number },
        direction: boolean | 'auto' = 'auto'
    ): number {
        // Resolve direction
        let isReverse: boolean;

        if (direction === 'auto') {
            // Peek at the forward index map (no throws — direct lookup).
            // If from-index > to-index in the forward array,
            // we're traversing Nas→Fatiha, so use the reverse dataset.
            const fwdMap = this.data.forward.index_map;
            const idxFrom = fwdMap[`${from.surah}:${from.ayah}`] ?? -1;
            const idxTo = fwdMap[`${to.surah}:${to.ayah}`] ?? -1;
            isReverse = idxFrom > idxTo;
        } else {
            isReverse = direction;
        }

        const dirData = this.getDirectionData(isReverse);

        // O(1) — index lookup + validation (throws PlanError if invalid)
        const startIdx = this.getIndexFromLocation(from.surah, from.ayah, isReverse);
        const endIdx = this.getIndexFromLocation(to.surah, to.ayah, isReverse);

        // O(1) — prefix-sum range query
        const startCum = startIdx > 0 ? dirData.cumulative_array[startIdx - 1] : 0;
        const endCum = dirData.cumulative_array[endIdx];

        return parseFloat(Math.abs(endCum - startCum).toFixed(2));
    }
}