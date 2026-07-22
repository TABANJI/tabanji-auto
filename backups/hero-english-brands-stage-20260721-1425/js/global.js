(() => {
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

  window.tabanjiAccentHeadings = (root = document) => {
    root.querySelectorAll('.display:not([data-accented])').forEach((heading) => {
      const text = heading.textContent.trim();
      const splitAt = text.lastIndexOf(' ');
      if (splitAt < 1) return;
      heading.textContent = `${text.slice(0, splitAt)} `;
      const accent = document.createElement('span');
      accent.className = 'accent-word';
      accent.textContent = text.slice(splitAt + 1);
      heading.append(accent);
      heading.dataset.accented = 'true';
    });
  };

  window.tabanjiAccentHeadings();

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
        console.warn(`TABANJI: пошкоджені дані ${key} було скинуто.`, error);
        try {
          localStorage.removeItem(key);
        } catch (_) {
          // Storage може бути недоступним у приватному режимі.
        }
        return fallback;
      }
    },

    write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn(`TABANJI: не вдалося зберегти ${key}.`, error);
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
    syncBodyLock();

    if (wasOpen && restoreFocus) {
      menuButton.focus();
    }
  }

  function openModal(button) {
    closeMenu();
    modalOpener = button;
    modalTitle.textContent = button.dataset.modal || 'Приватна консультація';
    delete modalTitle.dataset.accented;
    window.tabanjiAccentHeadings(modal);
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

  document.querySelector('#searchShortcut').addEventListener('click', () => {
    const target = document.querySelector('.search') || document.querySelector('#filterForm');
    if (target) {
      window.tabanjiScrollIntoView(target);
      target.querySelector('input[type="search"]')?.focus();
    }
  });

  menuButton.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    syncBodyLock();
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
      ? 'Дякуємо. Ваш персональний менеджер зв’яжеться з вами найближчим часом.'
      : 'Заявку перевірено, але браузер заблокував локальне збереження. Спробуйте ще раз.';
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
