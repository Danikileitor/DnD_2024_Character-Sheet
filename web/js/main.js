/* =============================================================
   main.js — Ficha D&D 5.5 2024
   Funciones: localStorage, PDF export, PDF import, JSON import
   ============================================================= */

'use strict';

const STORAGE_KEY = 'dnd5.5_2024_sheet';

/* ===================== FIELD MAPPING (PDF → HTML IDs) =====================
   El PDF de D&D 5.5 tiene campos de formulario con nombres estándar.
   Este mapa relaciona los nombres de campo del PDF con los IDs del HTML.
   Si el PDF importado tiene campos distintos, el usuario puede remapear
   manualmente desde el modal de importación.
================================================================ */
const PDF_FIELD_MAP = {
    // Información básica
    'CharacterName': 'nombre',
    'CharacterName 2': 'p4_nombre',
    'ClassLevel': 'clase',
    'Background': 'transfondo',
    'PlayerName': 'nombre',
    'Race': 'especie',
    'Alignment': 'alineamiento',
    'XP': 'xp',
    'Subclass': 'subclase',

    // Atributos principales
    'STR': 'fue_score',
    'DEX': 'des_score',
    'CON': 'con_score',
    'INT': 'int_score',
    'WIS': 'sab_score',
    'CHA': 'car_score',
    'STRmod': 'fue_mod',
    'DEXmod': 'des_mod',
    'CONmod': 'con_mod',
    'INTmod': 'int_mod',
    'WISmod': 'sab_mod',
    'CHamod': 'car_mod',

    // Combate
    'AC': 'ca',
    'Initiative': 'des_ini_b',
    'Speed': 'velocidad',
    'HPMax': 'hp_max',
    'HPCurrent': 'hp_act',
    'HPTemp': 'hp_temp',
    'HDTotal': 'dg_max',
    'HD': 'dg_gast',

    // Competencias y salvaciones
    'ProfBonus': 'bonif_comp',
    'ST Strength': 'fue_ts_b',
    'ST Dexterity': 'des_ts_b',
    'ST Constitution': 'con_ts_b',
    'ST Intelligence': 'int_ts_b',
    'ST Wisdom': 'sab_ts_b',
    'ST Charisma': 'car_ts_b',

    // Habilidades
    'Acrobatics': 'des_acr_b',
    'Animal Handling': 'sab_tan_b',
    'Arcana': 'int_arc_b',
    'Athletics': 'fue_atl_b',
    'Deception': 'car_eng_b',
    'History': 'int_his_b',
    'Insight': 'sab_per_b',
    'Intimidation': 'car_int2_b',
    'Investigation': 'int_inv_b',
    'Medicine': 'sab_med_b',
    'Nature': 'int_nat_b',
    'Perception': 'sab_perc_b',
    'Performance': 'car_interp_b',
    'Persuasion': 'car_per_b',
    'Religion': 'int_rel_b',
    'SleightofHand': 'des_jm_b',
    'Stealth': 'des_sig_b',
    'Survival': 'sab_sup_b',

    // Pasivas
    'Passive': 'p_perc',

    // Ataques (primeros 3)
    'Wpn Name': null, // handled in weapons array
    'Wpn1 AtkBonus': null,
    'Wpn1 Damage': null,
    'Wpn Name 2': null,
    'Wpn2 AtkBonus': null,
    'Wpn2 Damage': null,
    'Wpn Name 3': null,
    'Wpn3 AtkBonus': null,
    'Wpn3 Damage': null,

    // Rasgos y textos
    'Features and Traits': 'rasgos_clase',
    'PersonalityTraits': 'rasgos_pers',
    'Ideals': 'ideales',
    'Bonds': 'vinculos',
    'Flaws': 'defectos',
    'Backstory': 'hist_personaje',
    'AlliesandOrganizations': 'aliados',
    'Treasure': 'otras_riquezas',
    'Equipment': 'otro_equip',
    'CP': 'pc',
    'SP': 'pp',
    'EP': 'pe',
    'GP': 'po',
    'PP': 'ppt',

    // Físico
    'Age': 'edad',
    'Height': 'altura',
    'Weight': 'peso',
    'Eyes': 'ojos',
    'Skin': 'piel',
    'Hair': 'pelo',
    'Appearance': 'desc_fisica',

    // Conjuros
    'Spellcasting Class 2': 'apt_magica',
    'SpellSaveDC  2': 'cd_conj',
    'SpellAtkBonus 2': 'bon_atq_conj',
};

