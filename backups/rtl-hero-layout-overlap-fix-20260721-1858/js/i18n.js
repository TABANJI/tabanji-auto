(() => {
  const locales = window.TABANJI_LOCALES || {};
  const original = new WeakMap();
  const supported = ['en', 'ar'];
  const saved = (() => { try { return localStorage.getItem('tabanjiLanguage'); } catch (_) { return null; } })();
  let language = supported.includes(saved) ? saved : 'en';
  let heroArtworkRequest = 0;
  const heroAssets = {
    en: {
      desktop: 'assets/images/hero-tabanji-amg-desktop-v6.jpg',
      mobile: 'assets/images/hero-tabanji-amg-final.jpg'
    },
    ar: {
      desktop: 'assets/images/hero-tabanji-amg-desktop-ar-v2.jpg',
      mobile: 'assets/images/hero-tabanji-amg-final.jpg'
    }
  };

  function updateHeroArtwork(nextLanguage) {
    const desktopSource = document.querySelector('#heroDesktopSource');
    const heroImage = document.querySelector('#heroImage');
    if (!desktopSource || !heroImage) return;

    const fallback = heroAssets.en;
    const target = heroAssets[nextLanguage] || fallback;
    const request = ++heroArtworkRequest;

    if (!heroImage.dataset.fallbackReady) {
      heroImage.dataset.fallbackReady = 'true';
      heroImage.addEventListener('error', () => {
        if (heroImage.dataset.fallbackApplied === 'true') return;
        heroImage.dataset.fallbackApplied = 'true';
        desktopSource.setAttribute('srcset', fallback.desktop);
        heroImage.setAttribute('src', fallback.mobile);
      });
    }

    const preload = new Image();
    preload.onload = () => {
      if (request !== heroArtworkRequest) return;
      heroImage.dataset.fallbackApplied = 'false';
      heroImage.setAttribute('src', target.mobile);
      desktopSource.setAttribute('srcset', target.desktop);
    };
    preload.onerror = () => {
      if (request !== heroArtworkRequest) return;
      desktopSource.setAttribute('srcset', fallback.desktop);
      heroImage.setAttribute('src', fallback.mobile);
    };
    preload.src = target.desktop;
  }

  function interpolate(value, vars = {}) { return String(value).replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? ''); }
  function get(path, vars) {
    const value = path.split('.').reduce((node, key) => node?.[key], locales[language]);
    return interpolate(value ?? path, vars);
  }
  function translate(root = document) {
    const dict = locales[language]?.text || {};
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest('script,style')) continue;
      if (!original.has(node)) original.set(node, node.nodeValue);
      const source = original.get(node);
      const trimmed = source.trim();
      node.nodeValue = trimmed && dict[trimmed] ? source.replace(trimmed, dict[trimmed]) : source;
    }
    root.querySelectorAll('[aria-label]').forEach((el) => {
      if (!el.dataset.i18nAriaSource) el.dataset.i18nAriaSource = el.getAttribute('aria-label');
      const source = el.dataset.i18nAriaSource;
      el.setAttribute('aria-label', dict[source] || source);
    });
    const pageMetaKey = document.body.dataset.page === 'catalog' ? 'catalogMeta' : document.body.dataset.page === 'car' ? 'carMeta' : 'meta';
    const pageMeta = locales[language][pageMetaKey] || locales[language].meta;
    document.title = pageMeta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', pageMeta.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', pageMeta.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', pageMeta.description);
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', language === 'ar' ? 'ar_LB' : 'en_US');
    const canonical = document.querySelector('link[rel="canonical"]');
    const canonicalPath = document.body.dataset.page === 'catalog' ? '/cars.html' : document.body.dataset.page === 'car' ? '/car.html' : '/';
    if (canonical) canonical.href = `https://example.com${canonicalPath}?lang=${language}`;
    const structured = document.querySelector('#structuredData');
    if (structured) {
      try {
        const data = JSON.parse(structured.textContent);
        data.description = pageMeta.description;
        data.url = canonical?.href || data.url;
        data.inLanguage = language;
        structured.textContent = JSON.stringify(data);
      } catch (_) { /* Preserve valid static fallback if markup was changed. */ }
    }
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('is-rtl', language === 'ar');
    updateHeroArtwork(language);
    const switcher = document.querySelector('#languageSwitcher');
    if (switcher) { switcher.textContent = 'EN | AR'; switcher.setAttribute('aria-label', language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'); }
  }
  function setLanguage(next) {
    if (!supported.includes(next)) return;
    document.body.classList.add('language-changing');
    language = next;
    try { localStorage.setItem('tabanjiLanguage', language); } catch (_) {}
    translate();
    window.dispatchEvent(new CustomEvent('tabanji:languagechange', { detail: { language } }));
    requestAnimationFrame(() => document.body.classList.remove('language-changing'));
  }
  window.tabanjiI18n = { t: get, getLanguage: () => language, setLanguage, translate, updateHeroArtwork };
  document.querySelector('#languageSwitcher')?.addEventListener('click', () => setLanguage(language === 'en' ? 'ar' : 'en'));
  translate();
})();
