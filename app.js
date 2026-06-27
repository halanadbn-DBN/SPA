/**
 * ============================================================
 *  DICCIONARIO DE PROMPTS — Frontend Application
 * ============================================================
 *  SPA para administración de prompts con Google Sheets backend.
 *  Operaciones: Altas, Bajas, Modificaciones (ABM)
 * ============================================================
 */

// ─── CONFIGURACIÓN ──────────────────────────────────────────
// ⚠️ IMPORTANTE: Pega aquí la URL de tu Web App de Google Apps Script
// después de desplegarla. La URL se ve así:
// https://script.google.com/macros/s/XXXXXXXXXXXXXXXX/exec
const API_URL = 'https://script.google.com/macros/s/AKfycbzvrjnGzVao-ZxndpocWpC5d90wILpIjtfzt2FpJiQzyrMwBz_w9N2r7-aRf5zmupycog/exec';

// ─── ESTADO DE LA APLICACIÓN ────────────────────────────────
const state = {
  prompts: [],
  categories: [],
  filteredPrompts: [],
  currentFilter: '',
  currentSearch: '',
  editingId: null,
  viewingPrompt: null,
  deletingId: null,
  isConnected: false,
};

// ─── ELEMENTOS DEL DOM ──────────────────────────────────────
const $ = (id) => document.getElementById(id);

const DOM = {
  // Stats
  statTotal: $('statTotal'),
  statCategories: $('statCategories'),
  statFiltered: $('statFiltered'),

  // Toolbar
  searchInput: $('searchInput'),
  categoryFilter: $('categoryFilter'),
  btnRefresh: $('btnRefresh'),
  btnCreate: $('btnCreate'),
  btnEmptyCreate: $('btnEmptyCreate'),

  // Table
  tableBody: $('tableBody'),
  emptyState: $('emptyState'),
  tableContainer: $('tableContainer'),

  // Form Modal
  formModal: $('formModal'),
  modalTitle: $('modalTitle'),
  modalClose: $('modalClose'),
  promptForm: $('promptForm'),
  formId: $('formId'),
  formCategoria: $('formCategoria'),
  formNombre: $('formNombre'),
  formPrompt: $('formPrompt'),
  formEjemplos: $('formEjemplos'),
  categoriasList: $('categoriasList'),
  btnCancel: $('btnCancel'),
  btnSave: $('btnSave'),

  // View Modal
  viewModal: $('viewModal'),
  viewModalTitle: $('viewModalTitle'),
  viewModalClose: $('viewModalClose'),
  viewContent: $('viewContent'),
  btnViewClose: $('btnViewClose'),
  btnViewEdit: $('btnViewEdit'),

  // Confirm Modal
  confirmModal: $('confirmModal'),
  confirmName: $('confirmName'),
  btnConfirmCancel: $('btnConfirmCancel'),
  btnConfirmDelete: $('btnConfirmDelete'),

  // Misc
  loader: $('loader'),
  loaderText: $('loaderText'),
  toastContainer: $('toastContainer'),
  themeToggle: $('themeToggle'),
  themeIcon: $('themeIcon'),
  connectionDot: $('connectionDot'),
};

// ─── INICIALIZACIÓN ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

function init() {
  initTheme();
  bindEvents();
  checkApiUrl();
  fetchPrompts();
}

