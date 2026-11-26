/**
 * Anti-Fesal (آنتي فصال) — Frontend Application Client
 * Dubizzle Egypt UX, Strict Auth/RBAC, XSS-Free Delegated DOM,
 * Bilingual AR/EN i18n, Live Leaflet Tracking, and PWA Support.
 */

// ==================== CONSTANTS & SAFE STORAGE ====================
const STORAGE_KEYS = {
  user: 'antifesal_user',
  token: 'antifesal_token',
  lang: 'antifesal_lang',
  theme: 'antifesal_theme',
  favorites: 'antifesal_favorites',
  viewMode: 'antifesal_view_mode',
  district: 'antifesal_district',
  notify: 'antifesal_notify',
  pendingAppUserId: 'antifesal_pending_app_user_id',
  checklistPrefix: 'antifesal_inspect_'
};

const GRADE_MULTIPLIERS = { A: 1.0, B: 0.8, C: 0.6, D: 0.35 };
const MAX_UPLOAD_FILES = 4;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PLACEHOLDER_IMG = '/placeholder.jpg';
const FALLBACK_SVG_URI =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
      '<rect width="100%" height="100%" fill="#EEF2F6"/>' +
      '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold" fill="#64748B">Anti-Fesal</text>' +
    '</svg>'
  );

