// --- Data ---

function nactiSlovicka() {
  try {
    return JSON.parse(localStorage.getItem('slovicka')) || [];
  } catch {
    return [];
  }
}

function ulozSlovicka(slovicka) {
  localStorage.setItem('slovicka', JSON.stringify(slovicka));
}

// --- Navigace ---

const navTlacitka = document.querySelectorAll('.nav-btn');
const sekce = document.querySelectorAll('.section');

navTlacitka.forEach(btn => {
  btn.addEventListener('click', () => {
    const cil = btn.dataset.section;

    navTlacitka.forEach(b => b.classList.remove('active'));
    sekce.forEach(s => s.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(cil).classList.add('active');

    if (cil === 'procvicovat') spustProcvicovani();
    if (cil === 'prehled') renderPrehled();
  });
});

// --- Přidání slovíčka ---

const form = document.getElementById('formPridat');
const inputCesky = document.getElementById('inputCesky');
const inputAnglicky = document.getElementById('inputAnglicky');
const zpravaPridani = document.getElementById('zpravaPridani');

form.addEventListener('submit', e => {
  e.preventDefault();

  const cesky = inputCesky.value.trim();
  const anglicky = inputAnglicky.value.trim();

  if (!cesky || !anglicky) {
    zobrazZpravu('Vyplň prosím obě pole.', 'chyba');
    return;
  }

  const slovicka = nactiSlovicka();

  const existuje = slovicka.some(
    s => s.cesky.toLowerCase() === cesky.toLowerCase()
  );

  if (existuje) {
    zobrazZpravu(`Slovíčko „${cesky}" už existuje.`, 'chyba');
    return;
  }

  slovicka.push({ cesky, anglicky, id: Date.now() });
  ulozSlovicka(slovicka);

  zobrazZpravu(`Slovíčko „${cesky}" bylo přidáno!`, 'uspech');
  form.reset();
  inputCesky.focus();
});

function zobrazZpravu(text, typ) {
  zpravaPridani.textContent = text;
  zpravaPridani.className = `zprava ${typ}`;
  clearTimeout(zpravaPridani._timeout);
  zpravaPridani._timeout = setTimeout(() => {
    zpravaPridani.className = 'zprava hidden';
  }, 3000);
}

// --- Procvičování ---

let frontaProcvicovani = [];
let aktualniIndex = 0;
let skoreSpravne = 0;
let skoreChybne = 0;
let smerProcvicovani = 'cs-en'; // 'cs-en' nebo 'en-cs'

const karticka = document.getElementById('karticka');
const kartickaText = document.getElementById('kartickaText');
const kartickaPreklad = document.getElementById('kartickaPreklad');
const kartickaJazykPredni = document.getElementById('kartickaJazykPredni');
const kartickaJazykZadni = document.getElementById('kartickaJazykZadni');
const kartickaPrazdna = document.getElementById('kartickaPrazdna');
const kartickaObal = document.getElementById('kartickaObal');
const tlacitkaHodnoceni = document.getElementById('tlacitkaHodnoceni');
const konecProcvicovani = document.getElementById('konecProcvicovani');
const btnZnovaSpustit = document.getElementById('btnZnovaSpustit');

// Přepínač směru
document.querySelectorAll('.smer-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.smer-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    smerProcvicovani = btn.dataset.smer;
    spustProcvicovani();
  });
});

const VELIKOST_KOLA = 10;
const STREAK_LIMIT = 5;

