# Operis — Kod çalışma mantığı ve bağlantı denetimi

**Tarih:** 11 Eylül 2026  
**İncelenen durum:** Denetim başlangıcındaki temiz Git çalışma ağacı.  
**İşlem sınırı:** Uygulama, test, şema, migration ve yapılandırma kodlarına dokunulmadı. Yalnızca bu rapor oluşturuldu. Önceki `CODE_LOGIC_AUDIT_REPORT.md` değiştirilmedi.

## Sonuç

Kodda derleme/tip hatasından bağımsız önemli iş mantığı sorunları bulunuyor. En ciddi bulgu, **e-posta doğrulama token’ının oturum token’ı olarak kabul edilmesi**. Yönetim ekranlarında sunucuya hiç bağlanmayan işlemler, migration eksikleri, eşzamanlı işlemlerde bozulan durum geçişleri ve üretimde hataları başarıya dönüştüren bellek yedekleri de mevcut.

Bu rapor 50 bulgu grubunu içerir. Aynı kök nedene bağlı alt sorunlar birlikte verilmiştir. “Tüm sorunların kesin olarak bulunduğu” iddiası değildir: canlı PostgreSQL ve gerçek servislerle uçtan uca test yapılmadan özellikle eşzamanlılık ve dağıtım davranışları bütünüyle doğrulanamaz.

## Yöntem ve doğrulama

İnceleme; `src/app`, API route’ları, istemci bileşenleri, bütün ana servis modülleri, kimlik doğrulama/şifreleme yardımcıları, `db/schema`, iki SQL migration, seed/rotation/maintenance betikleri ve testlerin uygulamaya bağlantısı üzerinde yürütüldü. Kayıt → doğrulama → ilan → teklif → kabul → tamamlama → profil akışı ile moderasyon, bildirim ve hesap silme akışları karşılaştırıldı. Yerel Next.js rehberlerinden `proxy.md` ve `server-actions.md` okundu; eski Next.js kabulleri üzerinden hata çıkarılmadı.

| Kontrol | Sonuç | Ne kanıtlar? |
|---|---|---|
| `pnpm test` | **32 dosya / 5.200 test başarılı** | Mevcut testlerin geçtiğini; gerçek DB yarışlarının doğru olduğunu değil |
| `pnpm exec tsc --noEmit --incremental false` | Başarılı | Mevcut ortamda tip uyumu |
| `pnpm exec eslint .` | Başarılı | Statik lint kurallarına uyum |
| `pnpm exec tsx scripts/check-i18n-parity.ts` | Sessiz çıkış; Windows giriş koşulu nedeniyle asıl kontrol çalışmıyor | B50’de açıklanan otomasyon açığı |
| Katalogların bağımsız, salt okunur anahtar karşılaştırması | TR=215 / EN=215; eksik anahtar yok | Çeviri anahtarı eşliği ayrıca doğrulandı |
| Yapay anahtar ve kullanıcıyla token deneyi | E-posta token’ı oturum doğrulayıcısından geçti | B01’in token katmanı doğrudan doğrulandı |
| Gerçek Zod şemalarıyla bellek içi deney | Boşluk ilanı ve `123xyz` bütçe kabul edildi | B21/B22 doğrudan doğrulandı |
| Canlı DB, gerçek e-posta/SMS, tarayıcı E2E, üretim build | Bu denetimde çalıştırılmadı | Bu katmanlara ilişkin bulgular kod/sözleşme incelemesidir |

Test çıktısında bazı senaryolar eksik ortam yapılandırması hatalarını yazdırıp yine geçti. Dolayısıyla test başarısı, gerçek veritabanı yolunun o senaryolarda çalıştığının kanıtı değildir. Gerçek hesaplara erişim, e-posta/SMS gönderimi, migration veya veri silme işlemi yapılmadı. Kanıt deneylerinde yalnızca yapay bilgiler kullanıldı.

**Öncelikler:** Kritik = kimlik doğrulama atlatma; Yüksek = ana akış, yetki veya kalıcı veri bütünlüğü sorunu; Orta = koşullu işlev kaybı/tutarsızlık; Düşük = sınırlı kullanım/bakım sorunu. “Kodla doğrulandı” ifadesi canlı ortamda istismar edildiği anlamına gelmez.

## A. Kimlik doğrulama ve hesap güvenliği

### B01 — E-posta doğrulama token’ı oturum olarak kullanılabiliyor — Kritik

**Konum:** `src/modules/auth/session.ts:48`, `:86`, `:99`; `src/modules/auth/verification.ts:26`.

İki token aynı `AUTH_SECRET` ile aynı `base64url(payload).HMAC` biçiminde imzalanıyor. `verifySessionToken`, token amacını veya oturum payload şemasını doğrulamıyor; yalnızca imza ve süreyi kontrol ediyor. E-posta token’ında `userId`, `email`, `expiresAt` bulunduğu için kabul ediliyor. `getVerifiedSession` daha sonra eksik rol/durumu DB’den tamamlıyor.

**Senaryo/etki:** Aktif bir hesabın geçerli e-posta doğrulama token’ına sahip kişi, bunu session cookie değeri olarak kullandığında parola ve normal girişteki 2FA kontrolünden geçmeden o hesap için oturum elde edebilir. Bu bulgu token’ın tahmin edilebilir olduğu anlamına gelmez; farklı amaçla verilen token’ın daha güçlü yetki sağlamasıdır.

**Kanıt:** Gerçek fonksiyonlarla, yapay anahtar altında `verifySessionToken(createEmailVerificationToken(...))` sonucu null olmadı ve kullanıcı kimliği korundu. Tam HTTP/DB zinciri çalıştırılmadı; onu tamamlayan kod ayrıca incelendi.

**Düzeltme yönü:** Token amaçlarını kesin ayırmak; zorunlu `type`/`audience` ve payload doğrulaması yapmak; tercihen farklı türetilmiş anahtarlar kullanmak. DB’de aktif kullanıcı bulmak token amacını doğrulamanın yerine geçmemeli.

### B02 — Etkin 2FA, eski faktör doğrulanmadan başka secret ile değiştirilebiliyor — Yüksek

**Konum:** `src/app/api/auth/2fa/route.ts:74` ve `enabled` dalı.

Kapatma dalı artık parola/TOTP istiyor; fakat `enabled: true` dalı hesabın zaten 2FA kullanıp kullanmadığını kontrol etmiyor. İstemcinin gönderdiği yeni secret ile yine istemcinin gönderdiği kod doğrulanıp mevcut secret üzerine yazılıyor.

**Senaryo/etki:** Ele geçirilmiş bir oturumla saldırgan kendi ürettiği secret ve ona uygun kodu göndererek mevcut ikinci faktörü değiştirebilir. Ardından yeni faktörle kapatma işlemi de yapılabilir. Kapatmaya eklenen yeniden doğrulama bu yolla aşılmış olur.

**Düzeltme yönü:** İlk kurulum ve faktör değiştirme işlemlerini ayırmak; değişimde mevcut faktör veya güçlü yeniden kimlik doğrulama istemek; kurulum secret’ını sunucudaki süreli kurulum kaydıyla bağlamak.

### B03 — Parola değişimi/sıfırlaması eski oturumları geçersiz kılmıyor — Yüksek

**Konum:** `src/modules/auth/session.ts:6`, `:99`; `src/app/api/auth/change-password/route.ts`; `src/app/api/auth/reset-password/route.ts`.

Oturum doğrulamasında yalnızca hesap durumu ve rol yeniden okunuyor. Parola güncelleme zamanı, session version veya iptal kaydı yok. Parola değiştirmek/sıfırlamak sadece `passwordHash` ve `updatedAt` güncelliyor.

**Etki:** Daha önce alınmış/çalınmış cookie, parola değiştirildikten sonra da yedi günlük ömrünü sürdürebilir. Sıfırlama token’ının tek kullanım kontrolü düzeltilmiş olsa da oturum iptali çözülmemiştir.

**Düzeltme yönü:** Oturum sürümü veya `credentialsChangedAt` kontrolü ve parola sıfırlamasında eski oturumların iptali.

### B04 — Yönetici master-key girişi kişisel parola ve 2FA’yı atlıyor; bazı durumlarda sahte başarı veriyor — Yüksek

**Konum:** `src/app/api/admin/auth/session/route.ts:13`; `src/modules/admin/auth-guard.ts`.

