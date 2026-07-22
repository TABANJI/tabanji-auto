(() => {
  const root = document.querySelector('#carPlaceholder');
  const cars = Array.isArray(window.TABANJI_CARS) ? window.TABANJI_CARS : [];
  const id = new URLSearchParams(window.location.search).get('id') || '';
  const car = cars.find((item) => item.id === id);
  const favorites = window.tabanjiStorage.read('tabanjiFavorites', []);
  document.querySelector('.favorite-count').textContent = Array.isArray(favorites) ? favorites.length : 0;
  document.querySelector('#favoritesShortcut').addEventListener('click', () => {
    window.location.href = 'cars.html?favorites=1';
  });
  document.querySelector('#searchShortcut').addEventListener('click', () => {
    window.location.href = 'cars.html';
  });

  if (!car) {
    document.title = 'Автомобіль не знайдено — TABANJI AUTO';
    root.innerHTML = `
      <section class="car-placeholder__empty">
        <div class="container">
          <span class="eyebrow">TABANJI Private Collection</span>
          <h1 class="display">Автомобіль не знайдено</h1>
          <p>Посилання не містить коректного ID або цей автомобіль більше не представлений.</p>
          <a class="btn" href="cars.html">Повернутися до каталогу</a>
        </div>
      </section>`;
    return;
  }

  document.title = `${car.brand} ${car.model} — TABANJI AUTO`;
  root.innerHTML = `
    <section class="car-placeholder__hero">
      <img src="${car.image}" alt="${car.brand} ${car.model}, ${car.year}">
      <div class="container car-placeholder__content">
        <a class="breadcrumb" href="cars.html">← Повернутися до каталогу</a>
        <span class="eyebrow">${car.year} · ${car.location}</span>
        <h1 class="display">${car.brand} ${car.model}</h1>
        <strong>${new Intl.NumberFormat('uk-UA').format(car.price)} €</strong>
        <p>Повна сторінка цього автомобіля буде реалізована на наступному етапі.</p>
        <div class="car-placeholder__actions">
          <a class="btn" href="cars.html">До каталогу</a>
          <button class="btn btn--ghost" data-modal="Запит щодо ${car.brand} ${car.model}">Приватна консультація</button>
        </div>
      </div>
    </section>`;
  window.tabanjiAccentHeadings(root);
})();
