/**
 * Anti-Fesal (آنتي فصال) - Core Frontend Application Client
 * Connects Dubizzle-inspired interface with FastAPI backend & 4 AI Agents.
 */

// Application State
const state = {
  currentRole: localStorage.getItem('antifesal_role') || 'merchant',
  currentUser: JSON.parse(localStorage.getItem('antifesal_user') || 'null') || {
    id: 'user_alex_01',
    name: 'كابتن محمود السكندري',
    email: 'alex_captain@antifesal.eg',
    role: 'seller',
    avatar: 'MA'
  },
  lang: localStorage.getItem('antifesal_lang') || 'ar',
  theme: localStorage.getItem('antifesal_theme') || 'light',
  currentView: 'showroom',
  selectedCategory: 'All',
  selectedDistrict: 'All',
  searchQuery: '',
  items: [],
  filteredItems: [],
  visibleLimit: 8,
  isLoadingMore: false,
  favorites: JSON.parse(localStorage.getItem('antifesal_favorites') || '[]'),
  currentAppraisalItem: null,
  activeBotItemId: null,
  uploadedImages: [],
  currentLogTab: 'automation',
  currentAccountTab: 'info',
  captainUnlocked: false,
  adminUnlocked: false
};

// Bilingual i18n Translation Dictionary (100% Arabic & 100% English - Zero Language Mixing)
const i18n = {
  ar: {
    brandName: "آنتي فصال",
    brandTagline: "سعّر، بيع، ومن غير وجع فصال",
    sellCta: "سعّر وبِع بالذكاء الاصطناعي",
    searchPlaceholder: "ابحث عن أجهزة كهربائية، لابتوبات، صالونات العطارين...",
    langCodeBadge: "EN",
    langBtnTitle: "Switch to English",
    roleLabel: "الدور:",
    roles: { seller: "بائع", merchant: "تاجر", driver: "مندوب" },
    accountBtn: "حسابي",
    allDistricts: "كل الإسكندرية 📍",
    districts: {
      "El-Attarine": "العطارين",
      "El-Mansheya": "المنشية",
      "Sidi Beshr": "سيدي بشر",
      "Moharam Bek": "محرم بك",
      "Smouha": "سموحة",
      "Miami": "ميامي",
      "Loran": "لوران",
      "Gleem": "جليم",
      "Roushdy": "رشدي"
    },
    chips: {
      All: "الكل 🏷️",
      Appliances: "أجهزة منزلية ❄️",
      Electronics: "إلكترونيات وشاشات 💻",
      Furniture: "أثاث العطارين 🛋️"
    },
    feedStats: (count) => `عرض ${count} منتج مفحوص ومعتمد بالإسكندرية`,
    gradeA: "الفئة A (كسر زيرو)",
    gradeB: "الفئة B (استعمال ممتاز)",
    gradeC: "الفئة C (حالة جيدة)",
    gradeD: "الفئة D (يحتاج صيانة)",
    fixedPriceTag: "سعر قطعي • بدون فصال",
    aiConfidence: "ثقة الفحص",
    cleanDefect: "✓ فحص سليم 100% بدون عيوب",
    reserveBtn: "🛒 حجز ومعاينة فورية",
    askBotBtn: "💬 اسأل البوت",
    currency: "ج.م",
    currencyLong: "جنيه مصري",
    loadingMore: "⚡ جاري تحميل دفعة السلع التالية...",
    allLoaded: "✓ تم عرض جميع السلع المتاحة",
    emptyShowroomTitle: "لا توجد معروضات مطابقة حالياً في هذه المنطقة",
    emptyShowroomSub: "كن أول من يبيع سلعتك ويسعرها بالذكاء الاصطناعي بدون أي وجع فصال!",
    emptyShowroomBtn: "+ ابدأ تسعير سلعتك الآن",
    // Account Page (100% Arabic)
    account: {
      navInfo: "معلومات الحساب",
      navSettings: "إعدادات الحساب",
      navSeller: "تفاصيل البائع",
      navBuyer: "تفاصيل المشتري",
      navDelivery: "تفاصيل المندوب",
      logout: "تسجيل الخروج",
      roleBadge: "بائع ومشتري معتمد",
      lblDistrictPrefix: "الحي:",
      lblEmailPrefix: "البريد:",
      lblPhonePrefix: "الهاتف:",
      trustScore: "4.9 / 5.0 (موثوق بالإسكندرية)",
      infoTitle: "لوحة تحكم الحساب والمعلومات الأساسية",
      infoSubtitle: "ملخص أنشطتك في البيع والشراء والشحن في أسواق الإسكندرية المعتمدة.",
      kpiSellerTitle: "📦 معروضاتي كبائع",
      kpiSellerSub: "معتمدة ومفحوصة بالذكاء الاصطناعي وبدون فصال",
      kpiBuyerTitle: "🛒 حجوزاتي كمشتري",
      kpiBuyerSub: "بانتظار المعاينة والتسليم كاش",
      kpiCashTitle: "💵 المستحقات الكاش الفورية",
      kpiCashSub: "مستلمة فوراً بدون استقطاعات أو وجع فصال",
      cardHeader: "📋 بيانات العضوية والتوثيق",
      cellId: "كود العضوية",
      cellDate: "تاريخ التسجيل",
      cellDistrict: "حي الإقامة والتغطية",
      cellStatus: "حالة الحساب",
      statusActive: "✓ موثق ونشط",
      btnQuickSell: "تسعير سلعة جديدة بالذكاء الاصطناعي",
      btnQuickShowroom: "تصفح المعرض والشراء الفوري 🛍️",
      settingsTitle: "⚙️ إعدادات الحساب والتفضيلات",
      settingsSubtitle: "تحكم بمعلوماتك الشخصية وتفضيلات العرض والإشعارات وحماية الحساب.",
      lblFullName: "الاسم الكامل *",
      lblPhone: "رقم الهاتف (للتواصل مع المندوب) *",
      lblDistrict: "حي التوصيل والمعاينة الرئيسي بالإسكندرية *",
      lblLang: "لغة الواجهة المفضلة",
      lblTheme: "المظهر والوضع الليلي",
      lblNotifications: "إشعارات الرسائل والشحن",
      btnSaveSettings: "حفظ التعديلات والتفضيلات",
      btnCancelSettings: "إلغاء والعودة للمعلومات",
      sellerTitle: "🏷️ تفاصيل وأنشطة البائع",
      sellerSubtitle: "قائمة السلع التي عرضتها، حالة الفحص بالرؤية الحاسوبية، ومبالغ الاستلام الفوري كاش.",
      btnSellerAdd: "+ تسعير سلعة جديدة",
      thSellerId: "كود السلعة",
      thSellerTitle: "اسم السلعة والموديل",
      thSellerDistrict: "الحي",
      thSellerGrade: "درجة الفحص",
      thSellerPrice: "السعر المعروض",
      thSellerCash: "الكاش الفوري المستحق",
      thSellerStatus: "الحالة",
      thSellerAction: "إجراء",
      buyerTitle: "🛒 تفاصيل وحجوزات المشتري",
      buyerSubtitle: "السلع التي حجزتها مع حق المعاينة والتجربة الكاملة قبل الدفع كاش للمندوب.",
      btnBuyerBrowse: "تصفح المعرض والشراء 🛍️",
      thBuyerDealId: "كود الصفقة",
      thBuyerItemTitle: "اسم السلعة",
      thBuyerPrice: "السعر القطعي",
      thBuyerAddress: "عنوان المعاينة بالإسكندرية",
      thBuyerStatus: "حالة الصفقة",
      thBuyerAction: "تتبع الشحنة",
      deliveryTitle: "🚚 تفاصيل ومهام المندوب",
      deliverySubtitle: "سجل مشاوير المعاينة والاستلام في أحياء الإسكندرية ومبالغ الكاش المحصلة.",
      btnCaptainGate: "الانتقال لبوابة الكابتن 🔐",
      thDeliveryTaskId: "كود المهمة",
      thDeliveryDistrict: "الحي",
      thDeliveryAddress: "عنوان المعاينة",
      thDeliveryCash: "مبلغ التسليم كاش",
      thDeliveryStatus: "الحالة",
      thDeliveryAction: "إجراء"
    },
    // Auth Modal
    authHeadingLogin: "تسجيل الدخول إلى آنتي فصال",
    authHeadingRegister: "إنشاء حساب جديد في آنتي فصال",
    authSubheading: "سعّر، بيع، واشترِ بدون وجع فصال",
    authTabLogin: "تسجيل الدخول",
    authTabRegister: "إنشاء حساب جديد",
    authGoogleBtn: "الدخول السريع بحساب Google",
    authDivider: "أو عبر البريد الإلكتروني",
    authFullName: "الاسم الكامل *",
    authEmail: "البريد الإلكتروني أو اسم المستخدم *",
    authPassword: "كلمة المرور *",
    authRole: "نوع الحساب *",
    authSubmitLogin: "دخول",
    authSubmitRegister: "تسجيل حساب جديد",
    // Chatbot
    botTitle: "🤖 مُقارن آنتي فصال الذكي",
    botOnline: "• متصل الآن",
    botWelcome: "أهلاً بك! 👋 أنا مساعدك الذكي في آنتي فصال. اسألني عن أي سلعة، قارن بين منتجين، أو اطلب ترشيح لأفضل سعر ومواصفات في الإسكندرية!",
    botPlaceholder: "مثال: قارن بين ثلاجة توشيبا وسامسونج...",
    // Product Detail Modal
    specsAi: "🤖 فحص الذكاء الاصطناعي:",
    specsDefects: "🔍 كشف العيوب:",
    specsDelivery: "🚚 التسليم والمعاينة:",
    specsDeliveryVal: "معاينة وتجربة مع المندوب قبل الدفع كاش",
    // Footer
    footerDesc: "المنصة الذكية الأولى لإعادة تداول السلع المستعملة وأتمتة حركة التجارة في الإسكندرية. سعر عادل ومدروس بدون وجع فصال مع حق المعاينة الكاملة كاش.",
    footerSlogan: "Official Slogan: \"سعّر، بيع، ومن غير وجع فصال\"",
    footerColSections: "أقسام المنصة",
    footerColGuides: "أدلة وخدمات",
    footerColDistricts: "أحياء تغطية الإسكندرية 📍",
    footerCopyrightSchool: "مشروع كابستون الذكاء الاصطناعي والأتمتة — مدرسة WE للتكنولوجيا التطبيقية (الصف الثاني — فرع الإسكندرية).",
    footerCopyrightReserved: "© 2026 Anti-Fesal Alexandria. جميع الحقوق محفوظة."
  },
  en: {
    brandName: "Anti-Fesal",
    brandTagline: "Price it, sell it, without bargaining headache",
    sellCta: "Sell with AI Appraisal",
    searchPlaceholder: "Search home appliances, laptops, El-Attarine furniture...",
    langCodeBadge: "عربي",
    langBtnTitle: "التحويل للغة العربية",
    roleLabel: "Role:",
    roles: { seller: "Seller", merchant: "Merchant", driver: "Driver" },
    accountBtn: "Account",
    allDistricts: "All Alexandria 📍",
    districts: {
      "El-Attarine": "El-Attarine",
      "El-Mansheya": "El-Mansheya",
      "Sidi Beshr": "Sidi Beshr",
      "Moharam Bek": "Moharam Bek",
      "Smouha": "Smouha",
      "Miami": "Miami",
      "Loran": "Loran",
      "Gleem": "Gleem",
      "Roushdy": "Roushdy"
    },
    chips: {
      All: "All 🏷️",
      Appliances: "Appliances ❄️",
      Electronics: "Electronics 💻",
      Furniture: "Furniture 🛋️"
    },
    feedStats: (count) => `Showing ${count} verified items in Alexandria`,
    gradeA: "Grade A (Like New)",
    gradeB: "Grade B (Excellent)",
    gradeC: "Grade C (Good)",
    gradeD: "Grade D (Fair)",
    fixedPriceTag: "Fixed Price • No Bargaining",
    aiConfidence: "AI Confidence",
    cleanDefect: "✓ 100% Inspected & Clean",
    reserveBtn: "🛒 Inspect & Reserve",
    askBotBtn: "💬 Ask AI Bot",
    currency: "EGP",
    currencyLong: "Egyptian Pounds",
    loadingMore: "⚡ Loading next batch of items...",
    allLoaded: "✓ All available items displayed",
    emptyShowroomTitle: "No matching items found in this district",
    emptyShowroomSub: "Be the first to list and price your item with AI without bargaining headache!",
    emptyShowroomBtn: "+ Start AI Appraisal Now",
    // Account Page (100% English)
    account: {
      navInfo: "Account Information",
      navSettings: "Account Settings",
      navSeller: "Seller Details",
      navBuyer: "Buyer Details",
      navDelivery: "Delivery Details",
      logout: "Sign Out",
      roleBadge: "Verified Seller & Buyer",
      lblDistrictPrefix: "District:",
      lblEmailPrefix: "Email:",
      lblPhonePrefix: "Phone:",
      trustScore: "4.9 / 5.0 (Trusted in Alexandria)",
      infoTitle: "Account Dashboard & Profile Information",
      infoSubtitle: "Summary of your selling, buying, and dispatch activities across verified Alexandria markets.",
      kpiSellerTitle: "📦 My Seller Listings",
      kpiSellerSub: "AI-inspected with fixed resale value and no bargaining",
      kpiBuyerTitle: "🛒 My Buyer Deals",
      kpiBuyerSub: "Pending cash-on-inspection delivery",
      kpiCashTitle: "💵 Instant Cash Payouts",
      kpiCashSub: "Collected instantly without deductions or headache",
      cardHeader: "📋 Membership & Verification Details",
      cellId: "Membership ID",
      cellDate: "Registration Date",
      cellDistrict: "Alexandria Coverage District",
      cellStatus: "Account Status",
      statusActive: "✓ Verified & Active",
      btnQuickSell: "Sell New Item with AI Appraisal",
      btnQuickShowroom: "Browse Verified Showroom 🛍️",
      settingsTitle: "⚙️ Account Settings & Preferences",
      settingsSubtitle: "Manage your personal profile, display preferences, and notifications.",
      lblFullName: "Full Name *",
      lblPhone: "Phone Number (for Courier Contact) *",
      lblDistrict: "Primary Alexandria District *",
      lblLang: "Interface Language",
      lblTheme: "Appearance & Dark Mode",
      lblNotifications: "SMS & WhatsApp Notifications",
      btnSaveSettings: "Save Preferences",
      btnCancelSettings: "Cancel & Return to Info",
      sellerTitle: "🏷️ Seller Activities & Listings",
      sellerSubtitle: "List of your submitted items, AI vision inspection grades, and instant buyout payouts.",
      btnSellerAdd: "+ Price New Item",
      thSellerId: "Item ID",
      thSellerTitle: "Item Name & Model",
      thSellerDistrict: "District",
      thSellerGrade: "AI Grade",
      thSellerPrice: "Resale Price",
      thSellerCash: "Instant Cash Payout",
      thSellerStatus: "Status",
      thSellerAction: "Action",
      buyerTitle: "🛒 Buyer Reservations & Orders",
      buyerSubtitle: "Your reserved items with 100% hands-on inspection before cash payment.",
      btnBuyerBrowse: "Browse Alexandria Showroom 🛍️",
      thBuyerDealId: "Deal ID",
      thBuyerItemTitle: "Item Name",
      thBuyerPrice: "Locked Price",
      thBuyerAddress: "Inspection Address in Alexandria",
      thBuyerStatus: "Deal Status",
      thBuyerAction: "Track Shipment",
      deliveryTitle: "🚚 Delivery Courier Logs",
      deliverySubtitle: "Record of item pickups, buyer inspection handoffs, and cash collected in Alexandria.",
      btnCaptainGate: "Access Captain Gate 🔐",
      thDeliveryTaskId: "Task ID",
      thDeliveryDistrict: "District",
      thDeliveryAddress: "Inspection Address",
      thDeliveryCash: "Cash to Collect",
      thDeliveryStatus: "Status",
      thDeliveryAction: "Action"
    },
    // Auth Modal
    authHeadingLogin: "Sign in to Anti-Fesal",
    authHeadingRegister: "Create an Anti-Fesal Account",
    authSubheading: "Price it, sell it, without bargaining headache",
    authTabLogin: "Sign In",
    authTabRegister: "Create Account",
    authGoogleBtn: "Quick Sign in with Google",
    authDivider: "or via email & password",
    authFullName: "Full Name *",
    authEmail: "Email or Username *",
    authPassword: "Password *",
    authRole: "Account Role *",
    authSubmitLogin: "Sign In",
    authSubmitRegister: "Register Account",
    // Chatbot
    botTitle: "🤖 Anti-Fesal Smart Comparator",
    botOnline: "• Online Now",
    botWelcome: "Welcome! 👋 I am your Anti-Fesal AI Assistant. Ask about any item, compare products, or get recommendations for the best price in Alexandria!",
    botPlaceholder: "e.g., Compare Toshiba and Samsung refrigerators...",
    // Product Detail Modal
    specsAi: "🤖 AI Inspection:",
    specsDefects: "🔍 Detected Defects:",
    specsDelivery: "🚚 Delivery & Inspection:",
    specsDeliveryVal: "Full hands-on trial with driver before cash payment",
    // Footer
    footerDesc: "Alexandria's premier autonomous AI secondhand re-commerce and merchant automation platform. Fair pricing without bargaining headache, backed by full cash-on-inspection guarantee.",
    footerSlogan: "Official Slogan: \"Price it, sell it, without bargaining headache\"",
    footerColSections: "Platform Portals",
    footerColGuides: "Guides & Tools",
    footerColDistricts: "Alexandria Coverage Areas 📍",
    footerCopyrightSchool: "AI & Automation Capstone Project — WE Applied Technology School (Grade 2 — Alexandria Branch).",
    footerCopyrightReserved: "© 2026 Anti-Fesal Alexandria. All rights reserved."
  }
};

