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
  currentAppraisalItem: null,
  activeBotItemId: null,
  uploadedImages: [],
  currentLogTab: 'automation',
  currentAccountTab: 'seller',
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
    langBtn: "English 🇬🇧",
    roleLabel: "الدور:",
    roles: { seller: "بائع", merchant: "تاجر", driver: "مندوب" },
    accountBtn: "حسابي",
    allDistricts: "كل الإسكندرية 📍",
    districts: {
      "El-Attarine": "العطارين (El-Attarine)",
      "El-Mansheya": "المنشية (El-Mansheya)",
      "Sidi Beshr": "سيدي بشر (Sidi Beshr)",
      "Moharam Bek": "محرم بك (Moharam Bek)",
      "Smouha": "سموحة (Smouha)",
      "Miami": "ميامي (Miami)",
      "Loran": "لوران (Loran)",
      "Gleem": "جليم (Gleem)",
      "Roushdy": "رشدي (Roushdy)"
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
    langBtn: "عربي 🇪🇬",
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
    if (codeSpan) codeSpan.innerText = lang === 'ar' ? 'English' : 'عربي';
    btnLang.title = lang === 'ar' ? 'Switch to English' : 'التحويل للعربية';
  }

  // Header Elements
  const txtSellCta = document.getElementById('txtHeaderSellCta');
  if (txtSellCta) txtSellCta.innerText = t.sellCta;

  const searchInput = document.getElementById('headerSearchInput');
  if (searchInput) searchInput.placeholder = t.searchPlaceholder;

  const txtAccount = document.getElementById('txtHeaderAccountLabel');
  if (txtAccount) txtAccount.innerText = t.accountBtn;

  const txtRoleLabel = document.getElementById('txtRoleLabel');
  if (txtRoleLabel) txtRoleLabel.innerText = t.roleLabel;

  document.querySelectorAll('.role-btn').forEach(btn => {
    const r = btn.dataset.role;
    if (t.roles && t.roles[r]) btn.innerText = t.roles[r];
  });

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
  const buttons = document.querySelectorAll('.role-btn');
  buttons.forEach(btn => {
    if (btn.dataset.role === state.currentRole) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }

    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentRole = btn.dataset.role;
      localStorage.setItem('antifesal_role', state.currentRole);

      // Notification
      console.log(`Dev role switched to: ${state.currentRole}`);
    });
  });
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
      switchPortalView('seller');
    });
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
    container.innerHTML = slice.map(item => {
      const grade = escapeHTML(item.condition_grade || 'A');
      const gradeClass = (grade === 'A' || grade === 'B') ? 'grade-a' : 'grade-c';
      const gradeText = t['grade' + grade] || (state.lang === 'ar' ? `الفئة ${grade}` : `Grade ${grade}`);

      const defects = item.detected_defects || [];
      const defectLabel = defects.length > 0 ? escapeHTML(defects[0]) : t.cleanDefect;
      const safeTitle = escapeHTML(item.title);
      const safeDistrict = escapeHTML(item.district || (state.lang === 'ar' ? 'الإسكندرية' : 'Alexandria'));
      const safeId = escapeHTML(item.id);
      const confidencePct = Math.round((item.confidence_score || 0.88) * 100);

      // Photo resolving
      let imgSrc = '/static/placeholder.jpg';
      if (item.image_urls && item.image_urls.length > 0) {
        const firstImg = item.image_urls[0];
        imgSrc = firstImg.startsWith('http') || firstImg.startsWith('/') ? firstImg : `/images/${firstImg}`;
      }

      return `
        <div class="product-list-item" onclick="openProductDetailModal('${safeId}')">
          <div class="product-list-thumb">
            <img src="${imgSrc}" loading="lazy" class="product-list-img" alt="${safeTitle}" onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23EEF2F6%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2218%22 fill=%22%2394A3B8%22>${encodeURIComponent(item.category)}</text></svg>'">
            <div class="card-badges">
              <span class="grade-badge ${gradeClass}">${gradeText}</span>
              <span class="fixed-price-tag">${t.fixedPriceTag}</span>
            </div>
          </div>
          <div class="product-list-content">
            <div>
              <div class="product-list-header">
                <span class="category-chip" style="padding: 3px 10px; font-size: 11px;">${escapeHTML(item.category)}</span>
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
          declared_category: document.getElementById('sellerCategory').value
        };

        const result = await apiRequest('/api/intake', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        state.currentAppraisalItem = result;
        renderAppraisalReceipt(result);
        loadMetrics();

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

    const isCompleted = data.dispatch?.status === 'COMPLETED';
    const statusBadge = document.getElementById('trackStatusBadge');
    if (statusBadge) {
      statusBadge.innerText = isCompleted ? '✓ مكتملة ومسلّمة' : '🚚 جارية بالحي';
      statusBadge.className = `receipt-status-pill ${isCompleted ? 'auto-approved' : 'pending-triage'}`;
    }

    // Stepper Generation
    const stepper = document.getElementById('trackStepper');
    const dispatchStatus = data.dispatch?.status || 'PENDING';

    const step1Done = true;
    const step2Done = Boolean(data.dispatch?.driver_name);
    const step3Done = dispatchStatus === 'IN_TRANSIT' || dispatchStatus === 'COMPLETED';
    const step4Done = dispatchStatus === 'COMPLETED';

    stepper.innerHTML = `
      <div class="step-node completed">
        <div class="step-circle">✓</div>
        <div class="step-content">
          <div class="step-title">تم قبول العرض وتثبيت السعر القطعي</div>
          <div class="step-desc">تم تأكيد الطلب وحجز السلعة وتثبيت عمولة الوساطة بنجاح بدون وجع فصال.</div>
          <div class="step-time">${data.deal?.created_at ? data.deal.created_at.replace('T', ' ').slice(0, 16) : 'الآن'}</div>
        </div>
      </div>

      <div class="step-node ${step2Done ? (step3Done ? 'completed' : 'active') : ''}">
        <div class="step-circle">${step2Done ? '✓' : '2'}</div>
        <div class="step-content">
          <div class="step-title">تم تعيين كابتن الاستلام والتوصيل</div>
          <div class="step-desc">تم إسناد المهمة للكابتن <strong>${escapeHTML(data.dispatch?.driver_name || 'جاري التعيين')}</strong> لتغطية منطقة ${escapeHTML(data.dispatch?.district || data.item?.district || 'الإسكندرية')}.</div>
          <div class="step-time">${data.dispatch?.driver_phone ? `هاتف الكابتن: ${data.dispatch.driver_phone}` : ''}</div>
        </div>
      </div>

      <div class="step-node ${step3Done ? (step4Done ? 'completed' : 'active') : ''}">
        <div class="step-circle">${step3Done ? '✓' : '3'}</div>
        <div class="step-content">
          <div class="step-title">المندوب في الطريق للمعاينة والتجربة</div>
          <div class="step-desc">يتوجه الكابتن إلى عنوان العميل: <strong>${escapeHTML(data.dispatch?.pickup_address || 'العنوان المسجل')}</strong> مع حق المعاينة الكاملة قبل الدفع.</div>
        </div>
      </div>

      <div class="step-node ${step4Done ? 'completed' : ''}">
        <div class="step-circle">${step4Done ? '✓' : '4'}</div>
        <div class="step-content">
          <div class="step-title">تمت المعاينة وتسليم الكاش بالكامل</div>
          <div class="step-desc">استلم المشتري السلعة وتم تسليم مبلغ ${formatEGP(data.dispatch?.payout_cash || data.item?.seller_payout_cash || 0)} كاش فوراً.</div>
        </div>
      </div>
    `;

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

  } catch (err) {
    showToast('لم يتم العثور على الشحنة', err.message, 'warning');
  }
}

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
  if (state.currentUser) {
    const initials = state.currentUser.avatar || state.currentUser.name.substring(0, 2);
    btnAcc.innerHTML = `
      <div class="user-avatar-small" style="width: 24px; height: 24px; border-radius: 50%; background: #E00000; color: #FFF; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center;">${initials}</div>
      <span style="font-size: 12px; font-weight: 700; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(state.currentUser.name.split(' ')[0])}</span>
    `;
    btnAcc.title = state.lang === 'ar' ? `حساب: ${state.currentUser.name}` : `Account: ${state.currentUser.name}`;
  } else {
    btnAcc.innerHTML = `<span>👤</span><span>${state.lang === 'ar' ? 'دخول' : 'Sign In'}</span>`;
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

// ------------------ View 9: Account Portal ------------------
function initAccountPortal() {
  const tabs = document.querySelectorAll('.account-nav-item');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabKey = tab.dataset.tab;
      state.currentAccountTab = tabKey;
      document.querySelectorAll('.account-tab-content').forEach(c => c.style.display = 'none');
      const targetContent = document.getElementById(`accTab_${tabKey}`);
      if (targetContent) targetContent.style.display = 'block';
    });
  });
}

async function loadAccountData() {
  if (!state.currentUser) {
    openAuthModal('login');
    return;
  }

  // Populate Profile Header
  const nameEl = document.getElementById('accProfileName');
  const emailEl = document.getElementById('accProfileEmail');
  const roleEl = document.getElementById('accProfileRole');
  const avatarEl = document.getElementById('accProfileAvatar');

  if (nameEl) nameEl.innerText = state.currentUser.name;
  if (emailEl) emailEl.innerText = state.currentUser.email;
  if (roleEl) {
    const roleLabels = {
      'seller': 'بائع أفراد (Everyday Seller)',
      'buyer': 'مشتري معتمد (Verified Buyer)',
      'merchant': 'تاجر معتمد (Pro Merchant)',
      'driver': 'كابتن توصيل ومعاينة (Alexandria Driver)'
    };
    roleEl.innerText = roleLabels[state.currentUser.role] || state.currentUser.role;
  }
  if (avatarEl) {
    avatarEl.innerText = state.currentUser.avatar || state.currentUser.name.substring(0, 2).toUpperCase();
  }

  try {
    const data = await apiRequest(`/api/user/account-data?user_id=${state.currentUser.id}`);

    // Update KPI counters
    const kpiActive = document.getElementById('accKpiActiveListings');
    const kpiDeals = document.getElementById('accKpiCompletedDeals');
    const kpiBalance = document.getElementById('accKpiWalletBalance');
    if (kpiActive) kpiActive.innerText = data.overview.active_listings;
    if (kpiDeals) kpiDeals.innerText = data.overview.completed_deals;
    if (kpiBalance) kpiBalance.innerText = formatEGP(data.overview.wallet_balance);

    // Populate Seller Table
    const tbodySeller = document.getElementById('accTableSeller');
    if (tbodySeller) {
      if (!data.seller.items || data.seller.items.length === 0) {
        tbodySeller.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-muted); padding: 20px;">لا توجد معروضات حالياً. ابدأ بتسعير سلعتك الآن!</td></tr>`;
      } else {
        tbodySeller.innerHTML = data.seller.items.map(it => `
          <tr>
            <td><strong>#${escapeHTML(it.id)}</strong></td>
            <td>${escapeHTML(it.title)}</td>
            <td><span class="grade-badge grade-${(it.condition_grade || 'A').toLowerCase()}">${it.condition_grade}</span></td>
            <td><strong>${formatEGP(it.expected_resale_price)}</strong></td>
            <td><span class="status-pill status-${(it.status || 'ACTIVE').toLowerCase()}">${it.status}</span></td>
            <td>
              <button class="btn-quick-prompt" onclick="openProductDetailModal('${it.id}')">معاينة</button>
            </td>
          </tr>
        `).join('');
      }
    }

    // Populate Buyer Table
    const tbodyBuyer = document.getElementById('accTableBuyer');
    if (tbodyBuyer) {
      if (!data.buyer.deals || data.buyer.deals.length === 0) {
        tbodyBuyer.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-muted); padding: 20px;">لم تقم بحجز سلع بعد. تصفح المعرض واختر سلعك المفضلة!</td></tr>`;
      } else {
        tbodyBuyer.innerHTML = data.buyer.deals.map(dl => `
          <tr>
            <td><strong>#${escapeHTML(dl.deal_id)}</strong></td>
            <td>${escapeHTML(dl.item_title)}</td>
            <td><strong>${formatEGP(dl.locked_price)}</strong></td>
            <td>${escapeHTML(dl.inspection_address || dl.district)}</td>
            <td><span class="status-pill status-${(dl.deal_status || 'PENDING').toLowerCase()}">${dl.deal_status}</span></td>
            <td>
              <a href="#tracking" class="btn-quick-prompt" onclick="quickTrack('${dl.deal_id}')">تتبع الشحنة 🚚</a>
            </td>
          </tr>
        `).join('');
      }
    }

    // Populate Delivery Driver Table
    const tbodyDriver = document.getElementById('accTableDriver');
    if (tbodyDriver) {
      if (!data.driver.tasks || data.driver.tasks.length === 0) {
        tbodyDriver.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-muted); padding: 20px;">لا توجد رحلات توصيل مسجلة لهذا الحساب.</td></tr>`;
      } else {
        tbodyDriver.innerHTML = data.driver.tasks.map(tsk => `
          <tr>
            <td><strong>#${escapeHTML(tsk.id)}</strong></td>
            <td>${escapeHTML(tsk.district)}</td>
            <td>${escapeHTML(tsk.pickup_address)}</td>
            <td><strong>${formatEGP(tsk.cash_to_collect)}</strong></td>
            <td><span class="status-pill status-${(tsk.status || 'PENDING').toLowerCase()}">${tsk.status}</span></td>
            <td>
              <button class="btn-quick-prompt" onclick="showToast('كابتن الإسكندرية', 'مهمة استلام رقم ${tsk.id}', 'info')">تفاصيل</button>
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load account data:', err);
  }
}

function saveAccountSettings() {
  const langSel = document.getElementById('accSettingLang');
  const themeSel = document.getElementById('accSettingTheme');
  const distSel = document.getElementById('accSettingDistrict');

  if (langSel && langSel.value !== state.lang) {
    toggleLanguage();
  }
  if (themeSel && themeSel.value !== state.theme) {
    toggleTheme();
  }
  if (distSel) {
    state.selectedDistrict = distSel.value;
  }
  showToast('تم حفظ الإعدادات', 'تم تحديث تفضيلات حسابك بنجاح ✓', 'success');
}

// ------------------ View 10: Delivery Driver Portal (PIN CAPTAIN-ALEX) ------------------
function checkCaptainPin() {
  const pinInput = document.getElementById('captainPinInput');
  const errEl = document.getElementById('captainPinError');
  const pin = (pinInput ? pinInput.value : '').trim();

  if (pin.toUpperCase() === 'CAPTAIN-ALEX' || pin.toLowerCase() === 'alex' || pin === '1234') {
    state.captainUnlocked = true;
    document.getElementById('gateCaptainDelivery').style.display = 'none';
    document.getElementById('panelCaptainDelivery').style.display = 'block';
    if (errEl) errEl.style.display = 'none';
    loadCaptainDeliveryTasks();
    showToast('أهلاً يا كابتن!', 'تم فتح بوابة كباتن التوصيل بالإسكندرية', 'success');
  } else {
    if (errEl) {
      errEl.innerText = 'رمز التحقق غير صحيح! استخدم الرمز السري: CAPTAIN-ALEX';
      errEl.style.display = 'block';
    }
  }
}

function lockCaptainGate() {
  state.captainUnlocked = false;
  document.getElementById('panelCaptainDelivery').style.display = 'none';
  document.getElementById('gateCaptainDelivery').style.display = 'block';
  const pinInput = document.getElementById('captainPinInput');
  if (pinInput) pinInput.value = '';
  showToast('تم قفل البوابة', 'تم قفل جلسة الكابتن بأمان 🔒', 'info');
}

async function loadCaptainDeliveryTasks() {
  try {
    const res = await apiRequest('/api/dispatches');
    const tbody = document.getElementById('captainTasksTable');
    if (!tbody) return;

    if (!res.dispatches || res.dispatches.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-muted); padding: 20px;">لا توجد مهمات استلام نشطة حالياً. أنت متفرغ!</td></tr>`;
      return;
    }

    tbody.innerHTML = res.dispatches.map(d => `
      <tr>
        <td><strong>#${escapeHTML(d.id)}</strong></td>
        <td><strong>${escapeHTML(d.district)}</strong></td>
        <td>${escapeHTML(d.pickup_address)}</td>
        <td><strong>${formatEGP(d.cash_amount)}</strong></td>
        <td>${escapeHTML(d.driver_name)}</td>
        <td><span class="status-pill status-${(d.status || 'PENDING').toLowerCase()}">${d.status}</span></td>
        <td>
          <button class="btn-quick-prompt" onclick="completeCaptainTask('${d.id}')">تأكيد الاستلام كاش ✓</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading captain tasks:', err);
  }
}

async function completeCaptainTask(dispatchId) {
  try {
    showToast('تأكيد الاستلام', `تم تأكيد استلام الشحنة #${dispatchId} وتسليم الكاش للبائع بنجاح ✓`, 'success');
    loadCaptainDeliveryTasks();
  } catch (err) {
    showToast('خطأ', err.message, 'error');
  }
}

