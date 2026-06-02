/* =====================================================
   TORNEO VERANEAL DE BALONCESTO · Santander de Quilichao
   app.js — Formulario + Admin Panel
   ===================================================== */

const STORAGE_KEY = 'torneo_baloncesto_2026';
const ADMIN_PASS  = '123'; //
const DB_NAME = 'TorneoBaloncesto';
const DB_VERSION = 1;
const DB_STORE = 'inscripciones';

let dbInstance = null;
let playersCache = [];

/* ==================== IndexedDB INITIALIZATION ==================== */
async function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id' });
      }
    };
  });
}

/* ==================== STORAGE ==================== */
async function getPlayersDB() {
  try {
    if (!dbInstance) await initDB();
    return new Promise((resolve, reject) => {
      const tx = dbInstance.transaction([DB_STORE], 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result || []);
    });
  } catch (err) {
    console.error('Error getPlayersDB:', err);
    return [];
  }
}

function getPlayers() {
  return playersCache;
}

async function savePlayersDB(list) {
  try {
    if (!dbInstance) await initDB();
    playersCache = list;
    return new Promise((resolve, reject) => {
      const tx = dbInstance.transaction([DB_STORE], 'readwrite');
      const store = tx.objectStore(DB_STORE);
      store.clear();
      list.forEach(p => store.add(p));
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();
    });
  } catch (err) {
    console.error('Error savePlayersDB:', err);
  }
}

function savePlayers(list) {
  playersCache = list;
  savePlayersDB(list).catch(e => console.error('Guardado async fallido:', e));
}

/* Cargar datos al iniciar */
initDB().then(() => getPlayersDB()).then(players => {
  playersCache = players;
  console.log('✅ IndexedDB cargado con', players.length, 'registros');
  
  // Limpiar localStorage antiguo
  try { localStorage.removeItem('torneo_baloncesto_2026'); } catch(e) {}
}).catch(e => console.error('❌ Error inicializando DB:', e));