// ------------------ Theme Management (Dark Mode) ------------------
function initTheme() {
  applyTheme(state.theme);
  const btn = document.getElementById('btnThemeToggle');
  if (btn) {
    btn.addEventListener('click', toggleTheme);
  }
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('antifesal_theme', state.theme);
  applyTheme(state.theme);
  showToast(
    state.lang === 'ar' ? 'تم تبديل المظهر' : 'Theme Switched',
    state.theme === 'dark' ? (state.lang === 'ar' ? 'الوضع الليلي مفعّل 🌙' : 'Dark Mode Enabled 🌙') : (state.lang === 'ar' ? 'الوضع النهاري مفعّل ☀️' : 'Light Mode Enabled ☀️'),
    'success'
  );
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('btnThemeToggle');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    btn.title = theme === 'dark' ? 'تبديل للوضع النهاري (Light Mode)' : 'تبديل للوضع الليلي (Dark Mode)';
  }
}

// ------------------ Language Management (100% Bilingual ar / en) ------------------
function initLanguage() {
  applyLanguage(state.lang);
  const btn = document.getElementById('btnLangToggle');
  if (btn) {
    btn.addEventListener('click', toggleLanguage);
  }
}

function toggleLanguage() {
  state.lang = state.lang === 'ar' ? 'en' : 'ar';
  localStorage.setItem('antifesal_lang', state.lang);
  applyLanguage(state.lang);
  showToast(
    state.lang === 'ar' ? 'تم تغيير اللغة' : 'Language Changed',
    state.lang === 'ar' ? 'اللغة العربية مفعلة بالكامل 🇪🇬' : 'English language enabled completely 🇬🇧',
    'success'
  );
}

function applyLanguage(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  const t = i18n[lang] || i18n.ar;
  const btnLang = document.getElementById('btnLangToggle');
  if (btnLang) {
    const codeSpan = document.getElementById('txtLangCode');
    if (codeSpan) codeSpan.innerText = t.langCodeBadge;
    btnLang.title = t.langBtnTitle || (lang === 'ar' ? 'Switch to English' : 'التحويل للعربية');
  }

  // Header Elements
  const txtSellCta = document.getElementById('txtHeaderSellCta');
  if (txtSellCta) txtSellCta.innerText = t.sellCta;

  const searchInput = document.getElementById('headerSearchInput');
  if (searchInput) searchInput.placeholder = t.searchPlaceholder;

  const txtAccount = document.getElementById('txtHeaderAccountLabel');
  if (txtAccount) txtAccount.innerText = t.accountBtn;
  updateHeaderUserDisplay();

  // District Selector Options
  const distSelect = document.getElementById('headerDistrictFilter');
  if (distSelect) {
    Array.from(distSelect.options).forEach(opt => {
      if (opt.value === 'All') opt.innerText = t.allDistricts;
      else if (t.districts[opt.value]) opt.innerText = t.districts[opt.value];
    });
  }

  // Showroom Category Chips
  const chipAll = document.getElementById('chipCatAll');
  if (chipAll) chipAll.innerText = t.chips.All;
  const chipApp = document.getElementById('chipCatAppliances');
  if (chipApp) chipApp.innerText = t.chips.Appliances;
  const chipElec = document.getElementById('chipCatElectronics');
  if (chipElec) chipElec.innerText = t.chips.Electronics;
  const chipFurn = document.getElementById('chipCatFurniture');
  if (chipFurn) chipFurn.innerText = t.chips.Furniture;

  // Account Page Comprehensive Translations (Zero Language Mixing)
  if (t.account) {
    const acc = t.account;
    const setTxt = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.innerText = text;
    };

    // Sidebar & Profile
    setTxt('txtNavInfo', acc.navInfo);
    setTxt('txtNavSettings', acc.navSettings);
    setTxt('txtNavSeller', acc.navSeller);
    setTxt('txtNavBuyer', acc.navBuyer);
    setTxt('txtNavDelivery', acc.navDelivery);
    setTxt('txtAccLogout', acc.logout);
    setTxt('accRoleBadge', acc.roleBadge);
    setTxt('lblAccDistrictPrefix', acc.lblDistrictPrefix);
    setTxt('lblAccEmailPrefix', acc.lblEmailPrefix);
    setTxt('lblAccPhonePrefix', acc.lblPhonePrefix);
    setTxt('accTrustScore', acc.trustScore);

    // Sub-tab 1: Information
    setTxt('txtAccInfoTitle', acc.infoTitle);
    setTxt('txtAccInfoSubtitle', acc.infoSubtitle);
    setTxt('txtKpiSellerTitle', acc.kpiSellerTitle);
    setTxt('txtKpiSellerSub', acc.kpiSellerSub);
    setTxt('txtKpiBuyerTitle', acc.kpiBuyerTitle);
    setTxt('txtKpiBuyerSub', acc.kpiBuyerSub);
    setTxt('txtKpiCashTitle', acc.kpiCashTitle);
    setTxt('txtKpiCashSub', acc.kpiCashSub);
    setTxt('txtAccInfoCardHeader', acc.cardHeader);
    setTxt('lblInfoCellId', acc.cellId);
    setTxt('lblInfoCellDate', acc.cellDate);
    setTxt('lblInfoCellDistrict', acc.cellDistrict);
    setTxt('lblInfoCellStatus', acc.cellStatus);
    setTxt('accDetailStatus', acc.statusActive);
    setTxt('txtBtnQuickSell', acc.btnQuickSell);
    setTxt('txtBtnQuickShowroom', acc.btnQuickShowroom);

    // Sub-tab 2: Settings
    setTxt('txtAccSettingsTitle', acc.settingsTitle);
    setTxt('txtAccSettingsSubtitle', acc.settingsSubtitle);
    setTxt('lblSetFullName', acc.lblFullName);
    setTxt('lblSetPhone', acc.lblPhone);
    setTxt('lblSetDistrict', acc.lblDistrict);
    setTxt('lblSetLang', acc.lblLang);
    setTxt('lblSetTheme', acc.lblTheme);
    setTxt('lblSetNotifications', acc.lblNotifications);
    setTxt('txtBtnSaveSettings', acc.btnSaveSettings);
    setTxt('txtBtnCancelSettings', acc.btnCancelSettings);

    // Sub-tab 3: Seller
    setTxt('txtAccSellerTitle', acc.sellerTitle);
    setTxt('txtAccSellerSubtitle', acc.sellerSubtitle);
    setTxt('txtBtnSellerAdd', acc.btnSellerAdd);
    setTxt('thSellerId', acc.thSellerId);
    setTxt('thSellerTitle', acc.thSellerTitle);
    setTxt('thSellerDistrict', acc.thSellerDistrict);
    setTxt('thSellerGrade', acc.thSellerGrade);
    setTxt('thSellerPrice', acc.thSellerPrice);
    setTxt('thSellerCash', acc.thSellerCash);
    setTxt('thSellerStatus', acc.thSellerStatus);
    setTxt('thSellerAction', acc.thSellerAction);

    // Sub-tab 4: Buyer
    setTxt('txtAccBuyerTitle', acc.buyerTitle);
    setTxt('txtAccBuyerSubtitle', acc.buyerSubtitle);
    setTxt('txtBtnBuyerBrowse', acc.btnBuyerBrowse);
    setTxt('thBuyerDealId', acc.thBuyerDealId);
    setTxt('thBuyerItemTitle', acc.thBuyerItemTitle);
    setTxt('thBuyerPrice', acc.thBuyerPrice);
    setTxt('thBuyerAddress', acc.thBuyerAddress);
    setTxt('thBuyerStatus', acc.thBuyerStatus);
    setTxt('thBuyerAction', acc.thBuyerAction);

    // Sub-tab 5: Delivery
    setTxt('txtAccDeliveryTitle', acc.deliveryTitle);
    setTxt('txtAccDeliverySubtitle', acc.deliverySubtitle);
    setTxt('txtBtnCaptainGate', acc.btnCaptainGate);
    setTxt('thDeliveryTaskId', acc.thDeliveryTaskId);
    setTxt('thDeliveryDistrict', acc.thDeliveryDistrict);
    setTxt('thDeliveryAddress', acc.thDeliveryAddress);
    setTxt('thDeliveryCash', acc.thDeliveryCash);
    setTxt('thDeliveryStatus', acc.thDeliveryStatus);
    setTxt('thDeliveryAction', acc.thDeliveryAction);

    const accDist = document.getElementById('accDistrict');
    if (accDist) accDist.innerText = lang === 'ar' ? 'سيدي بشر' : 'Sidi Beshr';
    const accDetailDist = document.getElementById('accDetailDistrict');
    if (accDetailDist) accDetailDist.innerText = lang === 'ar' ? 'سيدي بشر، الإسكندرية' : 'Sidi Beshr, Alexandria';
  }

  // Modals & Chatbot Translations
  const authHeading = document.getElementById('authModalHeading');
  if (authHeading) {
    const isRegister = document.getElementById('tabBtnRegister')?.classList.contains('active');
    authHeading.innerText = isRegister ? t.authHeadingRegister : t.authHeadingLogin;
  }
  const authSubheading = document.getElementById('authModalSubheading');
  if (authSubheading) authSubheading.innerText = t.authSubheading;
  const tabLogin = document.getElementById('tabBtnLogin');
  if (tabLogin) tabLogin.innerText = t.authTabLogin;
  const tabRegister = document.getElementById('tabBtnRegister');
  if (tabRegister) tabRegister.innerText = t.authTabRegister;
  const googleText = document.getElementById('googleLoginText');
  if (googleText) googleText.innerText = t.authGoogleBtn;
  const authDivText = document.getElementById('authDividerText');
  if (authDivText) authDivText.innerText = t.authDivider;
  const lblName = document.getElementById('labelFullName');
  if (lblName) lblName.innerText = t.authFullName;
  const lblEmail = document.getElementById('labelEmail');
  if (lblEmail) lblEmail.innerText = t.authEmail;
  const lblPass = document.getElementById('labelPassword');
  if (lblPass) lblPass.innerText = t.authPassword;
  const lblRole = document.getElementById('labelRole');
  if (lblRole) lblRole.innerText = t.authRole;
  const authSubmit = document.getElementById('authSubmitText');
  if (authSubmit) {
    const isRegister = document.getElementById('tabBtnRegister')?.classList.contains('active');
    authSubmit.innerText = isRegister ? t.authSubmitRegister : t.authSubmitLogin;
  }

  // Chatbot
  const chatInput = document.getElementById('chatbotInput');
  if (chatInput) chatInput.placeholder = t.botPlaceholder;

  // Footer translations
  const footerDesc = document.querySelector('.site-footer p');
  if (footerDesc) footerDesc.innerText = t.footerDesc;
  const footerSlogan = document.querySelector('.site-footer div[style*="font-family: var(--font-mono)"]');
  if (footerSlogan) footerSlogan.innerText = t.footerSlogan;

  // Re-render showroom list so items match language
  if (state.items && state.items.length > 0) {
    renderShowroomList(false);
  }

  // Reload account data to update table contents in current language
  if (state.currentView === 'account') {
    loadAccountData();
  }
}

// Base API fetch helper with Dev Role header
async function apiRequest(endpoint, options = {}) {
  const headers = options.headers || {};
  headers['X-Dev-Role'] = state.currentRole;
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  options.headers = headers;
  const res = await fetch(endpoint, options);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Network error');
  }
  return res.json();
}

