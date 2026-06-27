/**
 * ============================================================
 *  DICCIONARIO DE PROMPTS — Google Apps Script Backend
 * ============================================================
 *  Este archivo se copia en un proyecto de Google Apps Script.
 *
 *  INSTRUCCIONES:
 *  1. Ir a https://script.google.com y crear un nuevo proyecto.
 *  2. Pegar este código en el archivo Code.gs.
 *  3. Ejecutar la función setupSheet() UNA VEZ para crear la hoja.
 *  4. Desplegar → Nueva implementación → Tipo: App Web
 *     - Ejecutar como: Tu cuenta
 *     - Quién tiene acceso: Cualquiera
 *  5. Copiar la URL generada y pegarla en app.js (const API_URL).
 * ============================================================
 */

// ─── CONFIGURACIÓN ──────────────────────────────────────────
const SHEET_NAME = 'Prompts';

/**
 * Obtiene la hoja activa del spreadsheet vinculado.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    setupHeaders_(sheet);
  }
  return sheet;
}

// ─── SETUP INICIAL ──────────────────────────────────────────

/**
 * Ejecutar UNA VEZ para crear la hoja con la estructura correcta.
 * Crea la hoja "Prompts" con las columnas:
 *   A: Categoría | B: Nombre prompt | C: Prompt | D: Ejemplos
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (sheet) {
    // Si ya existe, limpiar encabezados
    sheet.getRange(1, 1, 1, 4).clearContent();
  } else {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  setupHeaders_(sheet);

  // Agregar algunos datos de ejemplo
  const today = new Date();
  const sampleData = [
    ['Marketing', 'Generador de Copy', 'Actúa como un copywriter experto. Escribe un texto persuasivo para [producto] dirigido a [audiencia]. El tono debe ser [tono]. Incluye un llamado a la acción claro.', 'Producto: Curso de IA\nAudiencia: Profesionales de marketing\nTono: Profesional pero cercano\n\nResultado: "Transforma tu carrera con IA. Únete a más de 500 profesionales que ya dominan las herramientas del futuro."', today],
    ['Desarrollo', 'Revisor de Código', 'Eres un senior developer experto en [lenguaje]. Revisa el siguiente código y proporciona:\n1. Errores encontrados\n2. Mejoras de rendimiento\n3. Buenas prácticas que faltan\n4. Código corregido con comentarios\n\nCódigo:\n[código]', 'Lenguaje: Python\nCódigo: for i in range(len(lista)): print(lista[i])\n\nSugerencia: Usar enumerate() o iteración directa para mayor legibilidad y rendimiento.', today],
    ['Educación', 'Explicador de Conceptos', 'Explica el concepto de [tema] como si le estuvieras enseñando a un [nivel]. Usa analogías cotidianas, ejemplos prácticos y un lenguaje accesible. Estructura tu respuesta en: Definición simple, Analogía, Ejemplo práctico, Por qué importa.', 'Tema: Machine Learning\nNivel: Estudiante de secundaria\n\nAnología: "Imagina que le enseñas a tu perro trucos nuevos mostrándole muchos ejemplos..."', today],
    ['Ventas', 'Generador de Emails', 'Redacta un email de [tipo_email] para [contexto]. El email debe:\n- Tener un asunto atractivo (máx. 50 caracteres)\n- Ser conciso (máx. 150 palabras)\n- Incluir personalización con [nombre_cliente]\n- Terminar con un CTA claro', 'Tipo: Seguimiento post-demo\nContexto: Software de gestión\nNombre: Carlos\n\nAsunto: "Carlos, tu equipo merece esto"\nCuerpo: Breve seguimiento con propuesta de valor...', today],
    ['Análisis de Datos', 'Intérprete de Métricas', 'Analiza los siguientes datos/métricas y proporciona:\n1. Resumen ejecutivo (3 líneas)\n2. Tendencias identificadas\n3. Anomalías o alertas\n4. Recomendaciones accionables\n5. Próximos pasos sugeridos\n\nDatos: [datos]', 'Datos: Tasa de conversión Q1: 2.3%, Q2: 1.8%, Q3: 3.1%, Q4: 2.9%\n\nAnálisis: Caída en Q2 posiblemente estacional, recuperación fuerte en Q3...', today]
  ];

  sheet.getRange(2, 1, sampleData.length, 5).setValues(sampleData);

  // Ajustar anchos de columna
  sheet.setColumnWidth(1, 150);  // Categoría
  sheet.setColumnWidth(2, 200);  // Nombre prompt
  sheet.setColumnWidth(3, 400);  // Prompt
  sheet.setColumnWidth(4, 400);  // Ejemplos
  sheet.setColumnWidth(5, 120);  // Fecha

  SpreadsheetApp.flush();
  Logger.log('✅ Hoja "' + SHEET_NAME + '" configurada correctamente con datos de ejemplo.');
}

/**
 * Configura los encabezados y formato de la hoja.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @private
 */
function setupHeaders_(sheet) {
  const headers = ['Categoría', 'Nombre prompt', 'Prompt', 'Ejemplos', 'Fecha'];
  const headerRange = sheet.getRange(1, 1, 1, headers.length);

  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(11);
  headerRange.setBackground('#4a148c');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');

  // Congelar fila de encabezados
  sheet.setFrozenRows(1);
}

// ─── ENDPOINTS HTTP ─────────────────────────────────────────

