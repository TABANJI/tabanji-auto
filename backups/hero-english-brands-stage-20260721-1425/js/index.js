(() => {
  const cars = Array.isArray(window.TABANJI_CARS) ? window.TABANJI_CARS : [];
  const grid = document.querySelector('#carsGrid');
  const brandSelect = document.querySelector('#brand');
  const modelSelect = document.querySelector('#model');
  const yearSelect = document.querySelector('#year');
  const priceSelect = document.querySelector('#price');
  const searchResult = document.querySelector('.search__result');
  const favoritesButton = document.querySelector('#favoritesShortcut');
  const statusLabels = {
    available: 'У наявності',
    new: 'Нове надходження',
    exclusive: 'Ексклюзив',
    reserved: 'Зарезервовано',
    sold: 'Продано',
    on_request: 'Під замовлення'
  };
  let activeBrand = '';

  function formatPrice(car) {
    return `${new Intl.NumberFormat('uk-UA').format(car.price)} €`;
  }

  function getFavorites() {
    const stored = window.tabanjiStorage.read('tabanjiFavorites', []);
    return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : [];
  }

  function updateFavoriteCount() {
    document.querySelector('.favorite-count').textContent = getFavorites().length;
  }

  function carTemplate(car) {
    const isFavorite = getFavorites().includes(car.id);

    return `
      <article class="car-card reveal visible">
        <div class="car-card__media">
          <img
            src="${car.image}"
            alt="${car.brand} ${car.model}, ${car.year}"
            loading="lazy"
          >
          <span class="status status--${car.status}">${statusLabels[car.status] || car.status}</span>
          <button
            class="fav ${isFavorite ? 'active' : ''}"
            data-id="${car.id}"
            aria-label="${isFavorite ? 'Видалити' : 'Додати'} ${car.model} ${isFavorite ? 'з' : 'до'} обраного"
            aria-pressed="${isFavorite}"
          >♡</button>
        </div>
        <div class="car-card__body">
          <span class="car-card__brand">${car.brand} · ${car.year}</span>
          <h3>${car.model}</h3>
          <div class="car-card__meta">
            <span>${car.mileage.toLocaleString('uk-UA')} км</span>
            <span>${car.power} к.с.</span>
            <span>${car.fuel}</span>
          </div>
          <div class="car-card__bottom">
            <strong class="car-card__price">${formatPrice(car)}</strong>
            <button
              class="text-link"
              data-modal="Запит щодо ${car.brand} ${car.model}"
            >Детальніше →</button>
          </div>
        </div>
      </article>
    `;
  }

  function attachCardEvents() {
    grid.querySelectorAll('.fav').forEach((button) => {
      button.addEventListener('click', () => {
        const current = getFavorites();
        const isFavorite = current.includes(button.dataset.id);
        const updated = isFavorite
          ? current.filter((id) => id !== button.dataset.id)
          : [...current, button.dataset.id];

        if (!window.tabanjiStorage.write('tabanjiFavorites', updated)) {
          searchResult.textContent = 'Браузер заблокував локальне збереження обраного.';
          return;
        }

        button.classList.toggle('active', !isFavorite);
        button.setAttribute('aria-pressed', String(!isFavorite));
        button.setAttribute(
          'aria-label',
          `${isFavorite ? 'Додати' : 'Видалити'} автомобіль ${isFavorite ? 'до' : 'з'} обраного`
        );
        updateFavoriteCount();
      });
    });
  }

  function renderCars(list) {
    grid.innerHTML = list.length
      ? list.map(carTemplate).join('')
      : `
        <div class="empty">
          У поточній колекції немає авто за цими параметрами.
          Ми можемо знайти потрібну конфігурацію приватно.
        </div>
      `;
    attachCardEvents();
    attachImageFallbacks();
  }

  function populateFilters() {
    [...new Set(cars.map((car) => car.brand))]
      .sort()
      .forEach((brand) => brandSelect.add(new Option(brand, brand)));

    [...new Set(cars.map((car) => car.year))]
      .sort((a, b) => b - a)
      .forEach((year) => yearSelect.add(new Option(year, year)));
  }

  function populateModels() {
    modelSelect.innerHTML = '<option value="">Усі моделі</option>';
    cars
      .filter((car) => !brandSelect.value || car.brand === brandSelect.value)
      .forEach((car) => modelSelect.add(new Option(car.model, car.model)));
  }

  function filterCars() {
    const selectedBrand = activeBrand || brandSelect.value;
    const list = cars.filter((car) => (
      (!selectedBrand || car.brand === selectedBrand)
      && (!modelSelect.value || car.model === modelSelect.value)
      && (!yearSelect.value || car.year >= Number(yearSelect.value))
      && (!priceSelect.value || car.price <= Number(priceSelect.value))
    ));

    renderCars(list);
    searchResult.textContent = `Знайдено ${list.length} ${list.length === 1 ? 'автомобіль' : 'автомобілів'} у приватній колекції`;
    window.tabanjiScrollIntoView(document.querySelector('#collection'));
  }

  function attachImageFallbacks() {
    document.querySelectorAll('img').forEach((image) => {
      image.addEventListener('error', () => {
        image.removeAttribute('src');
        image.alt += ' — зображення тимчасово недоступне';
        image.parentElement.classList.add('fallback');
      }, { once: true });
    });
  }

  brandSelect.addEventListener('change', populateModels);

  document.querySelector('#searchForm').addEventListener('submit', (event) => {
    event.preventDefault();
    activeBrand = '';
    document.querySelectorAll('.brand-btn').forEach((button) => {
      button.classList.remove('active');
    });
    filterCars();
  });

  document.querySelectorAll('.brand-btn').forEach((button) => {
    button.addEventListener('click', () => {
      activeBrand = button.dataset.brand;
      document.querySelectorAll('.brand-btn').forEach((brandButton) => {
        brandButton.classList.toggle('active', brandButton === button);
      });
      brandSelect.value = activeBrand;
      populateModels();
      filterCars();
    });
  });

  favoritesButton.addEventListener('click', () => {
    const favoriteIds = getFavorites();
    const favoriteCars = cars.filter((car) => favoriteIds.includes(car.id));
    renderCars(favoriteCars);
    searchResult.textContent = favoriteIds.length
      ? `В обраному: ${favoriteCars.length}`
      : 'Ви ще не додали жодного автомобіля до обраного';
    window.tabanjiScrollIntoView(document.querySelector('#collection'));
  });

  const statisticsObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.target.dataset.done) {
        return;
      }

      entry.target.dataset.done = 'true';
      const target = Number(entry.target.dataset.value);

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        entry.target.textContent = target + (entry.target.dataset.suffix || '');
        statisticsObserver.unobserve(entry.target);
        return;
      }

      const duration = 1200;
      const startedAt = performance.now();

      function tick(timestamp) {
        const progress = Math.min((timestamp - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        entry.target.textContent = Math.round(target * eased)
          + (entry.target.dataset.suffix || '');

        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      }

      requestAnimationFrame(tick);
      statisticsObserver.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-value]').forEach((element) => {
    statisticsObserver.observe(element);
  });

  populateFilters();
  renderCars(cars.filter((car) => car.featured));
  updateFavoriteCount();
})();
