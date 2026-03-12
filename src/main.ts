// src/main.ts
import { PlanBuilder } from './builders/PlanBuilder';
import { WindowMode } from './core/constants';
import { PlanExporter } from './utils/PlanExporter';

/**
 * Main Entry Point
 * Orchestrates the planning process using the refactored architecture.
 */
async function main() {
    console.log("\n🚀 Quran Planning Engine - Refactored Edition\n");

    try {
        console.log("⚙️  جاري إعداد الخطة...");

        // 1. إعداد الخطة (Builder Pattern)
        // يقوم الـ Builder الآن بحقن الـ Repository تلقائياً
        const builder = new PlanBuilder();

        const manager = builder
            .setSchedule({
                startDate: "2026-02-01",
                daysPerWeek: 5,          // الأحد - الخميس
                limitDays: 10,            // 0 = استمر حتى التوقف التلقائي
                isReverse: true
            })
            // 🎯 سيناريو: حفظ سورة البقرة مع مراجعة
            .addHifz(
                7.5,                       // الاسطر
                { surah: 40, ayah: 2 }    // من
            )
            .addMinorReview(5, WindowMode.GRADUAL)            // مراجعة 5 دروس (صغرى)
            .addMajorReview(15 * 20, { surah: 67, ayah: 1 })           // مراجعة 20 وجه (كبرى)
            .stopWhenCompleted()          // 🛑 تفعيل التوقف الذكي
            .build();

        // 2. التوليد (Simulation Phase)
        console.time("⏱️  زمن التوليد");
        const plan = manager.generatePlan();
        console.timeEnd("⏱️  زمن التوليد");

        console.log(`\n✅ تم توليد ${plan.length} يوم (توقفت الخطة عند اكتمال الهدف).\n`);

        // 3. التصدير والعرض (Exporter handles dynamic events now)
        const exporter = new PlanExporter();

        // أ) العرض في الكونسول للتحقق السريع
        exporter.printToConsole(plan);

        // ب) تصدير ملف الإكسل
        const fileName = `QuranPlan_Refactored_${new Date().toISOString().split('T')[0]}.xlsx`;
        console.log(`💾 جاري حفظ ملف الإكسل: ${fileName}...`);

        await exporter.exportToExcel(plan, fileName);

        console.log("🎉 تمت العملية بنجاح. النظام يعمل بامتياز!");

    } catch (error) {
        console.error("❌ Critical Error:", error);
    }
}

// تشغيل البرنامج
main().catch(console.error);