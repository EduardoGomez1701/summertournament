/* ================= ====================
   TORNEO VERANEAL DE BALONCESTO · Santander de Quilichao
   app.js — Google Sheets como base de datos
   ===================================================== */

const ADMIN_PASS = 'Street'; // Cambia esta contraseña antes de publicar
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwbdgxSDG-8N3gW3movWBHZKoQU3JREoSf_7-2q31yAuNggOTIwB-v7PO4C5L2nNZE2oQ/exec';

/* ==================== UTILIDADES DE ARCHIVOS ==================== */
function readFileAsBase64(file) {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve({ data: base64, type: file.type, name: file.name });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

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

  /* Talla de camiseta "Otra" */
  const camisetaSelect    = document.getElementById('camiseta');
  const camisetaOtraInput = document.getElementById('camiseta_otra');
  const camisetaOtraWrap  = document.getElementById('camiseta-otra-wrap');

  function toggleCamisetaOtra() {
    const mostrar = camisetaSelect?.value === 'Otra';
    if (camisetaOtraWrap) camisetaOtraWrap.style.display = mostrar ? 'block' : 'none';
    if (camisetaOtraInput) {
      camisetaOtraInput.required = mostrar;
      if (!mostrar) camisetaOtraInput.value = '';
    }
  }
  camisetaSelect?.addEventListener('change', toggleCamisetaOtra);
  toggleCamisetaOtra();

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

  form.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('blur',  () => validateField(el));
    el.addEventListener('input', () => { if (el.classList.contains('error')) validateField(el); });
  });

  /* ── SUBMIT ── */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    /* Validar campos requeridos */
    let isValid = true;
    const required = [
      'nombre','apellido','documento','fecha_nacimiento','genero','celular',
      'altura','peso','camiseta',
      'consentimiento','certificado_pago','certificado_adres',
      'foto_perfil_derecha','foto_perfil_izquierda','foto_frente'
    ];
    required.forEach(id => {
      const el = document.getElementById(id);
      if (el && !validateField(el)) isValid = false;
    });

    /* Validar checkbox */
    const acepta   = document.getElementById('acepta');
    const acetaErr = document.getElementById('acepta-err');
    if (!acepta.checked) { acetaErr.classList.add('visible'); isValid = false; }
    else { acetaErr.classList.remove('visible'); }

    if (!isValid) {
      form.querySelector('.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    /* Mostrar estado de carga */
    const btnSubmit = form.querySelector('.btn-submit');
    const btnText   = btnSubmit.querySelector('span');
    btnSubmit.disabled = true;
    btnText.textContent = 'Enviando...';

    try {
      /* Leer archivos en base64 en paralelo */
      const [
        consentimientoFile,
        certificadoPagoFile,
        certificadoAdresFile,
        fotoDerFile,
        fotoIzqFile,
        fotoFrenteFile
      ] = await Promise.all([
        readFileAsBase64(document.getElementById('consentimiento')?.files[0]),
        readFileAsBase64(document.getElementById('certificado_pago')?.files[0]),
        readFileAsBase64(document.getElementById('certificado_adres')?.files[0]),
        readFileAsBase64(document.getElementById('foto_perfil_derecha')?.files[0]),
        readFileAsBase64(document.getElementById('foto_perfil_izquierda')?.files[0]),
        readFileAsBase64(document.getElementById('foto_frente')?.files[0])
      ]);

      const tallaCamiseta = camisetaSelect?.value === 'Otra'
        ? (camisetaOtraInput?.value.trim() || '')
        : (camisetaSelect?.value || '');

      const now = new Date();
      const payload = {
        action:        'insert',
        id:            Date.now(),
        nombre:        document.getElementById('nombre').value.trim(),
        apellido:      document.getElementById('apellido').value.trim(),
        documento:     document.getElementById('documento').value.trim(),
        fecha_nac:     document.getElementById('fecha_nacimiento').value,
        edad:          document.getElementById('edad').value,
        genero:        document.getElementById('genero').value,
        celular:       document.getElementById('celular').value.trim(),
        email:         document.getElementById('email').value.trim(),
        procedencia:   document.getElementById('procedencia').value.trim(),
        altura:        document.getElementById('altura')?.value.trim() || '',
        peso:          document.getElementById('peso')?.value.trim() || '',
        posicion:      document.getElementById('posicion').value || 'Cualquiera',
        camiseta:      tallaCamiseta,
        condiciones:   document.getElementById('condiciones').value.trim() || 'Ninguna',
        consentimiento:     consentimientoFile,
        certificado_pago:   certificadoPagoFile,
        certificado_adres:  certificadoAdresFile,
        foto_perfil_derecha:   fotoDerFile,
        foto_perfil_izquierda: fotoIzqFile,
        foto_frente:           fotoFrenteFile,
        fecha_inscripcion: now.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
      };

      console.log('📤 Enviando datos a:', SCRIPT_URL);

      // Eliminado mode: 'no-cors' para capturar errores reales del Sheet
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body:  JSON.stringify(payload)
      });
      
      const resText = await res.text();
      console.log('✅ Servidor respondió:', resText);

      /* Éxito */
      document.getElementById('modal-name').textContent = `${payload.nombre} ${payload.apellido}`;
      document.getElementById('success-modal').classList.remove('hidden');

      /* Resetear formulario */
      form.reset();
      document.getElementById('edad').value = '';
      document.getElementById('posicion').value = '';
      toggleCamisetaOtra();
      document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.err-msg').forEach(e => e.classList.remove('visible'));
      document.querySelectorAll('.error').forEach(e => e.classList.remove('error'));

    } catch (err) {
      console.error('Error al enviar:', err);
      alert('❌ Error al enviar la inscripción.\n\nVerifica tu conexión e intenta de nuevo.\n\nDetalle: ' + err.message);
    } finally {
      btnSubmit.disabled = false;
      btnText.textContent = 'Enviar inscripción';
    }
  });
}