function safeParseJSON(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// ==================== APPLICATION STATE ====================
const storedUser = safeParseJSON(localStorage.getItem(STORAGE_KEYS.user), null);
const storedToken = localStorage.getItem(STORAGE_KEYS.token) || '';

const state = {
  currentUser: storedUser,
  authToken: storedToken,
  currentRole: storedUser?.role || 'buyer',
  captainToken: '',
  adminToken: '',
  captainUnlocked: false,
  adminUnlocked: false,
  lang: localStorage.getItem(STORAGE_KEYS.lang) || 'ar',
  theme: localStorage.getItem(STORAGE_KEYS.theme) || 'light',
  currentView: 'showroom',
  selectedCategory: 'All',
  selectedDistrict: localStorage.getItem(STORAGE_KEYS.district) || 'All',
  searchQuery: '',
  sortBy: 'newest',
  favoritesOnly: false,
  viewMode: localStorage.getItem(STORAGE_KEYS.viewMode) || 'list',
  items: [],
  allDistrictItems: [],
  filteredItems: [],
  visibleLimit: 8,
  isLoadingMore: false,
  hasLoadedShowroomOnce: false,
  favorites: safeParseJSON(localStorage.getItem(STORAGE_KEYS.favorites), []),
  currentAppraisalItem: null,
  activeDetailItem: null,
  pdpImages: [PLACEHOLDER_IMG],
  pdpImageIndex: 0,
  activeBotItemId: null,
  uploadedImages: [],
  currentLogTab: 'automation',
  currentAccountTab: 'info',
  priceMatrixCache: null,
  activeTrackingQuery: '',
  activeDispatchId: null,
  pendingConfirmAction: null,
  pendingViewAfterAuth: null,
  lastFocusedElement: null
};

// Ensure unauthenticated stale user without token doesn't masquerade as logged in
if (state.currentUser && !state.authToken) {
  state.currentUser = null;
  state.currentRole = 'buyer';
  localStorage.removeItem(STORAGE_KEYS.user);
}

// ==================== BILINGUAL DICTIONARY (100% AR / EN) ====================
const i18n = {
  ar: {
    skipToContent: 'تخطي إلى المحتوى الرئيسي',
    offlineBanner: 'أنت تتصفح الآن بدون اتصال بالإنترنت — يتم عرض النسخة المحفوظة محلياً.',
    brandName: 'آنتي فصال',
    brandFull: 'آنتي فصال (Anti-Fesal)',
    sellCta: 'سعّر وبِع بالذكاء الاصطناعي',
    searchPlaceholder: 'ابحث عن أجهزة كهربائية، لابتوبات، صالونات العطارين...',
    langCodeBadge: 'EN',
    langBtnTitle: 'Switch to English',
    accountBtn: 'حسابي',
    signInLabel: 'دخول',
    allDistricts: 'كل الإسكندرية 📍',
    allDistrictsShort: 'كل الأحياء',
    fixedPriceTag: 'سعر قطعي • بدون فصال',
    reserveBtn: '🛒 حجز ومعاينة فورية',
    askBotBtn: '💬 اسأل البوت',
    currency: 'ج.م',
    currencyLong: 'جنيه مصري',
    loadingMore: '⚡ جاري تحميل دفعة السلع التالية...',
    allLoaded: '✓ تم عرض جميع السلع المتاحة',
    specsAi: '🤖 فحص الذكاء الاصطناعي:',
    specsDefects: '🔍 كشف العيوب:',
    specsDelivery: '🚚 التسليم والمعاينة:',
    specsDeliveryVal: 'معاينة وتجربة مع المندوب قبل الدفع',
    authHeadingLogin: 'تسجيل الدخول إلى آنتي فصال',
    authHeadingRegister: 'إنشاء حساب جديد في آنتي فصال',
    authSubheading: 'سعّر، بيع، واشترِ بدون وجع فصال',
    authTabLogin: 'تسجيل الدخول',
    authTabRegister: 'إنشاء حساب جديد',
    authGoogleBtn: 'الدخول السريع بحساب Google',
    authDivider: 'أو عبر البريد الإلكتروني',
    authFullName: 'الاسم الكامل *',
    authEmail: 'البريد الإلكتروني أو اسم المستخدم *',
    authPassword: 'كلمة المرور *',
    authSubmitLogin: 'دخول',
    authSubmitRegister: 'إنشاء الحساب',
    botTitle: '🤖 مُقارن آنتي فصال الذكي',
    botOnline: '• متصل الآن',
    botWelcome: 'أهلاً بك! 👋 أنا مساعدك الذكي في آنتي فصال. اسألني عن أي سلعة، قارن بين منتجين، أو اطلب ترشيح لأفضل سعر ومواصفات في الإسكندرية!',
    botPlaceholder: 'مثال: قارن بين ثلاجة توشيبا وسامسونج...',
    botInputLabel: 'اكتب رسالتك للمقارن الذكي',
    botBtnAria: 'مساعد المقارنة والبحث الذكي',
    botClearAria: 'مسح المحادثة',
    footerDesc: 'المنصة الذكية الأولى لإعادة تداول السلع المستعملة المفحوصة في الإسكندرية. سعر عادل ومدروس بدون وجع فصال مع حق المعاينة الكاملة كاش.',
    footerSlogan: '"سعّر، بيع، ومن غير وجع فصال"',
    footerColCategories: 'الأقسام المعتمدة',
    footerCatAll: '🛍️ جميع المعروضات',
    footerCatAppliances: '❄️ أجهزة منزلية',
    footerCatElectronics: '💻 إلكترونيات وشاشات',
    footerCatFurniture: '🛋️ أثاث العطارين',
    footerColDistricts: 'أحياء تغطية الإسكندرية 📍',
    footerColSupport: 'الدعم والشراكة',
    footerLinkPrice: '📊 مؤشر أسعار المستعمل',
    footerLinkTrack: '🔍 تتبع الشحنة والمندوب',
    footerLinkAbout: '🛡️ ضمان المعاينة والأسئلة',
    footerLinkPackages: '💎 باقات التجار والورش',
    footerLinkBecomeSeller: '🏷️ انضم كبائع معتمد',
    footerLinkBecomeDriver: '🚚 انضم ككابتن توصيل',
    footerLinkDocs: '📄 توثيق المطورين (API)',
    footerTagline: 'آنتي فصال الإسكندرية — تجارة مستعمل ذكية، عادلة، وبضمان المعاينة الكاملة.',
    footerCopyrightReserved: '© 2026 Anti-Fesal Alexandria. جميع الحقوق محفوظة.',
    districts: {
      'El-Attarine': 'العطارين',
      'El-Mansheya': 'المنشية',
      'Sidi Beshr': 'سيدي بشر',
      'Moharam Bek': 'محرم بك',
      'Smouha': 'سموحة',
      'Miami': 'ميامي',
      'Loran': 'لوران',
      'Gleem': 'جليم',
      'Roushdy': 'رشدي'
    },
    chips: {
      All: 'كل الفئات 🏷️',
      Appliances: 'أجهزة منزلية ❄️',
      Electronics: 'إلكترونيات وشاشات 💻',
      Furniture: 'أثاث العطارين 🛋️'
    },
    header: {
      districtLabel: 'اختر المنطقة بالإسكندرية',
      searchLabel: 'ابحث عن السلع',
      partnerBtn: 'انضم كشريك',
      homeAria: 'الصفحة الرئيسية — المعرض المعتمد',
      openSearch: 'البحث الفوري في الإسكندرية',
      searchBtnAria: 'بحث',
      closeSearch: 'إغلاق البحث',
      themeAria: 'تبديل الوضع الليلي',
      accountAria: 'حسابي'
    },
    nav: {
      showroom: 'المعرض المعتمد',
      tracking: 'تتبع الشحنة والخريطة الحية',
      priceIndex: 'مؤشر الأسعار العادلة',
      about: 'ضمان المعاينة والأسئلة',
      ariaLabel: 'التنقل الرئيسي للمشتري',
      mobileAria: 'التنقل السريع للجوال'
    },
    mobNav: {
      showroom: 'المعرض',
      sell: 'سعّر وبِع',
      track: 'تتبع',
      prices: 'الأسعار',
      account: 'حسابي'
    },
    hero: {
      eyebrow: 'سوق الإسكندرية المعتمد للمستعمل',
      title: 'اشترِ المستعمل المضمون بسعر قطعي عادل — ومن غير وجع فصال',
      subtitle: 'كل سلعة مفحوصة بالذكاء الاصطناعي ومعروضة بسعر السوق العادل مع حق المعاينة الكاملة عند باب بيتك قبل دفع أي مبلغ.',
      badgeAiTitle: 'فحص وتقييم ذكي',
      badgeAiSub: 'تقرير عيوب ودرجة نظافة A–D',
      badgeFixedTitle: 'سعر قطعي بدون فصال',
      badgeFixedSub: 'تسعير مرجعي من سوق الإسكندرية',
      badgeCashTitle: 'كاش بعد المعاينة',
      badgeCashSub: 'جرّب السلعة مع الكابتن أولاً'
    },
    showroom: {
      loadingFeed: 'جاري تحميل المعروضات المعتمدة...',
      sortLabel: 'ترتيب المعروضات',
      sortNewest: 'الأحدث أولاً',
      sortPriceAsc: 'السعر: الأقل إلى الأعلى',
      sortPriceDesc: 'السعر: الأعلى إلى الأقل',
      sortGradeBest: 'درجة الفحص: الأعلى أولاً',
      favoritesOnly: 'المفضلة',
      categoryGroupAria: 'تصفية حسب الفئة',
      districtGroupAria: 'أحياء الإسكندرية',
      viewModeAria: 'نمط العرض',
      viewGrid: 'عرض شبكة',
      viewList: 'عرض قائمة',
      feedStats: (count) => `عرض ${formatNum(count)} منتج مفحوص ومعتمد بالإسكندرية`,
      emptyTitle: 'لا توجد معروضات مطابقة حالياً',
      emptySub: 'جرّب تغيير الحي أو البحث، أو أضف سلعتك وسعّرها بالذكاء الاصطناعي بدون فصال!',
      emptyBtn: '+ ابدأ تسعير سلعتك الآن',
      dispatchedBadge: 'تم الحجز • قيد التوصيل',
      soldBadge: 'تم البيع',
      cleanDefect: '✓ فحص سليم 100% بدون عيوب',
      aiConfidence: 'ثقة الفحص',
      gradeA: 'الفئة A (كسر زيرو)',
      gradeB: 'الفئة B (استعمال ممتاز)',
      gradeC: 'الفئة C (حالة جيدة)',
      gradeD: 'الفئة D (يحتاج صيانة)'
    },
    seller: {
      pageTitle: '⚡ أضف سلعتك وسعّرها بالذكاء الاصطناعي',
      pageSubtitle: 'ارفع صور جهازك أو أثاثك واكتب حالته بوضوح — واحصل على تقييم عادل وعرض شراء كاش فوري خلال ثوانٍ.',
      step1: 'تفاصيل السلعة',
      step2: 'الصور والحالة',
      step3: 'التسعير وعرض الكاش',
      step1Heading: '1. البيانات الأساسية وموقع الاستلام',
      titleLabel: 'عنوان السلعة والموديل *',
      titlePlaceholder: 'مثال: تلاجة توشيبا 16 قدم نوفروست فضي',
      categoryLabel: 'القسم *',
      catAppliances: 'أجهزة منزلية (Appliances)',
      catElectronics: 'إلكترونيات (Electronics)',
      catFurniture: 'أثاث وموبيليات (Furniture)',
      districtLabel: 'منطقة الاستلام بالإسكندرية *',
      phoneLabel: 'رقم الهاتف للتواصل *',
      tierLabel: 'باقة البائع *',
      tierEveryday: 'بائع عادي (عمولة 8% كاش فوري)',
      tierPro: 'تاجر محترف (عمولة 5%)',
      tierEnterprise: 'معرض / ورشة (عمولة 3%)',
      step2Heading: '2. صور السلعة ووصف الحالة',
      photosLabel: 'صور المنتج (1 إلى 4 صور واضحة)',
      slotCover: '1. صورة الغلاف (Cover)',
      slotAngle2: '2. زاوية جانبية',
      slotAngle3: '3. ملصق الموديل',
      slotAngle4: '4. تفاصيل أو خدوش',
      dropTitle: 'اسحب وأفلت الصور هنا أو اضغط للاختيار',
      dropSub: 'حتى 4 صور واضحة بإضاءة جيدة (PNG / JPG — بحد أقصى 10MB للصورة)',
      dropZoneAria: 'اضغط أو اسحب الصور هنا للرفع',
      descLabel: 'وصف الحالة بالعامية المصرية *',
      descPlaceholder: 'اكتب كل التفاصيل بأمانة: مدة الاستخدام، هل فيه خدوش، هل اتعمله صيانة قبل كده، كرتونته وفواتيره موجودة ولا لأ...',
      submitBtn: 'ابدأ الفحص والتسعير الفوري',
      tipsTitle: '💡 نصائح للحصول على أعلى تقييم فوري',
      tip1: 'صوّر السلعة في إضاءة نهارية واضحة وأبرز صورة الغلاف الأمامية.',
      tip2: 'أضف صورة لملصق الموديل والماركة لرفع دقة التقييم فوق 90%.',
      tip3: 'اذكر أي صيانة سابقة أو خدش بصراحة لتفادي تأخير المراجعة البشرية.',
      receiptEyebrow: 'تقرير الفحص والتسعير الفوري',
      recCatModel: 'القسم والموديل المكتشف:',
      recGrade: 'درجة الحالة المعيارية:',
      recConfidence: 'نسبة ثقة التقييم:',
      recDefects: 'العيوب المرصودة:',
      recResale: 'سعر البيع النهائي العادل:',
      recCommission: 'عمولة المنصة المحجوزة:',
      recPayoutTitle: 'مبلغ الشراء الكاش الفوري:',
      recPayoutSub: 'يدفعه لك الكابتن كاش في يدك لحظة الاستلام',
      acceptQuoteBtn: 'قبول العرض واستدعاء مندوب الاستلام الفوري',
      resetBtn: 'تسعير سلعة أخرى'
    },
    merchant: {
      pageTitle: '🛡️ لوحة مراجعة واعتماد التاجر',
      pageSubtitle: 'مراجعة وتدقيق السلع التي تحتاج تأكيد السعر أو فحص إضافي قبل النشر في المعرض.',
      kpiTotal: 'إجمالي المعروضات بالإسكندرية',
      kpiTotalSub: 'شامل كافة الأقسام النشطة',
      kpiAutoRate: 'نسبة الاعتماد الآلي',
      kpiAutoRateSub: 'المعيار المستهدف: >= 70%',
      kpiPending: 'قائمة الانتظار للمراجعة (<80%)',
      kpiPendingSub: 'بند بحاجة لمراجعة واعتماد التاجر',
      kpiComm: 'إجمالي العمولات المحجوزة',
      kpiCommSub: 'أرباح وساطة مؤكدة',
      queueTitle: 'طابور المراجعة والاعتماد',
      queueSub: 'سلع انخفضت نسبة ثقة فحصها عن 80% بسبب صور غير واضحة أو عيوب تحتاج تأكيد.',
      tableCaption: 'طابور مراجعة السلع المعلقة',
      thId: 'كود السلعة',
      thTitle: 'العنوان والموديل',
      thDistrict: 'المنطقة',
      thGrade: 'الفئة المقترحة',
      thConf: 'درجة الثقة',
      thDefects: 'العيوب المرصودة',
      thPrice: 'السعر المقترح',
      thAction: 'إجراءات التاجر',
      emptyQueue: '✓ طابور المراجعة فارغ تماماً! كافة السلع اعتُمدت بنجاح.',
      btnApprove: 'اعتماد',
      btnAdjust: 'تعديل',
      btnReject: 'رفض'
    },
    trader: {
      pageTitle: '💎 باقات التجار والورش وأدوات النمو',
      pageSubtitle: 'وفّر عمولتك وافتح أدوات الأتمتة والتسويق الذكي لمتجرك في الإسكندرية على مدار الساعة.',
      tier1Name: 'البائع العادي (Everyday)',
      tier1Price: 'مجاني',
      tier1Comm: 'عمولة 8% لكل عملية بيع ناجحة',
      tier1F1: '✓ فحص فوري بالذكاء الاصطناعي',
      tier1F2: '✓ تسليم كاش فوري عند باب البيت',
      tier1F3: '✓ ضمان معاينة المندوب 100%',
      tier1F4: '✓ دعم فني عبر الواتساب',
      tier1Btn: 'الباقة الافتراضية',
      popularTag: 'الأكثر طلباً للتجار',
      tier2Name: 'التاجر المحترف (Pro Trader)',
      perMonth: 'ج.م / شهرياً',
      tier2Comm: 'عمولة مخفضة 5% فقط',
      tier2F1: '✓ جميع مزايا الباقة العادية',
      tier2F2: '✓ توليد إعلانات تلقائية لفيسبوك وإنستجرام',
      tier2F3: '✓ بوت رد آلي ضد الفصال 24/7',
      tier2F4: '✓ شارة تاجر موثوق في الإسكندرية',
      tier2Btn: 'ترقية إلى تاجر محترف',
      tier3Name: 'الورش والمعارض (Enterprise)',
      tier3Comm: 'أقل عمولة: 3% فقط',
      tier3F1: '✓ جميع مزايا باقة التاجر المحترف',
      tier3F2: '✓ ربط مباشر بكتالوج WhatsApp Business',
      tier3F3: '✓ أولوية قصوى لأسطول الكباتن والتحصيل',
      tier3F4: '✓ تقارير أسبوعية لحركة أسعار السوق',
      tier3Btn: 'تفعيل باقة المعارض والورش',
      adGenTitle: '📢 مولّد الإعلانات التلقائي الذكي',
      adGenSub: 'صياغة إعلانات بالعامية المصرية مع شارة الفحص المعيارية ورابط الشراء المباشر.',
      adSelectLabel: 'اختر السلعة لتوليد المنشورات الإعلانية:',
      adGenBtn: 'توليد الإعلانات بضغطة زر ⚡',
      adFbTitle: '📘 منشور Facebook Marketplace',
      copyPost: 'نسخ المنشور',
      adIgTitle: '📸 نص إعلان Instagram Story',
      copyText: 'نسخ النص',
      adWaTitle: '💬 رسالة WhatsApp Catalog',
      copyMsg: 'نسخ الرسالة',
      simTitle: '💬 محاكي الرد التلقائي ومنع الفصال',
      simSub: 'اختبر سرعة رد المساعد الذكي في الرد على استفسارات المشترين وتوجيههم للشراء بالسعر العادل.',
      simWelcome: 'مرحباً بك! أنا مساعد "آنتي فصال" الذكي. اختر سلعة واكتب أي استفسار للمعاينة وسأرد فورياً بحكمة ووضوح وبدون أي مجال للفصال! 🌊',
      simMetaNow: 'آنتي فصال • الآن',
      simTry: 'جرّب سريعاً:',
      simInputLabel: 'اكتب رسالة المشتري',
      simInputPlaceholder: 'اكتب سؤال المشتري هنا واضغط إرسال...',
      calcTitle: '💰 حاسبة وفورات عمولة التاجر',
      calcSub: 'حرّك مؤشر مبيعاتك الشهرية لترى كم ستوفّر بالترقية إلى باقة المحترفين أو المعارض.',
      calcSliderLabel: 'حجم المبيعات الشهرية المتوقع بالإسكندرية:',
      cmpEveryday: 'البائع الفردي (Everyday)',
      cmpFeeLabel: 'العمولة المستقطعة:',
      cmpNoSub: 'بدون اشتراك شهري',
      cmpPro: 'تاجر معتمد (Pro Trader)',
      cmpEnterprise: 'ورش ومحلات كبرى (Enterprise)'
    },
    logs: {
      pageTitle: '🚚 متابعة الشحنات وسجلات التدقيق',
      pageSubtitle: 'تتبع عمليات الاستلام وتحديث الكتالوج وسجلات الجودة التشغيلية.',
      dispatchesTitle: 'عمليات الاستلام النشطة بالإسكندرية',
      dispatchesSub: 'تتبع استلام الشحنات ودفع الكاش للبائعين وإعادة المحاولات.',
      refreshDispatches: 'تحديث المناديب 🔄',
      dispatchesCaption: 'جدول مهام التوصيل والاستلام',
      thTaskId: 'كود المهمة',
      thItemId: 'كود السلعة',
      thDistrict: 'المنطقة',
      thAddress: 'عنوان الاستلام',
      thDriver: 'المندوب المعين',
      thCash: 'الكاش المسلم',
      thRetries: 'المحاولات',
      thStatus: 'الحالة',
      thAction: 'الإجراء',
      catalogTitle: '📚 فحص وتحديث كتالوج السلع اليومي',
      catalogSub: 'يفحص المعروضات تلقائياً ويستبعد السجلات الناقصة أو بدون صور للحفاظ على جودة المعرض.',
      runCatalogBtn: 'تشغيل فحص الكتالوج 🚀',
      auditTitle: '📋 سجلات التدقيق والمراقبة المباشرة',
      auditSub: 'سجلات متزامنة لتتبع العمليات، السلع المستبعدة، وتعديلات المراجعة.',
      refreshLogs: 'تحديث السجلات 🔄',
      tabAutomation: 'سجل العمليات',
      tabSkipped: 'السلع المستبعدة',
      tabCorrections: 'تعديلات المراجعة',
      tableCaption: 'سجلات التدقيق'
    },
    priceIndex: {
      pageTitle: '📊 دليل ومؤشر الأسعار العادلة بالإسكندرية',
      pageSubtitle: 'أسعار مرجعية حية بناءً على حركة السوق في العطارين والمنشية ومحرم بك لحماية البائع والمشتري من الفصال العشوائي.',
      catFilterLabel: 'تصفية حسب الفئة',
      searchLabel: 'ابحث عن موديل',
      searchPlaceholder: 'ابحث عن موديل (مثال: توشيبا، زانوسي)...',
      tableCaption: 'جدول مؤشر الأسعار العادلة حسب الحالة',
      thCategory: 'الفئة',
      thModel: 'الموديل والماركة',
      thBase: 'السعر المرجعي',
      thDep: 'الاستهلاك السنوي',
      thAction: 'الإجراء'
    },
    tracking: {
      pageTitle: '🔍 تتبع الشحنة ومعاينة المندوب المباشرة',
      pageSubtitle: 'أدخل كود الصفقة، رقم السلعة، أو رقم الهاتف لمعرفة خط سير الكابتن وموعد المعاينة الكاش عند باب بيتك في الإسكندرية.',
      inputLabel: 'كود الصفقة أو السلعة أو الهاتف',
      inputPlaceholder: 'أدخل كود الصفقة (DEAL-xxxx) أو رقم السلعة (AF-xxxx) أو الهاتف...',
      submitBtn: 'تتبع الشحنة 🚀',
      quickLabel: 'روابط سريعة للتجربة:',
      waitTitle: 'في انتظار إدخال كود الصفقة أو رقم السلعة',
      waitSub: 'جرب الضغط على أحد الاختصارات أعلاه لعرض مسار الشحنة الحي فوراً.',
      alertTitle: 'إشعار استلام الشحنة (تحديث مباشر)',
      liveBadge: 'مباشر الآن 🟢',
      driverCardTitle: '🚚 كابتن الاستلام المكلّف',
      districtLabel: 'منطقة التغطية:',
      addressLabel: 'عنوان المعاينة:',
      cashLabel: 'مبلغ التحصيل كاش:',
      callDriver: 'اتصال بالكابتن',
      whatsappDriver: 'واتساب',
      itemCardTitle: '📦 تفاصيل السلعة المحجوزة',
      fixedNote: '✓ السعر قطعي ومثبت بدون وجع فصال',
      checklistTitle: '✅ قائمة فحص المشتري قبل دفع الكاش',
      checklistSub: 'تأكد من النقاط التالية مع الكابتن قبل استلام السلعة:',
      chk1: 'مطابقة الموديل والعيوب الظاهرة لتقرير الفحص',
      chk2: 'تشغيل وتجربة الجهاز عملياً لمدة 5 دقائق على الأقل',
      chk3: 'التأكد من تطابق المبلغ المطلوب مع السعر القطعي المثبت',
      mapTitle: '🗺️ الخريطة التفاعلية الحية لخط سير الكابتن',
      mapSub: 'تتبع مباشر لحركة الكابتن بين نقطة الاستلام وعنوان المعاينة في شوارع الإسكندرية.',
      etaLoading: '⏳ جاري حساب وقت الوصول...',
      refreshMap: 'تحديث الموقع 🔄',
      mapFallbackText: 'وضع المسار التقريبي بالإسكندرية — الكابتن في طريقه بين نقطة الاستلام وعنوان المعاينة.',
      legendSeller: 'نقطة الاستلام (البائع):',
      legendDriver: 'موقع الكابتن المباشر:',
      legendBuyer: 'عنوان المعاينة (المشتري):'
    },
    about: {
      trustPill: 'ميثاق الثقة وحماية المشتري والبائع في الإسكندرية',
      heroTitle: '"سعّر، بيع، ومن غير وجع فصال"',
      heroDesc: 'أول منصة مصرية ذكية لتداول الأجهزة والأثاث والإلكترونيات المستعملة في الإسكندرية. بنيناها لنقضي تماماً على إهدار الوقت والمماطلة وبخس الأسعار عبر تقييمات عادلة ومثبتة بالذكاء الاصطناعي.',
      guaranteesTitle: '🌟 ضمانات "آنتي فصال" الخمسة في الإسكندرية',
      g1Title: '1. سعر قطعي عادل بدون فصال',
      g1Desc: 'تسعير محايد مبني على أسعار أسواق الإسكندرية ومعدل الاستهلاك الفعلي للموديل بدون زيادة وهمية ولا بخس سعر.',
      g2Title: '2. فحص متعدد الزوايا بالذكاء الاصطناعي',
      g2Desc: 'تقنية التحليل البصري تفحص 1 إلى 4 صور للسلعة، وترصد الخدوش والعيوب السطحية لتحديد درجة النظافة بدقة.',
      g3Title: '3. حق المعاينة الكاملة قبل الدفع',
      g3Desc: 'المشتري لا يدفع قرشاً واحداً قبل وصول المندوب بالسلعة وتجربتها وفحصها بنفسه ومطابقتها لتقرير الفحص.',
      g4Title: '4. استلام كاش فوري عند باب البيت',
      g4Desc: 'البائع يستلم قيمة السلعة نقداً كاش في يده فور استلام الكابتن للسلعة، بدون انتظار المشتري النهائي.',
      g5Title: '5. دعم تجار الإسكندرية وورش العطارين',
      g5Desc: 'باقات عمولة مخفضة تصل إلى 3% لتجار العطارين والمنشية مع أدوات نشر ذكية ومساعد رد تلقائي 24/7.',
      faqTitle: '❓ الأسئلة الشائعة حول المنصة والمعاملات',
      faq1Q: 'كيف يعمل تقييم وفحص السلعة بالذكاء الاصطناعي؟',
      faq1A: 'تقوم المنصة بتحليل صور السلعة مع وصف البائع بالعامية المصرية ومقارنتها بمؤشر أسعار الإسكندرية لتحديد الفئة والموديل ودرجة النظافة (Grade A, B, C, D) ونسبة الثقة بدقة عالية.',
      faq2Q: 'ماذا يحدث إذا لم تعجبني السلعة عند المعاينة مع المندوب؟',
      faq2A: 'يحق للمشتري رفض الاستلام بدون دفع ثمن السلعة، ويقوم الكابتن بإعادة الشحنة لمراجعتها لدى فريق الجودة المختص بكل شفافية.',
      faq3Q: 'ما هي درجات النظافة الأربعة (Grades) المعتمدة؟',
      faq3A: 'Grade A (100%): بحالة الزيرو أو كسر زيرو خالية من الخدوش • Grade B (80%): استعمال خفيف جداً • Grade C (60%): عيوب سطحية ملحوظة مع سلامة الكفاءة • Grade D (35%): أجهزة تحتاج صيانة خفيفة أو أثاث يحتاج تجديد.',
      faq4Q: 'كيف أستفيد من نسبة العمولة المخفضة (3% و 5%)؟',
      faq4A: 'التجار في أسواق العطارين والمنشية ومحرم بك يمكنهم التقديم من زر "انضم كشريك" واختيار باقة Pro Trader أو Enterprise لتخفيض العمولة من 8% إلى 5% أو 3% مع فتح أدوات الأتمتة التسويقية.'
    },
    account: {
      guestName: 'زائر',
      guestBadge: 'حساب غير مسجل',
      lblDistrictPrefix: 'الحي:',
      lblEmailPrefix: 'البريد:',
      lblPhonePrefix: 'الهاتف:',
      navInfo: 'معلومات الحساب',
      navSettings: 'إعدادات الحساب',
      navSeller: 'إعلاناتي ومبيعاتي',
      navBuyer: 'حجوزاتي كمشتري',
      navFavorites: 'المفضلة',
      navDelivery: 'تفاصيل المندوب',
      logout: 'تسجيل الخروج',
      appHeading: 'حالة طلب الانضمام',
      appPendingText: 'طلبك قيد المراجعة لدى الإدارة المركزية.',
      openPortalBtn: 'فتح البوابة 🚀',
      infoTitle: 'لوحة تحكم الحساب والمعلومات الأساسية',
      infoSubtitle: 'ملخص أنشطتك في البيع والشراء والشحن في أسواق الإسكندرية المعتمدة.',
      kpiSellerTitle: '📦 معروضاتي كبائع',
      kpiSellerSub: 'معتمدة ومفحوصة بالذكاء الاصطناعي',
      kpiBuyerTitle: '🛒 حجوزاتي كمشتري',
      kpiBuyerSub: 'بانتظار المعاينة والتسليم كاش',
      kpiCashTitle: '💵 المستحقات الكاش الفورية',
      kpiCashSub: 'مستلمة فوراً بدون استقطاعات',
      cardHeader: '📋 بيانات العضوية والتوثيق',
      cellId: 'كود العضوية',
      cellDate: 'تاريخ التسجيل',
      cellDistrict: 'حي الإقامة والتغطية',
      cellStatus: 'حالة الحساب',
      btnQuickSell: 'تسعير سلعة جديدة بالذكاء الاصطناعي',
      btnQuickShowroom: 'تصفح المعرض والشراء الفوري 🛍️',
      settingsTitle: '⚙️ إعدادات الحساب والتفضيلات',
      settingsSubtitle: 'تحكم بمعلوماتك الشخصية وتفضيلات العرض والإشعارات.',
      lblFullName: 'الاسم الكامل *',
      lblPhone: 'رقم الهاتف (للتواصل مع المندوب) *',
      lblDistrict: 'حي التوصيل والمعاينة الرئيسي بالإسكندرية *',
      lblLang: 'لغة الواجهة المفضلة',
      lblTheme: 'المظهر والوضع الليلي',
      lblNotifications: 'إشعارات الرسائل والشحن',
      btnSaveSettings: 'حفظ التعديلات والتفضيلات',
      btnCancelSettings: 'إلغاء والعودة للمعلومات',
      sellerTitle: '🏷️ إعلاناتي ومبيعاتي',
      sellerSubtitle: 'قائمة السلع التي عرضتها، حالة الفحص، ومبالغ الاستلام الفوري كاش.',
      btnSellerAdd: 'تسعير سلعة جديدة',
      sellerTableCaption: 'سجل معروضات البائع',
      thSellerId: 'كود السلعة',
      thSellerTitle: 'اسم السلعة والموديل',
      thSellerDistrict: 'الحي',
      thSellerGrade: 'درجة الفحص',
      thSellerPrice: 'السعر المعروض',
      thSellerCash: 'الكاش المستحق',
      thSellerStatus: 'الحالة',
      thSellerAction: 'إجراء',
      buyerTitle: '🛒 حجوزاتي وطلباتي كمشتري',
      buyerSubtitle: 'السلع التي حجزتها مع حق المعاينة والتجربة الكاملة قبل الدفع كاش للمندوب.',
      btnBuyerBrowse: 'تصفح المعرض 🛍️',
      buyerTableCaption: 'سجل حجوزات المشتري',
      thBuyerDealId: 'كود الصفقة',
      thBuyerItemTitle: 'اسم السلعة',
      thBuyerPrice: 'السعر القطعي',
      thBuyerAddress: 'عنوان المعاينة',
      thBuyerStatus: 'حالة الصفقة',
      thBuyerAction: 'تتبع الشحنة',
      favoritesTitle: '❤️ السلع المحفوظة في المفضلة',
      favoritesSub: 'السلع التي قمت بحفظها للمراجعة أو الحجز لاحقاً.',
      deliveryTitle: '🚚 تفاصيل ومهام المندوب',
      deliverySubtitle: 'سجل مشاوير المعاينة والاستلام في أحياء الإسكندرية ومبالغ الكاش المحصلة.',
      btnCaptainGate: 'الانتقال لبوابة الكابتن 🔐',
      deliveryTableCaption: 'سجل مهام التوصيل',
      thDeliveryTaskId: 'كود المهمة',
      thDeliveryDistrict: 'الحي',
      thDeliveryAddress: 'عنوان المعاينة',
      thDeliveryCash: 'مبلغ التسليم كاش',
      thDeliveryStatus: 'الحالة',
      thDeliveryAction: 'إجراء'
    },
    captain: {
      gateTitle: 'بوابة كباتن التوصيل بالإسكندرية',
      gateDesc: 'هذه البوابة مخصصة لكباتن التوصيل والمعاينة المعتمدين فقط ومحمية برمز دخول أمني خاص.',
      pinLabel: 'رمز دخول الكابتن',
      pinPlaceholder: 'أدخل رمز الدخول الخاص بالكابتن',
      unlockBtn: 'دخول بوابة الكابتن 🔓',
      verifiedPill: '✓ جلسة كابتن معتمدة',
      workspaceTitle: '📦 مهام الاستلام والمعاينة النشطة بالإسكندرية',
      workspaceSub: 'تحصيل الكاش، فحص السلعة مع المشتري، وتأكيد التسليم الفوري.',
      refreshTasks: 'تحديث المهام 🔄',
      lockGate: 'قفل البوابة 🔒',
      gpsTitle: '📡 بث الموقع الجغرافي الفعلي للكابتن (Live GPS)',
      gpsOff: 'متوقف 🔴',
      gpsOn: 'مباشر الآن 🟢',
      gpsSub: 'مشاركة موقعك الفعلي تتيح للمشترين والإدارة متابعة خط سير الرحلة وحساب وقت الوصول الدقيق.',
      gpsToggleBtn: '📍 تفعيل بث الموقع المباشر',
      gpsStopBtn: '🛑 إيقاف بث الموقع (GPS)',
      tableCaption: 'مهام الكابتن النشطة',
      thTaskId: 'كود المهمة',
      thItemId: 'كود السلعة',
      thDistrict: 'الحي',
      thAddress: 'عنوان المعاينة',
      thDriver: 'الكابتن المكلف',
      thPhone: 'الهاتف',
      thCash: 'مبلغ التسليم كاش',
      thStatus: 'الحالة',
      thAction: 'إجراء المعاينة'
    },
    admin: {
      gateTitle: 'بوابة الإدارة المركزية والرقابة',
      gateDesc: 'بوابة الإدارة المركزية للتحكم بالمنصة واعتماد طلبات البائعين والكباتن ومتابعة الأداء المالي.',
      pinLabel: 'رمز دخول الإدارة',
      pinPlaceholder: 'أدخل رمز الدخول الإداري',
      unlockBtn: 'دخول لوحة التحكم المركزية 🔓',
      verifiedPill: '✓ جلسة مشرف معتمدة (Super Admin)',
      workspaceTitle: '📊 لوحة التحكم والإحصائيات والرقابة المركزية',
      lockGate: 'قفل لوحة الإدارة 🔒',
      kpiSold: '🛒 إجمالي الصفقات المنفذة',
      kpiSoldSub: 'سلعة بيعت وسُلمت بدون فصال',
      kpiGmv: '💵 إجمالي حجم التداول (GMV)',
      kpiGmvSub: 'قيمة الصفقات بالسعر القطعي',
      kpiNet: '📈 صافي أرباح وعمولات المنصة',
      kpiNetSub: 'إيرادات الوساطة المحصلة (3%–8%)',
      kpiPayouts: '🚚 مدفوعات الكاش للبائعين',
      kpiPayoutsSub: 'مستحقات البائعين المسلمة فوراً',
      topCatsTitle: '🏷️ أكثر أنواع السلع مبيعاً',
      topCatsSub: 'توزيع المبيعات بين الأجهزة، الإلكترونيات، وأثاث العطارين.',
      loadingCats: 'جاري تحميل إحصائيات الأقسام...',
      topDistrictsTitle: '📍 أكثر مناطق الإسكندرية شراءً',
      topDistrictsSub: 'ترتيب الأحياء حسب كثافة الطلبات المؤكدة.',
      loadingDistricts: 'جاري تحميل إحصائيات الأحياء...',
      appsTitle: '🛡️ طابور فحص واعتماد طلبات البائعين والمناديب',
      appsSub: 'مراجعة مستندات الانضمام، السجل التجاري، رخص القيادة، وموافقة تتبع الـ GPS.',
      refreshApps: 'تحديث الطلبات 🔄',
      appsCaption: 'طلبات الانضمام والاعتماد',
      thAppId: 'كود الطلب',
      thAppType: 'نوع الطلب',
      thAppName: 'الاسم الكامل',
      thAppPhone: 'رقم الهاتف',
      thAppDistrict: 'الحي',
      thAppDetails: 'البيانات والوثائق',
      thAppDate: 'التاريخ',
      thAppStatus: 'الحالة',
      thAppAction: 'إجراء الاعتماد',
      chartTitle: '📊 حجم التداول اليومي بالإسكندرية',
      chartSub: 'توزيع الصفقات والعمولات المحققة على مدار الأيام.',
      usersTitle: '👥 إدارة المستخدمين والرقابة',
      usersSub: 'تحكم بحسابات المستخدمين والتجار لضمان الالتزام بالسعر القطعي.',
      refreshUsers: 'تحديث المستخدمين 🔄',
      usersCaption: 'جدول المستخدمين',
      thUserName: 'الاسم الكامل',
      thUserEmail: 'اسم المستخدم / البريد',
      thUserRole: 'الدور',
      thUserDistrict: 'الحي',
      thUserPhone: 'الهاتف',
      thUserOrders: 'الصفقات',
      thUserStatus: 'الحالة',
      thUserAction: 'إجراء الرقابة',
      driversTitle: '🚚 أسطول الكباتن وتغطية الإسكندرية',
      driversSub: 'تتبع حالة الكباتن وتوزيعهم عبر الأحياء.',
      refreshDrivers: 'تحديث الأسطول 🔄',
      driversCaption: 'جدول أسطول الكباتن',
      thDrvId: 'كود الكابتن',
      thDrvName: 'اسم السائق',
      thDrvPhone: 'رقم الهاتف',
      thDrvDistrict: 'حي التغطية',
      thDrvVehicle: 'المركبة',
      thDrvRating: 'التقييم',
      thDrvTrips: 'الرحلات المكتملة',
      thDrvStatus: 'الحالة الحالية',
      thDrvAction: 'إجراء الإسناد'
    },
    reserve: {
      title: '🛒 حجز وشراء فوري — بدون فصال',
      subtitle: 'يتم حجز السلعة وتثبيت السعر واستدعاء أقرب كابتن لتوصيلها إلى باب منزلك مع حق المعاينة الكاملة.',
      itemLabel: 'السلعة المختارة:',
      priceLabel: 'السعر القطعي (ج.م):',
      phoneLabel: 'رقم هاتف المشتري *',
      districtLabel: 'حي التوصيل بالإسكندرية *',
      windowLabel: 'موعد المعاينة المفضل',
      winAsap: 'أقرب وقت متاح اليوم',
      winEvening: 'مساءً (5م – 9م)',
      winTomorrow: 'غداً صباحاً (11ص – 3م)',
      addressLabel: 'عنوان التوصيل والمعاينة بالتفصيل *',
      addressPlaceholder: 'مثال: شارع خالد بن الوليد، سيدي بشر، عمارة 15',
      submitBtn: 'تأكيد الحجز وطلب المندوب للمعاينة'
    },
    adjust: {
      title: '✏️ تعديل السلعة واعتماد التاجر',
      subtitle: 'سيتم توثيق هذا التعديل وأسبابه في سجل المراجعة لضمان الشفافية وجودة التسعير.',
      itemLabel: 'اسم السلعة:',
      gradeLabel: 'الدرجة المصححة *',
      priceLabel: 'السعر المصحح (ج.م) *',
      notesLabel: 'سبب التعديل وملاحظات التاجر *',
      notesPlaceholder: 'اكتب سبب تعديل السعر أو الدرجة...',
      submitBtn: 'حفظ التعديل والاعتماد الفوري'
    },
    askBot: {
      title: '💬 استفسر عن السلعة',
      fastReply: 'رد فوري بالذكاء الاصطناعي < 2 ثانية',
      inputLabel: 'اكتب سؤالك حول السلعة',
      placeholder: 'اسأل عن المعاينة، السعر، أو التوصيل...'
    },
    pdp: {
      locationLabel: 'موقع السلعة:',
      attrBrand: 'الماركة / الموديل',
      attrCategory: 'القسم',
      attrGrade: 'درجة الفحص',
      attrConfidence: 'ثقة الفحص الذكي',
      verifiedAi: 'مفحوص ومعتمد',
      benchmarkTitle: '📊 مؤشر السعر العادل مقارنة بالسوق',
      benchmarkFairTag: 'سعر عادل ومطابق للمؤشر',
      sellerVerifiedName: 'بائع معتمد — آنتي فصال',
      verifiedSellerPill: 'موثق ✓',
      compareBtn: '⚖️ قارن'
    },
    kycSeller: {
      title: 'طلب انضمام بائع معتمد',
      subtitle: 'انضم لشبكة البائعين المعتمدين في الإسكندرية. بيع بالذكاء الاصطناعي مع استلام الكاش الفوري عند باب بيتك أو محلك.',
      step1: '1. البيانات الشخصية',
      step2: '2. النشاط والمستندات',
      nameLabel: 'الاسم الكامل (أو الممثل التجاري) *',
      phoneLabel: 'رقم الهاتف والواتساب *',
      nidLabel: 'الرقم القومي (14 رقم) *',
      districtLabel: 'حي الاستلام بالإسكندرية *',
      shopLabel: 'اسم المتجر / المعرض / الورشة *',
      bTypeLabel: 'نوع النشاط التجاري *',
      tierLabel: 'باقة العمولة المفضلة *',
      payoutLabel: 'محفظة فودافون كاش / الحساب *',
      docLabel: 'صورة البطاقة الشخصية أو السجل التجاري',
      agreeText: 'أقر بصحة البيانات وأوافق على سياسة الأسعار القطعية وتفويض كباتن آنتي فصال بالمعاينة والتسليم بدون فصال.',
      submitBtn: '📝 إرسال طلب الانضمام للمراجعة'
    },
    kycDriver: {
      title: 'طلب انضمام كابتن توصيل ومعاينة',
      subtitle: 'انضم لأسطول كباتن الإسكندرية. استلم السلع، سَلّم الكاش الفوري، ووصّل للمشترين بعائد مجزي لكل مشوار.',
      step1: '1. الهوية والمنطقة',
      step2: '2. المركبة والمستندات',
      nameLabel: 'اسم الكابتن الرباعي *',
      phoneLabel: 'رقم الهاتف المحمول *',
      nidLabel: 'الرقم القومي (14 رقم) *',
      districtLabel: 'حي التمركز الأساسي بالإسكندرية *',
      vehicleLabel: 'نوع وسيلة النقل *',
      plateLabel: 'رقم اللوحة المعدنية *',
      licenseLabel: 'رقم رخصة القيادة السارية *',
      docLabel: 'صورة رخصة القيادة ورخصة المركبة',
      gpsConsentText: '⚠️ أوافق صراحة وإلزامياً على مشاركة موقعي الجغرافي الفعلي (Real-Time GPS) مع المشتري والإدارة أثناء استلام وتوصيل الشحنات بالإسكندرية.',
      submitBtn: '🚚 إرسال طلب انضمام الكابتن'
    },
    partner: {
      title: 'انضم كشريك نجاح في آنتي فصال',
      subtitle: 'اختر المسار المناسب لك للانضمام إلى شبكة البائعين المعتمدين أو أسطول كباتن التوصيل بالإسكندرية.',
      sellerTitle: 'بائع أو تاجر معتمد',
      sellerDesc: 'اعرض أجهزتك أو أثاثك، احصل على تقييم ذكي فوري، واستلم الكاش عند التسليم بدون فصال.',
      sellerBtn: 'تقديم طلب بائع',
      driverTitle: 'كابتن توصيل ومعاينة',
      driverDesc: 'استلم ووصل الشحنات في أحياء الإسكندرية بدخل يومي ممتاز ونظام تتبع GPS مباشر.',
      driverBtn: 'تقديم طلب كابتن'
    },
    confirm: {
      defaultTitle: 'تأكيد الإجراء',
      defaultMsg: 'هل أنت متأكد من المتابعة في هذا الإجراء؟'
    },
    common: {
      cancel: 'إلغاء',
      confirm: 'تأكيد المتابعة',
      nextStep: 'الخطوة التالية ←',
      prevStep: 'السابق',
      refreshList: 'تحديث القائمة 🔄',
      send: 'إرسال',
      closeModal: 'إغلاق النافذة'
    }
  },
  en: {
    skipToContent: 'Skip to main content',
    offlineBanner: 'You are browsing offline — showing locally cached content.',
    brandName: 'Anti-Fesal',
    brandFull: 'Anti-Fesal (آنتي فصال)',
    sellCta: 'Sell with AI Appraisal',
    searchPlaceholder: 'Search home appliances, laptops, El-Attarine furniture...',
    langCodeBadge: 'عربي',
    langBtnTitle: 'التحويل للغة العربية',
    accountBtn: 'Account',
    signInLabel: 'Sign In',
    allDistricts: 'All Alexandria 📍',
    allDistrictsShort: 'All Districts',
    fixedPriceTag: 'Fixed Price • No Bargaining',
    reserveBtn: '🛒 Inspect & Reserve',
    askBotBtn: '💬 Ask AI Bot',
    currency: 'EGP',
    currencyLong: 'Egyptian Pounds',
    loadingMore: '⚡ Loading next batch of items...',
    allLoaded: '✓ All available items displayed',
    specsAi: '🤖 AI Inspection:',
    specsDefects: '🔍 Detected Defects:',
    specsDelivery: '🚚 Delivery & Inspection:',
    specsDeliveryVal: 'Full hands-on trial with driver before cash payment',
    authHeadingLogin: 'Sign in to Anti-Fesal',
    authHeadingRegister: 'Create an Anti-Fesal Account',
    authSubheading: 'Price it, sell it, without bargaining headache',
    authTabLogin: 'Sign In',
    authTabRegister: 'Create Account',
    authGoogleBtn: 'Quick Sign in with Google',
    authDivider: 'or via email & username',
    authFullName: 'Full Name *',
    authEmail: 'Email or Username *',
    authPassword: 'Password *',
    authSubmitLogin: 'Sign In',
    authSubmitRegister: 'Create Account',
    botTitle: '🤖 Anti-Fesal Smart Comparator',
    botOnline: '• Online Now',
    botWelcome: 'Welcome! 👋 I am your Anti-Fesal AI Assistant. Ask about any item, compare products, or get recommendations for the best fixed price in Alexandria!',
    botPlaceholder: 'e.g., Compare Toshiba and Samsung refrigerators...',
    botInputLabel: 'Write your message to Smart Comparator',
    botBtnAria: 'Open Smart Search & Compare Assistant',
    botClearAria: 'Clear conversation',
    footerDesc: "Alexandria's premier autonomous AI secondhand re-commerce platform. Fair fixed pricing without bargaining headache, backed by full cash-on-inspection guarantee.",
    footerSlogan: '"Price it, sell it, without bargaining headache"',
    footerColCategories: 'Verified Categories',
    footerCatAll: '🛍️ All Listings',
    footerCatAppliances: '❄️ Home Appliances',
    footerCatElectronics: '💻 Electronics & TVs',
    footerCatFurniture: '🛋️ El-Attarine Furniture',
    footerColDistricts: 'Alexandria Coverage Areas 📍',
    footerColSupport: 'Support & Partnering',
    footerLinkPrice: '📊 Fair Price Index',
    footerLinkTrack: '🔍 Track Order & Captain',
    footerLinkAbout: '🛡️ Inspection Guarantee & FAQ',
    footerLinkPackages: '💎 Trader & Workshop Plans',
    footerLinkBecomeSeller: '🏷️ Become a Verified Seller',
    footerLinkBecomeDriver: '🚚 Join Captain Fleet',
    footerLinkDocs: '📄 Developer Docs (API)',
    footerTagline: 'Anti-Fesal Alexandria — Smart, fair secondhand commerce with full inspection guarantee.',
    footerCopyrightReserved: '© 2026 Anti-Fesal Alexandria. All rights reserved.',
    districts: {
      'El-Attarine': 'El-Attarine',
      'El-Mansheya': 'El-Mansheya',
      'Sidi Beshr': 'Sidi Beshr',
      'Moharam Bek': 'Moharam Bek',
      'Smouha': 'Smouha',
      'Miami': 'Miami',
      'Loran': 'Loran',
      'Gleem': 'Gleem',
      'Roushdy': 'Roushdy'
    },
    chips: {
      All: 'All Categories 🏷️',
      Appliances: 'Home Appliances ❄️',
      Electronics: 'Electronics & TVs 💻',
      Furniture: 'El-Attarine Furniture 🛋️'
    },
    header: {
      districtLabel: 'Select Alexandria District',
      searchLabel: 'Search listings',
      partnerBtn: 'Partner With Us',
      homeAria: 'Home — Verified Showroom',
      openSearch: 'Instant Search in Alexandria',
      searchBtnAria: 'Search',
      closeSearch: 'Close Search',
      themeAria: 'Toggle Dark Mode',
      accountAria: 'My Account'
    },
    nav: {
      showroom: 'Verified Showroom',
      tracking: 'Live Tracking & Map',
      priceIndex: 'Fair Price Index',
      about: 'Guarantee & FAQ',
      ariaLabel: 'Primary Buyer Navigation',
      mobileAria: 'Mobile Quick Navigation'
    },
    mobNav: {
      showroom: 'Showroom',
      sell: 'AI Sell',
      track: 'Track',
      prices: 'Prices',
      account: 'Account'
    },
    hero: {
      eyebrow: "Alexandria's Verified Secondhand Marketplace",
      title: 'Buy Guaranteed Secondhand Items at a Fair Fixed Price — Zero Haggling',
      subtitle: 'Every listing is AI-inspected and priced transparently against Alexandria market benchmarks, with full hands-on inspection at your door before paying cash.',
      badgeAiTitle: 'AI Visual Inspection',
      badgeAiSub: 'Defect report & A–D condition grade',
      badgeFixedTitle: 'Fixed Price • No Fesal',
      badgeFixedSub: 'Alexandria fair market benchmark',
      badgeCashTitle: 'Cash After Inspection',
      badgeCashSub: 'Test with our Captain first'
    },
    showroom: {
      loadingFeed: 'Loading verified Alexandria listings...',
      sortLabel: 'Sort listings',
      sortNewest: 'Newest First',
      sortPriceAsc: 'Price: Low to High',
      sortPriceDesc: 'Price: High to Low',
      sortGradeBest: 'Condition Grade: Best First',
      favoritesOnly: 'Favorites',
      categoryGroupAria: 'Filter by category',
      districtGroupAria: 'Alexandria districts',
      viewModeAria: 'View mode',
      viewGrid: 'Grid view',
      viewList: 'List view',
      feedStats: (count) => `Showing ${formatNum(count)} verified items in Alexandria`,
      emptyTitle: 'No matching items found right now',
      emptySub: 'Try changing the district or search, or price your own item with AI in seconds!',
      emptyBtn: '+ Start AI Appraisal Now',
      dispatchedBadge: 'Reserved • In Dispatch',
      soldBadge: 'Sold',
      cleanDefect: '✓ 100% Inspected & Clean',
      aiConfidence: 'AI Confidence',
      gradeA: 'Grade A (Like New)',
      gradeB: 'Grade B (Excellent)',
      gradeC: 'Grade C (Good)',
      gradeD: 'Grade D (Fair / Needs Care)'
    },
    seller: {
      pageTitle: '⚡ List & Price Your Item with AI',
      pageSubtitle: 'Upload clear photos of your appliance, laptop, or furniture and describe its condition — get a fair valuation and instant cash buyout quote in seconds.',
      step1: 'Item Details',
      step2: 'Photos & Condition',
      step3: 'Pricing & Cash Offer',
      step1Heading: '1. Basic Details & Pickup Location',
      titleLabel: 'Item Title & Model *',
      titlePlaceholder: 'e.g., Toshiba 16 cu ft No-Frost Refrigerator Silver',
      categoryLabel: 'Category *',
      catAppliances: 'Home Appliances',
      catElectronics: 'Electronics',
      catFurniture: 'Furniture',
      districtLabel: 'Alexandria Pickup District *',
      phoneLabel: 'Contact Phone Number *',
      tierLabel: 'Seller Plan *',
      tierEveryday: 'Everyday Seller (8% fee • Instant Cash)',
      tierPro: 'Pro Trader (5% fee)',
      tierEnterprise: 'Showroom / Workshop (3% fee)',
      step2Heading: '2. Item Photos & Condition Description',
      photosLabel: 'Product Photos (1 to 4 clear photos)',
      slotCover: '1. Cover Photo',
      slotAngle2: '2. Side Angle',
      slotAngle3: '3. Model Label',
      slotAngle4: '4. Details / Scuffs',
      dropTitle: 'Drag & drop photos here or click to choose',
      dropSub: 'Up to 4 well-lit photos (PNG / JPG — max 10MB each)',
      dropZoneAria: 'Click or drag photos here to upload',
      descLabel: 'Condition Description (Arabic or English) *',
      descPlaceholder: 'Describe honestly: usage duration, any scratches or repairs, original box/invoice availability...',
      submitBtn: 'Start Instant AI Inspection & Pricing',
      tipsTitle: '💡 Tips for the Highest Instant Valuation',
      tip1: 'Take photos in bright daylight with a clear front cover shot.',
      tip2: 'Include a photo of the brand/model label to boost AI confidence above 90%.',
      tip3: 'Mention any prior service or scratches honestly to avoid manual review delays.',
      receiptEyebrow: 'Instant Inspection & Valuation Receipt',
      recCatModel: 'Detected Category & Model:',
      recGrade: 'Standard Condition Grade:',
      recConfidence: 'AI Confidence Score:',
      recDefects: 'Detected Defects:',
      recResale: 'Fair Fixed Resale Price:',
      recCommission: 'Locked Platform Commission:',
      recPayoutTitle: 'Instant Cash Buyout Offer:',
      recPayoutSub: 'Paid in cash by our Captain at pickup',
      acceptQuoteBtn: 'Accept Offer & Dispatch Pickup Captain',
      resetBtn: 'Price Another Item'
    },
    merchant: {
      pageTitle: '🛡️ Merchant Review & Approval Desk',
      pageSubtitle: 'Review and calibrate items requiring price confirmation or extra inspection before showroom publication.',
      kpiTotal: 'Total Alexandria Listings',
      kpiTotalSub: 'Across all active categories',
      kpiAutoRate: 'Auto-Approval Rate',
      kpiAutoRateSub: 'Target benchmark: >= 70%',
      kpiPending: 'Pending Review Queue (<80%)',
      kpiPendingSub: 'Items awaiting merchant verification',
      kpiComm: 'Locked Commissions Total',
      kpiCommSub: 'Confirmed brokerage earnings',
      queueTitle: 'Review & Approval Queue',
      queueSub: 'Items with inspection confidence below 80% due to unclear photos or defects needing confirmation.',
      tableCaption: 'Pending merchant review queue',
      thId: 'Item ID',
      thTitle: 'Title & Model',
      thDistrict: 'District',
      thGrade: 'Suggested Grade',
      thConf: 'Confidence',
      thDefects: 'Detected Defects',
      thPrice: 'Suggested Price',
      thAction: 'Merchant Actions',
      emptyQueue: '✓ Review queue is completely empty! All listings are verified.',
      btnApprove: 'Approve',
      btnAdjust: 'Adjust',
      btnReject: 'Reject'
    },
    trader: {
      pageTitle: '💎 Trader & Workshop Plans & Growth Studio',
      pageSubtitle: 'Lower your commission and unlock 24/7 AI marketing and anti-haggling tools for your Alexandria shop.',
      tier1Name: 'Everyday Seller',
      tier1Price: 'Free',
      tier1Comm: '8% fee per completed sale',
      tier1F1: '✓ Instant AI visual inspection',
      tier1F2: '✓ Instant doorstep cash payout',
      tier1F3: '✓ 100% Captain inspection guarantee',
      tier1F4: '✓ WhatsApp support',
      tier1Btn: 'Default Plan',
      popularTag: 'Most Popular for Traders',
      tier2Name: 'Pro Trader',
      perMonth: 'EGP / month',
      tier2Comm: 'Reduced 5% fee only',
      tier2F1: '✓ All Everyday Seller benefits',
      tier2F2: '✓ Auto-generated Facebook & Instagram ads',
      tier2F3: '✓ 24/7 anti-haggling auto-reply bot',
      tier2F4: '✓ Verified Alexandria Trader badge',
      tier2Btn: 'Upgrade to Pro Trader',
      tier3Name: 'Showrooms & Workshops (Enterprise)',
      tier3Comm: 'Lowest 3% fee only',
      tier3F1: '✓ All Pro Trader benefits',
      tier3F2: '✓ Direct WhatsApp Business catalog sync',
      tier3F3: '✓ Priority Captain fleet & settlement',
      tier3F4: '✓ Weekly market price movement reports',
      tier3Btn: 'Activate Enterprise Plan',
      adGenTitle: '📢 1-Click Smart Ad Copy Generator',
      adGenSub: 'Localized Egyptian social copy with verified grade badges and direct reservation links.',
      adSelectLabel: 'Select an item to generate ad copy:',
      adGenBtn: 'Generate Social Ads ⚡',
      adFbTitle: '📘 Facebook Marketplace Post',
      copyPost: 'Copy Post',
      adIgTitle: '📸 Instagram Story Caption',
      copyText: 'Copy Text',
      adWaTitle: '💬 WhatsApp Catalog Message',
      copyMsg: 'Copy Message',
      simTitle: '💬 Anti-Haggling Auto-Reply Simulator',
      simSub: 'Test how the AI assistant handles buyer inquiries and deflects haggling politely.',
      simWelcome: 'Welcome! I am the Anti-Fesal AI assistant. Pick an item and type any buyer question — I will reply instantly with clarity and zero room for haggling! 🌊',
      simMetaNow: 'Anti-Fesal • Just now',
      simTry: 'Quick try:',
      simInputLabel: 'Enter buyer message',
      simInputPlaceholder: 'Type a buyer inquiry here and press Send...',
      calcTitle: '💰 Trader Commission Savings Calculator',
      calcSub: 'Adjust your expected monthly sales volume to see how much you save with Pro or Enterprise plans.',
      calcSliderLabel: 'Expected Monthly Sales Volume in Alexandria:',
      cmpEveryday: 'Everyday Seller',
      cmpFeeLabel: 'Commission Deducted:',
      cmpNoSub: 'No monthly fee',
      cmpPro: 'Pro Trader',
      cmpEnterprise: 'Enterprise Workshop'
    },
    logs: {
      pageTitle: '🚚 Dispatches & Audit Telemetry Logs',
      pageSubtitle: 'Track pickup dispatches, daily catalog checks, and operational quality logs.',
      dispatchesTitle: 'Active Alexandria Pickups & Dispatches',
      dispatchesSub: 'Monitor courier pickup tasks, seller cash payouts, and retries.',
      refreshDispatches: 'Refresh Dispatches 🔄',
      dispatchesCaption: 'Pickup and delivery dispatches table',
      thTaskId: 'Task ID',
      thItemId: 'Item ID',
      thDistrict: 'District',
      thAddress: 'Pickup Address',
      thDriver: 'Assigned Driver',
      thCash: 'Cash Payout',
      thRetries: 'Retries',
      thStatus: 'Status',
      thAction: 'Action',
      catalogTitle: '📚 Daily Catalog Health & Filter Loop',
      catalogSub: 'Audits approved inventory automatically and skips incomplete or imageless records.',
      runCatalogBtn: 'Run Catalog Check 🚀',
      auditTitle: '📋 Live Audit & Observability Logs',
      auditSub: 'Real-time operational logs for automation, skipped items, and merchant adjustments.',
      refreshLogs: 'Refresh Logs 🔄',
      tabAutomation: 'Automation Log',
      tabSkipped: 'Skipped Items',
      tabCorrections: 'Review Overrides',
      tableCaption: 'Audit logs table'
    },
    priceIndex: {
      pageTitle: '📊 Alexandria Fair Secondhand Price Index',
      pageSubtitle: 'Live benchmark prices from El-Attarine, El-Mansheya, and Moharam Bek markets to protect buyers and sellers.',
      catFilterLabel: 'Filter by category',
      searchLabel: 'Search model',
      searchPlaceholder: 'Search model (e.g., Toshiba, Zanussi)...',
      tableCaption: 'Fair price matrix by condition grade',
      thCategory: 'Category',
      thModel: 'Brand & Model',
      thBase: 'Reference Base',
      thDep: 'Annual Depreciation',
      thAction: 'Action'
    },
    tracking: {
      pageTitle: '🔍 Live Order & Captain Tracking',
      pageSubtitle: 'Enter your Deal ID, Item ID, or phone number to follow your Captain live in Alexandria before cash-on-inspection.',
      inputLabel: 'Deal ID, Item ID, or Phone',
      inputPlaceholder: 'Enter Deal ID (DEAL-xxxx), Item ID (AF-xxxx), or phone...',
      submitBtn: 'Track Shipment 🚀',
      quickLabel: 'Quick demo links:',
      waitTitle: 'Waiting for Deal ID, Item ID, or Phone',
      waitSub: 'Click any quick pill above to inspect the live Alexandria delivery route immediately.',
      alertTitle: 'Shipment Pickup Alert (Live Update)',
      liveBadge: 'Live Now 🟢',
      driverCardTitle: '🚚 Assigned Captain',
      districtLabel: 'Coverage District:',
      addressLabel: 'Inspection Address:',
      cashLabel: 'Cash on Inspection:',
      callDriver: 'Call Captain',
      whatsappDriver: 'WhatsApp',
      itemCardTitle: '📦 Reserved Item Summary',
      fixedNote: '✓ Fixed price locked — zero haggling',
      checklistTitle: '✅ Buyer Pre-Cash Inspection Checklist',
      checklistSub: 'Verify these points with your Captain before paying cash:',
      chk1: 'Model & visible condition match the AI inspection report',
      chk2: 'Power on and test the item thoroughly for at least 5 minutes',
      chk3: 'Amount requested matches the locked fixed price',
      mapTitle: '🗺️ Live Interactive Captain Route Map',
      mapSub: 'Real-time route tracking between pickup point and your Alexandria inspection address.',
      etaLoading: '⏳ Calculating live ETA...',
      refreshMap: 'Refresh Location 🔄',
      mapFallbackText: 'Alexandria route summary mode — Captain is en route between pickup and inspection address.',
      legendSeller: 'Pickup Point (Seller):',
      legendDriver: 'Live Captain Location:',
      legendBuyer: 'Inspection Address (Buyer):'
    },
    about: {
      trustPill: 'Alexandria Buyer & Seller Trust Charter',
      heroTitle: '"Price it, sell it, without bargaining headache"',
      heroDesc: "Alexandria's first AI-powered secondhand marketplace built to eliminate wasted time, lowballing, and haggling through transparent grading and fixed fair pricing.",
      guaranteesTitle: '🌟 Five Anti-Fesal Guarantees in Alexandria',
      g1Title: '1. Fair Fixed Price — Zero Haggling',
      g1Desc: 'Neutral valuation anchored to Alexandria market prices and real model depreciation — no inflated asks or lowball offers.',
      g2Title: '2. Multi-Angle AI Visual Inspection',
      g2Desc: 'Computer vision analyzes 1–4 photos to detect scratches and surface flaws and assign an objective A–D grade.',
      g3Title: '3. Full Inspection Before Paying',
      g3Desc: 'Buyers pay nothing upfront until our Captain arrives and you test and verify the item matches its report.',
      g4Title: '4. Instant Doorstep Cash Payout',
      g4Desc: 'Sellers receive instant cash on the spot when our Captain picks up the item — no waiting for end buyers.',
      g5Title: '5. Supporting Alexandria Traders & Workshops',
      g5Desc: 'Reduced 3%–5% commission plans for El-Attarine and El-Mansheya merchants plus 24/7 AI marketing tools.',
      faqTitle: '❓ Frequently Asked Questions',
      faq1Q: 'How does AI item inspection and pricing work?',
      faq1A: 'The platform analyzes item photos alongside the seller description and compares them with the Alexandria Price Matrix to determine category, model, grade (A–D), and confidence score.',
      faq2Q: 'What if the item does not match my expectations during inspection?',
      faq2A: 'You have the full right to decline delivery without paying anything, and our Captain returns the item to our quality review team.',
      faq3Q: 'What do the four condition grades (A–D) mean?',
      faq3A: 'Grade A (100%): Like new • Grade B (80%): Light clean use • Grade C (60%): Noticeable cosmetic flaws, fully functional • Grade D (35%): Needs light maintenance or refurbishment.',
      faq4Q: 'How can I unlock the reduced 3% and 5% commission tiers?',
      faq4A: 'Alexandria traders can apply via "Partner With Us" and select Pro Trader or Enterprise to unlock 5% or 3% rates and automated marketing tools.'
    },
    account: {
      guestName: 'Guest',
      guestBadge: 'Not Signed In',
      lblDistrictPrefix: 'District:',
      lblEmailPrefix: 'Email:',
      lblPhonePrefix: 'Phone:',
      navInfo: 'Account Overview',
      navSettings: 'Account Settings',
      navSeller: 'My Ads & Sales',
      navBuyer: 'My Buyer Orders',
      navFavorites: 'Saved Favorites',
      navDelivery: 'Delivery Logs',
      logout: 'Sign Out',
      appHeading: 'Onboarding Application Status',
      appPendingText: 'Your application is under review by central administration.',
      openPortalBtn: 'Open Portal 🚀',
      infoTitle: 'Account Dashboard & Profile Information',
      infoSubtitle: 'Summary of your selling, buying, and dispatch activities across verified Alexandria markets.',
      kpiSellerTitle: '📦 My Seller Listings',
      kpiSellerSub: 'AI-inspected with fixed fair value',
      kpiBuyerTitle: '🛒 My Buyer Reservations',
      kpiBuyerSub: 'Pending cash-on-inspection delivery',
      kpiCashTitle: '💵 Instant Cash Payouts',
      kpiCashSub: 'Received directly with zero hidden cuts',
      cardHeader: '📋 Membership & Verification Details',
      cellId: 'Membership ID',
      cellDate: 'Registration Date',
      cellDistrict: 'Coverage District',
      cellStatus: 'Account Status',
      btnQuickSell: 'Price New Item with AI',
      btnQuickShowroom: 'Browse Verified Showroom 🛍️',
      settingsTitle: '⚙️ Account Settings & Preferences',
      settingsSubtitle: 'Manage your personal profile, display preferences, and notification channels.',
      lblFullName: 'Full Name *',
      lblPhone: 'Phone Number (for Captain Contact) *',
      lblDistrict: 'Primary Alexandria District *',
      lblLang: 'Preferred Language',
      lblTheme: 'Appearance & Theme',
      lblNotifications: 'SMS & Delivery Notifications',
      btnSaveSettings: 'Save Preferences',
      btnCancelSettings: 'Cancel & Return',
      sellerTitle: '🏷️ My Ads & Seller Listings',
      sellerSubtitle: 'Items you submitted, AI inspection grades, and instant cash buyout values.',
      btnSellerAdd: 'Price New Item',
      sellerTableCaption: 'Seller items history',
      thSellerId: 'Item ID',
      thSellerTitle: 'Item Name & Model',
      thSellerDistrict: 'District',
      thSellerGrade: 'Grade',
      thSellerPrice: 'Resale Price',
      thSellerCash: 'Instant Cash',
      thSellerStatus: 'Status',
      thSellerAction: 'Action',
      buyerTitle: '🛒 My Buyer Reservations & Orders',
      buyerSubtitle: 'Your reserved items with full hands-on inspection before cash payment.',
      btnBuyerBrowse: 'Browse Showroom 🛍️',
      buyerTableCaption: 'Buyer deals history',
      thBuyerDealId: 'Deal ID',
      thBuyerItemTitle: 'Item Name',
      thBuyerPrice: 'Locked Price',
      thBuyerAddress: 'Inspection Address',
      thBuyerStatus: 'Deal Status',
      thBuyerAction: 'Track',
      favoritesTitle: '❤️ Saved Favorites',
      favoritesSub: 'Items you bookmarked for later review or reservation.',
      deliveryTitle: '🚚 Courier Delivery Logs',
      deliverySubtitle: 'Record of pickups, buyer inspection handoffs, and cash payouts in Alexandria.',
      btnCaptainGate: 'Open Captain Portal 🔐',
      deliveryTableCaption: 'Courier delivery logs',
      thDeliveryTaskId: 'Task ID',
      thDeliveryDistrict: 'District',
      thDeliveryAddress: 'Inspection Address',
      thDeliveryCash: 'Cash Payout',
      thDeliveryStatus: 'Status',
      thDeliveryAction: 'Action'
    },
    captain: {
      gateTitle: 'Alexandria Delivery Captain Portal',
      gateDesc: 'This portal is restricted to verified delivery & inspection Captains and protected by a security PIN.',
      pinLabel: 'Captain Access PIN',
      pinPlaceholder: 'Enter Captain access PIN',
      unlockBtn: 'Unlock Captain Portal 🔓',
      verifiedPill: '✓ Verified Captain Session',
      workspaceTitle: '📦 Active Alexandria Pickup & Inspection Tasks',
      workspaceSub: 'Pay sellers instantly in cash, supervise buyer testing, and settle orders.',
      refreshTasks: 'Refresh Tasks 🔄',
      lockGate: 'Lock Portal 🔒',
      gpsTitle: '📡 Live Captain GPS Broadcast',
      gpsOff: 'Offline 🔴',
      gpsOn: 'Live Now 🟢',
      gpsSub: 'Sharing your live GPS allows buyers and dispatchers to track route progress and accurate ETA.',
      gpsToggleBtn: '📍 Start Live GPS Broadcast',
      gpsStopBtn: '🛑 Stop GPS Broadcast',
      tableCaption: 'Active captain tasks',
      thTaskId: 'Task ID',
      thItemId: 'Item ID',
      thDistrict: 'District',
      thAddress: 'Address',
      thDriver: 'Captain',
      thPhone: 'Phone',
      thCash: 'Cash Payout',
      thStatus: 'Status',
      thAction: 'Inspection Step'
    },
    admin: {
      gateTitle: 'Central Admin & Governance Portal',
      gateDesc: 'Central operations console for onboarding approvals, financial analytics, and fleet oversight.',
      pinLabel: 'Admin Access PIN',
      pinPlaceholder: 'Enter Admin access PIN',
      unlockBtn: 'Unlock Admin Console 🔓',
      verifiedPill: '✓ Verified Super Admin Session',
      workspaceTitle: '📊 Central Analytics, Financials & Governance',
      lockGate: 'Lock Admin Console 🔒',
      kpiSold: '🛒 Completed Deals',
      kpiSoldSub: 'Items sold with zero haggling',
      kpiGmv: '💵 Gross Merchandise Value (GMV)',
      kpiGmvSub: 'Total fixed-price deal volume',
      kpiNet: '📈 Net Platform Commission',
      kpiNetSub: 'Brokerage fees earned (3%–8%)',
      kpiPayouts: '🚚 Seller Cash Payouts',
      kpiPayoutsSub: 'Instant cash disbursed to sellers',
      topCatsTitle: '🏷️ Top Selling Categories',
      topCatsSub: 'Sales breakdown across Appliances, Electronics, and Furniture.',
      loadingCats: 'Loading category analytics...',
      topDistrictsTitle: '📍 Top Alexandria Districts',
      topDistrictsSub: 'Districts ranked by confirmed order density.',
      loadingDistricts: 'Loading district analytics...',
      appsTitle: '🛡️ Seller & Captain KYC Verification Queue',
      appsSub: 'Review shop credentials, driver licenses, and mandatory GPS consent.',
      refreshApps: 'Refresh Applications 🔄',
      appsCaption: 'Onboarding KYC applications',
      thAppId: 'App ID',
      thAppType: 'Role',
      thAppName: 'Full Name',
      thAppPhone: 'Phone',
      thAppDistrict: 'District',
      thAppDetails: 'Submitted Details',
      thAppDate: 'Date',
      thAppStatus: 'Status',
      thAppAction: 'Decision',
      chartTitle: '📊 Daily Trading Volume (GMV)',
      chartSub: 'Distribution of deal volume across recent days.',
      usersTitle: '👥 Users & Moderation',
      usersSub: 'Monitor accounts and enforce fixed-price marketplace compliance.',
      refreshUsers: 'Refresh Users 🔄',
      usersCaption: 'Users directory',
      thUserName: 'Full Name',
      thUserEmail: 'Username / Email',
      thUserRole: 'Role',
      thUserDistrict: 'District',
      thUserPhone: 'Phone',
      thUserOrders: 'Orders',
      thUserStatus: 'Status',
      thUserAction: 'Moderation',
      driversTitle: '🚚 Captain Fleet Coverage',
      driversSub: 'Monitor active fleet availability and Alexandria coverage.',
      refreshDrivers: 'Refresh Fleet 🔄',
      driversCaption: 'Captain fleet directory',
      thDrvId: 'Driver ID',
      thDrvName: 'Driver Name',
      thDrvPhone: 'Phone',
      thDrvDistrict: 'District',
      thDrvVehicle: 'Vehicle',
      thDrvRating: 'Rating',
      thDrvTrips: 'Completed Trips',
      thDrvStatus: 'Status',
      thDrvAction: 'Dispatch Control'
    },
    reserve: {
      title: '🛒 Instant Fixed-Price Reservation',
      subtitle: 'Lock this item at its verified fixed price and dispatch our nearest Captain for doorstep inspection.',
      itemLabel: 'Selected Item:',
      priceLabel: 'Fixed Price (EGP):',
      phoneLabel: 'Buyer Phone Number *',
      districtLabel: 'Alexandria Delivery District *',
      windowLabel: 'Preferred Inspection Window',
      winAsap: 'Earliest Available Today',
      winEvening: 'Evening (5 PM – 9 PM)',
      winTomorrow: 'Tomorrow Morning (11 AM – 3 PM)',
      addressLabel: 'Detailed Delivery & Inspection Address *',
      addressPlaceholder: 'e.g., 15 Khaled Ibn El-Walid St, Sidi Beshr',
      submitBtn: 'Confirm Reservation & Dispatch Captain'
    },
    adjust: {
      title: '✏️ Merchant Grade & Price Override',
      subtitle: 'This override and reason will be permanently logged to the audit trail.',
      itemLabel: 'Item Name:',
      gradeLabel: 'Corrected Grade *',
      priceLabel: 'Corrected Price (EGP) *',
      notesLabel: 'Adjustment Reason & Notes *',
      notesPlaceholder: 'Explain why price or grade was adjusted...',
      submitBtn: 'Save Override & Approve Immediately'
    },
    askBot: {
      title: '💬 Inquire About Item',
      fastReply: 'Instant AI reply < 2 seconds',
      inputLabel: 'Ask a question about this item',
      placeholder: 'Ask about inspection, availability, or delivery...'
    },
    pdp: {
      locationLabel: 'Item Location:',
      attrBrand: 'Brand / Model',
      attrCategory: 'Category',
      attrGrade: 'Inspection Grade',
      attrConfidence: 'AI Confidence',
      verifiedAi: 'AI Verified & Approved',
      benchmarkTitle: '📊 Fair Market Price Benchmark',
      benchmarkFairTag: 'Fair & Market-Aligned Price',
      sellerVerifiedName: 'Verified Seller — Anti-Fesal',
      verifiedSellerPill: 'Verified ✓',
      compareBtn: '⚖️ Compare'
    },
    kycSeller: {
      title: 'Verified Seller Application',
      subtitle: 'Join Alexandria’s verified seller network. Get instant AI appraisals and doorstep cash payouts.',
      step1: '1. Personal Info',
      step2: '2. Business & Docs',
      nameLabel: 'Full Name (or Trade Representative) *',
      phoneLabel: 'Phone & WhatsApp Number *',
      nidLabel: 'National ID (14 digits) *',
      districtLabel: 'Alexandria Pickup District *',
      shopLabel: 'Shop / Showroom / Workshop Name *',
      bTypeLabel: 'Business Type *',
      tierLabel: 'Preferred Commission Plan *',
      payoutLabel: 'Vodafone Cash / Payout Account *',
      docLabel: 'National ID or Commercial Register Photo',
      agreeText: 'I confirm all details are accurate and agree to fixed-price zero-haggling inspection policies.',
      submitBtn: '📝 Submit Seller Application'
    },
    kycDriver: {
      title: 'Delivery Captain Application',
      subtitle: 'Join our Alexandria Captain fleet. Pick up items, deliver instant cash, and earn per trip.',
      step1: '1. Identity & Zone',
      step2: '2. Vehicle & Docs',
      nameLabel: 'Full Name *',
      phoneLabel: 'Mobile Phone Number *',
      nidLabel: 'National ID (14 digits) *',
      districtLabel: 'Primary Alexandria Base District *',
      vehicleLabel: 'Vehicle Type *',
      plateLabel: 'License Plate Number *',
      licenseLabel: 'Valid Driver License Number *',
      docLabel: 'Driver License & Vehicle Registration Photo',
      gpsConsentText: '⚠️ I explicitly consent to mandatory real-time GPS location sharing with buyers and admins during active deliveries in Alexandria.',
      submitBtn: '🚚 Submit Captain Application'
    },
    partner: {
      title: 'Partner With Anti-Fesal',
      subtitle: 'Choose your path to join our verified Alexandria seller network or Captain delivery fleet.',
      sellerTitle: 'Verified Seller or Trader',
      sellerDesc: 'List appliances, electronics, or furniture, get instant AI pricing, and receive cash at pickup.',
      sellerBtn: 'Apply as Seller',
      driverTitle: 'Delivery & Inspection Captain',
      driverDesc: 'Deliver and inspect orders across Alexandria neighborhoods with great daily earnings and live GPS.',
      driverBtn: 'Apply as Captain'
    },
    confirm: {
      defaultTitle: 'Confirm Action',
      defaultMsg: 'Are you sure you want to proceed with this action?'
    },
    common: {
      cancel: 'Cancel',
      confirm: 'Confirm & Proceed',
      nextStep: 'Next Step →',
      prevStep: 'Back',
      refreshList: 'Refresh List 🔄',
      send: 'Send',
      closeModal: 'Close dialog'
    }
  }
};

// ==================== HELPERS: i18n, NUMBERS, XSS, UI ====================
function tKey(path, fallback = '') {
  const parts = String(path || '').split('.');
  let cur = i18n[state.lang] || i18n.ar;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
      cur = cur[p];
    } else {
      cur = undefined;
      break;
    }
  }
  if (cur !== undefined) return cur;

  let fb = i18n.ar;
  for (const p of parts) {
    if (fb && Object.prototype.hasOwnProperty.call(fb, p)) {
      fb = fb[p];
    } else {
      return fallback || path;
    }
  }
  return fb !== undefined ? fb : (fallback || path);
}

