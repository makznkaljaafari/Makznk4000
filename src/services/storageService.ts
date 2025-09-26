import { supabase } from './supabaseClient';

const BUCKETS = {
  AVATARS: 'avatars',
  LOGOS: 'logos',
  PARTS: 'parts',
  ATTACHMENTS: 'attachments',
};

/**
 * دالة عامة لرفع الملفات
 * @param bucket - اسم الـ Bucket
 * @param path - مسار الملف داخل الـ Bucket
 * @param file - الملف المراد رفعه
 * @returns {Promise<string>} - مسار الملف بعد الرفع
 */
const uploadFile = async (bucket: string, path: string, file: File): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true, // مهم: للكتابة فوق الملف إذا كان موجودًا
    });

  if (error) {
    console.error(`Error uploading to ${bucket}:`, error);
    throw new Error(`Failed to upload file to ${bucket}.`);
  }
  if (!data) {
    throw new Error(`Upload to ${bucket} completed but no data was returned.`);
  }
  return data.path;
};

export const storageService = {
  /**
   * يرفع صورة شخصية للمستخدم
   * @param userId - معرف المستخدم
   * @param file - ملف الصورة
   * @returns {Promise<string>} - الرابط العام للصورة
   */
  uploadAvatar: async (userId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const path = `${userId}/avatar.${fileExt}`;
    await uploadFile(BUCKETS.AVATARS, path, file);
    const { data } = supabase.storage.from(BUCKETS.AVATARS).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * يرفع شعار الشركة
   * @param companyId - معرف الشركة
   * @param file - ملف الشعار
   * @returns {Promise<string>} - الرابط العام للشعار
   */
  uploadCompanyLogo: async (companyId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const path = `${companyId}/logo.${fileExt}`;
    await uploadFile(BUCKETS.LOGOS, path, file);
    const { data } = supabase.storage.from(BUCKETS.LOGOS).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * يرفع صورة لقطعة غيار (ملف خاص)
   * @param companyId - معرف الشركة
   * @param partId - معرف قطعة الغيار
   * @param file - ملف الصورة
   * @returns {Promise<string>} - مسار الملف في التخزين
   */
  uploadPartImage: async (companyId: string, partId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const path = `${companyId}/${partId}.${fileExt}`;
    return uploadFile(BUCKETS.PARTS, path, file);
  },

  /**
   * يرفع مرفق لأمر شراء (ملف خاص)
   * @param companyId - معرف الشركة
   * @param purchaseOrderId - معرف أمر الشراء
   * @param file - الملف
   * @returns {Promise<string>} - مسار الملف في التخزين
   */
  uploadAttachment: async (companyId: string, purchaseOrderId: string, file: File): Promise<string> => {
    const path = `${companyId}/${purchaseOrderId}/${file.name}`;
    return uploadFile(BUCKETS.ATTACHMENTS, path, file);
  },

  /**
   * ينشئ رابطًا مؤقتًا (موقعًا) للملفات الخاصة
   * @param bucket - اسم الـ Bucket
   * @param path - مسار الملف
   * @param expiresIn - مدة صلاحية الرابط بالثواني (الافتراضي: ساعة)
   * @returns {Promise<string | null>} - الرابط الموقع أو null عند الخطأ
   */
  createSignedUrl: async (bucket: string, path: string, expiresIn = 3600): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      console.error(`Error creating signed URL for ${path}:`, error);
      return null;
    }
    return data.signedUrl;
  },
  
   /**
   * يحذف ملفًا من التخزين
   * @param bucket - اسم الـ Bucket
   * @param path - مسار الملف
   * @returns {Promise<void>}
   */
  deleteFile: async (bucket: string, path: string): Promise<void> => {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) {
      console.error(`Error deleting file ${path}:`, error);
      throw new Error(`Failed to delete file.`);
    }
  }
};
