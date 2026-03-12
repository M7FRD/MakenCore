import pandas as pd
import json

def create_quran_ts_file(csv_path):
    print("⏳ جاري قراءة ملف CSV وتجهيز البيانات...")
    df = pd.read_csv(csv_path)
    df.columns = ['surah_name', 'surah_order', 'ayah_num', 'lines']
    
    # 1. معالجة البيانات
    # ---------------------------
    # المسار الأمامي
    df_fwd = df.sort_values(by=['surah_order', 'ayah_num']).reset_index(drop=True)
    df_fwd['cum_lines'] = df_fwd['lines'].cumsum().round(6)
    idx_map_fwd = {f"{row['surah_order']}:{row['ayah_num']}": idx for idx, row in df_fwd.iterrows()}
    fwd_array = df_fwd['cum_lines'].tolist()
    
    # 🚀 الجديد: إنشاء المصفوفة العكسية للأداء (Forward Reverse Index)
    # نحول الداتا فرييم إلى قائمة كائنات مباشرة
    rev_idx_fwd = []
    for _, row in df_fwd.iterrows():
        rev_idx_fwd.append({
            "surah": int(row['surah_order']),
            "ayah": int(row['ayah_num']),
            "is_end": False # قيمة افتراضية
        })

    # المسار العكسي
    df_rev = df.sort_values(by=['surah_order', 'ayah_num'], ascending=[False, True]).reset_index(drop=True)
    df_rev['cum_lines'] = df_rev['lines'].cumsum().round(6)
    idx_map_rev = {f"{row['surah_order']}:{row['ayah_num']}": idx for idx, row in df_rev.iterrows()}
    rev_array = df_rev['cum_lines'].tolist()

    # 🚀 الجديد: إنشاء المصفوفة العكسية للمسار العكسي
    rev_idx_rev = []
    for _, row in df_rev.iterrows():
        rev_idx_rev.append({
            "surah": int(row['surah_order']),
            "ayah": int(row['ayah_num']),
            "is_end": False
        })

    # 2. معلومات السور
    surah_stats = df.groupby('surah_order').agg({'surah_name': 'first', 'ayah_num': 'max'}).sort_index()
    surah_info_optimized = surah_stats[['surah_name', 'ayah_num']].values.tolist()
    surah_names_list = surah_stats['surah_name'].tolist()

    # 3. كتابة الملف
    # -----------------------
    output_file = 'QuranStaticData.ts' # سيتم حفظه بجانب السكربت
    print(f"✍️ جاري كتابة الملف المحدث: {output_file} ...")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("/**\n * QuranStaticData.ts - Optimized with Reverse Index 🚀\n */\n\n")

        f.write(f"export const SURAH_NAMES: readonly string[] = {json.dumps(surah_names_list, ensure_ascii=False)};\n\n")
        f.write("export const SURAH_INFO: readonly [string, number][] = ")
        f.write(json.dumps(surah_info_optimized, ensure_ascii=False, indent=None))
        f.write(";\n\n")

        # FORWARD
        f.write("// ================= FORWARD DATA =================\n")
        f.write(f"export const RAW_CUMULATIVE_ARRAY_FORWARD = new Float32Array({json.dumps(fwd_array)});\n")
        f.write("export const INDEX_MAP_FORWARD: Record<string, number> = ")
        f.write(json.dumps(idx_map_fwd, ensure_ascii=False))
        f.write(";\n")
        # كتابة المصفوفة العكسية الجديدة
        f.write("export const REVERSE_INDEX_FORWARD = ") 
        f.write(json.dumps(rev_idx_fwd, separators=(',', ':'))) # separators لضغط الحجم
        f.write(";\n\n")

        # REVERSE
        f.write("// ================= REVERSE DATA =================\n")
        f.write(f"export const RAW_CUMULATIVE_ARRAY_REVERSE = new Float32Array({json.dumps(rev_array)});\n")
        f.write("export const INDEX_MAP_REVERSE: Record<string, number> = ")
        f.write(json.dumps(idx_map_rev, ensure_ascii=False))
        f.write(";\n")
        # كتابة المصفوفة العكسية الجديدة
        f.write("export const REVERSE_INDEX_REVERSE = ") 
        f.write(json.dumps(rev_idx_rev, separators=(',', ':')))
        f.write(";\n")

    print(f"✅ تم إنشاء {output_file} بنجاح! يحتوي الآن على REVERSE_INDEX لإصلاح الأداء.")
    print("📌 لا تنس نقل الملف إلى src/data/")

# تشغيل (تأكد من اسم ملف CSV)
create_quran_ts_file('الدورة الرمضانية - 1442هـ - قاعدة بيانات - من الفاتحة.csv')