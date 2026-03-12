# Utility Functions 🛠️

## Algorithms.ts

### Why Float32Array?

**Memory Comparison:**
```
Number[] (64-bit):  6236 × 8 bytes = 49,888 bytes (~50KB)
Float32Array:       6236 × 4 bytes = 24,944 bytes (~25KB)
```

**50% memory savings** with negligible precision loss for line counts.

**Cache Performance:** Contiguous memory = fewer cache misses.

### Exponential Search Implementation

See [`strategies/README.md`](../strategies/README.md#why-exponential-search) for algorithm explanation.

## DateUtils.ts

### isWorkingDay Logic
```typescript
// Quran week starts on Sunday (index 0)
daysPerWeek: 5 → Working days: Sun, Mon, Tue, Wed, Thu
daysPerWeek: 6 → Working days: Sun-Fri
daysPerWeek: 7 → All days
```

**Why Sunday-based?** Matches Arabic work week convention.