/* ==================== FORMULARIO ==================== */
const form = document.getElementById('registration-form');
if (form) {

  /* Calcular edad automáticamente */
  document.getElementById('fecha_nacimiento').addEventListener('change', function () {
    const dob = new Date(this.value);
    if (isNaN(dob)) return;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    document.getElementById('edad').value = age >= 0 ? age : '';
  });

  /* Selección de posición */
  document.querySelectorAll('.pos-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('posicion').value = this.dataset.pos;
    });
  });

  /* Validación campo individual */
  function validateField(input) {
    if (!input) return true;
    const field = input.closest('.field');
    const err   = field ? field.querySelector('.err-msg') : null;
    const valid = input.checkValidity();
    input.classList.toggle('error', !valid);
    if (err) err.classList.toggle('visible', !valid);
    return valid;
  }

  function readFileAsDataURL(file) {
    if (!file) return Promise.resolve('');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  form.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('blur', () => validateField(el));
    el.addEventListener('input', () => { if (el.classList.contains('error')) validateField(el); });
  });

  /* Submit */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    console.log('🔵 Submit iniciado');

    try {
      let isValid = true;

      /* Validar campos required */
      const required = [
        'nombre','apellido','documento','fecha_nacimiento','genero','celular',
        'equipo','categoria','consentimiento','certificado_pago',
        'foto_perfil_derecha','foto_perfil_izquierda','foto_frente'
      ];
      required.forEach(id => {
        const el = document.getElementById(id);
        if (el && !validateField(el)) isValid = false;
      });

      /* Validar checkbox */
      const acepta    = document.getElementById('acepta');
      const acetaErr  = document.getElementById('acepta-err');
      if (!acepta.checked) { acetaErr.classList.add('visible'); isValid = false; }
      else { acetaErr.classList.remove('visible'); }

      if (!isValid) {
        form.querySelector('.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      /* Construir objeto jugador */
      const now = new Date();

      const consentFile = document.getElementById('consentimiento')?.files[0];
      const payFile = document.getElementById('certificado_pago')?.files[0];
      const fotoDerecha = document.getElementById('foto_perfil_derecha')?.files[0];
      const fotoIzquierda = document.getElementById('foto_perfil_izquierda')?.files[0];
      const fotoFrente = document.getElementById('foto_frente')?.files[0];

      const [
        consentimientoData,
        certificadoPagoData,
        fotoDerechaData,
        fotoIzquierdaData,
        fotoFrenteData
      ] = await Promise.all([
        readFileAsDataURL(consentFile),
        readFileAsDataURL(payFile),
        readFileAsDataURL(fotoDerecha),
        readFileAsDataURL(fotoIzquierda),
        readFileAsDataURL(fotoFrente)
      ]);

      const player = {
        id: Date.now(),
        nombre:        document.getElementById('nombre').value.trim(),
        apellido:      document.getElementById('apellido').value.trim(),
        documento:     document.getElementById('documento').value.trim(),
        fecha_nac:     document.getElementById('fecha_nacimiento').value,
        edad:          document.getElementById('edad').value,
        genero:        document.getElementById('genero').value,
        celular:       document.getElementById('celular').value.trim(),
        email:         document.getElementById('email').value.trim(),
        procedencia:   document.getElementById('procedencia').value.trim(),
        equipo:        document.getElementById('equipo')?.value.trim() || '',
        categoria:     document.getElementById('categoria')?.value || '',
        camiseta:      document.getElementById('camiseta')?.value || '',
        posicion:      document.getElementById('posicion')?.value || '',
        condiciones:   document.getElementById('condiciones')?.value.trim() || '',
        consentimiento_pdf_name: consentFile?.name || '',
        consentimiento_pdf_data: consentimientoData || '',
        certificado_pago_name: payFile?.name || '',
        certificado_pago_data: certificadoPagoData || '',
        foto_perfil_derecha_name: fotoDerecha?.name || '',
        foto_perfil_derecha_data: fotoDerechaData || '',
        foto_perfil_izquierda_name: fotoIzquierda?.name || '',
        foto_perfil_izquierda_data: fotoIzquierdaData || '',
        foto_frente_name: fotoFrente?.name || '',
        foto_frente_data: fotoFrenteData || '',
        fecha_inscripcion: now.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
      };

      const players = getPlayers();
      players.push(player);
      savePlayers(players);

      /* Mostrar modal */
      document.getElementById('modal-name').textContent =
        `${player.nombre} ${player.apellido} · ${player.equipo}`;
      document.getElementById('success-modal').classList.remove('hidden');

      /* Resetear */
      form.reset();
      document.getElementById('edad').value = '';
      document.getElementById('posicion').value = '';
      document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.err-msg').forEach(e => e.classList.remove('visible'));
      document.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
    } catch (err) {
      console.error('Error en submit:', err);
      alert('Error al enviar inscripción: ' + err.message);
    }
  });
}

function closeModal() {
  document.getElementById('success-modal').classList.add('hidden');
}

/* ==================== ADMIN ==================== */
async function adminLogin() {
  const pass  = document.getElementById('admin-pass').value;
  const errEl = document.getElementById('pass-err');

  if (pass === ADMIN_PASS) {
    sessionStorage.setItem('admin_auth', '1');
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('admin-panel').classList.add('active');
    await renderStats();
    await renderTable();
    errEl.classList.remove('visible');
  } else {
    errEl.classList.add('visible');
    document.getElementById('admin-pass').classList.add('error');
  }
}

/* Permitir Enter en campo contraseña */
const passField = document.getElementById('admin-pass');
if (passField) {
  passField.addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });

  /* Verificar sesión activa */
  if (sessionStorage.getItem('admin_auth') === '1') {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('admin-panel').classList.add('active');
    (async () => {
      await renderStats();
      await renderTable();
    })();
  }
}

function adminLogout() {
  sessionStorage.removeItem('admin_auth');
  document.getElementById('admin-panel').classList.remove('active');
  document.getElementById('login-page').classList.add('active');
  if (document.getElementById('admin-pass')) document.getElementById('admin-pass').value = '';
}