function isAr() {
  return state.lang !== 'en';
}

function formatNum(num) {
  const locale = isAr() ? 'ar-EG' : 'en-US';
  return Number(num || 0).toLocaleString(locale);
}

function formatEGP(num) {
  return `${formatNum(num)} ${tKey('currency')}`;
}

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showEl(el) {
  if (el) el.classList.remove('is-hidden');
}

function hideEl(el) {
  if (el) el.classList.add('is-hidden');
}

function setButtonLoading(btn, loadingLabel) {
  if (!btn) return () => {};
  const prevDisabled = btn.disabled;
  const prevNodes = Array.from(btn.childNodes).map((n) => n.cloneNode(true));
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.textContent = `⏳ ${loadingLabel}`;
  return () => {
    btn.disabled = prevDisabled;
    btn.removeAttribute('aria-busy');
    btn.replaceChildren(...prevNodes);
  };
}

function formatDefectLabel(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  if (str.includes(' / ')) {
    const [arPart, enPart] = str.split(' / ');
    return isAr() ? arPart.trim() : (enPart || arPart).trim();
  }
  return str;
}

function translateDistrict(raw) {
  const t = i18n[state.lang] || i18n.ar;
  return (t.districts && t.districts[raw]) || raw || (isAr() ? 'الإسكندرية' : 'Alexandria');
}

function translateCategory(raw) {
  const keyMap = {
    Appliances: 'chips.Appliances',
    Electronics: 'chips.Electronics',
    Furniture: 'chips.Furniture',
    All: 'chips.All'
  };
  const label = keyMap[raw] ? tKey(keyMap[raw]) : raw;
  return String(label || raw || '').replace(/[🏷️❄️💻🛋️]/g, '').trim();
}

function resolveItemImages(item) {
  const raw = Array.isArray(item?.image_urls) ? item.image_urls : [];
  const urls = raw
    .map((u) => String(u || '').trim())
    .filter((u) => u && u !== 'default.jpg')
    .map((u) => (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:') || u.startsWith('/') ? u : `/images/${u}`));
  return urls.length > 0 ? urls : [PLACEHOLDER_IMG];
}

function isItemUnavailable(item) {
  const st = String(item?.status || '').toUpperCase();
  return st === 'DISPATCHED' || st === 'SOLD' || st === 'REJECTED';
}

function showToast(title, message = '', type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = '✓';
  if (type === 'warning') icon = '⚠️';
  if (type === 'error') icon = '✕';
  if (type === 'info') icon = 'ℹ️';

  const iconEl = document.createElement('div');
  iconEl.className = 'toast-icon';
  iconEl.textContent = icon;

  const bodyEl = document.createElement('div');
  bodyEl.className = 'toast-body';

  const titleEl = document.createElement('div');
  titleEl.className = 'toast-title';
  titleEl.textContent = String(title || '');
  bodyEl.appendChild(titleEl);

  if (message) {
    const msgEl = document.createElement('div');
    msgEl.className = 'toast-message';
    msgEl.textContent = String(message);
    bodyEl.appendChild(msgEl);
  }

  toast.appendChild(iconEl);
  toast.appendChild(bodyEl);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 300);
  }, 4200);
}

// ==================== API REQUEST CLIENT ====================
function selectAuthTokenForEndpoint(endpoint, explicitToken) {
  if (explicitToken) return explicitToken;
  const userRole = state.currentUser?.role;
  if (endpoint.startsWith('/api/admin')) {
    return state.adminToken || (userRole === 'admin' ? state.authToken : '');
  }
  if (
    endpoint.startsWith('/api/driver/') ||
    /\/api\/dispatches\/[^/]+\/(step|status)/.test(endpoint)
  ) {
    return (
      state.captainToken ||
      (['driver', 'admin', 'merchant'].includes(userRole) ? state.authToken : '') ||
      state.adminToken
    );
  }
  if (
    endpoint.startsWith('/api/review/') ||
    endpoint.startsWith('/api/catalog/run') ||
    endpoint.startsWith('/api/logs/')
  ) {
    return (
      (['merchant', 'admin'].includes(userRole) ? state.authToken : '') ||
      state.adminToken ||
      state.authToken
    );
  }
  if (endpoint === '/api/intake') {
    return state.authToken || state.adminToken;
  }
  return state.authToken;
}

async function apiRequest(endpoint, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = selectAuthTokenForEndpoint(endpoint, options.token);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const fetchOpts = { ...options, headers };
  delete fetchOpts.token;

  const res = await fetch(endpoint, fetchOpts);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const err = new Error(errorData.detail || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ==================== THEME & BILINGUAL i18n ====================
function initTheme() {
  applyTheme(state.theme);
  const btn = document.getElementById('btnThemeToggle');
  if (btn) {
    btn.addEventListener('click', toggleTheme);
  }
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem(STORAGE_KEYS.theme, state.theme);
  applyTheme(state.theme);
  showToast(
    isAr() ? 'تم تبديل المظهر' : 'Theme Switched',
    state.theme === 'dark'
      ? (isAr() ? 'الوضع الليلي مفعّل 🌙' : 'Dark Mode Enabled 🌙')
      : (isAr() ? 'الوضع النهاري مفعّل ☀️' : 'Light Mode Enabled ☀️'),
    'success'
  );
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const iconEl = document.getElementById('txtThemeIcon');
  if (iconEl) {
    iconEl.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  const btn = document.getElementById('btnThemeToggle');
  if (btn) {
    const label = theme === 'dark'
      ? (isAr() ? 'تبديل للوضع النهاري' : 'Switch to Light Mode')
      : (isAr() ? 'تبديل للوضع الليلي' : 'Switch to Dark Mode');
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }
}

function initLanguage() {
  applyLanguage(state.lang);
  const btn = document.getElementById('btnLangToggle');
  if (btn) {
    btn.addEventListener('click', toggleLanguage);
  }
}

function toggleLanguage() {
  state.lang = state.lang === 'ar' ? 'en' : 'ar';
  localStorage.setItem(STORAGE_KEYS.lang, state.lang);
  applyLanguage(state.lang);
  showToast(
    isAr() ? 'تم تغيير اللغة' : 'Language Changed',
    isAr() ? 'اللغة العربية مفعلة بالكامل 🇪🇬' : 'English language enabled completely 🇬🇧',
    'success'
  );
}

function translateSelectOptions() {
  // District selects across forms
  ['sellerDistrict', 'reserveDistrict', 'accSettingDistrict', 'sellerApplyDistrict', 'driverApplyDistrict'].forEach((id) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    Array.from(sel.options).forEach((opt) => {
      opt.textContent = translateDistrict(opt.value);
    });
  });

  const accLang = document.getElementById('accSettingLang');
  if (accLang && accLang.options.length >= 2) {
    accLang.options[0].textContent = isAr() ? 'العربية 🇪🇬' : 'Arabic (العربية) 🇪🇬';
    accLang.options[1].textContent = isAr() ? 'English 🇬🇧' : 'English 🇬🇧';
  }

  const accTheme = document.getElementById('accSettingTheme');
  if (accTheme && accTheme.options.length >= 2) {
    accTheme.options[0].textContent = isAr() ? 'الوضع النهاري (Light)' : 'Light Mode';
    accTheme.options[1].textContent = isAr() ? 'الوضع الليلي (Dark)' : 'Dark Mode';
  }

  const accNotify = document.getElementById('accSettingNotify');
  if (accNotify && accNotify.options.length >= 3) {
    accNotify.options[0].textContent = isAr() ? 'رسائل SMS وتنبيهات WhatsApp فورية' : 'Instant SMS & WhatsApp Alerts';
    accNotify.options[1].textContent = isAr() ? 'رسائل SMS فقط' : 'SMS Alerts Only';
    accNotify.options[2].textContent = isAr() ? 'بدون تنبيهات خارجية' : 'No External Alerts';
  }

  const sellerApplyBType = document.getElementById('sellerApplyBusinessType');
  if (sellerApplyBType && sellerApplyBType.options.length >= 3) {
    sellerApplyBType.options[0].textContent = isAr() ? 'بائع أفراد (Everyday Individual)' : 'Individual Seller';
    sellerApplyBType.options[1].textContent = isAr() ? 'ورشة تصنيع وتجديد (Workshop)' : 'Refurbishment Workshop';
    sellerApplyBType.options[2].textContent = isAr() ? 'معرض تجاري معتمد (Showroom)' : 'Verified Commercial Showroom';
  }

  const sellerApplyTier = document.getElementById('sellerApplyTier');
  if (sellerApplyTier && sellerApplyTier.options.length >= 3) {
    sellerApplyTier.options[0].textContent = isAr() ? 'باقة الأفراد العادية (عمولة 8%)' : 'Everyday Plan (8% fee)';
    sellerApplyTier.options[1].textContent = isAr() ? 'باقة التاجر المحترف (عمولة 5%)' : 'Pro Trader Plan (5% fee)';
    sellerApplyTier.options[2].textContent = isAr() ? 'باقة المعارض الكبرى (عمولة 3%)' : 'Enterprise Plan (3% fee)';
  }

  const driverVehicle = document.getElementById('driverApplyVehicleType');
  if (driverVehicle && driverVehicle.options.length >= 4) {
    driverVehicle.options[0].textContent = isAr() ? 'سيارة ربع نقل / بيك أب (Pickup)' : 'Pickup Truck';
    driverVehicle.options[1].textContent = isAr() ? 'فان بضائع مغلق (Cargo Van)' : 'Closed Cargo Van';
    driverVehicle.options[2].textContent = isAr() ? 'تروسيكل بضائع مجهز' : 'Cargo Tricycle';
    driverVehicle.options[3].textContent = isAr() ? 'موتوسيكل خفيف للأجهزة الصغيرة' : 'Motorcycle (Small Electronics)';
  }
}

function applyLanguage(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  const t = i18n[lang] || i18n.ar;
  const codeSpan = document.getElementById('txtLangCode');
  if (codeSpan) codeSpan.textContent = t.langCodeBadge;

  // Translate all [data-i18n], [data-i18n-placeholder], [data-i18n-aria]
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = tKey(key, null);
    if (typeof val === 'string') {
      if (el.id === 'btnRunCatalogLoop' && el.firstElementChild?.tagName === 'SPAN') {
        el.firstElementChild.textContent = val;
      } else {
        el.textContent = val;
      }
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = tKey(key, null);
    if (typeof val === 'string') el.placeholder = val;
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    const val = tKey(key, null);
    if (typeof val === 'string') el.setAttribute('aria-label', val);
  });

  // Preserve active Auth modal state (Login vs Register)
  const isRegister = document.getElementById('tabBtnRegister')?.classList.contains('active');
  const authHeading = document.getElementById('authModalHeading');
  const authSubmitText = document.getElementById('authSubmitText');
  if (authHeading) authHeading.textContent = isRegister ? t.authHeadingRegister : t.authHeadingLogin;
  if (authSubmitText) authSubmitText.textContent = isRegister ? t.authSubmitRegister : t.authSubmitLogin;

  const btnLang = document.getElementById('btnLangToggle');
  if (btnLang) btnLang.title = t.langBtnTitle;

  translateSelectOptions();
  updateHeaderUserDisplay();
  applyTheme(state.theme);
  updateTierCalculator();
  updateDriverGpsStatusUi(Boolean(driverLocationWatchId));

  // Re-render active dynamic views cleanly
  if (state.allDistrictItems.length > 0 || state.hasLoadedShowroomOnce) {
    applyShowroomFiltersAndRender(false);
  }
  if (state.currentView === 'account' && state.currentUser) {
    loadAccountData();
  }
  if (state.currentView === 'merchant') {
    loadMetrics();
    loadMerchantQueue();
  }
  if (state.currentView === 'trader-studio') {
    populateTraderItemSelect();
  }
  if (state.currentView === 'price-index') {
    loadPriceMatrix();
  }
  if (state.currentView === 'tracking' && state.activeTrackingQuery) {
    trackOrder(state.activeTrackingQuery, { silent: true });
  }
  if (state.currentView === 'delivery-portal' && state.captainUnlocked) {
    loadCaptainDeliveryTasks();
  }
  if (state.currentView === 'admin-portal' && state.adminUnlocked) {
    loadAdminDashboard();
  }
}

// ==================== PWA, CONNECTIVITY & GLOBAL LISTENERS ====================
function initPwaAndConnectivity() {
  const banner = document.getElementById('offlineBanner');
  const syncStatus = () => {
    if (!banner) return;
    if (navigator.onLine) {
      hideEl(banner);
    } else {
      showEl(banner);
    }
  };

  syncStatus();
  window.addEventListener('online', () => {
    syncStatus();
    showToast(
      isAr() ? 'عاد الاتصال بالإنترنت' : 'Back Online',
      isAr() ? 'تمت استعادة الاتصال بخوادم آنتي فصال ✓' : 'Connection to Anti-Fesal servers restored ✓',
      'success'
    );
  });
  window.addEventListener('offline', () => {
    syncStatus();
    showToast(
      isAr() ? 'انقطع الاتصال' : 'Offline Mode',
      tKey('offlineBanner'),
      'warning'
    );
  });

  if ('serviceWorker' in navigator) {
    const registerSw = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration skipped:', err);
      });
    };
    if (document.readyState === 'complete') {
      registerSw();
    } else {
      window.addEventListener('load', registerSw);
    }
  }
}

function initImageFallbackHandler() {
  // Capture-phase error listener avoids inline error attributes in generated HTML
  document.addEventListener(
    'error',
    (e) => {
      const target = e.target;
      if (!target || target.tagName !== 'IMG') return;
      if (target.dataset.fallbackStage === '2') return;
      if (target.dataset.fallbackStage === '1') {
        target.dataset.fallbackStage = '2';
        target.src = FALLBACK_SVG_URI;
        return;
      }
      target.dataset.fallbackStage = '1';
      target.src = PLACEHOLDER_IMG;
    },
    true
  );
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  initPwaAndConnectivity();
  initImageFallbackHandler();
  initTheme();
  initLanguage();
  initAnimatedSearchBar();
  initDelegatedActions();
  initModalAccessibility();
  initFormBindings();
  initSearchAndFilters();
  initLazyLoadObserver();
  initSellerIntake();
  initTierCalculator();
  initPriceIndex();
  initTracking();
  initAccountPortal();

  // Restore saved district selection if any
  const headerDist = document.getElementById('headerDistrictFilter');
  if (headerDist && state.selectedDistrict) {
    headerDist.value = state.selectedDistrict;
  }
  document.querySelectorAll('.district-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.district === state.selectedDistrict);
  });

  // Apply persisted grid/list view mode
  setShowroomViewMode(state.viewMode, false);

  // Sync account visibility/nav and KYC status banner
  updateHeaderUserDisplay();
  if (state.currentUser || localStorage.getItem(STORAGE_KEYS.pendingAppUserId)) {
    checkUserApplicationStatus();
  }

  // Load metrics once
  loadMetrics();

  // Single initial route fetch (no redundant double loadShowroomItems)
  const rawHash = window.location.hash.replace('#', '').trim();
  if (!rawHash || rawHash === 'showroom') {
    switchPortalView('showroom', false);
  } else {
    handleHashRouting();
  }

  window.addEventListener('hashchange', handleHashRouting);
});

// ==================== MODALS, FOCUS TRAP & CONFIRM DIALOG ====================
function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => el.offsetParent !== null && !el.closest('.is-hidden'));
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  if (!document.querySelector('.modal-overlay.active')) {
    state.lastFocusedElement = document.activeElement;
  }
  modal.classList.add('active');
  const content = modal.querySelector('.modal-content') || modal;
  const focusables = getFocusableElements(content);
  if (focusables.length > 0) {
    setTimeout(() => focusables[0].focus(), 20);
  }
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (!el) return;
  el.classList.remove('active');

  if (modalId === 'modalConfirm') {
    state.pendingConfirmAction = null;
  }

  // Clear #item- or #reserve? hash without triggering hashchange re-fetch loops
  if (modalId === 'modalProductDetail' && window.location.hash.startsWith('#item-')) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#showroom`);
  }
  if (modalId === 'modalReserve' && window.location.hash.startsWith('#reserve')) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#showroom`);
  }

  if (!document.querySelector('.modal-overlay.active') && state.lastFocusedElement && document.contains(state.lastFocusedElement)) {
    state.lastFocusedElement.focus();
    state.lastFocusedElement = null;
  }
}

function openConfirmModal({ title, message, confirmLabel, onConfirm }) {
  const titleEl = document.getElementById('confirmTitle');
  const msgEl = document.getElementById('confirmMessage');
  const btnProceed = document.getElementById('btnConfirmProceed');
  if (titleEl) titleEl.textContent = title || tKey('confirm.defaultTitle');
  if (msgEl) msgEl.textContent = message || tKey('confirm.defaultMsg');
  if (btnProceed) btnProceed.textContent = confirmLabel || tKey('common.confirm');
  state.pendingConfirmAction = onConfirm;
  openModal('modalConfirm');
}

function initModalAccessibility() {
  // Escape closes active modal or chatbot panel; Tab traps focus in active modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModals = Array.from(document.querySelectorAll('.modal-overlay.active'));
      if (activeModals.length > 0) {
        closeModal(activeModals[activeModals.length - 1].id);
        return;
      }
      const chatPanel = document.getElementById('floatingChatbotPanel');
      if (chatPanel && chatPanel.classList.contains('active')) {
        toggleCompareChatbot(false);
      }
      return;
    }

    if (e.key === 'Tab') {
      const activeModals = Array.from(document.querySelectorAll('.modal-overlay.active'));
      if (activeModals.length === 0) return;
      const topModal = activeModals[activeModals.length - 1];
      const focusables = getFocusableElements(topModal.querySelector('.modal-content') || topModal);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Backdrop click closes modal; outside click closes floating chatbot panel
  document.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
      closeModal(e.target.id);
      return;
    }
    const chatContainer = document.getElementById('floatingChatbotContainer');
    const chatPanel = document.getElementById('floatingChatbotPanel');
    if (
      chatPanel &&
      chatPanel.classList.contains('active') &&
      chatContainer &&
      !chatContainer.contains(e.target)
    ) {
      toggleCompareChatbot(false);
    }
  });
}

// ==================== DELEGATED EVENT DISPATCHER (ZERO INLINE ONCLICK) ====================
function initDelegatedActions() {
  document.addEventListener('click', (e) => {
    // 1. Handle [data-action] hooks first
    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      const action = actionEl.dataset.action;

      // Stop card click propagation for nested card buttons
      if (['toggle-favorite', 'open-reserve', 'open-ask-bot'].includes(action)) {
        e.stopPropagation();
      }

      switch (action) {
        case 'navigate':
          if (actionEl.tagName === 'A') e.preventDefault();
          if (actionEl.dataset.view) switchPortalView(actionEl.dataset.view);
          return;
        case 'header-sell':
          handleHeaderSellClick();
          return;
        case 'open-account':
          if (state.currentUser && state.authToken) {
            switchPortalView('account');
          } else {
            openAuthModal('login');
          }
          return;
        case 'open-partner-hub':
          openModal('modalPartnerHub');
          return;
        case 'open-seller-apply':
          closeModal('modalPartnerHub');
          openSellerApplyModal();
          return;
        case 'open-driver-apply':
          closeModal('modalPartnerHub');
          openDriverApplyModal();
          return;
        case 'filter-category':
          if (actionEl.tagName === 'A') e.preventDefault();
          selectCategory(actionEl.dataset.cat || 'All', true);
          return;
        case 'filter-district':
          if (actionEl.tagName === 'A') e.preventDefault();
          filterByDistrict(actionEl.dataset.district || 'All');
          return;
        case 'set-view-mode':
          setShowroomViewMode(actionEl.dataset.mode || 'list', true);
          return;
        case 'toggle-favorites-filter':
          toggleFavoritesFilter();
          return;
        case 'close-modal':
          if (actionEl.dataset.modal) closeModal(actionEl.dataset.modal);
          return;
        case 'auth-tab':
          switchAuthTab(actionEl.dataset.tab || 'login');
          return;
        case 'google-login':
          handleGoogleLogin(actionEl);
          return;
        case 'toggle-password':
          togglePasswordVisibility(actionEl);
          return;
        case 'kyc-next':
          handleKycStep(actionEl.dataset.modal, 2);
          return;
        case 'kyc-prev':
          handleKycStep(actionEl.dataset.modal, 1);
          return;
        case 'confirm-cancel':
          closeModal('modalConfirm');
          return;
        case 'confirm-proceed':
          executeConfirmedAction();
          return;
        case 'gallery-prev':
          stepPdpGallery(-1);
          return;
        case 'gallery-next':
          stepPdpGallery(1);
          return;
        case 'select-gallery-photo':
          setPdpGalleryIndex(Number(actionEl.dataset.index || 0));
          return;
        case 'compare-item':
          handleCompareActiveDetailItem();
          return;
        case 'accept-quote':
          handleAcceptQuote(actionEl);
          return;
        case 'reset-appraisal':
          resetSellerAppraisal();
          return;
        case 'remove-upload':
          removeUploadedImage(Number(actionEl.dataset.index || 0));
          return;
        case 'select-tier':
          handleSelectTraderTier(actionEl.dataset.tier || 'everyday');
          return;
        case 'copy-ad':
          copyAdText(actionEl.dataset.target);
          return;
        case 'sim-prompt':
          if (actionEl.dataset.prompt) sendSimPrompt(actionEl.dataset.prompt);
          return;
        case 'quick-track':
          if (actionEl.dataset.track) {
            if (state.currentView !== 'tracking') {
              switchPortalView('tracking');
            }
            quickTrack(actionEl.dataset.track);
          }
          return;
        case 'refresh-tracking-map':
          refreshLiveTrackingMap();
          return;
        case 'toggle-faq':
          toggleFaq(actionEl);
          return;
        case 'account-tab':
          switchAccountTab(actionEl.dataset.tab || 'info');
          return;
        case 'acc-app-action':
          handleAccAppAction();
          return;
        case 'logout':
          logoutUser();
          return;
        case 'refresh-captain-tasks':
          loadCaptainDeliveryTasks();
          return;
        case 'lock-captain-gate':
          confirmLockCaptainGate();
          return;
        case 'toggle-driver-gps':
          toggleDriverGpsSharing();
          return;
        case 'lock-admin-gate':
          confirmLockAdminGate();
          return;
        case 'refresh-admin-apps':
          loadAdminApplications();
          return;
        case 'refresh-admin-users':
          loadAdminUsers();
          return;
        case 'refresh-admin-drivers':
          loadAdminDrivers();
          return;
        case 'toggle-chatbot':
          toggleCompareChatbot();
          return;
        case 'clear-chatbot':
          clearChatbotMessages();
          return;
        case 'open-item':
          if (actionEl.dataset.id) openProductDetailModal(actionEl.dataset.id);
          return;
        case 'toggle-favorite':
          if (actionEl.dataset.id) toggleFavorite(e, actionEl.dataset.id, actionEl);
          return;
        case 'open-reserve':
          if (actionEl.dataset.id) openReserveModalById(actionEl.dataset.id);
          return;
        case 'open-ask-bot':
          if (actionEl.dataset.id) openAskBotModalById(actionEl.dataset.id);
          return;
        case 'review-item':
          handleMerchantQueueAction(actionEl.dataset.id, actionEl.dataset.decision);
          return;
        case 'update-dispatch':
          if (actionEl.dataset.id) updateDispatch(actionEl.dataset.id, actionEl.dataset.status || 'COMPLETED', actionEl);
          return;
        case 'prefill-matrix':
          prefillSellerFromMatrix(actionEl.dataset.category, actionEl.dataset.model);
          return;
        case 'advance-step':
          if (actionEl.dataset.id && actionEl.dataset.step) {
            advanceDispatchStep(actionEl.dataset.id, actionEl.dataset.step, actionEl);
          }
          return;
        case 'review-app':
          handleAdminAppReview(actionEl.dataset.id, actionEl.dataset.decision);
          return;
        case 'toggle-user-status':
          handleToggleUserStatus(actionEl.dataset.id, actionEl.dataset.status);
          return;
        case 'toggle-driver-status':
          if (actionEl.dataset.id) toggleDriverStatus(actionEl.dataset.id, actionEl.dataset.status, actionEl);
          return;
        case 'show-delivery-details':
          showToast(
            isAr() ? 'تفاصيل المهمة' : 'Task Details',
            `${isAr() ? 'مهمة توصيل رقم #' : 'Delivery Task #'}${actionEl.dataset.id || ''}`,
            'info'
          );
          return;
        default:
          break;
      }
    }

    // 2. Tabs without data-action attribute
    const navTab = e.target.closest('.nav-tab[data-view]');
    if (navTab) {
      switchPortalView(navTab.dataset.view);
      return;
    }

    const catChip = e.target.closest('.category-chip[data-cat]');
    if (catChip) {
      selectCategory(catChip.dataset.cat || 'All', false);
      return;
    }

    const accNav = e.target.closest('.account-nav-item[data-tab]');
    if (accNav) {
      switchAccountTab(accNav.dataset.tab || 'info');
      return;
    }

    const logTab = e.target.closest('.btn-log-tab[data-log]');
    if (logTab) {
      document.querySelectorAll('.btn-log-tab').forEach((t) => t.classList.remove('active'));
      logTab.classList.add('active');
      state.currentLogTab = logTab.dataset.log;
      loadAuditLogs();
    }
  });

  // Keyboard support for clickable non-button cards (role="button")
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const active = document.activeElement;
    if (!active || active.tagName === 'BUTTON' || active.tagName === 'A' || active.tagName === 'INPUT') return;
    if (active.id === 'dropZone') {
      e.preventDefault();
      document.getElementById('photoFileInput')?.click();
      return;
    }
    if (active.dataset.action === 'open-item' && active.dataset.id) {
      e.preventDefault();
      openProductDetailModal(active.dataset.id);
    }
  });
}

