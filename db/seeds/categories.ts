export interface SeedSector {
  key: string;
  sortOrder: number;
  icon: string;
  translations: {
    tr: { name: string; description: string };
    en: { name: string; description: string };
  };
}

export interface SeedCategory {
  key: string;
  sectorKey: string;
  sortOrder: number;
  translations: {
    tr: { name: string; description: string };
    en: { name: string; description: string };
  };
}

export const SEED_SECTORS: SeedSector[] = [
  {
    key: "sector-software-it",
    sortOrder: 1,
    icon: "Code2",
    translations: {
      tr: {
        name: "Yazılım ve Bilişim Teknolojileri",
        description: "Web, mobil, bulut, sistem mimarisi ve kurumsal yazılım çözümleri.",
      },
      en: {
        name: "Software & Information Technology",
        description: "Web, mobile, cloud, system architecture, and enterprise software solutions.",
      },
    },
  },
  {
    key: "sector-ai-data",
    sortOrder: 2,
    icon: "Cpu",
    translations: {
      tr: {
        name: "Yapay Zeka, Veri ve Otomasyon",
        description: "Büyük dil modelleri, veri mühendisliği, iş akışı otomasyonu ve analitik.",
      },
      en: {
        name: "AI, Data & Automation",
        description: "Large language models, data engineering, workflow automation, and analytics.",
      },
    },
  },
  {
    key: "sector-design-creative",
    sortOrder: 3,
    icon: "Palette",
    translations: {
      tr: {
        name: "Tasarım ve Yaratıcı Sanatlar",
        description: "Kullanıcı arayüzü, marka kimliği, illüstrasyon ve görsel iletişim tasarımı.",
      },
      en: {
        name: "Design & Creative Arts",
        description:
          "User interface, brand identity, illustration, and visual communication design.",
      },
    },
  },
  {
    key: "sector-marketing-growth",
    sortOrder: 4,
    icon: "TrendingUp",
    translations: {
      tr: {
        name: "Dijital Pazarlama, Reklam ve Büyüme",
        description: "SEO, performans reklamcılığı, sosyal medya yönetimi ve e-ticaret büyümesi.",
      },
      en: {
        name: "Digital Marketing & Growth",
        description:
          "SEO, performance advertising, social media management, and e-commerce growth.",
      },
    },
  },
  {
    key: "sector-video-audio",
    sortOrder: 5,
    icon: "Video",
    translations: {
      tr: {
        name: "Video, Animasyon ve Ses",
        description: "Video kurgu, hareketli grafikler, seslendirme ve podcast prodüksiyonu.",
      },
      en: {
        name: "Video, Motion & Audio",
        description: "Video editing, motion graphics, voice-over, and podcast audio production.",
      },
    },
  },
  {
    key: "sector-writing-translation",
    sortOrder: 6,
    icon: "PenTool",
    translations: {
      tr: {
        name: "Yazı, Çeviri ve İçerik Üretimi",
        description: "Teknik dokümantasyon, metin yazarlığı, çok dilli çeviri ve SEO içerikleri.",
      },
      en: {
        name: "Writing & Translation",
        description: "Technical writing, copywriting, multilingual translation, and SEO articles.",
      },
    },
  },
  {
    key: "sector-business-finance",
    sortOrder: 7,
    icon: "Briefcase",
    translations: {
      tr: {
        name: "İş Yönetimi, Finans ve Danışmanlık",
        description: "Finansal modelleme, muhasebe, iş stratejisi ve çevik proje yönetimi.",
      },
      en: {
        name: "Business, Finance & Consulting",
        description:
          "Financial modeling, accounting, startup strategy, and agile project management.",
      },
    },
  },
  {
    key: "sector-legal-compliance",
    sortOrder: 8,
    icon: "Scale",
    translations: {
      tr: {
        name: "Hukuk, Mevzuat ve Fikri Mülkiyet",
        description:
          "Sözleşmeler, KVKK/GDPR uyumu, marka tescili ve girişimler için yasal danışmanlık.",
      },
      en: {
        name: "Legal & Compliance",
        description:
          "Contract drafting, GDPR/privacy compliance, trademark filing, and startup advisory.",
      },
    },
  },
  {
    key: "sector-engineering-3d",
    sortOrder: 9,
    icon: "Box",
    translations: {
      tr: {
        name: "Mühendislik, Mimarlık ve 3D",
        description:
          "Mimari projeler, 3D görselleştirme, endüstriyel modelleme ve oyun mekanikleri.",
      },
      en: {
        name: "Engineering, Architecture & 3D",
        description:
          "Architectural blueprints, 3D visualization, CAD product modeling, and game engines.",
      },
    },
  },
  {
    key: "sector-operations-support",
    sortOrder: 10,
    icon: "Headphones",
    translations: {
      tr: {
        name: "Sanal Asistanlık ve Müşteri Destek",
        description: "Yönetici asistanlığı, müşteri hizmetleri, veri girişi ve CRM yönetimi.",
      },
      en: {
        name: "Virtual Assistance & Operations",
        description: "Executive assistance, customer support, data entry, and CRM operations.",
      },
    },
  },
];