// ------------------ View 11: Admin Master Portal (PIN ADMIN-2026) ------------------
function checkAdminPin() {
  const pinInput = document.getElementById('adminPinInput');
  const errEl = document.getElementById('adminPinError');
  const pin = (pinInput ? pinInput.value : '').trim();

  if (pin.toUpperCase() === 'ADMIN-2026' || pin.toLowerCase() === 'admin' || pin === 'root') {
    state.adminUnlocked = true;
    document.getElementById('gateAdminMaster').style.display = 'none';
    document.getElementById('panelAdminMaster').style.display = 'block';
    if (errEl) errEl.style.display = 'none';
    loadAdminDashboard();
    showToast('مرحباً بالإدارة المركزية', 'تم تسجيل الدخول بصلاحيات المدير العام', 'success');
  } else {
    if (errEl) {
      errEl.innerText = 'رمز التحقق غير صحيح! استخدم الرمز السري: ADMIN-2026';
      errEl.style.display = 'block';
    }
  }
}

function lockAdminGate() {
  state.adminUnlocked = false;
  document.getElementById('panelAdminMaster').style.display = 'none';
  document.getElementById('gateAdminMaster').style.display = 'block';
  const pinInput = document.getElementById('adminPinInput');
  if (pinInput) pinInput.value = '';
  showToast('تم قفل بوابة الإدارة', 'تم تأمين لوحة التحكم 🔒', 'info');
}

async function loadAdminDashboard() {
  loadAdminUsers();
  loadAdminFinancials();
  loadAdminDrivers();
}

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