// ─── TEMA CLARO / OSCURO ────────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem('prompt-dict-theme');

  if (saved) {
    setTheme(saved);
  } else {
    // Detectar preferencia del sistema
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  DOM.themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('prompt-dict-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
}

// ─── VERIFICACIÓN DE API ────────────────────────────────────

function checkApiUrl() {
  if (!API_URL) {
    DOM.connectionDot.classList.add('disconnected');
    DOM.connectionDot.title = 'Sin conexión — Configura API_URL en app.js';
    state.isConnected = false;

    showToast(
      '⚠️ API no configurada. Agrega la URL de tu Web App en app.js (const API_URL). Se usarán datos de demostración.',
      'info',
      8000
    );

    // Cargar datos de demostración
    loadDemoData();
  } else {
    state.isConnected = true;
    DOM.connectionDot.classList.remove('disconnected');
    DOM.connectionDot.title = 'Conectado';
  }
}

// ─── DATOS DE DEMOSTRACIÓN ──────────────────────────────────

function loadDemoData() {
  const today = new Date().toISOString();
  state.prompts = [
    {
      id: 2,
      categoria: 'Marketing',
      nombre: 'Generador de Copy',
      prompt: 'Actúa como un copywriter experto. Escribe un texto persuasivo para [producto] dirigido a [audiencia]. El tono debe ser [tono]. Incluye un llamado a la acción claro.',
      ejemplos: 'Producto: Curso de IA\nAudiencia: Profesionales de marketing\nTono: Profesional pero cercano\n\nResultado: "Transforma tu carrera con IA. Únete a más de 500 profesionales que ya dominan las herramientas del futuro."',
      fecha: today
    },
    {
      id: 3,
      categoria: 'Desarrollo',
      nombre: 'Revisor de Código',
      prompt: 'Eres un senior developer experto en [lenguaje]. Revisa el siguiente código y proporciona:\n1. Errores encontrados\n2. Mejoras de rendimiento\n3. Buenas prácticas que faltan\n4. Código corregido con comentarios\n\nCódigo:\n[código]',
      ejemplos: 'Lenguaje: Python\nCódigo: for i in range(len(lista)): print(lista[i])\n\nSugerencia: Usar enumerate() o iteración directa para mayor legibilidad y rendimiento.',
      fecha: today
    },
    {
      id: 4,
      categoria: 'Educación',
      nombre: 'Explicador de Conceptos',
      prompt: 'Explica el concepto de [tema] como si le estuvieras enseñando a un [nivel]. Usa analogías cotidianas, ejemplos prácticos y un lenguaje accesible. Estructura tu respuesta en: Definición simple, Analogía, Ejemplo práctico, Por qué importa.',
      ejemplos: 'Tema: Machine Learning\nNivel: Estudiante de secundaria\n\nAnología: "Imagina que le enseñas a tu perro trucos nuevos mostrándole muchos ejemplos..."',
      fecha: today
    },
    {
      id: 5,
      categoria: 'Ventas',
      nombre: 'Generador de Emails',
      prompt: 'Redacta un email de [tipo_email] para [contexto]. El email debe:\n- Tener un asunto atractivo (máx. 50 caracteres)\n- Ser conciso (máx. 150 palabras)\n- Incluir personalización con [nombre_cliente]\n- Terminar con un CTA claro',
      ejemplos: 'Tipo: Seguimiento post-demo\nContexto: Software de gestión\nNombre: Carlos\n\nAsunto: "Carlos, tu equipo merece esto"\nCuerpo: Breve seguimiento con propuesta de valor...',
      fecha: today
    },
    {
      id: 6,
      categoria: 'Análisis de Datos',
      nombre: 'Intérprete de Métricas',
      prompt: 'Analiza los siguientes datos/métricas y proporciona:\n1. Resumen ejecutivo (3 líneas)\n2. Tendencias identificadas\n3. Anomalías o alertas\n4. Recomendaciones accionables\n5. Próximos pasos sugeridos\n\nDatos: [datos]',
      ejemplos: 'Datos: Tasa de conversión Q1: 2.3%, Q2: 1.8%, Q3: 3.1%, Q4: 2.9%\n\nAnálisis: Caída en Q2 posiblemente estacional, recuperación fuerte en Q3...',
      fecha: today
    },
    {
      id: 7,
      categoria: 'Marketing',
      nombre: 'Estrategia de Redes Sociales',
      prompt: 'Diseña una estrategia de contenido para [red_social] durante [período]. La marca es [descripción_marca]. Incluye:\n- Pilares de contenido (3-5)\n- Frecuencia de publicación\n- Tipos de formatos\n- Horarios óptimos\n- KPIs a medir',
      ejemplos: 'Red: Instagram\nPeríodo: 1 mes\nMarca: Startup de tecnología educativa\n\nPilares: Educación, Casos de éxito, Behind the scenes, Tips rápidos',
      fecha: today
    },
  ];

  state.categories = [...new Set(state.prompts.map(p => p.categoria))].sort();
  updateCategoryFilter();
  applyFilters();
  updateStats();
  hideLoader();
}

// ─── EVENTOS ────────────────────────────────────────────────

function bindEvents() {
  // Theme
  DOM.themeToggle.addEventListener('click', toggleTheme);
  DOM.themeToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTheme();
    }
  });

  // Toolbar
  DOM.searchInput.addEventListener('input', debounce(handleSearch, 250));
  DOM.categoryFilter.addEventListener('change', handleCategoryFilter);
  DOM.btnRefresh.addEventListener('click', fetchPrompts);
  DOM.btnCreate.addEventListener('click', openCreateModal);
  if (DOM.btnEmptyCreate) {
    DOM.btnEmptyCreate.addEventListener('click', openCreateModal);
  }

  // Form Modal
  DOM.modalClose.addEventListener('click', closeFormModal);
  DOM.btnCancel.addEventListener('click', closeFormModal);
  DOM.btnSave.addEventListener('click', handleSave);

  // View Modal
  DOM.viewModalClose.addEventListener('click', closeViewModal);
  DOM.btnViewClose.addEventListener('click', closeViewModal);
  DOM.btnViewEdit.addEventListener('click', () => {
    closeViewModal();
    if (state.viewingPrompt) {
      openEditModal(state.viewingPrompt);
    }
  });

  // Confirm Modal
  DOM.btnConfirmCancel.addEventListener('click', closeConfirmModal);
  DOM.btnConfirmDelete.addEventListener('click', handleDelete);

  // Close modals on overlay click
  DOM.formModal.addEventListener('click', (e) => {
    if (e.target === DOM.formModal) closeFormModal();
  });
  DOM.viewModal.addEventListener('click', (e) => {
    if (e.target === DOM.viewModal) closeViewModal();
  });
  DOM.confirmModal.addEventListener('click', (e) => {
    if (e.target === DOM.confirmModal) closeConfirmModal();
  });

  // Close modals on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (DOM.confirmModal.classList.contains('active')) {
        closeConfirmModal();
      } else if (DOM.formModal.classList.contains('active')) {
        closeFormModal();
      } else if (DOM.viewModal.classList.contains('active')) {
        closeViewModal();
      }
    }
  });
}