// XSS Sanitizer Utility (Security Audit)
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Toast Notification System (UI/UX Pro Max)
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

  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-body">
      <div class="toast-title">${escapeHTML(title)}</div>
      ${message ? `<div class="toast-message">${escapeHTML(message)}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 300);
  }, 4200);
}

// Format numbers as Egyptian currency
function formatEGP(num) {
  const curr = state.lang === 'ar' ? 'ج.م' : 'EGP';
  return Number(num || 0).toLocaleString('en-US') + ' ' + curr;
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLanguage();
  initAnimatedSearchBar();
  initAuthModal();
  initAccountPortal();
  initRoleSwitcher();
  initNavigation();
  initSearchAndFilters();
  initLazyLoadObserver();
  initSellerIntake();
  initMerchantDashboard();
  initTraderStudio();
  initTierCalculator();
  initDriverAndLogs();
  initPriceIndex();
  initTracking();

  // Load initial feed
  loadShowroomItems();
  loadMetrics();
  handleHashRouting();

  window.addEventListener('hashchange', handleHashRouting);
});

// ------------------ Dev Role Switcher ------------------
function initRoleSwitcher() {
  // Role switcher removed from header per user requirement
}

// ------------------ 11-Portal Navigation ------------------
function initNavigation() {
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetView = tab.dataset.view;
      switchPortalView(targetView);
    });
  });

  // Header Sell CTA
  const btnHeaderSell = document.getElementById('btnHeaderSellCta');
  if (btnHeaderSell) {
    btnHeaderSell.addEventListener('click', () => {
      handleHeaderSellClick();
    });
  }
}

function handleHeaderSellClick() {
  if (!state.currentUser) {
    showToast('تسجيل الدخول أو الانضمام', 'يرجى تسجيل الدخول أو الانضمام كبائع معتمد لفتح استوديو التسعير', 'info');
    openSellerApplyModal();
    return;
  }
  const role = state.currentUser.role;
  if (role === 'seller' || role === 'merchant' || role === 'admin') {
    switchPortalView('seller');
  } else {
    showToast('طلب اعتماد بائع', 'عليك أولاً تقديم طلب انضمام كبائع معتمد لفتح استوديو التسعير بالذكاء الاصطناعي', 'info');
    openSellerApplyModal();
  }
}

function switchPortalView(viewName, updateHash = true) {
  state.currentView = viewName;

  // Update tabs visual state
  document.querySelectorAll('.nav-tab').forEach(tab => {
    if (tab.dataset.view === viewName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Sync mobile bottom nav buttons
  document.querySelectorAll('.mob-nav-btn').forEach(btn => {
    const target = btn.dataset.view;
    if (target === viewName || (target === 'priceIndex' && viewName === 'price-index')) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Show selected view section
  const viewsMap = {
    'showroom': 'viewShowroom',
    'seller': 'viewSeller',
    'merchant': 'viewMerchant',
    'trader-studio': 'viewTraderStudio',
    'driver-logs': 'viewDriverLogs',
    'price-index': 'viewPriceIndex',
    'tracking': 'viewTracking',
    'about': 'viewAbout',
    'account': 'viewAccount',
    'delivery-portal': 'viewDeliveryPortal',
    'admin-portal': 'viewAdminPortal'
  };

  document.querySelectorAll('.portal-view').forEach(view => {
    view.classList.remove('active');
  });

  const activeId = viewsMap[viewName];
  const activeEl = document.getElementById(activeId);
  if (activeEl) {
    activeEl.classList.add('active');
  }

  if (updateHash && window.location.hash !== '#' + viewName) {
    window.location.hash = '#' + viewName;
  }

  // Refresh data for the view
  if (viewName === 'showroom') loadShowroomItems();
  if (viewName === 'merchant') loadMerchantQueue();
  if (viewName === 'trader-studio') populateTraderItemSelect();
  if (viewName === 'driver-logs') {
    loadDispatches();
    loadAuditLogs();
  }
  if (viewName === 'price-index') loadPriceMatrix();
  if (viewName === 'account') loadAccountData();
  if (viewName === 'delivery-portal' && state.captainUnlocked) loadCaptainDeliveryTasks();
  if (viewName === 'admin-portal' && state.adminUnlocked) loadAdminDashboard();
}

// ------------------ Animated Search Bar (Collapsed -> Expanded) ------------------
function initAnimatedSearchBar() {
  const triggerBtn = document.getElementById('btnSearchTrigger');
  const searchBar = document.getElementById('headerSearchBar');
  const closeBtn = document.getElementById('btnSearchClose');
  const input = document.getElementById('headerSearchInput');

  if (!triggerBtn || !searchBar) return;

  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isCollapsed = searchBar.classList.contains('collapsed');
    if (isCollapsed) {
      searchBar.classList.remove('collapsed');
      searchBar.classList.add('expanded');
      triggerBtn.classList.add('active');
      if (input) {
        input.focus();
        input.select();
      }
    } else {
      searchBar.classList.remove('expanded');
      searchBar.classList.add('collapsed');
      triggerBtn.classList.remove('active');
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      searchBar.classList.remove('expanded');
      searchBar.classList.add('collapsed');
      triggerBtn.classList.remove('active');
    });
  }

  // Auto close on outside click
  document.addEventListener('click', (e) => {
    if (!searchBar.contains(e.target) && !triggerBtn.contains(e.target) && searchBar.classList.contains('expanded')) {
      searchBar.classList.remove('expanded');
      searchBar.classList.add('collapsed');
      triggerBtn.classList.remove('active');
    }
  });
}

// ------------------ Search & Filters ------------------
function initSearchAndFilters() {
  const districtSelect = document.getElementById('headerDistrictFilter');
  const searchInput = document.getElementById('headerSearchInput');
  const searchBtn = document.getElementById('headerSearchBtn');
  const catChips = document.querySelectorAll('.category-chip');

  if (districtSelect) {
    districtSelect.addEventListener('change', (e) => {
      state.selectedDistrict = e.target.value;
      if (state.currentView !== 'showroom') switchPortalView('showroom');
      loadShowroomItems();
    });
  }

  if (searchBtn && searchInput) {
    const handleSearch = () => {
      state.searchQuery = searchInput.value.trim();
      if (state.currentView !== 'showroom') switchPortalView('showroom');
      loadShowroomItems();
    };

    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch();
    });
  }

  catChips.forEach(chip => {
    chip.addEventListener('click', () => {
      catChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedCategory = chip.dataset.cat;
      loadShowroomItems();
    });
  });
}

// ------------------ View 1: Showroom Feed & List View with Lazy Loading ------------------
async function loadShowroomItems() {
  const grid = document.getElementById('productGrid');
  const counter = document.getElementById('feedItemsCounter');
  const showroomBadge = document.getElementById('countShowroom');

  // Render Shimmer Skeletons while fetching
  if (grid) {
    grid.innerHTML = Array(4).fill(0).map(() => `
      <div class="skeleton-card" style="height: 180px; display: flex; flex-direction: row; gap: 16px; padding: 12px;">
        <div class="skeleton-img" style="width: 240px; height: 156px; border-radius: 8px;"></div>
        <div class="skeleton-body" style="flex: 1;">
          <div class="skeleton-line" style="width: 30%;"></div>
          <div class="skeleton-line" style="width: 75%; height: 20px; margin: 8px 0;"></div>
          <div class="skeleton-line" style="width: 50%;"></div>
          <div class="skeleton-line" style="width: 35%; height: 26px; margin-top: 14px;"></div>
        </div>
      </div>
    `).join('');
  }

  try {
    let url = '/api/items?limit=60';
    if (state.selectedCategory && state.selectedCategory !== 'All') {
      url += `&category=${encodeURIComponent(state.selectedCategory)}`;
    }
    if (state.selectedDistrict && state.selectedDistrict !== 'All') {
      url += `&district=${encodeURIComponent(state.selectedDistrict)}`;
    }
    if (state.searchQuery) {
      url += `&search=${encodeURIComponent(state.searchQuery)}`;
    }

    const items = await apiRequest(url);
    state.items = items;

    // Filter for approved items in showroom
    state.filteredItems = items.filter(it => it.status === 'AUTO_APPROVED' || it.status === 'DISPATCHED');

    if (showroomBadge) showroomBadge.innerText = state.filteredItems.length;

    renderShowroomList(true);

  } catch (err) {
    console.error('Failed to load showroom items:', err);
    if (grid) grid.innerHTML = `<div style="color: #E00000; text-align: center; padding: 30px;">فشل تحميل المعروضات: ${escapeHTML(err.message)}</div>`;
  }
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
  const t = i18n[state.lang] || i18n.ar;

  if (counter) {
    counter.innerText = t.feedStats(items.length);
  }

  if (items.length === 0) {
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border-color);">
          <div style="font-size: 40px; margin-bottom: 12px;">🌊</div>
          <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main);">${escapeHTML(t.emptyShowroomTitle)}</h3>
          <p style="color: var(--text-muted); font-size: 14px; margin-top: 6px;">${escapeHTML(t.emptyShowroomSub)}</p>
          <button onclick="switchPortalView('seller')" class="btn-crimson-cta" style="margin: 18px auto 0; display: inline-flex;">${escapeHTML(t.emptyShowroomBtn)}</button>
        </div>
      `;
    }
    if (sentinel) sentinel.style.display = 'none';
    return;
  }

  const slice = items.slice(0, state.visibleLimit);

  if (container) {
    container.innerHTML = slice.map((item, idx) => {
      const grade = escapeHTML(item.condition_grade || 'A');
      const gradeClass = (grade === 'A' || grade === 'B') ? 'grade-a' : 'grade-c';
      const gradeText = t['grade' + grade] || (state.lang === 'ar' ? `الفئة ${grade}` : `Grade ${grade}`);

      const defects = item.detected_defects || [];
      const defectLabel = defects.length > 0 
        ? (state.lang === 'en' ? 'Minor cosmetic wear inspected' : escapeHTML(defects[0])) 
        : t.cleanDefect;

      const safeTitle = escapeHTML(item.title);
      const districtRaw = item.district || 'Sidi Beshr';
      const safeDistrict = escapeHTML(t.districts[districtRaw] || districtRaw);
      const safeId = escapeHTML(item.id);
      const confidencePct = Math.round((item.confidence_score || 0.88) * 100);
      const isFav = (state.favorites || []).includes(safeId);
      const catLabel = t.chips[item.category] ? t.chips[item.category].replace(/[🏷️❄️💻🛋️]/g, '').trim() : escapeHTML(item.category);

      // Photo resolving
      let imgSrc = '/static/placeholder.jpg';
      if (item.image_urls && item.image_urls.length > 0) {
        const firstImg = item.image_urls[0];
        imgSrc = firstImg.startsWith('http') || firstImg.startsWith('/') ? firstImg : `/images/${firstImg}`;
      }

      return `
        <div class="product-list-item" style="--item-idx: ${idx % 8};" onclick="openProductDetailModal('${safeId}')">
          <div class="product-list-thumb">
            <button class="btn-react-heart ${isFav ? 'active' : ''}" onclick="toggleFavorite(event, '${safeId}')" title="${isFav ? (state.lang === 'ar' ? 'إزالة من المفضلة' : 'Remove from Favorites') : (state.lang === 'ar' ? 'حفظ في المفضلة' : 'Save to Favorites')}">
              <span class="heart-icon">${isFav ? '❤️' : '🤍'}</span>
            </button>
            <img src="${imgSrc}" loading="lazy" class="product-list-img" alt="${safeTitle}" onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23EEF2F6%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2218%22 fill=%22%2394A3B8%22>${encodeURIComponent(item.category)}</text></svg>'">
            <div class="card-badges">
              <span class="grade-badge ${gradeClass}">${gradeText}</span>
              <span class="fixed-price-tag">${t.fixedPriceTag}</span>
            </div>
          </div>
          <div class="product-list-content">
            <div>
              <div class="product-list-header">
                <span class="category-chip" style="padding: 3px 10px; font-size: 11px;">${catLabel}</span>
                <span style="font-size: 12px; color: var(--grade-emerald); font-weight: 700;">🤖 ${confidencePct}% ${t.aiConfidence}</span>
              </div>
              <h3 class="product-list-title">${safeTitle}</h3>
              <div class="product-list-meta">
                <span>📍 ${safeDistrict}</span>
                <span>•</span>
                <span class="defect-pill" style="margin: 0; padding: 2px 8px; font-size: 12px;">${defectLabel}</span>
              </div>
            </div>
            <div class="product-list-footer">
              <div class="product-list-price-block">
                <span class="product-list-price">${Number(item.expected_resale_price || 0).toLocaleString()}</span>
                <span class="product-list-currency">${t.currency}</span>
              </div>
              <div class="product-list-actions" onclick="event.stopPropagation()">
                <button class="btn-buy-reserve" onclick="openReserveModal('${safeId}', '${safeTitle.replace(/'/g, "\\'")}', ${item.expected_resale_price || 0})">
                  <span>${t.reserveBtn}</span>
                </button>
                <button class="btn-ask-bot" onclick="openAskBotModal('${safeId}', '${safeTitle.replace(/'/g, "\\'")}', ${item.expected_resale_price || 0})">
                  <span>${t.askBotBtn}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Handle Sentinel & Lazy Indicator
  if (sentinel) {
    sentinel.style.display = 'flex';
    if (state.visibleLimit >= items.length) {
      if (lazyInd) {
        lazyInd.innerText = t.allLoaded;
        lazyInd.style.display = 'inline-block';
      }
    } else {
      if (lazyInd) {
        lazyInd.innerText = t.loadingMore;
        lazyInd.style.display = 'none';
      }
    }
  }
}

// ------------------ Reactive Favorite / Heart Micro-interaction ------------------
function toggleFavorite(event, itemId) {
  if (event) event.stopPropagation();
  if (!state.favorites) state.favorites = [];

  const btn = event ? event.currentTarget : null;
  const index = state.favorites.indexOf(itemId);
  const isNowFav = index === -1;

  if (isNowFav) {
    state.favorites.push(itemId);
  } else {
    state.favorites.splice(index, 1);
  }

  localStorage.setItem('antifesal_favorites', JSON.stringify(state.favorites));

  if (btn) {
    btn.classList.add('popping');
    btn.classList.toggle('active', isNowFav);
    const icon = btn.querySelector('.heart-icon');
    if (icon) icon.innerText = isNowFav ? '❤️' : '🤍';
    setTimeout(() => btn.classList.remove('popping'), 460);
  }

  const toastTitle = state.lang === 'ar' ? 'المفضلة' : 'Favorites';
  const toastMsg = isNowFav
    ? (state.lang === 'ar' ? 'تمت إضافة السلعة إلى قائمة تفضيلاتك بنجاح ❤️' : 'Item saved to your Favorites ❤️')
    : (state.lang === 'ar' ? 'تمت إزالة السلعة من المفضلة 🤍' : 'Item removed from Favorites 🤍');
  showToast(toastTitle, toastMsg, 'success');
}

// ------------------ Lazy Loading Intersection Observer ------------------
function initLazyLoadObserver() {
  const sentinel = document.getElementById('showroomScrollSentinel');
  const lazyInd = document.getElementById('lazyIndicator');
  if (!sentinel) return;

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry.isIntersecting && !state.isLoadingMore) {
      if (state.filteredItems && state.visibleLimit < state.filteredItems.length) {
        state.isLoadingMore = true;
        if (lazyInd) lazyInd.style.display = 'inline-block';
        setTimeout(() => {
          state.visibleLimit += 6;
          renderShowroomList(false);
          state.isLoadingMore = false;
        }, 300);
      }
    }
  }, { rootMargin: '180px' });

  observer.observe(sentinel);
}

// ------------------ View 2: Seller Instant AI Appraisal ------------------
function initSellerIntake() {
  const form = document.getElementById('sellerIntakeForm');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('photoFileInput');
  const previewGrid = document.getElementById('previewGrid');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await apiRequest('/api/upload', {
            method: 'POST',
            body: formData
          });
          state.uploadedImages.push(res.url);

          // Add thumbnail preview
          const thumb = document.createElement('img');
          thumb.src = res.url;
          thumb.className = 'preview-thumb';
          previewGrid.appendChild(thumb);
        } catch (uploadErr) {
          console.warn('Image upload error:', uploadErr);
        }
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitAppraisal');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span>⏳ جاري الفحص البصري والتسعير الفوري...</span>`;

      try {
        const payload = {
          title: document.getElementById('sellerTitle').value,
          category: document.getElementById('sellerCategory').value,
          district: document.getElementById('sellerDistrict').value,
          seller_phone: document.getElementById('sellerPhone').value,
          seller_tier: document.getElementById('sellerTier').value,
          description: document.getElementById('sellerDesc').value,
          image_urls: state.uploadedImages.length > 0 ? state.uploadedImages : ['default.jpg'],
          declared_category: document.getElementById('sellerCategory').value,
          seller_id: state.currentUser ? state.currentUser.id : null
        };

        const result = await apiRequest('/api/intake', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        state.currentAppraisalItem = result;
        renderAppraisalReceipt(result);
        loadMetrics();
        showToast('تم الفحص والتسعير بنجاح! ⚡', 'راجع تقرير الفحص والتسعير الفوري بالأسفل', 'success');

      } catch (err) {
        showToast('فشل تقييم السلعة', err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }

  // Accept buyout quote & dispatch driver
  const btnAcceptQuote = document.getElementById('btnAcceptQuote');
  if (btnAcceptQuote) {
    btnAcceptQuote.addEventListener('click', async () => {
      if (!state.currentAppraisalItem) return;
      btnAcceptQuote.disabled = true;
      btnAcceptQuote.innerHTML = '<span>⏳ جاري تعيين أقرب كابتن استلام بالإسكندرية...</span>';

      try {
        const item = state.currentAppraisalItem;
        const settleResult = await apiRequest('/api/settle', {
          method: 'POST',
          body: JSON.stringify({
            item_id: item.item_id,
            buyer_id: 'Platform_Instant_Buyout',
            agreed_price: item.expected_resale_price,
            pickup_address: `الإسكندرية — منطقة ${document.getElementById('sellerDistrict').value}`
          })
        });

        showToast(
          'تم قبول العرض واستدعاء المندوب! 🎉',
          `الكابتن: ${settleResult.dispatch.driver_name} (${settleResult.dispatch.driver_phone}) سيتواصل معك خلال 10 دقائق لتسليم مبلغ (${formatEGP(item.seller_payout_cash)}) كاش فوراً!`,
          'success'
        );
        switchPortalView('driver-logs');
      } catch (err) {
        showToast('فشل استدعاء المندوب', err.message, 'error');
      } finally {
        btnAcceptQuote.disabled = false;
        btnAcceptQuote.innerHTML = '<span>🚚 قبول العرض واستدعاء مندوب الاستلام الفوري</span>';
      }
    });
  }
}

function renderAppraisalReceipt(result) {
  const receipt = document.getElementById('appraisalReceipt');
  if (!receipt) return;

  receipt.style.display = 'flex';
  document.getElementById('receiptTitle').innerText = document.getElementById('sellerTitle').value;
  document.getElementById('receiptCategoryModel').innerText = `${result.category} — ${result.brand_model}`;
  document.getElementById('receiptGrade').innerText = `الفئة ${result.condition_grade}`;
  document.getElementById('receiptConfidence').innerText = `${Math.round(result.confidence_score * 100)}%`;

  const defectsText = result.detected_defects.length > 0 ? result.detected_defects.join('، ') : '✓ لا توجد عيوب';
  document.getElementById('receiptDefects').innerText = defectsText;
  document.getElementById('receiptResalePrice').innerText = formatEGP(result.expected_resale_price);
  document.getElementById('receiptCommission').innerText = `${Math.round(result.commission_rate * 100)}% (${formatEGP(result.commission_amount)})`;
  document.getElementById('receiptInstantPayout').innerText = formatEGP(result.seller_payout_cash);

  const badge = document.getElementById('receiptStatusBadge');
  const actionArea = document.getElementById('receiptActionArea');

  if (result.status === 'AUTO_APPROVED') {
    receipt.className = 'receipt-card approved';
    badge.className = 'receipt-status-pill auto-approved';
    badge.innerText = '✓ معتمد ومفحوص آلياً (Auto-Approved)';
    actionArea.innerHTML = `
      <button id="btnAcceptQuote" class="btn-accept-dispatch">
        <span>🚚 قبول العرض واستدعاء مندوب الاستلام الفوري كاش</span>
      </button>
    `;
    // Reattach click
    document.getElementById('btnAcceptQuote').addEventListener('click', () => {
      document.getElementById('btnAcceptQuote').click();
    });
  } else {
    receipt.className = 'receipt-card pending';
    badge.className = 'receipt-status-pill pending-triage';
    badge.innerText = '⚠️ في انتظار مراجعة التاجر (HITL Triage)';
    actionArea.innerHTML = `
      <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 14px; color: #92400E; font-size: 13px; line-height: 1.5; margin-top: 16px;">
        <strong>ملاحظة فحص الذكاء الاصطناعي:</strong> نسبة الثقة (${Math.round(result.confidence_score * 100)}%) أقل من 80% بسبب تفاصيل العيوب أو وضوح الصور.
        تم تحويل السلعة إلى <strong>طابور مراجعة التاجر (HITL)</strong> لاعتمادها أو تعديل السعر خلال 15 دقيقة فقط!
      </div>
    `;
  }

  receipt.scrollIntoView({ behavior: 'smooth' });
}

// ------------------ View 3: Merchant Dashboard & HITL ------------------
async function loadMetrics() {
  try {
    const metrics = await apiRequest('/api/metrics');
    const totalEl = document.getElementById('kpiTotalItems');
    const rateEl = document.getElementById('kpiAutoApprovalRate');
    const pendingEl = document.getElementById('kpiPendingCount');
    const commEl = document.getElementById('kpiLockedCommission');
    const pendingBadge = document.getElementById('countPendingReview');

    if (totalEl) totalEl.innerText = metrics.total_items;
    if (rateEl) rateEl.innerText = `${metrics.auto_approval_percent}%`;
    if (pendingEl) pendingEl.innerText = metrics.pending_review_count;
    if (pendingBadge) pendingBadge.innerText = metrics.pending_review_count;
    if (commEl) commEl.innerText = formatEGP(metrics.locked_commission_total);
  } catch (err) {
    console.warn('Failed to load metrics:', err);
  }
}

async function loadMerchantQueue() {
  const tbody = document.getElementById('tbodyMerchantQueue');
  if (!tbody) return;

  try {
    const items = await apiRequest('/api/items?status=PENDING_REVIEW&limit=50');
    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 30px; color: #64748B;">
            ✓ طابور المراجعة فارغ تماماً! كافة السلع اعتُمدت آلياً بنجاح.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items.map(item => {
      const conf = Math.round((item.confidence_score || 0.72) * 100);
      const defects = (item.detected_defects || []).join('، ') || 'غير واضحة';
      return `
        <tr>
          <td><code style="font-family: var(--font-mono); font-weight: 700;">${item.id}</code></td>
          <td><strong>${item.title}</strong><div style="font-size: 11px; color: #64748B;">${item.brand_model || ''}</div></td>
          <td>${item.district || 'الإسكندرية'}</td>
          <td><span class="grade-badge grade-c">فئة ${item.condition_grade || 'C'}</span></td>
          <td style="font-family: var(--font-mono); font-weight: 800; color: #D97706;">${conf}%</td>
          <td style="font-size: 12px; color: #475569; max-width: 180px;">${defects}</td>
          <td><strong>${formatEGP(item.expected_resale_price)}</strong></td>
          <td>
            <div class="table-actions">
              <button class="btn-table-action btn-table-approve" onclick="reviewItemAction('${item.id}', 'APPROVE')">اعتماد</button>
              <button class="btn-table-action btn-table-adjust" onclick="openAdjustModal('${item.id}', '${item.title.replace(/'/g, "\\'")}', '${item.condition_grade || 'C'}', ${item.expected_resale_price || 0})">تعديل</button>
              <button class="btn-table-action btn-table-reject" onclick="reviewItemAction('${item.id}', 'REJECT')">رفض</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load merchant queue:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="color: red; text-align: center;">خطأ: ${err.message}</td></tr>`;
  }
}

function initMerchantDashboard() {
  const btnRefresh = document.getElementById('btnRefreshMerchantQueue');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadMerchantQueue();
      loadMetrics();
    });
  }

  // Handle Adjust Form Submit
  const adjustForm = document.getElementById('adjustForm');
  if (adjustForm) {
    adjustForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const itemId = document.getElementById('adjustItemId').value;
      const grade = document.getElementById('adjustGrade').value;
      const price = parseFloat(document.getElementById('adjustPrice').value);
      const notes = document.getElementById('adjustNotes').value;

      try {
        await apiRequest(`/api/review/${itemId}`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'ADJUST',
            corrected_grade: grade,
            corrected_price: price,
            merchant_notes: notes
          })
        });

        closeModal('modalAdjust');
        showToast('تم التعديل والاعتماد', 'تم تعديل واعتماد السلعة بنجاح وتوثيق العملية في سجل corrections.csv!', 'success');
        loadMerchantQueue();
        loadMetrics();
      } catch (err) {
        showToast('فشل التعديل', err.message, 'error');
      }
    });
  }
}