Anahtarı bilen istemci hedef e-postayı seçebiliyor. Aktif bir DB yöneticisi bulunursa o kişinin ID’si/rolüyle, kişisel parolası ve etkin MFA’sı doğrulanmadan cookie üretiliyor. Anahtar ortak olduğundan gerçek işlemi hangi yönetici yaptığı ayrıştırılamıyor.

Kayıt bulunamadığında veya DB sorgusu hata verdiğinde de sabit `usr_admin_authorized` ile başarı yanıtı üretiliyor. Üretimde sonraki `getSession` DB kontrolü bu sahte kimliği reddeder; dolayısıyla eski rapordaki “istenen rol üretimde kesin kazanılır” iddiası güncel koda aynen uygulanamaz. Buradaki ikinci sorun, başarılı görünen fakat kullanılamayan giriş akışıdır.

**Düzeltme yönü:** Gerçek yönetici hesabının normal kimlik doğrulama ve MFA zinciri; sınırlı/acil erişim varsa ayrı, denetlenebilir prosedür; DB hatası veya eksik hesapta açık hata. Master-key endpoint’inde ayrıca istek limiti yok.

### B05 — Geliştirme reset token’ı üretimde de yanıta eklenebiliyor — Yüksek, yapılandırmaya bağlı

**Konum:** `src/app/api/auth/forgot-password/route.ts`, `devResetToken` koşulu.

`EXPOSE_DEV_RESET_TOKEN === "true"` koşulunun dışında bir `NODE_ENV !== "production"` zorunluluğu yok. Bu değişken üretimde yanlışlıkla açık kalırsa, parola sıfırlama isteyen istemci reset token’ını doğrudan JSON yanıtında alır; e-posta kutusuna erişim gerekmez.

**Düzeltme yönü:** Üretimde koşulsuz kapatma ve başlangıçta hatalı konfigürasyonu reddetme. Mevcut üretim değişkeninin açık olduğu doğrulanmadı.

### B06 — Telefon doğrulama akışı kullanıcı arayüzüne ve tekrar gönderime bağlanmamış — Yüksek

**Konum:** `src/app/api/auth/verify-phone/route.ts`; `src/modules/auth/service.ts:215`; `src/components/profile/profile-settings-form.tsx:365`.

OTP kayıt sırasında üretiliyor ve doğrulama endpoint’i var; fakat bileşenlerde `/api/auth/verify-phone` çağrısı veya OTP giriş ekranı bulunmuyor. E-posta/telefon doğrulamasını yeniden gönderen route da yok; token üretim çağrıları kayıt servisiyle sınırlı.

**Etki:** Kullanıcı telefonunu normal arayüzden doğrulayamaz. “Doğrulanmış telefonumu eşleşmede paylaş” ayarı açılsa bile iletişim servisindeki `phoneVerifiedAt` şartı nedeniyle telefon gösterilmez. İlk mesaj ulaşmazsa veya süre dolarsa kullanıcı akışı çıkmaza girer.

**Düzeltme yönü:** Doğrulama durumu, kod girişi ve limitli yeniden gönderim arayüz/API zinciri.

### B07 — SMS OTP yalnızca süreç belleğinde; doğrulamadan önce tüketiliyor — Yüksek

**Konum:** `src/modules/auth/verification.ts:22`, `:98`; `src/app/api/auth/verify-phone/route.ts`, `verifyPhoneOtp` sonrasındaki DB update.

OTP kaydı modül düzeyindeki `Map` içinde. Kayıt isteği ile doğrulama farklı instance’a giderse veya süreç yeniden başlarsa doğru kod bulunamaz. Ayrıca başarılı kontrol kaydı hemen siliyor; ardından DB güncellemesi başarısız olursa aynı doğru kodla tekrar denemek mümkün değil.

**Düzeltme yönü:** Süreli ve ortak bir doğrulama deposu; tüketme ve doğrulandı yazımının koordinasyonu. Yeniden gönderim eksikliği B06’da.

### B08 — Üretimde telefon doğrulaması gerektiren iş kuralları uygulanmıyor — Yüksek

**Konum:** `src/modules/listings/service.ts:210`; `src/modules/offers/service.ts`, üretim e-posta kontrolü; `src/modules/engagements/service.ts:528`; `docs/FREELANCE_PLATFORM_MASTER_SPEC.md:196`.

Spesifikasyon ilan yayınlama, teklif verme ve eşleşme iletişimi öncesinde doğrulanmış e-posta ve telefon istiyor. Yayın/teklif servisleri yalnızca e-postaya bakıyor. İletişim tarafında telefon alıcısının doğrulaması yerine sadece paylaşılacak telefonun doğrulaması kontrol ediliyor.

**Etki:** Telefonsuz doğrulama ile temel iş akışı kullanılabilir; ürünün tarif ettiği hesap güvence seviyesi sağlanmıyor.

**Düzeltme yönü:** Hesap uygunluk kontrolünü merkezi olarak uygulamak. Önce B06’yı tamamlamak gerekir; aksi halde bu kural kullanıcıları tamamen kilitler.

## B. Veritabanı, şablonlar ve kalıcı kayıt

### B09 — Şema ile migration’lar eşleşmiyor — Yüksek

**Konum:** `db/schema/index.ts:208`, `:280`, `:286`; `db/migrations/0000_unique_serpent_society.sql`; `db/migrations/0001_noisy_riptide.sql`.

Şemada `offer_templates` tablosu ve `listing_revisions_uniq_idx` / `offer_revisions_uniq_idx` indeksleri var. İki SQL migration ve snapshot’larda bunların karşılığı yok.

**Senaryo/etki:** Boş DB’ye yalnızca depodaki migration’lar uygulanırsa teklif şablonu işlemleri tablo bulunamadı hatası üretir. Servisin hatayı yutması nedeniyle bu kullanıcıya görünmeyebilir. Revizyonların aynı sıra numarasıyla tekrar yazılmasını önlediği sanılan DB garantileri de kurulmaz.

**Düzeltme yönü:** Şemaya uygun migration; temiz DB kurulum testi. Canlı DB’nin elle değiştirilmiş olup olmadığı bu incelemenin dışında.

### B10 — Başkasının teklif şablonu ID’siyle içerik güncellenebiliyor — Yüksek

**Konum:** `src/modules/offers/validation.ts`, `offerTemplateSchema.id`; `src/modules/offers/service.ts:1205`, `:1224`; `src/app/api/offers/templates/route.ts`.

İstemciden `id` kabul ediliyor. Insert conflict olduğunda yalnızca global `offerTemplates.id` hedefleniyor; update koşulunda sahip kullanıcı kontrolü yok. Session’dan userId alınması, conflict update’in başka kullanıcıya ait satıra uygulanmasını engellemiyor.

**Senaryo/etki:** A kullanıcısı B’ye ait şablon UUID’sini bildiğinde aynı ID ile POST yapıp B’nin mesaj/bütçe/süre alanlarını değiştirebilir. Bu, tablonun mevcut olduğu DB’de geçerlidir; B09 eksikliği erişim kontrolünün yerine geçmez.

**Düzeltme yönü:** Güncellemede `id AND userId`, yeni kayıtta sunucu üretimli ID; sahiplik doğrulanmadan upsert yapmamak.

### B11 — Şablon kaydetme/silme başarısı DB sonucunu temsil etmiyor — Yüksek

**Konum:** `src/modules/offers/service.ts:1168`, `:1205`, `:1247`; `src/app/api/offers/templates/route.ts`, DELETE.

Kaydetme önce belleğe yazıyor, DB hatasını üretimde de yutuyor ve başarı dönüyor. Sonraki GET, DB’de eski satırlar varsa onları gösteriyor; yeniden başlatmada bellek kaydı kayboluyor. Varsayılan `default-1` gibi ID’lerin UUID kolona yazılması da bu şekilde gizlenir.

Silme sonucu DB’nin sildiği satırdan değil bellek dizisinden hesaplanıyor. Yeni süreçte DB’deki özel şablon başarıyla silinse bile bellekte olmadığı için `false` dönüyor ve API 404 veriyor. Tersi durumda DB silinemese bile başarı dönebilir.

**Düzeltme yönü:** DB’yi tek doğruluk kaynağı yapmak; `returning`/etkilenen satır sonucunu kullanmak; üretimde bellek başarısına dönmemek.

### B12 — Toplu teklif idempotency mekanizması kalıcı veya atomik değil — Orta

