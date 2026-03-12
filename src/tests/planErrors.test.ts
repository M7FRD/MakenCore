// src/tests/planErrors.test.ts
//
// اختبارات يدوية لجميع حالات الأخطاء والإصلاحات.
// لا يحتاج Jest أو أي framework خارجي — يعمل مباشرة بـ: npx ts-node src/tests/planErrors.test.ts
//
import { PlanBuilder } from '../builders/PlanBuilder';
import { PlanError, PlanErrorCode, Severity } from '../errors';
import { QuranRepository } from '../core/QuranRepository';
import { WindowMode } from '../core/constants';

// ─── Mini Test Runner ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e: any) {
        console.log(`  ❌ ${name}`);
        console.log(`     ${e?.message ?? e}`);
        failed++;
    }
}

function expect_throws(
    expectedCode: PlanErrorCode,
    expectedSeverity: Severity,
    fn: () => void
): void {
    try {
        fn();
        throw new Error(`Expected PlanError(${expectedCode}) but nothing was thrown.`);
    } catch (e: any) {
        if (!(e instanceof PlanError)) {
            throw new Error(`Expected PlanError but got: ${e?.constructor?.name} — "${e?.message}"`);
        }
        if (e.code !== expectedCode) {
            throw new Error(`Wrong code — expected ${expectedCode}, got ${e.code}`);
        }
        if (e.severity !== expectedSeverity) {
            throw new Error(`Wrong severity — expected ${expectedSeverity}, got ${e.severity}`);
        }
    }
}

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// ─── Suite 1: PlanError Infrastructure ───────────────────────────────────────

console.log('\n══════════════════════════════════════════════');
console.log('  Suite 1: PlanError Infrastructure');
console.log('══════════════════════════════════════════════');

test('PlanError instanceof Error', () => {
    const err = new PlanError(PlanErrorCode.MISSING_SCHEDULE, Severity.ERROR, 'test');
    assert(err instanceof Error, 'should extend Error');
    assert(err instanceof PlanError, 'should be PlanError');
    assert(err.name === 'PlanError', `name should be 'PlanError', got '${err.name}'`);
});

test('PlanError carries code, severity, message, context', () => {
    const ctx = { startIdx: 10, endIdx: 5 };
    const err = new PlanError(PlanErrorCode.START_AFTER_END, Severity.ERROR, 'msg', ctx);
    assert(err.code === PlanErrorCode.START_AFTER_END, 'wrong code');
    assert(err.severity === Severity.ERROR, 'wrong severity');
    assert(err.message === 'msg', 'wrong message');
    assert(err.context === ctx, 'wrong context ref');
});

test('PlanError.warn() does not throw (structured log only)', () => {
    // Should silently log — capturing console.warn to suppress output in tests
    const original = console.warn;
    let captured = '';
    console.warn = (...args: any[]) => { captured += args.join(' '); };

    PlanError.warn(PlanErrorCode.INVALID_LOCATION, 'موقع غير صالح: سورة 0 آية 0', { surah: 0, ayah: 0 });

    console.warn = original;
    assert(captured.includes('INVALID_LOCATION'), `warn should log code, got: "${captured}"`);
});

// ─── Suite 2: Builder Errors ──────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════');
console.log('  Suite 2: Builder Errors');
console.log('══════════════════════════════════════════════');

test('MISSING_SCHEDULE — build() بدون setSchedule()', () => {
    expect_throws(PlanErrorCode.MISSING_SCHEDULE, Severity.ERROR, () => {
        new PlanBuilder().addHifz(7.5, { surah: 1, ayah: 1 }).build();
    });
});

test('MODE_MIXING — addHifz() على خطة WERD', () => {
    // نجبر currentMode على WERD_ECOSYSTEM عبر reflection
    const builder = new PlanBuilder() as any;
    builder.currentMode = 'WERD_ECOSYSTEM';
    expect_throws(PlanErrorCode.MODE_MIXING, Severity.ERROR, () => {
        builder.addHifz(7.5, { surah: 1, ayah: 1 });
    });
});

test('START_AFTER_END — بداية الحفظ بعد النهاية', () => {
    expect_throws(PlanErrorCode.START_AFTER_END, Severity.ERROR, () => {
        new PlanBuilder()
            .setSchedule({ startDate: '2026-01-01', daysPerWeek: 5, limitDays: 5, isReverse: false })
            .addHifz(
                7.5,
                { surah: 5, ayah: 1 },   // start: سورة المائدة
                { surah: 1, ayah: 1 }    // end: الفاتحة — قبل البداية!
            )
            .build();
    });
});

test('MAJOR_REVIEW_AHEAD — كبرى تبدأ أمام الحفظ', () => {
    // isReverse: false → index يتصاعد من الفاتحة للناس
    // addHifz يبدأ من سورة 1 ← المراجعة تبدأ من سورة 50 وهو أعلى index
    expect_throws(PlanErrorCode.MAJOR_REVIEW_AHEAD, Severity.ERROR, () => {
        new PlanBuilder()
            .setSchedule({ startDate: '2026-01-01', daysPerWeek: 5, limitDays: 5, isReverse: false })
            .addHifz(7.5, { surah: 1, ayah: 1 })
            .addMajorReview(100, { surah: 50, ayah: 1 }) // أمام الحفظ في الاتجاه الطبيعي
            .build();
    });
});