// ─── API CALLS ──────────────────────────────────────────────

async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url.toString());

  // Google Apps Script redirects — follow with redirect: 'follow'
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function apiPost(action, data) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, data }),
    redirect: 'follow',
  });

  // Handle Google Apps Script redirect for POST
  if (response.redirected) {
    const redirectResponse = await fetch(response.url);
    return redirectResponse.json();
  }

  return response.json();
}

// ─── FETCH DATA ─────────────────────────────────────────────

async function fetchPrompts() {
  if (!API_URL) {
    // Si no hay API, recargar demo
    loadDemoData();
    return;
  }

  showLoader('Cargando prompts...');

  try {
    const result = await apiGet('getAll');

    if (result.success) {
      state.prompts = result.data;
      state.categories = [...new Set(state.prompts.map(p => p.categoria))].sort();
      updateCategoryFilter();
      applyFilters();
      updateStats();
      setConnected(true);
      showToast('✅ Prompts cargados correctamente', 'success');
    } else {
      throw new Error(result.error || 'Error desconocido');
    }
  } catch (err) {
    console.error('Error fetching prompts:', err);
    setConnected(false);
    showToast('❌ Error al cargar: ' + err.message, 'error');
  } finally {
    hideLoader();
  }
}

// ─── FILTERS ────────────────────────────────────────────────

function handleSearch() {
  state.currentSearch = DOM.searchInput.value.trim().toLowerCase();
  applyFilters();
}

function handleCategoryFilter() {
  state.currentFilter = DOM.categoryFilter.value;
  applyFilters();
}

function applyFilters() {
  let filtered = [...state.prompts];

  // Filter by category
  if (state.currentFilter) {
    filtered = filtered.filter(p => p.categoria === state.currentFilter);
  }

  // Filter by search
  if (state.currentSearch) {
    const q = state.currentSearch;
    filtered = filtered.filter(p =>
      p.categoria.toLowerCase().includes(q) ||
      p.nombre.toLowerCase().includes(q) ||
      p.prompt.toLowerCase().includes(q) ||
      (p.ejemplos && p.ejemplos.toLowerCase().includes(q))
    );
  }

  state.filteredPrompts = filtered;
  renderTable();
  updateStats();
}

function updateCategoryFilter() {
  const current = DOM.categoryFilter.value;
  DOM.categoryFilter.innerHTML = '<option value="">Todas las categorías</option>';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    DOM.categoryFilter.appendChild(opt);
  });
  DOM.categoryFilter.value = current;

  // Update datalist in form
  DOM.categoriasList.innerHTML = '';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    DOM.categoriasList.appendChild(opt);
  });
}

// ─── RENDER TABLE ───────────────────────────────────────────