**Konum:** `src/modules/offers/service.ts:82`, `:978`, `:995`, `:1088`.

Önbellek yalnızca işlem bittikten sonra belleğe yazılıyor. Aynı anahtarla eşzamanlı gelen iki istek de işleme başlayabilir; farklı instance’lar ve restart’lar aynı sonucu paylaşmaz. Aynı anahtarla farklı payload gönderilmesi de kontrol edilmiyor; eski yanıt yeni isteğe dönebilir. TTL veya kapasite sınırı yok.

**Etki:** Teklif unique indeksi bazı mükerrer insert’leri önlese de istemci aynı isteğe bir sefer başarı, diğer sefer “zaten teklif var” sonucu alabilir; kısmi batch sonucu güvenle tekrar elde edilemez.

**Düzeltme yönü:** Kullanıcı+anahtar için kalıcı, unique işlem kaydı; payload hash’i, işlem durumu ve tekrar oynatılabilir sonuç.

## C. Eşzamanlılık ve yaşam döngüsü

### B13 — Teklif kabul/geri çekme/ret/güncelleme birbirinin kararını ezebiliyor — Yüksek

**Konum:** `src/modules/offers/service.ts:429`, `:572`, `:700`; `src/modules/engagements/service.ts:115`, `:129`.

Durum önce okunup kontrol ediliyor; sonraki update çoğunlukla yalnızca teklif ID’sine göre yapılıyor. Kabul işlemi ilan satırını kilitliyor ama teklifin `PENDING` okuması bu kilitten önce ve teklif update’inde `PENDING` koşulu yok.

**Senaryo:** Kabul ve geri çekme aynı PENDING kaydı okur. Kabul eşleşmeyi oluşturur; geri çekme sonradan `WITHDRAWN` yazar. Sonuçta engagement’ın `acceptedOfferId` ile işaret ettiği teklif artık ACCEPTED değildir. Ters sırada geri çekilmiş teklif kabul edilebilir. Düzenleme de kabulden sonra kabul edilen fiyat/metni değiştirebilir.

**Düzeltme yönü:** Bütün karar yollarında ortak kilit sırası ve koşullu durum update’i; etkilenen satır kontrolü. Yalnızca kabul-kabul yarışına karşı ilan kilidi yeterli değil.

### B14 — Yeni teklif insert’i ilanı kapatan işlemlerle atomik değil — Yüksek

**Konum:** `src/modules/offers/service.ts:124`, ilan okuma ve daha sonraki insert transaction’ı.

İlanın ACTIVE/süre kontrolü transaction dışında. İlan okunup uygun bulunduktan sonra başka işlem onu eşleştirebilir, silebilir veya pasifleştirebilir; teklif insert’i ilanı yeniden doğrulamadan PENDING kayıt oluşturabilir.

**Etki:** Kapalı/eşleşmiş ilan altında sonradan oluşmuş bekleyen teklifler, yanlış bildirim ve yeni aktivasyon döngüsünü bloke eden kayıtlar.

**Düzeltme yönü:** İlan kilidi altında uygunluk+insert; aynı kilitleme protokolünü kapatma/kabul yollarında da uygulamak.

### B15 — İki taraf aynı anda tamamlayınca iş tamamlanmadan kalabiliyor — Yüksek

**Konum:** `src/modules/engagements/service.ts:608`, `:654`, `:694`.

Tamamlama transaction’ı engagement satırını kilitlemeden okuyor. Her taraf kendi ayrı mark satırını yazıp diğerinin henüz commit edilmemiş mark’ını göremeyebilir. İkisi de `bothComplete=false` hesaplayıp COMPLETION_PENDING bırakır; commit sonrasında iki mark da MARKED_COMPLETE olsa bile son durum yanlış kalır.

Tamamlandı ve itiraz işlemleri arasındaki yarış da eski mark görüntüsüne göre son durumu ezebilir.

**Düzeltme yönü:** Engagement bazında seri işlem/kilit; mark güncellemesinden sonra aynı transaction’da tutarlı yeniden hesaplama. Gerçek PostgreSQL ile iki bağlantılı eşzamanlı test gerekli.

### B16 — İlan pasifleştirme/silme/düzenleme/yenileme eski durum üzerinden yazıyor — Yüksek

**Konum:** `src/modules/listings/service.ts:426`, `:542`, `:715`, `:1174`.

Yetki ve durum kontrolleri transaction dışındaki okumalarda; yazımlar çoğunlukla sadece ilan ID’sine bağlı. Kullanıcı pasifleştirme için ACTIVE okuduktan sonra teklif kabul edilirse, sonraki update MATCHED ilanı INACTIVE_OWNER’a çevirebilir. Silme COMPLETED/MATCHED kontrolünü benzer biçimde atlatabilir; düzenleme de eşleşme sonrasında metni değiştirebilir.

İki yenileme aynı activationSeq üzerinden aynı yeni sıra numarasını ve mükerrer olay/bildirimi üretebilir. Revizyon numarası `max+1` hesaplaması da eşzamanlı düzenlemeler için güvenli değil; B09’daki eksik indeks bunu büyütüyor.

**Düzeltme yönü:** İlan kilidi ve durum/sürüm koşullu update; revizyon üretimini aynı kilit içinde tutmak.

### B17 — Eski expiry taraması yeni yayın döngüsünü kapatabiliyor — Yüksek

**Konum:** `src/modules/listings/service.ts:889`, özellikle `:917`.

Worker süresi dolmuş ilanları önce topluca okuyor. Sonraki transaction sadece `status=ACTIVE` kontrol ediyor; `activeUntil <= referenceTime` ve seçilen activationSeq yeniden kontrol edilmiyor.

**Senaryo:** Worker A eski ilanı seçer. Worker B ilanı kapatır, kullanıcı yeniden yayınlar. Worker A kaldığı yerden devam edip yeni ACTIVE döngüyü de süresi dolmuş kabul eder.

**Düzeltme yönü:** Süre ve activationSeq şartını update’e eklemek; geçerli döngü değişmişse atlamak.

### B18 — Moderasyon geçişleri geçmişi bozabiliyor ve eski teklifleri yeni döngüye taşıyor — Yüksek

**Konum:** `src/modules/admin/service.ts:1185`; `src/modules/engagements/service.ts:115`.

`moderateListing` geçerli kaynak durumları sınırlandırmıyor. MATCHED/COMPLETED ilan HIDE sonrası UNHIDE ile ACTIVE yapılabilir; engagement geçmişi aynı kalır. İlan tekrar teklif alır fakat yeni kabul “already matched” engeline takılır.

HIDE/DEACTIVATE, normal kullanıcı kapatma yolundaki gibi PENDING teklifleri sonlandırmıyor. Ardından yenilenen ilanda eski `listingActivationSeq` teklifleri kalıyor. Kabul servisi teklif döngüsüyle ilan döngüsünü karşılaştırmadığı için eski koşullardaki teklif kabul edilebilir.

**Düzeltme yönü:** Moderasyon görünürlüğünü iş yaşam döngüsünden ayırmak veya önceki durumu güvenle saklamak; teklif sonlandırma politikası ve kabulde döngü kontrolü.

### B19 — Hesap silme ile teklif kabulü ortak kilit kullanmıyor — Yüksek

**Konum:** `src/modules/privacy/service.ts:14`; `src/modules/engagements/service.ts:115`.

Silme aktif engagement olmadığını kontrol ediyor; fakat hesap/teklif/ilan kilitleriyle kabul işlemi koordine edilmiyor. Kabul de her iki hesabın güncel ACTIVE durumunu transaction içinde doğrulamıyor.

**Senaryo/etki:** Hesap silme aktif iş yokken başlar, eşzamanlı kabul yeni engagement üretir. Silinmiş kullanıcıya bağlı devam eden iş veya MATCHED engagement’a rağmen silinmiş ilan oluşabilir. Tek başına silme işleminin transaction olması bunu önlemez.

**Düzeltme yönü:** Kullanıcı uygunluğu ve kabul/silme işlemlerinin ortak kilit protokolüyle yürütülmesi.

## D. İlan/teklif arayüzü ve doğrulama

### B20 — İlan formundaki bazı cevaplar sunucuda kaybediliyor — Yüksek

**Konum:** `src/components/listings/listing-wizard-form.tsx:266`; `src/modules/listings/service.ts:245`; `src/modules/listings/wizard/schema.ts`.