async function executeConfirmedAction() {
  const fn = state.pendingConfirmAction;
  const btn = document.getElementById('btnConfirmProceed');
  if (!fn) {
    closeModal('modalConfirm');
    return;
  }
  const restore = setButtonLoading(btn, isAr() ? 'جاري التنفيذ...' : 'Processing...');
  try {
    await fn();
    closeModal('modalConfirm');
  } catch (err) {
    showToast(isAr() ? 'تعذر إتمام الإجراء' : 'Action Failed', err.message, 'error');
  } finally {
    restore();
  }
}

// ==================== PORTAL NAVIGATION & STRICT ROLE GUARDING ====================
function canAccessView(viewName) {
  const role = state.currentUser?.role || 'buyer';
  const isLoggedIn = Boolean(state.currentUser && state.authToken);

  if (viewName === 'account') {
    if (!isLoggedIn) {
      state.pendingViewAfterAuth = 'account';
      clearAccountDomToGuest();
      showToast(
        isAr() ? 'تسجيل الدخول مطلوب' : 'Sign In Required',
        isAr() ? 'يرجى تسجيل الدخول لعرض لوحة حسابك' : 'Please sign in to view your account hub',
        'info'
      );
      openAuthModal('login');
      return false;
    }
    return true;
  }

  if (viewName === 'seller') {
    if (!isLoggedIn) {
      state.pendingViewAfterAuth = 'seller';
      showToast(
        isAr() ? 'تسجيل الدخول مطلوب' : 'Sign In Required',
        isAr() ? 'يرجى تسجيل الدخول بحساب بائع معتمد أو التقديم أولاً' : 'Please sign in as an approved seller or apply first',
        'info'
      );
      openAuthModal('login');
      return false;
    }
    if (!['seller', 'merchant', 'admin'].includes(role)) {
      showToast(
        isAr() ? 'تفعيل حساب البائع' : 'Seller Verification Required',
        isAr() ? 'يتطلب استوديو التسعير اعتمادك كبائع أو تاجر أولاً' : 'AI Seller Studio requires an approved seller or merchant role',
        'warning'
      );
      openSellerApplyModal();
      return false;
    }
    return true;
  }

  if (['merchant', 'trader-studio', 'driver-logs'].includes(viewName)) {
    const allowedByAuth = isLoggedIn && ['merchant', 'admin'].includes(role);
    const allowedByGate = state.adminUnlocked && Boolean(state.adminToken);
    if (!allowedByAuth && !allowedByGate) {
      showToast(
        isAr() ? 'صلاحيات تاجر مطلوبة' : 'Merchant Access Required',
        isAr() ? 'هذه البوابة مخصصة للتجار المعتمدين وإدارة المنصة فقط' : 'This portal is restricted to verified merchants and admins',
        'warning'
      );
      if (!isLoggedIn) {
        state.pendingViewAfterAuth = viewName;
        openAuthModal('login');
      }
      return false;
    }
    return true;
  }

  return true;
}

function handleHeaderSellClick() {
  if (!state.currentUser || !state.authToken) {
    state.pendingViewAfterAuth = 'seller';
    showToast(
      isAr() ? 'تسجيل الدخول أو الانضمام' : 'Sign In or Apply',
      isAr() ? 'سجّل الدخول أو قدّم طلب انضمام كبائع معتمد لفتح استوديو التسعير' : 'Sign in or apply as a verified seller to access the AI Pricing Studio',
      'info'
    );
    openSellerApplyModal();
    return;
  }
  if (['seller', 'merchant', 'admin'].includes(state.currentUser.role)) {
    switchPortalView('seller');
  } else {
    showToast(
      isAr() ? 'طلب اعتماد بائع' : 'Seller Verification Needed',
      isAr() ? 'قدّم طلب انضمام كبائع معتمد لفتح استوديو التسعير بالذكاء الاصطناعي' : 'Apply as a verified seller to unlock the AI Pricing Studio',
      'info'
    );
    openSellerApplyModal();
  }
}

function switchPortalView(viewName, updateHash = true) {
  const viewsMap = {
    showroom: 'viewShowroom',
    seller: 'viewSeller',
    merchant: 'viewMerchant',
    'trader-studio': 'viewTraderStudio',
    'driver-logs': 'viewDriverLogs',
    'price-index': 'viewPriceIndex',
    tracking: 'viewTracking',
    about: 'viewAbout',
    account: 'viewAccount',
    'delivery-portal': 'viewDeliveryPortal',
    'admin-portal': 'viewAdminPortal'
  };

  if (!viewsMap[viewName]) {
    viewName = 'showroom';
  }

  if (!canAccessView(viewName)) {
    // Ensure a valid public view remains visible (never leave stale protected HTML visible)
    const currentEl = document.querySelector('.portal-view.active');
    if (!currentEl || currentEl.id === 'viewAccount' || currentEl.id === 'viewSeller' || currentEl.id === 'viewMerchant' || currentEl.id === 'viewTraderStudio' || currentEl.id === 'viewDriverLogs') {
      activatePortalDom('showroom', false);
      if (!state.hasLoadedShowroomOnce) loadShowroomItems();
    }
    return;
  }

  activatePortalDom(viewName, updateHash);

  // Manage live tracking polling lifecycle
  if (viewName !== 'tracking') {
    stopTrackingPolling();
  } else if (state.activeTrackingQuery) {
    startTrackingPolling();
  }

  // Trigger single view-appropriate fetch
  if (viewName === 'showroom') {
    loadShowroomItems();
  } else if (viewName === 'merchant') {
    loadMetrics();
    loadMerchantQueue();
  } else if (viewName === 'trader-studio') {
    populateTraderItemSelect();
  } else if (viewName === 'driver-logs') {
    loadDispatches();
    loadAuditLogs();
  } else if (viewName === 'price-index') {
    loadPriceMatrix();
  } else if (viewName === 'account') {
    loadAccountData();
  } else if (viewName === 'seller') {
    prefillSellerStudio();
  } else if (viewName === 'delivery-portal' && state.captainUnlocked) {
    loadCaptainDeliveryTasks();
  } else if (viewName === 'admin-portal' && state.adminUnlocked) {
    loadAdminDashboard();
  }
}

function activatePortalDom(viewName, updateHash) {
  state.currentView = viewName;
  const viewsMap = {
    showroom: 'viewShowroom',
    seller: 'viewSeller',
    merchant: 'viewMerchant',
    'trader-studio': 'viewTraderStudio',
    'driver-logs': 'viewDriverLogs',
    'price-index': 'viewPriceIndex',
    tracking: 'viewTracking',
    about: 'viewAbout',
    account: 'viewAccount',
    'delivery-portal': 'viewDeliveryPortal',
    'admin-portal': 'viewAdminPortal'
  };

  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === viewName);
  });

  document.querySelectorAll('.mob-nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  document.querySelectorAll('.portal-view').forEach((v) => v.classList.remove('active'));
  const target = document.getElementById(viewsMap[viewName]);
  if (target) target.classList.add('active');

  if (updateHash && window.location.hash !== `#${viewName}`) {
    window.location.hash = `#${viewName}`;
  }
}

function handleHashRouting() {
  const rawHash = window.location.hash.replace(/^#/, '').trim();
  if (!rawHash) return;

  // #reserve?id=<item_id> (from marketing_autoreply links)
  if (rawHash.startsWith('reserve')) {
    const queryPart = rawHash.includes('?') ? rawHash.split('?')[1] : '';
    const params = new URLSearchParams(queryPart);
    const itemId = params.get('id');
    activatePortalDom('showroom', false);
    if (!state.hasLoadedShowroomOnce) loadShowroomItems();
    if (itemId) openReserveModalById(itemId);
    return;
  }

  // #item-<id>
  if (rawHash.startsWith('item-')) {
    const itemId = decodeURIComponent(rawHash.slice(5));
    activatePortalDom('showroom', false);
    if (!state.hasLoadedShowroomOnce) loadShowroomItems();
    const detailModal = document.getElementById('modalProductDetail');
    if (detailModal && detailModal.classList.contains('active') && state.activeDetailItem?.id === itemId) {
      return;
    }
    openProductDetailModal(itemId, { skipHashUpdate: true });
    return;
  }

  // #track-<code>
  if (rawHash.startsWith('track-')) {
    const code = decodeURIComponent(rawHash.slice(6));
    switchPortalView('tracking', false);
    if (code) quickTrack(code);
    return;
  }

  if (rawHash === 'delivery' || rawHash === 'delivery-portal') {
    switchPortalView('delivery-portal', false);
    return;
  }

  if (rawHash === 'admin' || rawHash === 'admin-master' || rawHash === 'admin-portal') {
    switchPortalView('admin-portal', false);
    return;
  }

  if (rawHash === 'account') {
    switchPortalView('account', false);
    return;
  }

  const validViews = [
    'showroom',
    'seller',
    'merchant',
    'trader-studio',
    'driver-logs',
    'price-index',
    'tracking',
    'about',
    'account',
    'delivery-portal',
    'admin-portal'
  ];
  if (validViews.includes(rawHash)) {
    switchPortalView(rawHash, false);
  }
}

// ==================== HEADER SEARCH & SHOWROOM FILTERS ====================
function initAnimatedSearchBar() {
  const triggerBtn = document.getElementById('btnSearchTrigger');
  const searchBar = document.getElementById('headerSearchBar');
  const closeBtn = document.getElementById('btnSearchClose');
  const input = document.getElementById('headerSearchInput');

  if (!triggerBtn || !searchBar) return;

  const setExpanded = (expanded) => {
    searchBar.classList.toggle('expanded', expanded);
    searchBar.classList.toggle('collapsed', !expanded);
    triggerBtn.classList.toggle('active', expanded);
    triggerBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (expanded && input) {
      input.focus();
      input.select();
    }
  };

  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setExpanded(searchBar.classList.contains('collapsed'));
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setExpanded(false);
    });
  }

  document.addEventListener('click', (e) => {
    if (!searchBar.contains(e.target) && !triggerBtn.contains(e.target) && searchBar.classList.contains('expanded')) {
      setExpanded(false);
    }
  });
}

function initSearchAndFilters() {
  const districtSelect = document.getElementById('headerDistrictFilter');
  const searchInput = document.getElementById('headerSearchInput');
  const searchBtn = document.getElementById('headerSearchBtn');
  const sortSelect = document.getElementById('showroomSortSelect');

  if (districtSelect) {
    districtSelect.addEventListener('change', (e) => {
      filterByDistrict(e.target.value);
    });
  }

  if (searchBtn && searchInput) {
    const handleSearch = () => {
      state.searchQuery = searchInput.value.trim();
      if (state.currentView !== 'showroom') {
        switchPortalView('showroom');
      } else {
        loadShowroomItems();
      }
    };
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      applyShowroomFiltersAndRender(true);
    });
  }
}

function selectCategory(cat, navigateToShowroom = false) {
  state.selectedCategory = cat || 'All';
  document.querySelectorAll('.category-chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.cat === state.selectedCategory);
  });
  if (navigateToShowroom && state.currentView !== 'showroom') {
    switchPortalView('showroom');
  } else if (state.hasLoadedShowroomOnce) {
    applyShowroomFiltersAndRender(true);
  } else {
    loadShowroomItems();
  }
}

function filterByDistrict(district) {
  state.selectedDistrict = district || 'All';
  localStorage.setItem(STORAGE_KEYS.district, state.selectedDistrict);

  const sel = document.getElementById('headerDistrictFilter');
  if (sel) sel.value = state.selectedDistrict;

  document.querySelectorAll('.district-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.district === state.selectedDistrict);
  });

  if (state.currentView !== 'showroom') {
    switchPortalView('showroom');
  } else {
    loadShowroomItems();
  }
}

function toggleFavoritesFilter() {
  state.favoritesOnly = !state.favoritesOnly;
  const btn = document.getElementById('btnFilterFavorites');
  if (btn) {
    btn.classList.toggle('active', state.favoritesOnly);
    btn.setAttribute('aria-pressed', state.favoritesOnly ? 'true' : 'false');
  }
  applyShowroomFiltersAndRender(true);
}

function setShowroomViewMode(mode, persist = true) {
  state.viewMode = mode === 'grid' ? 'grid' : 'list';
  if (persist) {
    localStorage.setItem(STORAGE_KEYS.viewMode, state.viewMode);
  }
  const grid = document.getElementById('productGrid');
  if (grid) {
    grid.classList.toggle('product-grid-view', state.viewMode === 'grid');
    grid.classList.toggle('product-list-view', state.viewMode !== 'grid');
  }
  const btnGrid = document.getElementById('btnViewGrid');
  const btnList = document.getElementById('btnViewList');
  if (btnGrid) {
    btnGrid.classList.toggle('active', state.viewMode === 'grid');
    btnGrid.setAttribute('aria-pressed', state.viewMode === 'grid' ? 'true' : 'false');
  }
  if (btnList) {
    btnList.classList.toggle('active', state.viewMode !== 'grid');
    btnList.setAttribute('aria-pressed', state.viewMode !== 'grid' ? 'true' : 'false');
  }
}

// ==================== VIEW 1: SHOWROOM FEED & SKELETONS ====================
function renderShowroomSkeletons(grid) {
  if (!grid) return;
  grid.innerHTML = Array(4)
    .fill(0)
    .map(
      () => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        </div>
      </div>`
    )
    .join('');
}

async function loadShowroomItems() {
  const grid = document.getElementById('productGrid');
  renderShowroomSkeletons(grid);

  try {
    let url = '/api/items?limit=200';
    if (state.selectedDistrict && state.selectedDistrict !== 'All') {
      url += `&district=${encodeURIComponent(state.selectedDistrict)}`;
    }
    if (state.searchQuery) {
      url += `&search=${encodeURIComponent(state.searchQuery)}`;
    }

    const items = await apiRequest(url);
    state.hasLoadedShowroomOnce = true;
    state.items = Array.isArray(items) ? items : [];

    // Public showroom displays AUTO_APPROVED, DISPATCHED, and SOLD (never PENDING_REVIEW or REJECTED)
    state.allDistrictItems = state.items.filter((it) =>
      ['AUTO_APPROVED', 'DISPATCHED', 'SOLD'].includes(String(it.status || '').toUpperCase())
    );

    updateShowroomCategoryCounts();
    applyShowroomFiltersAndRender(true);
  } catch (err) {
    console.error('Failed to load showroom items:', err);
    showToast(isAr() ? 'خطأ في تحميل المعرض' : 'Showroom Load Failed', err.message, 'error');
    if (grid) {
      grid.innerHTML = `<div class="empty-state-card">${escapeHTML(
        isAr() ? `فشل تحميل المعروضات: ${err.message}` : `Failed to load listings: ${err.message}`
      )}</div>`;
    }
  }
}

function updateShowroomCategoryCounts() {
  const pool = state.allDistrictItems || [];
  const counts = { All: pool.length, Appliances: 0, Electronics: 0, Furniture: 0 };
  pool.forEach((it) => {
    if (Object.prototype.hasOwnProperty.call(counts, it.category)) {
      counts[it.category] += 1;
    }
  });

  const setCount = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatNum(val);
  };
  setCount('catCountAll', counts.All);
  setCount('catCountAppliances', counts.Appliances);
  setCount('catCountElectronics', counts.Electronics);
  setCount('catCountFurniture', counts.Furniture);

  const showroomBadge = document.getElementById('countShowroom');
  if (showroomBadge) showroomBadge.textContent = formatNum(counts.All);
}

function applyShowroomFiltersAndRender(reset = false) {
  let list = [...(state.allDistrictItems || [])];

  if (state.selectedCategory && state.selectedCategory !== 'All') {
    list = list.filter((it) => it.category === state.selectedCategory);
  }
  if (state.favoritesOnly) {
    const favSet = new Set(state.favorites || []);
    list = list.filter((it) => favSet.has(it.id));
  }

  const gradeRank = { A: 1, B: 2, C: 3, D: 4 };
  list.sort((a, b) => {
    // Always keep available items before unavailable unless price/grade sorting overrides
    const sortKey = state.sortBy;
    if (sortKey === 'price_asc' || sortKey === 'price-asc') {
      return Number(a.expected_resale_price || 0) - Number(b.expected_resale_price || 0);
    }
    if (sortKey === 'price_desc' || sortKey === 'price-desc') {
      return Number(b.expected_resale_price || 0) - Number(a.expected_resale_price || 0);
    }
    if (sortKey === 'grade_best' || sortKey === 'grade') {
      const ra = gradeRank[String(a.condition_grade || 'D').toUpperCase()] || 9;
      const rb = gradeRank[String(b.condition_grade || 'D').toUpperCase()] || 9;
      return ra - rb;
    }
    // newest: available first, then created_at desc
    const ua = isItemUnavailable(a) ? 1 : 0;
    const ub = isItemUnavailable(b) ? 1 : 0;
    if (ua !== ub) return ua - ub;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });

  state.filteredItems = list;
  renderShowroomList(reset);
}

function renderShowroomList(reset = false) {
  const container = document.getElementById('productGrid');
  const counter = document.getElementById('feedItemsCounter');
  const sentinel = document.getElementById('showroomScrollSentinel');
  const lazyInd = document.getElementById('lazyIndicator');

  if (reset) {
    state.visibleLimit = 8;
  }

  const items = state.filteredItems || [];
  if (counter) {
    counter.textContent = tKey('showroom.feedStats')(items.length);
  }

  if (items.length === 0) {
    if (container) {
      container.innerHTML = `
        <div class="empty-state-card">
          <div class="modal-emoji-lg" aria-hidden="true">🌊</div>
          <h3 class="section-title">${escapeHTML(tKey('showroom.emptyTitle'))}</h3>
          <p class="section-subtitle">${escapeHTML(tKey('showroom.emptySub'))}</p>
          <button type="button" class="btn-crimson-cta" data-action="header-sell">${escapeHTML(tKey('showroom.emptyBtn'))}</button>
        </div>
      `;
    }
    hideEl(sentinel);
    return;
  }

  const slice = items.slice(0, state.visibleLimit);
  if (container) {
    container.innerHTML = slice
      .map((item) => {
        const gradeRaw = String(item.condition_grade || 'A').toUpperCase();
        const gradeLower = ['a', 'b', 'c', 'd'].includes(gradeRaw.toLowerCase()) ? gradeRaw.toLowerCase() : 'b';
        const gradeText = tKey(`showroom.grade${gradeRaw}`, isAr() ? `الفئة ${gradeRaw}` : `Grade ${gradeRaw}`);

        const defects = Array.isArray(item.detected_defects) ? item.detected_defects : [];
        const defectLabel = defects.length > 0 ? formatDefectLabel(defects[0]) : tKey('showroom.cleanDefect');

        const safeId = escapeHTML(item.id);
        const safeTitle = escapeHTML(item.title);
        const safeDistrict = escapeHTML(translateDistrict(item.district));
        const catLabel = escapeHTML(translateCategory(item.category));
        const confidencePct = Math.round((Number(item.confidence_score) || 0.88) * 100);
        const isFav = (state.favorites || []).includes(item.id);
        const unavailable = isItemUnavailable(item);
        const statusUpper = String(item.status || '').toUpperCase();
        const overlayLabel =
          statusUpper === 'SOLD' ? tKey('showroom.soldBadge') : tKey('showroom.dispatchedBadge');
        const imgSrc = escapeHTML(resolveItemImages(item)[0]);

        return `
          <article class="product-list-item ${unavailable ? 'is-unavailable' : ''}" data-action="open-item" data-id="${safeId}" tabindex="0" role="button" aria-label="${safeTitle}">
            <div class="product-list-thumb">
              <button type="button" class="btn-react-heart ${isFav ? 'active' : ''}" data-action="toggle-favorite" data-id="${safeId}" aria-label="${escapeHTML(
                isFav ? (isAr() ? 'إزالة من المفضلة' : 'Remove from Favorites') : (isAr() ? 'حفظ في المفضلة' : 'Save to Favorites')
              )}">
                <span class="heart-icon" aria-hidden="true">${isFav ? '❤️' : '🤍'}</span>
              </button>
              <img src="${imgSrc}" loading="lazy" class="product-list-img" alt="${safeTitle}">
              ${unavailable ? `<div class="dispatched-overlay">${escapeHTML(overlayLabel)}</div>` : ''}
              <div class="card-badges">
                <span class="grade-badge grade-${gradeLower}">${escapeHTML(gradeText)}</span>
                <span class="fixed-price-tag">${escapeHTML(tKey('fixedPriceTag'))}</span>
              </div>
            </div>
            <div class="product-list-content">
              <div>
                <div class="product-list-header">
                  <span class="role-badge">${catLabel}</span>
                  <span class="text-emerald tabular-num">🤖 ${formatNum(confidencePct)}% ${escapeHTML(tKey('showroom.aiConfidence'))}</span>
                </div>
                <h3 class="product-list-title">${safeTitle}</h3>
                <div class="product-list-meta">
                  <span>📍 ${safeDistrict}</span>
                  <span>•</span>
                  <span class="defect-pill">${escapeHTML(defectLabel)}</span>
                </div>
              </div>
              <div class="product-list-footer">
                <div class="product-list-price-block">
                  <span class="product-list-price tabular-num">${escapeHTML(formatNum(item.expected_resale_price))}</span>
                  <span class="product-list-currency">${escapeHTML(tKey('currency'))}</span>
                </div>
                <div class="product-list-actions">
                  <button type="button" class="btn-buy-reserve" data-action="open-reserve" data-id="${safeId}" ${unavailable ? 'disabled' : ''}>
                    <span>${escapeHTML(unavailable ? overlayLabel : tKey('reserveBtn'))}</span>
                  </button>
                  <button type="button" class="btn-ask-bot" data-action="open-ask-bot" data-id="${safeId}">
                    <span>${escapeHTML(tKey('askBotBtn'))}</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  if (sentinel) {
    showEl(sentinel);
    if (lazyInd) {
      if (state.visibleLimit >= items.length) {
        lazyInd.textContent = tKey('allLoaded');
        showEl(lazyInd);
      } else {
        lazyInd.textContent = tKey('loadingMore');
        hideEl(lazyInd);
      }
    }
  }
}

function toggleFavorite(event, itemId, btnEl) {
  if (event) event.stopPropagation();
  if (!Array.isArray(state.favorites)) state.favorites = [];

  const idx = state.favorites.indexOf(itemId);
  const isNowFav = idx === -1;
  if (isNowFav) {
    state.favorites.push(itemId);
  } else {
    state.favorites.splice(idx, 1);
  }
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(state.favorites));

  if (btnEl) {
    btnEl.classList.add('popping');
    btnEl.classList.toggle('active', isNowFav);
    const icon = btnEl.querySelector('.heart-icon');
    if (icon) icon.textContent = isNowFav ? '❤️' : '🤍';
    setTimeout(() => btnEl.classList.remove('popping'), 460);
  }

  showToast(
    isAr() ? 'المفضلة' : 'Favorites',
    isNowFav
      ? (isAr() ? 'تمت إضافة السلعة إلى المفضلة ❤️' : 'Item saved to Favorites ❤️')
      : (isAr() ? 'تمت إزالة السلعة من المفضلة 🤍' : 'Item removed from Favorites 🤍'),
    'success'
  );

  if (state.favoritesOnly) {
    applyShowroomFiltersAndRender(false);
  }
  if (state.currentView === 'account' && state.currentAccountTab === 'favorites') {
    renderAccountFavorites();
  }
}

function initLazyLoadObserver() {
  const sentinel = document.getElementById('showroomScrollSentinel');
  const lazyInd = document.getElementById('lazyIndicator');
  if (!sentinel) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !state.isLoadingMore && state.currentView === 'showroom') {
        if (state.filteredItems && state.visibleLimit < state.filteredItems.length) {
          state.isLoadingMore = true;
          showEl(lazyInd);
          setTimeout(() => {
            state.visibleLimit += 6;
            renderShowroomList(false);
            state.isLoadingMore = false;
          }, 260);
        }
      }
    },
    { rootMargin: '180px' }
  );
  observer.observe(sentinel);
}

// ==================== PRODUCT DETAIL MODAL (2-COL PDP + GALLERY + BENCHMARK) ====================
async function findOrFetchItem(itemId) {
  let item = state.items.find((it) => it.id === itemId);
  if (!item) {
    item = await apiRequest(`/api/items/${encodeURIComponent(itemId)}`);
  }
  return item;
}

async function openProductDetailModal(itemId, options = {}) {
  let item;
  try {
    item = await findOrFetchItem(itemId);
  } catch (err) {
    showToast(isAr() ? 'خطأ' : 'Item Not Found', err.message || (isAr() ? 'لم يتم العثور على السلعة' : 'Could not load item details'), 'error');
    return;
  }

  state.activeDetailItem = item;
  state.pdpImages = resolveItemImages(item);
  state.pdpImageIndex = 0;
  updatePdpGallery();

  const gradeRaw = String(item.condition_grade || 'A').toUpperCase();
  const gradeLower = ['a', 'b', 'c', 'd'].includes(gradeRaw.toLowerCase()) ? gradeRaw.toLowerCase() : 'b';
  const gradeText = tKey(`showroom.grade${gradeRaw}`, isAr() ? `الفئة ${gradeRaw}` : `Grade ${gradeRaw}`);
  const unavailable = isItemUnavailable(item);
  const statusUpper = String(item.status || '').toUpperCase();

  const districtEl = document.getElementById('detailDistrict');
  if (districtEl) districtEl.textContent = translateDistrict(item.district);

  const gradeBadge = document.getElementById('detailGradeBadge');
  if (gradeBadge) {
    gradeBadge.className = `grade-badge grade-${gradeLower}`;
    gradeBadge.textContent = `✓ ${gradeText}`;
  }

  const statusBadge = document.getElementById('detailStatusBadge');
  if (statusBadge) {
    if (unavailable) {
      statusBadge.textContent = statusUpper === 'SOLD' ? tKey('showroom.soldBadge') : tKey('showroom.dispatchedBadge');
      statusBadge.className = `status-pill ${statusUpper === 'SOLD' ? 'status-blocked' : 'status-pending'}`;
      showEl(statusBadge);
    } else {
      hideEl(statusBadge);
    }
  }

  document.getElementById('detailTitle').textContent = item.title || '';
  document.getElementById('detailCategoryModel').textContent = `${translateCategory(item.category)} — ${item.brand_model || item.title || ''}`;
  document.getElementById('detailPrice').textContent = formatNum(item.expected_resale_price);
  document.getElementById('detailAttrBrand').textContent = item.brand_model || item.title || '—';
  document.getElementById('detailAttrCategory').textContent = translateCategory(item.category);
  document.getElementById('detailAttrGrade').textContent = gradeText;
  document.getElementById('detailConfidence').textContent = `${formatNum(Math.round((Number(item.confidence_score) || 0.88) * 100))}%`;

  const defects = Array.isArray(item.detected_defects) ? item.detected_defects : [];
  document.getElementById('detailDefects').textContent =
    defects.length > 0 ? defects.map(formatDefectLabel).join(' • ') : tKey('showroom.cleanDefect');

  document.getElementById('detailDesc').textContent =
    item.description ||
    (isAr()
      ? 'سلعة معتمدة ومفحوصة بالكامل مع حق المعاينة والتجربة قبل الدفع كاش مع المندوب.'
      : 'Verified and AI-graded item with full hands-on inspection before cash payment.');

  // Seller Trust Card
  const sellerNameEl = document.getElementById('detailSellerName');
  const sellerDistEl = document.getElementById('detailSellerDistrict');
  const sellerRatingEl = document.getElementById('detailSellerRating');
  if (sellerNameEl) {
    sellerNameEl.textContent = item.seller_tier
      ? `${tKey('pdp.sellerVerifiedName')} (${item.seller_tier})`
      : tKey('pdp.sellerVerifiedName');
  }
  if (sellerDistEl) sellerDistEl.textContent = translateDistrict(item.district);
  if (sellerRatingEl) sellerRatingEl.textContent = `⭐ ${formatNum(4.9)}`;

  // Fair Price Benchmark Bar (immediate estimate + matrix refinement)
  renderPdpBenchmark(item);

  // Action buttons (bind cleanly without leaking closures across openings)
  const btnReserve = document.getElementById('btnDetailReserve');
  if (btnReserve) {
    btnReserve.disabled = unavailable;
    const span = btnReserve.querySelector('span');
    if (span) {
      span.textContent = unavailable
        ? (statusUpper === 'SOLD' ? tKey('showroom.soldBadge') : tKey('showroom.dispatchedBadge'))
        : tKey('reserveBtn');
    }
    btnReserve.dataset.itemId = item.id;
  }

  const btnAskBot = document.getElementById('btnDetailAskBot');
  if (btnAskBot) {
    btnAskBot.dataset.itemId = item.id;
  }

  openModal('modalProductDetail');

  if (!options.skipHashUpdate && window.location.hash !== `#item-${item.id}`) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#item-${encodeURIComponent(item.id)}`);
  }
}

function updatePdpGallery() {
  const images = state.pdpImages || [PLACEHOLDER_IMG];
  const total = images.length;
  const idx = Math.max(0, Math.min(state.pdpImageIndex, total - 1));
  state.pdpImageIndex = idx;

  const imgEl = document.getElementById('detailImg');
  if (imgEl) {
    delete imgEl.dataset.fallbackStage;
    imgEl.src = images[idx];
    imgEl.alt = state.activeDetailItem?.title || 'Item photo';
  }

  const counterEl = document.getElementById('detailPhotoCounter');
  if (counterEl) {
    counterEl.textContent = `${formatNum(idx + 1)} / ${formatNum(total)}`;
  }

  const prevBtn = document.getElementById('btnGalleryPrev');
  const nextBtn = document.getElementById('btnGalleryNext');
  if (total > 1) {
    showEl(prevBtn);
    showEl(nextBtn);
  } else {
    hideEl(prevBtn);
    hideEl(nextBtn);
  }

  const thumbsEl = document.getElementById('detailThumbnails');
  if (thumbsEl) {
    if (total <= 1) {
      thumbsEl.innerHTML = '';
    } else {
      thumbsEl.innerHTML = images
        .map(
          (src, i) => `
          <button type="button" class="detail-thumb-btn ${i === idx ? 'active' : ''}" data-action="select-gallery-photo" data-index="${i}" aria-label="${escapeHTML(
            isAr() ? `صورة ${i + 1}` : `Photo ${i + 1}`
          )}">
            <img src="${escapeHTML(src)}" alt="">
          </button>`
        )
        .join('');
    }
  }
}

function stepPdpGallery(delta) {
  const total = (state.pdpImages || []).length;
  if (total <= 1) return;
  state.pdpImageIndex = (state.pdpImageIndex + delta + total) % total;
  updatePdpGallery();
}

function setPdpGalleryIndex(idx) {
  const total = (state.pdpImages || []).length;
  if (idx >= 0 && idx < total) {
    state.pdpImageIndex = idx;
    updatePdpGallery();
  }
}

async function renderPdpBenchmark(item) {
  const price = Number(item.expected_resale_price || 0);
  const grade = String(item.condition_grade || 'B').toUpperCase();
  const mult = GRADE_MULTIPLIERS[grade] || 0.8;
  let fairPrice = price;
  let lowPrice = Math.round(price * 0.82);
  let highPrice = Math.round((price / mult) * 1.05);

  const applyBar = (low, fair, high) => {
    const marker = document.getElementById('detailBenchmarkMarker');
    const lowEl = document.getElementById('detailBenchmarkLow');
    const fairEl = document.getElementById('detailBenchmarkFair');
    const highEl = document.getElementById('detailBenchmarkHigh');
    const summaryEl = document.getElementById('detailBenchmarkSummary');

    const pct = Math.max(8, Math.min(92, Math.round(((price - low) / Math.max(1, high - low)) * 100)));
    if (marker) marker.style.insetInlineStart = `${pct}%`;
    if (lowEl) lowEl.textContent = formatEGP(low);
    if (fairEl) fairEl.textContent = formatEGP(fair);
    if (highEl) highEl.textContent = formatEGP(high);
    if (summaryEl) {
      summaryEl.textContent =
        price <= fair * 1.03
          ? tKey('pdp.benchmarkFairTag')
          : (isAr() ? 'ضمن نطاق السوق العادل' : 'Within Fair Market Range');
    }
  };

  applyBar(lowPrice, fairPrice, highPrice);

  try {
    if (!state.priceMatrixCache) {
      state.priceMatrixCache = await apiRequest('/api/price-matrix');
    }
    const modelStr = String(item.brand_model || item.title || '').toLowerCase();
    const match = (state.priceMatrixCache || []).find(
      (row) =>
        row.category === item.category &&
        (modelStr.includes(String(row.brand_model || '').toLowerCase()) ||
          String(row.brand_model || '').toLowerCase().includes(modelStr))
    );
    if (match) {
      lowPrice = Number(match.grade_d_price || lowPrice);
      fairPrice = Number(match[`grade_${grade.toLowerCase()}_price`] || price);
      highPrice = Number(match.grade_a_price || highPrice);
      applyBar(lowPrice, fairPrice, highPrice);
    }
  } catch {
    // Fallback bar already rendered cleanly
  }
}

function handleCompareActiveDetailItem() {
  const item = state.activeDetailItem;
  if (!item) return;
  closeModal('modalProductDetail');

  const panel = document.getElementById('floatingChatbotPanel');
  if (panel && !panel.classList.contains('active')) {
    toggleCompareChatbot(true);
  }
  const inp = document.getElementById('chatbotInput');
  if (inp) {
    const cat = translateCategory(item.category);
    inp.value = isAr()
      ? `قارن ${item.title} مع بديل مشابه في ${cat}`
      : `Compare ${item.title} with a similar ${cat}`;
    inp.focus();
    inp.select();
  }
}