async function reviewItemAction(itemId, action) {
  try {
    await apiRequest(`/api/review/${itemId}`, {
      method: 'POST',
      body: JSON.stringify({ action: action })
    });
    showToast(
      action === 'APPROVE' ? 'تم الاعتماد' : 'تم الرفض',
      `تم تحديث حالة السلعة بنجاح: ${action}`,
      action === 'APPROVE' ? 'success' : 'warning'
    );
    loadMerchantQueue();
    loadMetrics();
  } catch (err) {
    showToast('فشل تنفيذ الإجراء', err.message, 'error');
  }
}

// ------------------ View 4: Trader Studio & Simulator ------------------
function initTraderStudio() {
  const btnGenAds = document.getElementById('btnGenerateAds');
  if (btnGenAds) {
    btnGenAds.addEventListener('click', async () => {
      const select = document.getElementById('selectAdItem');
      const itemId = select.value;
      if (!itemId) return;

      btnGenAds.disabled = true;
      btnGenAds.innerText = 'جاري التوليد...';

      try {
        const res = await apiRequest('/api/marketing/generate', {
          method: 'POST',
          body: JSON.stringify({ item_id: itemId })
        });

        document.getElementById('adFbText').innerText = res.facebook_marketplace;
        document.getElementById('adIgText').innerText = res.instagram_story;
        document.getElementById('adWaText').innerText = res.whatsapp_catalog;
        document.getElementById('adOutputsContainer').style.display = 'block';
        showToast('تم التوليد بنجاح', 'تم تجهيز صياغات فيسبوك وإنستجرام وواتساب مع وسم السعر الثابت', 'success');
      } catch (err) {
        showToast('فشل توليد الإعلانات', err.message, 'error');
      } finally {
        btnGenAds.disabled = false;
        btnGenAds.innerText = 'توليد الإعلانات بضغطة زر ⚡';
      }
    });
  }

  // Interactive Simulator
  const simForm = document.getElementById('simChatForm');
  if (simForm) {
    simForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('simChatInput');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      sendSimPrompt(text);
    });
  }
}

function populateTraderItemSelect() {
  const select = document.getElementById('selectAdItem');
  if (!select) return;
  const approved = state.items.filter(it => it.status === 'AUTO_APPROVED');
  if (approved.length === 0) {
    select.innerHTML = '<option value="">لا توجد سلع معتمدة حالياً</option>';
    return;
  }
  select.innerHTML = approved.map(it => `
    <option value="${it.id}">${it.title} (${it.district || 'الإسكندرية'}) — ${formatEGP(it.expected_resale_price)}</option>
  `).join('');
}

async function sendSimPrompt(promptText) {
  const chatBox = document.getElementById('simChatBox');
  if (!chatBox) return;

  // Add Buyer Bubble (sanitized)
  const buyerBubble = document.createElement('div');
  buyerBubble.className = 'chat-bubble buyer';
  buyerBubble.innerHTML = `<div>${escapeHTML(promptText)}</div><div class="chat-meta">المشتري • الآن</div>`;
  chatBox.appendChild(buyerBubble);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Add Typing Indicator
  const typingBubble = document.createElement('div');
  typingBubble.className = 'chat-bubble bot';
  typingBubble.innerHTML = `
    <div class="typing-indicator">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
    <div class="chat-meta">آنتي فصال يكتب الآن...</div>
  `;
  chatBox.appendChild(typingBubble);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Get active item id
  const select = document.getElementById('selectAdItem');
  const itemId = select && select.value ? select.value : (state.items[0] ? state.items[0].id : 'AF-1001');

  try {
    const startTime = Date.now();
    const res = await apiRequest('/api/autoreply', {
      method: 'POST',
      body: JSON.stringify({
        item_id: itemId,
        buyer_message: promptText
      })
    });

    const elapsed = Date.now() - startTime;
    if (elapsed < 350) {
      await new Promise(r => setTimeout(r, 350 - elapsed));
    }

    if (typingBubble.parentNode) typingBubble.parentNode.removeChild(typingBubble);

    // Add Bot Bubble
    const botBubble = document.createElement('div');
    botBubble.className = 'chat-bubble bot';
    botBubble.innerHTML = `
      <div style="white-space: pre-wrap;">${escapeHTML(res.reply_text)}</div>
      <div class="chat-meta">⚡ سرعة الرد: ${res.response_time_ms}ms • النية: ${escapeHTML(res.intent_detected)}</div>
    `;
    chatBox.appendChild(botBubble);
    chatBox.scrollTop = chatBox.scrollHeight;

  } catch (err) {
    if (typingBubble.parentNode) typingBubble.parentNode.removeChild(typingBubble);
    const errBubble = document.createElement('div');
    errBubble.className = 'chat-bubble bot';
    errBubble.innerHTML = `<div>عذراً، حدث خطأ أثناء معالجة الرد: ${escapeHTML(err.message)}</div>`;
    chatBox.appendChild(errBubble);
  }
}

function copyAdText(elementId) {
  const text = document.getElementById(elementId).innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('تم النسخ', 'تم نسخ نص الإعلان إلى الحافظة بنجاح! 📋', 'success');
  });
}

// ------------------ View 5: Driver Dispatch & Live Logs ------------------
function initDriverAndLogs() {
  const btnRefreshDisp = document.getElementById('btnRefreshDispatches');
  if (btnRefreshDisp) {
    btnRefreshDisp.addEventListener('click', loadDispatches);
  }

  const btnRunCatalog = document.getElementById('btnRunCatalogLoop');
  if (btnRunCatalog) {
    btnRunCatalog.addEventListener('click', async () => {
      btnRunCatalog.disabled = true;
      btnRunCatalog.innerText = 'جاري مسح المعروضات وفلترة السجلات الفاسدة...';
      const resultDiv = document.getElementById('catalogLoopResult');

      try {
        const res = await apiRequest('/api/catalog/run', { method: 'POST' });
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
          ✓ تم فحص ${res.total_examined} بند | تم اعتماد وإضافة ${res.valid_items_count} بند إلى الكتالوج | تم استبعاد وتوثيق ${res.skipped_items_count} بند فاسد في skipped_items_log.csv.<br>
          معدل الجودة: <strong>${res.reliability_percent}%</strong> | مسار الكتالوج: <code>${res.catalog_path}</code>
        `;
        loadAuditLogs();
        showToast('اكتمل فحص الكتالوج', `تم فحص ${res.total_examined} بند واعتماد ${res.valid_items_count} بنجاح`, 'success');
      } catch (err) {
        showToast('فشل تشغيل حلقة الكتالوج', err.message, 'error');
      } finally {
        btnRunCatalog.disabled = false;
        btnRunCatalog.innerText = 'تشغيل Workflow 2 وفحص البيانات 🚀';
      }
    });
  }

  // Log Tab Switchers
  const logTabs = document.querySelectorAll('.btn-log-tab');
  logTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      logTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentLogTab = tab.dataset.log;
      loadAuditLogs();
    });
  });

  const btnRefreshLogs = document.getElementById('btnRefreshLogs');
  if (btnRefreshLogs) {
    btnRefreshLogs.addEventListener('click', loadAuditLogs);
  }
}

async function loadDispatches() {
  const tbody = document.getElementById('tbodyDispatches');
  if (!tbody) return;

  try {
    const dispatches = await apiRequest('/api/dispatches?limit=30');
    if (dispatches.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #64748B; padding: 24px;">لا توجد مهام مناديب نشطة حالياً.</td></tr>`;
      return;
    }

    tbody.innerHTML = dispatches.map(d => {
      const isCompleted = d.status === 'COMPLETED';
      return `
        <tr>
          <td><code style="font-family: var(--font-mono); font-weight: 700;">${d.id}</code></td>
          <td><code style="font-family: var(--font-mono);">${d.item_id}</code></td>
          <td>📍 ${d.district}</td>
          <td style="font-size: 12px; max-width: 180px;">${d.pickup_address}</td>
          <td><strong>${d.driver_name}</strong><div style="font-size: 11px; color: #64748B;">${d.driver_phone || ''}</div></td>
          <td style="color: var(--grade-emerald); font-weight: 800;">${formatEGP(d.payout_cash)}</td>
          <td style="font-family: var(--font-mono);">${d.retry_count || 0}</td>
          <td><span class="receipt-status-pill ${isCompleted ? 'auto-approved' : 'pending-triage'}">${d.status}</span></td>
          <td>
            ${isCompleted ? '✓ مكتمل' : `<button class="btn-table-action btn-table-approve" onclick="updateDispatch('${d.id}', 'COMPLETED')">تأكيد التسليم كاش</button>`}
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="color: red; text-align: center;">خطأ: ${err.message}</td></tr>`;
  }
}

async function updateDispatch(dispatchId, status) {
  try {
    await apiRequest(`/api/dispatches/${dispatchId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: status })
    });
    showToast('تم تحديث المهمة', `تم تغيير حالة المهمة إلى ${status}`, 'success');
    loadDispatches();
  } catch (err) {
    showToast('فشل التحديث', err.message, 'error');
  }
}

async function loadAuditLogs() {
  const thead = document.getElementById('logThead');
  const tbody = document.getElementById('logTbody');
  if (!thead || !tbody) return;

  const tab = state.currentLogTab;
  let endpoint = `/api/logs/${tab}`;

  try {
    const logs = await apiRequest(endpoint);

    if (tab === 'automation') {
      thead.innerHTML = `<tr><th>Timestamp</th><th>Event Type</th><th>Item ID</th><th>Execution (ms)</th><th>Status</th><th>Details</th></tr>`;
      tbody.innerHTML = logs.map(l => `
        <tr>
          <td>${l.timestamp ? l.timestamp.split('T')[1].slice(0, 8) : ''}</td>
          <td style="color: #60A5FA; font-weight: 700;">${l.event_type}</td>
          <td>${l.item_id}</td>
          <td style="color: #34D399;">${l.execution_time_ms}ms</td>
          <td>${l.status}</td>
          <td style="color: #94A3B8;">${l.details}</td>
        </tr>
      `).join('');
    } else if (tab === 'skipped') {
      thead.innerHTML = `<tr><th>Timestamp</th><th>Item ID</th><th>Title</th><th>Category</th><th>Quoted Price</th><th>Skipped Reason</th></tr>`;
      tbody.innerHTML = logs.map(l => `
        <tr>
          <td>${l.timestamp ? l.timestamp.split('T')[1].slice(0, 8) : ''}</td>
          <td>${l.item_id}</td>
          <td>${l.title}</td>
          <td>${l.category || '[EMPTY]'}</td>
          <td style="color: #F87171;">${l.quoted_price}</td>
          <td style="color: #FBBF24; font-weight: 700;">${l.reason}</td>
        </tr>
      `).join('');
    } else if (tab === 'corrections') {
      thead.innerHTML = `<tr><th>Timestamp</th><th>Item ID</th><th>Orig Grade</th><th>Corr Grade</th><th>Orig Price</th><th>Corr Price</th><th>Merchant Notes</th><th>Reviewer</th></tr>`;
      tbody.innerHTML = logs.map(l => `
        <tr>
          <td>${l.timestamp ? l.timestamp.split('T')[1].slice(0, 8) : ''}</td>
          <td>${l.item_id}</td>
          <td>${l.original_grade}</td>
          <td style="color: #34D399; font-weight: 700;">${l.corrected_grade}</td>
          <td>${l.original_price}</td>
          <td style="color: #34D399; font-weight: 700;">${l.corrected_price}</td>
          <td>${l.merchant_notes}</td>
          <td style="color: #60A5FA;">${l.reviewer_id}</td>
        </tr>
      `).join('');
    }

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color: red;">خطأ في جلب السجلات: ${err.message}</td></tr>`;
  }
}

// ------------------ Modal Dialog Handlers ------------------
function openReserveModal(itemId, title, price) {
  document.getElementById('reserveItemId').value = itemId;
  document.getElementById('reserveItemTitle').value = title;
  document.getElementById('reserveItemPrice').value = Number(price).toLocaleString();
  document.getElementById('modalReserve').classList.add('active');
}

function openAdjustModal(itemId, title, grade, price) {
  document.getElementById('adjustItemId').value = itemId;
  document.getElementById('adjustTitle').value = title;
  document.getElementById('adjustGrade').value = grade;
  document.getElementById('adjustPrice').value = price;
  document.getElementById('adjustNotes').value = '';
  document.getElementById('modalAdjust').classList.add('active');
}

function openAskBotModal(itemId, title, price) {
  state.activeBotItemId = itemId;
  const isAr = state.lang === 'ar';
  document.getElementById('botModalTitle').innerText = isAr ? `💬 استفسر عن: ${title}` : `💬 Inquire about: ${title}`;
  const greeting = isAr
    ? `أهلاً بك! بخصوص "${title}"، سعره القطعي ${formatEGP(price)}، ومتاح للمعاينة فوراً كاش مع المندوب. تحب تسأل عن إيه؟`
    : `Hello! Regarding "${title}", the fixed price is ${formatEGP(price)}, and it is available for immediate hands-on inspection. How can I help you?`;
  const chatBox = document.getElementById('botModalChatBox');
  chatBox.innerHTML = `
    <div class="chat-bubble bot">
      <div>${escapeHTML(greeting)}</div>
      <div class="chat-meta">${isAr ? 'آنتي فصال • الآن' : 'Anti-Fesal • Just now'}</div>
    </div>
  `;
  document.getElementById('modalAskBot').classList.add('active');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('active');
}

// Global Backdrop Click & Escape Key to Dismiss Modals (UI/UX Pro Max)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

document.addEventListener('click', (e) => {
  if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// Handle Reservation Form Submit (Workflow 3)
const reserveForm = document.getElementById('reserveForm');
if (reserveForm) {
  reserveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemId = document.getElementById('reserveItemId').value;
    const phone = document.getElementById('reserveBuyerPhone').value;
    const address = document.getElementById('reserveAddress').value;

    try {
      const res = await apiRequest('/api/settle', {
        method: 'POST',
        body: JSON.stringify({
          item_id: itemId,
          buyer_id: phone,
          pickup_address: address
        })
      });

      closeModal('modalReserve');
      showToast(
        'تم حجز السلعة بنجاح! 🎊',
        `كود الصفقة: ${res.deal_id} — الكابتن: ${res.dispatch.driver_name} سيتواصل معك للتنسيق والتسليم كاش فوراً.`,
        'success'
      );
      loadShowroomItems();
      loadMetrics();
    } catch (err) {
      showToast('فشل الحجز', err.message, 'error');
    }
  });
}

// Handle Ask Bot Modal Form Submit
const botModalForm = document.getElementById('botModalForm');
if (botModalForm) {
  botModalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('botModalInput');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';

    const chatBox = document.getElementById('botModalChatBox');
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble buyer';
    userBubble.innerHTML = `<div>${escapeHTML(msg)}</div><div class="chat-meta">المشتري • الآن</div>`;
    chatBox.appendChild(userBubble);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Typing indicator
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble bot';
    typingBubble.innerHTML = `
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
      <div class="chat-meta">آنتي فصال يكتب الآن...</div>
    `;
    chatBox.appendChild(typingBubble);
    chatBox.scrollTop = chatBox.scrollHeight;

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
      if (elapsed < 350) {
        await new Promise(r => setTimeout(r, 350 - elapsed));
      }

      if (typingBubble.parentNode) typingBubble.parentNode.removeChild(typingBubble);

      const botBubble = document.createElement('div');
      botBubble.className = 'chat-bubble bot';
      botBubble.innerHTML = `
        <div style="white-space: pre-wrap;">${escapeHTML(res.reply_text)}</div>
        <div class="chat-meta">⚡ سرعة الرد: ${res.response_time_ms}ms • النية: ${escapeHTML(res.intent_detected)}</div>
      `;
      chatBox.appendChild(botBubble);
      chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) {
      if (typingBubble.parentNode) typingBubble.parentNode.removeChild(typingBubble);
      const errBubble = document.createElement('div');
      errBubble.className = 'chat-bubble bot';
      errBubble.innerHTML = `<div>خطأ: ${escapeHTML(err.message)}</div>`;
      chatBox.appendChild(errBubble);
    }
  });
}

// ------------------ View 6: Price Matrix & Benchmarks ------------------
function initPriceIndex() {
  const catFilter = document.getElementById('priceIndexCategoryFilter');
  const searchInput = document.getElementById('priceIndexSearchInput');

  if (catFilter) {
    catFilter.addEventListener('change', () => loadPriceMatrix());
  }

  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadPriceMatrix(), 300);
    });
  }
}

