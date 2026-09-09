export interface DemoUser {
  id: string;
  email: string;
  password: string;
  role: "USER" | "ADMIN" | "MODERATOR";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  emailVerified: boolean;
  phoneVerified: boolean;
  profile: {
    handle: string;
    displayName: string;
    about: string;
    showLocation: boolean;
    locale: string;
    theme: string;
  };
}

export const DEFAULT_USER: DemoUser = {
  id: "d0000000-0000-0000-0000-000000000001",
  email: "kullanici@operis.pro",
  password: "OperisUser2026!",
  role: "USER",
  status: "ACTIVE",
  emailVerified: true,
  phoneVerified: true,
  profile: {
    handle: "demokullanici",
    displayName: "Demir Yıldız",
    about: "Kıdemli Yazılım Mühendisi & Teknoloji Profesyoneli",
    showLocation: true,
    locale: "tr",
    theme: "dark",
  },
};