/* ===================== DATA PERSISTENCE ===================== */

function getAllData() {
    const data = {};
    document.querySelectorAll('[id]').forEach(el => {
        if (el.tagName === 'INPUT' && el.type !== 'file') {
            data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
        } else if (el.tagName === 'TEXTAREA') {
            data[el.id] = el.value;
        }
    });
    // Death diamonds
    ['ds_e1', 'ds_e2', 'ds_e3', 'ds_f1', 'ds_f2', 'ds_f3'].forEach(id => {
        const el = document.getElementById(id);
        data[id] = el ? el.classList.contains('filled') : false;
    });
    // Inspiration
    data['insp_active'] = document.getElementById('insp-box')?.classList.contains('active') || false;
    // Dynamic rows
    data['weapons'] = getWeaponRows();
    data['spells'] = getSpellRows();
    // Images (base64)
    const portraitSrc = document.getElementById('portrait-img')?.src;
    data['portrait'] = portraitSrc && portraitSrc !== window.location.href ? portraitSrc : '';
    const symbolSrc = document.getElementById('symbol-img')?.src;
    data['symbol'] = symbolSrc && symbolSrc !== window.location.href ? symbolSrc : '';
    return data;
}

function setAllData(data) {
    Object.keys(data).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'INPUT' && el.type !== 'file') {
            if (el.type === 'checkbox') el.checked = !!data[id];
            else el.value = data[id] ?? '';
        } else if (el.tagName === 'TEXTAREA') {
            el.value = data[id] ?? '';
        }
    });
    // Death diamonds
    ['ds_e1', 'ds_e2', 'ds_e3', 'ds_f1', 'ds_f2', 'ds_f3'].forEach(id => {
        document.getElementById(id)?.classList.toggle('filled', !!data[id]);
    });
    // Inspiration
    document.getElementById('insp-box')?.classList.toggle('active', !!data['insp_active']);
    // Dynamic rows
    if (Array.isArray(data.weapons)) setWeaponRows(data.weapons);
    if (Array.isArray(data.spells)) setSpellRows(data.spells);
    // Images
    if (data.portrait) showPortrait(data.portrait);
    if (data.symbol) showSymbol(data.symbol);
    updatePassives();
}

function saveAll(silent = false) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getAllData()));
    if (!silent) showNotif('✔ Guardado correctamente');
}