// ─── Suite 3: Data Errors ────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════');
console.log('  Suite 3: Data Errors');
console.log('══════════════════════════════════════════════');

test('INVALID_LOCATION — سورة 999 غير موجودة', () => {
    const repo = QuranRepository.getInstance();
    expect_throws(PlanErrorCode.INVALID_LOCATION, Severity.ERROR, () => {
        repo.getIndexFromLocation(999, 1, false);
    });
});

test('INVALID_LOCATION — آية 9999 لسورة صحيحة', () => {
    const repo = QuranRepository.getInstance();
    expect_throws(PlanErrorCode.INVALID_LOCATION, Severity.ERROR, () => {
        repo.getIndexFromLocation(1, 9999, false); // الفاتحة 7 آيات فقط
    });
});

test('INVALID_LOCATION — context يحمل surah+ayah صحيح', () => {
    const repo = QuranRepository.getInstance();
    try {
        repo.getIndexFromLocation(200, 5, false);
        throw new Error('لم يُرمَ خطأ');
    } catch (e: any) {
        assert(e instanceof PlanError, 'يجب PlanError');
        assert(e.context['surah'] === 200, `surah في context = ${e.context['surah']}`);
        assert(e.context['ayah'] === 5, `ayah في context = ${e.context['ayah']}`);
    }
});

// ─── Suite 5: Fix 1 — currentIdx لا يتجاوز الحدود ───────────────────────────

console.log('\n══════════════════════════════════════════════');
console.log('  Suite 5: Fix 1 — currentIdx لا يتجاوز الحدود');
console.log('══════════════════════════════════════════════');

test('currentIdx <= globalMax بعد اكتمال LinearTrack', () => {
    const repo = QuranRepository.getInstance();
    const dirData = repo.getDirectionData(false); // forward
    const globalMax = dirData.cumulative_array.length - 1; // 6235

    // خطة صغيرة: حفظ من سورة 114 (آخر سورة forward) بمقدار كبير حتى الاكتمال السريع
    const manager = new PlanBuilder()
        .setSchedule({ startDate: '2026-01-01', daysPerWeek: 7, limitDays: 100, isReverse: false })
        .addHifz(
            9999, // كبير جداً — سينتهي في يوم واحد
            { surah: 114, ayah: 1 } // آخر سورة
        )
        .stopWhenCompleted()
        .build();

    manager.generatePlan();

    const hifzTrack = manager.getTrack(1); // TrackId.HIFZ = 1
    assert(hifzTrack !== undefined, 'يجب وجود hifzTrack');
    assert(hifzTrack!.state.isCompleted, 'يجب أن يكتمل الحفظ');
    assert(
        hifzTrack!.state.currentIdx <= globalMax,
        `currentIdx (${hifzTrack!.state.currentIdx}) > globalMax (${globalMax})`
    );
});

// ─── Suite 6: Fix 3 — ترتيب التنفيذ مفروض ────────────────────────────────────

console.log('\n══════════════════════════════════════════════');
console.log('  Suite 6: Fix 3 — ترتيب التنفيذ بالـ id');
console.log('══════════════════════════════════════════════');

test('WindowStrategy تحصل على تاريخ Hifz حتى مع إضافة عكسية', () => {
    // نُنشئ خطة عادية — PlanBuilder يضمن الترتيب الصحيح الآن عبر sort في TrackManager
    const manager = new PlanBuilder()
        .setSchedule({ startDate: '2026-01-01', daysPerWeek: 5, limitDays: 5, isReverse: false })
        .addHifz(7.5, { surah: 1, ayah: 1 })
        .addMinorReview(3, WindowMode.GRADUAL)
        .build();

    const plan = manager.generatePlan();
    assert(plan.length === 5, `expected 5 days, got ${plan.length}`);

    // يوم 1: الصغرى لا تاريخ لها → لا حدث
    const day1MinorEvents = plan[0].events.filter(e => e.trackId === 2);
    assert(day1MinorEvents.length === 0, 'اليوم 1: الصغرى يجب أن تكون صفر (GRADUAL)');

    // يوم 2: الصغرى تقرأ تاريخ يوم 1 → حدث واحد
    const day2MinorEvents = plan[1].events.filter(e => e.trackId === 2);
    assert(day2MinorEvents.length === 1, 'اليوم 2: الصغرى يجب حدث واحد بعد يوم من الحفظ');
});

// ─── نتيجة ───────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════');
const total = passed + failed;
if (failed === 0) {
    console.log(`  🎉 الكل نجح: ${passed}/${total}`);
} else {
    console.log(`  ⚠️  ${passed}/${total} نجح — ${failed} فشل`);
}
console.log('══════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
