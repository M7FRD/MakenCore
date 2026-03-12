# Tracks Layer 📊

**Role:** State containers that delegate behavior to Strategies

## Track vs Strategy: The Relationship
```
┌──────────────┐
│   Track      │  ← "Who am I? Where am I?"
│              │
│ - id: 1      │
│ - state: {}  │
└──────┬───────┘
       │ delegates to
       ▼
┌──────────────┐
│  Strategy    │  ← "How should I move?"
│              │
│ - calculate()│
└──────────────┘
```

**Track:** Identity and State
- Knows its ID (1, 2, 3)
- Knows its current position (`currentIdx`)
- Knows its history (what was covered)

**Strategy:** Behavior
- Knows how to calculate next step
- Knows how to handle barriers
- Doesn't care about identity

## Why This Separation?

### Bad Design (Coupled):
```typescript
class HifzTrack {
  calculateNextStep() {
    // Linear movement logic hardcoded here
  }
}

class MajorReviewTrack {
  calculateNextStep() {
    // Looping logic hardcoded here
  }
}
```
**Problem:** Can't reuse logic. Want a "looping Hifz track"? Rewrite everything.

### Good Design (Strategy Pattern):
```typescript
class LinearTrack extends BaseTrack {
  constructor(...) {
    super(..., new LinearStrategy(), ...);
  }
}

class LoopingTrack extends BaseTrack {
  constructor(...) {
    super(..., new LoopingStrategy(), ...);
  }
}
```
**Benefit:** Want a looping Hifz? Just swap the strategy. No code duplication.

## The Two-Phase Commit

### Phase 1: Calculate (Read-Only)
```typescript
step = track.calculateNextStep(context);
// ✅ Track state unchanged
// ✅ Can validate before committing
// ✅ Can rollback if day is invalid
```

### Phase 2: Commit (Write)
```typescript
track.commitStep(step, currentDate);
// ✅ Update currentIdx
// ✅ Append to history (بتاريخ المحاكاة، لا ساعة النظام)
// ✅ Handle reset/completed flags
```

**Why pass `currentDate`?** الـ `commitStep` يسجّل التاريخ في الـ history. لو استخدمنا `new Date()` داخله، سيُسجَّل تاريخ تشغيل البرنامج لا تاريخ المحاكاة — خطأ صامت في الخطط المستقبلية.

**Why two phases?** Allows validation and rollback. Example:
```typescript
for (track of tracks) {
  step = track.calculateNextStep(context);
  
  // Validate: Check if day should be skipped
  if (isHoliday(context.date)) {
    continue; // ← Rollback: Don't commit
  }
  
  track.commitStep(step, currentDate); // ← Commit only if valid
}
```

## Track IDs: Enum + Dynamic Events

### Current Design:
```typescript
export enum TrackId {
    HIFZ = 1,
    MINOR_REVIEW = 2,
    MAJOR_REVIEW = 3
}
```

كل يوم يحمل `events[]` ديناميكي بدلاً من حقول ثابتة:
```typescript
// PlanDay
events: PlanEvent[]  // ← كل track يُضيف event بـ trackId خاص به

// المصدر (TrackManager):
const event: PlanEvent = {
    trackId: track.id,       // ← TrackId.HIFZ / MINOR_REVIEW / MAJOR_REVIEW
    trackName: track.name,
    eventType: eType,
    data: { start, end, lines, is_reset }
};
```

### الوصول في PlanExporter:
```typescript
// بدلاً من planDay.hifz / planDay.minor / planDay.major (حقول ثابتة قديمة):
const hifzEvt  = day.events.find(e => e.trackId === TrackId.HIFZ);
const minorEvt = day.events.find(e => e.trackId === TrackId.MINOR_REVIEW);
const majorEvt = day.events.find(e => e.trackId === TrackId.MAJOR_REVIEW);
```

**Trade-off:** المرونة مقابل البساطة — البنية الديناميكية تقبل tracks جديدة مستقبلاً دون تعديل `PlanDay`.