function clearAll() {
    if (!confirm('¿Borrar todos los datos del personaje? Esta acción no se puede deshacer.')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
}

/* ===================== JSON IMPORT / EXPORT ===================== */

function exportJSON() {
    const json = JSON.stringify(getAllData(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `${getCharName()}-ficha-dnd.json`);
    showNotif('✔ JSON exportado');
}

function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            setAllData(data);
            saveAll(true);
            showNotif('✔ Datos importados correctamente');
        } catch {
            showNotif('✗ Error: JSON inválido', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

/* ===================== PDF IMPORT ===================== */

let _pdfFieldsCache = null; // { fieldName: value }

function openImportPDFModal() {
    document.getElementById('modal-pdf').classList.add('open');
    _pdfFieldsCache = null;
    resetModalState();
}
function closeImportPDFModal() {
    document.getElementById('modal-pdf').classList.remove('open');
}

function resetModalState() {
    document.getElementById('pdf-drop-zone').style.display = 'block';
    document.getElementById('pdf-map-section').style.display = 'none';
    document.getElementById('pdf-status').textContent = '';
    document.getElementById('pdf-map-body').innerHTML = '';
}

// Drag & drop
function setupDropZone() {
    const zone = document.getElementById('pdf-drop-zone');
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handlePDFFile(file);
    });
    zone.addEventListener('click', () => document.getElementById('pdf-file-input').click());
}

function handlePDFFileInput(event) {
    const file = event.target.files[0];
    if (file) handlePDFFile(file);
    event.target.value = '';
}

async function handlePDFFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showNotif('✗ El archivo debe ser un PDF', 'error');
        return;
    }
    setStatus('⏳ Leyendo PDF...');

    try {
        // Load PDF.js dynamically if not present
        await loadPdfJs();

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // Try to extract AcroForm fields first
        const fields = await extractPDFFormFields(pdf);

        if (Object.keys(fields).length > 0) {
            _pdfFieldsCache = fields;
            setStatus(`✔ Encontrados ${Object.keys(fields).length} campos en el formulario PDF.`);
            buildMappingTable(fields);
        } else {
            // Fallback: extract raw text for display
            const text = await extractPDFText(pdf);
            setStatus('⚠ Este PDF no tiene campos de formulario editables. Se mostrará el texto extraído para referencia.');
            buildTextFallback(text);
        }
    } catch (err) {
        console.error(err);
        setStatus('✗ Error al procesar el PDF: ' + err.message, true);
    }
}

async function loadPdfJs() {
    if (window.pdfjsLib) return;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function extractPDFFormFields(pdf) {
    const fields = {};
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const annotations = await page.getAnnotations();
        annotations.forEach(ann => {
            if (ann.fieldType && ann.fieldName) {
                const name = ann.fieldName;
                let value = '';
                if (ann.fieldType === 'Btn') {
                    value = ann.checkBox ? (ann.fieldValue === ann.exportValue) : false;
                } else {
                    value = ann.fieldValue || '';
                }
                fields[name] = value;
            }
        });
    }
    return fields;
}

async function extractPDFText(pdf) {
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(' ') + '\n\n';
    }
    return fullText;
}

function buildMappingTable(pdfFields) {
    document.getElementById('pdf-drop-zone').style.display = 'none';
    document.getElementById('pdf-map-section').style.display = 'block';

    const tbody = document.getElementById('pdf-map-body');
    tbody.innerHTML = '';

    // Get all HTML field IDs for the dropdown
    const htmlIds = getHtmlFieldIds();

    Object.entries(pdfFields).forEach(([pdfName, pdfValue]) => {
        if (pdfValue === '' || pdfValue === null || pdfValue === undefined) return;

        const mappedId = PDF_FIELD_MAP[pdfName] || guessMapping(pdfName, htmlIds);
        const tr = document.createElement('tr');

        tr.innerHTML = `
      <td>${escapeHtml(pdfName)}</td>
      <td>${escapeHtml(String(pdfValue).substring(0, 60))}${String(pdfValue).length > 60 ? '…' : ''}</td>
      <td>
        <select data-pdf-field="${escapeHtml(pdfName)}">
          <option value="">(ignorar)</option>
          ${htmlIds.map(id =>
            `<option value="${id}" ${id === mappedId ? 'selected' : ''}>${id}</option>`
        ).join('')}
        </select>
      </td>
    `;
        tbody.appendChild(tr);
    });
}

function buildTextFallback(text) {
    document.getElementById('pdf-drop-zone').style.display = 'none';
    document.getElementById('pdf-map-section').style.display = 'block';
    document.getElementById('pdf-map-body').innerHTML = `
    <tr><td colspan="3">
      <div style="font-family:'Crimson Text',serif;font-size:0.82rem;max-height:200px;overflow-y:auto;white-space:pre-wrap;padding:6px;background:rgba(0,0,0,0.04);border-radius:3px;">${escapeHtml(text.substring(0, 3000))}${text.length > 3000 ? '\n\n[...]' : ''}</div>
      <p style="margin-top:8px;font-size:0.8rem;color:var(--ink-light);">Este PDF no contiene campos de formulario mapeables automáticamente. Copia manualmente los datos relevantes en la ficha.</p>
    </td></tr>
  `;
}