Form `projectType`, `projectStage`, `workPreference`, `preferredLanguage` gönderiyor; şema bunları kabul ediyor. Insert ise bunları hiçbir kolona veya `answersJson` içine taşımıyor. Yalnızca `input.answers` saklanıyor.

**Etki:** Yeni geliştirme/bakım, mevcut aşama, uzaktan/yerinde çalışma ve tercih edilen dil seçimleri yayınlama sonrasında geri alınamaz. Ayrıca kaydedilen `authRequired/adminRequired/responsiveRequired` cevaplarının ilan detayında görünür sunumu bulunmuyor; kategorisel wizard template modülü gerçek form/validasyon zincirine bağlanmamış.

**Düzeltme yönü:** Kalıcı alan sözleşmesi; kategoriye göre cevap doğrulama ve detay ekranında gösterim.

### B21 — Boşluklarla minimum uzunluk kontrolleri aşılabiliyor — Yüksek

**Konum:** `src/modules/listings/wizard/schema.ts`; `src/modules/auth/validation.ts:51`; `src/modules/offers/validation.ts`.

İlan metinleri ve kayıt ad/şehir alanlarında `.min(...).trim()` sırası kullanılıyor. Minimum uzunluk ham metne uygulanıyor; trim sonrası tekrar kontrol yok. Teklif mesajlarında da boşluk içeriğini reddeden bir zorunluluk yok.

**Kanıt:** Gerçek `listingWizardSchema` ile 20/80/200 boşluk içeren başlık/özet/kapsam kabul edildi; parse sonucunda üçünün uzunluğu da **0** oldu. DB’de NOT NULL kısıtı boş string’i engellemez.

**Düzeltme yönü:** Önce normalize/trim, sonra anlamlı metin ve uzunluk kontrolü; API’de aynı kural.

### B22 — İlan bütçe düzenlemesi son kaydın bütünlüğünü doğrulamıyor — Yüksek

**Konum:** `src/modules/listings/wizard/schema.ts`, `updateListingInputSchema`; `src/modules/listings/service.ts:1174`; `src/components/listings/listing-edit-form.tsx:91`.

Min–max karşılaştırması yalnızca iki değer de request’te varsa yapılıyor. DB’de min=50/max=100 olan ilanda sadece min=200 gönderilebilir. FIXED_RANGE ilanının iki bütçesi null yapılabilir veya miktarsız EXACT moda geçilebilir. Yayınlama şemasındaki zorunluluklar güncellemede korunmuyor.

`parseFloat` ile sayısallık kontrolü `123xyz` değerini kabul ediyor; servis ham string’i numeric kolona yazınca DB hatası çıkar.

**Kanıt:** Gerçek şema `{budgetMin: '200'}` ve `{budgetMin: '123xyz'}` girdilerini kabul etti. İlk örneğin ters aralık etkisi mevcut DB kaydına bağlıdır; ikinci örneğin parse kabulü doğrudan doğrulandı.

**Düzeltme yönü:** Mevcut kayıt+patch birleştirilip tam bütçe şemasıyla doğrulansın; kısmi sayı parse’i yerine kesin format ve normalize edilmiş sayı kullanılsın.

### B23 — Kabul edilen tekliften çalışma alanına geçiş bağlantısı eksik — Yüksek

**Konum:** `src/modules/offers/service.ts:821`; `src/app/[locale]/dashboard/offers/sent/page.tsx:76`; `src/components/dashboard/sent-offers-dashboard.tsx:197`.

UI yalnızca `offer.engagementId` varsa çalışma alanı düğmesini gösteriyor. `getSentOffers` engagement join’i yapmıyor; sayfa mapping’i de bu alanı üretmiyor.

**Etki:** Freelancer kabul edilen teklifini görür ama teklif panelinden işe ulaşamaz. Bildirim bağlantısına bağımlı kalır; B29’daki bildirim kaybı bu kopukluğu büyütür.

**Düzeltme yönü:** Kabul edilen teklif üzerinden engagement ID’sini query/DTO/page/component boyunca taşımak.

### B24 — İlan listeleri ilk sayfadan sonrasını kullanıcıya açmıyor — Yüksek

**Konum:** `src/modules/listings/feed/service.ts`, varsayılan limit=20 ve cursor üretimi; `src/app/[locale]/listings/page.tsx:77`; `src/app/[locale]/feed/page.tsx`; `src/components/listings/interactive-listings-feed.tsx`.

Servis cursor/hasMore üretiyor ama sayfalar cursor’ı alıp servise iletmiyor ve sonraki sayfa bağlantısı/isteği oluşturmuyor. İlanlar sayfası dönüşü `{items}` tipine kadar daraltıyor.

**Senaryo/etki:** Aynı filtrede 21 veya daha fazla aktif ilan varsa ilk 20 dışındakiler normal liste gezinmesinde erişilemez. Başka bir arama ile bulunabilmeleri, eksik sayfalamayı çözmez.

**Düzeltme yönü:** Cursor bilgisini UI’ye geçirmek; URL üzerinden sonraki sayfa veya API destekli yükleme.

### B25 — Hızlı filtreler yalnızca yüklenmiş alt kümeye uygulanıyor; hızlı yanıt filtresi gerçek değil — Orta

**Konum:** `src/components/listings/interactive-listings-feed.tsx:69`.

Filtreler sadece sunucudan gelen `items` dizisini süzüyor. Tüm katalogda uygun kayıt olsa bile ilk sayfada yoksa “bulunamadı” gösterilir. `chipQuickResponse` ise cevap süresi/işveren davranışı ölçmüyor; sadece activationSeq>=1 ve ilan süresi kontrol ediliyor. Bunlar zaten normal aktif ilanların özellikleri.

**Düzeltme yönü:** Filtreleri servis sorgusuna ve sayfalama anahtarına katmak; hızlı yanıt iddiasını gerçek bir metrikle desteklemek veya kaldırmak.

### B26 — Arama, engelleme ve teknoloji etiketleriyle tutarlı değil — Orta

**Konum:** `src/app/api/listings/search/route.ts`; `src/modules/listings/feed/service.ts`, arama ve block koşulları; `src/modules/listings/service.ts:1401`.

Arama API’si session/userId iletmiyor; bu nedenle oturumlu kullanıcının karşılıklı engelleme filtresi uygulanmıyor. Başlık/özet görünebilir fakat detay sayfası aynı kullanıcı için 404 verir.

Komut paleti için yazılmış `searchListingsFullText` ağırlıklı/etiketli arama fonksiyonu uygulama çağrı zincirinde kullanılmıyor. API feed aramasını kullanıyor; bu arama title/summary/scope içeriyor, tags içermiyor. Yalnızca etikette bulunan teknolojiye göre arama çalışmaz.

**Düzeltme yönü:** Ortak arama sözleşmesi; kimliği servise taşıma; etiket ve relevans davranışını gerçek endpoint’e bağlama.

### B27 — İlan taslakları kullanıcılar arasında ortak; teknik cevaplar saklanmıyor — Orta

**Konum:** `src/components/listings/listing-wizard-form.tsx:67`, `:96`; logout route’ları.

`operis_listing_draft` anahtarı userId içermiyor ve çıkışta temizlenmiyor. Aynı tarayıcıdaki sonraki hesap öncekinin proje taslağını okuyabilir/yayınlayabilir. Kaydetme ve geri yüklemede `answers` alanı yok; teknik seçenekler sayfa yenilenince varsayılanlara döner.

**Düzeltme yönü:** Hesaba bağlı taslak anahtarı, açık temizleme politikası ve şema sürümlü tam veri saklama.

### B28 — Gizli bilgi içermeme onayı yerine ödeme onayı gönderiliyor — Orta

**Konum:** `src/components/listings/listing-wizard-form.tsx:292`, `:891`; `src/modules/listings/wizard/schema.ts`, `noSecretsConfirmed`.

API’nin “ilan gizli bilgi/iletişim bilgisi içermiyor” onayı `ackNoPlatformPayment` değerinden dolduruluyor. Kullanıcıya gösterilen metin ise platformun ödeme/escrow sağlamadığına ilişkin. Böylece kullanıcının görmediği bir beyan sunucuya verilmiş sayılıyor.

**Düzeltme yönü:** Her onay için aynı anlamı taşıyan UI metni ve ayrı alan; gerçekte alınmayan onayı üretmemek.