function spustProcvicovani() {
  const vsechna = nactiSlovicka();
  const klic = smerProcvicovani === 'cs-en' ? 'stat_cs_en' : 'stat_en_cs';

  // Vyřadit slovíčka, která dosáhla limitu streaku pro aktuální směr
  const dostupna = vsechna.filter(s => {
    const streak = s[klic]?.streak ?? 0;
    return streak < STREAK_LIMIT;
  });

  skoreSpravne = 0;
  skoreChybne = 0;
  aktualniIndex = 0;
  frontaProcvicovani = zamichej(dostupna).slice(0, VELIKOST_KOLA);

  aktualizujSkore();
  konecProcvicovani.classList.add('hidden');
  karticka.classList.remove('hidden');

  if (vsechna.length === 0) {
    document.getElementById('kartickaPrazdnaText').textContent =
      'Zatím nemáš žádná slovíčka. Nejdřív nějaká přidej!';
    kartickaPrazdna.classList.remove('hidden');
    kartickaObal.classList.add('hidden');
    return;
  }

  if (dostupna.length === 0) {
    document.getElementById('kartickaPrazdnaText').textContent =
      'Všechna slovíčka jsi zvládl! Statistiky můžeš resetovat v přehledu.';
    kartickaPrazdna.classList.remove('hidden');
    kartickaObal.classList.add('hidden');
    return;
  }

  kartickaPrazdna.classList.add('hidden');
  kartickaObal.classList.remove('hidden');

  document.getElementById('skoreKoloCelkem').textContent = frontaProcvicovani.length;
  zobrazKarticky();
}

function zobrazKarticky() {
  const slovicko = frontaProcvicovani[aktualniIndex];
  const jeCSEN = smerProcvicovani === 'cs-en';

  // Nejdřív otočit zpět, obsah aktualizovat až po dokončení animace
  karticka.classList.remove('otocena');
  tlacitkaHodnoceni.classList.add('hidden');

  document.getElementById('skoreZbyva').textContent =
    frontaProcvicovani.length - aktualniIndex;

  setTimeout(() => {
    kartickaText.textContent = jeCSEN ? slovicko.cesky : slovicko.anglicky;
    kartickaPreklad.textContent = jeCSEN ? slovicko.anglicky : slovicko.cesky;
    kartickaJazykPredni.textContent = jeCSEN ? 'česky' : 'anglicky';
    kartickaJazykZadni.textContent = jeCSEN ? 'anglicky' : 'česky';
  }, 500);
}

karticka.addEventListener('click', () => {
  if (karticka.classList.contains('otocena')) return;
  karticka.classList.add('otocena');
  tlacitkaHodnoceni.classList.remove('hidden');
});

document.getElementById('btnSpravne').addEventListener('click', () => {
  zaznamnejVysledek(true);
  skoreSpravne++;
  aktualizujSkore();
  nactiDalsi();
});

document.getElementById('btnChybne').addEventListener('click', () => {
  zaznamnejVysledek(false);
  skoreChybne++;
  aktualizujSkore();
  nactiDalsi();
});

function zaznamnejVysledek(spravne) {
  const id = frontaProcvicovani[aktualniIndex].id;
  const klic = smerProcvicovani === 'cs-en' ? 'stat_cs_en' : 'stat_en_cs';
  const slovicka = nactiSlovicka().map(s => {
    if (s.id !== id) return s;
    const stat = s[klic] || { streak: 0 };
    return {
      ...s,
      [klic]: { streak: spravne ? stat.streak + 1 : 0 },
    };
  });
  ulozSlovicka(slovicka);
  frontaProcvicovani[aktualniIndex] = slovicka.find(s => s.id === id);
}

function nactiDalsi() {
  aktualniIndex++;
  tlacitkaHodnoceni.classList.add('hidden');

  if (aktualniIndex >= frontaProcvicovani.length) {
    zobrazKonec();
  } else {
    zobrazKarticky();
  }
}

function aktualizujSkore() {
  document.getElementById('skoreSpravne').textContent = skoreSpravne;
  document.getElementById('skoreChybne').textContent = skoreChybne;
  document.getElementById('skoreZbyva').textContent =
    Math.max(0, frontaProcvicovani.length - aktualniIndex);
  document.getElementById('skoreKolo').textContent = aktualniIndex;
}

function zobrazKonec() {
  karticka.classList.add('hidden');
  tlacitkaHodnoceni.classList.add('hidden');
  konecProcvicovani.classList.remove('hidden');

  const procenta = Math.round((skoreSpravne / frontaProcvicovani.length) * 100);
  const zprava = procenta === 100
    ? 'Perfektní! Všechno správně!'
    : procenta >= 70
      ? 'Výborně! Dobré kolo.'
      : 'Nevzdávej to, procvičuj dál!';

  document.getElementById('konecZprava').textContent = zprava;
  document.getElementById('konecSpravne').textContent = skoreSpravne;
  document.getElementById('konecCelkem').textContent = frontaProcvicovani.length;
}