function closeModal() {
  document.getElementById('success-modal').classList.add('hidden');
}

/* ==================== ADMIN ==================== */
function adminLogin() {
  const pass  = document.getElementById('admin-pass').value;
  const errEl = document.getElementById('pass-err');

  if (pass === ADMIN_PASS) {
    sessionStorage.setItem('admin_auth', '1');
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('admin-panel').classList.add('active');
    errEl.classList.remove('visible');
    loadAdminData();
  } else {
    errEl.classList.add('visible');
    document.getElementById('admin-pass').classList.add('error');
  }
}

function adminLogout() {
  sessionStorage.removeItem('admin_auth');
  document.getElementById('admin-panel').classList.remove('active');
  document.getElementById('login-page').classList.add('active');
  const passEl = document.getElementById('admin-pass');
  if (passEl) passEl.value = '';
}

/* Enter en campo contraseña */
const passField = document.getElementById('admin-pass');
if (passField) {
  passField.addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });
}

// Validación segura de sesión para no romper index.html
if (sessionStorage.getItem('admin_auth') === '1') {
  const lp = document.getElementById('login-page');
  const ap = document.getElementById('admin-panel');
  if (lp && ap) {
    lp.classList.remove('active');
    ap.classList.add('active');
    loadAdminData();
  }
}

/* ── Cargar datos desde Google Sheets via JSONP ── */
let cachedPlayers = [];

function loadAdminData() {
  showTableLoading(true);
  const cbName = 'gsCallback_' + Date.now();

  const timer = setTimeout(function() {
    cleanup();
    showTableLoading(false);
    alert('❌ Tiempo de espera agotado. Verifica tu conexión e intenta de nuevo.');
  }, 20000);

  function cleanup() {
    clearTimeout(timer);
    delete window[cbName];
    const el = document.getElementById('jsonp-script');
    if (el) el.remove();
  }

  window[cbName] = function(json) {
    cleanup();
    showTableLoading(false);
    if (!json.ok) {
      alert('❌ Error al obtener datos: ' + (json.error || 'Error desconocido'));
      return;
    }
    cachedPlayers = json.data || [];
    renderStats();
    renderTable();
  };

  const script = document.createElement('script');
  script.id  = 'jsonp-script';
  script.src = SCRIPT_URL + '?callback=' + cbName;
  script.onerror = function() {
    cleanup();
    showTableLoading(false);
    alert('❌ No se pudo conectar con el servidor. Verifica tu conexión.');
  };
  document.body.appendChild(script);
}