async function loadPriceMatrix() {
  const tbody = document.getElementById('tbodyPriceMatrix');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #64748B;">جاري تحميل مؤشر أسعار المستعمل بالإسكندرية...</td></tr>`;

  try {
    const cat = document.getElementById('priceIndexCategoryFilter')?.value || 'All';
    const search = document.getElementById('priceIndexSearchInput')?.value || '';

    let url = '/api/price-matrix?';
    if (cat && cat !== 'All') url += `category=${encodeURIComponent(cat)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const data = await apiRequest(url);

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px; color: #94A3B8;">لا توجد نتائج مطابقة لبحثك في مصفوفة الأسعار.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(row => `
      <tr>
        <td><strong>${escapeHTML(row.category)}</strong></td>
        <td><strong>${escapeHTML(row.brand_model)}</strong></td>
        <td style="color: #64748B; font-weight: 700;">${formatEGP(row.market_base_price_egp)}</td>
        <td><span class="badge-grade-mini grade-a">${formatEGP(row.grade_a_price)}</span></td>
        <td><span class="badge-grade-mini grade-b">${formatEGP(row.grade_b_price)}</span></td>
        <td><span class="badge-grade-mini grade-c">${formatEGP(row.grade_c_price)}</span></td>
        <td><span class="badge-grade-mini grade-d">${formatEGP(row.grade_d_price)}</span></td>
        <td style="font-family: var(--font-mono); color: #475569;">${Math.round(row.depreciation_rate_annual * 100)}% سنوياً</td>
        <td>
          <button class="btn-table-action btn-table-approve" onclick="prefillSellerFromMatrix('${escapeHTML(row.category)}', '${escapeHTML(row.brand_model).replace(/'/g, "\\'")}')">
            سعّر الآن ⚡
          </button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="color: red; text-align: center;">خطأ: ${escapeHTML(err.message)}</td></tr>`;
  }
}

function prefillSellerFromMatrix(category, model) {
  switchPortalView('seller');
  const catInput = document.getElementById('sellerCategory');
  const titleInput = document.getElementById('sellerTitle');
  if (catInput) catInput.value = category;
  if (titleInput) titleInput.value = model;
  showToast('تم اختيار الموديل', `تم تعبئة ${model} في نموذج التسعير`, 'success');
}

// ------------------ View 7: Order & Driver Tracking Center ------------------
function initTracking() {
  const form = document.getElementById('trackingSearchForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = document.getElementById('trackingQueryInput').value.trim();
      if (query) trackOrder(query);
    });
  }
}

function quickTrack(query) {
  const input = document.getElementById('trackingQueryInput');
  if (input) input.value = query;
  trackOrder(query);
}

let trackingMapInstance = null;
let trackingMarkers = [];
let trackingPolyline = null;

async function trackOrder(query) {
  const placeholder = document.getElementById('trackingPlaceholder');
  const resultArea = document.getElementById('trackingResultArea');

  try {
    const data = await apiRequest(`/api/track/${encodeURIComponent(query)}`);

    if (placeholder) placeholder.style.display = 'none';
    if (resultArea) resultArea.style.display = 'grid';

    // Header info
    document.getElementById('trackHeaderTitle').innerText = `📍 مسار الشحنة: ${data.deal?.id || data.dispatch?.id || query}`;
    document.getElementById('trackHeaderMeta').innerText = `تاريخ المعاملة: ${data.deal?.created_at || data.dispatch?.created_at || 'الآن'}`;

    // Try to fetch live tracking stage and coordinates if dispatch ID is available
    let liveData = null;
    if (data.dispatch && data.dispatch.id) {
      try {
        liveData = await apiRequest(`/api/dispatches/${encodeURIComponent(data.dispatch.id)}/live-tracking`);
      } catch (e) {
        console.warn('Live tracking endpoint fallback:', e);
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
      statusBadge.innerText = isCompleted ? '✓ مكتملة ومسلّمة' : '🚚 جارية بالحي';
      statusBadge.className = `receipt-status-pill ${isCompleted ? 'auto-approved' : 'pending-triage'}`;
    }

    // Top Buyer Notification Banner
    const notifBanner = document.getElementById('trackNotificationBanner');
    const notifText = document.getElementById('trackNotificationText');
    if (notifBanner) {
      if (currentStep === 'PICKED_UP' || currentStep === 'OUT_FOR_DELIVERY') {
        notifBanner.style.display = 'flex';
        if (notifText) {
          notifText.innerText = currentStep === 'PICKED_UP'
            ? `🚚 الكابتن ${escapeHTML(data.dispatch?.driver_name || 'أحمد')} استلم السلعة من البائع وسلّمه الكاش الفوري، وهو الآن في الطريق إليك للمعاينة والتجربة!`
            : `🚚 الكابتن في خط سيره إليك الآن بشوارع ${escapeHTML(data.dispatch?.district || 'الإسكندرية')} ومعه السلعة للمعاينة والتجربة قبل الدفع!`;
        }
      } else {
        notifBanner.style.display = 'none';
      }
    }

    // 5-Stage Stepper Generation
    const stepper = document.getElementById('trackStepper');
    const stepNodes = [
      {
        key: 'ORDER_PLACED',
        num: '1',
        title: 'تم قبول العرض وتثبيت السعر القطعي',
        desc: 'تم تأكيد الطلب وحجز السلعة وتثبيت عمولة الوساطة بنجاح بدون وجع فصال.',
        time: data.deal?.created_at ? data.deal.created_at.replace('T', ' ').slice(0, 16) : 'مؤكد'
      },
      {
        key: 'DRIVER_ASSIGNED',
        num: '2',
        title: 'تم تعيين كابتن الاستلام والتوصيل',
        desc: `تم إسناد المهمة للكابتن <strong>${escapeHTML(data.dispatch?.driver_name || 'جاري التعيين')}</strong> لتغطية منطقة ${escapeHTML(data.dispatch?.district || data.item?.district || 'الإسكندرية')}.`,
        time: data.dispatch?.driver_phone ? `هاتف: ${data.dispatch.driver_phone}` : ''
      },
      {
        key: 'PICKED_UP',
        num: '3',
        title: 'الكابتن استلم السلعة وسلّم الكاش للبائع',
        desc: `تم فحص السلعة أولياً وتسليم مبلغ <strong>${formatEGP(data.dispatch?.payout_cash || data.item?.seller_payout_cash || 0)}</strong> كاش فوري للبائع يد بيد.`,
        time: 'إشعار فوري للمشتري 🔔'
      },
      {
        key: 'OUT_FOR_DELIVERY',
        num: '4',
        title: 'المندوب في الطريق للمعاينة والتجربة',
        desc: `يتوجه الكابتن إلى عنوان العميل: <strong>${escapeHTML(data.dispatch?.pickup_address || 'العنوان المسجل')}</strong> مع حق المعاينة الكاملة قبل دفع أي مليم.`,
        time: 'تتبع مباشر عبر الـ GPS 📡'
      },
      {
        key: 'DELIVERED_SETTLED',
        num: '5',
        title: 'تمت المعاينة بنجاح وتسليم المبلغ وإتمام الصفقة',
        desc: 'استلم المشتري السلعة بعد التأكد من مطابقتها للفحص وتم تحصيل المبلغ بدون فصال.',
        time: isCompleted ? 'تم الإغلاق بنجاح ✓' : 'بانتظار المعاينة'
      }
    ];

    stepper.innerHTML = stepNodes.map((s, idx) => {
      const isDone = idx < currentIndex || (idx === currentIndex && isCompleted);
      const isActive = idx === currentIndex && !isCompleted;
      const statusClass = isDone ? 'completed' : (isActive ? 'active' : '');
      const iconText = isDone ? '✓' : s.num;

      return `
        <div class="step-node ${statusClass}">
          <div class="step-circle">${iconText}</div>
          <div class="step-content">
            <div class="step-title">${s.title}</div>
            <div class="step-desc">${s.desc}</div>
            <div class="step-time">${s.time}</div>
          </div>
        </div>
      `;
    }).join('');

    // Driver & Item Info
    if (data.dispatch) {
      document.getElementById('trackDriverName').innerText = data.dispatch.driver_name || 'كابتن معتمد';
      document.getElementById('trackDriverPhone').innerText = data.dispatch.driver_phone || '01234567890';
      document.getElementById('trackDriverDistrict').innerText = data.dispatch.district || 'الإسكندرية';
      document.getElementById('trackAddress').innerText = data.dispatch.pickup_address || 'الإسكندرية';
      document.getElementById('trackPayoutCash').innerText = formatEGP(data.dispatch.payout_cash);
    }

    if (data.item) {
      document.getElementById('trackItemTitle').innerText = data.item.title;
      document.getElementById('trackItemGrade').innerText = `✓ Grade ${data.item.condition_grade}`;
      document.getElementById('trackItemPrice').innerText = formatEGP(data.item.expected_resale_price);
    }

    // Render Leaflet Map
    renderLiveTrackingMap(
      liveData?.pickup_coords || { lat: 31.1925, lng: 29.8975 },
      liveData?.delivery_coords || { lat: 31.2588, lng: 30.0125 },
      liveData?.driver_coords || { lat: 31.2250, lng: 29.9550 },
      data.dispatch?.district || 'الإسكندرية'
    );

    // ETA & Legend
    const etaBadge = document.getElementById('trackEtaBadge');
    if (etaBadge) {
      const eta = liveData?.calculated_eta_mins || (currentStep === 'DELIVERED_SETTLED' ? 0 : 14);
      etaBadge.innerText = currentStep === 'DELIVERED_SETTLED' ? '✓ تم الوصول والتسليم' : `⏳ الوقت المتوقع للوصول: ${eta} دقيقة`;
    }

    const legSeller = document.getElementById('mapLegendSeller');
    const legBuyer = document.getElementById('mapLegendBuyer');
    const legDriver = document.getElementById('mapLegendDriver');
    if (legSeller) legSeller.innerText = data.item?.district || 'العطارين';
    if (legBuyer) legBuyer.innerText = data.dispatch?.district || 'سيدي بشر';
    if (legDriver) legDriver.innerText = (data.dispatch?.driver_name || 'كابتن أحمد') + ' (على خط السير)';

  } catch (err) {
    showToast('لم يتم العثور على الشحنة', err.message, 'warning');
  }
}

function renderLiveTrackingMap(pickupCoords, deliveryCoords, driverCoords, districtName) {
  const mapEl = document.getElementById('liveTrackingMap');
  if (!mapEl || typeof L === 'undefined') return;

  const sellerLoc = (pickupCoords && pickupCoords.lat) ? [pickupCoords.lat, pickupCoords.lng] : [31.1925, 29.8975];
  const buyerLoc = (deliveryCoords && deliveryCoords.lat) ? [deliveryCoords.lat, deliveryCoords.lng] : [31.2588, 30.0125];
  const driverLoc = (driverCoords && driverCoords.lat) ? [driverCoords.lat, driverCoords.lng] : [
    (sellerLoc[0] + buyerLoc[0]) / 2,
    (sellerLoc[1] + buyerLoc[1]) / 2
  ];

  if (!trackingMapInstance) {
    trackingMapInstance = L.map('liveTrackingMap').setView(driverLoc, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap | Anti-Fesal Alexandria'
    }).addTo(trackingMapInstance);
  } else {
    setTimeout(() => {
      trackingMapInstance.invalidateSize();
      trackingMapInstance.setView(driverLoc, 12);
    }, 100);
  }

  // Clear previous markers
  trackingMarkers.forEach(m => trackingMapInstance.removeLayer(m));
  trackingMarkers = [];
  if (trackingPolyline) {
    trackingMapInstance.removeLayer(trackingPolyline);
    trackingPolyline = null;
  }

  // Custom marker icons
  const sellerIcon = L.divIcon({
    html: '<div style="font-size: 26px; text-shadow: 0 2px 5px rgba(0,0,0,0.3);">🏪</div>',
    className: 'map-custom-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  const buyerIcon = L.divIcon({
    html: '<div style="font-size: 26px; text-shadow: 0 2px 5px rgba(0,0,0,0.3);">🏠</div>',
    className: 'map-custom-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  const driverIcon = L.divIcon({
    html: '<div style="font-size: 28px; animation: pulseDot 2s infinite; text-shadow: 0 2px 6px rgba(224,0,0,0.4);">🚚</div>',
    className: 'map-custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  const mSeller = L.marker(sellerLoc, { icon: sellerIcon }).addTo(trackingMapInstance)
    .bindPopup('<b>🏪 نقطة الاستلام (البائع)</b><br>حي الاستلام المعتمد بالإسكندرية');
  const mDriver = L.marker(driverLoc, { icon: driverIcon }).addTo(trackingMapInstance)
    .bindPopup('<b>🚚 موقع الكابتن المباشر (Live GPS)</b><br>جاري نقل السلعة للمعاينة والتجربة');
  const mBuyer = L.marker(buyerLoc, { icon: buyerIcon }).addTo(trackingMapInstance)
    .bindPopup('<b>🏠 عنوان المعاينة (المشتري)</b><br>المعاينة والتسليم كاش بدون فصال');

  trackingMarkers.push(mSeller, mDriver, mBuyer);

  // Route Polyline
  trackingPolyline = L.polyline([sellerLoc, driverLoc, buyerLoc], {
    color: '#E00000',
    weight: 3,
    dashArray: '6, 8',
    opacity: 0.85
  }).addTo(trackingMapInstance);

  try {
    const group = L.featureGroup([mSeller, mDriver, mBuyer]);
    trackingMapInstance.fitBounds(group.getBounds().pad(0.2));
  } catch (e) {
    // ignore bounds calculation on hidden containers
  }
}

function refreshLiveTrackingMap() {
  const query = document.getElementById('trackingQueryInput')?.value.trim();
  if (query) {
    trackOrder(query);
    showToast('تحديث الخريطة', 'تم تحديث إحداثيات ومسار الكابتن بنجاح 🔄', 'info');
  }
}
window.refreshLiveTrackingMap = refreshLiveTrackingMap;

// ------------------ Merchant Tier & Savings Calculator ------------------
function initTierCalculator() {
  const slider = document.getElementById('calcVolumeSlider');
  if (!slider) return;

  const updateCalc = () => {
    const volume = Number(slider.value);
    document.getElementById('calcVolumeDisplay').innerText = formatEGP(volume);

    // Fee amounts
    const feeEveryday = Math.round(volume * 0.08);
    const feePro = Math.round(volume * 0.05);
    const feeEnterprise = Math.round(volume * 0.03);

    // Savings
    const savingsPro = feeEveryday - feePro;
    const savingsEnterprise = feeEveryday - feeEnterprise;

    document.getElementById('calcFeeEveryday').innerText = formatEGP(feeEveryday);
    document.getElementById('calcFeePro').innerText = formatEGP(feePro);
    document.getElementById('calcFeeEnterprise').innerText = formatEGP(feeEnterprise);

    document.getElementById('calcSavingsPro').innerText = `وفر ${formatEGP(savingsPro)} شهرياً! 🎉`;
    document.getElementById('calcSavingsEnterprise').innerText = `وفر ${formatEGP(savingsEnterprise)} شهرياً! 🚀`;
  };

  slider.addEventListener('input', updateCalc);
  updateCalc();
}

// ------------------ Product Detail Modal Handlers ------------------
async function openProductDetailModal(itemId) {
  let item = state.items.find(it => it.id === itemId);
  if (!item) {
    try {
      item = await apiRequest(`/api/items/${itemId}`);
    } catch (e) {
      showToast('خطأ', 'لم يتم العثور على السلعة', 'error');
      return;
    }
  }

  // Populate Image
  let imgSrc = '/static/placeholder.jpg';
  if (item.image_urls && item.image_urls.length > 0) {
    const firstImg = item.image_urls[0];
    imgSrc = firstImg.startsWith('http') || firstImg.startsWith('/') ? firstImg : `/images/${firstImg}`;
  }
  const imgEl = document.getElementById('detailImg');
  if (imgEl) {
    imgEl.src = imgSrc;
    imgEl.onerror = () => {
      imgEl.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="100%" height="100%" fill="%23EEF2F6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%2394A3B8">Anti-Fesal</text></svg>';
    };
  }

  // Populate Details
  const t = i18n[state.lang] || i18n.ar;
  const grade = escapeHTML(item.condition_grade || 'A');
  const gradeText = t['grade' + grade] || (state.lang === 'ar' ? `الفئة ${grade}` : `Grade ${grade}`);

  document.getElementById('detailDistrict').innerText = item.district || (state.lang === 'ar' ? 'الإسكندرية' : 'Alexandria');
  document.getElementById('detailGradeBadge').innerText = `✓ ${gradeText}`;
  document.getElementById('detailTitle').innerText = item.title;
  document.getElementById('detailCategoryModel').innerText = `${item.category} — ${item.brand_model || item.title}`;
  document.getElementById('detailPrice').innerText = Number(item.expected_resale_price || 0).toLocaleString();
  
  const currLabel = document.querySelector('#modalProductDetail .currency-label');
  if (currLabel) currLabel.innerText = t.currencyLong;

  document.getElementById('detailConfidence').innerText = `${Math.round((item.confidence_score || 0.88) * 100)}% ${t.aiConfidence}`;

  const defects = item.detected_defects || [];
  document.getElementById('detailDefects').innerText = defects.length > 0 ? defects.join(' • ') : t.cleanDefect;
  document.getElementById('detailDesc').innerText = item.description || (state.lang === 'ar' ? 'سلعة معتمدة ومفحوصة بالكامل مع حق المعاينة والتجربة قبل الدفع كاش مع المندوب.' : 'Verified and certified item with full hands-on inspection before cash payment.');

  const specLabels = document.querySelectorAll('#modalProductDetail .spec-line-label');
  if (specLabels.length >= 3) {
    specLabels[0].innerText = t.specsAi;
    specLabels[1].innerText = t.specsDefects;
    specLabels[2].innerText = t.specsDelivery;
  }
  const specDeliveryVal = document.querySelectorAll('#modalProductDetail .spec-line-val');
  if (specDeliveryVal.length >= 3) {
    specDeliveryVal[2].innerText = t.specsDeliveryVal;
  }

  // Wire buttons
  const btnReserve = document.getElementById('btnDetailReserve');
  btnReserve.innerHTML = `<span>${t.reserveBtn}</span>`;
  btnReserve.onclick = () => {
    closeModal('modalProductDetail');
    openReserveModal(item.id, item.title, item.expected_resale_price || 0);
  };

  const btnAskBot = document.getElementById('btnDetailAskBot');
  btnAskBot.innerHTML = `<span>${t.askBotBtn}</span>`;
  btnAskBot.onclick = () => {
    closeModal('modalProductDetail');
    openAskBotModal(item.id, item.title, item.expected_resale_price || 0);
  };

  // Open modal & set hash
  document.getElementById('modalProductDetail').classList.add('active');
  window.location.hash = `#item-${item.id}`;
}

