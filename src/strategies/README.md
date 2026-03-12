# Movement Strategies 🎯

**Role:** Define HOW tracks progress through the Quran

## The Strategy Pattern
```
Track (State)  →  Strategy (Behavior)
     ↓                    ↓
"I'm at index 50"   "Move forward 15 lines"
```

**Benefits:**
- Change movement logic WITHOUT rewriting track infrastructure
- Add new strategies (e.g., SpacedRepetition) without touching core
- Test strategies independently

## Why Exponential Search?

### The Quran Access Pattern
```
Day 1:  Index 0   → 10   (small jump)
Day 2:  Index 10  → 20   (small jump)
Day 3:  Index 20  → 30   (small jump)
...
Day 30: Index 300 → 2000 (big jump - user skips sections)
```

**Characteristics:** Mostly sequential, occasional large jumps.

### Algorithm Comparison

| Algorithm | Best Case | Worst Case | Quran Use Case |
|-----------|-----------|------------|----------------|
| Linear Search | O(1) | O(n) | Too slow for 6236 ayahs |
| Binary Search | O(log n) | O(log n) | Good, but... |
| **Exponential Search** | **O(1)** | **O(log n)** | **✅ Optimal** |

**Why Exponential wins:**
- **Small steps:** Finds target in 1-3 comparisons (better than Binary's 12)
- **Large jumps:** Falls back to Binary Search performance
- **Sequential bias:** Exploits locality (target is usually "nearby")

### How It Works
```typescript
// Phase 1: Galloping (exponential jumps)
bound = 1;
while (array[currentIdx + bound] < target) {
  bound *= 2;  // Jump: 1, 2, 4, 8, 16, 32...
}

// Phase 2: Binary Search in narrow range
return binarySearch(currentIdx + bound/2, currentIdx + bound);
```

## Strategy Implementations

### LinearStrategy (New Hifz)
- Move forward by fixed amount
- Stop at optional `endIdx` (user-defined boundary) or end of Quran
- No wraparound — emits `'completed'` flag when reaching the ceiling

### LoopingStrategy (Major Review)
- Move forward by fixed amount
- **Respect walls** (constraints from other tracks)
- Reset to 0 when hitting barrier — emits `'reset'` flag
- Returns `null` (silence) if no movement is possible

### WindowStrategy (Minor Review)
- Doesn't move forward — shows a sliding window over past lessons
- The window **never includes today's lesson** (invariant in both modes)
- Behavior is controlled by `WindowMode`:

#### `WindowMode.GRADUAL` — للطالب الذي يبدأ من الصفر
```
Day 1 → no review   (no history yet)
Day 2 → 1 lesson    (yesterday only)
Day N → min(N-1, count) lessons
```
Source is **plan history only**. Window grows naturally until it reaches `count`.

#### `WindowMode.FIXED` — للطالب الذي لديه حفظ سابق
Always targets exactly `count` completed lessons from day one.

**Case A — enough in-plan past lessons (`pastLessons.length >= count`):**
```
Window = last N lessons from history
→ exact lesson boundaries, zero approximation
```

**Case B — not enough in-plan lessons yet (filling from pre-plan material):**
```
endIdx   = last past lesson's endIdx
           OR (Day 1): planStartIdx - 1
startIdx = estimated backward via lesson-size approximation
           using the first plan lesson as anchor
```
If no pre-plan material exists (plan started at direction beginning) → degrades gracefully to `GRADUAL`.