// ==================== RESERVE & ASK BOT MODALS ====================
async function openReserveModalById(itemId) {
  try {
    const item = await findOrFetchItem(itemId);
    if (isItemUnavailable(item)) {
      showToast(
        isAr() ? 'السلعة غير متاحة' : 'Item Unavailable',
        isAr() ? 'تم حجز أو بيع هذه السلعة مسبقاً' : 'This item has already been reserved or sold',
        'warning'
      );
      return;
    }
    openReserveModal(item);
  } catch (err) {
    showToast(isAr() ? 'خطأ' : 'Error', err.message, 'error');
  }
}

function openReserveModal(item) {
  document.getElementById('reserveItemId').value = item.id;
  document.getElementById('reserveItemTitle').value = item.title || '';
  document.getElementById('reserveItemPrice').value = formatNum(item.expected_resale_price || 0);

  const phoneInput = document.getElementById('reserveBuyerPhone');
  if (phoneInput && !phoneInput.value && state.currentUser?.phone) {
    phoneInput.value = state.currentUser.phone;
  }
  const distSelect = document.getElementById('reserveDistrict');
  if (distSelect) {
    const preferred =
      state.currentUser?.district ||
      (state.selectedDistrict !== 'All' ? state.selectedDistrict : '') ||
      item.district ||
      'Sidi Beshr';
    distSelect.value = preferred;
  }
  openModal('modalReserve');
}

async function openAskBotModalById(itemId) {
  try {
    const item = await findOrFetchItem(itemId);
    openAskBotModal(item);
  } catch (err) {
    showToast(isAr() ? 'خطأ' : 'Error', err.message, 'error');
  }
}

function openAskBotModal(item) {
  state.activeBotItemId = item.id;
  const titleEl = document.getElementById('botModalTitle');
  if (titleEl) {
    titleEl.textContent = isAr() ? `💬 استفسر عن: ${item.title}` : `💬 Inquire about: ${item.title}`;
  }
  const greeting = isAr()
    ? `أهلاً بك! بخصوص "${item.title}"، سعره القطعي ${formatEGP(item.expected_resale_price)}، ومتاح للمعاينة فوراً كاش مع المندوب. تحب تسأل عن إيه؟`
    : `Hello! Regarding "${item.title}", the fixed price is ${formatEGP(item.expected_resale_price)}, and it is available for hands-on inspection before cash payment. How can I help?`;

  const chatBox = document.getElementById('botModalChatBox');
  if (chatBox) {
    chatBox.innerHTML = `
      <div class="chat-bubble bot">
        <div>${escapeHTML(greeting)}</div>
        <div class="chat-meta">${escapeHTML(isAr() ? 'آنتي فصال • الآن' : 'Anti-Fesal • Just now')}</div>
      </div>
    `;
  }
  openModal('modalAskBot');
}

// ==================== VIEW 2: SELLER STUDIO (3-STEP WIZARD + 4-SLOT UPLOAD) ====================
function setSellerWizardStep(stepNum) {
  const container = document.getElementById('sellerWizardSteps');
  if (!container) return;
  container.querySelectorAll('.wizard-step').forEach((li) => {
    const n = Number(li.dataset.step || 1);
    li.classList.toggle('active', n === stepNum);
    li.classList.toggle('completed', n < stepNum);
  });
}

function prefillSellerStudio() {
  const phoneEl = document.getElementById('sellerPhone');
  const distEl = document.getElementById('sellerDistrict');
  const tierEl = document.getElementById('sellerTier');
  if (phoneEl && !phoneEl.value && state.currentUser?.phone) {
    phoneEl.value = state.currentUser.phone;
  }
  if (distEl && state.selectedDistrict && state.selectedDistrict !== 'All') {
    distEl.value = state.selectedDistrict;
  }
  if (tierEl && state.selectedSellerTier) {
    tierEl.value = state.selectedSellerTier;
  }
}

function renderSellerPhotoPreviews() {
  const previewGrid = document.getElementById('previewGrid');
  const slotsContainer = document.getElementById('sellerPhotoSlots');

  if (slotsContainer) {
    const pills = slotsContainer.querySelectorAll('.photo-slot-pill');
    pills.forEach((pill, i) => {
      pill.classList.toggle('is-cover', i === 0 || i < state.uploadedImages.length);
    });
  }

  if (!previewGrid) return;
  if (state.uploadedImages.length === 0) {
    previewGrid.innerHTML = '';
    return;
  }

  previewGrid.innerHTML = state.uploadedImages
    .map(
      (url, idx) => `
      <div class="preview-thumb-wrap">
        <img src="${escapeHTML(url)}" class="preview-thumb" alt="${escapeHTML(
          isAr() ? `صورة ${idx + 1}` : `Photo ${idx + 1}`
        )}">
        <button type="button" class="btn-outline-sm" data-action="remove-upload" data-index="${idx}" aria-label="${escapeHTML(
          isAr() ? `إزالة الصورة ${idx + 1}` : `Remove photo ${idx + 1}`
        )}">✕</button>
      </div>`
    )
    .join('');

  // Position remove button cleanly in corner of preview wrapper
  previewGrid.querySelectorAll('.preview-thumb-wrap button').forEach((btn) => {
    btn.style.position = 'absolute';
    btn.style.top = '4px';
    btn.style.insetInlineEnd = '4px';
    btn.style.minHeight = '26px';
    btn.style.padding = '2px 7px';
    btn.style.fontSize = '11px';
  });
}

function removeUploadedImage(index) {
  if (index >= 0 && index < state.uploadedImages.length) {
    state.uploadedImages.splice(index, 1);
    renderSellerPhotoPreviews();
  }
}

function resetSellerUploadedPhotos() {
  state.uploadedImages = [];
  const fileInput = document.getElementById('photoFileInput');
  if (fileInput) fileInput.value = '';
  renderSellerPhotoPreviews();
}

async function handleSellerPhotoFiles(rawFiles) {
  const files = Array.from(rawFiles || []);
  if (files.length === 0) return;

  const remaining = MAX_UPLOAD_FILES - state.uploadedImages.length;
  if (remaining <= 0) {
    showToast(
      isAr() ? 'الحد الأقصى 4 صور' : 'Maximum 4 Photos',
      isAr() ? 'يمكنك رفع 4 صور كحد أقصى لكل سلعة' : 'You can upload up to 4 photos per item',
      'warning'
    );
    return;
  }

  if (files.length > remaining) {
    showToast(
      isAr() ? 'تم تقليص عدد الصور' : 'Photo Limit Applied',
      isAr() ? `سيتم رفع ${formatNum(remaining)} صور فقط للوصول للحد الأقصى (4)` : `Only ${remaining} more photo(s) can be added (max 4)`,
      'warning'
    );
  }

  setSellerWizardStep(2);

  for (const file of files.slice(0, remaining)) {
    if (!file.type.startsWith('image/')) {
      showToast(
        isAr() ? 'ملف غير مدعوم' : 'Unsupported File',
        isAr() ? `${file.name}: يرجى اختيار صورة صالحة (PNG / JPG)` : `${file.name}: please upload a valid image`,
        'warning'
      );
      continue;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      showToast(
        isAr() ? 'حجم الصورة كبير' : 'File Too Large',
        isAr() ? `${file.name}: الحد الأقصى لحجم الصورة 10MB` : `${file.name}: max file size is 10MB`,
        'error'
      );
      continue;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiRequest('/api/upload', {
        method: 'POST',
        body: formData
      });
      state.uploadedImages.push(res.url);
      renderSellerPhotoPreviews();
    } catch (uploadErr) {
      showToast(
        isAr() ? 'فشل رفع الصورة' : 'Photo Upload Failed',
        uploadErr.message || (isAr() ? 'تعذر رفع الصورة للخادم' : 'Could not upload image to server'),
        'error'
      );
    }
  }
}

function initSellerIntake() {
  const form = document.getElementById('sellerIntakeForm');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('photoFileInput');
  const step1Box = document.getElementById('sellerStep1');
  const step2Box = document.getElementById('sellerStep2');

  if (step1Box) {
    step1Box.addEventListener('focusin', () => {
      if (!state.currentAppraisalItem) setSellerWizardStep(1);
    });
  }
  if (step2Box) {
    step2Box.addEventListener('focusin', () => {
      if (!state.currentAppraisalItem) setSellerWizardStep(2);
    });
  }

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      handleSellerPhotoFiles(e.dataTransfer?.files);
    });
    fileInput.addEventListener('change', async (e) => {
      await handleSellerPhotoFiles(e.target.files);
      fileInput.value = '';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitAppraisal');
      const restore = setButtonLoading(
        btn,
        isAr() ? 'جاري الفحص البصري والتسعير الفوري...' : 'Running AI visual inspection & valuation...'
      );

      try {
        const titleVal = document.getElementById('sellerTitle').value.trim();
        const catVal = document.getElementById('sellerCategory').value;
        const payload = {
          title: titleVal,
          description: document.getElementById('sellerDesc').value.trim(),
          district: document.getElementById('sellerDistrict').value,
          seller_phone: document.getElementById('sellerPhone').value.trim(),
          seller_tier: document.getElementById('sellerTier').value,
          image_urls: state.uploadedImages.length > 0 ? [...state.uploadedImages] : ['default.jpg'],
          declared_category: catVal,
          seller_id: state.currentUser ? state.currentUser.id : null
        };

        const result = await apiRequest('/api/intake', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        state.currentAppraisalItem = { ...result, title: titleVal, district: payload.district };
        renderAppraisalReceipt(result, titleVal);
        resetSellerUploadedPhotos();
        setSellerWizardStep(3);
        loadMetrics();
        showToast(
          isAr() ? 'تم الفحص والتسعير بنجاح! ⚡' : 'AI Appraisal Complete! ⚡',
          isAr() ? 'راجع تقرير الفحص والتسعير الفوري بالأسفل' : 'Review your valuation receipt & instant cash offer',
          'success'
        );
      } catch (err) {
        showToast(isAr() ? 'فشل تقييم السلعة' : 'Appraisal Failed', err.message, 'error');
      } finally {
        restore();
      }
    });
  }
}

function renderAppraisalReceipt(result, submittedTitle = '') {
  const receipt = document.getElementById('appraisalReceipt');
  if (!receipt) return;

  showEl(receipt);
  const titleText = submittedTitle || document.getElementById('sellerTitle')?.value || result.brand_model || '—';
  document.getElementById('receiptTitle').textContent = titleText;
  document.getElementById('receiptCategoryModel').textContent = `${translateCategory(result.category)} — ${result.brand_model || '—'}`;
  document.getElementById('receiptGrade').textContent = tKey(`showroom.grade${result.condition_grade}`, result.condition_grade);
  document.getElementById('receiptConfidence').textContent = `${formatNum(Math.round((Number(result.confidence_score) || 0) * 100))}%`;

  const defects = Array.isArray(result.detected_defects) ? result.detected_defects : [];
  document.getElementById('receiptDefects').textContent =
    defects.length > 0 ? defects.map(formatDefectLabel).join('، ') : tKey('showroom.cleanDefect');

  document.getElementById('receiptResalePrice').textContent = formatEGP(result.expected_resale_price);
  document.getElementById('receiptCommission').textContent = `${formatNum(Math.round((Number(result.commission_rate) || 0.08) * 100))}% (${formatEGP(result.commission_amount)})`;
  document.getElementById('receiptInstantPayout').textContent = formatEGP(result.seller_payout_cash);

  const badge = document.getElementById('receiptStatusBadge');
  const actionArea = document.getElementById('receiptActionArea');

  if (result.status === 'AUTO_APPROVED') {
    receipt.className = 'receipt-card approved';
    badge.className = 'receipt-status-pill auto-approved';
    badge.textContent = isAr() ? '✓ معتمد ومفحوص آلياً (Auto-Approved)' : '✓ Auto-Approved by AI';
    actionArea.innerHTML = `
      <button type="button" id="btnAcceptQuote" class="btn-accept-dispatch" data-action="accept-quote">
        <span aria-hidden="true">🚚</span>
        <span>${escapeHTML(tKey('seller.acceptQuoteBtn'))}</span>
      </button>
    `;
  } else {
    receipt.className = 'receipt-card pending';
    badge.className = 'receipt-status-pill pending-triage';
    badge.textContent = isAr() ? '⚠️ في انتظار مراجعة التاجر (HITL)' : '⚠️ Pending Merchant Review (HITL)';
    const confPct = Math.round((Number(result.confidence_score) || 0) * 100);
    actionArea.innerHTML = `
      <div class="account-status-banner pending">
        <strong>${escapeHTML(isAr() ? 'ملاحظة فحص الذكاء الاصطناعي:' : 'AI Inspection Note:')}</strong>
        ${escapeHTML(
          isAr()
            ? `نسبة الثقة (${confPct}%) أقل من 80%. تم تحويل السلعة إلى طابور مراجعة التاجر (HITL) لاعتمادها سريعاً.`
            : `Confidence score (${confPct}%) is below 80%. Routed to Merchant HITL review queue for fast verification.`
        )}
      </div>
    `;
  }

  receipt.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function handleAcceptQuote(btnEl) {
  if (!state.currentAppraisalItem) return;
  const item = state.currentAppraisalItem;
  const district = document.getElementById('sellerDistrict')?.value || item.district || 'Sidi Beshr';
  const restore = setButtonLoading(
    btnEl,
    isAr() ? 'جاري استدعاء أقرب كابتن...' : 'Dispatching nearest Captain...'
  );

  try {
    const settleResult = await apiRequest('/api/settle', {
      method: 'POST',
      body: JSON.stringify({
        item_id: item.item_id,
        buyer_id: 'Platform_Instant_Buyout',
        agreed_price: item.expected_resale_price,
        pickup_address: isAr()
          ? `الإسكندرية — منطقة ${translateDistrict(district)}`
          : `Alexandria — ${translateDistrict(district)}`,
        delivery_district: district
      })
    });

    state.currentAppraisalItem = null;
    showToast(
      isAr() ? 'تم قبول العرض واستدعاء المندوب! 🎉' : 'Offer Accepted & Captain Dispatched! 🎉',
      isAr()
        ? `الكابتن: ${settleResult.dispatch.driver_name} (${settleResult.dispatch.driver_phone}) سيتواصل معك لتسليم ${formatEGP(item.seller_payout_cash)} كاش!`
        : `Captain ${settleResult.dispatch.driver_name} (${settleResult.dispatch.driver_phone}) will deliver ${formatEGP(item.seller_payout_cash)} cash!`,
      'success'
    );

    if (['merchant', 'admin'].includes(state.currentUser?.role)) {
      switchPortalView('driver-logs');
    } else {
      switchPortalView('tracking');
      if (settleResult.deal_id) quickTrack(settleResult.deal_id);
    }
  } catch (err) {
    showToast(isAr() ? 'فشل استدعاء المندوب' : 'Dispatch Failed', err.message, 'error');
  } finally {
    restore();
  }
}

function resetSellerAppraisal() {
  state.currentAppraisalItem = null;
  document.getElementById('sellerIntakeForm')?.reset();
  resetSellerUploadedPhotos();
  const receipt = document.getElementById('appraisalReceipt');
  hideEl(receipt);
  setSellerWizardStep(1);
  prefillSellerStudio();
  document.getElementById('sellerTitle')?.focus();
}

// ==================== VIEW 3: MERCHANT DASHBOARD (HITL) ====================
async function loadMetrics() {
  try {
    const metrics = await apiRequest('/api/metrics');
    const totalEl = document.getElementById('kpiTotalItems');
    const rateEl = document.getElementById('kpiAutoApprovalRate');
    const pendingEl = document.getElementById('kpiPendingCount');
    const commEl = document.getElementById('kpiLockedCommission');
    const pendingBadge = document.getElementById('countPendingReview');

    if (totalEl) totalEl.textContent = formatNum(metrics.total_items);
    if (rateEl) rateEl.textContent = `${formatNum(metrics.auto_approval_percent)}%`;
    if (pendingEl) pendingEl.textContent = formatNum(metrics.pending_review_count);
    if (pendingBadge) pendingBadge.textContent = formatNum(metrics.pending_review_count);
    if (commEl) commEl.textContent = formatEGP(metrics.locked_commission_total);
  } catch (err) {
    console.warn('Metrics load error:', err);
  }
}

async function loadMerchantQueue() {
  const tbody = document.getElementById('tbodyMerchantQueue');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8"><div class="skeleton-line"></div></td></tr><tr><td colspan="8"><div class="skeleton-line"></div></td></tr>`;

  try {
    const items = await apiRequest('/api/items?status=PENDING_REVIEW&limit=50');
    if (!Array.isArray(items) || items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-inline-msg">${escapeHTML(tKey('merchant.emptyQueue'))}</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items
      .map((item) => {
        const conf = Math.round((Number(item.confidence_score) || 0.72) * 100);
        const defects = (Array.isArray(item.detected_defects) ? item.detected_defects : [])
          .map(formatDefectLabel)
          .join('، ') || (isAr() ? 'تحتاج مراجعة' : 'Needs review');
        const safeId = escapeHTML(item.id);
        const grade = escapeHTML(item.condition_grade || 'C');

        return `
          <tr>
            <td><code class="mono-num">${safeId}</code></td>
            <td>
              <strong>${escapeHTML(item.title)}</strong>
              <div class="text-muted-sm">${escapeHTML(item.brand_model || '')}</div>
            </td>
            <td>${escapeHTML(translateDistrict(item.district))}</td>
            <td><span class="grade-badge grade-${grade.toLowerCase()}">${escapeHTML(isAr() ? `فئة ${grade}` : `Grade ${grade}`)}</span></td>
            <td class="mono-num kpi-amber">${formatNum(conf)}%</td>
            <td class="text-muted-sm">${escapeHTML(defects)}</td>
            <td class="tabular-num"><strong>${escapeHTML(formatEGP(item.expected_resale_price))}</strong></td>
            <td>
              <div class="table-actions">
                <button type="button" class="btn-table-action btn-table-approve" data-action="review-item" data-id="${safeId}" data-decision="APPROVE">${escapeHTML(tKey('merchant.btnApprove'))}</button>
                <button type="button" class="btn-table-action btn-table-adjust" data-action="review-item" data-id="${safeId}" data-decision="ADJUST">${escapeHTML(tKey('merchant.btnAdjust'))}</button>
                <button type="button" class="btn-table-action btn-table-reject" data-action="review-item" data-id="${safeId}" data-decision="REJECT">${escapeHTML(tKey('merchant.btnReject'))}</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    showToast(isAr() ? 'فشل تحميل طابور المراجعة' : 'Queue Load Failed', err.message, 'error');
    tbody.innerHTML = `<tr><td colspan="8" class="empty-inline-msg text-crimson">${escapeHTML(err.message)}</td></tr>`;
  }
}

async function handleMerchantQueueAction(itemId, decision) {
  if (!itemId || !decision) return;
  if (decision === 'ADJUST') {
    try {
      const item = await findOrFetchItem(itemId);
      openAdjustModal(item);
    } catch (err) {
      showToast(isAr() ? 'خطأ' : 'Error', err.message, 'error');
    }
    return;
  }

  if (decision === 'REJECT') {
    openConfirmModal({
      title: isAr() ? 'تأكيد رفض السلعة' : 'Confirm Item Rejection',
      message: isAr()
        ? `هل أنت متأكد من رفض السلعة #${itemId} واستبعادها من المعرض؟`
        : `Are you sure you want to reject item #${itemId}?`,
      confirmLabel: isAr() ? 'تأكيد الرفض' : 'Reject Item',
      onConfirm: () => reviewItemAction(itemId, 'REJECT')
    });
    return;
  }

  await reviewItemAction(itemId, decision);
}

function openAdjustModal(item) {
  document.getElementById('adjustItemId').value = item.id;
  document.getElementById('adjustTitle').value = item.title || '';
  document.getElementById('adjustGrade').value = item.condition_grade || 'C';
  document.getElementById('adjustPrice').value = item.expected_resale_price || 0;
  document.getElementById('adjustNotes').value = '';
  openModal('modalAdjust');
}

async function reviewItemAction(itemId, action) {
  try {
    await apiRequest(`/api/review/${encodeURIComponent(itemId)}`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    showToast(
      action === 'APPROVE'
        ? (isAr() ? 'تم الاعتماد' : 'Approved')
        : (isAr() ? 'تم الرفض' : 'Rejected'),
      isAr()
        ? `تم تحديث حالة السلعة #${itemId} بنجاح`
        : `Item #${itemId} updated (${action})`,
      action === 'APPROVE' ? 'success' : 'warning'
    );
    loadMerchantQueue();
    loadMetrics();
  } catch (err) {
    showToast(isAr() ? 'فشل تنفيذ الإجراء' : 'Review Action Failed', err.message, 'error');
  }
}

// ==================== VIEW 4: TRADER STUDIO & CALCULATOR ====================
function handleSelectTraderTier(tierKey) {
  const tierMap = {
    everyday: { seller: 'Everyday Seller', apply: 'everyday', comm: '8%' },
    pro: { seller: 'Pro Trader', apply: 'pro', comm: '5%' },
    enterprise: { seller: 'Enterprise', apply: 'enterprise', comm: '3%' }
  };
  const chosen = tierMap[tierKey] || tierMap.everyday;
  state.selectedSellerTier = chosen.seller;

  const sellerTierSel = document.getElementById('sellerTier');
  if (sellerTierSel) sellerTierSel.value = chosen.seller;
  const applyTierSel = document.getElementById('sellerApplyTier');
  if (applyTierSel) applyTierSel.value = chosen.apply;

  showToast(
    isAr() ? `تم اختيار باقة ${chosen.seller}` : `Selected ${chosen.seller} Plan`,
    isAr()
      ? `تم ضبط عمولة الباقة (${chosen.comm}) تلقائياً`
      : `Plan commission rate (${chosen.comm}) preselected`,
    'success'
  );

  if (state.currentUser && ['seller', 'merchant', 'admin'].includes(state.currentUser.role)) {
    switchPortalView('seller');
  } else {
    openSellerApplyModal();
  }
}

async function populateTraderItemSelect() {
  const select = document.getElementById('selectAdItem');
  if (!select) return;

  if (state.items.length === 0) {
    try {
      state.items = await apiRequest('/api/items?limit=100');
    } catch (err) {
      showToast(isAr() ? 'خطأ في جلب السلع' : 'Failed to load items', err.message, 'error');
      return;
    }
  }

  const approved = state.items.filter((it) => it.status === 'AUTO_APPROVED');
  if (approved.length === 0) {
    select.innerHTML = `<option value="">${escapeHTML(isAr() ? 'لا توجد سلع معتمدة حالياً' : 'No approved items available')}</option>`;
    return;
  }

  select.innerHTML = approved
    .map(
      (it) =>
        `<option value="${escapeHTML(it.id)}">${escapeHTML(it.title)} (${escapeHTML(
          translateDistrict(it.district)
        )}) — ${escapeHTML(formatEGP(it.expected_resale_price))}</option>`
    )
    .join('');
}

async function sendSimPrompt(promptText) {
  const chatBox = document.getElementById('simChatBox');
  if (!chatBox) return;

  const buyerBubble = document.createElement('div');
  buyerBubble.className = 'chat-bubble buyer';
  buyerBubble.innerHTML = `<div>${escapeHTML(promptText)}</div><div class="chat-meta">${escapeHTML(
    isAr() ? 'المشتري • الآن' : 'Buyer • Just now'
  )}</div>`;
  chatBox.appendChild(buyerBubble);
  chatBox.scrollTop = chatBox.scrollHeight;

  const typingBubble = document.createElement('div');
  typingBubble.className = 'chat-bubble bot';
  typingBubble.innerHTML = `
    <div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>
    <div class="chat-meta">${escapeHTML(isAr() ? 'آنتي فصال يكتب الآن...' : 'Anti-Fesal is typing...')}</div>
  `;
  chatBox.appendChild(typingBubble);
  chatBox.scrollTop = chatBox.scrollHeight;

  const select = document.getElementById('selectAdItem');
  const itemId = select?.value || state.items[0]?.id || 'AF-1001';

  try {
    const startTime = Date.now();
    const res = await apiRequest('/api/autoreply', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, buyer_message: promptText })
    });
    const elapsed = Date.now() - startTime;
    if (elapsed < 300) await new Promise((r) => setTimeout(r, 300 - elapsed));

    typingBubble.remove();
    const botBubble = document.createElement('div');
    botBubble.className = 'chat-bubble bot';
    botBubble.innerHTML = `
      <div class="copy-text">${escapeHTML(res.reply_text)}</div>
      <div class="chat-meta">⚡ ${formatNum(res.response_time_ms)}ms • ${escapeHTML(res.intent_detected)}</div>
    `;
    chatBox.appendChild(botBubble);
    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    typingBubble.remove();
    showToast(isAr() ? 'خطأ في المحاكي' : 'Simulator Error', err.message, 'error');
    const errBubble = document.createElement('div');
    errBubble.className = 'chat-bubble bot';
    errBubble.textContent = err.message;
    chatBox.appendChild(errBubble);
  }
}

async function copyAdText(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  try {
    await navigator.clipboard.writeText(el.textContent || '');
    showToast(
      isAr() ? 'تم النسخ' : 'Copied',
      isAr() ? 'تم نسخ نص الإعلان إلى الحافظة بنجاح 📋' : 'Ad copy copied to clipboard 📋',
      'success'
    );
  } catch (err) {
    showToast(isAr() ? 'تعذر النسخ' : 'Copy Failed', err.message, 'error');
  }
}

function updateTierCalculator() {
  const slider = document.getElementById('calcVolumeSlider');
  if (!slider) return;
  const volume = Number(slider.value || 100000);
  const feeEveryday = Math.round(volume * 0.08);
  const feePro = Math.round(volume * 0.05);
  const feeEnterprise = Math.round(volume * 0.03);

  const volDisp = document.getElementById('calcVolumeDisplay');
  const fEvery = document.getElementById('calcFeeEveryday');
  const fPro = document.getElementById('calcFeePro');
  const fEnt = document.getElementById('calcFeeEnterprise');
  const sPro = document.getElementById('calcSavingsPro');
  const sEnt = document.getElementById('calcSavingsEnterprise');

  if (volDisp) volDisp.textContent = formatEGP(volume);
  if (fEvery) fEvery.textContent = formatEGP(feeEveryday);
  if (fPro) fPro.textContent = formatEGP(feePro);
  if (fEnt) fEnt.textContent = formatEGP(feeEnterprise);
  if (sPro) {
    sPro.textContent = isAr()
      ? `وفر ${formatEGP(feeEveryday - feePro)} شهرياً! 🎉`
      : `Save ${formatEGP(feeEveryday - feePro)}/mo! 🎉`;
  }
  if (sEnt) {
    sEnt.textContent = isAr()
      ? `وفر ${formatEGP(feeEveryday - feeEnterprise)} شهرياً! 🚀`
      : `Save ${formatEGP(feeEveryday - feeEnterprise)}/mo! 🚀`;
  }
}

function initTierCalculator() {
  const slider = document.getElementById('calcVolumeSlider');
  if (!slider) return;
  slider.addEventListener('input', updateTierCalculator);
  updateTierCalculator();
}

// ==================== VIEW 5: DISPATCHES & AUDIT LOGS ====================
async function loadDispatches() {
  const tbody = document.getElementById('tbodyDispatches');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9"><div class="skeleton-line"></div></td></tr>`;

  try {
    const res = await apiRequest('/api/dispatches?limit=30');
    const dispatches = Array.isArray(res) ? res : (res.dispatches || []);
    if (dispatches.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-inline-msg">${escapeHTML(
        isAr() ? 'لا توجد مهام مناديب نشطة حالياً.' : 'No active dispatches found.'
      )}</td></tr>`;
      return;
    }

    tbody.innerHTML = dispatches
      .map((d) => {
        const isCompleted = d.status === 'COMPLETED';
        const safeId = escapeHTML(d.id);
        return `
          <tr>
            <td><code class="mono-num">${safeId}</code></td>
            <td><code class="mono-num">${escapeHTML(d.item_id || '—')}</code></td>
            <td>📍 ${escapeHTML(translateDistrict(d.district))}</td>
            <td class="text-muted-sm">${escapeHTML(d.delivery_address || d.pickup_address || '—')}</td>
            <td>
              <strong>${escapeHTML(d.driver_name || '—')}</strong>
              <div class="text-muted-sm mono-num">${escapeHTML(d.driver_phone || '')}</div>
            </td>
            <td class="text-emerald tabular-num"><strong>${escapeHTML(formatEGP(d.payout_cash))}</strong></td>
            <td class="mono-num">${formatNum(d.retry_count || 0)}</td>
            <td><span class="receipt-status-pill ${isCompleted ? 'auto-approved' : 'pending-triage'}">${escapeHTML(d.status)}</span></td>
            <td>
              ${
                isCompleted
                  ? `<span>✓ ${escapeHTML(isAr() ? 'مكتمل' : 'Completed')}</span>`
                  : `<button type="button" class="btn-table-action btn-table-approve" data-action="update-dispatch" data-id="${safeId}" data-status="COMPLETED">${escapeHTML(
                      isAr() ? 'تأكيد التسليم كاش' : 'Mark Completed'
                    )}</button>`
              }
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    showToast(isAr() ? 'فشل تحميل المهام' : 'Dispatches Load Failed', err.message, 'error');
    tbody.innerHTML = `<tr><td colspan="9" class="empty-inline-msg text-crimson">${escapeHTML(err.message)}</td></tr>`;
  }
}

async function updateDispatch(dispatchId, status, btnEl) {
  const restore = setButtonLoading(btnEl, isAr() ? 'جاري التحديث...' : 'Updating...');
  try {
    await apiRequest(`/api/dispatches/${encodeURIComponent(dispatchId)}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
    showToast(
      isAr() ? 'تم تحديث المهمة' : 'Dispatch Updated',
      isAr() ? `تم تغيير حالة المهمة #${dispatchId} إلى ${status}` : `Dispatch #${dispatchId} updated to ${status}`,
      'success'
    );
    loadDispatches();
  } catch (err) {
    showToast(isAr() ? 'فشل التحديث' : 'Update Failed', err.message, 'error');
  } finally {
    restore();
  }
}

async function loadAuditLogs() {
  const thead = document.getElementById('logThead');
  const tbody = document.getElementById('logTbody');
  if (!thead || !tbody) return;

  tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton-line"></div></td></tr>`;
  const tab = state.currentLogTab || 'automation';

  try {
    const logs = await apiRequest(`/api/logs/${encodeURIComponent(tab)}`);
    const rows = Array.isArray(logs) ? logs : [];

    if (tab === 'automation') {
      thead.innerHTML = `<tr><th scope="col">Timestamp</th><th scope="col">Event Type</th><th scope="col">Item ID</th><th scope="col">Execution (ms)</th><th scope="col">Status</th><th scope="col">Details</th></tr>`;
      tbody.innerHTML = rows
        .map(
          (l) => `
          <tr>
            <td>${escapeHTML(l.timestamp ? String(l.timestamp).slice(11, 19) : '')}</td>
            <td><strong>${escapeHTML(l.event_type)}</strong></td>
            <td>${escapeHTML(l.item_id)}</td>
            <td class="text-emerald">${escapeHTML(l.execution_time_ms)}ms</td>
            <td>${escapeHTML(l.status)}</td>
            <td>${escapeHTML(l.details)}</td>
          </tr>`
        )
        .join('');
    } else if (tab === 'skipped') {
      thead.innerHTML = `<tr><th scope="col">Timestamp</th><th scope="col">Item ID</th><th scope="col">Title</th><th scope="col">Category</th><th scope="col">Quoted Price</th><th scope="col">Skipped Reason</th></tr>`;
      tbody.innerHTML = rows
        .map(
          (l) => `
          <tr>
            <td>${escapeHTML(l.timestamp ? String(l.timestamp).slice(11, 19) : '')}</td>
            <td>${escapeHTML(l.item_id)}</td>
            <td>${escapeHTML(l.title)}</td>
            <td>${escapeHTML(l.category || '[EMPTY]')}</td>
            <td class="text-crimson">${escapeHTML(l.quoted_price)}</td>
            <td><strong>${escapeHTML(l.reason)}</strong></td>
          </tr>`
        )
        .join('');
    } else {
      thead.innerHTML = `<tr><th scope="col">Timestamp</th><th scope="col">Item ID</th><th scope="col">Orig Grade</th><th scope="col">Corr Grade</th><th scope="col">Orig Price</th><th scope="col">Corr Price</th><th scope="col">Merchant Notes</th><th scope="col">Reviewer</th></tr>`;
      tbody.innerHTML = rows
        .map(
          (l) => `
          <tr>
            <td>${escapeHTML(l.timestamp ? String(l.timestamp).slice(11, 19) : '')}</td>
            <td>${escapeHTML(l.item_id)}</td>
            <td>${escapeHTML(l.original_grade)}</td>
            <td class="text-emerald"><strong>${escapeHTML(l.corrected_grade)}</strong></td>
            <td>${escapeHTML(l.original_price)}</td>
            <td class="text-emerald"><strong>${escapeHTML(l.corrected_price)}</strong></td>
            <td>${escapeHTML(l.merchant_notes)}</td>
            <td>${escapeHTML(l.reviewer_id)}</td>
          </tr>`
        )
        .join('');
    }
  } catch (err) {
    showToast(isAr() ? 'فشل تحميل السجلات' : 'Logs Load Failed', err.message, 'error');
    tbody.innerHTML = `<tr><td colspan="6" class="text-crimson">${escapeHTML(err.message)}</td></tr>`;
  }
}

// ==================== VIEW 6: ALEXANDRIA PRICE MATRIX ====================
function initPriceIndex() {
  const catFilter = document.getElementById('priceIndexCategoryFilter');
  const searchInput = document.getElementById('priceIndexSearchInput');
  if (catFilter) catFilter.addEventListener('change', () => loadPriceMatrix());
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadPriceMatrix(), 280);
    });
  }
}

async function loadPriceMatrix() {
  const tbody = document.getElementById('tbodyPriceMatrix');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9"><div class="skeleton-line"></div></td></tr>`;

  try {
    const cat = document.getElementById('priceIndexCategoryFilter')?.value || 'All';
    const search = document.getElementById('priceIndexSearchInput')?.value.trim() || '';
    let url = '/api/price-matrix?';
    if (cat && cat !== 'All') url += `category=${encodeURIComponent(cat)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const data = await apiRequest(url);
    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-inline-msg">${escapeHTML(
        isAr() ? 'لا توجد نتائج مطابقة لبحثك في مصفوفة الأسعار.' : 'No matching models found in the price index.'
      )}</td></tr>`;
      return;
    }

    tbody.innerHTML = data
      .map(
        (row) => `
        <tr>
          <td><strong>${escapeHTML(translateCategory(row.category))}</strong></td>
          <td><strong>${escapeHTML(row.brand_model)}</strong></td>
          <td class="tabular-num"><strong>${escapeHTML(formatEGP(row.market_base_price_egp))}</strong></td>
          <td><span class="badge-grade-mini grade-a">${escapeHTML(formatEGP(row.grade_a_price))}</span></td>
          <td><span class="badge-grade-mini grade-b">${escapeHTML(formatEGP(row.grade_b_price))}</span></td>
          <td><span class="badge-grade-mini grade-c">${escapeHTML(formatEGP(row.grade_c_price))}</span></td>
          <td><span class="badge-grade-mini grade-d">${escapeHTML(formatEGP(row.grade_d_price))}</span></td>
          <td class="mono-num">${formatNum(Math.round((Number(row.depreciation_rate_annual) || 0) * 100))}% ${escapeHTML(
            isAr() ? 'سنوياً' : '/ yr'
          )}</td>
          <td>
            <button type="button" class="btn-table-action btn-table-approve" data-action="prefill-matrix" data-category="${escapeHTML(
              row.category
            )}" data-model="${escapeHTML(row.brand_model)}">
              ${escapeHTML(isAr() ? 'سعّر الآن ⚡' : 'Price Now ⚡')}
            </button>
          </td>
        </tr>`
      )
      .join('');
  } catch (err) {
    showToast(isAr() ? 'فشل تحميل مؤشر الأسعار' : 'Price Index Failed', err.message, 'error');
    tbody.innerHTML = `<tr><td colspan="9" class="empty-inline-msg text-crimson">${escapeHTML(err.message)}</td></tr>`;
  }
}