// ------------------ FAQ Accordion Toggle ------------------
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const icon = btn.querySelector('.faq-toggle-icon');
  if (answer.style.display === 'none' || !answer.style.display) {
    answer.style.display = 'block';
    if (icon) icon.innerText = '−';
  } else {
    answer.style.display = 'none';
    if (icon) icon.innerText = '+';
  }
}

// ------------------ District Quick Filter ------------------
function filterByDistrict(district) {
  state.selectedDistrict = district;
  const sel = document.getElementById('headerDistrictFilter');
  if (sel) sel.value = district;
  switchPortalView('showroom');
  loadShowroomItems();
}

// ------------------ Auth Modal & User Session ------------------
function initAuthModal() {
  updateHeaderUserDisplay();
  if (state.currentUser) {
    checkUserApplicationStatus();
  }

  // Wire security gate forms
  const capForm = document.getElementById('captainAuthForm');
  if (capForm) {
    capForm.addEventListener('submit', (e) => {
      e.preventDefault();
      checkCaptainPin();
    });
  }
  const admForm = document.getElementById('adminAuthForm');
  if (admForm) {
    admForm.addEventListener('submit', (e) => {
      e.preventDefault();
      checkAdminPin();
    });
  }

  const btnAcc = document.getElementById('btnHeaderAccount');
  if (btnAcc) {
    btnAcc.addEventListener('click', () => {
      if (state.currentUser) {
        switchPortalView('account');
      } else {
        openAuthModal('login');
      }
    });
  }
}

function updateHeaderUserDisplay() {
  const btnAcc = document.getElementById('btnHeaderAccount');
  if (!btnAcc) return;
  const isAr = state.lang === 'ar';
  if (state.currentUser) {
    const initials = state.currentUser.avatar || state.currentUser.name.substring(0, 2).toUpperCase();
    const firstName = state.currentUser.name.split(' ')[0];
    btnAcc.innerHTML = `
      <span class="account-avatar-mini" id="headerAvatarMini">${escapeHTML(initials)}</span>
      <span id="txtHeaderAccountLabel" class="account-btn-label">${escapeHTML(firstName)}</span>
    `;
    btnAcc.title = isAr ? `حساب: ${state.currentUser.name}` : `Account: ${state.currentUser.name}`;
  } else {
    btnAcc.innerHTML = `
      <span class="account-avatar-mini" id="headerAvatarMini">👤</span>
      <span id="txtHeaderAccountLabel" class="account-btn-label">${isAr ? 'دخول' : 'Sign In'}</span>
    `;
    btnAcc.title = isAr ? 'تسجيل الدخول' : 'Sign In';
  }
}

function openAuthModal(mode = 'login') {
  switchAuthTab(mode);
  const modal = document.getElementById('modalAuth');
  if (modal) modal.classList.add('active');
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tabBtnLogin');
  const tabRegister = document.getElementById('tabBtnRegister');
  const groupFullName = document.getElementById('groupFullName');
  const groupRole = document.getElementById('groupRole');
  const heading = document.getElementById('authModalHeading');
  const btnSubmit = document.getElementById('authSubmitText');

  if (tab === 'register') {
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabRegister) tabRegister.classList.add('active');
    if (groupFullName) groupFullName.style.display = 'block';
    if (groupRole) groupRole.style.display = 'block';
    if (heading) heading.innerText = state.lang === 'ar' ? 'إنشاء حساب جديد في آنتي فصال' : 'Create an Anti-Fesal Account';
    if (btnSubmit) btnSubmit.innerText = state.lang === 'ar' ? 'تسجيل حساب جديد' : 'Register Account';
  } else {
    if (tabRegister) tabRegister.classList.remove('active');
    if (tabLogin) tabLogin.classList.add('active');
    if (groupFullName) groupFullName.style.display = 'none';
    if (groupRole) groupRole.style.display = 'none';
    if (heading) heading.innerText = state.lang === 'ar' ? 'تسجيل الدخول إلى آنتي فصال' : 'Sign in to Anti-Fesal';
    if (btnSubmit) btnSubmit.innerText = state.lang === 'ar' ? 'تسجيل الدخول' : 'Sign In';
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const isRegister = document.getElementById('tabBtnRegister').classList.contains('active');
  const emailOrUser = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;

  try {
    if (isRegister) {
      const fullName = document.getElementById('authFullName').value.trim() || 'مستخدم جديد';
      const role = document.getElementById('authRole').value;
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: emailOrUser.split('@')[0],
          name: fullName,
          email: emailOrUser.includes('@') ? emailOrUser : `${emailOrUser}@antifesal.eg`,
          role: role,
          password: password,
          district: 'Sidi Beshr'
        })
      });
      state.currentUser = res.user;
      showToast('أهلاً بك في آنتي فصال!', 'تم تسجيل حسابك بنجاح', 'success');
    } else {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: emailOrUser,
          password: password
        })
      });
      state.currentUser = res.user;
      showToast('تم تسجيل الدخول بنجاح!', `مرحباً بك، ${state.currentUser.name}`, 'success');
    }

    localStorage.setItem('antifesal_user', JSON.stringify(state.currentUser));
    updateHeaderUserDisplay();
    closeModal('modalAuth');
    switchPortalView('account');
  } catch (err) {
    showToast('خطأ في الدخول', err.message || 'بيانات الدخول غير صحيحة', 'error');
  }
}

async function handleGoogleLogin() {
  try {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        is_google: true,
        name: 'يوسف السكندري (Google)',
        email: 'yussef.alex@gmail.com'
      })
    });
    state.currentUser = res.user;
    localStorage.setItem('antifesal_user', JSON.stringify(state.currentUser));
    updateHeaderUserDisplay();
    closeModal('modalAuth');
    showToast('تم الدخول بحساب Google!', `مرحباً بك ${state.currentUser.name}`, 'success');
    switchPortalView('account');
  } catch (err) {
    showToast('خطأ Google Auth', err.message, 'error');
  }
}

function logoutUser() {
  state.currentUser = null;
  localStorage.removeItem('antifesal_user');
  updateHeaderUserDisplay();
  showToast('تم تسجيل الخروج', 'نراك قريباً في آنتي فصال 👋', 'info');
  switchPortalView('showroom');
}

