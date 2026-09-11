export interface SeedCategory {
  key: string;
  sortOrder: number;
  translations: {
    tr: { name: string; description: string };
    en: { name: string; description: string };
  };
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    key: "web-development",
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
    key: "mobile-development",
    sortOrder: 2,
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
    sortOrder: 3,
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
    key: "backend-api",
    sortOrder: 4,
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
    key: "frontend-ui",
    sortOrder: 5,
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
    key: "ai-ml",
    sortOrder: 6,
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
    sortOrder: 7,
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
    key: "devops-cloud",
    sortOrder: 8,
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
    key: "cybersecurity",
    sortOrder: 9,
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
    sortOrder: 10,
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
    key: "ui-ux-design",
    sortOrder: 11,
    translations: {
      tr: {
        name: "UI/UX Tasarım",
        description: "Kullanıcı deneyimi araştırması, tel kafes, prototip ve arayüz tasarımı.",
      },
      en: {
        name: "UI/UX Design",
        description: "User experience research, wireframing, prototyping, and UI design.",
      },
    },
  },
  {
    key: "automation-integrations",
    sortOrder: 12,
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
    key: "database",
    sortOrder: 13,
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
    key: "game-development",
    sortOrder: 14,
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
    key: "it-systems-network",
    sortOrder: 15,
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
    sortOrder: 16,
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
    key: "embedded-iot",
    sortOrder: 17,
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
    key: "blockchain",
    sortOrder: 18,
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
    key: "technical-consulting",
    sortOrder: 19,
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
    key: "other-technology",
    sortOrder: 20,
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
];