function renderTable() {
  const prompts = state.filteredPrompts;

  if (prompts.length === 0) {
    DOM.tableBody.innerHTML = '';
    DOM.emptyState.style.display = 'flex';
    document.querySelector('.table-wrapper').style.display = 'none';
    return;
  }

  DOM.emptyState.style.display = 'none';
  document.querySelector('.table-wrapper').style.display = 'block';

  DOM.tableBody.innerHTML = prompts.map((p, idx) => `
    <tr class="slide-up" style="animation-delay: ${idx * 0.03}s">
      <td>
        <span class="category-badge">${escapeHtml(p.categoria)}</span>
      </td>
      <td>
        <span class="prompt-name">${escapeHtml(p.nombre)}</span>
      </td>
      <td>
        <div class="prompt-preview">${escapeHtml(p.prompt)}</div>
      </td>
      <td>
        <div class="prompt-preview">${escapeHtml(p.ejemplos || '—')}</div>
      </td>
      <td>
        <span style="font-size: 12px; color: var(--text-tertiary);">${formatDate(p.fecha)}</span>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn btn-ghost btn-icon" onclick="openViewModal(${p.id})" title="Ver detalle">👁️</button>
          <button class="btn btn-ghost btn-icon" onclick="handleEdit(${p.id})" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-icon" onclick="openDeleteConfirm(${p.id})" title="Eliminar" style="color: var(--danger);">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function updateStats() {
  DOM.statTotal.textContent = state.prompts.length;
  DOM.statCategories.textContent = state.categories.length;
  DOM.statFiltered.textContent = state.filteredPrompts.length;
}

// ─── MODALS — CREATE / EDIT ─────────────────────────────────

function openCreateModal() {
  state.editingId = null;
  DOM.modalTitle.textContent = 'Nuevo Prompt';
  DOM.btnSave.textContent = '💾 Guardar';
  DOM.promptForm.reset();
  DOM.formId.value = '';
  openModal(DOM.formModal);
  DOM.formCategoria.focus();
}

function openEditModal(prompt) {
  state.editingId = prompt.id;
  DOM.modalTitle.textContent = 'Editar Prompt';
  DOM.btnSave.textContent = '💾 Actualizar';
  DOM.formId.value = prompt.id;
  DOM.formCategoria.value = prompt.categoria;
  DOM.formNombre.value = prompt.nombre;
  DOM.formPrompt.value = prompt.prompt;
  DOM.formEjemplos.value = prompt.ejemplos || '';
  openModal(DOM.formModal);
  DOM.formNombre.focus();
}

function handleEdit(id) {
  const prompt = state.prompts.find(p => p.id === id);
  if (prompt) openEditModal(prompt);
}

function closeFormModal() {
  closeModal(DOM.formModal);
  state.editingId = null;
}

// ─── MODALS — VIEW ──────────────────────────────────────────

function openViewModal(id) {
  const prompt = state.prompts.find(p => p.id === id);
  if (!prompt) return;

  state.viewingPrompt = prompt;
  DOM.viewModalTitle.textContent = prompt.nombre;

  DOM.viewContent.innerHTML = `
    <div class="view-section">
      <div class="view-section-label">Categoría</div>
      <div class="view-section-content">
        <span class="category-badge">${escapeHtml(prompt.categoria)}</span>
      </div>
    </div>
    <div class="view-section">
      <div class="view-section-label">Prompt</div>
      <div class="view-section-content">
        <button class="copy-btn" onclick="copyToClipboard('${escapeForJs(prompt.prompt)}')" title="Copiar al portapapeles">📋</button>
        ${escapeHtml(prompt.prompt)}
      </div>
    </div>
    ${prompt.ejemplos ? `
    <div class="view-section">
      <div class="view-section-label">Ejemplos</div>
      <div class="view-section-content">
        <button class="copy-btn" onclick="copyToClipboard('${escapeForJs(prompt.ejemplos)}')" title="Copiar al portapapeles">📋</button>
        ${escapeHtml(prompt.ejemplos)}
      </div>
    </div>
    ` : ''}
  `;

  openModal(DOM.viewModal);
}

function closeViewModal() {
  closeModal(DOM.viewModal);
  state.viewingPrompt = null;
}

// ─── MODALS — DELETE CONFIRM ────────────────────────────────

function openDeleteConfirm(id) {
  const prompt = state.prompts.find(p => p.id === id);
  if (!prompt) return;

  state.deletingId = id;
  DOM.confirmName.textContent = `"${prompt.nombre}"`;
  openModal(DOM.confirmModal);
}

function closeConfirmModal() {
  closeModal(DOM.confirmModal);
  state.deletingId = null;
}

// ─── MODAL UTILITIES ────────────────────────────────────────

function openModal(overlay) {
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(overlay) {
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ─── SAVE (CREATE / UPDATE) ─────────────────────────────────

async function handleSave() {
  // Validate
  const categoria = DOM.formCategoria.value.trim();
  const nombre = DOM.formNombre.value.trim();
  const prompt = DOM.formPrompt.value.trim();
  const ejemplos = DOM.formEjemplos.value.trim();

  if (!categoria || !nombre || !prompt) {
    showToast('⚠️ Los campos Categoría, Nombre y Prompt son obligatorios', 'error');
    return;
  }

  const data = { categoria, nombre, prompt, ejemplos };

  if (!API_URL) {
    // Demo mode — local operations
    if (state.editingId) {
      const idx = state.prompts.findIndex(p => p.id === state.editingId);
      if (idx >= 0) {
        state.prompts[idx] = { ...state.prompts[idx], ...data };
        showToast('✅ Prompt actualizado (modo demo)', 'success');
      }
    } else {
      const newId = Math.max(...state.prompts.map(p => p.id), 1) + 1;
      state.prompts.push({ id: newId, ...data, fecha: new Date().toISOString() });
      showToast('✅ Prompt creado (modo demo)', 'success');
    }

    state.categories = [...new Set(state.prompts.map(p => p.categoria))].sort();
    updateCategoryFilter();
    applyFilters();
    updateStats();
    closeFormModal();
    return;
  }

  // API mode
  showLoader(state.editingId ? 'Actualizando prompt...' : 'Creando prompt...');

  try {
    const action = state.editingId ? 'update' : 'create';
    if (state.editingId) data.id = state.editingId;

    const result = await apiPost(action, data);

    if (result.success) {
      showToast(`✅ ${result.message}`, 'success');
      closeFormModal();
      await fetchPrompts();
    } else {
      throw new Error(result.error || 'Error desconocido');
    }
  } catch (err) {
    console.error('Error saving:', err);
    showToast('❌ Error al guardar: ' + err.message, 'error');
  } finally {
    hideLoader();
  }
}

// ─── DELETE ─────────────────────────────────────────────────

async function handleDelete() {
  if (!state.deletingId) return;

  if (!API_URL) {
    // Demo mode
    state.prompts = state.prompts.filter(p => p.id !== state.deletingId);
    state.categories = [...new Set(state.prompts.map(p => p.categoria))].sort();
    updateCategoryFilter();
    applyFilters();
    updateStats();
    closeConfirmModal();
    showToast('✅ Prompt eliminado (modo demo)', 'success');
    return;
  }

  showLoader('Eliminando prompt...');

  try {
    const result = await apiPost('delete', { id: state.deletingId });

    if (result.success) {
      showToast('✅ ' + result.message, 'success');
      closeConfirmModal();
      await fetchPrompts();
    } else {
      throw new Error(result.error || 'Error desconocido');
    }
  } catch (err) {
    console.error('Error deleting:', err);
    showToast('❌ Error al eliminar: ' + err.message, 'error');
  } finally {
    hideLoader();
  }
}

// ─── COPY TO CLIPBOARD ─────────────────────────────────────

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('📋 Copiado al portapapeles', 'success', 2000);
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 Copiado al portapapeles', 'success', 2000);
  }
}

// ─── CONNECTION STATUS ──────────────────────────────────────

function setConnected(connected) {
  state.isConnected = connected;
  if (connected) {
    DOM.connectionDot.classList.remove('disconnected');
    DOM.connectionDot.title = 'Conectado a Google Sheets';
  } else {
    DOM.connectionDot.classList.add('disconnected');
    DOM.connectionDot.title = 'Sin conexión';
  }
}

// ─── TOAST NOTIFICATIONS ────────────────────────────────────

function showToast(message, type = 'info', duration = 4000) {
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span>${message}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── LOADER ─────────────────────────────────────────────────

function showLoader(text = 'Cargando...') {
  DOM.loaderText.textContent = text;
  DOM.loader.classList.add('active');
}

function hideLoader() {
  DOM.loader.classList.remove('active');
}

// ─── UTILIDADES ─────────────────────────────────────────────

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeForJs(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