/* ===== IMPORT / EXPORT JSON ===== */
async function downloadJSON() {
  const players = await getPlayersDB();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const fn = `inscripciones_${dateStr}.json`;
  const blob = new Blob([JSON.stringify(players, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fn;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function handleImportJSONFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('JSON inválido');
      const existing = await getPlayersDB();
      let added = 0;
      imported.forEach(p => {
        const exists = existing.some(ep => (ep.documento && ep.documento === p.documento) || (ep.id && ep.id === p.id));
        if (!exists) { existing.push(p); added++; }
      });
      if (added) {
        savePlayers(existing);
        await renderStats();
        await renderTable();
      }
      alert(`Importado: ${imported.length} registros. Añadidos: ${added}.`);
    } catch (err) {
      alert('Error al importar JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

/* Conectar botón/entrada SOLO si existen en la página (admin) */
if (document.getElementById('admin-panel')) {
  document.addEventListener('DOMContentLoaded', () => {
    const importBtn = document.getElementById('import-json-btn');
    const importInput = document.getElementById('import-json');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', async (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) await handleImportJSONFile(f);
        importInput.value = '';
      });
    }
  });
}

/* ===== STATS ===== */
async function renderStats() {
  const players  = await getPlayersDB();
  const equipos  = [...new Set(players.map(p => p.equipo).filter(Boolean))];
  const catCount = {};
  players.forEach(p => { catCount[p.categoria] = (catCount[p.categoria] || 0) + 1; });
  const topCat   = Object.entries(catCount).sort((a,b) => b[1]-a[1])[0];

  const statsRow = document.getElementById('stats-row');
  if (!statsRow) return;

  statsRow.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total inscritos</div>
      <div class="stat-value">${players.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Equipos</div>
      <div class="stat-value">${equipos.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Categoría top</div>
      <div class="stat-value" style="font-size:1rem; margin-top:4px;">${topCat ? topCat[0].split(' ')[0] : '—'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Última inscripción</div>
      <div class="stat-value" style="font-size:0.9rem; margin-top:4px;">${players.length ? players[players.length-1].fecha_inscripcion : '—'}</div>
    </div>
  `;
}

/* ===== TABLE ===== */
function makeFileLink(label, data) {
  if (!data) return '—';
  return `<a class="link-btn" href="${data}" target="_blank" rel="noreferrer noopener">${label}</a>`;
}

function makeImagePreview(label, data, name) {
  if (!data) return '';
  return `<a class="thumb-link" href="${data}" target="_blank" rel="noreferrer noopener" title="${label} - ${name || ''}"><img class="thumb-img" src="${data}" alt="${label}" /></a>`;
}

async function renderTable() {
  const players  = await getPlayersDB();
  const search   = (document.getElementById('search-input')?.value || '').toLowerCase();
  const filterCat = document.getElementById('filter-cat')?.value || '';

  let filtered = players.filter(p => {
    const matchSearch = !search ||
      `${p.nombre} ${p.apellido} ${p.equipo}`.toLowerCase().includes(search);
    const matchCat = !filterCat || p.categoria.includes(filterCat);
    return matchSearch && matchCat;
  });

  const tbody  = document.getElementById('table-body');
  const noData = document.getElementById('no-data');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    noData.classList.remove('hidden');
    return;
  }

  noData.classList.add('hidden');
  tbody.innerHTML = filtered.map((p, i) => {
    const consentimientoLink = p.consentimiento_pdf_data
      ? makeFileLink(p.consentimiento_pdf_name || 'Ver consentimiento', p.consentimiento_pdf_data)
      : '—';
    const certificadoLink = p.certificado_pago_data
      ? makeFileLink(p.certificado_pago_name || 'Ver pago', p.certificado_pago_data)
      : '—';
    const fotosLinks = [
      { label: 'Derecha', data: p.foto_perfil_derecha_data, name: p.foto_perfil_derecha_name },
      { label: 'Izquierda', data: p.foto_perfil_izquierda_data, name: p.foto_perfil_izquierda_name },
      { label: 'Frente', data: p.foto_frente_data, name: p.foto_frente_name }
    ]
      .filter(item => item.data)
      .map(item => makeImagePreview(item.label, item.data, item.name))
      .join('') || '—';

    return `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${p.nombre} ${p.apellido}</strong></td>
      <td>${p.documento || '—'}</td>
      <td>${p.edad || '—'}</td>
      <td>${p.genero || '—'}</td>
      <td>${p.celular || '—'}</td>
      <td>${p.email || '—'}</td>
      <td>${p.equipo || '—'}</td>
      <td><span class="cat-badge">${p.categoria || '—'}</span></td>
      <td>${p.posicion || '—'}</td>
      <td>${p.camiseta || '—'}</td>
      <td>${p.procedencia || '—'}</td>
      <td>${p.condiciones || 'Ninguna'}</td>
      <td>${consentimientoLink}</td>
      <td>${certificadoLink}</td>
      <td class="thumb-cell">${fotosLinks}</td>
      <td>${p.fecha_inscripcion}</td>
      <td><button class="btn-del" onclick="confirmDelete(${p.id})">Eliminar</button></td>
    </tr>
  `;
  }).join('');
}

/* ===== DELETE ===== */
let pendingDeleteId = null;

function confirmDelete(id) {
  pendingDeleteId = id;
  document.getElementById('delete-modal').classList.remove('hidden');
  document.getElementById('confirm-delete-btn').onclick = doDelete;
}

async function doDelete() {
  if (!pendingDeleteId) return;
  const players = (await getPlayersDB()).filter(p => p.id !== pendingDeleteId);
  savePlayers(players);
  pendingDeleteId = null;
  closeDeleteModal();
  await renderStats();
  await renderTable();
}

function closeDeleteModal() {
  document.getElementById('delete-modal').classList.add('hidden');
  pendingDeleteId = null;
}

/* ===== EXCEL DOWNLOAD ===== */
async function downloadExcel() {
  const players = await getPlayersDB();

  if (players.length === 0) {
    alert('No hay inscripciones para descargar.');
    return;
  }

  /* SheetJS debe estar cargado en admin.html */
  if (typeof XLSX === 'undefined') {
    alert('Error: librería de Excel no disponible. Verifica tu conexión.');
    return;
  }

  const headers = [
    'N°', 'Nombre', 'Apellido', 'Documento', 'Fecha Nacimiento',
    'Edad', 'Género', 'Celular', 'Correo', 'Procedencia',
    'Equipo', 'Categoría', 'Posición', 'N° Camiseta',
    'Condiciones Médicas', 'Consentimiento PDF', 'Certificado Pago',
    'Foto perfil derecha', 'Foto perfil izquierda', 'Foto frente',
    'Fecha Inscripción'
  ];

  const rows = players.map((p, i) => [
    i + 1, p.nombre, p.apellido, p.documento, p.fecha_nac,
    p.edad, p.genero, p.celular, p.email, p.procedencia,
    p.equipo, p.categoria, p.posicion, p.camiseta,
    p.condiciones || 'Ninguna', p.consentimiento_pdf_name || '',
    p.certificado_pago_name || '', p.foto_perfil_derecha_name || '',
    p.foto_perfil_izquierda_name || '', p.foto_frente_name || '',
    p.fecha_inscripcion
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  /* Anchos de columna */
  ws['!cols'] = [
    {wch:5},{wch:16},{wch:16},{wch:14},{wch:16},
    {wch:6},{wch:12},{wch:14},{wch:26},{wch:22},
    {wch:20},{wch:22},{wch:12},{wch:10},
    {wch:28},{wch:18}
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscripciones');

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  XLSX.writeFile(wb, `Torneo_Baloncesto_Inscripciones_${dateStr}.xlsx`);
}