function showTableLoading(show) {
  const tbody = document.getElementById('table-body');
  const noData = document.getElementById('no-data');
  if (!tbody) return;
  if (show) {
    tbody.innerHTML = `<tr><td colspan="19" style="text-align:center; padding:2rem; color:#8896a7;">⏳ Cargando inscripciones...</td></tr>`;
    if (noData) noData.classList.add('hidden');
  }
}

function refreshData() {
  loadAdminData();
}

/* ===== STATS ===== */
function renderStats() {
  const players    = cachedPlayers;
  const alturaTotal = players.reduce((s, p) => s + (parseFloat(p['Altura']) || 0), 0);
  const pesoTotal   = players.reduce((s, p) => s + (parseFloat(p['Peso'])   || 0), 0);
  const avgAltura   = players.length ? (alturaTotal / players.length).toFixed(1) : '—';
  const avgPeso     = players.length ? (pesoTotal   / players.length).toFixed(1) : '—';
  const ultima      = players.length ? (players[players.length - 1]['Fecha Inscripción'] || '—') : '—';

  const statsRow = document.getElementById('stats-row');
  if (!statsRow) return;

  statsRow.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total inscritos</div>
      <div class="stat-value">${players.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Altura promedio</div>
      <div class="stat-value" style="font-size:1.4rem">${avgAltura} cm</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Peso promedio</div>
      <div class="stat-value" style="font-size:1.4rem">${avgPeso} kg</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Última inscripción</div>
      <div class="stat-value" style="font-size:0.85rem; margin-top:4px;">${ultima}</div>
    </div>
  `;
}

/* ===== TABLE ===== */
function makeFileLink(url, label) {
  if (!url) return '—';
  return `<a class="link-btn" href="${url}" target="_blank" rel="noreferrer noopener">${label}</a>`;
}

function makeImageThumb(url, label) {
  if (!url) return '';
  return `<a class="thumb-link" href="${url}" target="_blank" rel="noreferrer noopener" title="${label}">
    <img class="thumb-img" src="${url}" alt="${label}" onerror="this.parentElement.innerHTML='<span style=\'font-size:0.75rem;color:#8896a7\'>${label}</span>'" />
  </a>`;
}

function renderTable() {
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();

  const filtered = cachedPlayers.filter(p => {
    const nombre   = String(p['Nombre']    || '').toLowerCase();
    const apellido = String(p['Apellido']  || '').toLowerCase();
    const doc      = String(p['Documento'] || '').toLowerCase();
    return !search || `${nombre} ${apellido} ${doc}`.includes(search);
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
    const fotos = [
      makeImageThumb(p['Link Foto Derecha'],    'Derecha'),
      makeImageThumb(p['Link Foto Izquierda'],  'Izquierda'),
      makeImageThumb(p['Link Foto Frente'],     'Frente')
    ].filter(Boolean).join('') || '—';

    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${p['Nombre'] || ''} ${p['Apellido'] || ''}</strong></td>
        <td>${p['Documento'] || '—'}</td>
        <td>${p['Edad'] || '—'}</td>
        <td>${p['Género'] || '—'}</td>
        <td>${p['Celular'] || '—'}</td>
        <td>${p['Correo'] || '—'}</td>
        <td>${p['Altura'] || '—'}</td>
        <td>${p['Peso'] || '—'}</td>
        <td>${p['Posición'] || '—'}</td>
        <td>${p['Camiseta'] || '—'}</td>
        <td>${p['Procedencia'] || '—'}</td>
        <td>${p['Condiciones Médicas'] || 'Ninguna'}</td>
        <td>${makeFileLink(p['Link Consentimiento'], 'Ver PDF')}</td>
        <td>${makeFileLink(p['Link Pago'], 'Ver PDF')}</td>
        <td>${makeFileLink(p['Link ADRES'], 'Ver PDF')}</td>
        <td class="thumb-cell">${fotos}</td>
        <td>${p['Fecha Inscripción'] || '—'}</td>
        <td><button class="btn-del" onclick="confirmDelete('${p['ID']}', '${p['Nombre']} ${p['Apellido']}')">Eliminar</button></td>
      </tr>
    `;
  }).join('');
}