btnZnovaSpustit.addEventListener('click', () => {
  karticka.classList.remove('hidden');
  spustProcvicovani();
});

function zamichej(pole) {
  for (let i = pole.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pole[i], pole[j]] = [pole[j], pole[i]];
  }
  return pole;
}

// --- Přehled ---

const prehledPrazdny = document.getElementById('prehledPrazdny');
const seznamSlovicek = document.getElementById('seznamSlovicek');

function renderPrehled() {
  const slovicka = nactiSlovicka();
  seznamSlovicek.innerHTML = '';

  if (slovicka.length === 0) {
    prehledPrazdny.classList.remove('hidden');
    seznamSlovicek.classList.add('hidden');
    return;
  }

  prehledPrazdny.classList.add('hidden');
  seznamSlovicek.classList.remove('hidden');

  slovicka.forEach(s => {
    const li = document.createElement('li');
    li.className = 'slovicko-polozka';
    li.innerHTML = `
      <div class="slovicko-info">
        <div class="slovicko-slova">
          <span class="slovicko-cesky">${escapeHtml(s.cesky)}</span>
          <span class="slovicko-sipka">→</span>
          <span class="slovicko-anglicky">${escapeHtml(s.anglicky)}</span>
        </div>
        <div class="slovicko-statistiky">
          <div class="stat-radek">
            <span class="stat-smer">🇨🇿→🇬🇧</span>
            ${renderStatBar(s.stat_cs_en)}
          </div>
          <div class="stat-radek">
            <span class="stat-smer">🇬🇧→🇨🇿</span>
            ${renderStatBar(s.stat_en_cs)}
          </div>
        </div>
      </div>
      <div class="slovicko-akce">
        <button class="btn-upravit" data-id="${s.id}" title="Upravit">✎</button>
        <button class="btn-reset-stat" data-id="${s.id}" title="Resetovat statistiky">↺</button>
        <button class="btn-smazat" data-id="${s.id}" title="Smazat">✕</button>
      </div>
    `;
    seznamSlovicek.appendChild(li);
  });
}

seznamSlovicek.addEventListener('click', e => {
  const btnSmazat = e.target.closest('.btn-smazat');
  if (btnSmazat) {
    const id = Number(btnSmazat.dataset.id);
    const slovicka = nactiSlovicka().filter(s => s.id !== id);
    ulozSlovicka(slovicka);
    renderPrehled();
    return;
  }

  const btnUpravit = e.target.closest('.btn-upravit');
  if (btnUpravit) {
    otevriModal(Number(btnUpravit.dataset.id));
    return;
  }

  const btnReset = e.target.closest('.btn-reset-stat');
  if (btnReset) {
    const id = Number(btnReset.dataset.id);
    const slovicka = nactiSlovicka().map(s =>
      s.id !== id ? s : { ...s, stat_cs_en: null, stat_en_cs: null }
    );
    ulozSlovicka(slovicka);
    renderPrehled();
  }
});

// --- Editační modál ---

const modalOverlay = document.getElementById('modalOverlay');
const formEditovat = document.getElementById('formEditovat');
const editCesky = document.getElementById('editCesky');
const editAnglicky = document.getElementById('editAnglicky');
let editovaneId = null;

function otevriModal(id) {
  const slovicka = nactiSlovicka();
  const slovicko = slovicka.find(s => s.id === id);
  if (!slovicko) return;

  editovaneId = id;
  editCesky.value = slovicko.cesky;
  editAnglicky.value = slovicko.anglicky;
  modalOverlay.classList.remove('hidden');
  editCesky.focus();
}

function zavriModal() {
  modalOverlay.classList.add('hidden');
  editovaneId = null;
}

document.getElementById('btnZrusitEdit').addEventListener('click', zavriModal);

modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) zavriModal();
});