## E. Bildirimler ve dış servisler

### B29 — İşlem ile bildirim/outbox kaydı aynı transaction’da değil — Yüksek

**Konum:** `src/modules/notifications/service.ts:30`; `src/modules/offers/service.ts`, teklif sonrası async IIFE; `src/modules/engagements/service.ts`, transaction sonrası bildirimler; `src/modules/listings/service.ts:280`, `:968`.

NotificationService kendi bildirim+outbox transaction’ını açıyor; asıl teklif/kabul/ilan transaction’ına katılmıyor. Bazı çağrılar beklenmeden başlatılıp hataları boş catch ile yutuluyor. Bazıları ana transaction henüz commit etmeden başlıyor.

**Etki:** Teklif/kabul başarıyla commit olurken bildirimi kalıcı olarak kaybolabilir; tersi durumda ana transaction rollback olurken ayrı bildirim kalabilir. Outbox yalnızca kendisine ulaşmış olayları tekrar deneyebilir.

**Düzeltme yönü:** İş olayı/outbox kaydını asıl transaction içinde yazmak; dış gönderimi worker’a bırakmak; request sonrasına bırakılan Promise’leri kalıcılık garantisi saymamak.

### B30 — Kayıt doğrulama e-postası bağlantı içermiyor; başarısız gönderim yakalanmıyor — Yüksek

**Konum:** `src/modules/auth/service.ts:201`; `src/lib/email/index.ts`, Resend body üretimi; `src/lib/sms/index.ts`.

Kayıt e-postasına yalnızca `{token}` değişkeni veriliyor. Resend adapter’ı template’i render etmiyor; `body` yoksa değişkenleri JSON olarak gönderiyor. Kullanıcıya `/api/auth/verify-email?token=...` bağlantısı veya kullanım talimatı oluşmuyor.

Email/SMS provider’ları başarısızlıkta çoğunlukla throw yerine `{success:false}` döndürüyor. Kayıt servisi bu dönüşü kontrol etmiyor; mevcut try/catch teslimat başarısızlığını kaydetmiyor veya tekrar kuyruğuna almıyor.

**Etki:** Kayıt başarılı görünür; kullanıcı e-postasını doğrulayamadığı için üretimde ilan/teklif aşamasında durur. Yeniden gönderim B06 nedeniyle yok.

**Düzeltme yönü:** Gerçek doğrulama URL’si, yerelleştirilmiş şablon, provider sonucunun kontrolü ve kalıcı tekrar gönderim.

### B31 — Desteklenmeyen sağlayıcılar üretimde sahte gönderim başarısı veriyor — Yüksek

**Konum:** `src/lib/email/index.ts`, `createEmailProvider`; `src/lib/sms/index.ts`, `createSmsProvider`; `src/config/env.ts`.

Env şeması `smtp` ve `twilio` değerlerini geçerli sayıyor; ilgili taşıyıcılar uygulanmamış. Üretimde hata log’u yazıp Mock provider’a dönüyorlar. `mock` veya eksik seçim de gerçek teslimat olmadan success döndürüyor. İletişim formu/outbox bu sonucu gerçek teslimat gibi kabul ediyor.

Netgsm adapter’ı da sadece HTTP `ok` değerine bakıyor; yanıt gövdesindeki sağlayıcı sonucunu/message ID’sini değerlendirmeden yapay ID üretiyor. Sağlayıcının gerçek protokolü canlı test edilmedi; doğrulanan eksiklik uygulamanın yanıt gövdesini tamamen yok saymasıdır.

**Düzeltme yönü:** Üretimde uygulanmamış/mock provider seçimini reddetmek; yanıt şemasını ve gerçek başarı kodunu doğrulamak; sağlayıcı bazında sözleşme testleri.

### B32 — Outbox sahiplenme/yeniden deneme koşulları eksik — Orta

**Konum:** `src/modules/notifications/service.ts`, `processOutboxBatch`; `src/modules/admin/service.ts:1450` civarı `retry_outbox`.

İlk seçim `nextAttemptAt <= now` koşulunu içeriyor, fakat PENDING kaydı sahiplenen update bu zaman şartını tekrarlamıyor. İki worker aynı snapshot’ı aldıysa, biri başarısız olup geleceğe backoff yazdıktan sonra diğeri kaydı hemen sahiplenebilir. Son SENT/PENDING update’lerinde de lease sahibini tanımlayan token yok; uzun süren gönderimde eski worker yenisinin sonucunu ezebilir.

Beş başarısızlık sonrası DEAD olan olaylar normal processor sorgusuna alınmıyor. Yönetici “retry_outbox” işlemi sadece aynı processor’ı çağırıyor; DEAD olayları yeniden kuyruğa almıyor.

**Düzeltme yönü:** Süre koşullu atomik claim, lease kimliği ve sahiplik kontrollü bitirme; açık dead-letter yeniden oynatma işlemi.

### B33 — Bildirim ekranı başarısız okumayı başarı sayıyor ve eski kayıtlara ulaşamıyor — Orta

**Konum:** `src/components/dashboard/notifications-view.tsx:35`; `src/components/layout/notification-popover.tsx:103`, `:132`, `:147`; `src/app/[locale]/dashboard/notifications/page.tsx:57`.

Okundu isteklerinde `res.ok` kontrol edilmiyor; 401/429/500 yanıtı da yerel okundu durumuna çevriliyor. Sayfa ve popover ilk 50 kaydı alıyor. Popover’daki sonsuz kaydırma yalnızca bu 50 kaydın daha fazlasını gösteriyor; API’nin offset/hasMore bilgisini kullanmıyor.

**Etki:** Okunmadığı halde okundu görünen bildirimler; toplam okunmamış sayısı yüksekken arayüzden erişilemeyen eski bildirimler.

**Düzeltme yönü:** HTTP başarısını doğrulama, hatayı gösterme/geri alma ve gerçek sayfalama.

## F. Yönetim ve moderasyon bağlantıları

### B34 — Kullanıcı askıya alma ve ilan gizleme düğmeleri sunucuya bağlı değil — Yüksek

**Konum:** `src/components/admin/users-table-client.tsx:51`; `src/components/admin/listings-table-client.tsx:42`; `src/modules/admin/actions.ts`.

`handleToggleSuspend` sadece `setUsers`; `handleApplyModeration` sadece `setListings` çağırıyor. İlgili server action/fetch çağrısı yok. Buna rağmen kullanıcıya başarı mesajı gösteriliyor.

**Senaryo/etki:** Admin kötüye kullanan hesabı askıya aldığını veya ilanı kaldırdığını sanır; DB değişmediğinden işlem yapan hesap/ilan aktif kalır. Sayfa yenilenince önceki durum geri gelir. Servis fonksiyonlarının mevcut olması ekranın bağlı olduğu anlamına gelmiyor.

**Düzeltme yönü:** Düğmeleri yetkili server action’a bağlamak; başarılı commit sonrasında görünümü güncellemek.

### B35 — Gerçek şikâyetlerde şikâyet edilen kullanıcı çözülmüyor; kayıtlar iki kez gösterilebiliyor — Yüksek

**Konum:** `src/modules/admin/service.ts:957`; `src/components/admin/abuse-management-client.tsx:66`; `src/modules/moderation/service.ts`, `submitReport`.

DB’den alınan raporlar reporter bilgisiyle eşleniyor; `offenderUserId` üretilmiyor. UI’nin askıya alma akışı bu alan yoksa hemen dönüyor. Profil raporunda hedef doğrudan kullanıcı olsa dahi bağlantı kurulmamış; ilan/teklif raporlarında ilgili sahibin çözülmesi de eksik.

Başarılı rapor insert’i ayrıca `mockAbuseEvents` içine kopyalanıyor. `getAbuseIncidents` DB kayıtlarıyla bu diziyi ID bazında ayırmadan birleştiriyor; aynı rapor iki kez görünür ve eski bellek durumu çözülmüş kaydı açık gösterebilir.

**Düzeltme yönü:** Hedef türüne göre sorumlu kullanıcıyı güvenle çözmek; üretimde tek kayıt kaynağı; ID bazında tekilleştirme.

### B36 — Bazı yönetici yazma işlemleri üretimde DB hatasını başarıya çeviriyor — Yüksek

**Konum:** `src/modules/admin/service.ts:1042`, catch `:1134`; `:1352`, catch `:1371`.