/* ===== DELETE ===== */
let pendingDeleteId   = null;
let pendingDeleteName = '';

function confirmDelete(id, name) {
  pendingDeleteId   = id;
  pendingDeleteName = name;
  document.getElementById('delete-modal').classList.remove('hidden');
  document.getElementById('confirm-delete-btn').onclick = doDelete;
}

async function doDelete() {
  if (!pendingDeleteId) return;
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      body:   JSON.stringify({ action: 'delete', id: pendingDeleteId })
    });
    closeDeleteModal();
    setTimeout(() => loadAdminData(), 1500);
  } catch (err) {
    alert('❌ Error al eliminar: ' + err.message);
    closeDeleteModal();
  }
}

function closeDeleteModal() {
  document.getElementById('delete-modal').classList.add('hidden');
  pendingDeleteId   = null;
  pendingDeleteName = '';
}

/* ===== EXCEL DOWNLOAD ===== */
async function downloadExcel() {
  if (cachedPlayers.length === 0) {
    alert('No hay inscripciones para descargar.');
    return;
  }
  if (typeof XLSX === 'undefined') {
    alert('Error: librería de Excel no disponible.');
    return;
  }

  const headers = [
    'N°','Nombre','Apellido','Documento','Edad','Género','Celular','Correo',
    'Altura','Peso','Posición','Camiseta','Procedencia','Condiciones Médicas',
    'Link Consentimiento','Link Pago','Link ADRES',
    'Link Foto Derecha','Link Foto Izquierda','Link Foto Frente',
    'Fecha Inscripción'
  ];

  const rows = cachedPlayers.map((p, i) => [
    i + 1,
    p['Nombre']             || '',
    p['Apellido']           || '',
    p['Documento']          || '',
    p['Edad']               || '',
    p['Género']             || '',
    p['Celular']            || '',
    p['Correo']             || '',
    p['Altura']             || '',
    p['Peso']               || '',
    p['Posición']           || '',
    p['Camiseta']           || '',
    p['Procedencia']        || '',
    p['Condiciones Médicas']|| '',
    p['Link Consentimiento']|| '',
    p['Link Pago']          || '',
    p['Link ADRES']         || '',
    p['Link Foto Derecha']  || '',
    p['Link Foto Izquierda']|| '',
    p['Link Foto Frente']   || '',
    p['Fecha Inscripción']  || ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = headers.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscripciones');

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  XLSX.writeFile(wb, `Torneo_Baloncesto_Inscripciones_${dateStr}.xlsx`);
}

/* ===== EXPORT JSON ===== */
function downloadJSON() {
  if (cachedPlayers.length === 0) { alert('No hay inscripciones.'); return; }
  const now     = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const blob    = new Blob([JSON.stringify(cachedPlayers, null, 2)], { type: 'application/json' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = `inscripciones_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ===== REGLAMENTO TOGGLE ===== */
function toggleReglamento() {
  const viewer = document.getElementById('reglamento-viewer');
  const arrow  = document.getElementById('reglamento-arrow');
  if (!viewer) return;
  const isHidden = viewer.classList.contains('hidden');
  viewer.classList.toggle('hidden', !isHidden);
  if (arrow) arrow.classList.toggle('open', isHidden);
}