// ------------------ View 9: Account Portal (Settings, Information, Sellers, Buyers, Delivery) ------------------
function switchAccountTab(tabKey) {
  state.currentAccountTab = tabKey;
  document.querySelectorAll('.account-nav-item').forEach(item => {
    if (item.dataset.tab === tabKey) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  document.querySelectorAll('.account-sub-tab').forEach(tab => {
    tab.style.display = 'none';
  });
  const target = document.getElementById(`tabAcc_${tabKey}`);
  if (target) {
    target.style.display = 'block';
  }
}
window.switchAccountTab = switchAccountTab;

function initAccountPortal() {
  switchAccountTab(state.currentAccountTab || 'info');
}

async function loadAccountData() {
  if (!state.currentUser) {
    openAuthModal('login');
    return;
  }

  const isAr = state.lang === 'ar';

  // Populate Profile Header & Sidebar
  const nameEl = document.getElementById('accProfileName');
  const userEl = document.getElementById('accProfileUsername');
  const emailEl = document.getElementById('accEmail');
  const phoneEl = document.getElementById('accPhone');
  const distEl = document.getElementById('accDistrict');
  const avatarEl = document.getElementById('accAvatar');
  const roleBadge = document.getElementById('accRoleBadge');

  if (nameEl) nameEl.innerText = state.currentUser.name;
  if (userEl) userEl.innerText = '@' + (state.currentUser.email ? state.currentUser.email.split('@')[0] : 'alex_user');
  if (emailEl) emailEl.innerText = state.currentUser.email || 'alex_user@antifesal.eg';
  if (phoneEl) phoneEl.innerText = state.currentUser.phone || '01012345671';
  if (distEl) distEl.innerText = isAr ? 'سيدي بشر' : 'Sidi Beshr';
  if (roleBadge) roleBadge.innerText = isAr ? 'بائع ومشتري معتمد' : 'Verified Seller & Buyer';
  if (avatarEl) {
    const initials = state.currentUser.avatar || state.currentUser.name.substring(0, 2).toUpperCase();
    avatarEl.innerText = initials;
  }

  // Check and show onboarding application status (Pending / Approved / Rejected)
  checkUserApplicationStatus();

  // Pre-fill settings form
  const setFullName = document.getElementById('accSettingFullName');
  const setPhone = document.getElementById('accSettingPhone');
  const setLang = document.getElementById('accSettingLang');
  const setTheme = document.getElementById('accSettingTheme');
  if (setFullName) setFullName.value = state.currentUser.name;
  if (setPhone) setPhone.value = state.currentUser.phone || '01012345671';
  if (setLang) setLang.value = state.lang;
  if (setTheme) setTheme.value = state.theme;

  let sellerItems = [];
  let buyerDeals = [];
  let deliveryTasks = [];
  let totalCash = 18500;

  try {
    const data = await apiRequest(`/api/user/account-data?user_id=${state.currentUser.id}`);
    if (data && data.seller_data) {
      sellerItems = data.seller_data.recent_items || [];
      totalCash = data.seller_data.total_buyout_payouts || totalCash;
    }
    if (data && data.buyer_data) {
      buyerDeals = data.buyer_data.recent_deals || [];
    }
    if (data && data.delivery_data) {
      deliveryTasks = data.delivery_data.recent_dispatches || [];
    }
  } catch (err) {
    console.warn('API account data fetch error, using robust seed fallback:', err);
  }

  // Fallback demo data to ensure tables are always rich and interactive
  if (!sellerItems || sellerItems.length === 0) {
    sellerItems = [
      { id: '101', title: isAr ? 'تلاجة توشيبا 16 قدم نوفروست فضي' : 'Toshiba 16 cu ft No-Frost Refrigerator', district: isAr ? 'سيدي بشر' : 'Sidi Beshr', grade: 'A', price: 12500, buyout: 11500, status: isAr ? 'معتمد' : 'Approved' },
      { id: '104', title: isAr ? 'لابتوب ديل انسبيرون 15 معالج i7' : 'Dell Inspiron 15 Core i7 Laptop', district: isAr ? 'سموحة' : 'Smouha', grade: 'A', price: 16800, buyout: 15500, status: isAr ? 'معتمد' : 'Approved' },
      { id: '108', title: isAr ? 'صالون زان كلاسيك العطارين 5 قطع' : 'El-Attarine Classic Beech Salon 5 Pcs', district: isAr ? 'العطارين' : 'El-Attarine', grade: 'B', price: 8500, buyout: 7800, status: isAr ? 'قيد المعاينة' : 'Under Inspection' }
    ];
  }

  if (!buyerDeals || buyerDeals.length === 0) {
    buyerDeals = [
      { id: 'DL-901', title: isAr ? 'شاشة سامسونج 55 بوصة سمارت 4K' : 'Samsung 55 Smart 4K UHD TV', price: 9200, address: isAr ? 'شارع جمال عبد الناصر، سيدي بشر' : 'Gamal Abdel Nasser St, Sidi Beshr', status: isAr ? 'جاري الشحن' : 'Dispatched' },
      { id: 'DL-882', title: isAr ? 'غسالة ال جي 8 كيلو اتوماتيك' : 'LG 8kg Front Load Washer', price: 11000, address: isAr ? 'شارع فوزي معاذ، سموحة' : 'Fawzi Moaz St, Smouha', status: isAr ? 'بانتظار المعاينة' : 'Pending Inspection' },
      { id: 'DL-740', title: isAr ? 'ميكروويف شارب 34 لتر ديجيتال' : 'Sharp 34L Digital Microwave', price: 3200, address: isAr ? 'شارع سوتر، الشاطبي' : 'Soter St, El-Shatby', status: isAr ? 'تم التسليم' : 'Completed' }
    ];
  }

  if (!deliveryTasks || deliveryTasks.length === 0) {
    deliveryTasks = [
      { id: 'DSP-401', district: isAr ? 'سيدي بشر' : 'Sidi Beshr', address: isAr ? 'عمارة 14 شارع خالد بن الوليد' : '14 Khaled Ibn El-Walid St', cash: 12500, status: isAr ? 'تم الاستلام' : 'Delivered' },
      { id: 'DSP-402', district: isAr ? 'سموحة' : 'Smouha', address: isAr ? 'شارع ألبرت الأول، برج الصفوة' : 'Albert Al-Awal St, Al-Safwa Tower', cash: 9200, status: isAr ? 'جاري المعاينة' : 'Under Inspection' },
      { id: 'DSP-403', district: isAr ? 'محرم بك' : 'Moharam Bek', address: isAr ? 'ميدان الرصافة، عمارة الأمل' : 'El-Rosafa Sq, El-Amal Bldg', cash: 4500, status: isAr ? 'مكتمل' : 'Completed' }
    ];
  }

  // Update KPI counters
  const kpiSeller = document.getElementById('accMetricSellerItems');
  const kpiBuyer = document.getElementById('accMetricBuyerDeals');
  const kpiCash = document.getElementById('accMetricCash');
  if (kpiSeller) kpiSeller.innerText = sellerItems.length;
  if (kpiBuyer) kpiBuyer.innerText = buyerDeals.length;
  if (kpiCash) kpiCash.innerText = formatEGP(totalCash);

  // Populate Seller Table
  const tbodySeller = document.getElementById('tbodyAccSellerItems');
  if (tbodySeller) {
    tbodySeller.innerHTML = sellerItems.map(it => {
      const itId = it.id || it.item_id;
      const title = it.title || it.name;
      const district = it.district || (isAr ? 'سيدي بشر' : 'Sidi Beshr');
      const grade = it.condition_grade || it.grade || 'A';
      const price = it.expected_resale_price || it.price || 0;
      const buyout = it.recommended_purchase_price || it.buyout || Math.round(price * 0.9);
      const status = it.status || (isAr ? 'معتمد' : 'Approved');
      return `
        <tr>
          <td><strong>#${escapeHTML(String(itId))}</strong></td>
          <td>${escapeHTML(title)}</td>
          <td>📍 ${escapeHTML(district)}</td>
          <td><span class="grade-badge grade-${grade.toLowerCase()}">${grade}</span></td>
          <td><strong>${formatEGP(price)}</strong></td>
          <td style="color: var(--grade-emerald); font-weight: 800;">${formatEGP(buyout)}</td>
          <td><span class="receipt-status-pill auto-approved">${escapeHTML(status)}</span></td>
          <td>
            <button class="btn-quick-prompt" onclick="openProductDetailModal('${itId}')">
              ${isAr ? 'معاينة' : 'Preview'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Populate Buyer Table
  const tbodyBuyer = document.getElementById('tbodyAccBuyerDeals');
  if (tbodyBuyer) {
    tbodyBuyer.innerHTML = buyerDeals.map(dl => {
      const dealId = dl.id || dl.deal_id;
      const title = dl.title || dl.item_title;
      const price = dl.price || dl.agreed_price || dl.locked_price || 0;
      const address = dl.address || dl.inspection_address || (isAr ? 'الإسكندرية' : 'Alexandria');
      const status = dl.status || dl.deal_status || (isAr ? 'بانتظار المعاينة' : 'Pending Inspection');
      return `
        <tr>
          <td><strong>#${escapeHTML(String(dealId))}</strong></td>
          <td>${escapeHTML(title)}</td>
          <td style="color: var(--crimson-primary); font-weight: 800;">${formatEGP(price)}</td>
          <td>📍 ${escapeHTML(address)}</td>
          <td><span class="receipt-status-pill ${status.includes('تم') || status.includes('Complete') ? 'auto-approved' : 'pending'}">${escapeHTML(status)}</span></td>
          <td>
            <button class="btn-quick-prompt" onclick="quickTrack('${dealId}')">
              ${isAr ? 'تتبع 🚚' : 'Track 🚚'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Populate Delivery Table
  const tbodyDelivery = document.getElementById('tbodyAccDeliveryLogs');
  if (tbodyDelivery) {
    tbodyDelivery.innerHTML = deliveryTasks.map(tsk => {
      const tskId = tsk.id || tsk.task_id;
      const district = tsk.district || (isAr ? 'سيدي بشر' : 'Sidi Beshr');
      const address = tsk.address || tsk.delivery_address || (isAr ? 'شارع جمال عبد الناصر' : 'Gamal Abdel Nasser St');
      const cash = tsk.cash || tsk.payout_cash || 0;
      const status = tsk.status || (isAr ? 'تم الاستلام' : 'Delivered');
      return `
        <tr>
          <td><strong>#${escapeHTML(String(tskId))}</strong></td>
          <td>📍 ${escapeHTML(district)}</td>
          <td>${escapeHTML(address)}</td>
          <td style="color: var(--grade-emerald); font-weight: 800;">${formatEGP(cash)}</td>
          <td><span class="receipt-status-pill auto-approved">${escapeHTML(status)}</span></td>
          <td>
            <button class="btn-quick-prompt" onclick="showToast('${isAr ? 'كابتن الإسكندرية' : 'Alex Captain'}', '${isAr ? 'مهمة استلام رقم ' : 'Pickup Task #'}${tskId}', 'info')">
              ${isAr ? 'تفاصيل' : 'Details'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

function saveAccountSettings() {
  const nameInput = document.getElementById('accSettingFullName');
  const phoneInput = document.getElementById('accSettingPhone');
  const distInput = document.getElementById('accSettingDistrict');
  const langInput = document.getElementById('accSettingLang');
  const themeInput = document.getElementById('accSettingTheme');

  if (nameInput && nameInput.value.trim()) {
    state.currentUser.name = nameInput.value.trim();
  }
  if (phoneInput && phoneInput.value.trim()) {
    state.currentUser.phone = phoneInput.value.trim();
  }
  if (distInput) {
    state.currentUser.district = distInput.value;
    state.selectedDistrict = distInput.value;
  }
  localStorage.setItem('antifesal_user', JSON.stringify(state.currentUser));

  if (themeInput && themeInput.value !== state.theme) {
    toggleTheme();
  }
  if (langInput && langInput.value !== state.lang) {
    toggleLanguage();
  } else {
    updateHeaderUserDisplay();
    loadAccountData();
    showToast(
      state.lang === 'ar' ? 'تم حفظ التعديلات' : 'Settings Saved',
      state.lang === 'ar' ? 'تم تحديث تفضيلات وبيانات حسابك بنجاح ✓' : 'Account profile & preferences updated successfully ✓',
      'success'
    );
  }
}
window.saveAccountSettings = saveAccountSettings;

// ------------------ View 10: Delivery Driver Portal (PIN CAPTAIN-ALEX) ------------------
function checkCaptainPin() {
  const pinInput = document.getElementById('captainPinInput');
  const errEl = document.getElementById('captainPinError');
  const pin = (pinInput ? pinInput.value : '').trim();

  if (pin.toUpperCase() === 'CAPTAIN-ALEX' || pin.toLowerCase() === 'alex' || pin === '1234') {
    state.captainUnlocked = true;
    const gate = document.getElementById('captainGate') || document.getElementById('gateCaptainDelivery');
    const work = document.getElementById('captainWorkspace') || document.getElementById('panelCaptainDelivery');
    if (gate) gate.style.display = 'none';
    if (work) work.style.display = 'block';
    if (errEl) errEl.style.display = 'none';
    loadCaptainDeliveryTasks();
    showToast('أهلاً يا كابتن!', 'تم فتح بوابة كباتن التوصيل بالإسكندرية', 'success');
  } else {
    if (errEl) {
      errEl.innerText = 'رمز التحقق غير صحيح! استخدم الرمز السري: CAPTAIN-ALEX';
      errEl.style.display = 'block';
    } else {
      showToast('رمز الكابتن غير صحيح', 'استخدم الرمز الأمني: CAPTAIN-ALEX', 'warning');
    }
  }
}
window.checkCaptainPin = checkCaptainPin;

function prefillCaptainPin() {
  const pinInput = document.getElementById('captainPinInput');
  if (pinInput) pinInput.value = 'CAPTAIN-ALEX';
  checkCaptainPin();
}
window.prefillCaptainPin = prefillCaptainPin;

function lockCaptainGate() {
  state.captainUnlocked = false;
  const gate = document.getElementById('captainGate') || document.getElementById('gateCaptainDelivery');
  const work = document.getElementById('captainWorkspace') || document.getElementById('panelCaptainDelivery');
  if (work) work.style.display = 'none';
  if (gate) gate.style.display = 'block';
  const pinInput = document.getElementById('captainPinInput');
  if (pinInput) pinInput.value = '';
  showToast('تم قفل البوابة', 'تم قفل جلسة الكابتن بأمان 🔒', 'info');
}
window.lockCaptainGate = lockCaptainGate;

async function loadCaptainDeliveryTasks() {
  try {
    const res = await apiRequest('/api/dispatches');
    const tbody = document.getElementById('tbodyCaptainTasks') || document.getElementById('captainTasksTable');
    if (!tbody) return;

    if (!res.dispatches || res.dispatches.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 25px;">لا توجد مهمات استلام نشطة حالياً. أنت متفرغ!</td></tr>`;
      return;
    }

    tbody.innerHTML = res.dispatches.map(d => {
      const step = d.current_step || 'ORDER_PLACED';
      let actionBtn = '';
      if (step === 'ORDER_PLACED' || step === 'DRIVER_ASSIGNED') {
        actionBtn = `<button class="btn-quick-prompt" style="background:#ECFDF5; color:#065F46; font-weight:800;" onclick="advanceDispatchStep('${d.id}', 'PICKED_UP')">استلمت من البائع وسلّمت الكاش 📦</button>`;
      } else if (step === 'PICKED_UP') {
        actionBtn = `<button class="btn-quick-prompt" style="background:#EFF6FF; color:#1D4ED8; font-weight:800;" onclick="advanceDispatchStep('${d.id}', 'OUT_FOR_DELIVERY')">خرجت للمعاينة عند المشتري 🚚</button>`;
      } else if (step === 'OUT_FOR_DELIVERY') {
        actionBtn = `<button class="btn-quick-prompt" style="background:#FEF3C7; color:#92400E; font-weight:800;" onclick="advanceDispatchStep('${d.id}', 'DELIVERED_SETTLED')">تمت المعاينة وتسليم الكاش ✓</button>`;
      } else {
        actionBtn = `<span class="receipt-status-pill auto-approved">مكتملة ومسلّمة ✓</span>`;
      }

      return `
        <tr>
          <td><strong style="font-family: var(--font-mono);">#${escapeHTML(d.id)}</strong></td>
          <td>${d.item_id ? '#' + escapeHTML(d.item_id) : '—'}</td>
          <td><strong>${escapeHTML(d.district || 'الإسكندرية')}</strong></td>
          <td>${escapeHTML(d.pickup_address || '—')}</td>
          <td>${escapeHTML(d.driver_name || 'الكابتن')}</td>
          <td style="font-family: var(--font-mono); font-size: 12px;">${escapeHTML(d.driver_phone || '—')}</td>
          <td><strong style="color: var(--grade-emerald);">${formatEGP(d.cash_amount || d.payout_cash || 0)}</strong></td>
          <td><span class="status-pill status-${(d.status || 'PENDING').toLowerCase()}">${escapeHTML(d.status || 'PENDING')}</span></td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading captain tasks:', err);
  }
}
window.loadCaptainDeliveryTasks = loadCaptainDeliveryTasks;

let driverLocationWatchId = null;

function toggleDriverGpsSharing() {
  const badge = document.getElementById('driverGpsBadge');
  const btn = document.getElementById('btnToggleDriverGps');

  if (driverLocationWatchId) {
    navigator.geolocation.clearWatch(driverLocationWatchId);
    driverLocationWatchId = null;
    if (badge) {
      badge.innerText = 'متوقف 🔴';
      badge.className = 'status-pill status-pending';
    }
    if (btn) btn.innerHTML = '<span>📍 تفعيل بث الموقع المباشر (GPS)</span>';
    showToast('تم إيقاف مشاركة الموقع', 'تم إيقاف إرسال إحداثيات الـ GPS', 'info');
    return;
  }

  if (!navigator.geolocation) {
    showToast('خطأ في المتصفح', 'متصفحك لا يدعم خدمة تحديد الموقع الجغرافي (Geolocation)', 'error');
    return;
  }

  if (btn) btn.innerHTML = '<span>⏳ جاري الاتصال بالأقمار الصناعية...</span>';

  driverLocationWatchId = navigator.geolocation.watchPosition(
    async (pos) => {
      if (badge) {
        badge.innerText = 'مباشر الآن 🟢 (GPS Active)';
        badge.className = 'status-pill status-active';
      }
      if (btn) btn.innerHTML = '<span>🛑 إيقاف بث الموقع (Stop GPS)</span>';

      const driverId = state.currentUser?.id || 'DRV-101';
      const driverName = state.currentUser?.name || 'كابتن أحمد الإسكندراني';

      try {
        await apiRequest('/api/driver/location', {
          method: 'POST',
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
        console.warn('Driver location stream error:', err);
      }
    },
    (err) => {
      if (btn) btn.innerHTML = '<span>📍 تفعيل بث الموقع المباشر (GPS)</span>';
      showToast('تعذر الوصول للموقع', 'يرجى إعطاء الإذن للمتصفح للوصول للموقع الفعلي: ' + err.message, 'warning');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
  );

  showToast('تم تفعيل الـ GPS', 'يتم الآن بث إحداثياتك للمشتري والإدارة المركزية بدقة 🛰️', 'success');
}
window.toggleDriverGpsSharing = toggleDriverGpsSharing;

async function advanceDispatchStep(dispatchId, nextStep) {
  try {
    const res = await apiRequest(`/api/dispatches/${encodeURIComponent(dispatchId)}/step`, {
      method: 'POST',
      body: JSON.stringify({ step: nextStep })
    });
    showToast('تم تحديث خط السير', `تم نقل المهمة للمرحلة: ${res.step_message} ✓`, 'success');
    loadCaptainDeliveryTasks();
  } catch (err) {
    showToast('خطأ في تحديث المرحلة', err.message, 'error');
  }
}
window.advanceDispatchStep = advanceDispatchStep;

// ------------------ View 11: Admin Master Portal (PIN ADMIN-2026) ------------------
function checkAdminPin() {
  const pinInput = document.getElementById('adminPinInput');
  const errEl = document.getElementById('adminPinError');
  const pin = (pinInput ? pinInput.value : '').trim();

  if (pin.toUpperCase() === 'ADMIN-2026' || pin.toLowerCase() === 'admin' || pin === 'root') {
    state.adminUnlocked = true;
    const gate = document.getElementById('adminGate') || document.getElementById('gateAdminMaster');
    const work = document.getElementById('adminWorkspace') || document.getElementById('panelAdminMaster');
    if (gate) gate.style.display = 'none';
    if (work) work.style.display = 'block';
    if (errEl) errEl.style.display = 'none';
    loadAdminDashboard();
    showToast('مرحباً بالإدارة المركزية', 'تم تسجيل الدخول بصلاحيات المدير العام 🛡️', 'success');
  } else {
    if (errEl) {
      errEl.innerText = 'رمز التحقق غير صحيح! استخدم الرمز السري: ADMIN-2026';
      errEl.style.display = 'block';
    } else {
      showToast('رمز الإدارة غير صحيح', 'استخدم الرمز السري: ADMIN-2026', 'warning');
    }
  }
}
window.checkAdminPin = checkAdminPin;

function prefillAdminPin() {
  const pinInput = document.getElementById('adminPinInput');
  if (pinInput) pinInput.value = 'ADMIN-2026';
  checkAdminPin();
}
window.prefillAdminPin = prefillAdminPin;

function lockAdminGate() {
  state.adminUnlocked = false;
  const gate = document.getElementById('adminGate') || document.getElementById('gateAdminMaster');
  const work = document.getElementById('adminWorkspace') || document.getElementById('panelAdminMaster');
  if (work) work.style.display = 'none';
  if (gate) gate.style.display = 'block';
  const pinInput = document.getElementById('adminPinInput');
  if (pinInput) pinInput.value = '';
  showToast('تم قفل بوابة الإدارة', 'تم تأمين لوحة التحكم 🔒', 'info');
}
window.lockAdminGate = lockAdminGate;

async function loadAdminDashboard() {
  loadAdminAnalytics();
  loadAdminApplications();
  loadAdminUsers();
  loadAdminFinancials();
  loadAdminDrivers();
}
window.loadAdminDashboard = loadAdminDashboard;

async function loadAdminAnalytics() {
  try {
    const data = await apiRequest('/api/admin/analytics');

    // 1. Core KPIs
    const elSold = document.getElementById('admOrdersSoldCount');
    const elGmv = document.getElementById('admTotalGmv');
    const elRev = document.getElementById('admNetRevenue');
    const elPayouts = document.getElementById('admDriverPayouts');

    if (elSold) elSold.innerText = data.orders_sold_count || 0;
    if (elGmv) elGmv.innerText = formatEGP(data.financials?.gmv || 0);
    if (elRev) elRev.innerText = formatEGP(data.financials?.platform_net_commission || 0);
    if (elPayouts) elPayouts.innerText = formatEGP(data.financials?.driver_payouts || 0);

    // 2. Top Categories Breakdown List
    const catBox = document.getElementById('admTopCategoriesList');
    if (catBox && data.top_categories) {
      if (data.top_categories.length === 0) {
        catBox.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 10px;">لا توجد مبيعات مسجلة حتى الآن.</div>';
      } else {
        const colors = ['bar-fill-crimson', 'bar-fill-emerald', 'bar-fill-blue', 'bar-fill-amber'];
        catBox.innerHTML = data.top_categories.map((c, i) => `
          <div class="breakdown-row">
            <div class="breakdown-header">
              <span>🏷️ ${escapeHTML(c.category)}</span>
              <span><strong>${c.count}</strong> صفقة (${c.pct}%)</span>
            </div>
            <div class="breakdown-bar-track">
              <div class="breakdown-bar-fill ${colors[i % colors.length]}" style="width: ${Math.max(5, c.pct)}%;"></div>
            </div>
          </div>
        `).join('');
      }
    }

    // 3. Top Alexandria Buying Locations Leaderboard
    const distBox = document.getElementById('admTopDistrictsList');
    if (distBox && data.top_locations) {
      if (data.top_locations.length === 0) {
        distBox.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 10px;">لا توجد بيانات أحياء مسجلة.</div>';
      } else {
        const maxDistCount = Math.max(...data.top_locations.map(d => d.count), 1);
        distBox.innerHTML = data.top_locations.map((d, i) => {
          const pct = Math.round((d.count / maxDistCount) * 100);
          return `
            <div class="breakdown-row">
              <div class="breakdown-header">
                <span>📍 <strong>${i + 1}. ${escapeHTML(d.district)}</strong></span>
                <span><strong>${d.count}</strong> طلب شراء</span>
              </div>
              <div class="breakdown-bar-track">
                <div class="breakdown-bar-fill bar-fill-emerald" style="width: ${Math.max(8, pct)}%;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load admin analytics:', err);
  }
}
window.loadAdminAnalytics = loadAdminAnalytics;

async function loadAdminApplications() {
  try {
    const res = await apiRequest('/api/admin/applications');
    const tbody = document.getElementById('tbodyAdminApplications');
    const badge = document.getElementById('badgePendingApps');
    if (badge) badge.innerText = res.count || (res.applications ? res.applications.length : 0);
    if (!tbody) return;

    if (!res.applications || res.applications.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 25px;">لا توجد طلبات انضمام جديدة بانتظار المراجعة حالياً ✓</td></tr>`;
      return;
    }

    tbody.innerHTML = res.applications.map(app => {
      const isPending = app.status === 'PENDING_APPROVAL';
      const roleText = app.role === 'seller' ? '🏷️ بائع معتمد' : '🚚 كابتن توصيل';
      const appData = app.application_data || {};
      const detailSummary = app.role === 'seller'
        ? `المتجر: ${escapeHTML(appData.shop_name || 'فردي')} | رقم قومي: ${escapeHTML(appData.national_id || '—')} | باقة: ${escapeHTML(appData.tier || '8%')}`
        : `المركبة: ${escapeHTML(appData.vehicle_type || 'فان')} | اللوحة: ${escapeHTML(appData.vehicle_plate || '—')} | رخصة: ${escapeHTML(appData.license_number || '—')}`;

      return `
        <tr>
          <td><strong style="font-family: var(--font-mono); font-size: 12px;">#${escapeHTML(app.id)}</strong></td>
          <td><span class="role-badge role-${app.role}">${roleText}</span></td>
          <td><strong>${escapeHTML(app.name)}</strong></td>
          <td><span style="font-family: var(--font-mono);">${escapeHTML(app.phone)}</span></td>
          <td><strong>${escapeHTML(app.district || 'الإسكندرية')}</strong></td>
          <td style="font-size: 12px; color: #475569; max-width: 250px;">${detailSummary}</td>
          <td style="font-size: 11px; color: #64748B;">${app.created_at ? app.created_at.slice(0, 10) : 'الآن'}</td>
          <td>
            <span class="status-pill status-${isPending ? 'pending' : (app.status === 'APPROVED' ? 'active' : 'blocked')}">
              ${isPending ? 'قيد المراجعة' : (app.status === 'APPROVED' ? 'معتمد ✓' : 'مرفوض ✕')}
            </span>
          </td>
          <td>
            ${isPending ? `
              <div style="display: flex; gap: 6px;">
                <button class="btn-quick-prompt" style="background: #ECFDF5; color: #065F46; font-weight: 800; padding: 4px 8px; font-size: 11px;" onclick="reviewApplication('${app.id}', 'APPROVED')">اعتماد وقبول ✓</button>
                <button class="btn-quick-prompt" style="background: #FEE2E2; color: #991B1B; font-weight: 800; padding: 4px 8px; font-size: 11px;" onclick="reviewApplication('${app.id}', 'REJECTED')">رفض ✕</button>
              </div>
            ` : `<span style="font-size: 11px; color: #64748B;">تم الفحص</span>`}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load admin applications:', err);
  }
}
window.loadAdminApplications = loadAdminApplications;

async function reviewApplication(appId, action) {
  try {
    const res = await apiRequest(`/api/admin/applications/${encodeURIComponent(appId)}/review`, {
      method: 'POST',
      body: JSON.stringify({
        action: action,
        notes: action === 'APPROVED' ? 'تم الاعتماد الرسمي وتفعيل الصلاحيات من الإدارة' : 'المستندات أو البيانات غير مكتملة'
      })
    });

    showToast(
      action === 'APPROVED' ? 'تم اعتماد الحساب بنجاح' : 'تم رفض الطلب',
      action === 'APPROVED' ? 'تم فتح الحساب وترقية العضوية وإشعار المستخدم فوراً ✓' : 'تم تسجيل الرفض مع الملاحظة',
      action === 'APPROVED' ? 'success' : 'warning'
    );

    loadAdminApplications();
    loadAdminAnalytics();
    loadAdminUsers();
  } catch (err) {
    showToast('خطأ في المراجعة', err.message, 'error');
  }
}
window.reviewApplication = reviewApplication;

// ------------------ Seller & Driver Onboarding Modals ------------------
function openSellerApplyModal() {
  const modal = document.getElementById('modalSellerApply');
  if (modal) modal.classList.add('active');
  if (state.currentUser) {
    const nameInput = document.getElementById('sellerApplyName');
    const phoneInput = document.getElementById('sellerApplyPhone');
    if (nameInput && state.currentUser.name) nameInput.value = state.currentUser.name;
    if (phoneInput && state.currentUser.phone) phoneInput.value = state.currentUser.phone;
  }
}
window.openSellerApplyModal = openSellerApplyModal;

function openDriverApplyModal() {
  const modal = document.getElementById('modalDriverApply');
  if (modal) modal.classList.add('active');
  if (state.currentUser) {
    const nameInput = document.getElementById('driverApplyName');
    const phoneInput = document.getElementById('driverApplyPhone');
    if (nameInput && state.currentUser.name) nameInput.value = state.currentUser.name;
    if (phoneInput && state.currentUser.phone) phoneInput.value = state.currentUser.phone;
  }
}
window.openDriverApplyModal = openDriverApplyModal;

async function handleSellerApplySubmit(e) {
  e.preventDefault();
  const name = document.getElementById('sellerApplyName').value.trim();
  const phone = document.getElementById('sellerApplyPhone').value.trim();
  const shop = document.getElementById('sellerApplyShop').value.trim();
  const bType = document.getElementById('sellerApplyBusinessType').value;
  const nationalId = document.getElementById('sellerApplyNationalId').value.trim();
  const district = document.getElementById('sellerApplyDistrict').value;
  const tier = document.getElementById('sellerApplyTier').value;
  const payoutAcc = document.getElementById('sellerApplyPayoutAccount').value.trim();

  const userId = state.currentUser?.id || 'USR-' + Math.floor(1000 + Math.random() * 9000);

  try {
    await apiRequest('/api/applications/apply', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        name: name,
        phone: phone,
        role: 'seller',
        district: district,
        application_data: {
          shop_name: shop,
          business_type: bType,
          national_id: nationalId,
          tier: tier,
          payout_account: payoutAcc
        }
      })
    });

    closeModal('modalSellerApply');
    showToast('تم إرسال طلب البائع', 'طلبك قيد المراجعة والاعتماد من الإدارة المركزية وسيتم إشعارك فور القبول ✓', 'success');
    checkUserApplicationStatus();
  } catch (err) {
    showToast('خطأ في إرسال الطلب', err.message, 'error');
  }
}
window.handleSellerApplySubmit = handleSellerApplySubmit;

async function handleDriverApplySubmit(e) {
  e.preventDefault();
  const name = document.getElementById('driverApplyName').value.trim();
  const phone = document.getElementById('driverApplyPhone').value.trim();
  const nationalId = document.getElementById('driverApplyNationalId').value.trim();
  const vehicleType = document.getElementById('driverApplyVehicleType').value;
  const vehiclePlate = document.getElementById('driverApplyVehiclePlate').value.trim();
  const license = document.getElementById('driverApplyLicenseNumber').value.trim();
  const district = document.getElementById('driverApplyDistrict').value;
  const gpsConsent = document.getElementById('driverApplyGpsConsent').checked;

  if (!gpsConsent) {
    showToast('تنبيه الأمان', 'الموافقة على مشاركة الموقع الجغرافي الفعلي شرط إلزامي لقبول الكابتن', 'warning');
    return;
  }

  const userId = state.currentUser?.id || 'DRV-' + Math.floor(1000 + Math.random() * 9000);

  try {
    await apiRequest('/api/applications/apply', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        name: name,
        phone: phone,
        role: 'driver',
        district: district,
        application_data: {
          national_id: nationalId,
          vehicle_type: vehicleType,
          vehicle_plate: vehiclePlate,
          license_number: license,
          gps_consent_accepted: true
        }
      })
    });

    closeModal('modalDriverApply');
    showToast('تم إرسال طلب الكابتن', 'طلبك قيد المراجعة لدى الإدارة لتوثيق الرخصة والسيارة واعتماد الحساب 🚚', 'success');
    checkUserApplicationStatus();
  } catch (err) {
    showToast('خطأ في إرسال الطلب', err.message, 'error');
  }
}
window.handleDriverApplySubmit = handleDriverApplySubmit;

async function checkUserApplicationStatus() {
  if (!state.currentUser) return;
  const banner = document.getElementById('accAppStatusBanner');
  const icon = document.getElementById('accAppStatusIcon');
  const heading = document.getElementById('accAppStatusHeading');
  const text = document.getElementById('accAppStatusText');
  const btnAction = document.getElementById('btnAccAppAction');
  if (!banner) return;

  try {
    const res = await apiRequest(`/api/applications/my-status?user_id=${encodeURIComponent(state.currentUser.id)}`);
    if (res.has_application && res.application) {
      banner.style.display = 'block';
      const app = res.application;
      if (app.status === 'PENDING_APPROVAL') {
        banner.className = 'account-status-banner pending';
        if (icon) icon.innerText = '⏳';
        if (heading) heading.innerText = `طلب انضمام ${app.role === 'seller' ? 'بائع معتمد' : 'كابتن توصيل'} (قيد المراجعة)`;
        if (text) text.innerText = 'طلبك قيد المراجعة من الإدارة المركزية والتحقق من المستندات. سيتم تفعيل حسابك فوراً.';
        if (btnAction) btnAction.style.display = 'none';
      } else if (app.status === 'APPROVED') {
        banner.className = 'account-status-banner approved';
        if (icon) icon.innerText = '✓';
        if (heading) heading.innerText = `تهانينا! تم اعتماد حسابك رسميًا كـ ${app.role === 'seller' ? 'بائع معتمد' : 'كابتن توصيل'}`;
        if (text) text.innerText = 'تم فتح كافة الصلاحيات لبدء البيع أو استقبال مشاوير التوصيل والمعاينة الفورية.';
        if (btnAction) {
          btnAction.style.display = 'inline-flex';
          btnAction.innerText = app.role === 'seller' ? 'استوديو البائع 🏷️' : 'بوابة الكابتن 🚚';
          btnAction.onclick = () => switchPortalView(app.role === 'seller' ? 'seller' : 'delivery-portal');
        }
        // Upgrade local role
        state.currentUser.role = app.role;
        localStorage.setItem('antifesal_user', JSON.stringify(state.currentUser));
      } else if (app.status === 'REJECTED') {
        banner.className = 'account-status-banner rejected';
        if (icon) icon.innerText = '✕';
        if (heading) heading.innerText = 'تم رفض طلب الانضمام';
        if (text) text.innerText = app.admin_notes || 'يرجى مراجعة البيانات المدخلة وإعادة التقديم مرة أخرى.';
        if (btnAction) btnAction.style.display = 'none';
      }
    } else {
      banner.style.display = 'none';
    }
  } catch (err) {
    console.warn('Could not check application status:', err);
  }
}
window.checkUserApplicationStatus = checkUserApplicationStatus;

function handleAccAppAction() {
  if (state.currentUser?.role === 'seller') {
    switchPortalView('seller');
  } else if (state.currentUser?.role === 'driver') {
    switchPortalView('delivery-portal');
  }
}
window.handleAccAppAction = handleAccAppAction;

async function loadAdminUsers() {
  try {
    const res = await apiRequest('/api/admin/users');
    const tbody = document.getElementById('adminUsersTable');
    if (!tbody) return;

    tbody.innerHTML = res.users.map(u => `
      <tr>
        <td><strong>#${escapeHTML(u.id)}</strong></td>
        <td>${escapeHTML(u.name)}</td>
        <td>${escapeHTML(u.email)}</td>
        <td><span class="role-badge role-${u.role}">${u.role}</span></td>
        <td>${escapeHTML(u.district || 'الإسكندرية')}</td>
        <td>
          <span class="status-pill status-${u.status.toLowerCase()}">${u.status}</span>
        </td>
        <td>
          <button class="btn-quick-prompt" style="color: ${u.status === 'ACTIVE' ? '#E00000' : '#10B981'}; font-weight: 800;" onclick="toggleUserStatus('${u.id}', '${u.status}')">
            ${u.status === 'ACTIVE' ? '🚫 حظر الحساب' : '✓ فك الحظر'}
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load admin users:', err);
  }
}

async function toggleUserStatus(userId, currentStatus) {
  const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
  try {
    await apiRequest(`/api/admin/users/${userId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: newStatus })
    });
    showToast(
      newStatus === 'BLOCKED' ? 'تم حظر المستخدم' : 'تم فك الحظر',
      `تم تحديث حالة المستخدم #${userId} إلى ${newStatus}`,
      newStatus === 'BLOCKED' ? 'warning' : 'success'
    );
    loadAdminUsers();
  } catch (err) {
    showToast('خطأ في تعديل الحالة', err.message, 'error');
  }
}

async function loadAdminFinancials() {
  try {
    const data = await apiRequest('/api/admin/financials');

    // Update KPI numbers
    const kpiGmv = document.getElementById('adminKpiGmv');
    const kpiFees = document.getElementById('adminKpiFees');
    const kpiDrivers = document.getElementById('adminKpiDrivers');
    const kpiDeals = document.getElementById('adminKpiDealsCount');

    if (kpiGmv) kpiGmv.innerText = formatEGP(data.gmv_total);
    if (kpiFees) kpiFees.innerText = formatEGP(data.platform_fees_total);
    if (kpiDrivers) kpiDrivers.innerText = formatEGP(data.driver_payouts_total);
    if (kpiDeals) kpiDeals.innerText = data.deals_count;

    // Render Daily Volume Bar Graph
    renderAdminFinancialsGraph(data.daily_time_series);
  } catch (err) {
    console.error('Failed to load admin financials:', err);
  }
}

function renderAdminFinancialsGraph(series) {
  const chartBox = document.getElementById('adminFinancialsChart');
  if (!chartBox) return;

  if (!series || series.length === 0) {
    chartBox.innerHTML = '<div style="color: var(--color-muted); text-align: center; padding: 30px;">لا توجد بيانات حركة مالية مسجلة بعد.</div>';
    return;
  }

  const maxVal = Math.max(...series.map(s => s.gmv), 1000);

  chartBox.innerHTML = `
    <div class="bar-chart-container">
      ${series.map(pt => {
        const heightPct = Math.max(15, Math.round((pt.gmv / maxVal) * 100));
        return `
          <div class="chart-col">
            <div class="chart-col-val">${Number(pt.gmv).toLocaleString()} ج.م</div>
            <div class="chart-bar" style="height: ${heightPct}%;"></div>
            <div class="chart-col-label">${escapeHTML(pt.date.substring(5))}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function loadAdminDrivers() {
  try {
    const res = await apiRequest('/api/admin/drivers');
    const tbody = document.getElementById('adminDriversTable');
    if (!tbody) return;

    tbody.innerHTML = res.drivers.map(d => `
      <tr>
        <td><strong>#${escapeHTML(d.id)}</strong></td>
        <td>${escapeHTML(d.name)}</td>
        <td>${escapeHTML(d.phone)}</td>
        <td><strong>${escapeHTML(d.district)}</strong></td>
        <td>
          <span class="status-pill status-${d.status.toLowerCase()}">${d.status === 'FREE' ? '🟢 متفرغ ومتاح' : '🚚 في مهمة استلام'}</span>
        </td>
        <td>${d.active_deal_id ? '#' + escapeHTML(d.active_deal_id) : '—'}</td>
        <td>
          <button class="btn-quick-prompt" onclick="toggleDriverStatus('${d.id}', '${d.status}')">
            ${d.status === 'FREE' ? 'تعيين مهمة' : 'إنهاء المهمة وإتاحته'}
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load drivers matrix:', err);
  }
}

async function toggleDriverStatus(driverId, currentStatus) {
  const newStatus = currentStatus === 'FREE' ? 'ON_DELIVERY' : 'FREE';
  try {
    await apiRequest(`/api/admin/drivers/${driverId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: newStatus })
    });
    showToast('تحديث حالة الكابتن', `تم تغيير حالة الكابتن #${driverId} إلى ${newStatus}`, 'success');
    loadAdminDrivers();
  } catch (err) {
    showToast('خطأ', err.message, 'error');
  }
}

// ------------------ Floating AI Compare & Search Chatbot ------------------
function toggleCompareChatbot() {
  const panel = document.getElementById('floatingChatbotPanel');
  if (!panel) return;
  panel.classList.toggle('active');
  if (panel.classList.contains('active')) {
    const inp = document.getElementById('chatbotInput');
    if (inp) inp.focus();
  }
}

async function sendCompareMessage() {
  const inp = document.getElementById('chatbotInput');
  const box = document.getElementById('chatbotMessages');
  if (!inp || !box) return;

  const query = inp.value.trim();
  if (!query) return;

  // Append user message
  const userMsg = document.createElement('div');
  userMsg.className = 'chatbot-msg-bubble user';
  userMsg.innerText = query;
  box.appendChild(userMsg);
  inp.value = '';
  box.scrollTop = box.scrollHeight;

  // Append typing indicator
  const typingMsg = document.createElement('div');
  typingMsg.className = 'chatbot-msg-bubble bot';
  typingMsg.innerHTML = 'جاري البحث والمقارنة بالذكاء الاصطناعي... ⏳';
  box.appendChild(typingMsg);
  box.scrollTop = box.scrollHeight;

  try {
    const res = await apiRequest('/api/chatbot/compare', {
      method: 'POST',
      body: JSON.stringify({ query: query })
    });

    typingMsg.innerHTML = `<div>${escapeHTML(res.answer)}</div>`;

    if (res.items && res.items.length > 0) {
      const itemsHtml = document.createElement('div');
      itemsHtml.className = 'chatbot-compare-cards';
      itemsHtml.innerHTML = res.items.map(item => `
        <div class="chatbot-mini-card" onclick="openProductDetailModal('${item.id}')">
          <div style="font-weight: 800; font-size: 12px; color: var(--color-ink);">${escapeHTML(item.title)}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
            <span class="grade-badge grade-${(item.condition_grade || 'A').toLowerCase()}">${item.condition_grade}</span>
            <span style="font-weight: 800; color: #E00000; font-size: 13px;">${formatEGP(item.expected_resale_price)}</span>
          </div>
          <div style="font-size: 10px; color: var(--color-muted); margin-top: 2px;">📍 ${escapeHTML(item.district || 'الإسكندرية')}</div>
        </div>
      `).join('');
      typingMsg.appendChild(itemsHtml);
    }
    box.scrollTop = box.scrollHeight;
  } catch (err) {
    typingMsg.innerHTML = 'عذراً، حدث خطأ أثناء المعالجة. يرجى المحاولة مرة أخرى.';
  }
}

// ------------------ URL Hash Routing (Deep Linking) ------------------
function handleHashRouting() {
  const hash = window.location.hash.replace('#', '').trim();
  if (!hash) return;

  if (hash.startsWith('item-')) {
    const itemId = hash.replace('item-', '');
    switchPortalView('showroom', false);
    setTimeout(() => openProductDetailModal(itemId), 400);
    return;
  }

  if (hash.startsWith('track-')) {
    const trackCode = hash.replace('track-', '');
    switchPortalView('tracking', false);
    setTimeout(() => quickTrack(trackCode), 300);
    return;
  }

  if (hash === 'delivery' || hash === 'delivery-portal') {
    switchPortalView('delivery-portal', false);
    return;
  }

  if (hash === 'admin' || hash === 'admin-master' || hash === 'admin-portal') {
    switchPortalView('admin-portal', false);
    return;
  }

  if (hash === 'account') {
    switchPortalView('account', false);
    return;
  }

  const validViews = ['showroom', 'seller', 'merchant', 'trader-studio', 'driver-logs', 'price-index', 'tracking', 'about', 'account', 'delivery-portal', 'admin-portal'];
  if (validViews.includes(hash)) {
    switchPortalView(hash, false);
  }
}