`moderateUser` ve `resolveReport`, DB hatalarını ortam kontrolü olmadan yutup mock kayıtları değiştiriyor veya başarı nesnesi dönüyor. Örneğin audit insert’i başarısız olduğunda tüm kullanıcı moderasyon transaction’ı rollback olur; dışarıya yine başarılı görünür.

**Etki:** Şikâyet konsolunun gerçekten bağlı server action’ları bile uygulanmamış cezayı/çözümü olmuş gibi gösterebilir. B34’ten ayrı bir sunucu sorunudur.

**Düzeltme yönü:** Üretimde hatayı yukarı taşımak; etkilenen satırları doğrulamak; audit ve iş değişikliğini tek gerçek transaction sonucu olarak raporlamak.

### B37 — Yönetici yetkileri işlem bazında ayrılmamış; runtime giriş doğrulaması eksik — Yüksek

**Konum:** `src/modules/admin/actions.ts`; `src/modules/admin/auth-guard.ts:6`; `docs/FREELANCE_PLATFORM_MASTER_SPEC.md:201`.

Bütün action’lar parametresiz `requireAdminSession()` kullanıyor; bu ADMIN, SECURITY_ADMIN ve MODERATOR rollerinin tümünü kabul ediyor. Normal moderatör de IP bloklama ve sistem bakım işlemlerini çağırabilir. Parametrelerdeki TypeScript union’ları istemciden gelen değeri runtime’da doğrulamaz.

`moderateUser` geçersiz bir action değerini WARN/SUSPEND dışındaki dalda ACTIVE’e çevirebiliyor. UNSUSPEND için mevcut durum kontrolü de olmadığından DELETED hesap yeniden ACTIVE yapılabilir; anonimleştirilmiş bilgiler geri gelmez ama hesap durumu tutarsızlaşır.

**Düzeltme yönü:** Action bazında izin matrisi, Zod/enum ile runtime doğrulama, hedef durum/rol kısıtları. Salt TypeScript imzası güvenlik sınırı değil.

### B38 — İzleme ve temizlik ekranları gerçek sistem durumunu göstermiyor — Yüksek

**Konum:** `src/modules/admin/service.ts:914`, `:1015`, `:1400`; `src/components/admin/monitoring-client.tsx:20`, `:42`; `src/components/admin/threats-console-client.tsx:27`.

Log konsolu `mockLogs`, tehdit konsolu `mockThreats` okuyor. Monitoring’de havuz `4/20`, SQL `3.8 ms` gibi değerler sabit. `purge_sessions` hiçbir oturum/önbellek temizlemeden sabit “1.420 ... temizlendi” mesajı döndürüyor. UI ayrıca `success:false` bakım sonuçlarını da yeşil başarı görünümüyle sunuyor.

Tehdit arayüzü başlangıçta iki IP’yi engelli gösteriyor; gerçek `blockedIpSet` başlangıçta boş. Gerçek olay üretimi/ölçümüyle bağlantı yok.

**Düzeltme yönü:** Ölçülen değerler ve kalıcı olay kayıtları; uygulanmamış işlemleri kullanılabilir başarı olarak göstermemek; hata/başarı durumunu ayırmak.

### B39 — IP engelleme kalıcı/global değil ve tam IP eşleştirmiyor — Orta

**Konum:** `src/lib/security/rate-limit.ts:10`, `getClientIp`, `checkRateLimit`; `src/modules/admin/service.ts:1314`.

Kara liste ve limit sayaçları process belleğinde. Sadece `checkRateLimit` çağıran endpoint’ler bloktan etkileniyor; bu bir güvenlik duvarı engeli değil. Kontrol `key.includes(blocked)` ile yapıldığı için `1.2.3.4` engeli `1.2.3.40` gibi adresleri de yakalayabilir. Boş IP engeli tüm anahtarları eşleştirir; server action’da IP biçimi kontrolü yok.

`x-real-ip`/`x-forwarded-for` koşulsuz güvenilir sayılıyor. Dağıtım proxy’si bunları temizleyip yeniden yazmıyorsa istemci limit kimliğini değiştirebilir; bu son risk dağıtım koşuluna bağlıdır.

**Düzeltme yönü:** Doğrulanmış tam IP, güvenilir proxy politikası, ortak kalıcı store ve bütün gerekli endpoint’lerde tutarlı uygulama.

### B40 — Admin listelerinde servis sayfalaması ekrana bağlanmamış — Orta

**Konum:** `src/app/admin/users/page.tsx:15`; `src/app/admin/listings/page.tsx:14`; `src/app/admin/offers/page.tsx:15`; ilgili `*-table-client.tsx` bileşenleri.

Sayfalar sabit `limit:50` ile ilk kümeyi yüklüyor. İstemci arama/filtreleme işlemleri sadece bu küme üzerinde; sunucudaki paginated/search parametrelerine gitmiyor.

**Etki:** Toplam kayıt sayısı yüksek gösterilirken 51. ve sonraki kayıtlara normal liste/arama yoluyla ulaşmak mümkün değil. Moderasyon aramasında “bulunamadı” yanlış sonucu doğurur.

**Düzeltme yönü:** URL searchParams ile server-side filtre ve sayfalama; toplam ve görünür kayıt sayısını ayırmak.

## G. Diğer tamamlanmamış akışlar ve veri tutarlılığı

### B41 — Karşılıklı iptal ve bazı planlanan worker akışları uygulanmamış — Orta

**Konum:** `src/modules/engagements/service.ts`; `src/modules/notifications/service.ts:16`, `:22`; `src/app/api/cron/maintenance/route.ts`; `docs/FREELANCE_PLATFORM_MASTER_SPEC.md:281`, `:1118`, `:2262`.

Spesifikasyonda karşılıklı iptal var; şemada CANCELLED/cancelledAt ve bildirim tipinde MATCH_MUTUALLY_CANCELLED var. Buna karşılık gerçek iptal endpoint’i, karşılıklı onay kaydı veya servis akışı yok. Taraflar işi bırakmakta anlaşsa da açık engagement’ı kapatacak doğal işlem bulunmuyor; hesap silme aktif iş nedeniyle engelleniyor.

LISTING_EXPIRING_SOON tipi ve demo bildirimi var ama yaklaşan süreyi tarayıp gerçek olay üreten worker yok. Maintenance yalnızca bitmiş ilanlar ve outbox işliyor. Harici cron’ın gerçekten kurulu olduğu da repo üzerinden doğrulanamaz.

**Düzeltme yönü:** Ürün kapsamındaki iptal/hatırlatma/planlama bağlantılarını tamamlamak veya uygulanmayan özelliği açıkça kapsam dışına almak.

### B42 — Gösterilen hukuki metin ile kabul kaydının hash’i farklı kaynaklardan geliyor — Yüksek

**Konum:** `src/components/ui/legal-modal.tsx:7`, `:56`; `src/lib/legal/legal-documents-data.ts`; `src/modules/auth/service.ts`, legal acceptance döngüsü; `legal/terms/tr/v1.md`.

Kayıt modalı `LEGAL_DOCUMENTS` içindeki yapılandırılmış metni gösteriyor; servis `LegalService.getDocument(..., 'v1')` ile Markdown dosyasının hash’ini kaydediyor. Bunlar aynı içerik değil; kullanım koşullarında güncelleme tarihi bile farklı. Sürüm de kayıt kodunda sabit `v1`; current document metadata’sıyla sürülmüyor.

**Etki:** Teknik kabul kaydı, kullanıcının fiilen gördüğü içeriği birebir kanıtlamaz. Bu bulgu metinlerin hukuki geçerliliği hakkında değerlendirme değildir; kaynak/hash tutarsızlığıdır.

**Düzeltme yönü:** Tek sürümlü içerik kaynağı; gösterilen kanonik içeriğin hash’i; sürüm güncellemesinde yeniden kabul zinciri.

### B43 — Profil kaydı kısmen başarılı olabilir; hatalı links gövdesi tüm bağlantıları silebilir — Orta

**Konum:** `src/components/profile/profile-settings-form.tsx:129`, `:150`; `src/app/api/profile/links/route.ts`, `Array.isArray` satırı; `src/modules/profiles/service.ts`, `updateLinks`.

Tek “Kaydet” işlemi iki ayrı HTTP yazımına bölünüyor. Profil commit olup bağlantılar reddedilirse arayüz genel hata veriyor; profil alanlarının değiştiğini açıklamıyor. Ayrıca `links` eksik veya yanlış tipteyse API bunu hata yerine `[]` sayıyor; servis mevcut bütün linkleri silip boş liste yazıyor.