export const SEED_CATEGORIES: SeedCategory[] = [
  // --- 1. Yazılım ve Bilişim Teknolojileri (sector-software-it) ---
  {
    key: "web-development",
    sectorKey: "sector-software-it",
    sortOrder: 1,
    translations: {
      tr: {
        name: "Web Geliştirme",
        description: "Kurumsal siteler, web uygulamaları, portallar ve e-ticaret çözümleri.",
      },
      en: {
        name: "Web Development",
        description: "Corporate websites, web applications, portals, and e-commerce solutions.",
      },
    },
  },
  {
    key: "frontend-ui",
    sectorKey: "sector-software-it",
    sortOrder: 2,
    translations: {
      tr: {
        name: "Frontend ve Arayüz Mühendisliği",
        description: "Modern web arayüzleri, performans optimizasyonu ve tasarım sistemleri.",
      },
      en: {
        name: "Frontend Engineering",
        description: "Modern web interfaces, performance optimization, and design systems.",
      },
    },
  },
  {
    key: "backend-api",
    sectorKey: "sector-software-it",
    sortOrder: 3,
    translations: {
      tr: {
        name: "Backend ve API Mühendisliği",
        description: "REST, GraphQL, microservice ve yüksek ölçekli sunucu sistemleri.",
      },
      en: {
        name: "Backend & API",
        description: "REST, GraphQL, microservices, and high-scale server infrastructure.",
      },
    },
  },
  {
    key: "mobile-development",
    sectorKey: "sector-software-it",
    sortOrder: 4,
    translations: {
      tr: {
        name: "Mobil Uygulama Geliştirme",
        description: "iOS, Android, React Native ve Flutter mobil uygulamaları.",
      },
      en: {
        name: "Mobile Development",
        description: "iOS, Android, React Native, and Flutter mobile applications.",
      },
    },
  },
  {
    key: "desktop-development",
    sectorKey: "sector-software-it",
    sortOrder: 5,
    translations: {
      tr: {
        name: "Masaüstü Yazılım Geliştirme",
        description: "Windows, macOS ve Linux için yerel ve platformlar arası uygulamalar.",
      },
      en: {
        name: "Desktop Development",
        description: "Native and cross-platform applications for Windows, macOS, and Linux.",
      },
    },
  },
  {
    key: "devops-cloud",
    sectorKey: "sector-software-it",
    sortOrder: 6,
    translations: {
      tr: {
        name: "DevOps ve Bulut Bilişim",
        description: "CI/CD, Kubernetes, Docker, AWS, GCP, Azure ve sunucu mimarileri.",
      },
      en: {
        name: "DevOps & Cloud",
        description: "CI/CD, Kubernetes, Docker, AWS, GCP, Azure, and cloud architecture.",
      },
    },
  },
  {
    key: "database",
    sectorKey: "sector-software-it",
    sortOrder: 7,
    translations: {
      tr: {
        name: "Veritabanı Mühendisliği",
        description: "Veritabanı mimarisi, sorgu optimizasyonu, PostgreSQL, MySQL ve NoSQL.",
      },
      en: {
        name: "Database Engineering",
        description: "Database architecture, query optimization, PostgreSQL, MySQL, and NoSQL.",
      },
    },
  },
  {
    key: "cybersecurity",
    sectorKey: "sector-software-it",
    sortOrder: 8,
    translations: {
      tr: {
        name: "Siber Güvenlik",
        description: "Yetkili güvenlik testleri, kod denetimi, sistem sıkılaştırma ve uyumluluk.",
      },
      en: {
        name: "Cybersecurity",
        description: "Authorized penetration testing, code review, hardening, and compliance.",
      },
    },
  },
  {
    key: "qa-testing",
    sectorKey: "sector-software-it",
    sortOrder: 9,
    translations: {
      tr: {
        name: "Yazılım Testi ve Kalite Güvencesi",
        description: "Manuel ve otomatik testler, E2E senaryoları ve yük testleri.",
      },
      en: {
        name: "QA & Testing",
        description: "Manual and automated testing, E2E test suites, and load testing.",
      },
    },
  },
  {
    key: "blockchain",
    sectorKey: "sector-software-it",
    sortOrder: 10,
    translations: {
      tr: {
        name: "Blokzincir Mühendisliği",
        description: "Akıllı sözleşmeler, EVM, Solana ve merkeziyetsiz uygulama mimarileri.",
      },
      en: {
        name: "Blockchain Engineering",
        description: "Smart contracts, EVM, Solana, and decentralized application architecture.",
      },
    },
  },
  {
    key: "embedded-iot",
    sectorKey: "sector-software-it",
    sortOrder: 11,
    translations: {
      tr: {
        name: "Gömülü Sistemler ve IoT",
        description:
          "Mikrodenetleyici programlama, Arduino, ESP32, Raspberry Pi ve donanım yazılımları.",
      },
      en: {
        name: "Embedded & IoT",
        description:
          "Microcontroller programming, firmware, Arduino, ESP32, and connected devices.",
      },
    },
  },
  {
    key: "it-systems-network",
    sectorKey: "sector-software-it",
    sortOrder: 12,
    translations: {
      tr: {
        name: "BT, Sistem ve Ağ Yönetimi",
        description: "Sunucu yönetimi, ağ güvenliği, VPN, Linux/Windows sunucu yapılandırması.",
      },
      en: {
        name: "IT, Systems & Network",
        description: "Server administration, network security, VPN, and infrastructure setup.",
      },
    },
  },
  {
    key: "computer-hardware",
    sectorKey: "sector-software-it",
    sortOrder: 13,
    translations: {
      tr: {
        name: "Bilgisayar Donanımı ve Teknik Destek",
        description: "Donanım teşhisi, sistem toplama, optimizasyon ve teknik danışmanlık.",
      },
      en: {
        name: "Computer Hardware & Technical Support",
        description:
          "Hardware diagnostics, custom builds, performance tuning, and technical support.",
      },
    },
  },
  {
    key: "other-technology",
    sectorKey: "sector-software-it",
    sortOrder: 14,
    translations: {
      tr: {
        name: "Diğer Teknoloji Hizmetleri",
        description:
          "Listelenen kategorilerin dışındaki özel teknoloji ve mühendislik gereksinimleri.",
      },
      en: {
        name: "Other Technology",
        description: "Specialized technology and engineering tasks outside listed categories.",
      },
    },
  },

  // --- 2. Yapay Zeka, Veri ve Otomasyon (sector-ai-data) ---
  {
    key: "ai-ml",
    sectorKey: "sector-ai-data",
    sortOrder: 15,
    translations: {
      tr: {
        name: "Yapay Zeka ve Makine Öğrenimi",
        description: "LLM entegrasyonu, model eğitimi, veri bilimi ve bilgisayarlı görü.",
      },
      en: {
        name: "AI & Machine Learning",
        description: "LLM integration, model training, data science, and computer vision.",
      },
    },
  },
  {
    key: "data-engineering",
    sectorKey: "sector-ai-data",
    sortOrder: 16,
    translations: {
      tr: {
        name: "Veri Mühendisliği ve Analitik",
        description: "Veri ambarı, ETL boru hatları, veri analitiği ve raporlama sistemleri.",
      },
      en: {
        name: "Data Engineering & Analytics",
        description: "Data warehousing, ETL pipelines, analytics, and business intelligence.",
      },
    },
  },
  {
    key: "automation-integrations",
    sectorKey: "sector-ai-data",
    sortOrder: 17,
    translations: {
      tr: {
        name: "Otomasyon ve Entegrasyonlar",
        description: "İş akışı otomasyonu, botlar, webhooklar ve üçüncü taraf API entegrasyonları.",
      },
      en: {
        name: "Automation & Integrations",
        description: "Workflow automation, custom bots, webhooks, and third-party integrations.",
      },
    },
  },
  {
    key: "ai-agents-workflows",
    sectorKey: "sector-ai-data",
    sortOrder: 18,
    translations: {
      tr: {
        name: "Yapay Zeka Ajanları ve İş Akışları",
        description: "LangChain, LlamaIndex, n8n AI ve otonom karar destek sistemleri.",
      },
      en: {
        name: "AI Agents & Autonomous Workflows",
        description: "LangChain, LlamaIndex, n8n AI, and autonomous decision support workflows.",
      },
    },
  },
  {
    key: "prompt-engineering",
    sectorKey: "sector-ai-data",
    sortOrder: 19,
    translations: {
      tr: {
        name: "Prompt Mühendisliği ve AI Danışmanlığı",
        description: "Doğru çıktı mimarisi, şirket içi prompt optimizasyonu ve AI adaptasyonu.",
      },
      en: {
        name: "Prompt Engineering & AI Advisory",
        description: "Output architecture, internal prompt optimization, and AI tool adoption.",
      },
    },
  },
  {
    key: "business-intelligence",
    sectorKey: "sector-ai-data",
    sortOrder: 20,
    translations: {
      tr: {
        name: "İş Zekası ve Dashboard Tasarımı",
        description: "Power BI, Tableau, Looker ve kurumsal veri görselleştirme panelleri.",
      },
      en: {
        name: "Business Intelligence & Dashboards",
        description: "Power BI, Tableau, Looker, and executive reporting dashboard systems.",
      },
    },
  },

  // --- 3. Tasarım ve Yaratıcı Sanatlar (sector-design-creative) ---
  {
    key: "ui-ux-design",
    sectorKey: "sector-design-creative",
    sortOrder: 21,
    translations: {
      tr: {
        name: "UI/UX Tasarım",
        description:
          "Kullanıcı deneyimi araştırması, tel kafes, prototip ve mobil/web arayüz tasarımı.",
      },
      en: {
        name: "UI/UX Design",
        description: "User experience research, wireframing, prototyping, and UI design.",
      },
    },
  },
  {
    key: "brand-identity-logo",
    sectorKey: "sector-design-creative",
    sortOrder: 22,
    translations: {
      tr: {
        name: "Logo ve Kurumsal Kimlik",
        description: "Logo tasarımı, marka kılavuzu, renk paleti ve kurumsal evrak setleri.",
      },
      en: {
        name: "Logo & Brand Identity",
        description: "Logo design, comprehensive brand guidelines, color palettes, and stationery.",
      },
    },
  },
  {
    key: "design-systems",
    sectorKey: "sector-design-creative",
    sortOrder: 23,
    translations: {
      tr: {
        name: "Tasarım Sistemleri (Design Systems)",
        description: "Figma bileşen kütüphaneleri, tokenlar ve çok platformlu UI kitleri.",
      },
      en: {
        name: "Design Systems & UI Kits",
        description: "Figma component libraries, design tokens, and multi-platform design systems.",
      },
    },
  },
  {
    key: "social-media-design",
    sectorKey: "sector-design-creative",
    sortOrder: 24,
    translations: {
      tr: {
        name: "Sosyal Medya ve Reklam Görselleri",
        description: "Instagram, LinkedIn, banner ve dijital reklam kreatif tasarımları.",
      },
      en: {
        name: "Social Media & Ad Creatives",
        description:
          "Instagram, LinkedIn banners, and high-converting digital advertising graphics.",
      },
    },
  },
  {
    key: "illustration-vector",
    sectorKey: "sector-design-creative",
    sortOrder: 25,
    translations: {
      tr: {
        name: "İllüstrasyon ve Vektörel Çizim",
        description: "Özel dijital çizimler, karakter tasarımı, vektör ikonlar ve maskotlar.",
      },
      en: {
        name: "Illustration & Vector Art",
        description: "Custom digital illustrations, character design, vector icons, and mascots.",
      },
    },
  },
  {
    key: "print-packaging-design",
    sectorKey: "sector-design-creative",
    sortOrder: 26,
    translations: {
      tr: {
        name: "Ambalaj, Etiket ve Baskı Tasarımı",
        description: "Ürün ambalajı, etiket tasarımı, katalog, broşür ve matbaa baskı hazırlığı.",
      },
      en: {
        name: "Packaging, Label & Print Design",
        description: "Product packaging, labels, catalogs, brochures, and prepress production.",
      },
    },
  },
  {
    key: "presentation-deck-design",
    sectorKey: "sector-design-creative",
    sortOrder: 27,
    translations: {
      tr: {
        name: "Yatırımcı Sunumu ve Pitch Deck",
        description: "Girişim sunumları, kurumsal slaytlar ve satış sunum tasarımları.",
      },
      en: {
        name: "Pitch Deck & Presentation Design",
        description: "Startup fundraising decks, corporate pitch decks, and sales presentations.",
      },
    },
  },

  // --- 4. Dijital Pazarlama, Reklam ve Büyüme (sector-marketing-growth) ---
  {
    key: "search-engine-optimization",
    sectorKey: "sector-marketing-growth",
    sortOrder: 28,
    translations: {
      tr: {
        name: "Arama Motoru Optimizasyonu (SEO)",
        description: "Teknik SEO, anahtar kelime stratejisi, backlink ve organik trafik artışı.",
      },
      en: {
        name: "Search Engine Optimization (SEO)",
        description: "Technical SEO, keyword research, backlink building, and organic growth.",
      },
    },
  },
  {
    key: "paid-search-sem",
    sectorKey: "sector-marketing-growth",
    sortOrder: 29,
    translations: {
      tr: {
        name: "Google Reklamları (SEM & PPC)",
        description: "Google Arama, Alışveriş, Display reklam kampanyaları ve dönüşüm kurulumu.",
      },
      en: {
        name: "Google Ads (SEM & PPC)",
        description: "Google Search, Shopping, Performance Max campaigns, and conversion tracking.",
      },
    },
  },
  {
    key: "paid-social-meta",
    sectorKey: "sector-marketing-growth",
    sortOrder: 30,
    translations: {
      tr: {
        name: "Sosyal Medya Reklamcılığı",
        description: "Meta (Facebook/Instagram), TikTok ve LinkedIn reklam optimizasyonu.",
      },
      en: {
        name: "Paid Social Media Advertising",
        description:
          "Meta Ads, TikTok, and LinkedIn performance media buying and campaign scaling.",
      },
    },
  },
  {
    key: "social-media-management",
    sectorKey: "sector-marketing-growth",
    sortOrder: 31,
    translations: {
      tr: {
        name: "Sosyal Medya Yönetimi ve Stratejisi",
        description: "Aylık içerik takvimi, hesap yönetimi, etkileşim artırma ve topluluk inşası.",
      },
      en: {
        name: "Social Media Management",
        description: "Content scheduling, account moderation, engagement growth, and community.",
      },
    },
  },
  {
    key: "email-marketing-automation",
    sectorKey: "sector-marketing-growth",
    sortOrder: 32,
    translations: {
      tr: {
        name: "E-Posta Pazarlaması ve CRM Akışları",
        description: "Klaviyo, Mailchimp otomasyonları, bülten kurgusu ve sepet terk akışları.",
      },
      en: {
        name: "Email Marketing & CRM Automation",
        description: "Klaviyo, lifecycle drip campaigns, newsletter design, and cart abandonment.",
      },
    },
  },
  {
    key: "ecommerce-growth-store",
    sectorKey: "sector-marketing-growth",
    sortOrder: 33,
    translations: {
      tr: {
        name: "E-Ticaret Yönetimi ve Büyüme",
        description: "Shopify mağaza kurulumu, Trendyol/Amazon entegrasyonu ve ciro ölçekleme.",
      },
      en: {
        name: "E-Commerce Management & Scaling",
        description: "Shopify store setup, Amazon/marketplace operations, and GMV growth.",
      },
    },
  },

  // --- 5. Video, Animasyon ve Ses (sector-video-audio) ---
  {
    key: "short-form-video",
    sectorKey: "sector-video-audio",
    sortOrder: 34,
    translations: {
      tr: {
        name: "Kısa Format Video (Reels, TikTok, Shorts)",
        description: "Dinamik altyazılı, kancalı dikey video kurgusu ve trend uyarlamaları.",
      },
      en: {
        name: "Short-Form Video (Reels & TikTok)",
        description: "Fast-paced, captioned vertical video editing optimized for viral retention.",
      },
    },
  },
  {
    key: "long-form-youtube",
    sectorKey: "sector-video-audio",
    sortOrder: 35,
    translations: {
      tr: {
        name: "YouTube ve Uzun Format Video Kurgusu",
        description: "Hikaye kurgusu, renk düzenleme, ses miksajı ve profesyonel YouTube montajı.",
      },
      en: {
        name: "YouTube & Long-Form Video Editing",
        description:
          "Narrative pacing, color grading, sound mixing, and high-retention YouTube editing.",
      },
    },
  },
  {
    key: "motion-graphics-2d-3d",
    sectorKey: "sector-video-audio",
    sortOrder: 36,
    translations: {
      tr: {
        name: "Hareketli Grafik (Motion Graphics)",
        description: "After Effects animasyonları, logo animasyonu ve açıklayıcı infografik video.",
      },
      en: {
        name: "Motion Graphics & 2D/3D Animation",
        description: "After Effects animations, kinetic typography, and animated explainer videos.",
      },
    },
  },
  {
    key: "voice-over-dubbing",
    sectorKey: "sector-video-audio",
    sortOrder: 37,
    translations: {
      tr: {
        name: "Seslendirme ve Dublaj",
        description:
          "Reklam filmi seslendirmesi, santral anonsları, podcast anlatımı ve ses miksi.",
      },
      en: {
        name: "Voice-Over & Dubbing",
        description: "Commercial voice-overs, narration, IVR greetings, and character dubbing.",
      },
    },
  },
  {
    key: "podcast-audio-editing",
    sectorKey: "sector-video-audio",
    sortOrder: 38,
    translations: {
      tr: {
        name: "Podcast Düzenleme ve Ses Mühendisliği",
        description: "Dip ses temizleme, mastering, müzik montajı ve podcast dağıtımı.",
      },
      en: {
        name: "Podcast Audio Editing & Mastering",
        description:
          "Background noise removal, audio mastering, intro/outro mixing, and loudness tuning.",
      },
    },
  },

  // --- 6. Yazı, Çeviri ve İçerik Üretimi (sector-writing-translation) ---
  {
    key: "technical-writing",
    sectorKey: "sector-writing-translation",
    sortOrder: 39,
    translations: {
      tr: {
        name: "Teknik Yazarlık ve Dokümantasyon",
        description: "API dokümanları, yazılım kılavuzları, mimari spesifikasyonlar ve PRD.",
      },
      en: {
        name: "Technical Writing & Docs",
        description: "API documentation, software user manuals, architectural specs, and PRD.",
      },
    },
  },
  {
    key: "copywriting-sales",
    sectorKey: "sector-writing-translation",
    sortOrder: 40,
    translations: {
      tr: {
        name: "Reklam ve Satış Metni Yazarlığı",
        description:
          "Açılış sayfası metinleri, reklam başlıkları, e-posta serileri ve satış metinleri.",
      },
      en: {
        name: "Copywriting & Landing Page Copy",
        description:
          "High-converting landing page copy, sales letters, and marketing email sequences.",
      },
    },
  },
  {
    key: "seo-blog-writing",
    sectorKey: "sector-writing-translation",
    sortOrder: 41,
    translations: {
      tr: {
        name: "SEO Uyumlu Blog ve Makale Yazarlığı",
        description:
          "Özgün araştırma, derinlemesine rehber yazılar ve arama motoru uyumlu makaleler.",
      },
      en: {
        name: "SEO Articles & Blog Posts",
        description:
          "Original research articles, authoritative blog posts, and topical cluster content.",
      },
    },
  },
  {
    key: "translation-localization",
    sectorKey: "sector-writing-translation",
    sortOrder: 42,
    translations: {
      tr: {
        name: "Profesyonel Çeviri ve Yerelleştirme",
        description:
          "Yazılım arayüzü yerelleştirmesi (i18n), hukuki/teknik çeviri ve yerelleştirme.",
      },
      en: {
        name: "Translation & Software Localization",
        description:
          "UI localization (i18n), technical translation, and contextual internationalization.",
      },
    },
  },
  {
    key: "proofreading-editing",
    sectorKey: "sector-writing-translation",
    sortOrder: 43,
    translations: {
      tr: {
        name: "Editoryal Düzeltme ve Redaksiyon",
        description: "İmla, akıcılık, anlatım bozukluğu düzeltme ve metin kalitesi denetimi.",
      },
      en: {
        name: "Proofreading & Copyediting",
        description: "Grammar, syntax, voice refinement, and rigorous quality assurance of text.",
      },
    },
  },

  // --- 7. İş Yönetimi, Finans ve Danışmanlık (sector-business-finance) ---
  {
    key: "technical-consulting",
    sectorKey: "sector-business-finance",
    sortOrder: 44,
    translations: {
      tr: {
        name: "Teknik Danışmanlık",
        description: "Mimari değerlendirme, kod denetimi, teknoloji seçimi ve fizibilite analizi.",
      },
      en: {
        name: "Technical Consulting",
        description:
          "Architecture review, code audit, technology stack evaluation, and feasibility.",
      },
    },
  },
  {
    key: "financial-modeling",
    sectorKey: "sector-business-finance",
    sortOrder: 45,
    translations: {
      tr: {
        name: "Finansal Modelleme ve Fizibilite",
        description:
          "Excel finansal modelleri, nakit akışı tahmini, değerleme ve senaryo analizleri.",
      },
      en: {
        name: "Financial Modeling & Valuation",
        description: "DCF models, pro forma projections, cash flow forecasting, and valuation.",
      },
    },
  },
  {
    key: "accounting-bookkeeping",
    sectorKey: "sector-business-finance",
    sortOrder: 46,
    translations: {
      tr: {
        name: "Muhasebe ve Ön Muhasebe Yönetimi",
        description: "Fatura takibi, banka mutabakatı, gelir-gider dengesi ve mali raporlama.",
      },
      en: {
        name: "Accounting & Bookkeeping",
        description:
          "Invoicing reconciliation, accounts payable/receivable, and financial hygiene.",
      },
    },
  },
  {
    key: "tax-consulting",
    sectorKey: "sector-business-finance",
    sortOrder: 47,
    translations: {
      tr: {
        name: "Vergi Planlaması ve Mali Müşavirlik",
        description:
          "Şirket kuruluşu, vergi avantajları, KDV/stopaj planlaması ve beyanname desteği.",
      },
      en: {
        name: "Tax Planning & Consulting",
        description: "Corporate tax strategy, international tax advisory, and fiscal compliance.",
      },
    },
  },
  {
    key: "startup-strategy-bizdev",
    sectorKey: "sector-business-finance",
    sortOrder: 48,
    translations: {
      tr: {
        name: "Girişim Stratejisi ve İş Planı",
        description: "Pazar giriş (GTM) stratejisi, iş modeli kanvası ve büyüme yol haritaları.",
      },
      en: {
        name: "Startup Strategy & Business Plan",
        description: "Go-to-market strategies, business model canvas, and growth roadmapping.",
      },
    },
  },
  {
    key: "project-management-agile",
    sectorKey: "sector-business-finance",
    sortOrder: 49,
    translations: {
      tr: {
        name: "Proje Yönetimi ve Çevik Danışmanlık",
        description: "Scrum/Agile koçluğu, Jira/ClickUp sistem kurulumu ve sprint operasyonları.",
      },
      en: {
        name: "Agile Project Management",
        description:
          "Scrum facilitation, Jira workflow design, roadmap execution, and sprint delivery.",
      },
    },
  },

  // --- 8. Hukuk, Mevzuat ve Fikri Mülkiyet (sector-legal-compliance) ---
  {
    key: "contract-drafting-review",
    sectorKey: "sector-legal-compliance",
    sortOrder: 50,
    translations: {
      tr: {
        name: "Sözleşme Hazırlama ve İnceleme",
        description:
          "Hizmet sözleşmeleri, gizlilik anlaşmaları (NDA), iş ortaklığı ve tedarik şartları.",
      },
      en: {
        name: "Contract Drafting & Review",
        description:
          "Master service agreements, NDAs, vendor terms, and customized commercial contracts.",
      },
    },
  },
  {
    key: "kvkk-gdpr-privacy",
    sectorKey: "sector-legal-compliance",
    sortOrder: 51,
    translations: {
      tr: {
        name: "KVKK, GDPR ve Veri Gizliliği Uyumu",
        description: "Aydınlatma metinleri, çerez politikası, veri envanteri ve regülasyon uyumu.",
      },
      en: {
        name: "GDPR & Privacy Compliance",
        description:
          "Privacy policies, cookie consent disclosures, and data protection impact assessments.",
      },
    },
  },
  {
    key: "trademark-ip-patent",
    sectorKey: "sector-legal-compliance",
    sortOrder: 52,
    translations: {
      tr: {
        name: "Marka Tescili ve Fikri Mülkiyet",
        description:
          "Marka araştırma ve başvuru süreci, patent, telif hakları ve itiraz savunmaları.",
      },
      en: {
        name: "Trademark, IP & Patent Filing",
        description:
          "Trademark filing, clearance searches, copyright protection, and IP portfolios.",
      },
    },
  },
  {
    key: "ecommerce-consumer-law",
    sectorKey: "sector-legal-compliance",
    sortOrder: 53,
    translations: {
      tr: {
        name: "E-Ticaret ve Tüketici Hukuku",
        description:
          "Mesafeli satış sözleşmeleri, iptal/iade prosedürleri ve pazar yeri yasal metinleri.",
      },
      en: {
        name: "E-Commerce & Consumer Terms",
        description:
          "Distance selling contracts, refund/cancellation policies, and platform terms.",
      },
    },
  },

  // --- 9. Mühendislik, Mimarlık ve 3D (sector-engineering-3d) ---
  {
    key: "game-development",
    sectorKey: "sector-engineering-3d",
    sortOrder: 54,
    translations: {
      tr: {
        name: "Oyun Geliştirme",
        description: "Unity, Unreal Engine, 2D/3D oyun mekanikleri ve grafik programlama.",
      },
      en: {
        name: "Game Development",
        description: "Unity, Unreal Engine, 2D/3D gameplay mechanics, and graphics programming.",
      },
    },
  },
  {
    key: "architectural-design-bim",
    sectorKey: "sector-engineering-3d",
    sortOrder: 55,
    translations: {
      tr: {
        name: "Mimari Proje, Plan ve BIM",
        description: "AutoCAD mimari çizimler, kat planları, Revit ve ruhsat projeleri.",
      },
      en: {
        name: "Architectural Design & BIM",
        description:
          "AutoCAD architectural plans, floor layouts, Revit modeling, and permit drawings.",
      },
    },
  },
  {
    key: "interior-design-rendering",
    sectorKey: "sector-engineering-3d",
    sortOrder: 56,
    translations: {
      tr: {
        name: "İç Mimari ve 3D Fotogerçekçi Render",
        description:
          "3ds Max, Corona, V-Ray ile mekan modelleme, aydınlatma ve gerçekçi görselleştirme.",
      },
      en: {
        name: "Interior Design & 3D Rendering",
        description:
          "Photorealistic 3D interior renders, lighting design, and material visualization.",
      },
    },
  },
  {
    key: "3d-product-modeling",
    sectorKey: "sector-engineering-3d",
    sortOrder: 57,
    translations: {
      tr: {
        name: "3D Ürün Modelleme ve CAD",
        description:
          "SolidWorks, Fusion 360 ile endüstriyel tasarım ve 3D baskıya uygun (STL) modelleme.",
      },
      en: {
        name: "3D Product Modeling & CAD",
        description: "Industrial CAD modeling, SolidWorks mechanical design, and 3D printing prep.",
      },
    },
  },

  // --- 10. Sanal Asistanlık ve Operasyon (sector-operations-support) ---
  {
    key: "executive-virtual-assistant",
    sectorKey: "sector-operations-support",
    sortOrder: 58,
    translations: {
      tr: {
        name: "Yönetici Asistanlığı ve Takvim Yönetimi",
        description:
          "E-posta yanıtlanması, toplantı organizasyonu, seyahat planlama ve günlük ajanda.",
      },
      en: {
        name: "Executive Virtual Assistant",
        description:
          "Calendar management, email triage, travel booking, and executive administrative tasks.",
      },
    },
  },
  {
    key: "customer-support-crm",
    sectorKey: "sector-operations-support",
    sortOrder: 59,
    translations: {
      tr: {
        name: "Müşteri Hizmetleri ve Canlı Destek",
        description: "Zendesk, Freshdesk, canlı sohbet yönetimi ve müşteri taleplerinin çözülmesi.",
      },
      en: {
        name: "Customer Support & Ticketing",
        description:
          "Helpdesk support, live chat resolution, SLA monitoring, and customer success.",
      },
    },
  },
  {
    key: "data-entry-web-research",
    sectorKey: "sector-operations-support",
    sortOrder: 60,
    translations: {
      tr: {
        name: "Veri Girişi ve Kapsamlı Web Araştırması",
        description:
          "Excel veri girişi, pazar araştırması, rakip listeleme ve veri zenginleştirme.",
      },
      en: {
        name: "Data Entry & Web Research",
        description:
          "Accurate spreadsheet data entry, web mining, lead list building, and data scrubbing.",
      },
    },
  },
];