function applyPDFMapping() {
    if (!_pdfFieldsCache) { closeImportPDFModal(); return; }

    const selects = document.querySelectorAll('#pdf-map-body select');
    let applied = 0;

    // Weapons special handling
    const weaponSlots = [
        { name: 'Wpn Name', bonif: 'Wpn1 AtkBonus', damage: 'Wpn1 Damage', notes: '' },
        { name: 'Wpn Name 2', bonif: 'Wpn2 AtkBonus', damage: 'Wpn2 Damage', notes: '' },
        { name: 'Wpn Name 3', bonif: 'Wpn3 AtkBonus', damage: 'Wpn3 Damage', notes: '' },
    ];
    const weaponData = weaponSlots.map(slot => ({
        name: _pdfFieldsCache[slot.name] || '',
        bonif: _pdfFieldsCache[slot.bonif] || '',
        damage: _pdfFieldsCache[slot.damage] || '',
        notes: '',
    })).filter(w => w.name || w.damage);
    if (weaponData.length) {
        setWeaponRows(weaponData);
        applied += weaponData.length;
    }

    selects.forEach(sel => {
        const targetId = sel.value;
        if (!targetId) return;
        const pdfField = sel.dataset.pdfField;
        const value = _pdfFieldsCache[pdfField];
        const el = document.getElementById(targetId);
        if (!el || value === undefined) return;

        if (el.type === 'checkbox') el.checked = !!value;
        else el.value = String(value);
        applied++;
    });

    updatePassives();
    saveAll(true);
    closeImportPDFModal();
    showNotif(`✔ Importados ${applied} campos del PDF`);
}

function getHtmlFieldIds() {
    const ids = [];
    document.querySelectorAll('input:not([type=file]):not([type=button]), textarea, select').forEach(el => {
        if (el.id) ids.push(el.id);
    });
    return ids;
}

function guessMapping(pdfName, htmlIds) {
    // Simple fuzzy guess: lowercase contains match
    const lower = pdfName.toLowerCase().replace(/\s+/g, '_');
    return htmlIds.find(id => id.toLowerCase() === lower) || '';
}

function setStatus(msg, isError = false) {
    const el = document.getElementById('pdf-status');
    el.textContent = msg;
    el.style.color = isError ? 'var(--red)' : 'var(--ink-light)';
}

/* ===================== WEAPONS ===================== */

function createWeaponRow(vals = {}) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
    <td><input placeholder="Nombre..." value="${escapeHtml(vals.name || '')}"></td>
    <td><input placeholder="+0" style="width:50px;" value="${escapeHtml(vals.bonif || '')}"></td>
    <td><input placeholder="1d6 cortante" value="${escapeHtml(vals.damage || '')}"></td>
    <td><input placeholder="—" value="${escapeHtml(vals.notes || '')}"></td>
  `;
    return tr;
}

function initWeaponRows() {
    const tb = document.getElementById('weapons-tbody');
    for (let i = 0; i < 6; i++) tb.appendChild(createWeaponRow());
}

function getWeaponRows() {
    return Array.from(document.querySelectorAll('#weapons-tbody tr')).map(tr => {
        const inp = tr.querySelectorAll('input');
        return { name: inp[0]?.value || '', bonif: inp[1]?.value || '', damage: inp[2]?.value || '', notes: inp[3]?.value || '' };
    });
}

function setWeaponRows(rows) {
    const tb = document.getElementById('weapons-tbody');
    tb.innerHTML = '';
    rows.forEach(r => tb.appendChild(createWeaponRow(r)));
    while (tb.children.length < 6) tb.appendChild(createWeaponRow());
}

/* ===================== SPELLS ===================== */

function addSpellRow(vals = {}) {
    const tb = document.getElementById('spells-tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
    <td><input type="checkbox" ${vals.prep ? 'checked' : ''}></td>
    <td><input style="width:28px;" placeholder="0" value="${escapeHtml(vals.nivel || '')}"></td>
    <td><input placeholder="Nombre..." value="${escapeHtml(vals.nombre || '')}"></td>
    <td><input placeholder="Evocación" value="${escapeHtml(vals.escuela || '')}"></td>
    <td><input placeholder="1 acc." value="${escapeHtml(vals.tcast || '')}"></td>
    <td><input placeholder="9m" value="${escapeHtml(vals.alcance || '')}"></td>
    <td><input placeholder="Conc." value="${escapeHtml(vals.duracion || '')}"></td>
    <td><input type="checkbox" ${vals.v ? 'checked' : ''}></td>
    <td><input type="checkbox" ${vals.s ? 'checked' : ''}></td>
    <td><input type="checkbox" ${vals.m ? 'checked' : ''}></td>
    <td><input placeholder="—" value="${escapeHtml(vals.notas || '')}"></td>
    <td><input style="width:33px;" placeholder="—" value="${escapeHtml(vals.pagina || '')}"></td>
  `;
    tb.appendChild(tr);
}

