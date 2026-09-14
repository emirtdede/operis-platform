export interface SeedUser {
  id: string;
  email: string;
  passwordPlain: string;
  role: "USER" | "ADMIN" | "MODERATOR";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  emailVerified: boolean;
  profile: {
    handle: string;
    displayName: string;
    about: string;
    avatarUrl?: string | null;
    showLocation: boolean;
    revealPhoneAfterMatch: boolean;
    locale: string;
    theme: string;
    trackedSkills: string[];
  };
  privateIdentity: {
    firstName: string;
    lastName: string;
    dob: string;
    phoneE164: string;
    countryCode: string;
    city: string;
  };
}

export const SEED_USERS: SeedUser[] = [
  {
    id: "d0000000-0000-0000-0000-000000000001",
    email: "kullanici@operis.pro",
    passwordPlain: "OperisUser2026!",
    role: "USER",
    status: "ACTIVE",
    emailVerified: true,
    profile: {
      handle: "demokullanici",
      displayName: "Demir Yıldız",
      about: "Kıdemli Yazılım Mühendisi & Teknoloji Profesyoneli",
      avatarUrl: null,
      showLocation: true,
      revealPhoneAfterMatch: false,
      locale: "tr",
      theme: "dark",
      trackedSkills: ["Next.js", "TypeScript", "Tailwind CSS", "PostgreSQL", "React"],
    },
    privateIdentity: {
      firstName: "Demir",
      lastName: "Yıldız",
      dob: "1990-01-15",
      phoneE164: "+905551112233",
      countryCode: "TR",
      city: "İstanbul",
    },
  },
  {
    id: "d0000000-0000-0000-0000-000000000002",
    email: "freelancer@operis.pro",
    passwordPlain: "OperisFreelancer2026!",
    role: "USER",
    status: "ACTIVE",
    emailVerified: true,
    profile: {
      handle: "kaanarslan",
      displayName: "Kaan Arslan",
      about:
        "Full-Stack Mühendis & UI/UX Tasarımcısı. Modern web ve mobil uygulamalar geliştiriyorum.",
      avatarUrl: null,
      showLocation: true,
      revealPhoneAfterMatch: true,
      locale: "tr",
      theme: "dark",
      trackedSkills: ["Flutter", "Dart", "Go", "Docker", "PostgreSQL", "React"],
    },
    privateIdentity: {
      firstName: "Kaan",
      lastName: "Arslan",
      dob: "1994-06-20",
      phoneE164: "+905552223344",
      countryCode: "TR",
      city: "Ankara",
    },
  },
  {
    id: "d0000000-0000-0000-0000-000000000003",
    email: "admin@operis.pro",
    passwordPlain: "OperisAdmin2026!",
    role: "ADMIN",
    status: "ACTIVE",
    emailVerified: true,
    profile: {
      handle: "operisadmin",
      displayName: "Operis Yönetici",
      about: "Operis Platform Yönetim ve Operasyon Ekibi",
      avatarUrl: null,
      showLocation: false,
      revealPhoneAfterMatch: false,
      locale: "tr",
      theme: "dark",
      trackedSkills: ["Operations", "Moderation", "Security"],
    },
    privateIdentity: {
      firstName: "Operis",
      lastName: "Admin",
      dob: "1988-11-03",
      phoneE164: "+905553334455",
      countryCode: "TR",
      city: "İstanbul",
    },
  },
];