/**
 * Maneja peticiones GET.
 * Parámetros de query:
 *   action = getAll | getCategories | search
 *   q      = texto de búsqueda (para action=search)
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'getAll';
    let result;

    switch (action) {
      case 'getAll':
        result = getAllPrompts_();
        break;
      case 'getCategories':
        result = getCategories_();
        break;
      case 'search':
        result = searchPrompts_(e.parameter.q || '');
        break;
      default:
        result = { success: false, error: 'Acción no reconocida: ' + action };
    }

    return sendJson_(result);
  } catch (err) {
    return sendJson_({ success: false, error: err.message });
  }
}

/**
 * Maneja peticiones POST.
 * Body JSON esperado:
 *   { action: 'create' | 'update' | 'delete', data: {...} }
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const data = body.data || {};
    let result;

    switch (action) {
      case 'create':
        result = createPrompt_(data);
        break;
      case 'update':
        result = updatePrompt_(data);
        break;
      case 'delete':
        result = deletePrompt_(data);
        break;
      default:
        result = { success: false, error: 'Acción POST no reconocida: ' + action };
    }

    return sendJson_(result);
  } catch (err) {
    return sendJson_({ success: false, error: err.message });
  }
}

// ─── OPERACIONES CRUD ───────────────────────────────────────

/**
 * Obtiene todos los prompts de la hoja.
 * @returns {Object} { success: true, data: [...] }
 * @private
 */
function getAllPrompts_() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return { success: true, data: [] };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const prompts = data.map(function(row, index) {
    return {
      id: index + 2, // Número de fila real en la hoja (1-indexed, saltando header)
      categoria: row[0],
      nombre: row[1],
      prompt: row[2],
      ejemplos: row[3],
      fecha: row[4]
    };
  });

  return { success: true, data: prompts };
}

/**
 * Obtiene las categorías únicas.
 * @returns {Object} { success: true, data: [...] }
 * @private
 */
function getCategories_() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return { success: true, data: [] };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const categories = [];
  const seen = {};

  data.forEach(function(row) {
    const cat = row[0].toString().trim();
    if (cat && !seen[cat]) {
      seen[cat] = true;
      categories.push(cat);
    }
  });

  categories.sort();
  return { success: true, data: categories };
}

/**
 * Busca prompts que contengan el texto dado.
 * @param {string} query
 * @returns {Object}
 * @private
 */
function searchPrompts_(query) {
  const allResult = getAllPrompts_();
  if (!allResult.success) return allResult;

  const q = query.toLowerCase();
  const filtered = allResult.data.filter(function(item) {
    return (
      item.categoria.toLowerCase().indexOf(q) !== -1 ||
      item.nombre.toLowerCase().indexOf(q) !== -1 ||
      item.prompt.toLowerCase().indexOf(q) !== -1 ||
      item.ejemplos.toLowerCase().indexOf(q) !== -1
    );
  });

  return { success: true, data: filtered };
}

/**
 * Crea un nuevo prompt (Alta).
 * @param {Object} data - { categoria, nombre, prompt, ejemplos }
 * @returns {Object}
 * @private
 */
function createPrompt_(data) {
  if (!data.categoria || !data.nombre || !data.prompt) {
    return { success: false, error: 'Campos obligatorios: categoría, nombre, prompt' };
  }

  const sheet = getSheet();
  sheet.appendRow([
    data.categoria.trim(),
    data.nombre.trim(),
    data.prompt.trim(),
    (data.ejemplos || '').trim(),
    new Date() // Añadimos la fecha actual automáticamente
  ]);

  SpreadsheetApp.flush();
  return { success: true, message: 'Prompt creado exitosamente' };
}

/**
 * Actualiza un prompt existente (Modificación).
 * @param {Object} data - { id, categoria, nombre, prompt, ejemplos }
 * @returns {Object}
 * @private
 */
function updatePrompt_(data) {
  if (!data.id) {
    return { success: false, error: 'Se requiere el ID del prompt para actualizar' };
  }

  const sheet = getSheet();
  const rowNum = parseInt(data.id);

  if (rowNum < 2 || rowNum > sheet.getLastRow()) {
    return { success: false, error: 'ID de prompt no válido: ' + data.id };
  }

  const range = sheet.getRange(rowNum, 1, 1, 4);
  range.setValues([[
    (data.categoria || '').trim(),
    (data.nombre || '').trim(),
    (data.prompt || '').trim(),
    (data.ejemplos || '').trim()
  ]]);

  SpreadsheetApp.flush();
  return { success: true, message: 'Prompt actualizado exitosamente' };
}

/**
 * Elimina un prompt (Baja).
 * @param {Object} data - { id }
 * @returns {Object}
 * @private
 */
function deletePrompt_(data) {
  if (!data.id) {
    return { success: false, error: 'Se requiere el ID del prompt para eliminar' };
  }

  const sheet = getSheet();
  const rowNum = parseInt(data.id);

  if (rowNum < 2 || rowNum > sheet.getLastRow()) {
    return { success: false, error: 'ID de prompt no válido: ' + data.id };
  }

  sheet.deleteRow(rowNum);
  SpreadsheetApp.flush();
  return { success: true, message: 'Prompt eliminado exitosamente' };
}

// ─── UTILIDADES ─────────────────────────────────────────────

/**
 * Envía una respuesta JSON con cabeceras apropiadas.
 * @param {Object} data
 * @returns {GoogleAppsScript.Content.TextOutput}
 * @private
 */
function sendJson_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