function prefillSellerFromMatrix(category, model) {
  state.pendingMatrixPrefill = { category, model };
  if (!state.currentUser || !state.authToken || !['seller', 'merchant', 'admin'].includes(state.currentUser.role)) {
    handleHeaderSellClick();
    return;
  }
  switchPortalView('seller');
  const catInput = document.getElementById('sellerCategory');
  const titleInput = document.getElementById('sellerTitle');
  if (catInput && category) catInput.value = category;
  if (titleInput && model) titleInput.value = model;
  showToast(
    isAr() ? 'تم اختيار الموديل' : 'Model Selected',
    isAr() ? `تم تعبئة ${model} في نموذج التسعير` : `Prefilled ${model} in AI Appraisal Studio`,
    'success'
  );
}

// ==================== VIEW 7: LIVE ORDER TRACKING & LEAFLET MAP ====================
let trackingMapInstance = null;
let trackingMarkers = { seller: null, driver: null, buyer: null };
let trackingPolyline = null;
let trackingPollTimer = null;

function initTracking() {
  const form = document.getElementById('trackingSearchForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = document.getElementById('trackingQueryInput')?.value.trim();
      if (query) trackOrder(query);
    });
  }

  // Interactive buyer inspection checklist persistence
  ['chkInspectCondition', 'chkInspectFunction', 'chkInspectPrice'].forEach((id) => {
    const chk = document.getElementById(id);
    if (!chk) return;
    chk.addEventListener('change', () => {
      saveInspectionChecklist();
      const allChecked = ['chkInspectCondition', 'chkInspectFunction', 'chkInspectPrice'].every(
        (cid) => document.getElementById(cid)?.checked
      );
      if (allChecked) {
        showToast(
          isAr() ? 'المعاينة مكتملة ✓' : 'Inspection Complete ✓',
          isAr() ? 'كل نقاط المعاينة مطابقة! يمكنك الآن تسليم الكاش للكابتن.' : 'All inspection checks passed! You can safely settle cash with the Captain.',
          'success'
        );
      }
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.currentView === 'tracking' && state.activeTrackingQuery) {
      trackOrder(state.activeTrackingQuery, { silent: true });
      startTrackingPolling();
    } else {
      stopTrackingPolling();
    }
  });
}

function loadInspectionChecklist(refKey) {
  const saved = safeParseJSON(localStorage.getItem(STORAGE_KEYS.checklistPrefix + (refKey || 'default')), {});
  ['chkInspectCondition', 'chkInspectFunction', 'chkInspectPrice'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(saved[id]);
  });
}

function saveInspectionChecklist() {
  const key = STORAGE_KEYS.checklistPrefix + (state.activeDispatchId || state.activeTrackingQuery || 'default');
  const payload = {
    chkInspectCondition: Boolean(document.getElementById('chkInspectCondition')?.checked),
    chkInspectFunction: Boolean(document.getElementById('chkInspectFunction')?.checked),
    chkInspectPrice: Boolean(document.getElementById('chkInspectPrice')?.checked)
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

function startTrackingPolling() {
  stopTrackingPolling();
  if (!state.activeTrackingQuery || state.currentView !== 'tracking' || document.visibilityState !== 'visible') return;
  trackingPollTimer = setInterval(() => {
    if (state.currentView === 'tracking' && document.visibilityState === 'visible' && state.activeTrackingQuery) {
      trackOrder(state.activeTrackingQuery, { silent: true });
    } else {
      stopTrackingPolling();
    }
  }, 10000);
}

function stopTrackingPolling() {
  if (trackingPollTimer) {
    clearInterval(trackingPollTimer);
    trackingPollTimer = null;
  }
}

function quickTrack(query) {
  const input = document.getElementById('trackingQueryInput');
  if (input) input.value = query;
  trackOrder(query);
}

function normalizeWaPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('01') && digits.length === 11) return `2${digits}`;
  if (digits.startsWith('20')) return digits;
  return digits;
}

async function trackOrder(query, options = {}) {
  const placeholder = document.getElementById('trackingPlaceholder');
  const resultArea = document.getElementById('trackingResultArea');

  if (!options.silent && placeholder) {
    showEl(placeholder);
    hideEl(resultArea);
  }

  try {
    const data = await apiRequest(`/api/track/${encodeURIComponent(query)}`);
    state.activeTrackingQuery = query;
    state.activeDispatchId = data.dispatch?.id || data.deal?.id || query;

    hideEl(placeholder);
    showEl(resultArea);

    const headerTitle = document.getElementById('trackHeaderTitle');
    const headerMeta = document.getElementById('trackHeaderMeta');
    if (headerTitle) {
      headerTitle.textContent = `${isAr() ? '📍 مسار الشحنة:' : '📍 Shipment Route:'} ${data.deal?.id || data.dispatch?.id || query}`;
    }
    if (headerMeta) {
      headerMeta.textContent = `${isAr() ? 'تاريخ المعاملة:' : 'Created:'} ${data.deal?.created_at || data.dispatch?.created_at || (isAr() ? 'الآن' : 'Now')}`;
    }

    let liveData = null;
    if (data.dispatch && data.dispatch.id) {
      try {
        liveData = await apiRequest(`/api/dispatches/${encodeURIComponent(data.dispatch.id)}/live-tracking`);
      } catch (liveErr) {
        console.warn('Live tracking fallback:', liveErr);
      }
    }

    const stepOrder = ['ORDER_PLACED', 'DRIVER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED_SETTLED'];
    let currentStep = liveData?.current_step || data.dispatch?.current_step || 'ORDER_PLACED';
    if (data.dispatch?.status === 'COMPLETED') currentStep = 'DELIVERED_SETTLED';
    else if (data.dispatch?.status === 'IN_TRANSIT' && currentStep === 'ORDER_PLACED') currentStep = 'OUT_FOR_DELIVERY';
    else if (data.dispatch?.driver_name && currentStep === 'ORDER_PLACED') currentStep = 'DRIVER_ASSIGNED';

    const currentIndex = stepOrder.indexOf(currentStep);
    const isCompleted = currentStep === 'DELIVERED_SETTLED';

    const statusBadge = document.getElementById('trackStatusBadge');
    if (statusBadge) {
      statusBadge.textContent = isCompleted
        ? (isAr() ? '✓ مكتملة ومسلّمة' : '✓ Delivered & Settled')
        : (isAr() ? '🚚 جارية بالحي' : '🚚 In Progress');
      statusBadge.className = `receipt-status-pill ${isCompleted ? 'auto-approved' : 'pending-triage'}`;
    }

    const pickupDistrictRaw = liveData?.pickup_district || data.item?.district || data.dispatch?.district || 'El-Attarine';
    const deliveryDistrictRaw = liveData?.delivery_district || data.dispatch?.delivery_district || data.dispatch?.district || 'Sidi Beshr';
    const deliveryAddress = liveData?.delivery_address || data.dispatch?.delivery_address || data.dispatch?.pickup_address || translateDistrict(deliveryDistrictRaw);

    const notifBanner = document.getElementById('trackNotificationBanner');
    const notifText = document.getElementById('trackNotificationText');
    if (notifBanner) {
      if (currentStep === 'PICKED_UP' || currentStep === 'OUT_FOR_DELIVERY') {
        showEl(notifBanner);
        if (notifText) {
          notifText.textContent =
            currentStep === 'PICKED_UP'
              ? (isAr()
                  ? `🚚 الكابتن ${data.dispatch?.driver_name || ''} استلم السلعة وسلّم الكاش للبائع، وهو في طريقه إليك للمعاينة!`
                  : `🚚 Captain ${data.dispatch?.driver_name || ''} picked up the item & paid the seller cash — heading to you for inspection!`)
              : (isAr()
                  ? `🚚 الكابتن في نطاق ${translateDistrict(deliveryDistrictRaw)} ومعه السلعة للمعاينة والتجربة قبل الدفع!`
                  : `🚚 Captain is approaching ${translateDistrict(deliveryDistrictRaw)} for your hands-on inspection!`);
        }
      } else {
        hideEl(notifBanner);
      }
    }

    const stepper = document.getElementById('trackStepper');
    if (stepper) {
      const driverName = data.dispatch?.driver_name || (isAr() ? 'جاري التعيين' : 'Assigning');
      const driverPhone = data.dispatch?.driver_phone || '';
      const cashAmt = formatEGP(liveData?.payout_cash ?? data.dispatch?.payout_cash ?? data.item?.recommended_purchase_price ?? 0);
      const stepNodes = [
        {
          num: '1',
          title: isAr() ? 'تم قبول العرض وتثبيت السعر القطعي' : 'Fixed Price Locked & Order Confirmed',
          desc: isAr() ? 'تم تأكيد الطلب وحجز السلعة وتثبيت عمولة المنصة بدون فصال.' : 'Order confirmed and fixed price locked without haggling.',
          time: data.deal?.created_at ? String(data.deal.created_at).replace('T', ' ').slice(0, 16) : (isAr() ? 'مؤكد' : 'Confirmed')
        },
        {
          num: '2',
          title: isAr() ? 'تم تعيين كابتن الاستلام والتوصيل' : 'Pickup & Inspection Captain Assigned',
          desc: isAr()
            ? `تم إسناد المهمة للكابتن ${driverName} لتغطية ${translateDistrict(pickupDistrictRaw)}.`
            : `Assigned to Captain ${driverName} covering ${translateDistrict(pickupDistrictRaw)}.`,
          time: driverPhone ? `${isAr() ? 'هاتف:' : 'Phone:'} ${driverPhone}` : ''
        },
        {
          num: '3',
          title: isAr() ? 'الكابتن استلم السلعة وسلّم الكاش للبائع' : 'Item Picked Up & Seller Paid Cash',
          desc: isAr() ? `تم فحص السلعة وتسليم ${cashAmt} كاش فوري للبائع.` : `Initial inspection passed; ${cashAmt} paid in cash to seller.`,
          time: isAr() ? 'إشعار فوري للمشتري 🔔' : 'Instant buyer alert 🔔'
        },
        {
          num: '4',
          title: isAr() ? 'المندوب في الطريق للمعاينة والتجربة' : 'Out for Buyer Inspection',
          desc: isAr()
            ? `يتوجه الكابتن إلى: ${deliveryAddress} مع حق المعاينة الكاملة.`
            : `En route to: ${deliveryAddress} for full hands-on inspection.`,
          time: isAr() ? 'تتبع مباشر عبر الـ GPS 📡' : 'Live GPS tracking 📡'
        },
        {
          num: '5',
          title: isAr() ? 'تمت المعاينة بنجاح وإتمام الصفقة' : 'Inspection Passed & Deal Settled',
          desc: isAr() ? 'استلم المشتري السلعة وتم تحصيل المبلغ بدون فصال.' : 'Buyer verified item and settled payment cleanly.',
          time: isCompleted ? (isAr() ? 'تم الإغلاق بنجاح ✓' : 'Settled ✓') : (isAr() ? 'بانتظار المعاينة' : 'Awaiting inspection')
        }
      ];

      stepper.innerHTML = stepNodes
        .map((s, idx) => {
          const isDone = idx < currentIndex || (idx === currentIndex && isCompleted);
          const isActive = idx === currentIndex && !isCompleted;
          const statusClass = isDone ? 'completed' : isActive ? 'active' : '';
          return `
            <div class="step-node ${statusClass}">
              <div class="step-circle">${isDone ? '✓' : formatNum(s.num)}</div>
              <div class="step-content">
                <div class="step-title">${escapeHTML(s.title)}</div>
                <div class="step-desc">${escapeHTML(s.desc)}</div>
                <div class="step-time">${escapeHTML(s.time)}</div>
              </div>
            </div>`;
        })
        .join('');
    }

    const driverObj = liveData?.driver || data.dispatch || {};
    const driverPhone = driverObj.phone || data.dispatch?.driver_phone || '';
    const driverName = driverObj.name || data.dispatch?.driver_name || (isAr() ? 'كابتن معتمد' : 'Verified Captain');

    document.getElementById('trackDriverName').textContent = driverName;
    document.getElementById('trackDriverPhone').textContent = driverPhone || '—';
    document.getElementById('trackDriverDistrict').textContent = translateDistrict(deliveryDistrictRaw);
    document.getElementById('trackAddress').textContent = deliveryAddress;
    document.getElementById('trackPayoutCash').textContent = formatEGP(
      data.deal?.agreed_price ?? liveData?.payout_cash ?? data.dispatch?.payout_cash ?? 0
    );

    const btnCall = document.getElementById('btnCallDriver');
    if (btnCall) {
      const cleanTel = String(driverPhone).replace(/[^\d+]/g, '');
      btnCall.href = cleanTel ? `tel:${cleanTel}` : '#tracking';
    }
    const btnWa = document.getElementById('btnWhatsAppDriver');
    if (btnWa) {
      const waDigits = normalizeWaPhone(driverPhone);
      const msg = encodeURIComponent(
        isAr()
          ? `أهلاً كابتن ${driverName}، أتابع الشحنة رقم ${data.deal?.id || data.dispatch?.id || query} عبر منصة آنتي فصال.`
          : `Hello Captain ${driverName}, following up on order ${data.deal?.id || data.dispatch?.id || query} via Anti-Fesal.`
      );
      btnWa.href = waDigits ? `https://wa.me/${waDigits}?text=${msg}` : '#tracking';
    }

    if (data.item) {
      document.getElementById('trackItemTitle').textContent = data.item.title || '—';
      const gradeRaw = String(data.item.condition_grade || 'A').toUpperCase();
      const gradeBadge = document.getElementById('trackItemGrade');
      if (gradeBadge) {
        gradeBadge.className = `grade-badge grade-${gradeRaw.toLowerCase()}`;
        gradeBadge.textContent = `✓ Grade ${gradeRaw}`;
      }
      document.getElementById('trackItemPrice').textContent = formatEGP(data.item.expected_resale_price);
    }

    loadInspectionChecklist(state.activeDispatchId);

    const eta = liveData?.eta_minutes ?? liveData?.calculated_eta_mins ?? (isCompleted ? 0 : 14);
    const etaBadge = document.getElementById('trackEtaBadge');
    if (etaBadge) {
      etaBadge.textContent = isCompleted
        ? (isAr() ? '✓ تم الوصول والتسليم' : '✓ Delivered & Settled')
        : (isAr() ? `⏳ الوقت المتوقع للوصول: ${formatNum(eta)} دقيقة` : `⏳ Estimated Arrival: ${formatNum(eta)} mins`);
    }

    const legSeller = document.getElementById('mapLegendSeller');
    const legBuyer = document.getElementById('mapLegendBuyer');
    const legDriver = document.getElementById('mapLegendDriver');
    if (legSeller) legSeller.textContent = translateDistrict(pickupDistrictRaw);
    if (legBuyer) legBuyer.textContent = translateDistrict(deliveryDistrictRaw);
    if (legDriver) {
      legDriver.textContent = `${driverName} (${liveData?.gps_live ? (isAr() ? 'بث GPS مباشر' : 'Live GPS') : (isAr() ? 'على خط السير' : 'En route')})`;
    }

    renderLiveTrackingMap(
      liveData?.pickup_coords || { lat: 31.1965, lng: 29.9052 },
      liveData?.delivery_coords || { lat: 31.2652, lng: 30.0051 },
      liveData?.driver_coords || { lat: 31.225, lng: 29.955 },
      { pickupDistrict: pickupDistrictRaw, deliveryDistrict: deliveryDistrictRaw, driverName, eta }
    );

    startTrackingPolling();
  } catch (err) {
    stopTrackingPolling();
    if (!options.silent) {
      showToast(isAr() ? 'لم يتم العثور على الشحنة' : 'Order Not Found', err.message, 'warning');
    }
  }
}

function renderLiveTrackingMap(pickupCoords, deliveryCoords, driverCoords, meta = {}) {
  const mapEl = document.getElementById('liveTrackingMap');
  const fallbackCard = document.getElementById('mapFallbackCard');
  const fallbackText = document.getElementById('mapFallbackRouteText');
  if (!mapEl) return;

  const pDist = translateDistrict(meta.pickupDistrict);
  const dDist = translateDistrict(meta.deliveryDistrict);

  if (typeof L === 'undefined') {
    hideEl(mapEl);
    showEl(fallbackCard);
    if (fallbackText) {
      fallbackText.textContent = isAr()
        ? `مسار الشحنة التقريبي بالإسكندرية: من ${pDist} إلى ${dDist} مع ${meta.driverName || 'الكابتن'} (متبقي ~${formatNum(meta.eta || 0)} دقيقة).`
        : `Alexandria route overview: from ${pDist} to ${dDist} with ${meta.driverName || 'Captain'} (~${formatNum(meta.eta || 0)} mins remaining).`;
    }
    return;
  }

  showEl(mapEl);
  hideEl(fallbackCard);

  const sellerLoc = pickupCoords?.lat ? [pickupCoords.lat, pickupCoords.lng] : [31.1965, 29.9052];
  const buyerLoc = deliveryCoords?.lat ? [deliveryCoords.lat, deliveryCoords.lng] : [31.2652, 30.0051];
  const driverLoc = driverCoords?.lat
    ? [driverCoords.lat, driverCoords.lng]
    : [(sellerLoc[0] + buyerLoc[0]) / 2, (sellerLoc[1] + buyerLoc[1]) / 2];

  const sellerPopup = isAr()
    ? `<b>🏪 نقطة الاستلام (البائع)</b><br>${escapeHTML(pDist)}`
    : `<b>🏪 Pickup Point (Seller)</b><br>${escapeHTML(pDist)}`;
  const driverPopup = isAr()
    ? `<b>🚚 موقع الكابتن المباشر</b><br>${escapeHTML(meta.driverName || 'الكابتن')}`
    : `<b>🚚 Live Captain Location</b><br>${escapeHTML(meta.driverName || 'Captain')}`;
  const buyerPopup = isAr()
    ? `<b>🏠 عنوان المعاينة (المشتري)</b><br>${escapeHTML(dDist)}`
    : `<b>🏠 Inspection Address (Buyer)</b><br>${escapeHTML(dDist)}`;

  if (!trackingMapInstance) {
    trackingMapInstance = L.map('liveTrackingMap').setView(driverLoc, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap | Anti-Fesal Alexandria'
    }).addTo(trackingMapInstance);

    const makeIcon = (emoji) =>
      L.divIcon({
        html: `<span>${emoji}</span>`,
        className: 'map-custom-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

    trackingMarkers.seller = L.marker(sellerLoc, { icon: makeIcon('🏪') }).addTo(trackingMapInstance);
    trackingMarkers.driver = L.marker(driverLoc, { icon: makeIcon('🚚') }).addTo(trackingMapInstance);
    trackingMarkers.buyer = L.marker(buyerLoc, { icon: makeIcon('🏠') }).addTo(trackingMapInstance);

    trackingPolyline = L.polyline([sellerLoc, driverLoc, buyerLoc], {
      color: '#E00000',
      weight: 3,
      dashArray: '6, 8',
      opacity: 0.85
    }).addTo(trackingMapInstance);
  } else {
    // Smooth marker update without tearing down map tiles
    trackingMarkers.seller?.setLatLng(sellerLoc);
    trackingMarkers.driver?.setLatLng(driverLoc);
    trackingMarkers.buyer?.setLatLng(buyerLoc);
    trackingPolyline?.setLatLngs([sellerLoc, driverLoc, buyerLoc]);
  }

  trackingMarkers.seller?.bindPopup(sellerPopup);
  trackingMarkers.driver?.bindPopup(driverPopup);
  trackingMarkers.buyer?.bindPopup(buyerPopup);

  // invalidateSize MUST run BEFORE fitBounds after container becomes visible
  requestAnimationFrame(() => {
    if (!trackingMapInstance) return;
    try {
      trackingMapInstance.invalidateSize();
      const group = L.featureGroup([trackingMarkers.seller, trackingMarkers.driver, trackingMarkers.buyer].filter(Boolean));
      trackingMapInstance.fitBounds(group.getBounds().pad(0.22));
    } catch {
      // Safe fallback if container has 0 dimensions
    }
  });
}

function refreshLiveTrackingMap() {
  const query = document.getElementById('trackingQueryInput')?.value.trim() || state.activeTrackingQuery;
  if (query) {
    trackOrder(query);
    showToast(
      isAr() ? 'تحديث الخريطة' : 'Map Refreshed',
      isAr() ? 'تم تحديث إحداثيات ومسار الكابتن بنجاح 🔄' : 'Captain coordinates and ETA refreshed 🔄',
      'info'
    );
  }
}

// ==================== AUTH, SESSION & PORTAL GATES ====================
function updateHeaderUserDisplay() {
  const avatarEl = document.getElementById('headerAvatarMini');
  const labelEl = document.getElementById('txtHeaderAccountLabel');
  const btnAcc = document.getElementById('btnHeaderAccount');

  if (state.currentUser && state.authToken) {
    const name = String(state.currentUser.name || 'User').trim();
    const initials = state.currentUser.avatar || name.slice(0, 2).toUpperCase();
    const firstName = name.split(/\s+/)[0];
    if (avatarEl) avatarEl.textContent = initials;
    if (labelEl) labelEl.textContent = firstName;
    if (btnAcc) btnAcc.title = isAr() ? `حساب: ${name}` : `Account: ${name}`;
  } else {
    if (avatarEl) avatarEl.textContent = '👤';
    if (labelEl) labelEl.textContent = tKey('signInLabel');
    if (btnAcc) btnAcc.title = tKey('signInLabel');
  }
}

function openAuthModal(mode = 'login') {
  switchAuthTab(mode);
  openModal('modalAuth');
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tabBtnLogin');
  const tabRegister = document.getElementById('tabBtnRegister');
  const groupFullName = document.getElementById('groupFullName');
  const fullNameInput = document.getElementById('authFullName');
  const passwordInput = document.getElementById('authPassword');
  const heading = document.getElementById('authModalHeading');
  const submitText = document.getElementById('authSubmitText');
  const isReg = tab === 'register';

  if (tabLogin) {
    tabLogin.classList.toggle('active', !isReg);
    tabLogin.setAttribute('aria-selected', isReg ? 'false' : 'true');
  }
  if (tabRegister) {
    tabRegister.classList.toggle('active', isReg);
    tabRegister.setAttribute('aria-selected', isReg ? 'true' : 'false');
  }
  if (groupFullName) {
    if (isReg) showEl(groupFullName);
    else hideEl(groupFullName);
  }
  if (fullNameInput) fullNameInput.required = isReg;
  if (passwordInput) passwordInput.autocomplete = isReg ? 'new-password' : 'current-password';
  if (heading) heading.textContent = isReg ? tKey('authHeadingRegister') : tKey('authHeadingLogin');
  if (submitText) submitText.textContent = isReg ? tKey('authSubmitRegister') : tKey('authSubmitLogin');
}

function togglePasswordVisibility(btnEl) {
  const targetId = btnEl.dataset.target || 'authPassword';
  const input = document.getElementById(targetId);
  if (!input) return;
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btnEl.setAttribute('aria-pressed', showing ? 'false' : 'true');
  btnEl.textContent = showing ? '👁️' : '🙈';
}

function persistUserSession(token, user) {
  state.authToken = token || '';
  state.currentUser = user || null;
  state.currentRole = user?.role || 'buyer';
  if (state.authToken) {
    localStorage.setItem(STORAGE_KEYS.token, state.authToken);
  } else {
    localStorage.removeItem(STORAGE_KEYS.token);
  }
  if (state.currentUser) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.currentUser));
  } else {
    localStorage.removeItem(STORAGE_KEYS.user);
  }
  updateHeaderUserDisplay();
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const isRegister = document.getElementById('tabBtnRegister')?.classList.contains('active');
  const emailOrUser = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const submitBtn = document.getElementById('btnAuthSubmit');

  if (isRegister && password.length < 4) {
    showToast(
      isAr() ? 'كلمة مرور قصيرة' : 'Weak Password',
      isAr() ? 'يجب أن تكون كلمة المرور 4 أحرف على الأقل' : 'Password must be at least 4 characters',
      'warning'
    );
    return;
  }

  const restore = setButtonLoading(submitBtn, isAr() ? 'جاري التحقق...' : 'Authenticating...');
  try {
    let res;
    if (isRegister) {
      const fullName = document.getElementById('authFullName').value.trim();
      const cleanUsername = emailOrUser.includes('@') ? emailOrUser.split('@')[0] : emailOrUser;
      const cleanEmail = emailOrUser.includes('@') ? emailOrUser : `${cleanUsername}@antifesal.eg`;
      const district = state.selectedDistrict && state.selectedDistrict !== 'All' ? state.selectedDistrict : 'Sidi Beshr';

      res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: fullName,
          username: cleanUsername,
          email: cleanEmail,
          password,
          district,
          phone: '01000000000'
        })
      });
      persistUserSession(res.token, res.user);
      showToast(
        isAr() ? 'أهلاً بك في آنتي فصال!' : 'Welcome to Anti-Fesal!',
        isAr() ? 'تم إنشاء حسابك بنجاح ✓' : 'Your account has been created ✓',
        'success'
      );
    } else {
      res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          login_type: 'standard',
          username_or_email: emailOrUser,
          password
        })
      });
      persistUserSession(res.token, res.user);
      showToast(
        isAr() ? 'تم تسجيل الدخول بنجاح!' : 'Signed In!',
        isAr() ? `مرحباً بك، ${res.user.name}` : `Welcome back, ${res.user.name}`,
        'success'
      );
    }

    document.getElementById('authForm')?.reset();
    closeModal('modalAuth');
    checkUserApplicationStatus();

    const nextView = state.pendingViewAfterAuth || 'account';
    state.pendingViewAfterAuth = null;
    switchPortalView(nextView);
  } catch (err) {
    showToast(isAr() ? 'خطأ في الدخول' : 'Authentication Failed', err.message, 'error');
  } finally {
    restore();
  }
}

async function handleGoogleLogin(btnEl) {
  const restore = setButtonLoading(btnEl, isAr() ? 'جاري الدخول...' : 'Signing in...');
  try {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login_type: 'google' })
    });
    persistUserSession(res.token, res.user);
    closeModal('modalAuth');
    showToast(
      isAr() ? 'تم الدخول بحساب Google!' : 'Signed In with Google!',
      isAr() ? `مرحباً بك ${res.user.name}` : `Welcome, ${res.user.name}`,
      'success'
    );
    checkUserApplicationStatus();
    const nextView = state.pendingViewAfterAuth || 'account';
    state.pendingViewAfterAuth = null;
    switchPortalView(nextView);
  } catch (err) {
    showToast(isAr() ? 'خطأ في الدخول' : 'Google Sign-In Failed', err.message, 'error');
  } finally {
    restore();
  }
}

function logoutUser() {
  openConfirmModal({
    title: isAr() ? 'تسجيل الخروج' : 'Sign Out',
    message: isAr() ? 'هل تريد تسجيل الخروج من حسابك وإغلاق الجلسات النشطة؟' : 'Are you sure you want to sign out and clear active sessions?',
    confirmLabel: tKey('account.logout'),
    onConfirm: () => {
      stopDriverGpsWatch(true);
      persistUserSession('', null);
      state.captainToken = '';
      state.adminToken = '';
      state.captainUnlocked = false;
      state.adminUnlocked = false;
      state.pendingViewAfterAuth = null;
      resetCaptainGateDom();
      resetAdminGateDom();
      clearAccountDomToGuest();
      showToast(
        isAr() ? 'تم تسجيل الخروج' : 'Signed Out',
        isAr() ? 'نراك قريباً في آنتي فصال 👋' : 'See you soon on Anti-Fesal 👋',
        'info'
      );
      switchPortalView('showroom');
    }
  });
}

// ==================== CAPTAIN PORTAL GATE & LIVE GPS ====================
async function checkCaptainPin() {
  const pinInput = document.getElementById('captainPinInput');
  const errEl = document.getElementById('captainPinError');
  const btn = document.getElementById('btnCaptainUnlock');
  const pin = (pinInput ? pinInput.value : '').trim();
  if (!pin) return;

  hideEl(errEl);
  const restore = setButtonLoading(btn, isAr() ? 'جاري التحقق...' : 'Verifying...');
  try {
    const res = await apiRequest('/api/auth/gate', {
      method: 'POST',
      body: JSON.stringify({ portal: 'captain', pin })
    });
    state.captainToken = res.token;
    state.captainUnlocked = true;
    hideEl(document.getElementById('captainGate'));
    showEl(document.getElementById('captainWorkspace'));
    if (pinInput) pinInput.value = '';
    loadCaptainDeliveryTasks();
    showToast(
      isAr() ? 'أهلاً يا كابتن!' : 'Welcome Captain!',
      isAr() ? 'تم فتح بوابة كباتن التوصيل بالإسكندرية' : 'Captain delivery portal unlocked',
      'success'
    );
  } catch (err) {
    if (errEl) {
      errEl.textContent = isAr()
        ? 'رمز الدخول غير صحيح. يرجى مراجعة المشرف.'
        : 'Invalid Captain PIN. Please verify your credentials.';
      showEl(errEl);
    }
    showToast(isAr() ? 'فشل التحقق' : 'Access Denied', err.message, 'error');
  } finally {
    restore();
  }
}

function resetCaptainGateDom() {
  showEl(document.getElementById('captainGate'));
  hideEl(document.getElementById('captainWorkspace'));
  hideEl(document.getElementById('captainPinError'));
  const pinInput = document.getElementById('captainPinInput');
  if (pinInput) pinInput.value = '';
  const tbody = document.getElementById('tbodyCaptainTasks');
  if (tbody) tbody.innerHTML = '';
}

function confirmLockCaptainGate() {
  openConfirmModal({
    title: isAr() ? 'قفل بوابة الكابتن' : 'Lock Captain Portal',
    message: isAr() ? 'سيتم إيقاف بث الـ GPS وقفل الجلسة الحالية. هل تريد المتابعة؟' : 'This will stop GPS broadcasting and lock the Captain session. Continue?',
    confirmLabel: tKey('captain.lockGate'),
    onConfirm: () => {
      stopDriverGpsWatch(true);
      state.captainUnlocked = false;
      state.captainToken = '';
      resetCaptainGateDom();
      showToast(isAr() ? 'تم قفل البوابة' : 'Portal Locked', isAr() ? 'تم قفل جلسة الكابتن بأمان 🔒' : 'Captain session locked 🔒', 'info');
    }
  });
}

async function loadCaptainDeliveryTasks() {
  const tbody = document.getElementById('tbodyCaptainTasks');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9"><div class="skeleton-line"></div></td></tr>`;

  try {
    const res = await apiRequest('/api/dispatches', { token: state.captainToken });
    const dispatches = Array.isArray(res) ? res : (res.dispatches || []);

    if (dispatches.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-inline-msg">${escapeHTML(
        isAr() ? 'لا توجد مهمات استلام نشطة حالياً. أنت متفرغ!' : 'No active delivery tasks right now.'
      )}</td></tr>`;
      return;
    }

    tbody.innerHTML = dispatches
      .map((d) => {
        const step = d.current_step || 'ORDER_PLACED';
        const safeId = escapeHTML(d.id);
        let actionHtml = '';
        if (step === 'ORDER_PLACED' || step === 'DRIVER_ASSIGNED') {
          actionHtml = `<button type="button" class="btn-table-action btn-table-approve" data-action="advance-step" data-id="${safeId}" data-step="PICKED_UP">${escapeHTML(
            isAr() ? 'استلمت من البائع وسلّمت الكاش 📦' : 'Picked Up & Paid Cash 📦'
          )}</button>`;
        } else if (step === 'PICKED_UP') {
          actionHtml = `<button type="button" class="btn-table-action btn-table-adjust" data-action="advance-step" data-id="${safeId}" data-step="OUT_FOR_DELIVERY">${escapeHTML(
            isAr() ? 'خرجت للمعاينة عند المشتري 🚚' : 'Out for Inspection 🚚'
          )}</button>`;
        } else if (step === 'OUT_FOR_DELIVERY') {
          actionHtml = `<button type="button" class="btn-table-action btn-table-approve" data-action="advance-step" data-id="${safeId}" data-step="DELIVERED_SETTLED">${escapeHTML(
            isAr() ? 'تمت المعاينة وتسليم الكاش ✓' : 'Mark Delivered & Settled ✓'
          )}</button>`;
        } else {
          actionHtml = `<span class="receipt-status-pill auto-approved">${escapeHTML(isAr() ? 'مكتملة ومسلّمة ✓' : 'Settled ✓')}</span>`;
        }

        return `
          <tr>
            <td><strong class="mono-num">#${safeId}</strong></td>
            <td class="mono-num">${d.item_id ? `#${escapeHTML(d.item_id)}` : '—'}</td>
            <td><strong>${escapeHTML(translateDistrict(d.district))}</strong></td>
            <td class="text-muted-sm">${escapeHTML(d.delivery_address || d.pickup_address || '—')}</td>
            <td>${escapeHTML(d.driver_name || (isAr() ? 'الكابتن' : 'Captain'))}</td>
            <td class="mono-num">${escapeHTML(d.driver_phone || '—')}</td>
            <td class="text-emerald tabular-num"><strong>${escapeHTML(formatEGP(d.payout_cash || d.cash_amount || 0))}</strong></td>
            <td><span class="status-pill status-${escapeHTML(String(d.status || 'PENDING').toLowerCase())}">${escapeHTML(d.status || 'PENDING')}</span></td>
            <td>${actionHtml}</td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    showToast(isAr() ? 'فشل تحميل المهام' : 'Captain Tasks Error', err.message, 'error');
    tbody.innerHTML = `<tr><td colspan="9" class="empty-inline-msg text-crimson">${escapeHTML(err.message)}</td></tr>`;
  }
}

async function advanceDispatchStep(dispatchId, nextStep, btnEl) {
  const restore = setButtonLoading(btnEl, isAr() ? 'جاري التحديث...' : 'Updating...');
  try {
    const res = await apiRequest(`/api/dispatches/${encodeURIComponent(dispatchId)}/step`, {
      method: 'POST',
      token: state.captainToken,
      body: JSON.stringify({ step: nextStep })
    });
    showToast(
      isAr() ? 'تم تحديث خط السير' : 'Step Updated',
      res.step_message || `${dispatchId} -> ${nextStep}`,
      'success'
    );
    loadCaptainDeliveryTasks();
  } catch (err) {
    showToast(isAr() ? 'خطأ في تحديث المرحلة' : 'Step Update Failed', err.message, 'error');
  } finally {
    restore();
  }
}

