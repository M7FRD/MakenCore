# Core Engine 🔧

**Role:** Simulation and State Management

## The Two Contexts

### BuilderContext (Static Configuration)
```typescript
{ isReverse: boolean }
```
- **Used:** During track creation (one-time)
- **Purpose:** Pass user preferences to subsystems
- **Lifespan:** Dies after `build()` completes

### PlanContext (Dynamic Runtime)
```typescript
{
  currentDate: Date,
  cumulativeArray: Float32Array,
  constraintManager: ConstraintManager,
  allTracks: Map<number, ITrack>,
  ...
}
```
- **Used:** During simulation loop (every day)
- **Purpose:** Provide "current moment" snapshot to strategies
- **Lifespan:** Recreated for each day (ensures no state leakage)

**Why separate?** Build-time needs ≠ Runtime needs.

## TrackManager: The Simulation Loop
```typescript
while (true) {
  // 1. Stop conditions
  if (dayCounter > limitDays) break;
  
  // 2. Create fresh context + empty day
  const context = new PlanContext(...);
  const currentPlanDay: PlanDay = { dayNum, date, is_off: false, events: [] };
  
  // 3. Each track calculates, commits, and emits an event
  for (track of tracks) {
    step = track.calculateNextStep(context);
    
    if (step) {
      track.commitStep(step, currentDate);
      
      // 4. Build PlanEvent and push to day
      currentPlanDay.events.push({ trackId, trackName, eventType, data: { start, end, ... } });
    }
  }
  
  plan.push(currentPlanDay);
  
  // 5. Advance time
  currentDate = addDays(currentDate, 1);
}
```

**Key insight:** الـ `events[]` الديناميكي بدّل الحقول الثابتة (`hifz`, `minor`, `major`) بمصفوفة مرنة — أي عدد من المسارات يُصدَر كـ events دون تعديل بنية `PlanDay`.

**Key insight:** Tracks don't "know" about dates. Context provides temporal awareness.

## QuranRepository: Singleton + Dependency Injection

### لماذا Singleton؟
1. **Memory:** ~150KB dataset يجب أن يُحمَّل مرة واحدة فقط في RAM
2. **Immutability:** بيانات القرآن لا تتغير → آمن للمشاركة بين المكونات
3. **Performance:** لا overhead لإعادة التهيئة

هذا القرار لا يزال صحيحاً ولم يتغير.

### لماذا نُضيف DI رغم ذلك؟

الـ Singleton يحل مشكلة **كيف يُنشأ** المستودع.  
لكن بقي سؤال: **كيف يصل** إلى `TrackManager`؟

**المشكلة قبل DI:**
```typescript
// داخل TrackManager — getInstance() مبعثرة
class TrackManager {
  generatePlan() {
    const repo = QuranRepository.getInstance(); // ← مخفي، غير قابل للاختبار
  }
}
```

**الحل: `PlanBuilder` كـ Composition Root**
```typescript
// PlanBuilder.build()
const repository = QuranRepository.getInstance(); // ← يُحضَر مرة واحدة
const manager = new TrackManager(config, repository); // ← يُحقَن

// TrackManager: يستقبله ولا يطلبه
constructor(
  private config: ManagerConfig,
  private quranRepo: QuranRepository  // ← Constructor Injection
) {}
```

**النتيجة: الأنماط تتكامل لا تتعارض**

| المسألة | الحل |
|---|---|
| كيف يُنشأ `Repository`؟ | **Singleton** — مثيل واحد في التطبيق كله |
| كيف يصل لـ `TrackManager`؟ | **DI** — يُحقَن من `PlanBuilder` |
| لماذا لا `getInstance()` في كل مكان؟ | يكسر التبعيات الضمنية ويعيق الاختبار |

**الفكرة الجوهرية:** الـ Singleton يتحكم في **عدد النسخ**، والـ DI يتحكم في **طريقة الوصول**. الاثنان يحلان مشكلتين مختلفتين.