export interface WizardQuestion {
  key: string;
  type: "single" | "multi" | "shortText" | "longText" | "boolean";
  required: boolean;
  labelKey: string;
  options?: Array<{ value: string; label: string }>;
}

export const CATEGORY_WIZARD_TEMPLATES: Record<string, WizardQuestion[]> = {
  "web-development": [
    {
      key: "webAppType",
      type: "single",
      required: true,
      labelKey: "Web Uygulaması / Site Türü",
      options: [
        { value: "corporate", label: "Kurumsal Web Sitesi" },
        { value: "ecommerce", label: "E-Ticaret Platformu" },
        { value: "saas_webapp", label: "SaaS / Özel Web Uygulaması" },
        { value: "portal", label: "Portal / Topluluk Platformu" },
      ],
    },
    {
      key: "authRequired",
      type: "boolean",
      required: true,
      labelKey: "Kullanıcı Girişi / Üyelik Sistemi Gerekiyor mu?",
    },
    {
      key: "adminPanelRequired",
      type: "boolean",
      required: true,
      labelKey: "Özel Yönetim (Admin) Paneli Gerekiyor mu?",
    },
    {
      key: "responsiveRequired",
      type: "boolean",
      required: true,
      labelKey: "Tüm Mobil ve Masaüstü Cihazlarla Tam Uyum (Responsive)",
    },
  ],
  "mobile-development": [
    {
      key: "mobilePlatform",
      type: "single",
      required: true,
      labelKey: "Hedef Platform",
      options: [
        { value: "ios_only", label: "Yalnızca iOS" },
        { value: "android_only", label: "Yalnızca Android" },
        { value: "both_cross", label: "Her İkisi (Cross-platform: Flutter / React Native)" },
        { value: "both_native", label: "Her İkisi (Ayrı Ayrı Native)" },
      ],
    },
    {
      key: "backendExists",
      type: "boolean",
      required: true,
      labelKey: "Mevcut Bir API / Backend Altyapısı Var mı?",
    },
    {
      key: "storeSubmission",
      type: "boolean",
      required: true,
      labelKey: "App Store ve Play Store Yükleme Desteği Bekleniyor mu?",
    },
  ],
  "ai-ml": [
    {
      key: "aiTaskType",
      type: "single",
      required: true,
      labelKey: "Yapay Zeka Çalışma Alanı",
      options: [
        { value: "llm_rag", label: "LLM Entegrasyonu ve RAG (Retrieval-Augmented Generation)" },
        { value: "classification", label: "Sınıflandırma ve Tahminleme" },
        { value: "computer_vision", label: "Bilgisayarlı Görü ve Görüntü İşleme" },
        { value: "nlp", label: "Doğal Dil İşleme (NLP)" },
      ],
    },
    {
      key: "dataReadiness",
      type: "single",
      required: true,
      labelKey: "Eğitim / Test Verisi Durumu",
      options: [
        { value: "ready", label: "Veri Hazır ve Etiketli" },
        { value: "raw", label: "Ham Veri Var, İşlenmesi Gerekiyor" },
        { value: "none", label: "Veri Yok, Dış Kaynaklardan Toplanacak / API Kullanılacak" },
      ],
    },
  ],
  cybersecurity: [
    {
      key: "defensiveAuthConfirmed",
      type: "boolean",
      required: true,
      labelKey: "Sistem Sahibi Tarafından Yazılı Yetki ve İzin Verildiğini Onaylıyorum",
    },
    {
      key: "securityScope",
      type: "single",
      required: true,
      labelKey: "Güvenlik Çalışma Türü",
      options: [
        { value: "web_pentest", label: "Yetkili Web Uygulaması Sızma Testi" },
        { value: "code_review", label: "Kaynak Kod Güvenlik Denetimi" },
        { value: "hardening", label: "Sistem ve Sunucu Sıkılaştırma" },
        { value: "compliance", label: "KVKK / ISO 27001 Güvenlik Uyumluluğu" },
      ],
    },
  ],
};

export function getTemplateQuestionsForCategory(categoryKey: string): WizardQuestion[] {
  return (
    CATEGORY_WIZARD_TEMPLATES[categoryKey] || [
      {
        key: "generalOutcome",
        type: "shortText",
        required: true,
        labelKey: "Temel Beklenti ve Teslimat Hedefi",
      },
      {
        key: "documentationRequired",
        type: "boolean",
        required: true,
        labelKey: "Detaylı Teknik Dokümantasyon Bekleniyor mu?",
      },
    ]
  );
}