**Düzeltme yönü:** Tek atomik işlem veya açık kısmi başarı; request gövdesinde links alanını zorunlu array olarak doğrulamak. Boş array ile bilinçli silme ve bozuk request ayrı olmalı.

### B44 — Dil değiştirme parola sıfırlama token’ını ve dönüş hedefini kaybediyor — Orta

**Konum:** `src/components/layout/language-switcher.tsx:36`; `src/components/layout/footer-quick-settings.tsx:62`; `src/components/auth/reset-password-form.tsx:17`.

Dil geçişi yalnızca `usePathname()` ile yapılıyor; mevcut query string taşınmıyor. Reset formu ise token’ı searchParams’dan alıyor.

**Senaryo/etki:** `/en/reset-password?token=...` sayfasında TR seçilince `/tr/sifre-sifirla` açılır ve token kaybolur. Girişte returnUrl ve liste filtreleri de aynı şekilde kaybolur.

**Düzeltme yönü:** Yol dönüşümünden sonra mevcut güvenli query parametrelerini taşımak.

### B45 — Tamamlama itirazı sonrası istemci, sunucudan farklı durum gösteriyor — Orta

**Konum:** `src/components/engagements/match-details-view.tsx:157`; `src/modules/engagements/service.ts:608`.

Karşı tarafın mark’ı DISPUTES_COMPLETION iken kullanıcı MARKED_COMPLETE gönderirse servis `disputed:true`, `completed:false` döndürüyor. UI `completed` dışındaki her başarılı yanıtı COMPLETION_PENDING yapıyor; disputed alanını dikkate almıyor. Karşı tarafın mark’ı da başlangıç prop’u olarak kalıyor; son durum yeniden yüklenmiyor.

**Etki:** Sunucuda itiraz devam ederken kullanıcıya sadece onay bekleniyor mesajı veriliyor.

**Düzeltme yönü:** Dönen engagement status/marks alanlarını esas almak; başarılı mutation sonrasında güncel durumu senkronlamak.

### B46 — Tavsiye notu servisi üretim DB hatasında sahte kayıt döndürebiliyor — Yüksek

**Konum:** `src/modules/endorsements/service.ts`, `createEndorsement` dış catch bloğu.

UUID’li gerçek akışın catch bloğu bazı iş hatalarını yeniden fırlatıyor; diğer hatalarda NODE_ENV kontrolü olmadan in-memory mock kayıt oluşturuyor. Bağlantı/insert hatası veya yetki kontrolünden önceki DB arızası bu dala düşebilir.

**Etki:** Kullanıcı “tavsiye kaydedildi” görür fakat kalıcı kayıt oluşmaz; sahte karşı taraf/proje verisi dönebilir. Üretimde IDOR’un kalıcı olarak istismar edildiği doğrulanmadı; kesin bulgu hata halinde doğrulanmamış sahte başarıdır.

**Düzeltme yönü:** Üretimde fail-closed; insert sonrası yan etkileri ayrı hata yönetimiyle ele almak; DB unique ihlalini doğru iş hatasına çevirmek.

### B47 — Demo/fallback yolları gerçek akışın kurallarını ve kullanıcı izolasyonunu korumuyor — Orta, üretim dışı ağırlıklı

**Konum:** `src/modules/engagements/service.ts`, demo kabul/tamamlama dalları; `src/modules/notifications/service.ts`, fallback dalları; `src/app/api/notifications/route.ts`; `src/modules/offers/service.ts:925`; `src/modules/categories/service.ts` ve feed fallback’i.

Başlıca doğrulanan ayrışmalar:

- Fallback bildirim listeleri userId’ye göre süzülmüyor; okundu işlemleri de ortak dizide diğer kullanıcıları etkileyebiliyor.
- `getOfferById` bellek kaydında ownerId yoksa yetkisiz izleyiciyi reddeden koşul çalışmıyor. Sent DTO zaten ownerUserId taşımıyor.
- Demo teklif kabulü oluşturulan gerçek bellek ilanına özgü engagement kaydetmek yerine sabit ve COMPLETED demo engagement döndürüyor. Demo tamamlama tek taraflı tamamlanabiliyor; demo detayında katılımcı kontrolü yok.
- Demo parola değişse bile girişteki sabit alternatif parolalar kabul edilmeye devam ediyor.
- Kategori takipleri ayrı bellek Map’inde tutulurken following feed bunu kullanmıyor; DB arızasında “kategori takip etmiyorsunuz” sonucu dönebiliyor.

**Etki:** Geliştirme/önizlemede başarı görülen akış üretim davranışını kanıtlamaz; paylaşılan demo ortamında özel veriler kullanıcılar arasında karışabilir.

**Düzeltme yönü:** Aynı invariant’ları kullanan repository adapter’ları; demo verisini açık ve izole modda tutmak; üretim koduna sessiz fallback bırakmamak.

### B48 — Şikâyet doğrulaması hedef/sınır sözleşmesini tam korumuyor — Orta

**Konum:** `src/app/api/reports/route.ts:75`, `:145`; `src/modules/moderation/service.ts`, `createReportSchema` ve insert.

UUID biçimindeki hedef varlık DB’de gerçekten var mı ve doğru targetType’a mı ait kontrol edilmiyor. reasonCode serbest string olarak kabul ediliyor. “general” rapor saklanırken profile’a çevrilip varsayılan olarak reporter’ın kendi ID’sine bağlanıyor; genel sorun ile profil ihlali ayrımı kayboluyor.

API details için 2.000 karakteri kabul ettikten sonra hedef metnini başına ekliyor; servis aynı 2.000 sınırını tekrar uyguluyor. Sınıra yakın geçerli bir form servis katmanında reddedilir ve üretimde DB hatası gibi 500 döner.

**Düzeltme yönü:** Hedef çözümleme/varlık doğrulaması, reason enum, ayrı genel rapor modeli ve metadata ile açıklamayı farklı alanlarda saklama.

### B49 — Silme/retention/key-rotation operasyonlarında tamamlanmamış veri yaşam döngüsü var — Orta

**Konum:** `src/modules/privacy/service.ts:60`, `:90`, `:189`; `scripts/rotate-pii-keys.ts:24`; `src/app/api/cron/maintenance/route.ts`; `db/schema/index.ts`, securityEvents.expiresAt.

- Anonim e-posta/handle UUID’nin ilk sekiz karakterinden üretiliyor; unique kolonlarda iki kullanıcı aynı öneki paylaşırsa ikincinin silme transaction’ı hata verir. Tam UUID yerine 32 bitlik öneke güveniliyor.
- Hesap silme yalnızca PENDING outbox olaylarını durduruyor; PROCESSING olayları ve worker’ın önceden okuduğu alıcı bilgisiyle gönderim arasında iptal koordinasyonu yok.
- securityEvents.expiresAt mevcut ama süresi dolan güvenlik kayıtlarını silen worker yok. Belgede belirtilen retention işleri maintenance zincirine bağlı değil.
- Key rotation betiği her türlü env doğrulama hatasını “non-production/simulated success” diye sonuçlandırıyor; gerçekten production olup olmadığını kontrol etmiyor. Bazı kayıtların decrypt hatasıyla atlanmasında da başarılı çıkış ve “completed safely” mesajı üretiyor. Eski anahtarın kaldırılmasının güvenli olduğu bu sonuçtan çıkarılamaz.

**Düzeltme yönü:** Çakışmasız anonim kimlik; outbox iptal protokolü; teknik retention worker’ı; rotation’da başarısız/atlanan gerçek kayıtları ayrı raporlama ve hatalı konfigürasyonda başarısız çıkış. Retention sürelerinin hukuki doğruluğu bu kod denetiminin konusu değildir.

### B50 — Test kapsamı ana iş akışını olduğundan güvenli gösteriyor — Yüksek

**Konum:** `tests/unit/scale-and-concurrency.test.ts:1`; `tests/unit/domain-invariants-matrix.test.ts:1`; `tests/a11y/accessibility.test.ts:1`; `tests/e2e/marketplace.spec.ts`; `package.json`.