let driverLocationWatchId = null;
let lastGpsPostTimestamp = 0;

function updateDriverGpsStatusUi(active) {
  const badge = document.getElementById('driverGpsBadge');
  const btn = document.getElementById('btnToggleDriverGps');
  if (badge) {
    badge.textContent = active ? tKey('captain.gpsOn') : tKey('captain.gpsOff');
    badge.className = `status-pill ${active ? 'status-active' : 'status-pending'}`;
  }
  if (btn) {
    const span = btn.querySelector('span');
    const txt = active ? tKey('captain.gpsStopBtn') : tKey('captain.gpsToggleBtn');
    if (span) span.textContent = txt;
    else btn.textContent = txt;
  }
}

function stopDriverGpsWatch(silent = false) {
  if (driverLocationWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(driverLocationWatchId);
    driverLocationWatchId = null;
  }
  lastGpsPostTimestamp = 0;
  updateDriverGpsStatusUi(false);
  if (!silent) {
    showToast(
      isAr() ? 'تم إيقاف مشاركة الموقع' : 'GPS Stopped',
      isAr() ? 'تم إيقاف بث إحداثيات الـ GPS' : 'Live GPS location broadcast stopped',
      'info'
    );
  }
}

function toggleDriverGpsSharing() {
  if (driverLocationWatchId !== null) {
    stopDriverGpsWatch(false);
    return;
  }

  if (!navigator.geolocation) {
    showToast(
      isAr() ? 'خطأ في المتصفح' : 'Geolocation Unsupported',
      isAr() ? 'متصفحك لا يدعم تحديد الموقع الجغرافي' : 'Your browser does not support Geolocation',
      'error'
    );
    return;
  }

  const btn = document.getElementById('btnToggleDriverGps');
  const span = btn?.querySelector('span');
  if (span) span.textContent = isAr() ? '⏳ جاري الاتصال بالـ GPS...' : '⏳ Connecting to GPS...';

  let firstSuccessNotified = false;
  driverLocationWatchId = navigator.geolocation.watchPosition(
    async (pos) => {
      updateDriverGpsStatusUi(true);
      if (!firstSuccessNotified) {
        firstSuccessNotified = true;
        showToast(
          isAr() ? 'تم تفعيل الـ GPS' : 'Live GPS Active',
          isAr() ? 'يتم الآن بث إحداثياتك المباشرة للمشتري والإدارة 🛰️' : 'Streaming live coordinates to buyer & dispatch desk 🛰️',
          'success'
        );
      }

      const now = Date.now();
      if (now - lastGpsPostTimestamp < 4000) return;
      lastGpsPostTimestamp = now;

      const driverId = state.currentUser?.id || 'DRV-101';
      const driverName = state.currentUser?.name || 'كابتن أحمد الإسكندراني';
      try {
        await apiRequest('/api/driver/location', {
          method: 'POST',
          token: state.captainToken,
          body: JSON.stringify({
            driver_id: driverId,
            driver_name: driverName,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading || 0.0,
            sharing_enabled: true
          })
        });
      } catch (err) {
        showToast(isAr() ? 'خطأ في إرسال الموقع' : 'GPS Sync Error', err.message, 'warning');
      }
    },
    (err) => {
      stopDriverGpsWatch(true);
      showToast(
        isAr() ? 'تعذر الوصول للموقع' : 'Location Unavailable',
        (isAr() ? 'يرجى السماح بالوصول للموقع: ' : 'Please allow location permission: ') + err.message,
        'warning'
      );
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
  );
}

// ==================== ADMIN MASTER PORTAL ====================
async function checkAdminPin() {
  const pinInput = document.getElementById('adminPinInput');
  const errEl = document.getElementById('adminPinError');
  const btn = document.getElementById('btnAdminUnlock');
  const pin = (pinInput ? pinInput.value : '').trim();
  if (!pin) return;

  hideEl(errEl);
  const restore = setButtonLoading(btn, isAr() ? 'جاري التحقق...' : 'Verifying...');
  try {
    const res = await apiRequest('/api/auth/gate', {
      method: 'POST',
      body: JSON.stringify({ portal: 'admin', pin })
    });
    state.adminToken = res.token;
    state.adminUnlocked = true;
    hideEl(document.getElementById('adminGate'));
    showEl(document.getElementById('adminWorkspace'));
    if (pinInput) pinInput.value = '';
    loadAdminDashboard();
    showToast(
      isAr() ? 'مرحباً بالإدارة المركزية' : 'Admin Console Unlocked',
      isAr() ? 'تم فتح لوحة الإدارة المركزية 🛡️' : 'Central administration session active 🛡️',
      'success'
    );
  } catch (err) {
    if (errEl) {
      errEl.textContent = isAr()
        ? 'رمز الدخول الإداري غير صحيح.'
        : 'Invalid Admin PIN. Please try again.';
      showEl(errEl);
    }
    showToast(isAr() ? 'فشل التحقق' : 'Access Denied', err.message, 'error');
  } finally {
    restore();
  }
}

function resetAdminGateDom() {
  showEl(document.getElementById('adminGate'));
  hideEl(document.getElementById('adminWorkspace'));
  hideEl(document.getElementById('adminPinError'));
  const pinInput = document.getElementById('adminPinInput');
  if (pinInput) pinInput.value = '';
}

function confirmLockAdminGate() {
  openConfirmModal({
    title: isAr() ? 'قفل لوحة الإدارة' : 'Lock Admin Console',
    message: isAr() ? 'هل تريد إنهاء جلسة الإدارة وقفل اللوحة؟' : 'End the current Admin session and lock the console?',
    confirmLabel: tKey('admin.lockGate'),
    onConfirm: () => {
      state.adminUnlocked = false;
      state.adminToken = '';
      resetAdminGateDom();
      showToast(isAr() ? 'تم قفل لوحة الإدارة' : 'Admin Locked', isAr() ? 'تم تأمين جلسة الإدارة 🔒' : 'Admin console locked 🔒', 'info');
    }
  });
}

function loadAdminDashboard() {
  loadAdminAnalytics();
  loadAdminFinancials();
  loadAdminApplications();
  loadAdminUsers();
  loadAdminDrivers();
}

async function loadAdminAnalytics() {
  const catBox = document.getElementById('admTopCategoriesList');
  const distBox = document.getElementById('admTopDistrictsList');
  if (catBox) catBox.innerHTML = `<div class="skeleton-line"></div><div class="skeleton-line"></div>`;
  if (distBox) distBox.innerHTML = `<div class="skeleton-line"></div><div class="skeleton-line"></div>`;

  try {
    const data = await apiRequest('/api/admin/analytics', { token: state.adminToken });

    const elSold = document.getElementById('admOrdersSoldCount');
    const elGmv = document.getElementById('admTotalGmv');
    const elRev = document.getElementById('admNetRevenue');
    const elPayouts = document.getElementById('admDriverPayouts');
    const badgePending = document.getElementById('badgePendingApps');

    if (elSold) elSold.textContent = formatNum(data.orders_sold_count ?? data.total_orders_sold ?? 0);
    if (elGmv) elGmv.textContent = formatEGP(data.financials?.gmv ?? data.total_gmv ?? 0);
    if (elRev) elRev.textContent = formatEGP(data.financials?.platform_net_commission ?? data.platform_net_commission ?? 0);
    if (elPayouts) elPayouts.textContent = formatEGP(data.financials?.driver_payouts ?? data.driver_cash_payouts ?? 0);
    if (badgePending && data.pending_applications_count !== undefined) {
      badgePending.textContent = formatNum(data.pending_applications_count);
    }

    if (catBox) {
      const cats = Array.isArray(data.top_categories) ? data.top_categories : [];
      if (cats.length === 0) {
        catBox.innerHTML = `<div class="empty-inline-msg">${escapeHTML(
          isAr() ? 'لا توجد مبيعات مسجلة حتى الآن.' : 'No sales recorded yet.'
        )}</div>`;
      } else {
        const colors = ['bar-fill-crimson', 'bar-fill-emerald', 'bar-fill-blue', 'bar-fill-amber'];
        catBox.innerHTML = cats
          .map((c, i) => {
            const pct = Number(c.percentage ?? c.pct ?? 0);
            return `
              <div class="breakdown-row">
                <div class="breakdown-header">
                  <span>🏷️ ${escapeHTML(translateCategory(c.category))}</span>
                  <span class="tabular-num"><strong>${formatNum(c.count)}</strong> ${escapeHTML(
                    isAr() ? 'صفقة' : 'deals'
                  )} (${formatNum(pct)}%)</span>
                </div>
                <div class="breakdown-bar-track">
                  <div class="breakdown-bar-fill ${colors[i % colors.length]}" data-pct="${Math.max(5, Math.min(100, pct))}"></div>
                </div>
              </div>`;
          })
          .join('');
        catBox.querySelectorAll('.breakdown-bar-fill').forEach((bar) => {
          bar.style.width = `${bar.dataset.pct || 5}%`;
        });
      }
    }

    if (distBox) {
      const locs = Array.isArray(data.top_locations) ? data.top_locations : (data.top_districts || []);
      if (locs.length === 0) {
        distBox.innerHTML = `<div class="empty-inline-msg">${escapeHTML(
          isAr() ? 'لا توجد بيانات أحياء مسجلة.' : 'No district order data recorded yet.'
        )}</div>`;
      } else {
        const maxCount = Math.max(...locs.map((d) => Number(d.orders_count ?? d.count ?? 0)), 1);
        distBox.innerHTML = locs
          .map((d, i) => {
            const cnt = Number(d.orders_count ?? d.count ?? 0);
            const pct = Math.round((cnt / maxCount) * 100);
            return `
              <div class="breakdown-row">
                <div class="breakdown-header">
                  <span>📍 <strong>${formatNum(i + 1)}. ${escapeHTML(translateDistrict(d.district))}</strong></span>
                  <span class="tabular-num"><strong>${formatNum(cnt)}</strong> ${escapeHTML(
                    isAr() ? 'طلب' : 'orders'
                  )}</span>
                </div>
                <div class="breakdown-bar-track">
                  <div class="breakdown-bar-fill bar-fill-emerald" data-pct="${Math.max(8, pct)}"></div>
                </div>
              </div>`;
          })
          .join('');
        distBox.querySelectorAll('.breakdown-bar-fill').forEach((bar) => {
          bar.style.width = `${bar.dataset.pct || 8}%`;
        });
      }
    }
  } catch (err) {
    showToast(isAr() ? 'خطأ في تحليلات الإدارة' : 'Analytics Load Failed', err.message, 'error');
  }
}

async function loadAdminFinancials() {
  const chartBox = document.getElementById('admBarChart');
  if (chartBox) chartBox.innerHTML = `<div class="skeleton-line"></div>`;

  try {
    const data = await apiRequest('/api/admin/financials', { token: state.adminToken });
    const elSold = document.getElementById('admOrdersSoldCount');
    const elGmv = document.getElementById('admTotalGmv');
    const elRev = document.getElementById('admNetRevenue');
    const elPayouts = document.getElementById('admDriverPayouts');

    if (elGmv) elGmv.textContent = formatEGP(data.total_gmv || 0);
    if (elRev) elRev.textContent = formatEGP(data.platform_net_commission || 0);
    if (elPayouts) elPayouts.textContent = formatEGP(data.driver_cash_payouts || 0);
    if (elSold && data.total_deals_count !== undefined) {
      elSold.textContent = formatNum(data.total_deals_count);
    }

    renderAdminFinancialsGraph(data.time_series || []);
  } catch (err) {
    showToast(isAr() ? 'خطأ في البيانات المالية' : 'Financials Load Failed', err.message, 'error');
    if (chartBox) chartBox.innerHTML = `<div class="empty-inline-msg text-crimson">${escapeHTML(err.message)}</div>`;
  }
}

function renderAdminFinancialsGraph(series) {
  const chartBox = document.getElementById('admBarChart');
  if (!chartBox) return;

  if (!Array.isArray(series) || series.length === 0) {
    chartBox.innerHTML = `<div class="empty-inline-msg">${escapeHTML(
      isAr() ? 'لا توجد بيانات حركة مالية مسجلة بعد.' : 'No financial time-series data yet.'
    )}</div>`;
    return;
  }

  const maxVal = Math.max(...series.map((s) => Number(s.gmv || 0)), 1000);
  chartBox.innerHTML = series
    .map((pt) => {
      const gmv = Number(pt.gmv || 0);
      const heightPct = Math.max(12, Math.round((gmv / maxVal) * 100));
      const dayLabel = pt.day || (pt.date ? String(pt.date).slice(5) : '—');
      return `
        <div class="chart-col">
          <div class="chart-col-val tabular-num">${escapeHTML(formatEGP(gmv))}</div>
          <div class="chart-bar" data-height="${heightPct}"></div>
          <div class="chart-col-label">${escapeHTML(dayLabel)}</div>
        </div>`;
    })
    .join('');

  chartBox.querySelectorAll('.chart-bar').forEach((bar) => {
    bar.style.height = `${bar.dataset.height || 15}%`;
  });
}

async function loadAdminApplications() {
  const tbody = document.getElementById('tbodyAdminApplications');
  if (tbody) tbody.innerHTML = `<tr><td colspan="9"><div class="skeleton-line"></div></td></tr>`;

  try {
    const res = await apiRequest('/api/admin/applications', { token: state.adminToken });
    const apps = Array.isArray(res.applications) ? res.applications : [];
    const badge = document.getElementById('badgePendingApps');
    if (badge) {
      const pendingCount = apps.filter((a) => a.status === 'PENDING_APPROVAL').length;
      badge.textContent = formatNum(pendingCount);
    }
    if (!tbody) return;

    if (apps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-inline-msg">${escapeHTML(
        isAr() ? 'لا توجد طلبات انضمام بانتظار المراجعة حالياً ✓' : 'No onboarding applications right now ✓'
      )}</td></tr>`;
      return;
    }

    tbody.innerHTML = apps
      .map((app) => {
        const isPending = app.status === 'PENDING_APPROVAL';
        const roleText =
          app.role === 'seller'
            ? (isAr() ? '🏷️ بائع معتمد' : '🏷️ Verified Seller')
            : (isAr() ? '🚚 كابتن توصيل' : '🚚 Captain');
        const appData = app.application_data || {};
        const detailSummary =
          app.role === 'seller'
            ? `${isAr() ? 'المتجر:' : 'Shop:'} ${appData.shop_name || '—'} | ${isAr() ? 'الباقة:' : 'Plan:'} ${appData.tier || 'everyday'} | ${appData.payout_account || '—'}`
            : `${isAr() ? 'المركبة:' : 'Vehicle:'} ${appData.vehicle_type || '—'} | ${appData.vehicle_plate || '—'} | ${appData.license_number || '—'}`;
        const safeId = escapeHTML(app.id);
        const statusClass = isPending ? 'pending' : app.status === 'APPROVED' ? 'active' : 'blocked';
        const statusText = isPending
          ? (isAr() ? 'قيد المراجعة' : 'Pending')
          : app.status === 'APPROVED'
            ? (isAr() ? 'معتمد ✓' : 'Approved ✓')
            : (isAr() ? 'مرفوض ✕' : 'Rejected ✕');

        return `
          <tr>
            <td><strong class="mono-num">#${safeId}</strong></td>
            <td><span class="role-badge role-${escapeHTML(app.role)}">${escapeHTML(roleText)}</span></td>
            <td><strong>${escapeHTML(app.name)}</strong></td>
            <td class="mono-num">${escapeHTML(app.phone)}</td>
            <td><strong>${escapeHTML(translateDistrict(app.district))}</strong></td>
            <td class="text-muted-sm">${escapeHTML(detailSummary)}</td>
            <td class="mono-num">${escapeHTML(app.created_at ? String(app.created_at).slice(0, 10) : '—')}</td>
            <td><span class="status-pill status-${statusClass}">${escapeHTML(statusText)}</span></td>
            <td>
              ${
                isPending
                  ? `<div class="table-actions">
                      <button type="button" class="btn-table-action btn-table-approve" data-action="review-app" data-id="${safeId}" data-decision="APPROVED">${escapeHTML(
                        isAr() ? 'اعتماد ✓' : 'Approve ✓'
                      )}</button>
                      <button type="button" class="btn-table-action btn-table-reject" data-action="review-app" data-id="${safeId}" data-decision="REJECTED">${escapeHTML(
                        isAr() ? 'رفض ✕' : 'Reject ✕'
                      )}</button>
                    </div>`
                  : `<span class="text-muted-sm">${escapeHTML(isAr() ? 'تم الفحص' : 'Reviewed')}</span>`
              }
            </td>
          </tr>`;
      })
      .join('');
  } catch (err) {
    showToast(isAr() ? 'خطأ في طلبات الانضمام' : 'Applications Load Failed', err.message, 'error');
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="empty-inline-msg text-crimson">${escapeHTML(err.message)}</td></tr>`;
  }
}

function handleAdminAppReview(appId, decision) {
  if (!appId || !decision) return;
  if (decision === 'REJECTED') {
    openConfirmModal({
      title: isAr() ? 'تأكيد رفض الطلب' : 'Confirm Application Rejection',
      message: isAr()
        ? `هل أنت متأكد من رفض طلب الانضمام #${appId}؟`
        : `Are you sure you want to reject onboarding application #${appId}?`,
      confirmLabel: isAr() ? 'تأكيد الرفض' : 'Reject Application',
      onConfirm: () => reviewApplication(appId, 'REJECTED')
    });
    return;
  }
  reviewApplication(appId, decision);
}

async function reviewApplication(appId, action) {
  try {
    await apiRequest(`/api/admin/applications/${encodeURIComponent(appId)}/review`, {
      method: 'POST',
      token: state.adminToken,
      body: JSON.stringify({
        action,
        notes:
          action === 'APPROVED'
            ? 'تم الاعتماد الرسمي وتفعيل الصلاحيات من الإدارة'
            : 'المستندات أو البيانات غير مكتملة'
      })
    });
    showToast(
      action === 'APPROVED'
        ? (isAr() ? 'تم اعتماد الطلب' : 'Application Approved')
        : (isAr() ? 'تم رفض الطلب' : 'Application Rejected'),
      action === 'APPROVED'
        ? (isAr() ? 'تم تفعيل الصلاحيات وإشعار المتقدم ✓' : 'Permissions activated ✓')
        : (isAr() ? 'تم تسجيل رفض الطلب' : 'Rejection recorded'),
      action === 'APPROVED' ? 'success' : 'warning'
    );
    loadAdminApplications();
    loadAdminAnalytics();
    loadAdminUsers();
    loadAdminDrivers();
  } catch (err) {
    showToast(isAr() ? 'خطأ في المراجعة' : 'Review Failed', err.message, 'error');
  }
}

async function loadAdminUsers() {
  const tbody = document.getElementById('tbodyAdminUsers');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9"><div class="skeleton-line"></div></td></tr>`;

  try {
    const res = await apiRequest('/api/admin/users', { token: state.adminToken });
    const users = Array.isArray(res.users) ? res.users : [];
    tbody.innerHTML = users
      .map((u) => {
        const isActive = (u.status || 'ACTIVE') === 'ACTIVE';
        const safeId = escapeHTML(u.id);
        return `
          <tr>
            <td><strong class="mono-num">#${safeId}</strong></td>
            <td>${escapeHTML(u.name)}</td>
            <td class="mono-num">${escapeHTML(u.username || u.email)}</td>
            <td><span class="role-badge role-${escapeHTML(u.role)}">${escapeHTML(u.role)}</span></td>
            <td>${escapeHTML(translateDistrict(u.district))}</td>
            <td class="mono-num">${escapeHTML(u.phone || '—')}</td>
            <td class="tabular-num"><strong>${formatNum(u.orders_count || 0)}</strong></td>
            <td><span class="status-pill status-${escapeHTML(String(u.status || 'ACTIVE').toLowerCase())}">${escapeHTML(u.status || 'ACTIVE')}</span></td>
            <td>
              <button type="button" class="btn-table-action ${isActive ? 'btn-table-reject' : 'btn-table-approve'}" data-action="toggle-user-status" data-id="${safeId}" data-status="${escapeHTML(u.status || 'ACTIVE')}">
                ${escapeHTML(isActive ? (isAr() ? '🚫 حظر' : '🚫 Block') : (isAr() ? '✓ تفعيل' : '✓ Activate'))}
              </button>
            </td>
          </tr>`;
      })
      .join('');
  } catch (err) {
    showToast(isAr() ? 'فشل تحميل المستخدمين' : 'Users Load Failed', err.message, 'error');
    tbody.innerHTML = `<tr><td colspan="9" class="empty-inline-msg text-crimson">${escapeHTML(err.message)}</td></tr>`;
  }
}

function handleToggleUserStatus(userId, currentStatus) {
  if (!userId) return;
  const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
  if (newStatus === 'BLOCKED') {
    openConfirmModal({
      title: isAr() ? 'تأكيد حظر الحساب' : 'Confirm Account Block',
      message: isAr()
        ? `هل أنت متأكد من حظر المستخدم #${userId}؟ لن يتمكن من تسجيل الدخول.`
        : `Are you sure you want to block user #${userId}?`,
      confirmLabel: isAr() ? 'تأكيد الحظر' : 'Block User',
      onConfirm: () => toggleUserStatus(userId, newStatus)
    });
    return;
  }
  toggleUserStatus(userId, newStatus);
}

async function toggleUserStatus(userId, newStatus) {
  try {
    await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'POST',
      token: state.adminToken,
      body: JSON.stringify({ status: newStatus })
    });
    showToast(
      newStatus === 'BLOCKED'
        ? (isAr() ? 'تم حظر المستخدم' : 'User Blocked')
        : (isAr() ? 'تم فك الحظر' : 'User Activated'),
      isAr() ? `تم تحديث حالة #${userId} إلى ${newStatus}` : `User #${userId} status -> ${newStatus}`,
      newStatus === 'BLOCKED' ? 'warning' : 'success'
    );
    loadAdminUsers();
  } catch (err) {
    showToast(isAr() ? 'خطأ في تعديل الحالة' : 'Status Update Failed', err.message, 'error');
  }
}

async function loadAdminDrivers() {
  const tbody = document.getElementById('tbodyAdminDrivers');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9"><div class="skeleton-line"></div></td></tr>`;

  try {
    const res = await apiRequest('/api/admin/drivers', { token: state.adminToken });
    const drivers = Array.isArray(res.drivers) ? res.drivers : [];
    tbody.innerHTML = drivers
      .map((d) => {
        const isFree = d.status === 'FREE';
        const safeId = escapeHTML(d.id);
        return `
          <tr>
            <td><strong class="mono-num">#${safeId}</strong></td>
            <td>${escapeHTML(d.name)}</td>
            <td class="mono-num">${escapeHTML(d.phone)}</td>
            <td><strong>${escapeHTML(translateDistrict(d.district))}</strong></td>
            <td>${escapeHTML(d.vehicle_type || '—')}</td>
            <td class="tabular-num">⭐ ${formatNum(d.rating ?? 4.9)}</td>
            <td class="tabular-num"><strong>${formatNum(d.completed_trips ?? 0)}</strong></td>
            <td>
              <span class="status-pill status-${escapeHTML(String(d.status || 'FREE').toLowerCase())}">
                ${escapeHTML(isFree ? (isAr() ? '🟢 متاح' : '🟢 Free') : (isAr() ? '🚚 في مهمة' : '🚚 On Delivery'))}
              </span>
            </td>
            <td>
              <button type="button" class="btn-quick-prompt" data-action="toggle-driver-status" data-id="${safeId}" data-status="${escapeHTML(d.status || 'FREE')}">
                ${escapeHTML(isFree ? (isAr() ? 'تعيين مهمة' : 'Assign Trip') : (isAr() ? 'إتاحة الكابتن' : 'Set Free'))}
              </button>
            </td>
          </tr>`;
      })
      .join('');
  } catch (err) {
    showToast(isAr() ? 'فشل تحميل الأسطول' : 'Fleet Load Failed', err.message, 'error');
    tbody.innerHTML = `<tr><td colspan="9" class="empty-inline-msg text-crimson">${escapeHTML(err.message)}</td></tr>`;
  }
}

async function toggleDriverStatus(driverId, currentStatus, btnEl) {
  const newStatus = currentStatus === 'FREE' ? 'ON_DELIVERY' : 'FREE';
  const restore = setButtonLoading(btnEl, isAr() ? 'جاري التحديث...' : 'Updating...');
  try {
    await apiRequest(`/api/admin/drivers/${encodeURIComponent(driverId)}/status`, {
      method: 'POST',
      token: state.adminToken,
      body: JSON.stringify({ status: newStatus })
    });
    showToast(
      isAr() ? 'تحديث حالة الكابتن' : 'Driver Updated',
      isAr() ? `تم تغيير حالة #${driverId} إلى ${newStatus}` : `Driver #${driverId} -> ${newStatus}`,
      'success'
    );
    loadAdminDrivers();
  } catch (err) {
    showToast(isAr() ? 'خطأ' : 'Error', err.message, 'error');
  } finally {
    restore();
  }
}

// ==================== VIEW 9: ACCOUNT HUB (STRICT AUTH, CARDS + TABLES, KYC) ====================
function initAccountPortal() {
  switchAccountTab(state.currentAccountTab || 'info');
}

function switchAccountTab(tabKey) {
  if (tabKey === 'delivery' && state.currentUser?.role !== 'driver') {
    tabKey = 'info';
  }
  state.currentAccountTab = tabKey;

  document.querySelectorAll('.account-nav-item').forEach((item) => {
    const active = item.dataset.tab === tabKey;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  document.querySelectorAll('.account-sub-tab').forEach((tab) => {
    if (tab.id === `tabAcc_${tabKey}`) {
      showEl(tab);
    } else {
      hideEl(tab);
    }
  });

  if (tabKey === 'favorites' && state.currentUser && state.authToken) {
    renderAccountFavorites();
  }
}

function clearAccountDomToGuest() {
  const setTxt = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  setTxt('accAvatar', '--');
  setTxt('accProfileName', tKey('account.guestName'));
  setTxt('accProfileUsername', '@--');
  setTxt('accRoleBadge', tKey('account.guestBadge'));
  setTxt('accDistrict', '—');
  setTxt('accEmail', '—');
  setTxt('accPhone', '—');
  setTxt('accTrustScore', '—');
  setTxt('accMetricSellerItems', '0');
  setTxt('accMetricBuyerDeals', '0');
  setTxt('accMetricCash', formatEGP(0));
  setTxt('accDetailId', '—');
  setTxt('accDetailDate', '—');
  setTxt('accDetailDistrict', '—');
  setTxt('accDetailStatus', '—');
  hideEl(document.getElementById('navAccDelivery'));
  hideEl(document.getElementById('accAppStatusBanner'));
  ['accSellerCardsList', 'tbodyAccSellerItems', 'accBuyerCardsList', 'tbodyAccBuyerDeals', 'accFavoritesGrid', 'accDeliveryCardsList', 'tbodyAccDeliveryLogs'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
}

async function loadAccountData() {
  if (!state.currentUser || !state.authToken) {
    clearAccountDomToGuest();
    openAuthModal('login');
    return;
  }

  const user = state.currentUser;
  const initials = user.avatar || String(user.name || 'AF').trim().slice(0, 2).toUpperCase();
  const roleNames = {
    buyer: isAr() ? 'مشتري معتمد' : 'Verified Buyer',
    seller: isAr() ? 'بائع معتمد' : 'Verified Seller',
    merchant: isAr() ? 'تاجر شريك' : 'Partner Merchant',
    driver: isAr() ? 'كابتن توصيل' : 'Delivery Captain',
    admin: isAr() ? 'مشرف عام' : 'Super Admin'
  };

  document.getElementById('accAvatar').textContent = initials;
  document.getElementById('accProfileName').textContent = user.name || '—';
  document.getElementById('accProfileUsername').textContent = `@${user.username || (user.email ? user.email.split('@')[0] : 'member')}`;
  document.getElementById('accRoleBadge').textContent = roleNames[user.role] || user.role || 'buyer';
  document.getElementById('accDistrict').textContent = translateDistrict(user.district);
  document.getElementById('accEmail').textContent = user.email || '—';
  document.getElementById('accPhone').textContent = user.phone || '—';
  document.getElementById('accTrustScore').textContent = isAr() ? '4.9 / 5.0 (موثوق بالإسكندرية)' : '4.9 / 5.0 (Alexandria Verified)';

  document.getElementById('accDetailId').textContent = user.id || '—';
  document.getElementById('accDetailDate').textContent = user.created_at ? String(user.created_at).slice(0, 10) : '—';
  document.getElementById('accDetailDistrict').textContent = translateDistrict(user.district);
  document.getElementById('accDetailStatus').textContent =
    user.status === 'BLOCKED' ? (isAr() ? 'محظور' : 'Blocked') : (isAr() ? '✓ موثق ونشط' : '✓ Verified & Active');

  // Show Delivery subtab ONLY for driver role
  const navDelivery = document.getElementById('navAccDelivery');
  if (navDelivery) {
    if (user.role === 'driver') showEl(navDelivery);
    else hideEl(navDelivery);
  }
  if (state.currentAccountTab === 'delivery' && user.role !== 'driver') {
    switchAccountTab('info');
  }

  // Prefill settings form
  const setName = document.getElementById('accSettingFullName');
  const setPhone = document.getElementById('accSettingPhone');
  const setDist = document.getElementById('accSettingDistrict');
  const setLang = document.getElementById('accSettingLang');
  const setTheme = document.getElementById('accSettingTheme');
  const setNotify = document.getElementById('accSettingNotify');
  if (setName) setName.value = user.name || '';
  if (setPhone) setPhone.value = user.phone || '';
  if (setDist && user.district) setDist.value = user.district;
  if (setLang) setLang.value = state.lang;
  if (setTheme) setTheme.value = state.theme;
  if (setNotify) setNotify.value = user.notify || localStorage.getItem(STORAGE_KEYS.notify) || 'sms_whatsapp';

  checkUserApplicationStatus();

  let sellerItems = [];
  let buyerDeals = [];
  let deliveryTasks = [];
  let totalCash = 0;

  try {
    const data = await apiRequest(`/api/user/account-data?user_id=${encodeURIComponent(user.id)}`);
    sellerItems = data?.seller_data?.recent_items || [];
    totalCash = data?.seller_data?.total_buyout_payouts || 0;
    buyerDeals = data?.buyer_data?.recent_deals || [];
    deliveryTasks = data?.delivery_data?.recent_dispatches || [];
  } catch (err) {
    if (err.status === 401) {
      persistUserSession('', null);
      clearAccountDomToGuest();
      showToast(isAr() ? 'انتهت الجلسة' : 'Session Expired', isAr() ? 'يرجى تسجيل الدخول مجدداً' : 'Please sign in again', 'warning');
      switchPortalView('showroom');
      openAuthModal('login');
      return;
    }
    showToast(isAr() ? 'خطأ في بيانات الحساب' : 'Account Data Error', err.message, 'error');
  }

  document.getElementById('accMetricSellerItems').textContent = formatNum(sellerItems.length);
  document.getElementById('accMetricBuyerDeals').textContent = formatNum(buyerDeals.length);
  document.getElementById('accMetricCash').textContent = formatEGP(totalCash);

  renderAccountSellerSection(sellerItems);
  renderAccountBuyerSection(buyerDeals);
  renderAccountFavorites();
  if (user.role === 'driver') {
    renderAccountDeliverySection(deliveryTasks);
  }
}

function renderAccountSellerSection(sellerItems) {
  const cardsEl = document.getElementById('accSellerCardsList');
  const tbody = document.getElementById('tbodyAccSellerItems');

  if (!sellerItems || sellerItems.length === 0) {
    if (cardsEl) {
      cardsEl.innerHTML = `<div class="empty-state-card">${escapeHTML(
        isAr() ? 'لم تضف أي سلع للبيع بعد.' : 'You have not submitted any seller listings yet.'
      )}</div>`;
    }
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-inline-msg">${escapeHTML(
        isAr() ? 'لا توجد معروضات مسجلة لحسابك حتى الآن.' : 'No seller listings found for your account.'
      )}</td></tr>`;
    }
    return;
  }

  if (cardsEl) {
    cardsEl.innerHTML = sellerItems
      .map((it) => {
        const itId = escapeHTML(it.id || it.item_id);
        const grade = String(it.condition_grade || 'A').toUpperCase();
        const price = it.expected_resale_price || 0;
        const buyout = it.recommended_purchase_price || Math.round(price * 0.72);
        return `
          <div class="acc-listing-card">
            <div class="product-list-header">
              <strong class="mono-num">#${itId}</strong>
              <span class="grade-badge grade-${grade.toLowerCase()}">Grade ${escapeHTML(grade)}</span>
            </div>
            <strong>${escapeHTML(it.title)}</strong>
            <div class="text-muted-sm">📍 ${escapeHTML(translateDistrict(it.district))} • ${escapeHTML(it.status || '')}</div>
            <div class="product-list-footer">
              <span class="text-emerald tabular-num"><strong>${escapeHTML(formatEGP(buyout))}</strong></span>
              <button type="button" class="btn-quick-prompt" data-action="open-item" data-id="${itId}">${escapeHTML(
                isAr() ? 'معاينة' : 'View'
              )}</button>
            </div>
          </div>`;
      })
      .join('');
  }

  if (tbody) {
    tbody.innerHTML = sellerItems
      .map((it) => {
        const itId = escapeHTML(it.id || it.item_id);
        const grade = String(it.condition_grade || 'A').toUpperCase();
        const price = it.expected_resale_price || 0;
        const buyout = it.recommended_purchase_price || Math.round(price * 0.72);
        return `
          <tr>
            <td><strong class="mono-num">#${itId}</strong></td>
            <td>${escapeHTML(it.title)}</td>
            <td>📍 ${escapeHTML(translateDistrict(it.district))}</td>
            <td><span class="grade-badge grade-${grade.toLowerCase()}">${escapeHTML(grade)}</span></td>
            <td class="tabular-num"><strong>${escapeHTML(formatEGP(price))}</strong></td>
            <td class="text-emerald tabular-num"><strong>${escapeHTML(formatEGP(buyout))}</strong></td>
            <td><span class="receipt-status-pill auto-approved">${escapeHTML(it.status || 'AUTO_APPROVED')}</span></td>
            <td>
              <button type="button" class="btn-quick-prompt" data-action="open-item" data-id="${itId}">${escapeHTML(
                isAr() ? 'معاينة' : 'Preview'
              )}</button>
            </td>
          </tr>`;
      })
      .join('');
  }
}

function renderAccountBuyerSection(buyerDeals) {
  const cardsEl = document.getElementById('accBuyerCardsList');
  const tbody = document.getElementById('tbodyAccBuyerDeals');

  if (!buyerDeals || buyerDeals.length === 0) {
    if (cardsEl) {
      cardsEl.innerHTML = `<div class="empty-state-card">${escapeHTML(
        isAr() ? 'لا توجد حجوزات أو صفقات شراء مسجلة لحسابك حتى الآن.' : 'You have no buyer reservations yet.'
      )}</div>`;
    }
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-inline-msg">${escapeHTML(
        isAr() ? 'لا توجد حجوزات مسجلة حتى الآن.' : 'No reservations found.'
      )}</td></tr>`;
    }
    return;
  }

  if (cardsEl) {
    cardsEl.innerHTML = buyerDeals
      .map((dl) => {
        const dealId = escapeHTML(dl.id || dl.deal_id);
        return `
          <div class="acc-listing-card">
            <div class="product-list-header">
              <strong class="mono-num">#${dealId}</strong>
              <span class="status-pill status-${dl.status === 'SETTLED' ? 'completed' : 'pending'}">${escapeHTML(dl.status || 'COMMISSION_LOCKED')}</span>
            </div>
            <strong>${escapeHTML(dl.item_title || dl.item_id || '—')}</strong>
            <div class="product-list-footer">
              <span class="text-crimson tabular-num"><strong>${escapeHTML(formatEGP(dl.agreed_price || 0))}</strong></span>
              <button type="button" class="btn-quick-prompt" data-action="quick-track" data-track="${dealId}">${escapeHTML(
                isAr() ? 'تتبع 🚚' : 'Track 🚚'
              )}</button>
            </div>
          </div>`;
      })
      .join('');
  }

  if (tbody) {
    tbody.innerHTML = buyerDeals
      .map((dl) => {
        const dealId = escapeHTML(dl.id || dl.deal_id);
        return `
          <tr>
            <td><strong class="mono-num">#${dealId}</strong></td>
            <td>${escapeHTML(dl.item_title || dl.item_id || '—')}</td>
            <td class="text-crimson tabular-num"><strong>${escapeHTML(formatEGP(dl.agreed_price || 0))}</strong></td>
            <td class="text-muted-sm">${escapeHTML(dl.delivery_address || translateDistrict(state.currentUser?.district))}</td>
            <td><span class="status-pill status-${dl.status === 'SETTLED' ? 'completed' : 'pending'}">${escapeHTML(dl.status || 'COMMISSION_LOCKED')}</span></td>
            <td>
              <button type="button" class="btn-quick-prompt" data-action="quick-track" data-track="${dealId}">${escapeHTML(
                isAr() ? 'تتبع 🚚' : 'Track 🚚'
              )}</button>
            </td>
          </tr>`;
      })
      .join('');
  }
}