function initSpellRows() { for (let i = 0; i < 20; i++) addSpellRow(); }

function getSpellRows() {
    return Array.from(document.querySelectorAll('#spells-tbody tr')).map(tr => {
        const inp = tr.querySelectorAll('input');
        return {
            prep: inp[0]?.checked, nivel: inp[1]?.value || '',
            nombre: inp[2]?.value || '', escuela: inp[3]?.value || '',
            tcast: inp[4]?.value || '', alcance: inp[5]?.value || '',
            duracion: inp[6]?.value || '', v: inp[7]?.checked,
            s: inp[8]?.checked, m: inp[9]?.checked,
            notas: inp[10]?.value || '', pagina: inp[11]?.value || '',
        };
    });
}

function setSpellRows(rows) {
    document.getElementById('spells-tbody').innerHTML = '';
    rows.forEach(r => addSpellRow(r));
}

/* ===================== DEATH SAVES ===================== */

function toggleDeath(id) {
    document.getElementById(id)?.classList.toggle('filled');
    saveAll(true);
}

/* ===================== INSPIRATION ===================== */

function toggleInspiration() {
    document.getElementById('insp-box')?.classList.toggle('active');
    saveAll(true);
}

/* ===================== IMAGES ===================== */

function loadPortrait(e) {
    const file = e.target.files[0];
    if (!file) return;
    readFileAsDataURL(file).then(src => { showPortrait(src); saveAll(true); });
}
function showPortrait(src) {
    const img = document.getElementById('portrait-img');
    const ph = document.getElementById('portrait-placeholder');
    if (src && src !== window.location.href) {
        img.src = src; img.style.display = 'block';
        if (ph) ph.style.display = 'none';
    }
}

