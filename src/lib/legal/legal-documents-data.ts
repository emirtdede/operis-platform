export interface LegalSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocumentModel {
  key: string;
  title: string;
  subtitle: string;
  version: string;
  lastUpdated: string;
  badge: string;
  highlight: string;
  contentHash?: string;
  sections: LegalSection[];
}

export const LEGAL_DOCUMENTS: Record<string, Record<"tr" | "en", LegalDocumentModel>> = {
  terms: {
    tr: {
      key: "terms",
      title: "Kullanım Koşulları",
      subtitle: "Operis Teknoloji Anonim Şirketi — Yasal Kullanım Şartları",
      version: "v1.0",
      contentHash: "c9a1d84f932e5b7194f1c93a401b2fe0f7e8a9c3b2e5d8f4a1c6e9b2d5f8a3c7",
      lastUpdated: "07.09.2026",
      badge: "Hukuki Güvence & Aracı Hizmet Sağlayıcı",
      highlight:
        "Platform yalnızca tarafları bir araya getiren bağımsız bir keşif ağıdır. Komisyon kesmez (%0 komisyon), emanetçi (escrow) veya ödeme kuruluşu değildir, taraflar arasındaki sözleşmenin tarafı ve garantörü olamaz.",
      sections: [
        {
          title: "1. Taraflar ve Hizmetin Hukuki Niteliği",
          paragraphs: [
            'İşbu Kullanım Koşulları ("Sözleşme"), Operis Teknoloji A.Ş. ("Platform") ile sisteme üye olan kullanıcı ("Kullanıcı") arasında akdedilmiştir.',
            "Platform; 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun ve 5651 sayılı Kanun uyarınca münhasıran bir 'Aracı Hizmet Sağlayıcı' ve 'Yer Sağlayıcı' niteliğindedir.",
          ],
          bullets: [
            "Platform, Kullanıcılar tarafından paylaşılan proje veya teklif içeriklerinin doğruluğunu araştırmakla yükümlü değildir.",
            "Kullanıcılar sisteme girdikleri tüm verilerin hukuki ve cezai sorumluluğunu şahsen üstlenir.",
          ],
        },
        {
          title: "2. İş İlişkisinin ve Temsilciliğin Kesin Reddi",
          paragraphs: [
            "Platform ile Kullanıcılar arasında veya Kullanıcıların kendi aralarında hiçbir surette 4857 sayılı İş Kanunu veya 5510 sayılı Sosyal Sigortalar Kanunu kapsamında işçi-işveren, alt işveren veya asıl işveren ilişkisi kurulamaz.",
          ],
          bullets: [
            "Platform, bir özel istihdam bürosu (İŞKUR aracısı) veya iş bulma ajansı değildir.",
            "Kullanıcılar bağımsız girişimci / yüklenici statüsündedir; hiçbir vekalet, temsilcilik veya adi ortaklık doğmaz.",
          ],
        },
        {
          title: "3. Emanet (Escrow), Ödeme ve Vergi Sorumsuzluğu",
          paragraphs: [
            "Platform para tutmaz, emanet hesabı (escrow) sunmaz, hakediş dağıtmaz ve komisyon kesintisi yapmaz (%0 Komisyon).",
            "Mali ve vergisel yükümlülükler tamamen tarafların uhdesindedir:",
          ],
          bullets: [
            "Her türlü ödeme doğrudan tarafların kendi aralarında kararlaştıracağı banka veya yasal finans kanalları üzerinden yapılır.",
            "Faturalandırma, KDV, stopaj, serbest meslek makbuzu (SMM) ve gelir vergisi beyanları tarafların şahsi mükellefiyetindedir.",
          ],
        },
        {
          title: "4. Yazılım Kalitesi, Güvenlik Zafiyetleri ve Siber Olaylar",
          paragraphs: [
            "Freelancer tarafından teslim edilen yazılımların çalışabilirliği, kalitesi, performans düzeyi veya siber güvenlik zafiyeti (backdoor, zero-day, malware vb.) içermemesi hususunda Platform hiçbir garanti vermez.",
            "Kaynak kod denetimi, penetrasyon testleri ve kabul testlerinin (UAT) yürütülmesi münhasıran İşveren'in sorumluluğundadır.",
          ],
        },
        {
          title: "5. Fikri Mülkiyet Hakları (5846 Sayılı FSEK)",
          paragraphs: [
            "Kod, tasarım ve mimari üzerindeki telif ve fikri hakların devri, 5846 sayılı FSEK uyarınca tarafların kendi aralarında bağımsız olarak akdedeceği yazılı sözleşmelere tabidir. Platform telif uyuşmazlıklarının tarafı değildir.",
          ],
        },
        {
          title: "6. Azami Sorumsuzluk ve Tazminat Sınırı",
          paragraphs: [
            "Yürürlükteki mevzuatın izin verdiği azami ölçüde; ağır kusur ve kasıt halleri müstesna olmak üzere, Platform kâr kaybı, veri kaybı veya iş kesintisinden kaynaklanan hiçbir dolaylı veya arızi zarardan sorumlu tutulamaz.",
            "Platformun herhangi bir sebeple sorumlu tutulması halinde azami mali mesuliyeti, uyuşmazlık konusu işlem için Platform'a fiilen ödenen tutarla (0 TL) veya her halükarda azami 100 Türk Lirası ile sınırlıdır.",
          ],
        },
        {
          title: "7. Kullanıcının Rücu ve Tazmin Yükümlülüğü (Indemnity)",
          paragraphs: [
            "Kullanıcı; kanunları veya üçüncü kişi haklarını ihlal etmesi sebebiyle Platform aleyhine doğabilecek her türlü idari para cezası, tazminat ve dava masraflarını Platform'un ilk talebi üzerine faiziyle birlikte nakden ve defaten ödemeyi kabul ve taahhüt eder.",
          ],
        },
        {
          title: "8. Yetkili Mahkeme ve Delil Sözleşmesi",
          paragraphs: [
            "İşbu Sözleşme Türkiye Cumhuriyeti Kanunlarına tabidir. Doğabilecek her türlü uyuşmazlıkta İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri münhasıran yetkilidir.",
            "HMK m. 193 uyarınca; Platformun sunucu kayıtları, kriptografik SHA-256 onay özetleri ve veri tabanı logları kesin ve bağlayıcı delil niteliğindedir.",
          ],
        },
      ],
    },
    en: {
      key: "terms",
      title: "Terms of Service",
      subtitle: "Operis Teknoloji Anonim Sirketi — Binding User Terms",
      version: "v1.0",
      contentHash: "f7e8a9c3b2e5d8f4a1c6e9b2d5f8a3c7c9a1d84f932e5b7194f1c93a401b2fe0",
      lastUpdated: "07.09.2026",
      badge: "Intermediary Protection & Legal Disclaimer",
      highlight:
        "The Platform is strictly an independent information society matching network. We take 0% commission, do not hold funds in escrow, and are not party or guarantor to contracts between users.",
      sections: [
        {
          title: "1. Parties and Intermediary Status",
          paragraphs: [
            "This Agreement is between Operis Teknoloji A.S. ('Platform') and the registered user ('User').",
            "The Platform operates exclusively as an intermediary service and hosting provider under applicable digital commerce statutes.",
          ],
          bullets: [
            "The Platform is not obligated to pre-screen or verify user-generated postings or proposals.",
            "Users bear full civil and criminal liability for their published content and communications.",
          ],
        },
        {
          title: "2. Disavowal of Employment and Agency",
          paragraphs: [
            "No employer-employee, agency, partnership, or labor relationship is created between the Platform and Users under applicable labor codes.",
            "The Platform is not an employment agency or staffing firm; no guarantee of placement, hire, or revenue is given.",
          ],
        },
        {
          title: "3. Financial & Tax Disclaimers",
          paragraphs: [
            "The Platform never holds funds in custody or escrow and takes 0% commission from project contracts.",
            "All payments and statutory tax obligations (VAT, reverse charges, withholding, invoices) are handled directly between users.",
          ],
        },
        {
          title: "4. Code Quality & Security Disclaimers",
          paragraphs: [
            "The Platform provides zero warranty regarding source code defects, security flaws, backdoors, malware, or open-source license infringements.",
            "Source code reviews, penetration testing, and user acceptance testing (UAT) are strictly the client's sole responsibility.",
          ],
        },
        {
          title: "5. Limitation of Liability",
          paragraphs: [
            "To the maximum extent permitted by applicable law, the Platform shall not be liable for any consequential, indirect, punitive, or loss-of-profit damages.",
            "In any event, the Platform's total aggregate liability is capped at the amount paid by User to Platform (0 USD / 0 TRY) or 100 TRY maximum.",
          ],
        },
        {
          title: "6. Governing Law & Jurisdiction",
          paragraphs: [
            "Governed by the laws of the Republic of Turkey. Central courts of Istanbul (Caglayan) have exclusive jurisdiction.",
            "Server logs, audit trails, and SHA-256 hashes constitute definitive, conclusive legal evidence.",
          ],
        },
      ],
    },
  },
  privacy: {
    tr: {
      key: "privacy",
      title: "Gizlilik ve KVKK Aydınlatma Metni",
      subtitle: "6698 Sayılı KVKK Madde 10 ve GDPR Kapsamında Bilgilendirme",
      version: "v1.0",
      contentHash: "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
      lastUpdated: "07.09.2026",
      badge: "AES-256 Şifreli • KVKK Uyumlu",
      highlight:
        "T.C. Kimlik Numarası (TCKN), biyometrik veri veya adli sicil kaydı asla toplanmaz. Telefon numaranız ve yasal kimlik verileriniz uygulama katmanında AES-256-GCM ile şifrelenir, e-posta adresiniz hesap kimliği olarak güvenli saklanır; iletişim verileriniz karşılıklı eşleşme olmadan karşı tarafa kesinlikle açılmaz.",
      sections: [
        {
          title: "1. Veri Sorumlusunun Kimliği",
          paragraphs: [
            "6698 sayılı Kişisel Verilerin Korunması Kanunu ('KVKK') uyarınca veri sorumlusu Operis Teknoloji Anonim Şirketi'dir.",
          ],
        },
        {
          title: "2. İşlenen Veriler ve Veri Minimizasyonu",
          paragraphs: ["Sistemimiz yalnızca hizmetin ifası için asgari düzeydeki verileri işler:"],
          bullets: [
            "Kimlik & İletişim: Yasal ad, soyad, doğum tarihi (18+ yaş teyidi için), ikamet ili/ülkesi, doğrulanmış e-posta ve telefon.",
            "İşlem Güvenliği: Scrypt parola özetleri, oturum token'ları, SHA-256 onay logları, IP adresleri.",
            "Toplanmayan Veriler: TCKN, nüfus cüzdanı fotokopisi, adli sicil, dini inanç, sağlık veya biyometrik veriler asla toplanmaz.",
          ],
        },
        {
          title: "3. İşleme Amaçları ve Hukuki Sebepler",
          paragraphs: [
            "Verileriniz KVKK m. 5 uyarınca; sözleşmenin kurulması ve ifası (üyelik, ilan, şifreli teklifler), kanuni yükümlülükler (5651 s. erişim logları) ve meşru menfaat (dolandırıcılık tespiti, siber güvenlik) kapsamında işlenir.",
          ],
        },
        {
          title: "4. Kriptografik Koruma: AES-256-GCM ve Kör İndeksleme",
          paragraphs: [
            "Hassas veriler veri tabanına yazılmadan önce uygulama katmanında AES-256-GCM ile şifrelenir. Fiziksel sızıntılarda veriler okunamaz.",
            "Telefon numaralarının tekilliği, verinin kendisi açılmadan özel HMAC-SHA256 kör indeksleme (blind indexing) ile denetlenir.",
          ],
        },
        {
          title: "5. Veri Aktarımı ve Satış Yasağı",
          paragraphs: [
            "Platform kişisel verilerinizi asla üçüncü kişilere satmaz veya pazarlamacılara kiralamaz.",
            "İletişim bilgileriniz eşleşme teyit edilene kadar rakiplere ve ilan sahibine kapalı tutulur. Yalnızca teklif kabul edildiğinde tarafların birbirine iletişim bilgisi açılır.",
          ],
        },
        {
          title: "6. İlgili Kişinin Hakları (KVKK Madde 11)",
          paragraphs: [
            "Verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini isteme, silinmesini veya yok edilmesini talep etme haklarına sahipsiniz.",
            "Taleplerinizi kvkk@operis.pro adresine iletebilirsiniz. Başvurular 30 gün içinde ücretsiz sonuçlandırılır.",
          ],
        },
      ],
    },
    en: {
      key: "privacy",
      title: "Privacy Notice",
      subtitle: "Notice Pursuant to Turkish Data Protection Law (KVKK) & GDPR",
      version: "v1.0",
      contentHash: "b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0a1",
      lastUpdated: "07.09.2026",
      badge: "AES-256 Encrypted • Privacy by Design",
      highlight:
        "We strictly never collect national ID numbers (TCKN) or biometric data. Phone numbers and legal identity details are encrypted with AES-256-GCM, while account emails are stored securely for authentication; contact details are never revealed until mutual offer acceptance.",
      sections: [
        {
          title: "1. Data Controller",
          paragraphs: [
            "Operis Teknoloji Anonim Sirketi acts as data controller under applicable privacy statutes.",
          ],
        },
        {
          title: "2. Data Minimization",
          paragraphs: [
            "We collect only essential identity (first/last name, birthdate for 18+ check) and contact details (email, phone). National IDs and sensitive biometric data are strictly prohibited and never collected.",
          ],
        },
        {
          title: "3. Cryptographic Security",
          paragraphs: [
            "Application-level AES-256-GCM encryption for stored names and phone numbers.",
            "HMAC-SHA256 blind indexing for phone lookup without decryption.",
            "Salted Scrypt key derivation for password security.",
          ],
        },
        {
          title: "4. Zero Sale of Data",
          paragraphs: [
            "We never sell, rent, or trade personal data to marketing brokers or third parties.",
            "Contact data remains shielded until mutual project match confirmation.",
          ],
        },
        {
          title: "5. Data Subject Rights",
          paragraphs: [
            "You may exercise your rights to access, rectification, and erasure by emailing kvkk@operis.pro.",
          ],
        },
      ],
    },
  },
  "matching-disclaimer": {
    tr: {
      key: "matching-disclaimer",
      title: "Eşleştirme ve Sorumluluk Reddi",
      subtitle: "Platform Rolü ve Mali/Hukuki Muafiyet Bildirimi",
      version: "v1.0",
      contentHash: "c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0a1b2",
      lastUpdated: "07.09.2026",
      badge: "Kesin Sorumluluk Reddi • Aracı Muafiyeti",
      highlight:
        "Platform; para toplamaz, ödeme tutmaz, emanetçi (escrow) hizmeti sunmaz, sözleşmelerin garantörü veya tarafı değildir, taraflar arasındaki ticari uyuşmazlıklarda hakemlik veya mahkeme rolü üstlenmez.",
      sections: [
        {
          title: "1. Ödeme Almaz ve Tutmaz",
          paragraphs: [
            "Kullanıcılar arasında hiçbir para transferi platform üzerinden gerçekleştirilmez. Platform emanet hesabı (escrow), dijital cüzdan, ödeme garantisi veya alacak sigortası sunmaz.",
            "Platform 6493 sayılı Kanun kapsamında bir ödeme veya elektronik para kuruluşu değildir.",
          ],
        },
        {
          title: "2. Hizmet Sözleşmesinin Tarafı Değildir",
          paragraphs: [
            "İlan sahibi ile teklif veren arasındaki teklif kabulü bir eşleşme ve doğrudan iletişim kanalı açma işlemidir.",
            "Bu işlem platformun taraf, kefil veya garantör olduğu bir nihai hizmet sözleşmesi teşkil etmez. Taraflar arasındaki hukuki ilişki doğrudan kendi aralarındadır.",
          ],
        },
        {
          title: "3. Ticari Uyuşmazlık Çözümü Sağlamaz",
          paragraphs: [
            "Kullanıcılar arasındaki ticari, hukuki, teknik veya mali anlaşmazlıklar kullanıcıların kendi aralarında veya yetkili adli merciler önünde çözümlenir; platform hakemlik, tahkim, arabuluculuk veya mahkeme rolü üstlenmez.",
          ],
        },
        {
          title: "4. Bağımsız Anlaşma Yükümlülüğü",
          paragraphs: [
            "Taraflar proje kapsamını, ücretini, teslimat aşamalarını, ödeme yöntemini, fatura ve vergi yükümlülüklerini ve varsa yazılı sözleşmelerini bağımsız olarak doğrudan kendi aralarında belirlemekle yükümlüdür.",
          ],
        },
        {
          title: "5. Kod Zafiyetleri ve Siber Güvenlik Sorumsuzluğu",
          paragraphs: [
            "Freelancer tarafından üretilen ve teslim edilen kod veya mimarilerin güvenlik açığı, arka kapı veya malware içermemesine yönelik olarak Platform hiçbir garanti vermez.",
            "Yazılımın penetrasyon testleri ve kabul denetimleri tamamen İşveren'in sorumluluğundadır.",
          ],
        },
        {
          title: "6. Yürürlük ve Kabul",
          paragraphs: [
            "Yürürlükteki mevzuatın izin verdiği azami ölçüde; kullanıcılar bu şartları peşinen kabul ederek platform hizmetlerinden faydalanır.",
          ],
        },
      ],
    },
    en: {
      key: "matching-disclaimer",
      title: "Matching & Liability Disclaimer",
      subtitle: "Platform Role and Commercial Exemption Notice",
      version: "v1.0",
      contentHash: "d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0a1b2c3",
      lastUpdated: "07.09.2026",
      badge: "Absolute Disclaimer • Intermediary Status",
      highlight:
        "The Platform does not hold funds, operate escrow, or act as party/guarantor to any project contract, nor does it adjudicate counterparty disputes.",
      sections: [
        {
          title: "1. Does Not Receive or Hold Funds",
          paragraphs: [
            "No financial transactions take place through the platform. The platform does not provide escrow, wallet, or payment guarantees.",
          ],
        },
        {
          title: "2. Is Not Party to Service Contracts",
          paragraphs: [
            "Offer acceptance opens a private match and bilateral communication channel. It does not constitute a platform-guaranteed contract.",
          ],
        },
        {
          title: "3. Does Not Adjudicate Commercial Disputes",
          paragraphs: [
            "Disputes regarding deliverables or payments must be settled directly between counterparties or before competent judicial authorities; the platform does not act as an arbitrator.",
          ],
        },
        {
          title: "4. Independent Duty to Agree Terms",
          paragraphs: [
            "Users are directly responsible for agreeing project milestones, payment channels, invoicing/tax duties, and written contracts outside the platform.",
          ],
        },
        {
          title: "5. Code Security Disclaimer",
          paragraphs: [
            "The Platform provides zero warranty that deliverables are free from zero-day vulnerabilities or backdoors. Code audits are strictly the client's sole responsibility.",
          ],
        },
      ],
    },
  },
};
