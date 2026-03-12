# Constraint System 🚧

**Role:** Prevent track collisions

## The Wall Metaphor

Imagine tracks as cars on a highway:
- **Hifz (new memorization):** Slow car in right lane
- **Minor Review:** Following close behind
- **Major Review:** Fast car trying to overtake

**Problem:** Major Review can't "review" what hasn't been memorized yet!

**Solution:** Create a "wall" (barrier) that Major Review can't pass.

## WallConstraint Anatomy
```typescript
new WallConstraint(
  sourceTrackId: 3,       // Major Review (who is constrained)
  targetTrackId: 2,       // Minor Review (the wall)
  useHistory: true,       // Use history.startIdx, not currentIdx
  buffer: 1,              // Stop 1 ayah BEFORE the wall
  fallbackTargetId: 1     // Fallback to Hifz during bootstrapping
)
```

### useHistory: true vs false

**useHistory = false** (use `currentIdx`):
```
Hifz is at index 100 today
Wall = 100
Major Review stops at 99
```
Simple, but wrong! Because Hifz's `currentIdx` is the END of today's lesson.

**useHistory = true** (use `history.startIdx`):
```
Hifz learned indices 95-100 today
Wall = 95 (START of today's lesson)
Major Review stops at 94
```
Correct! Major Review can't touch ANY part of today's new material.

### buffer = 1: The Safety Margin

**Without buffer:**
```
Day 5: Hifz at index 50, Major at 50 ← Collision!
```

**With buffer = 1:**
```
Day 5: Hifz at index 50, Major at 49 ← Safe spacing
```

**Why 1?** One ayah is enough to prevent ambiguity in UI ("Am I reviewing or memorizing?")

### fallbackTargetId: حل مشكلة الـ Bootstrapping

**المشكلة:** في الأيام الأولى، Minor Review ليس لها تاريخ بعد.
بدون fallback، الـ `limitIdx` يسقط إلى `0` — وهذا يجبر Major Review على القفز للخلف بشكل غير منطقي.

```
Day 1:
  Minor Review → history.length = 0 → limitIdx = 0
  Major Review at index 500 → wall = 0 → ❌ قفز للخلف!
```

**الحل:** عند غياب تاريخ الـ target الأساسي، نستخدم الـ `fallbackTargetId` (عادةً Hifz) كحاجز بديل مؤقت.

```
Day 1:
  Minor Review → no history → fallback to Hifz
  Hifz is at index 10 → wall = 10
  Major Review stops at 9 ← ✅ منطقي
```

بمجرد أن تبدأ Minor Review بتسجيل تاريخ، يعود الحاجز الأساسي للعمل تلقائياً.

## Priority Chain
```
Major Review
    ↓ (must stop before)
Minor Review
    ↓ (must stop before)
New Hifz
```

If Minor doesn't exist, Major stops before Hifz directly (no `fallbackTargetId` needed).

## getBarrierIndex(): Finding the Limit
```typescript
getBarrierIndex(track: ITrack): number | null {
  // Check ALL constraints
  // Return the MOST RESTRICTIVE (minimum) index
  
  // Example:
  // Constraint 1: Wall at index 200
  // Constraint 2: Wall at index 150
  // Returns: 150 (most restrictive)
}
```

This allows **multiple constraints** to coexist (future-proof).