function loadSymbol(e) {
    const file = e.target.files[0];
    if (!file) return;
    readFileAsDataURL(file).then(src => { showSymbol(src); saveAll(true); });
}
function showSymbol(src) {
    const img = document.getElementById('symbol-img');
    const ph = document.getElementById('symbol-placeholder');
    if (src && src !== window.location.href) {
        img.src = src; img.style.display = 'block';
        if (ph) ph.style.display = 'none';
    }
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = e => resolve(e.target.result);
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

/* ===================== PAGES ===================== */

function switchPage(idx) {
    document.querySelectorAll('.sheet-page').forEach((p, i) => {
        p.classList.toggle('active', i === idx);
        p.style.display = i === idx ? 'block' : 'none';
    });
    document.querySelectorAll('.page-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
}

/* ===================== NOTIFICATION ===================== */

function showNotif(msg, type = 'success') {
    const n = document.getElementById('notif');
    n.textContent = msg;
    n.className = 'notif show' + (type !== 'success' ? ' ' + type : '');
    clearTimeout(n._timer);
    n._timer = setTimeout(() => n.classList.remove('show'), 2800);
}

/* ===================== PDF EXPORT ===================== */

async function exportPDF() {
    showNotif('⏳ Generando PDF...', 'info');

    // Load libraries if not present
    await Promise.all([loadJsPDF(), loadHtml2Canvas()]);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const sheetIds = ['sheet-p1', 'sheet-p2', 'sheet-p3', 'sheet-p4'];

    // Temporarily show all sheets
    const allPages = document.querySelectorAll('.sheet-page');
    allPages.forEach(p => { p.style.display = 'block'; });

    for (let i = 0; i < sheetIds.length; i++) {
        const el = document.getElementById(sheetIds[i]);
        if (!el) continue;
        const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: '#f4ead5' });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        if (i > 0) pdf.addPage();
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        const iw = canvas.width / 96 * 25.4 / 1.5;
        const ih = canvas.height / 96 * 25.4 / 1.5;
        const scale = Math.min(pw / iw, ph / ih);
        pdf.addImage(imgData, 'JPEG', (pw - iw * scale) / 2, (ph - ih * scale) / 2, iw * scale, ih * scale);
    }

    // Restore visibility
    const activePg = document.querySelector('.page-tab.active');
    const activeIdx = activePg ? Array.from(document.querySelectorAll('.page-tab')).indexOf(activePg) : 0;
    allPages.forEach((p, i) => { p.style.display = i === activeIdx ? 'block' : 'none'; });

    pdf.save(`${getCharName()}-ficha-dnd5.5.pdf`);
    showNotif('✔ PDF generado correctamente');
}

function loadJsPDF() {
    if (window.jspdf) return Promise.resolve();
    return loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
}
function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve();
    return loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
}
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
    });
}

/* ===================== PASSIVES ===================== */

function getStatMod(scoreId) {
    const v = parseInt(document.getElementById(scoreId)?.value) || 10;
    return Math.floor((v - 10) / 2);
}
function getProfBonus() {
    const v = document.getElementById('bonif_comp')?.value || '+2';
    return parseInt(v.replace('+', '')) || 2;
}
function updatePassives() {
    const bonif = getProfBonus();
    const sabMod = getStatMod('sab_score');
    const intMod = getStatMod('int_score');

    const percProf = document.getElementById('sab_perc')?.checked ? bonif : 0;
    const invProf = document.getElementById('int_inv')?.checked ? bonif : 0;
    const insightProf = document.getElementById('sab_per')?.checked ? bonif : 0;

    const pp = document.getElementById('p_perc');
    const pi = document.getElementById('p_inv');
    const pint = document.getElementById('p_intu');
    if (pp) pp.textContent = 10 + sabMod + percProf;
    if (pi) pi.textContent = 10 + intMod + invProf;
    if (pint) pint.textContent = 10 + sabMod + insightProf;
}

/* ===================== UTILITIES ===================== */

function getCharName() {
    return (document.getElementById('nombre')?.value || 'personaje').replace(/[^a-z0-9_-]/gi, '_');
}
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}
function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ===================== INIT ===================== */

document.addEventListener('DOMContentLoaded', () => {
    // Init dynamic rows
    initWeaponRows();
    initSpellRows();

    // Load saved data
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try { setAllData(JSON.parse(saved)); }
        catch (e) { console.warn('Error loading save:', e); }
    }

    updatePassives();

    // Sync page-4 name from page-1
    document.getElementById('nombre')?.addEventListener('input', function () {
        const p4 = document.getElementById('p4_nombre');
        if (p4 && !p4.value) p4.value = this.value;
    });

    // Initial page display
    document.querySelectorAll('.sheet-page').forEach((p, i) => {
        p.style.display = i === 0 ? 'block' : 'none';
    });

    // Setup PDF drop zone
    setupDropZone();

    // Auto-save on any change
    document.addEventListener('change', () => saveAll(true));
    document.addEventListener('input', () => { updatePassives(); saveAll(true); });

    // Close modal on overlay click
    document.getElementById('modal-pdf')?.addEventListener('click', e => {
        if (e.target === document.getElementById('modal-pdf')) closeImportPDFModal();
    });
});
