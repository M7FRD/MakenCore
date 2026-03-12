/**
 * High-performance search algorithms for cumulative arrays.
 */

export type NumberArray = ArrayLike<number>;

/**
 * Exponential Search (Galloping Search).
 * 
 * WHY THIS ALGORITHM?
 * - Optimal for "sequential access patterns" (Quran progression is mostly sequential)
 * - Outperforms Binary Search when target is near start
 * - O(log n) worst case, often O(log k) where k = distance to target
 * 
 * USE CASE: Finding "which ayah contains the Nth line" in sorted cumulative array.
 * 
 * @complexity O(log n) worst case
 */
export function findExponentialStopIndex(
    arr: NumberArray, 
    target: number, 
    startIdx: number, 
    endIdx: number
): number {
    // Quick check: target already at start
    if (arr[startIdx] >= target) return startIdx;

    // Phase 1: Exponential jump (galloping)
    let bound = 1;
    while (startIdx + bound < endIdx && arr[startIdx + bound] < target) {
        bound *= 2;
    }

    // Phase 2: Binary search within bounded range
    const left = startIdx + (bound >>> 1);
    const right = Math.min(startIdx + bound, endIdx);

    return findBinaryStopIndex(arr, target, left, right);
}

/**
 * Standard Binary Search (helper for Exponential Search).
 * @complexity O(log n)
 */
export function findBinaryStopIndex(
    arr: NumberArray, 
    target: number, 
    startIdx: number, 
    endIdx: number
): number {
    let low = startIdx;
    let high = endIdx;

    while (low < high) {
        const mid = (low + high) >>> 1; // Bitwise operator (faster than Math.floor)
        if (arr[mid] < target) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return low;
}