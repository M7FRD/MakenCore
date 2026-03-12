# مكين — Quran Planning Engine

محرك تخطيط قرآني متكامل، يُولّد خططاً يومية للحفظ والمراجعة، ويتابع تقدم الطلاب جلسةً بجلسة.

---

## جدول المحتويات

1. [نظرة عامة](#1-نظرة-عامة)
2. [بنية المشروع](#2-بنية-المشروع)
3. [البدء السريع](#3-البدء-السريع)
4. [نظام التخطيط — Planning Engine](#4-نظام-التخطيط--planning-engine)
   - [PlanBuilder — نقطة الدخول](#planbuilder--نقطة-الدخول)
   - [المسارات — Tracks](#المسارات--tracks)
   - [الاستراتيجيات — Strategies](#الاستراتيجيات--strategies)
   - [القيود — Constraints](#القيود--constraints)
   - [TrackManager — محرك المحاكاة](#trackmanager--محرك-المحاكاة)
5. [QuranRepository — طبقة البيانات](#5-quranrepository--طبقة-البيانات)
6. [نظام الأخطاء — Error System](#6-نظام-الأخطاء--error-system)
7. [سيناريوهات الاستخدام](#7-سيناريوهات-الاستخدام)
8. [التصدير](#8-التصدير)
9. [الاختبارات](#9-الاختبارات)
10. [القرارات الهندسية](#10-القرارات-الهندسية)

---

## 1. نظرة عامة

**مكّن** مكتبة TypeScript تُوفّر:

| الوظيفة | الوصف |
|---|---|
| **توليد الخطة** | محاكاة يومية لمسارات الحفظ والمراجعة الصغرى والكبرى |
| **استعلامات القرآن** | تحويل السورة:الآية إلى index والعكس، حساب الأسطر بين موقعين |
| **تصدير الخطة** | طباعة في الكونسول + تصدير Excel |

**الاتجاهان مدعومان:**
- `isReverse: false` — من الفاتحة إلى الناس (الحفظ التقليدي)
- `isReverse: true` — من الناس إلى الفاتحة

---

## 2. بنية المشروع

```
src/
├── main.ts                        # نقطة الدخول
│
├── builders/
│   ├── PlanBuilder.ts             # Fluent API لإنشاء الخطة
│   ├── HifzSystem.ts              # Subsystem: إنشاء وتوصيل مسارات الحفظ
│   └── PlanTypes.ts               # Type contracts (ScheduleConfig, LocationConfig…)
│
├── core/
│   ├── TrackManager.ts            # محرك المحاكاة اليومية
│   ├── QuranRepository.ts         # Singleton: كل استعلامات بيانات القرآن
│   ├── PlanContext.ts             # سياق كل يوم محاكاة (يُمرَّر للاستراتيجيات)
│   ├── constants.ts               # Enums: TrackId, WindowMode
│   └── types.ts                   # PlanDay, PlanEvent
│
├── tracks/
│   ├── BaseTrack.ts               # Abstract: state machine + commitStep
│   ├── LinearTrack.ts             # مسار خطي (حفظ جديد وغيره)
│   ├── WindowTrack.ts             # مسار نافذة متحركة (مراجعة صغرى)
│   └── LoopingTrack.ts            # مسار دوري (مراجعة كبرى)
│
├── strategies/
│   ├── IMovementStrategy.ts       # Interface
│   ├── LinearStrategy.ts          # تقدم خطي بمقدار ثابت
│   ├── WindowStrategy.ts          # نافذة تتبع مسار آخر
│   └── LoopingStrategy.ts         # دوران مع وعي بحاجز (Wall)
│
├── constraints/
│   ├── ConstraintManager.ts       # يجمع ويطبق القيود
│   └── WallConstraint.ts          # يمنع مسار من تجاوز مسار آخر
│
├── errors/
│   ├── PlanError.ts               # Custom Error class
│   ├── PlanErrorCode.ts           # Enum: رموز الأخطاء
│   ├── Severity.ts                # Enum: ERROR / WARNING / INFO
│   └── index.ts                   # Barrel export
│
├── utils/
│   ├── Algorithms.ts              # findExponentialStopIndex (Prefix Sum search)
│   ├── DateUtils.ts               # أيام العمل، إضافة أيام
│   └── PlanExporter.ts            # طباعة + تصدير Excel
│
└── tests/
    └── planErrors.test.ts         # 12 اختبار: أخطاء + سلوك الإصلاحات
```

---

## 3. البدء السريع

```bash
npm install
npx ts-node src/main.ts
```

### مثال كامل

```typescript
import { PlanBuilder } from './builders/PlanBuilder';
import { WindowMode } from './core/constants';

const manager = new PlanBuilder()
    .setSchedule({
        startDate: '2026-02-01',
        daysPerWeek: 5,       // الأحد - الخميس
        limitDays: 30,        // 0 = استمر حتى التوقف التلقائي
        isReverse: false      // الفاتحة → الناس
    })
    .addHifz(
        7.5,                          // 15 سطراً يومياً (7.5 وجه)
        { surah: 1, ayah: 1 },        // البداية: الفاتحة
        { surah: 2, ayah: 286 }       // اختياري: النهاية عند البقرة
    )
    .addMinorReview(3, WindowMode.GRADUAL)   // مراجعة آخر 3 دروس
    .addMajorReview(
        15 * 20,                             // 20 درساً يومياً
        { surah: 1, ayah: 1 }               // اختياري: نقطة البداية
    )
    .stopWhenCompleted()                     // توقف عند انتهاء الحفظ
    .build();

const plan = manager.generatePlan();
```

---

## 4. نظام التخطيط — Planning Engine

### PlanBuilder — نقطة الدخول

`PlanBuilder` يُوفّر Fluent API آمن النوع لبناء الخطة. يعمل على مبدأ **Deferred Execution**:
يحتفظ بطلبات `TrackRequest` ويُنفّذها بترتيب صحيح عند `.build()`.

```
PlanBuilder
    .setSchedule()     ← إلزامي
    .addHifz()         ← إلزامي في HIFZ_ECOSYSTEM
    .addMinorReview()  ← اختياري
    .addMajorReview()  ← اختياري
    .stopWhenCompleted() ← اختياري
    .build()           → TrackManager
```

**حماية MODE_MIXING:** لا يمكن مزج `addHifz()` مع مسارات من نمط آخر (مستقبلاً: WERD_ECOSYSTEM).
يُرمى `PlanError(MODE_MIXING)` في حال المحاولة.

#### الجدول الزمني (`ScheduleConfig`)

| الخاصية | النوع | الوصف |
|---|---|---|
| `startDate` | `string` | تاريخ البداية (ISO) |
| `daysPerWeek` | `number` | عدد أيام الدراسة في الأسبوع (1-7) |
| `limitDays` | `number?` | حد أقصى للأيام (`0` = لا حد) |
| `endDate` | `string?` | تاريخ انتهاء ثابت |
| `isReverse` | `boolean?` | اتجاه الحفظ |

---

### المسارات — Tracks

كل مسار يرث من `BaseTrack` ويُطبّق نمط **State Machine**:

| المسار | الاستراتيجية | الاستخدام |
|---|---|---|
| `LinearTrack` | `LinearStrategy` | أي تقدم خطي بمقدار ثابت (الحفظ الجديد وسواه) |
| `WindowTrack` | `WindowStrategy` | مراجعة نافذة متحركة تتبع مسار آخر |
| `LoopingTrack` | `LoopingStrategy` | مراجعة دورية مع وعي بالحاجز |

> **ملاحظة تصميمية:** أسماء المسارات وصفية للسلوك — **وليست حكراً على استخدامها الحالي**.
> - `LinearTrack` ← أي تقدم خطي ثابت، ليس الحفظ حصراً
> - `WindowTrack` ← أي مسار يتبع نافذة من تاريخ مسار آخر
> - `LoopingTrack` ← أي مسار دوري يحترم حاجزاً
>
> المشروع مصمم ليقبل مسارات جديدة بأفكار مختلفة — يكفي تطبيق `IMovementStrategy` وتمديد `BaseTrack`.

**دورة حياة المسار:**
```
calculateNextStep(context) → StepResult | null
        ↓
commitStep(step, date)     → يُحدّث state + history
```

**`StepResult` flags:**
- `'completed'` — المسار وصل نهايته، `currentIdx` يبقى عند `endIdx` (لا يتجاوز الحدود)
- `'reset'` — المسار الدوري عاد للبداية بعد الوصول للحاجز أو النهاية

---

### الاستراتيجيات — Strategies

كل استراتيجية تُطبّق `IMovementStrategy` وتُجيب على سؤال واحد:
**"ما هي الخطوة التالية لهذا المسار في هذا اليوم؟"**

#### LinearStrategy

- **السلوك:** يتقدم بمقدار ثابت (`amount`) كل يوم
- **الحد الاختياري (`endIdx`):** إذا وصل الـ `endIdx`، يُعلم `completed`
- **البحث:** `findExponentialStopIndex` — O(log k) على Prefix Sum Array
- **مُستخدم في:** `LinearTrack` → حفظ جديد بحد نهاية اختياري

#### WindowStrategy

- **السلوك:** نافذة تتبع مسار آخر (عادةً HIFZ)، تُظهر آخر N درس
- **وضعان:**

| الوضع | `WindowMode.GRADUAL` | `WindowMode.FIXED` |
|---|---|---|
| **المقصد** | طالب يبدأ من الصفر | طالب لديه محفوظات سابقة |
| **اليوم 1** | لا مراجعة (لا تاريخ) | N درس كامل من اليوم الأول |
| **الحساب** | يقرأ التاريخ ويبني النافذة تدريجياً | يحسب للخلف من موقع الحفظ الحالي |

#### LoopingStrategy

- **السلوك:** يتقدم بمقدار ثابت ويعود للبداية عند الوصول إلى الحاجز أو نهاية القرآن
- **الحاجز (Wall):** موقع مسار آخر (الصغرى أو الحفظ) — لا يتجاوزه
- **الصمت:** إذا كان لا حراك ممكن، يُرجع `null` (المسار ينتظر)
- **مُستخدم في:** `LoopingTrack` → مراجعة كبرى

---

### القيود — Constraints

#### WallConstraint

يمنع مسار (tracking) من تجاوز مسار آخر (target).

```typescript
new WallConstraint(
    trackingId,          // المسار الذي سيتأثر بالقيد
    targetId,            // المسار الذي يُشكّل الحاجز
    useHistory,          // true = استخدم التاريخ، false = استخدم currentIdx مباشرة
    safetyMarginDays,    // هامش أمان (عدد الدروس)
    fallbackTargetId?    // بديل في مرحلة الـ Bootstrap (قبل أن يكون للهدف تاريخ)
)
```

**الاستخدام الافتراضي (HifzSystem):**
- الكبرى لا تتجاوز الصغرى (أو الحفظ إذا لم توجد الصغرى)

---

### TrackManager — محرك المحاكاة

يُشغّل الخطة يوماً بيوم:

```
generatePlan()
    ↓
لكل يوم عمل:
    ↓
    [sort tracks by id: HIFZ(1) → MINOR(2) → MAJOR(3)]
    ↓
    لكل مسار:
        calculateNextStep(dayContext) → StepResult?
        commitStep(step, date)
        → إنشاء PlanEvent
    ↓
    فحص StopCondition
    ↓
    تقدم التاريخ (تخطي الإجازات)
```

**الترتيب مفروض بالـ `id`:** ضمان أن WindowStrategy تقرأ تاريخ الحفظ قبل أن تحتاج إليه.

**شروط التوقف:**
- `limitDays` وصل حده
- `endDate` تجاوز
- `stopWhenCompleted()` + اكتمال مسار الحفظ
- حارس داخلي: 5000 يوم كحد أقصى مطلق

---

## 5. QuranRepository — طبقة البيانات

**Singleton** — مثيل واحد مشترك بين كل المكونات (~150KB في الذاكرة).

```typescript
const repo = QuranRepository.getInstance();
```

### الدوال

| الدالة | التعقيد | الوصف |
|---|---|---|
| `getIndexFromLocation(surah, ayah, isReverse)` | O(1) | سورة:آية → index في المصفوفة التراكمية |
| `getLocationFromIndex(index, indexMap)` | O(1) | index → سورة:آية |
| `moveLocation(current, linesToAdd, isReverse)` | O(log k) | تحريك موقع بعدد أسطر |
| `getLinesBetween(from, to, isReverse)` | O(1) | عدد الأسطر بين موقعين |
| `getSurahName(surahNum)` | O(1) | اسم السورة |
| `getAyahCount(surahNum)` | O(1) | عدد الآيات في السورة |

### `getLinesBetween` — Prefix Sum Range Query

```typescript
const lines = repo.getLinesBetween(
    { surah: 2, ayah: 1 },    // من
    { surah: 2, ayah: 286 },  // إلى (شامل)
    false                      // isReverse
);
// → 712.5 سطر

// مثال عكسي:
const rev = repo.getLinesBetween(
    { surah: 114, ayah: 1 },
    { surah: 1, ayah: 7 },
    true   // ← يستخدم مصفوفة الاتجاه العكسي
);
```

> **الخوارزمية:** `lines = cumArray[endIdx] - cumArray[startIdx - 1]`
> — عمليتا قراءة + طرح واحد. O(1) لا يُحسَّن أكثر.
> `|abs|` يضمن صحة النتيجة بصرف النظر عن ترتيب المدخلين.

---

## 7. نظام الأخطاء — Error System

جميع الأخطاء `instanceof Error` وتحمل بنية موحدة:

```typescript
class PlanError extends Error {
    code:     PlanErrorCode;   // رمز مُعرَّف
    severity: Severity;        // ERROR | WARNING | INFO
    message:  string;          // رسالة بشرية
    context:  object;          // بيانات إضافية للتشخيص
}
```

### رموز الأخطاء

| الرمز | النوع | المصدر | السلوك |
|---|---|---|---|
| `INVALID_LOCATION` | ERROR | `QuranRepository` | throw |
| `MODE_MIXING` | ERROR | `PlanBuilder` | throw |
| `MISSING_SCHEDULE` | ERROR | `PlanBuilder` | throw |
| `START_AFTER_END` | ERROR | `HifzSystem` | throw |
| `MAJOR_REVIEW_AHEAD` | ERROR | `HifzSystem` | throw |

### `PlanError.warn()` — للإشعارات غير المميتة

```typescript
// لا يُرمى — يُطبع فقط
PlanError.warn(
    PlanErrorCode.INVALID_LOCATION,
    'موقع غير صالح.',
    { surah: 0, ayah: 0 }
);
```

### التعامل مع الأخطاء في الكود الاستهلاكي

```typescript
try {
    const manager = new PlanBuilder()...build();
} catch (err) {
    if (err instanceof PlanError) {
        console.log(err.code);     // 'MISSING_SCHEDULE'
        console.log(err.severity); // 'ERROR'
        console.log(err.context);  // {}
    }
}
```

---

## 8. سيناريوهات الاستخدام

### سيناريو 1: حفظ جديد فقط

```typescript
new PlanBuilder()
    .setSchedule({ startDate: '2026-01-01', daysPerWeek: 5, isReverse: false })
    .addHifz(7.5, { surah: 1, ayah: 1 })
    .stopWhenCompleted()
    .build();
```

### سيناريو 2: حفظ + مراجعتان (الوضع الافتراضي الكامل)

```typescript
new PlanBuilder()
    .setSchedule({ startDate: '2026-01-01', daysPerWeek: 5, limitDays: 0, isReverse: true })
    .addHifz(10, { surah: 114, ayah: 1 })             // من الناس
    .addMinorReview(5, WindowMode.GRADUAL)             // آخر 5 دروس
    .addMajorReview(300, { surah: 67, ayah: 1 })      // من الملك
    .stopWhenCompleted()
    .build();
```

### سيناريو 3: حفظ بين نقطتين محددتين

```typescript
.addHifz(
    7.5,
    { surah: 2, ayah: 1 },    // البداية
    { surah: 2, ayah: 286 }   // النهاية: داخل البقرة فقط
)
```

### سيناريو 4: طالب لديه حفظ سابق (FIXED window)

```typescript
.addMinorReview(5, WindowMode.FIXED)  // 5 دروس من اليوم الأول
```

### سيناريو 5: مراجعة كبرى بدون حفظ نشط

> مدعوم — يمكن إضافة `addMajorReview` وحدها. ستعمل بدون Hifz track.
> في هذه الحالة لن يوجد `WallConstraint` مرتبط بالحفظ.

### سيناريو 6: حساب الأسطر بين موقعين

```typescript
const repo = QuranRepository.getInstance();

// كم سطراً في جزء عم؟
const lines = repo.getLinesBetween(
    { surah: 78, ayah: 1 },   // النبأ
    { surah: 114, ayah: 6 },  // الناس
    false
);
```

---

## 8. التصدير

```typescript
const exporter = new PlanExporter();

// طباعة في الكونسول
exporter.printToConsole(plan);

// تصدير Excel
await exporter.exportToExcel(plan, 'QuranPlan_2026.xlsx');
```

---

## 9. الاختبارات

```bash
npx ts-node src/tests/planErrors.test.ts
```

**12 اختبار — 5 suites:**

| Suite | ما يختبره |
|---|---|
| 1 | PlanError: instanceof، الحقول، warn() |
| 2 | أخطاء Builder: MISSING_SCHEDULE، MODE_MIXING، START_AFTER_END، MAJOR_REVIEW_AHEAD |
| 3 | أخطاء البيانات: INVALID_LOCATION (3 حالات + context) |
| 4 | Fix 1 — currentIdx ≤ globalMax بعد اكتمال الحفظ |
| 5 | Fix 3 — WindowStrategy تقرأ تاريخ Hifz بشكل صحيح |

---

## 10. القرارات الهندسية

### Prefix Sum Array — قاعدة البيانات

بدلاً من حساب الأسطر في كل استعلام، البيانات محضّرة مسبقاً كـ `Float32Array` تراكمية.
كل استعلام نطاق (بين موقعين) = عمليتا قراءة + طرح → **O(1) مضمون**.

### Singleton للـ Repository

`QuranRepository` مثيل واحد مشترك (~150KB). يُمرَّر بـ Dependency Injection للمكونات التي تحتاجه — لا `getInstance()` مبعثرة في كل مكان.

### DI في TrackManager

```typescript
new TrackManager(config, QuranRepository.getInstance())
```
يُسهّل الاختبار (mock repository) ويكسر التبعيات الدائرية.

### ترتيب التنفيذ مفروض بالـ id

```typescript
[...tracks.values()].sort((a, b) => a.id - b.id)
// HIFZ(1) → MINOR_REVIEW(2) → MAJOR_REVIEW(3)
```
الـ WindowStrategy تعتمد على تاريخ الحفظ — الترتيب ضرورة منطقية، لا افتراض ضمني.

### Deferred Execution في PlanBuilder

`PlanBuilder` لا يُنشئ المسارات فوراً — يحتفظ بقائمة `TrackRequest` ويُرتّبها بـ `priorityMap` عند `.build()`. يضمن بناء صحيح بصرف النظر عن ترتيب استدعاءات `.addHifz()` / `.addMinorReview()`.

### currentIdx لا يتجاوز حدود المصفوفة

عند اكتمال مسار (`'completed'` flag): `currentIdx = endIdx` (آخر index صالح).
`WallConstraint` يقرأ `currentIdx` مباشرة — قيمة `endIdx + 1` ستُعطي `undefined` على `Float32Array`.
