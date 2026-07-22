(() => {
  const locales = window.TABANJI_LOCALES || {};
  const original = new WeakMap();
  const supported = ['en', 'ar'];
  const saved = (() => { try { return localStorage.getItem('tabanjiLanguage'); } catch (_) { return null; } })();
  let language = supported.includes(saved) ? saved : 'en';

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
    document.title = locales[language].meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', locales[language].meta.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', locales[language].meta.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', locales[language].meta.description);
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', language === 'ar' ? 'ar_LB' : 'en_US');
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = language === 'ar' ? 'https://example.com/?lang=ar' : 'https://example.com/?lang=en';
    const structured = document.querySelector('#structuredData');
    if (structured) {
      try {
        const data = JSON.parse(structured.textContent);
        data.description = locales[language].meta.description;
        data.url = canonical?.href || data.url;
        data.inLanguage = language;
        structured.textContent = JSON.stringify(data);
      } catch (_) { /* Preserve valid static fallback if markup was changed. */ }
    }
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('is-rtl', language === 'ar');
    const heroDesktopSource = document.querySelector('#heroDesktopSource');
    if (heroDesktopSource) {
      heroDesktopSource.srcset = language === 'ar'
        ? 'assets/images/hero-tabanji-amg-desktop-ar-v2.jpg'
        : 'assets/images/hero-tabanji-amg-desktop-v6.jpg';
    }
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
  window.tabanjiI18n = { t: get, getLanguage: () => language, setLanguage, translate };
  document.querySelector('#languageSwitcher')?.addEventListener('click', () => setLanguage(language === 'en' ? 'ar' : 'en'));
  translate();
})();