formEditovat.addEventListener('submit', e => {
  e.preventDefault();

  const cesky = editCesky.value.trim();
  const anglicky = editAnglicky.value.trim();

  if (!cesky || !anglicky) return;

  const slovicka = nactiSlovicka();
  const duplicita = slovicka.some(
    s => s.id !== editovaneId && s.cesky.toLowerCase() === cesky.toLowerCase()
  );

  if (duplicita) {
    editCesky.style.borderColor = 'var(--danger)';
    setTimeout(() => { editCesky.style.borderColor = ''; }, 2000);
    return;
  }

  const aktualizovana = slovicka.map(s =>
    s.id === editovaneId ? { ...s, cesky, anglicky } : s
  );
  ulozSlovicka(aktualizovana);
  zavriModal();
  renderPrehled();
});

// --- Export / Import CSV ---

const zpravaPrehled = document.getElementById('zpravaPrehled');

function zobrazZpravuPrehled(text, typ) {
  zpravaPrehled.textContent = text;
  zpravaPrehled.className = `zprava ${typ}`;
  clearTimeout(zpravaPrehled._timeout);
  zpravaPrehled._timeout = setTimeout(() => {
    zpravaPrehled.className = 'zprava hidden';
  }, 4000);
}

document.getElementById('btnExport').addEventListener('click', () => {
  const slovicka = nactiSlovicka();

  if (slovicka.length === 0) {
    zobrazZpravuPrehled('Nemáš žádná slovíčka k exportu.', 'chyba');
    return;
  }

  const radky = slovicka.map(s => `${escapeCsv(s.cesky)};${escapeCsv(s.anglicky)}`);
  const obsah = radky.join('\n');
  const blob = new Blob([obsah], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'slovicka.csv';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('inputImport').addEventListener('change', e => {
  const soubor = e.target.files[0];
  if (!soubor) return;

  const reader = new FileReader();
  reader.onload = evt => {
    const text = evt.target.result;
    const radky = text.split(/\r?\n/).filter(r => r.trim() !== '');
    const slovicka = nactiSlovicka();
    let pridano = 0;
    let preskoceno = 0;

    radky.forEach(radek => {
      const casti = radek.split(';');
      if (casti.length < 2) { preskoceno++; return; }

      const cesky = unescapeCsv(casti[0].trim());
      const anglicky = unescapeCsv(casti[1].trim());

      if (!cesky || !anglicky) { preskoceno++; return; }

      const existuje = slovicka.some(
        s => s.cesky.toLowerCase() === cesky.toLowerCase()
      );

      if (existuje) { preskoceno++; return; }

      slovicka.push({ cesky, anglicky, id: Date.now() + Math.random() });
      pridano++;
    });

    ulozSlovicka(slovicka);
    renderPrehled();

    const zprava = pridano > 0
      ? `Importováno ${pridano} slovíček.${preskoceno > 0 ? ` Přeskočeno: ${preskoceno}.` : ''}`
      : `Žádná nová slovíčka nebyla přidána (${preskoceno} přeskočeno).`;
    zobrazZpravuPrehled(zprava, pridano > 0 ? 'uspech' : 'chyba');
  };
  reader.readAsText(soubor, 'UTF-8');

  // Reset inputu, aby šlo importovat stejný soubor znovu
  e.target.value = '';
});

function escapeCsv(hodnota) {
  if (hodnota.includes(';') || hodnota.includes('"') || hodnota.includes('\n')) {
    return `"${hodnota.replace(/"/g, '""')}"`;
  }
  return hodnota;
}

function unescapeCsv(hodnota) {
  if (hodnota.startsWith('"') && hodnota.endsWith('"')) {
    return hodnota.slice(1, -1).replace(/""/g, '"');
  }
  return hodnota;
}

function renderStatBar(stat) {
  if (!stat || stat.streak === undefined) {
    return '<span class="stat-neznamo">zatím neprocvičeno</span>';
  }
  const streak = stat.streak;
  const trida = streak >= 5 ? 'dobra' : streak >= 2 ? 'stredni' : streak === 0 ? 'nula' : 'slaba';
  const tecky = Array.from({ length: Math.min(streak, 10) }, () =>
    '<span class="stat-tecka"></span>'
  ).join('');
  const popis = streak === 0 ? 'poslední odpověď byla chybná' : `${streak}× správně v řadě`;
  return `
    <span class="stat-streak" data-uspesnost="${trida}" title="${popis}">
      <span class="stat-streak-cislo">${streak}</span>
      <span class="stat-tecky">${tecky}</span>
    </span>
  `;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Service Worker ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
