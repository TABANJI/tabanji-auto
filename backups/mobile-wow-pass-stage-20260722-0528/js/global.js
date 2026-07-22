(() => {
  const t = (key, vars) => window.tabanjiI18n?.t(key, vars) ?? key;
  const body = document.body;
  const header = document.querySelector('.header');
  const nav = document.querySelector('.nav');
  const menuButton = document.querySelector('.menu-btn');
  const modal = document.querySelector('.modal');
  const modalPanel = document.querySelector('.modal__panel');
  const leadForm = document.querySelector('#leadForm');
  const modalTitle = document.querySelector('#modalTitle');
  const formNote = document.querySelector('.form-note');
  const toTopButton = document.querySelector('.to-top');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let modalOpener = null;
  let searchCorrectionTimer = null;

  window.tabanjiScrollIntoView = (element) => {
    element.scrollIntoView({
      behavior: reducedMotionQuery.matches ? 'auto' : 'smooth'
    });
  };

  window.tabanjiStorage = {
    read(key, fallback) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key));
        return parsed ?? fallback;
      } catch (error) {
        console.warn(`TABANJI: corrupted ${key} data was reset.`, error);
        try {
          localStorage.removeItem(key);
        } catch (_) {
          // Storage may be unavailable in private browsing mode.
        }
        return fallback;
      }
    },

    write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn(`TABANJI: could not save ${key}.`, error);
        return false;
      }
    }
  };

  function syncBodyLock() {
    const overlayOpen = nav.classList.contains('open') || modal.classList.contains('open');
    body.classList.toggle('locked', overlayOpen);
  }

  function syncScrollState() {
    header.classList.toggle('scrolled', window.scrollY > 30);
    toTopButton.classList.toggle('visible', window.scrollY > 600);
  }

  function closeMenu({ restoreFocus = false } = {}) {
    const wasOpen = nav.classList.contains('open');
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', t('ui.openMenu'));
    syncBodyLock();

    if (wasOpen && restoreFocus) {
      menuButton.focus();
    }
  }

  function openModal(button) {
    closeMenu();
    modalOpener = button;
    modalTitle.textContent = button.dataset.modal === 'Private Consultation'
      ? t('ui.consultation')
      : (button.dataset.modal || t('ui.consultation'));
    formNote.textContent = '';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    syncBodyLock();
    window.setTimeout(() => leadForm.elements.name.focus(), 30);
  }

  function closeModal() {
    if (!modal.classList.contains('open')) {
      return;
    }

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    syncBodyLock();
    modalOpener?.focus();
    modalOpener = null;
  }

  function getFocusableModalElements() {
    return [...modalPanel.querySelectorAll('button, input, select, textarea, a[href]')]
      .filter((element) => !element.disabled && element.getAttribute('aria-hidden') !== 'true');
  }

  window.addEventListener('scroll', syncScrollState, { passive: true });
  syncScrollState();

  function getHeaderOffset() {
    const currentHeader = document.querySelector('.header') || document.querySelector('header');
    const headerHeight = currentHeader?.getBoundingClientRect().height ?? 0;
    const extraGap = window.matchMedia('(max-width: 640px)').matches ? 14 : 18;
    return headerHeight + extraGap;
  }

  function scrollToVehicleSearch() {
    const panel = document.querySelector('#vehicle-search') || document.querySelector('#catalog-filters');
    if (!panel) {
      if (document.querySelector('#carPlaceholder')) {
        window.location.href = 'cars.html?focus=search';
      }
      return;
    }

    const top = window.scrollY + panel.getBoundingClientRect().top - getHeaderOffset();
    window.scrollTo({
      top: Math.max(0, top),
      behavior: reducedMotionQuery.matches ? 'auto' : 'smooth'
    });

    window.clearTimeout(searchCorrectionTimer);
    searchCorrectionTimer = window.setTimeout(() => {
      const correctedTop = window.scrollY + panel.getBoundingClientRect().top - getHeaderOffset();
      if (Math.abs(correctedTop - window.scrollY) > 3) {
        window.scrollTo({ top: Math.max(0, correctedTop), behavior: 'auto' });
      }
      panel.querySelector('#brand, [name="q"], [name="brand"]')?.focus({ preventScroll: true });
    }, reducedMotionQuery.matches ? 0 : 420);
  }

  document.querySelector('#searchShortcut').addEventListener('click', (event) => {
    event.preventDefault();
    closeMenu();
    window.requestAnimationFrame(scrollToVehicleSearch);
  });

  menuButton.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? t('ui.close') : t('ui.openMenu'));
    syncBodyLock();
    if (isOpen && window.matchMedia('(max-width: 768px)').matches) {
      window.requestAnimationFrame(() => nav.querySelector('a')?.focus());
    }
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      closeMenu();
    } else if (event.target === nav) {
      closeMenu({ restoreFocus: true });
    }
  });

  document.addEventListener('click', (event) => {
    const noticeButton = event.target.closest('[data-notice]');
    if (noticeButton) {
      window.alert(noticeButton.dataset.notice);
      return;
    }

    const modalButton = event.target.closest('[data-modal]');
    if (modalButton) {
      openModal(modalButton);
    }
  });

  document.querySelector('.modal__close').addEventListener('click', closeModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (modal.classList.contains('open')) {
        closeModal();
      } else if (nav.classList.contains('open')) {
        closeMenu({ restoreFocus: true });
      }
      return;
    }

    if (event.key === 'Tab' && nav.classList.contains('open') && window.matchMedia('(max-width: 768px)').matches) {
      const focusableNav = [...nav.querySelectorAll('a[href]'), menuButton];
      const first = focusableNav[0];
      const last = focusableNav.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    if (event.key !== 'Tab' || !modal.classList.contains('open')) {
      return;
    }

    const focusable = getFocusableModalElements();
    const first = focusable[0];
    const last = focusable.at(-1);

    if (!first || !last) {
      event.preventDefault();
      modalPanel.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  leadForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!leadForm.reportValidity()) {
      return;
    }

    const storedLeads = window.tabanjiStorage.read('tabanjiLeads', []);
    const leads = Array.isArray(storedLeads) ? storedLeads : [];
    leads.push({
      ...Object.fromEntries(new FormData(leadForm)),
      createdAt: new Date().toISOString()
    });

    const saved = window.tabanjiStorage.write('tabanjiLeads', leads);
    leadForm.reset();
    formNote.textContent = saved
      ? t('ui.thanks')
      : t('ui.leadError');
  });

  toTopButton.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotionQuery.matches ? 'auto' : 'smooth'
    });
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach((element) => {
    revealObserver.observe(element);
  });
})();