Concurrency testleri gerçek PostgreSQL/servis yarışları yerine test dosyasında tanımlanan simülasyonları çalıştırıyor. Domain matrix kendi transition/evaluate fonksiyonlarını doğruluyor; bunlar gerçek servislerin kullandığı ortak kurallar değil. Accessibility testlerinin bazıları gerçek DOM yerine test içinde üretilen sabit nesneleri denetliyor.

E2E dosyası üç yüzeysel senaryo içeriyor; kayıt → doğrulama → yayın → teklif → kabul → iki taraflı tamamlama zinciri yok. “Tema değiştirir” adlı test sadece data-theme varlığını kontrol ediyor. `test:integration` script’inin hedeflediği `tests/integration` dizini mevcut değil. Tip kontrolü, runtime request türlerini ve SQL migration uyumunu doğrulamaz.

`scripts/check-i18n-parity.ts` ve `scripts/check-emojis.ts` giriş kontrolünde `import.meta.url` ile elle üretilmiş `file://${process.argv[1]...}` karşılaştırılıyor. Windows'ta gerçek URL `file:///C:/...`, üretilen değer `file://C:/...` olduğundan `main()` çalışmıyor ve komut sessizce başarılı çıkıyor. Yol karşılaştırması bu ortamda doğrudan doğrulandı. i18n katalogları ayrıca bağımsız kontrol edilerek 215/215 anahtar eşliği doğrulandı; betiğin kendisinin çalıştığı varsayılmadı. Giriş kontrolü için platforma uygun `pathToFileURL` kullanılmalı.

**Etki:** 5.200 testin geçmesi B01, B09, B13–B19 ve B34 gibi hataları yakalamıyor. Test sayısı davranış güvencesiyle karıştırılmamalı.

**Düzeltme yönü:** Gerçek migration’dan kurulmuş izole DB ile entegrasyon; iki bağlantılı yarış testleri; gerçek endpoint/UI üzerinden kritik kullanıcı yolculukları; DOM tabanlı erişilebilirlik denetimi. Mevcut saf fonksiyon testleri tamamlayıcı olarak korunabilir.

## İlave sınırlı tutarsızlıklar

Bunlar ana 50 grubun dışında düşük etkili veya ürün kararı gerektiren notlardır:

- `src/app/[locale]/reset-password/page.tsx` açıklaması 8 karakter diyor; form ve API 12 istiyor. Aynı sayfa geçerli oturumu olan kullanıcıyı reset linki olsa dahi panele yönlendiriyor; parolasını unuttuğu halde oturumu açık kullanıcı önce çıkış yapmak zorunda.
- `src/modules/profiles/service.ts` tema için light/dark/system kabul ediyor; ThemeProvider/alt ayarlar light/dark/black kullanıyor. Profildeki tercih ile tarayıcı tercihi ortak sözleşmeye bağlı değil.
- `batchSubmitOffers` çoklu gönderimde sadece `capacityConfirmed === false` durumunu reddediyor; alan atlanınca onay zorunluluğu aşılabiliyor.
- Feed cursor’ı JSON olarak parse edilse de geçerli tarih/UUID olup olmadığı doğrulanmıyor; hatalı cursor DB hatası ve ardından boş başarılı listeye dönüşebilir.
- Hesap kayıt şeması en az bir focusCategoryKey istiyor, ama servis geçersiz anahtarları sessizce atlıyor; gerçekte hiçbir kategori takip etmeden kayıt tamamlanabilir.
- Kullanıcı eliyle ilan silmede `deletedAt` yazılmıyor; hesap silme yolunda yazılıyor. Silinme zamanını temel alan sonraki işler için tutarsızlık.
- Gerçek servislerin bazılarında DB hatası `[]`/null/200 olarak gizleniyor; örneğin gönderilen/alınan teklif listeleri, feed ve bildirim API’si. Kesinti, “hiç veri yok” gibi görünüyor.
- `hexKeySchema` AES anahtarı için tam 64 yerine en az 64 hex karakter kabul ediyor; 66 karakterlik anahtar env kontrolünden geçip AES-256 kullanımında hata verir.
- İlan formunda FLEXIBLE veya SPECIFIC_DATE seçilse de varsayılan duration alanları gönderiliyor; detay ekranı süre alanlarını önce değerlendirdiğinden zaman tercihi yanlış gösterilebilir. B20’deki kalıcı alan sözleşmesiyle birlikte ele alınmalı.
- Kullanıcı askıya alınırken onun teklifleri kapatılıyor, fakat ona ait gizlenen ilanların aldığı diğer kullanıcı teklifleri aynı şekilde sonlandırılmıyor. B18’deki moderasyon yaşam döngüsü birleştirilirken bu yol da kapsanmalı.

## Önceki rapordan güncel koda taşınmaması gereken iddialar

Eski raporun tamamı güncel kabul edilmemeli. Bu taramada özellikle şu düzeltmeler görüldü:

1. `getSession()` artık `getVerifiedSession()` çağırıyor; aktif hesap ve rol DB’den kontrol ediliyor. Eski “bu doğrulayıcı hiç kullanılmıyor” bulgusu geçerli değil. B01/B03 farklı kalan sorunlardır.
2. Admin DELETE çıkışı artık session cookie’sini siliyor; otomatik demo kullanıcı girişi yapmıyor.
3. 2FA kurulumu için secret alma ve kod girme arayüzü var; kapatma için yeniden doğrulama da eklenmiş. B02, yeniden kurulum dalında kalan açıklıktır.
4. Reset işlemi eski passwordHash koşullu update kullanıyor; aynı token’ın eşzamanlı kullanımını kontrol eden iyileştirme var.
5. İlan detay sayfası silinmiş ilanı ve sahip olmayanlara aktif olmayan/süresi dolmuş ilanı göstermiyor; yalnızca alt servisin ham dönüşüne bakarak herkese açık ilan sızıntısı sonucuna varılmadı.
6. Next.js `proxy.ts` konvansiyonuna geçilmiş. Eski middleware deprecation bulgusu mevcut dosya yapısına uygulanmaz.
7. Üretimde quick-login kapalı. Normal girişin demo izin koşulları aynı sert üretim korumasını her dalda taşımıyor; ancak sahte demo ID’nin üretim session DB kontrolünden geçeceği varsayılmadı.

## Önerilen düzeltme sırası ve kabul kontrolleri

Bu bölüm uygulama değişikliği değildir; bulguları ele alacak çalışma için sıralamadır.

1. **Kimlik doğrulama:** B01/B02/B03/B04/B05. Her token yalnızca kendi endpoint’inde geçsin; eski oturum reset sonrası reddedilsin; MFA değişimi mevcut faktörü gerektirsin.
2. **DB kurulum ve gerçek yazım:** B09/B10/B11/B34/B35/B36/B46. Temiz migration kurulumu, iki kullanıcıyla şablon sahiplik testi ve admin düğmesi sonrası DB doğrulaması.
3. **Durum bütünlüğü:** B13–B19. Kabul/geri çekme, kabul/pasifleştirme, iki taraflı tamamlama ve silme/kabul yarışları iki bağımsız DB bağlantısıyla test edilsin.
4. **Kullanıcı yolculuğu:** B06/B07/B08/B20/B23/B24/B30/B31. Yeni kullanıcı gerçek doğrulama mesajından başlayıp proje tamamlamaya kadar ilerleyebilsin; 21+ ilan görünür olsun.
5. **Bildirim/operasyon:** B29/B32/B33/B38/B39/B41/B49. Commit–outbox ilişkisi, worker restart/lease, DEAD tekrar oynatma ve retention sonuçları gerçek kayıtlarla ölçülsün.
6. **Form ve görünüm tutarlılığı:** B21/B22/B25–B28/B40/B42–B45/B48 ve ilave notlar. Gösterilen, gönderilen, saklanan ve geri okunan veri aynı anlamı taşısın.

## Denetim sınırları

SQL yarış senaryoları kod ve transaction sınırlarından çıkarılmıştır; gerçek DB üzerinde zamanlamalı çalıştırılmadı. Üretim ortam değişkenleri, mevcut canlı şema, reverse proxy header temizliği, cron kurulumu, sağlayıcı hesabı ve log toplama altyapısı doğrulanmadı. Harici servis belgelerinden protokol varsayımıyla kesin arıza ilan edilmedi. Bu rapor iş mantığı ve teknik veri bağlantısı denetimidir; hukuk veya mevzuat uygunluğu değerlendirmesi değildir.

Uygulama koduna düzeltme, formatlama, migration, seed veya yeni test dosyası uygulanmadı.
