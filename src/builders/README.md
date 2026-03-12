# Builders Layer 🏗️

**Role:** Configuration and Assembly

## Why Separate from Core?

### builders/ (The Architect's Office)
- **Responsibility:** "What should we build?"
- **Lifespan:** Runs ONCE at initialization
- **Output:** Configured `TrackManager` ready for simulation
- **Concerns:** User input validation, track ordering, dependency resolution

### core/ (The Construction Site)
- **Responsibility:** "How do we execute over time?"
- **Lifespan:** Runs THOUSANDS of times (simulation loop)
- **Output:** `PlanDay[]` array
- **Concerns:** Date progression, constraint enforcement, state management

## The Deferred Execution Pattern
```typescript
// User calls in ANY order:
builder
  .addMajorReview(75)    // ← Depends on Minor
  .addHifz(15)           // ← Foundation
  .addMinorReview(2)     // ← Depends on Hifz

// Builder SORTS internally before execution:
// 1. HIFZ (priority 1)
// 2. MINOR_REVIEW (priority 2)
// 3. MAJOR_REVIEW (priority 3)
```

**Why?** Prevents dependency errors caused by call order.

## HifzSystem: The Subcontractor

**Q:** Why is `HifzSystem` in `builders/` instead of `core/`?

**A:** It's a **factory** (creates tracks), not an **engine** (runs simulation).

- `HifzSystem.createHifzTrack()` → Creates `LinearTrack` with correct config
- `HifzSystem.createMajorReview()` → Creates `LoopingTrack` + adds `WallConstraint`

It's the "subcontractor" that handles low-level wiring, so `PlanBuilder` stays clean.

## Mode Protection
```typescript
builder.addHifz(15);      // ← Locks to HIFZ_ECOSYSTEM
builder.addWerd(5);       // ⛔ ERROR: Can't mix Hifz with Werd
```

Prevents logically incompatible configurations at compile-time.