async function renderAccountFavorites() {
  const grid = document.getElementById('accFavoritesGrid');
  if (!grid) return;

  const favIds = state.favorites || [];
  if (favIds.length === 0) {
    grid.innerHTML = `<div class="empty-state-card">${escapeHTML(
      isAr() ? 'لا توجد سلع محفوظة في المفضلة بعد. اضغط ❤️ على أي سلعة بالمعرض لحفظها!' : 'No favorites saved yet. Click ❤️ on any listing to bookmark it!'
    )}</div>`;
    return;
  }

  if (state.items.length === 0) {
    try {
      state.items = await apiRequest('/api/items?limit=200');
    } catch {
      // ignore if offline
    }
  }

  const favItems = favIds
    .map((id) => state.items.find((it) => it.id === id))
    .filter(Boolean);

  if (favItems.length === 0) {
    grid.innerHTML = `<div class="empty-state-card">${escapeHTML(
      isAr() ? 'السلع المحفوظة لم تعد متاحة في المعرض.' : 'Saved favorite items are no longer listed.'
    )}</div>`;
    return;
  }

  grid.innerHTML = favItems
    .map((it) => {
      const safeId = escapeHTML(it.id);
      const unavailable = isItemUnavailable(it);
      return `
        <div class="acc-listing-card">
          <div class="product-list-header">
            <strong class="mono-num">#${safeId}</strong>
            <button type="button" class="btn-outline-sm" data-action="toggle-favorite" data-id="${safeId}" aria-label="${escapeHTML(
              isAr() ? 'إزالة من المفضلة' : 'Remove favorite'
            )}">❤️</button>
          </div>
          <strong>${escapeHTML(it.title)}</strong>
          <div class="text-muted-sm">📍 ${escapeHTML(translateDistrict(it.district))}</div>
          <div class="product-list-footer">
            <span class="text-crimson tabular-num"><strong>${escapeHTML(formatEGP(it.expected_resale_price))}</strong></span>
            <div class="table-actions">
              <button type="button" class="btn-quick-prompt" data-action="open-item" data-id="${safeId}">${escapeHTML(
                isAr() ? 'عرض' : 'View'
              )}</button>
              <button type="button" class="btn-table-action btn-table-approve" data-action="open-reserve" data-id="${safeId}" ${unavailable ? 'disabled' : ''}>${escapeHTML(
                isAr() ? 'حجز' : 'Reserve'
              )}</button>
            </div>
          </div>
        </div>`;
    })
    .join('');
}

function renderAccountDeliverySection(deliveryTasks) {
  const cardsEl = document.getElementById('accDeliveryCardsList');
  const tbody = document.getElementById('tbodyAccDeliveryLogs');

  if (!deliveryTasks || deliveryTasks.length === 0) {
    if (cardsEl) {
      cardsEl.innerHTML = `<div class="empty-state-card">${escapeHTML(
        isAr() ? 'لا توجد مشاوير مسجلة باسمك حتى الآن.' : 'No delivery trips recorded for your driver ID yet.'
      )}</div>`;
    }
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-inline-msg">${escapeHTML(
        isAr() ? 'لا توجد مهام مسجلة حتى الآن.' : 'No courier logs yet.'
      )}</td></tr>`;
    }
    return;
  }

  if (cardsEl) {
    cardsEl.innerHTML = deliveryTasks
      .map((tsk) => {
        const tskId = escapeHTML(tsk.id || tsk.task_id);
        return `
          <div class="acc-listing-card">
            <div class="product-list-header">
              <strong class="mono-num">#${tskId}</strong>
              <span class="status-pill status-${tsk.status === 'COMPLETED' ? 'completed' : 'pending'}">${escapeHTML(tsk.status || 'PENDING')}</span>
            </div>
            <div>📍 ${escapeHTML(translateDistrict(tsk.district))}</div>
            <div class="text-muted-sm">${escapeHTML(tsk.delivery_address || tsk.pickup_address || '—')}</div>
            <div class="product-list-footer">
              <span class="text-emerald tabular-num"><strong>${escapeHTML(formatEGP(tsk.payout_cash || 0))}</strong></span>
              <button type="button" class="btn-quick-prompt" data-action="show-delivery-details" data-id="${tskId}">${escapeHTML(
                isAr() ? 'تفاصيل' : 'Details'
              )}</button>
            </div>
          </div>`;
      })
      .join('');
  }

  if (tbody) {
    tbody.innerHTML = deliveryTasks
      .map((tsk) => {
        const tskId = escapeHTML(tsk.id || tsk.task_id);
        return `
          <tr>
            <td><strong class="mono-num">#${tskId}</strong></td>
            <td>📍 ${escapeHTML(translateDistrict(tsk.district))}</td>
            <td class="text-muted-sm">${escapeHTML(tsk.delivery_address || tsk.pickup_address || '—')}</td>
            <td class="text-emerald tabular-num"><strong>${escapeHTML(formatEGP(tsk.payout_cash || 0))}</strong></td>
            <td><span class="status-pill status-${tsk.status === 'COMPLETED' ? 'completed' : 'pending'}">${escapeHTML(tsk.status || 'PENDING')}</span></td>
            <td>
              <button type="button" class="btn-quick-prompt" data-action="show-delivery-details" data-id="${tskId}">${escapeHTML(
                isAr() ? 'تفاصيل' : 'Details'
              )}</button>
            </td>
          </tr>`;
      })
      .join('');
  }
}

function saveAccountSettings() {
  if (!state.currentUser) return;
  const nameInput = document.getElementById('accSettingFullName');
  const phoneInput = document.getElementById('accSettingPhone');
  const distInput = document.getElementById('accSettingDistrict');
  const langInput = document.getElementById('accSettingLang');
  const themeInput = document.getElementById('accSettingTheme');
  const notifyInput = document.getElementById('accSettingNotify');

  if (nameInput && nameInput.value.trim()) {
    state.currentUser.name = nameInput.value.trim();
  }
  if (phoneInput && phoneInput.value.trim()) {
    state.currentUser.phone = phoneInput.value.trim();
  }
  if (distInput && distInput.value) {
    state.currentUser.district = distInput.value;
    state.selectedDistrict = distInput.value;
    localStorage.setItem(STORAGE_KEYS.district, distInput.value);
    const headerDist = document.getElementById('headerDistrictFilter');
    if (headerDist) headerDist.value = distInput.value;
    document.querySelectorAll('.district-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.district === state.selectedDistrict);
    });
  }
  if (notifyInput) {
    state.currentUser.notify = notifyInput.value;
    localStorage.setItem(STORAGE_KEYS.notify, notifyInput.value);
  }

  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.currentUser));

  if (themeInput && themeInput.value !== state.theme) {
    state.theme = themeInput.value;
    localStorage.setItem(STORAGE_KEYS.theme, state.theme);
    applyTheme(state.theme);
  }
  if (langInput && langInput.value !== state.lang) {
    state.lang = langInput.value;
    localStorage.setItem(STORAGE_KEYS.lang, state.lang);
    applyLanguage(state.lang);
  }

  updateHeaderUserDisplay();
  loadAccountData();
  showToast(
    isAr() ? 'تم حفظ التعديلات' : 'Settings Saved',
    isAr() ? 'تم تحديث بيانات وتفضيلات حسابك بنجاح ✓' : 'Account profile & preferences saved ✓',
    'success'
  );
}

// ==================== 2-STEP KYC ONBOARDING MODALS ====================
function handleKycStep(modalId, stepNum) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const prefix = modalId === 'modalSellerApply' ? 'sellerApply' : 'driverApply';
  const step1El = document.getElementById(`${prefix}Step1`);
  const step2El = document.getElementById(`${prefix}Step2`);

  if (stepNum === 2 && step1El) {
    const inputs = Array.from(step1El.querySelectorAll('input, select, textarea'));
    for (const inp of inputs) {
      if (!inp.checkValidity()) {
        inp.reportValidity();
        return;
      }
    }
  }

  if (step1El) step1El.classList.toggle('active', stepNum === 1);
  if (step2El) step2El.classList.toggle('active', stepNum === 2);

  modal.querySelectorAll('.kyc-step-pill').forEach((pill) => {
    pill.classList.toggle('active', Number(pill.dataset.kycStep || 1) === stepNum);
  });
}

function attachKycDocPreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;

  input.addEventListener('change', () => {
    preview.innerHTML = '';
    const files = Array.from(input.files || []);
    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) {
        showToast(
          isAr() ? 'ملف كبير جداً' : 'File Too Large',
          isAr() ? `${file.name} يتجاوز 10MB` : `${file.name} exceeds 10MB limit`,
          'error'
        );
        input.value = '';
        return;
      }
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const wrap = document.createElement('div');
          wrap.className = 'preview-thumb-wrap';
          const img = document.createElement('img');
          img.className = 'preview-thumb';
          img.src = String(ev.target?.result || '');
          img.alt = file.name;
          wrap.appendChild(img);
          preview.appendChild(wrap);
        };
        reader.readAsDataURL(file);
      } else {
        const chip = document.createElement('span');
        chip.className = 'role-badge';
        chip.textContent = `📄 ${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
        preview.appendChild(chip);
      }
    }
  });
}

function openSellerApplyModal() {
  handleKycStep('modalSellerApply', 1);
  if (state.currentUser) {
    const nameIn = document.getElementById('sellerApplyName');
    const phoneIn = document.getElementById('sellerApplyPhone');
    const distIn = document.getElementById('sellerApplyDistrict');
    if (nameIn && state.currentUser.name) nameIn.value = state.currentUser.name;
    if (phoneIn && state.currentUser.phone) phoneIn.value = state.currentUser.phone;
    if (distIn && state.currentUser.district) distIn.value = state.currentUser.district;
  }
  openModal('modalSellerApply');
}

function openDriverApplyModal() {
  handleKycStep('modalDriverApply', 1);
  if (state.currentUser) {
    const nameIn = document.getElementById('driverApplyName');
    const phoneIn = document.getElementById('driverApplyPhone');
    const distIn = document.getElementById('driverApplyDistrict');
    if (nameIn && state.currentUser.name) nameIn.value = state.currentUser.name;
    if (phoneIn && state.currentUser.phone) phoneIn.value = state.currentUser.phone;
    if (distIn && state.currentUser.district) distIn.value = state.currentUser.district;
  }
  openModal('modalDriverApply');
}

async function handleSellerApplySubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitSellerApply');
  const restore = setButtonLoading(btn, isAr() ? 'جاري إرسال الطلب...' : 'Submitting...');

  const userId =
    state.currentUser?.id ||
    localStorage.getItem(STORAGE_KEYS.pendingAppUserId) ||
    `USR-${Math.floor(1000 + Math.random() * 9000)}`;

  const rawTier = document.getElementById('sellerApplyTier').value;
  const tierMap = { everyday: 'Everyday Seller', pro: 'Pro Trader', enterprise: 'Enterprise' };
  const mappedTier = tierMap[rawTier] || rawTier;

  const payload = {
    user_id: userId,
    name: document.getElementById('sellerApplyName').value.trim(),
    phone: document.getElementById('sellerApplyPhone').value.trim(),
    role: 'seller',
    district: document.getElementById('sellerApplyDistrict').value,
    national_id: document.getElementById('sellerApplyNationalId').value.trim(),
    shop_name: document.getElementById('sellerApplyShop').value.trim(),
    business_type: document.getElementById('sellerApplyBusinessType').value,
    tier: mappedTier,
    payout_account: document.getElementById('sellerApplyPayoutAccount').value.trim(),
    application_data: {
      shop_name: document.getElementById('sellerApplyShop').value.trim(),
      business_type: document.getElementById('sellerApplyBusinessType').value,
      national_id: document.getElementById('sellerApplyNationalId').value.trim(),
      tier: mappedTier,
      payout_account: document.getElementById('sellerApplyPayoutAccount').value.trim()
    }
  };

  try {
    const res = await apiRequest('/api/applications/apply', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const effectiveUid = res.user_id || userId;
    localStorage.setItem(STORAGE_KEYS.pendingAppUserId, effectiveUid);

    document.getElementById('sellerApplyForm')?.reset();
    document.getElementById('sellerDocPreview').innerHTML = '';
    closeModal('modalSellerApply');
    showToast(
      isAr() ? 'تم إرسال طلب البائع ✓' : 'Seller Application Sent ✓',
      isAr() ? 'طلبك قيد المراجعة والاعتماد من الإدارة المركزية' : 'Your application is under admin verification',
      'success'
    );
    checkUserApplicationStatus();
  } catch (err) {
    showToast(isAr() ? 'خطأ في إرسال الطلب' : 'Submission Failed', err.message, 'error');
  } finally {
    restore();
  }
}

async function handleDriverApplySubmit(e) {
  e.preventDefault();
  const gpsConsent = document.getElementById('driverApplyGpsConsent')?.checked;
  if (!gpsConsent) {
    showToast(
      isAr() ? 'تنبيه الأمان' : 'GPS Consent Required',
      isAr() ? 'الموافقة على مشاركة الموقع الجغرافي الفعلي شرط إلزامي للكابتن' : 'Mandatory GPS consent is required for Captain onboarding',
      'warning'
    );
    return;
  }

  const btn = document.getElementById('btnSubmitDriverApply');
  const restore = setButtonLoading(btn, isAr() ? 'جاري إرسال الطلب...' : 'Submitting...');

  const userId =
    state.currentUser?.id ||
    localStorage.getItem(STORAGE_KEYS.pendingAppUserId) ||
    `DRV-${Math.floor(1000 + Math.random() * 9000)}`;

  const nationalId = document.getElementById('driverApplyNationalId').value.trim();
  const vehicleType = document.getElementById('driverApplyVehicleType').value;
  const vehiclePlate = document.getElementById('driverApplyVehiclePlate').value.trim();
  const license = document.getElementById('driverApplyLicenseNumber').value.trim();

  const payload = {
    user_id: userId,
    name: document.getElementById('driverApplyName').value.trim(),
    phone: document.getElementById('driverApplyPhone').value.trim(),
    role: 'driver',
    district: document.getElementById('driverApplyDistrict').value,
    national_id: nationalId,
    vehicle_type: vehicleType,
    vehicle_plate: vehiclePlate,
    license_number: license,
    consent_location: true,
    application_data: {
      national_id: nationalId,
      vehicle_type: vehicleType,
      vehicle_plate: vehiclePlate,
      license_number: license,
      gps_consent_accepted: true
    }
  };

  try {
    const res = await apiRequest('/api/applications/apply', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const effectiveUid = res.user_id || userId;
    localStorage.setItem(STORAGE_KEYS.pendingAppUserId, effectiveUid);

    document.getElementById('driverApplyForm')?.reset();
    document.getElementById('driverDocPreview').innerHTML = '';
    closeModal('modalDriverApply');
    showToast(
      isAr() ? 'تم إرسال طلب الكابتن 🚚' : 'Captain Application Sent 🚚',
      isAr() ? 'طلبك قيد المراجعة لتوثيق الرخصة والمركبة' : 'Your Captain credentials are under admin review',
      'success'
    );
    checkUserApplicationStatus();
  } catch (err) {
    showToast(isAr() ? 'خطأ في إرسال الطلب' : 'Submission Failed', err.message, 'error');
  } finally {
    restore();
  }
}

async function checkUserApplicationStatus() {
  const uid = state.currentUser?.id || localStorage.getItem(STORAGE_KEYS.pendingAppUserId);
  const banner = document.getElementById('accAppStatusBanner');
  if (!uid || !banner) return;

  const icon = document.getElementById('accAppStatusIcon');
  const heading = document.getElementById('accAppStatusHeading');
  const text = document.getElementById('accAppStatusText');
  const btnAction = document.getElementById('btnAccAppAction');
  const progress = document.getElementById('accKycProgressSteps');

  try {
    const res = await apiRequest(`/api/applications/my-status?user_id=${encodeURIComponent(uid)}`);
    if (!res.has_application || !res.application) {
      hideEl(banner);
      return;
    }

    const app = res.application;
    state.latestApplication = app;
    showEl(banner);

    const dots = progress ? Array.from(progress.querySelectorAll('.kyc-prog-dot')) : [];
    const roleLabel =
      app.role === 'seller'
        ? (isAr() ? 'بائع معتمد' : 'Verified Seller')
        : (isAr() ? 'كابتن توصيل' : 'Delivery Captain');

    if (app.status === 'PENDING_APPROVAL') {
      banner.className = 'account-status-banner pending';
      if (icon) icon.textContent = '⏳';
      if (heading) heading.textContent = isAr() ? `طلب انضمام ${roleLabel} (قيد المراجعة)` : `${roleLabel} Application (Pending Review)`;
      if (text) text.textContent = tKey('account.appPendingText');
      hideEl(btnAction);
      if (dots.length >= 3) {
        dots[0].className = 'kyc-prog-dot done';
        dots[1].className = 'kyc-prog-dot current';
        dots[2].className = 'kyc-prog-dot';
      }
    } else if (app.status === 'APPROVED') {
      banner.className = 'account-status-banner approved';
      if (icon) icon.textContent = '✓';
      if (heading) heading.textContent = isAr() ? `تهانينا! تم اعتمادك رسمياً كـ ${roleLabel}` : `Approved! Welcome as ${roleLabel}`;
      if (text) {
        text.textContent = isAr()
          ? 'تم اعتماد طلبك وتفعيل صلاحياتك الكاملة على المنصة.'
          : 'Your application is approved and permissions are unlocked.';
      }
      if (btnAction) {
        btnAction.textContent = app.role === 'seller'
          ? (isAr() ? 'استوديو البائع 🏷️' : 'Seller Studio 🏷️')
          : (isAr() ? 'بوابة الكابتن 🚚' : 'Captain Portal 🚚');
        showEl(btnAction);
      }
      if (dots.length >= 3) {
        dots.forEach((d) => {
          d.className = 'kyc-prog-dot done';
        });
      }
      if (state.currentUser && state.currentUser.role === 'buyer' && app.role) {
        state.currentUser.role = app.role;
        state.currentRole = app.role;
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.currentUser));
      }
    } else {
      banner.className = 'account-status-banner rejected';
      if (icon) icon.textContent = '✕';
      if (heading) heading.textContent = isAr() ? 'تم رفض طلب الانضمام' : 'Application Rejected';
      if (text) text.textContent = app.admin_notes || (isAr() ? 'يرجى مراجعة البيانات وإعادة التقديم.' : 'Please review your details and re-apply.');
      hideEl(btnAction);
      if (dots.length >= 3) {
        dots[0].className = 'kyc-prog-dot done';
        dots[1].className = 'kyc-prog-dot';
        dots[2].className = 'kyc-prog-dot';
      }
    }
  } catch (err) {
    console.warn('Could not check application status:', err);
  }
}

function handleAccAppAction() {
  const targetRole = state.latestApplication?.role || state.currentUser?.role;
  if (targetRole === 'seller') {
    switchPortalView('seller');
  } else if (targetRole === 'driver') {
    switchPortalView('delivery-portal');
  }
}

// ==================== FLOATING AI COMPARE CHATBOT ====================
function toggleCompareChatbot(forceState = null) {
  const panel = document.getElementById('floatingChatbotPanel');
  const btn = document.getElementById('floatingChatbotBtn');
  if (!panel) return;
  const shouldOpen = forceState === null ? !panel.classList.contains('active') : Boolean(forceState);
  panel.classList.toggle('active', shouldOpen);
  if (btn) btn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  if (shouldOpen) {
    document.getElementById('chatbotInput')?.focus();
  }
}

function clearChatbotMessages() {
  const box = document.getElementById('chatbotMessages');
  if (!box) return;
  box.innerHTML = `<div class="chatbot-msg-bubble bot" data-i18n="botWelcome">${escapeHTML(tKey('botWelcome'))}</div>`;
}

async function sendCompareMessage() {
  const inp = document.getElementById('chatbotInput');
  const box = document.getElementById('chatbotMessages');
  const sendBtn = document.getElementById('btnChatbotSend');
  if (!inp || !box) return;

  const message = inp.value.trim();
  if (!message) return;

  const userMsg = document.createElement('div');
  userMsg.className = 'chatbot-msg-bubble user';
  userMsg.textContent = message;
  box.appendChild(userMsg);
  inp.value = '';
  box.scrollTop = box.scrollHeight;

  const typingMsg = document.createElement('div');
  typingMsg.className = 'chatbot-msg-bubble bot';
  typingMsg.textContent = isAr() ? 'جاري البحث والمقارنة بالذكاء الاصطناعي... ⏳' : 'Searching & comparing with AI... ⏳';
  box.appendChild(typingMsg);
  box.scrollTop = box.scrollHeight;

  const restore = setButtonLoading(sendBtn, '⏳');
  try {
    const res = await apiRequest('/api/chatbot/compare', {
      method: 'POST',
      body: JSON.stringify({ message })
    });

    const verdict = isAr()
      ? (res.verdict_ar || res.verdict_en || res.answer || '')
      : (res.verdict_en || res.verdict_ar || res.answer || '');

    typingMsg.innerHTML = `<div class="copy-text">${escapeHTML(verdict)}</div>`;

    // Deduplicate items from res.items AND res.item_1 / res.item_2
    const combined = [];
    const seenIds = new Set();
    [...(Array.isArray(res.items) ? res.items : []), res.item_1, res.item_2]
      .filter(Boolean)
      .forEach((it) => {
        if (it.id && !seenIds.has(it.id)) {
          seenIds.add(it.id);
          combined.push(it);
        }
      });

    if (combined.length > 0) {
      const cardsWrap = document.createElement('div');
      cardsWrap.className = 'chatbot-compare-cards';
      cardsWrap.innerHTML = combined
        .map((item) => {
          const safeId = escapeHTML(item.id);
          const grade = String(item.condition_grade || 'A').toUpperCase();
          return `
            <div class="chatbot-mini-card" role="button" tabindex="0" data-action="open-item" data-id="${safeId}">
              <div><strong>${escapeHTML(item.title)}</strong></div>
              <div class="product-list-header">
                <span class="grade-badge grade-${grade.toLowerCase()}">Grade ${escapeHTML(grade)}</span>
                <span class="text-crimson tabular-num"><strong>${escapeHTML(formatEGP(item.expected_resale_price))}</strong></span>
              </div>
              <div class="text-muted-sm">📍 ${escapeHTML(translateDistrict(item.district))}</div>
            </div>`;
        })
        .join('');
      typingMsg.appendChild(cardsWrap);
    }

    box.scrollTop = box.scrollHeight;
  } catch (err) {
    typingMsg.textContent = isAr()
      ? `عذراً، تعذر الاتصال بالمساعد: ${err.message}`
      : `Sorry, comparison failed: ${err.message}`;
    showToast(isAr() ? 'خطأ في المساعد الذكي' : 'Chatbot Error', err.message, 'error');
  } finally {
    restore();
  }
}

// ==================== FAQ ACCORDION ====================
function toggleFaq(btn) {
  const faqItem = btn.closest('.faq-item');
  if (!faqItem) return;
  const nowOpen = !faqItem.classList.contains('open');
  faqItem.classList.toggle('open', nowOpen);
  btn.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
  const icon = btn.querySelector('.faq-toggle-icon');
  if (icon) icon.textContent = nowOpen ? '−' : '+';
}

// ==================== FORM SUBMISSIONS & BUTTON BINDINGS ====================
function initFormBindings() {
  // PDP buttons
  document.getElementById('btnDetailReserve')?.addEventListener('click', () => {
    const item = state.activeDetailItem;
    if (!item || isItemUnavailable(item)) return;
    closeModal('modalProductDetail');
    openReserveModal(item);
  });

  document.getElementById('btnDetailAskBot')?.addEventListener('click', () => {
    const item = state.activeDetailItem;
    if (!item) return;
    closeModal('modalProductDetail');
    openAskBotModal(item);
  });

  // Auth, Gate & KYC Forms
  document.getElementById('authForm')?.addEventListener('submit', handleAuthSubmit);
  document.getElementById('captainAuthForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    checkCaptainPin();
  });
  document.getElementById('adminAuthForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    checkAdminPin();
  });
  document.getElementById('sellerApplyForm')?.addEventListener('submit', handleSellerApplySubmit);
  document.getElementById('driverApplyForm')?.addEventListener('submit', handleDriverApplySubmit);

  attachKycDocPreview('sellerDocInput', 'sellerDocPreview');
  attachKycDocPreview('driverDocInput', 'driverDocPreview');

  // Account Settings Form
  document.getElementById('formAccountSettings')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveAccountSettings();
  });

  // Chatbot Form
  document.getElementById('chatbotForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    sendCompareMessage();
  });

  // Reserve Form (Workflow 3 Settlement)
  document.getElementById('reserveForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitReserve');
    const itemId = document.getElementById('reserveItemId').value;
    const phone = document.getElementById('reserveBuyerPhone').value.trim();
    const district = document.getElementById('reserveDistrict').value;
    const windowVal = document.getElementById('reserveInspectionWindow')?.value || 'asap';
    const rawAddress = document.getElementById('reserveAddress').value.trim();

    const windowLabelMap = {
      asap: isAr() ? 'أقرب وقت اليوم' : 'ASAP Today',
      evening: isAr() ? 'مساءً (5م–9م)' : 'Evening (5–9 PM)',
      tomorrow_morning: isAr() ? 'غداً صباحاً (11ص–3م)' : 'Tomorrow (11 AM–3 PM)'
    };
    const deliveryAddress = windowLabelMap[windowVal]
      ? `${rawAddress} (${windowLabelMap[windowVal]})`
      : rawAddress;

    const restore = setButtonLoading(btn, isAr() ? 'جاري تأكيد الحجز...' : 'Confirming reservation...');
    try {
      const res = await apiRequest('/api/settle', {
        method: 'POST',
        body: JSON.stringify({
          item_id: itemId,
          buyer_id: state.currentUser?.id || phone,
          delivery_address: deliveryAddress,
          delivery_district: district,
          pickup_address: deliveryAddress
        })
      });

      document.getElementById('reserveForm').reset();
      closeModal('modalReserve');
      showToast(
        isAr() ? 'تم حجز السلعة بنجاح! 🎊' : 'Reservation Confirmed! 🎊',
        isAr()
          ? `كود الصفقة: ${res.deal_id} — الكابتن: ${res.dispatch.driver_name} سيتواصل معك للمعاينة.`
          : `Deal ${res.deal_id} — Captain ${res.dispatch.driver_name} will contact you for inspection.`,
        'success'
      );
      loadShowroomItems();
      loadMetrics();
    } catch (err) {
      showToast(isAr() ? 'فشل الحجز' : 'Reservation Failed', err.message, 'error');
      if (err.status === 409) loadShowroomItems();
    } finally {
      restore();
    }
  });

  // Merchant Refresh & Adjust Form
  document.getElementById('btnRefreshMerchantQueue')?.addEventListener('click', () => {
    loadMerchantQueue();
    loadMetrics();
  });

  document.getElementById('adjustForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitAdjust');
    const itemId = document.getElementById('adjustItemId').value;
    const grade = document.getElementById('adjustGrade').value;
    const price = parseFloat(document.getElementById('adjustPrice').value);
    const notes = document.getElementById('adjustNotes').value.trim();

    const restore = setButtonLoading(btn, isAr() ? 'جاري الحفظ...' : 'Saving...');
    try {
      await apiRequest(`/api/review/${encodeURIComponent(itemId)}`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'ADJUST',
          corrected_grade: grade,
          corrected_price: price,
          merchant_notes: notes
        })
      });
      closeModal('modalAdjust');
      showToast(
        isAr() ? 'تم التعديل والاعتماد' : 'Override Approved',
        isAr() ? 'تم تعديل واعتماد السلعة وتوثيق العملية بنجاح ✓' : 'Item adjusted, approved, and logged ✓',
        'success'
      );
      loadMerchantQueue();
      loadMetrics();
    } catch (err) {
      showToast(isAr() ? 'فشل التعديل' : 'Override Failed', err.message, 'error');
    } finally {
      restore();
    }
  });

  // Trader Studio Ad Generator & Simulator
  document.getElementById('btnGenerateAds')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnGenerateAds');
    const itemId = document.getElementById('selectAdItem')?.value;
    if (!itemId) return;

    const restore = setButtonLoading(btn, isAr() ? 'جاري التوليد...' : 'Generating...');
    try {
      const res = await apiRequest('/api/marketing/generate', {
        method: 'POST',
        body: JSON.stringify({ item_id: itemId })
      });
      document.getElementById('adFbText').textContent = res.facebook_marketplace || '';
      document.getElementById('adIgText').textContent = res.instagram_story || '';
      document.getElementById('adWaText').textContent = res.whatsapp_catalog || '';
      showEl(document.getElementById('adOutputsContainer'));
      showToast(
        isAr() ? 'تم التوليد بنجاح' : 'Ads Generated',
        isAr() ? 'تم تجهيز منشورات فيسبوك وإنستجرام وواتساب ⚡' : 'Facebook, Instagram, and WhatsApp copy ready ⚡',
        'success'
      );
    } catch (err) {
      showToast(isAr() ? 'فشل توليد الإعلانات' : 'Generation Failed', err.message, 'error');
    } finally {
      restore();
    }
  });

  document.getElementById('simChatForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('simChatInput');
    const text = input?.value.trim();
    if (!text) return;
    input.value = '';
    sendSimPrompt(text);
  });

  // Ask Bot Modal Form
  document.getElementById('botModalForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('botModalInput');
    const btn = document.getElementById('btnSubmitBotModal');
    const msg = input?.value.trim();
    if (!msg) return;
    input.value = '';

    const chatBox = document.getElementById('botModalChatBox');
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble buyer';
    userBubble.innerHTML = `<div>${escapeHTML(msg)}</div><div class="chat-meta">${escapeHTML(
      isAr() ? 'المشتري • الآن' : 'Buyer • Just now'
    )}</div>`;
    chatBox.appendChild(userBubble);

    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble bot';
    typingBubble.innerHTML = `
      <div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>
      <div class="chat-meta">${escapeHTML(isAr() ? 'آنتي فصال يكتب الآن...' : 'Anti-Fesal is typing...')}</div>
    `;
    chatBox.appendChild(typingBubble);
    chatBox.scrollTop = chatBox.scrollHeight;

    const restore = setButtonLoading(btn, '⏳');
    try {
      const startTime = Date.now();
      const res = await apiRequest('/api/autoreply', {
        method: 'POST',
        body: JSON.stringify({
          item_id: state.activeBotItemId,
          buyer_message: msg
        })
      });
      const elapsed = Date.now() - startTime;
      if (elapsed < 300) await new Promise((r) => setTimeout(r, 300 - elapsed));
      typingBubble.remove();

      const botBubble = document.createElement('div');
      botBubble.className = 'chat-bubble bot';
      botBubble.innerHTML = `
        <div class="copy-text">${escapeHTML(res.reply_text)}</div>
        <div class="chat-meta">⚡ ${formatNum(res.response_time_ms)}ms • ${escapeHTML(res.intent_detected)}</div>
      `;
      chatBox.appendChild(botBubble);
      chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) {
      typingBubble.remove();
      showToast(isAr() ? 'تعذر الرد' : 'Bot Error', err.message, 'error');
      const errBubble = document.createElement('div');
      errBubble.className = 'chat-bubble bot';
      errBubble.textContent = err.message;
      chatBox.appendChild(errBubble);
    } finally {
      restore();
    }
  });

  // Driver Logs & Catalog Loop
  document.getElementById('btnRefreshDispatches')?.addEventListener('click', loadDispatches);
  document.getElementById('btnRefreshLogs')?.addEventListener('click', loadAuditLogs);
  document.getElementById('btnRunCatalogLoop')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnRunCatalogLoop');
    const resultDiv = document.getElementById('catalogLoopResult');
    const restore = setButtonLoading(btn, isAr() ? 'جاري فحص الكتالوج...' : 'Running catalog audit...');
    try {
      const res = await apiRequest('/api/catalog/run', { method: 'POST' });
      if (resultDiv) {
        showEl(resultDiv);
        resultDiv.innerHTML = isAr()
          ? `✓ تم فحص ${formatNum(res.total_examined)} بند | اعتماد ${formatNum(res.valid_items_count)} بند | استبعاد ${formatNum(res.skipped_items_count)} بند (${formatNum(res.reliability_percent)}%) — <code>${escapeHTML(res.catalog_path)}</code>`
          : `✓ Examined ${formatNum(res.total_examined)} | Valid: ${formatNum(res.valid_items_count)} | Skipped: ${formatNum(res.skipped_items_count)} (${formatNum(res.reliability_percent)}%) — <code>${escapeHTML(res.catalog_path)}</code>`;
      }
      loadAuditLogs();
      showToast(
        isAr() ? 'اكتمل فحص الكتالوج' : 'Catalog Check Complete',
        isAr() ? `تم اعتماد ${formatNum(res.valid_items_count)} بند بنجاح` : `Validated ${formatNum(res.valid_items_count)} items`,
        'success'
      );
    } catch (err) {
      showToast(isAr() ? 'فشل فحص الكتالوج' : 'Catalog Check Failed', err.message, 'error');
    } finally {
      restore();
    }
  });
}
