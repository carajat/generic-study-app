// ========================================
// CA Final Study Companion — App Logic
// ========================================

// ─── State ──────────────────────────────
let state = {
  activeGroup: localStorage.getItem('ca_app_prefs_group') || 'group1',
  activeTab: 'dashboard',
  activeSchedule: 'earlyMorning',
  plannerDate: new Date(),
  calendarMonth: new Date(),
  syllabusView: 'list', // 'list' or 'detail'
  activeSubject: null
};

// ─── Dynamic Data State ─────────────────
let DYNAMIC_DATA = null;
let isEditMode = false;


function getDynamicDataKey() { return state.activeGroup === 'group2' ? 'ca_dynamic_data' : 'ca_dynamic_data_group1'; }
function getStorageKey() { return state.activeGroup === 'group2' ? 'ca_final_tracker' : 'ca_final_tracker_group1'; }

function switchGroup(groupId) {
  state.activeGroup = groupId;
  localStorage.setItem('ca_app_prefs_group', groupId);
  loadDynamicData();
  const groupSel = document.getElementById('group-selector');
  if (groupSel) groupSel.value = state.activeGroup;
  switchTab('dashboard'); // This will also re-render everything
}

function loadDynamicData() {
  const savedData = localStorage.getItem(getDynamicDataKey());
  let parsedData = null;
  
  if (savedData) {
    try {
      parsedData = JSON.parse(savedData);
    } catch(e) {
      console.error("Failed to parse dynamic data", e);
    }
  }
  
  // Validate that critical fields exist (to recover from past corrupted states)
  if (!parsedData || !parsedData.exam || !parsedData.schedules) {
    console.warn("Corrupted or outdated dynamic data found. Resetting to APP_DATA.");
    
    try {
      if (!APP_DATA[state.activeGroup]) throw new Error("APP_DATA missing group");
      DYNAMIC_DATA = JSON.parse(JSON.stringify(APP_DATA[state.activeGroup]));
    } catch(e) {
      console.error(e);
      // Fallback if data.js is somehow old
      DYNAMIC_DATA = JSON.parse(JSON.stringify(APP_DATA.group2 || APP_DATA));
    }
  
  } else {
    DYNAMIC_DATA = parsedData;
    // Fallback: Ensure all top-level keys from APP_DATA exist in DYNAMIC_DATA
    for (let key in APP_DATA[state.activeGroup]) {
      if (!(key in DYNAMIC_DATA)) {
        DYNAMIC_DATA[key] = JSON.parse(JSON.stringify(APP_DATA[state.activeGroup][key]));
      }
    }
  }
  
  // Migrate mocks from Object to Array of Series
  if (DYNAMIC_DATA.mocks && !Array.isArray(DYNAMIC_DATA.mocks)) {
    const newMocks = [];
    Object.keys(DYNAMIC_DATA.mocks).forEach((key, idx) => {
      newMocks.push({
        id: key,
        name: `Series ${idx + 1}`,
        tests: DYNAMIC_DATA.mocks[key]
      });
    });
    DYNAMIC_DATA.mocks = newMocks;
    saveDynamicData();
  }
  
  
  // --- SANITIZE BROKEN HTML IN LOCALSTORAGE ---
  if (DYNAMIC_DATA.syllabusSubjects) {
    let changed = false;
    DYNAMIC_DATA.syllabusSubjects.forEach(s => {
      if (s.name && (s.name.includes('<') || s.name.includes('menu_book') || s.name.includes('auto_stories') || s.name.includes('class='))) {
        // Strip everything that looks like an HTML tag
        s.name = s.name.replace(/<[^>]*>?/gm, '');
        // Clean up leaked attributes
        s.name = s.name.replace(/onclick="[^"]*"/g, '');
        s.name = s.name.replace(/onchange="[^"]*"/g, '');
        s.name = s.name.replace(/class="[^"]*"/g, '');
        s.name = s.name.replace(/menu_book /g, '');
        s.name = s.name.replace(/auto_stories /g, '');
        s.name = s.name.replace(/"/g, '');
        s.name = s.name.trim();
        
        // Final fallback if name became empty
        if (!s.name || s.name === '') {
          if (s.id === 'dt') s.name = 'Paper 4: DT & International Tax';
          else if (s.id === 'idt') s.name = 'Paper 5: IDT (GST + Customs)';
          else s.name = 'Syllabus Subject';
        }
        changed = true;
      }
    });
    if (changed) {
      saveDynamicData();
    }
  }

  // Migrate to unified syllabusSubjects if not present
  if (!DYNAMIC_DATA.syllabusSubjects) {
    DYNAMIC_DATA.syllabusSubjects = [
      { id: 'dt', name: 'Paper 4: DT & International Tax', source: 'CA Aarish Khan', type: 'main', chapters: DYNAMIC_DATA.dtChapters || APP_DATA.dtChapters },
      { id: 'idt', name: 'Paper 5: IDT (GST + Customs)', source: 'VB Sir', type: 'main', chapters: DYNAMIC_DATA.idtChapters || APP_DATA.idtChapters },
      { id: 'ibs-afm', name: 'IBS — AFM', source: '', type: 'ibs', chapters: (DYNAMIC_DATA.ibsSubjects && DYNAMIC_DATA.ibsSubjects.afm) ? DYNAMIC_DATA.ibsSubjects.afm.chapters : APP_DATA.ibsSubjects.afm.chapters },
      { id: 'ibs-fr', name: '📋 IBS — FR', source: '', type: 'ibs', chapters: (DYNAMIC_DATA.ibsSubjects && DYNAMIC_DATA.ibsSubjects.fr) ? DYNAMIC_DATA.ibsSubjects.fr.chapters : APP_DATA.ibsSubjects.fr.chapters },
      { id: 'ibs-audit', name: 'IBS — Audit', source: '', type: 'ibs', chapters: (DYNAMIC_DATA.ibsSubjects && DYNAMIC_DATA.ibsSubjects.audit) ? DYNAMIC_DATA.ibsSubjects.audit.chapters : APP_DATA.ibsSubjects.audit.chapters },
      { id: 'ibs-law', name: '⚖️ IBS — Law (SPOM A)', source: '', type: 'ibs', chapters: (DYNAMIC_DATA.ibsSubjects && DYNAMIC_DATA.ibsSubjects.law) ? DYNAMIC_DATA.ibsSubjects.law.chapters : APP_DATA.ibsSubjects.law.chapters },
      { id: 'ibs-scpm', name: 'IBS — SC&PM (SPOM B)', source: '', type: 'ibs', chapters: (DYNAMIC_DATA.ibsSubjects && DYNAMIC_DATA.ibsSubjects.scpm) ? DYNAMIC_DATA.ibsSubjects.scpm.chapters : APP_DATA.ibsSubjects.scpm.chapters }
    ];
    saveDynamicData();
  }
}

function saveDynamicData() {
  localStorage.setItem(getDynamicDataKey(), JSON.stringify(DYNAMIC_DATA));
}

function toggleEditMode() {
  isEditMode = !isEditMode;
  document.body.classList.toggle('edit-mode-active', isEditMode);
  switchTab(state.activeTab); // re-render current tab
}

// ─── Drag and Drop & Edit Helpers ───────

window.activeSortables = [];
function initSortable(containerIdOrEl, arrayRef, saveCallback) {
  const container = typeof containerIdOrEl === "string" ? document.getElementById(containerIdOrEl) : containerIdOrEl;
  
  if (!container) return;
  if (isEditMode) {
    const s = new Sortable(container, {
      handle: '.drag-handle',
      animation: 150,
      ghostClass: 'sortable-ghost',
      delay: 150, // Time in ms to define when the sorting should start
      delayOnTouchOnly: true, // Only delay if user is using touch
      touchStartThreshold: 3, // px, how many pixels the point should move before cancelling a delayed drag event
      fallbackTolerance: 3,
      onEnd: function(evt) {
        if (evt.oldIndex !== evt.newIndex) {
          const item = arrayRef.splice(evt.oldIndex, 1)[0];
          arrayRef.splice(evt.newIndex, 0, item);
          saveCallback();
        }
      }
    });
    window.activeSortables.push(s);
  }
}
function clearSortables() {
  if (window.activeSortables) {
    window.activeSortables.forEach(s => s.destroy());
    window.activeSortables = [];
  }
}

let draggedItemIndex = null;

function handleDragStart(e, index) {
  if (!isEditMode) return;
  draggedItemIndex = index;
  const el = e.target.closest('.draggable-item');
  if (el) el.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  if (!isEditMode) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e, dropIndex, context, ...args) {
  if (!isEditMode || draggedItemIndex === null || draggedItemIndex === dropIndex) return;
  e.preventDefault();
  
  // Dispatch to context handler
  if (context === 'syllabus-subject') reorderSyllabusSubject(draggedItemIndex, dropIndex);
  else if (context === 'syllabus-chapter') reorderSyllabusChapter(draggedItemIndex, dropIndex, args[0], args[1]);
  else if (context === 'exam') reorderExam(draggedItemIndex, dropIndex);
  else if (context === 'mock') reorderMock(draggedItemIndex, dropIndex, args[0]);
  else if (context === 'schedule-slot') reorderScheduleSlot(draggedItemIndex, dropIndex, args[0]);
  
  draggedItemIndex = null;
  saveDynamicData();
  switchTab(state.activeTab);
}

function handleDragEnd(e) {
  const el = e.target.closest('.draggable-item');
  if (el) el.classList.remove('dragging');
}

function reorderArray(arr, from, to) {
  const item = arr.splice(from, 1)[0];
  arr.splice(to, 0, item);
}

function promptEdit(title, defaultValue, callback) {
  const val = prompt(title, defaultValue);
  if (val !== null && val.trim() !== '') {
    callback(val.trim());
    saveDynamicData();
    switchTab(state.activeTab);
  }
}

function confirmDelete(itemName, callback) {
  if (confirm(`Are you sure you want to delete "${itemName}"?`)) {
    callback();
    saveDynamicData();
    switchTab(state.activeTab);
  }
}


// ─── Storage Helper ─────────────────────


function loadState() {
  try {
    const saved = localStorage.getItem(getStorageKey());
    if (saved) return JSON.parse(saved);
  } catch (e) { console.error('Load error:', e); }
  return {};
}

function saveState(data) {
  try {
    const existing = loadState();
    const merged = { ...existing, ...data };
    localStorage.setItem(getStorageKey(), JSON.stringify(merged));
  } catch (e) { console.error('Save error:', e); }
}

function getSyllabusProgress() {
  return loadState().syllabusProgress || {};
}

function saveSyllabusProgress(progress) {
  saveState({ syllabusProgress: progress });
}

function getMockScores() {
  return loadState().mockScores || {};
}

function saveMockScore(mockId, score, notes) {
  const scores = getMockScores();
  scores[mockId] = { score: parseInt(score), notes, date: new Date().toISOString() };
  saveState({ mockScores: scores });
}

function getPlannerTasks() {
  return loadState().plannerTasks || {};
}

function savePlannerTasks(tasks) {
  saveState({ plannerTasks: tasks });
}

// ─── Toast ──────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerHTML = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── Modal ──────────────────────────────
function openModal(title, bodyHtml) {
  document.getElementById('modal-title').innerHTML = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.add('show');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

window.activeFormCallback = null;
function openFormModal(title, fields, callback) {
  window.activeFormCallback = callback;
  let html = '<div class="form-modal-body">';
  
  fields.forEach((f, idx) => {
    html += `
      <div class="form-group">
        <label>${f.label}</label>
        <input type="${f.type || 'text'}" id="fm-input-${idx}" value="${f.value || ''}" placeholder="${f.placeholder || ''}" class="form-input">
      </div>
    `;
  });
  
  html += `
    <div style="display: flex; gap: 8px; margin-top: 15px;">
      <button class="btn-primary" onclick="submitFormModal(${fields.length})"><span class="material-symbols-rounded icon-sm" style="vertical-align:middle;">save</span> Save</button>
      <button class="btn-secondary" onclick="closeModal()"><span class="material-symbols-rounded icon-sm" style="vertical-align:middle;">close</span> Cancel</button>
    </div>
  </div>`;
  
  openModal(title, html);
}

function submitFormModal(numFields) {
  if (window.activeFormCallback) {
    const values = [];
    for (let i = 0; i < numFields; i++) {
      values.push(document.getElementById(`fm-input-${i}`).value);
    }
    window.activeFormCallback(...values);
    closeModal();
  }
}

// ─── Tab Navigation ─────────────────────
function switchTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
  document.querySelector(`.nav-item[data-tab="${tabName}"]`).classList.add('active');
  
  // Refresh content
  if (tabName === 'dashboard') {
    const gs = document.getElementById('group-selector');
    if(gs) gs.value = state.activeGroup;
    const gt = document.getElementById('group-title');
    if(gt) gt.textContent = state.activeGroup === 'group1' ? 'CA Final Group 1' : 'CA Final Group 2';
    renderDashboard();
  }
  if (tabName === 'exams') renderExams();
  if (tabName === 'schedule') renderSchedule();
  if (tabName === 'planner') renderPlanner();
  if (tabName === 'syllabus') renderSyllabus();
  
  window.scrollTo(0, 0);
}

// ─── Date Helpers ───────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function formatDateFull(date) {
  const d = new Date(date);
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function daysUntil(dateStr) {
  const target = new Date(dateStr);
  target.setHours(0,0,0,0);
  const now = new Date();
  now.setHours(0,0,0,0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function isToday(date) {
  const d = new Date(date);
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

// ═══════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════
function renderDashboard() {
  updateCountdown();
  updateDashboardStats();
  updateCurrentActivity();
  updateDashboardPlanner();
  updateQuote();
}

function updateCountdown() {
  const examDate = new Date(DYNAMIC_DATA.exam.date);
  const now = new Date();
  const diff = examDate - now;
  if (diff <= 0) {
    document.getElementById('cd-days').textContent = '0';
    document.getElementById('cd-hours').textContent = '0';
    document.getElementById('cd-mins').textContent = '0';
    document.getElementById('cd-secs').textContent = '0';
    return;
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  document.getElementById('cd-days').textContent = days;
  document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
  document.getElementById('cd-mins').textContent = String(mins).padStart(2, '0');
  document.getElementById('cd-secs').textContent = String(secs).padStart(2, '0');
}

function updateDashboardStats() {
  // Syllabus progress
  const pct = calculateOverallProgress();
  document.getElementById('dash-syllabus-pct').textContent = pct + '%';
  document.getElementById('dash-syllabus-bar').style.width = pct + '%';
  
  // Next mock
  const nextDT = getNextMockFor('DT');
  const nextIDT = getNextMockFor('IDT');
  
  const elValue = document.getElementById('dash-next-mock');
  const elLabel = document.getElementById('dash-next-mock-label');
  
  if (nextDT && nextIDT) {
    elValue.style.fontSize = '15px';
    elValue.style.lineHeight = '1.3';
    elValue.innerHTML = `DT: ${daysUntil(nextDT.date)}d<br>IDT: ${daysUntil(nextIDT.date)}d`;
    elLabel.textContent = 'Upcoming Mocks';
  } else if (nextDT || nextIDT) {
    const nextMock = nextDT || nextIDT;
    elValue.style.fontSize = '';
    elValue.style.lineHeight = '';
    elValue.textContent = daysUntil(nextMock.date) + ' days';
    elLabel.textContent = nextMock.subject;
  } else {
    elValue.style.fontSize = '';
    elValue.style.lineHeight = '';
    elValue.textContent = 'Done!';
    elLabel.textContent = 'All mocks completed';
  }
}

function updateCurrentActivity() {
  const schedule = DYNAMIC_DATA.schedules[state.activeSchedule];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTime = currentHour * 60 + currentMin;
  
  let currentSlot = null;
  let nextSlot = null;
  
  for (let i = 0; i < schedule.slots.length; i++) {
    const slot = schedule.slots[i];
    const [startStr] = slot.startRange.split('-');
    const [sh, sm] = startStr.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = startMin + slot.duration;
    
    if (currentTime >= startMin && currentTime < endMin) {
      currentSlot = slot;
      if (i + 1 < schedule.slots.length) nextSlot = schedule.slots[i + 1];
    }
  }
  
  if (currentSlot) {
    document.getElementById('ca-slot-name').innerHTML = '<span class="material-symbols-rounded" style="vertical-align:middle; margin-right:6px; font-size: 20px;">' + (currentSlot.icon || '').trim() + '</span> ' + currentSlot.label;
    document.getElementById('ca-slot-details').textContent = `Window: ${currentSlot.startRange} · Duration: ${currentSlot.duration >= 60 ? (currentSlot.duration/60) + ' hrs' : currentSlot.duration + ' min'}`;
    document.getElementById('ca-slot-name').className = 'ca-slot-name slot-' + currentSlot.type;
  } else {
    document.getElementById('ca-slot-name').innerHTML = '<span class="material-symbols-rounded icon-sm">bed</span> Rest Time';
    document.getElementById('ca-slot-details').textContent = 'No active session right now';
  }
  
  if (nextSlot) {
    document.getElementById('ca-next-slot').innerHTML = '<span class="material-symbols-rounded icon-sm" style="vertical-align:middle;">arrow_forward</span> Next: ' + '<span class="material-symbols-rounded" style="vertical-align:middle; font-size:14px; margin-right:4px;">' + (nextSlot.icon || '').trim() + '</span> ' + nextSlot.label;
  } else {
    document.getElementById('ca-next-slot').textContent = '';
  }
}

function updateDashboardPlanner() {
  const tasks = getPlannerTasks();
  const todayTasks = tasks[dateKey(new Date())] || [];
  const done = todayTasks.filter(t => t.done).length;
  const total = todayTasks.length;
  document.getElementById('dash-planner-done').textContent = done;
  document.getElementById('dash-planner-total').textContent = total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById('dash-planner-bar').style.width = pct + '%';
}

function updateQuote() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const quoteIdx = dayOfYear % DYNAMIC_DATA.quotes.length;
  document.getElementById('daily-quote').textContent = '"' + DYNAMIC_DATA.quotes[quoteIdx] + '"';
}

// ═══════════════════════════════════════════
//  EXAM SCHEDULE
// ═══════════════════════════════════════════
function renderExams() {
  const days = daysUntil(DYNAMIC_DATA.exam.date);
  document.getElementById('exam-days-left').textContent = days + ' days left';
  
  // Next mock
  const nextMock = getNextMock();
  if (nextMock) {
    const mockDays = daysUntil(nextMock.date);
    document.getElementById('nmc-subject').textContent = nextMock.subject;
    document.getElementById('nmc-date').textContent = formatDate(nextMock.date);
    document.getElementById('nmc-countdown').textContent = mockDays <= 0 ? 'TODAY!' : mockDays + ' days remaining';
    document.getElementById('next-mock-card').className = 'next-mock-card glass-card' + (mockDays <= 3 ? ' urgent' : '');
  }
  
  // Render series
  const container = document.getElementById('mock-series-container');
  container.innerHTML = '';
  const scores = getMockScores();
  
  DYNAMIC_DATA.mocks.forEach((series, seriesIdx) => {
    const seriesHtml = `
      <div class="mock-series glass-card">
        <h3 class="series-title" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          ${!isEditMode ? `<span>${series.name}</span>` : `
            <input type="text" class="inline-input" value="${series.name}" onchange="updateMockSeries(${seriesIdx}, this.value)" style="font-weight:bold; font-size:1.1em;">
            <div class="edit-mode-controls" style="display:inline-flex; opacity:1; transform:none; position:static; margin-left:10px;">
              <button class="delete-btn" onclick="deleteMockSeries(${seriesIdx})"><span class="material-symbols-rounded icon-sm">delete</span></button>
            </div>
          `}
        </h3>
        <div class="mock-list">
          ${series.tests.map((mock, mockIdx) => {
            const score = scores[mock.id];
            const isPast = daysUntil(mock.date) < 0;
            const isUpcoming = daysUntil(mock.date) >= 0 && daysUntil(mock.date) <= 3;
            return `
              <div class="mock-item ${score ? 'scored' : ''} ${isUpcoming ? 'upcoming' : ''} draggable-item"  ${!isEditMode ? `onclick="openMockScoreModal('${mock.id}', '${mock.subject}', '${series.name}', '${mock.date}')"` : ''}>
                ${isEditMode ? `
  <span class="drag-handle material-symbols-rounded">drag_handle</span>
` : ''}
                ${!isEditMode ? `
                <div class="mock-subject" style="flex:1">${mock.subject}</div>
                <div class="mock-date">${formatDate(mock.date)}</div>
                <div class="mock-score">${score ? score.score + '/100' : (isPast ? '<span class="material-symbols-rounded icon-sm" style="color:var(--error-color);">warning</span>' : '<span class="material-symbols-rounded icon-sm">check_box_outline_blank</span>')}</div>
                ` : `
                <div class="mock-subject" style="flex:1; margin-right:10px;">
                  <input type="text" class="inline-input" value="${mock.subject}" onchange="updateMock('${series.id}', ${mockIdx}, 'subject', this.value)">
                </div>
                <div class="mock-date">
                  <input type="date" class="inline-input date-input" value="${mock.date}" onchange="updateMock('${series.id}', ${mockIdx}, 'date', this.value)">
                </div>
                <div class="edit-mode-controls">
                  <button class="delete-btn" onclick="event.stopPropagation(); deleteMock('${series.id}', ${mockIdx})"><span class="material-symbols-rounded icon-sm">delete</span></button>
                </div>
                `}
              </div>
            `;
          }).join('')}
        </div>
        ${isEditMode ? `<button class="add-item-btn" onclick="addMock('${series.id}')">+ Add Mock</button>` : ''}
      </div>
    `;
    container.innerHTML += seriesHtml;
  });
  
  if (isEditMode) {
    container.innerHTML += `<button class="add-item-btn" style="margin-bottom: 20px" onclick="addMockSeries()">+ Add New Test Series</button>`;
  }

  
  // ─── Final Exam Datesheet ─────────────
  container.innerHTML += `
    <div class="mock-series glass-card final-datesheet">
      <h3 class="series-title"><span class="material-symbols-rounded icon-sm">school</span> CA Final — November 2026</h3>
      <div class="mock-list">
        ${DYNAMIC_DATA.finalExams.map((exam, examIdx) => {
          const days = daysUntil(exam.date);
          return `
            <div class="mock-item final-exam-item draggable-item" draggable="${isEditMode}" ondragstart="handleDragStart(event, ${examIdx})" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ${examIdx}, 'exam')" ondragend="handleDragEnd(event)">
              ${isEditMode ? `
  <span class="drag-handle material-symbols-rounded">drag_handle</span>
` : ''}
              ${!isEditMode ? `
              <div class="mock-subject" style="flex:1">${exam.subject}</div>
              <div class="mock-date">${formatDate(exam.date)} (${exam.day})<br><small>${exam.time}</small></div>
              <div class="mock-score final-days">${days} days</div>
              ` : `
              <div class="mock-subject" style="flex:1; display:flex; flex-direction:column; gap:4px; margin-right:10px;">
                <input type="text" class="inline-input" value="${exam.subject}" onchange="updateExam(${examIdx}, 'subject', this.value)">
                <input type="text" class="inline-input time-input" value="${exam.time}" onchange="updateExam(${examIdx}, 'time', this.value)" placeholder="Time">
              </div>
              <div class="mock-date" style="display:flex; flex-direction:column; gap:4px; margin-right:10px;">
                <input type="date" class="inline-input date-input" value="${exam.date}" onchange="updateExam(${examIdx}, 'date', this.value)">
                <input type="text" class="inline-input time-input" value="${exam.day}" onchange="updateExam(${examIdx}, 'day', this.value)" placeholder="Day">
              </div>
              <div class="edit-mode-controls">
                <button class="delete-btn" onclick="deleteExam(${examIdx})"><span class="material-symbols-rounded icon-sm">delete</span></button>
              </div>
              `}
            </div>
          `;
        }).join('')}
      </div>
      ${isEditMode ? `<button class="add-item-btn" onclick="addExam()">+ Add Exam</button>` : ''}
    </div>
  `;
  
  renderScoreChart();
}

function getNextMock() {
  const allMocks = DYNAMIC_DATA.mocks.flatMap(s => s.tests);
  const upcoming = allMocks.filter(m => daysUntil(m.date) >= 0).sort((a, b) => new Date(a.date) - new Date(b.date));
  return upcoming[0] || null;
}

function getNextMockFor(subj) {
  const allMocks = DYNAMIC_DATA.mocks.flatMap(s => s.tests);
  const upcoming = allMocks.filter(m => m.subject === subj && daysUntil(m.date) >= 0).sort((a, b) => new Date(a.date) - new Date(b.date));
  return upcoming[0] || null;
}

function openMockScoreModal(mockId, subject, series, date) {
  const scores = getMockScores();
  const existing = scores[mockId] || {};
  
  openModal(`${subject} — Series ${series}`, `
    <div class="mock-modal">
      <p class="mock-modal-date"><span class="material-symbols-rounded icon-sm">event</span> ${formatDate(date)}</p>
      <div class="form-group">
        <label>Score (out of 100)</label>
        <input type="number" id="mock-score-input" min="0" max="100" value="${existing.score || ''}" placeholder="Enter marks">
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="mock-notes-input" rows="3" placeholder="Weak areas, what to revise...">${existing.notes || ''}</textarea>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn-primary" onclick="saveMockScoreFromModal('${mockId}')"><span class="material-symbols-rounded icon-sm" style="vertical-align:middle;">save</span> Save Score</button>
        ${existing.score ? `<button class="btn-secondary" onclick="clearMockScoreFromModal('${mockId}')" style="flex: 0.5;"><span class="material-symbols-rounded icon-sm">delete</span> Clear</button>` : ''}
      </div>
    </div>
  `);
}

function saveMockScoreFromModal(mockId) {
  const score = document.getElementById('mock-score-input').value;
  const notes = document.getElementById('mock-notes-input').value;
  if (!score) { showToast('Please enter a score! <span class="material-symbols-rounded icon-sm" style="color:var(--error-color);">warning</span>'); return; }
  saveMockScore(mockId, score, notes);
  closeModal();
  renderExams();
  showToast('Score saved! <span class="material-symbols-rounded icon-sm" style="color:var(--success-color);">check_circle</span>');
}

function clearMockScoreFromModal(mockId) {
  const scores = getMockScores();
  delete scores[mockId];
  saveState({ mockScores: scores });
  closeModal();
  renderExams();
  showToast('Score cleared! <span class="material-symbols-rounded icon-sm" style="color:var(--error-color);">delete</span>');
}


function renderScoreChart() {
  const canvas = document.getElementById('score-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const scores = getMockScores();
  const subjects = ['DT', 'IDT', 'IBS'];
  const colors = { DT: '#6C3CE1', IDT: '#3B82F6', IBS: '#10B981' };
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid
  const styles = getComputedStyle(document.documentElement);
  ctx.strokeStyle = styles.getPropertyValue('--chart-grid').trim() || '#2a2e3a';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = 20 + (i * 40);
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(380, y);
    ctx.stroke();
    ctx.fillStyle = styles.getPropertyValue('--chart-label').trim() || '#666';
    ctx.font = '10px Inter';
    ctx.fillText((100 - i * 25), 10, y + 4);
  }
  
  // Labels
  ctx.fillStyle = styles.getPropertyValue('--chart-label').trim() || '#888';
  ctx.font = '11px Inter';
  DYNAMIC_DATA.mocks.forEach((series, i) => {
    const label = 'S' + (i + 1);
    ctx.fillText(label, 100 + i * 120, 195);
  });
  
  // Draw lines for each subject
  subjects.forEach(subj => {
    const points = [];
    DYNAMIC_DATA.mocks.forEach((series, sIdx) => {
      const mock = series.tests.find(m => m.subject === subj);
      if (mock && scores[mock.id]) {
        points.push({ x: 100 + sIdx * 120, y: 180 - (scores[mock.id].score / 100 * 160) });
      }
    });
    
    if (points.length > 1) {
      ctx.strokeStyle = colors[subj];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
    
    points.forEach(p => {
      ctx.fillStyle = colors[subj];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  
  // Legend
  let legendX = 60;
  subjects.forEach(subj => {
    ctx.fillStyle = colors[subj];
    ctx.fillRect(legendX, 5, 12, 12);
    ctx.fillStyle = styles.getPropertyValue('--chart-legend').trim() || '#ccc';
    ctx.font = '10px Inter';
    ctx.fillText(subj, legendX + 16, 15);
    legendX += 70;
  });
}

// ═══════════════════════════════════════════
//  TIMETABLE
// ═══════════════════════════════════════════
function renderSchedule() {
  const schedule = DYNAMIC_DATA.schedules[state.activeSchedule];
  
  const container = document.getElementById('schedule-slots-container');
  container.innerHTML = '';
  
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  
  schedule.slots.forEach((slot, idx) => {
    const [startStr] = slot.startRange.split('-');
    const [sh, sm] = startStr.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = startMin + slot.duration;
    const isActive = currentMin >= startMin && currentMin < endMin;
    const durationStr = slot.duration >= 60 ? (slot.duration / 60) + ' hrs' : slot.duration + ' min';
    
    container.innerHTML += `
      <div class="schedule-slot glass-card slot-type-${slot.type} ${isActive ? 'slot-active' : ''} draggable-item" draggable="${isEditMode}" ondragstart="handleDragStart(event, ${idx})" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ${idx}, 'schedule-slot', '${state.activeSchedule}')" ondragend="handleDragEnd(event)">
        <span class="drag-handle material-symbols-rounded">drag_handle</span>
        ${isActive && !isEditMode ? '<div class="active-indicator"><span class="material-symbols-rounded icon-sm">circle</span> NOW</div>' : ''}
        <div class="slot-header" style="flex:1">
          <span class="material-symbols-rounded slot-icon">${(slot.icon || "").trim()}</span>
          ${!isEditMode ? `<span class="slot-label">${slot.label}</span>` : `<input type="text" class="inline-input" value="${slot.label}" onchange="updateScheduleSlot('${state.activeSchedule}', ${idx}, 'label', this.value)">`}
        </div>
        <div class="slot-details" style="${isEditMode ? 'display:flex; flex-direction:column; gap:4px; margin-right:10px;' : ''}">
          ${!isEditMode ? `
          <span class="slot-range">Start between: ${slot.startRange}</span>
          <span class="slot-duration">Duration: ${durationStr}</span>
          ` : `
          <input type="text" class="inline-input time-input" value="${slot.startRange}" onchange="updateScheduleSlot('${state.activeSchedule}', ${idx}, 'startRange', this.value)" placeholder="Start Time">
          <input type="number" class="inline-input num-input" value="${slot.duration}" onchange="updateScheduleSlot('${state.activeSchedule}', ${idx}, 'duration', parseInt(this.value))" placeholder="Duration (min)">
          `}
        </div>
        ${isEditMode ? `
        <div class="edit-mode-controls">
          <button class="delete-btn" onclick="deleteScheduleSlot('${state.activeSchedule}', ${idx})"><span class="material-symbols-rounded icon-sm">delete</span></button>
        </div>
        ` : ''}
      </div>
    `;
  });
  if (isEditMode) {
    container.innerHTML += `<button class="add-item-btn" onclick="addScheduleSlot('${state.activeSchedule}')">+ Add Slot</button>`;
  }
  
  // Study rules
  const rulesList = document.getElementById('study-rules-list');
  rulesList.innerHTML = DYNAMIC_DATA.schedules.rules.map(r => `<li>${r}</li>`).join('');
}

function switchSchedule(type) {
  state.activeSchedule = type;
  document.getElementById('btn-early').classList.toggle('active', type === 'earlyMorning');
  document.getElementById('btn-late').classList.toggle('active', type === 'lateNight');
  saveState({ activeSchedule: type });
  renderSchedule();
}

// ═══════════════════════════════════════════
//  CALENDAR PLANNER
// ═══════════════════════════════════════════
function renderPlanner() {
  renderPlannerMockReminder();
  renderMiniCalendar();
  renderPlannerDay();
}

function renderPlannerMockReminder() {
  const nextMock = getNextMock();
  const el = document.getElementById('planner-mock-reminder');
  if (nextMock) {
    const days = daysUntil(nextMock.date);
    el.innerHTML = `<span class="pmr-icon"><span class="material-symbols-rounded icon-sm">track_changes</span></span> Next mock: <strong>${nextMock.subject}</strong> in <strong>${days} days</strong> (${formatDate(nextMock.date)})`;
    el.className = 'planner-mock-reminder glass-card' + (days <= 3 ? ' urgent' : '');
  } else {
    el.innerHTML = '<span class="material-symbols-rounded icon-sm" style="vertical-align:middle; color:var(--success-color);">task_alt</span> All mock tests done!';
  }
}

function renderMiniCalendar() {
  const date = state.calendarMonth;
  const year = date.getFullYear();
  const month = date.getMonth();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  
  document.getElementById('cal-month-label').textContent = months[month] + ' ' + year;
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = firstDay === 0 ? 6 : firstDay - 1; // Monday start
  
  const tasks = getPlannerTasks();
  let html = '';
  
  for (let i = 0; i < startDay; i++) {
    html += '<span class="cal-day empty"></span>';
  }
  
  // Build set of important dates for highlighting
  const mockDates = new Set();
  const examDates = new Set();
  DYNAMIC_DATA.mocks.flatMap(s => s.tests).forEach(m => mockDates.add(m.date));
  DYNAMIC_DATA.finalExams.forEach(e => examDates.add(e.date));
  
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayTasks = tasks[key] || [];
    const done = dayTasks.filter(t => t.done).length;
    const total = dayTasks.length;
    let dotClass = '';
    if (total > 0) {
      dotClass = done === total ? 'day-green' : (done > 0 ? 'day-yellow' : 'day-grey');
    }
    // Highlight mock test and exam dates
    const isMockDay = mockDates.has(key);
    const isExamDay = examDates.has(key);
    const mockClass = isMockDay ? 'day-mock' : '';
    const examClass = isExamDay ? 'day-exam' : '';
    const todayClass = isToday(new Date(year, month, d)) ? 'today' : '';
    const selectedClass = dateKey(state.plannerDate) === key ? 'selected' : '';
    
    // Get tooltip for special days
    let tooltip = '';
    if (isMockDay) {
      const mock = DYNAMIC_DATA.mocks.flatMap(s => s.tests).find(m => m.date === key);
      tooltip = `Mock: ${mock.subject}`;
    }
    if (isExamDay) {
      const exam = DYNAMIC_DATA.finalExams.find(e => e.date === key);
      tooltip = `EXAM: ${exam.subject}`;
    }
    
    html += `<span class="cal-day ${dotClass} ${mockClass} ${examClass} ${todayClass} ${selectedClass}" onclick="selectPlannerDay(${year}, ${month}, ${d})" title="${tooltip}">${d}</span>`;
  }
  
  document.getElementById('cal-days').innerHTML = html;
}

function changeMonth(delta) {
  state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + delta, 1);
  renderMiniCalendar();
}

function selectPlannerDay(year, month, day) {
  state.plannerDate = new Date(year, month, day);
  renderPlanner();
}

function changePlannerDay(delta) {
  state.plannerDate = new Date(state.plannerDate.getTime() + delta * 24 * 60 * 60 * 1000);
  state.calendarMonth = new Date(state.plannerDate);
  renderPlanner();
}

function renderPlannerDay() {
  const date = state.plannerDate;
  const label = isToday(date) ? 'Today — ' + formatDateFull(date) : formatDateFull(date);
  document.getElementById('planner-day-label').textContent = label;
  
  const tasks = getPlannerTasks();
  const key = dateKey(date);
  const dayTasks = tasks[key] || [];
  
  const primary = dayTasks.filter(t => t.category === 'primary');
  const secondary = dayTasks.filter(t => t.category === 'secondary');
  const quick = dayTasks.filter(t => t.category === 'quick');
  
  document.getElementById('planner-primary-tasks').innerHTML = renderPlannerTaskList(primary, key);
  document.getElementById('planner-secondary-tasks').innerHTML = renderPlannerTaskList(secondary, key);
  document.getElementById('planner-quick-tasks').innerHTML = renderPlannerTaskList(quick, key);
}

function renderPlannerTaskList(tasks, dayKey) {
  if (tasks.length === 0) return '<div class="empty-tasks">No tasks yet — tap "+ Add Task"</div>';
  
  return tasks.map((task, idx) => `
    <div class="planner-task ${task.done ? 'task-done' : ''}" onclick="togglePlannerTask('${dayKey}', ${task.originalIndex})">
      <span class="task-check">${task.done ? '<span class="material-symbols-rounded icon-sm">check_box</span>' : '<span class="material-symbols-rounded icon-sm">check_box_outline_blank</span>'}</span>
      <div class="task-info">
        <div class="task-name">${task.name}</div>
        ${task.subject ? '<div class="task-subject">' + task.subject + '</div>' : ''}
      </div>
      <button class="task-delete" onclick="event.stopPropagation(); deletePlannerTask('${dayKey}', ${task.originalIndex})"><span class="material-symbols-rounded icon-sm">delete</span></button>
    </div>
  `).join('');
}

function togglePlannerTask(dayKey, taskIndex) {
  const tasks = getPlannerTasks();
  if (tasks[dayKey] && tasks[dayKey][taskIndex]) {
    const task = tasks[dayKey][taskIndex];
    task.done = !task.done;
    
    // Auto-sync to syllabus
    if (task.chapterId && task.activityType) {
      const progress = getSyllabusProgress();
      if (!progress[task.chapterId]) progress[task.chapterId] = {};
      progress[task.chapterId][task.activityType] = task.done;
      saveSyllabusProgress(progress);
    }
    
    savePlannerTasks(tasks);
    renderPlanner();
  }
}

function deletePlannerTask(dayKey, taskIndex) {
  const tasks = getPlannerTasks();
  if (tasks[dayKey]) {
    tasks[dayKey].splice(taskIndex, 1);
    // Re-index
    tasks[dayKey].forEach((t, i) => t.originalIndex = i);
    savePlannerTasks(tasks);
    renderPlanner();
    showToast('Task deleted! <span class="material-symbols-rounded icon-sm">delete</span>');
  }
}

function openAddTaskModal() {
  const subjects = [
    { value: 'DT', label: 'DT (Direct Tax)' },
    { value: 'IDT', label: 'IDT (Indirect Tax)' },
    { value: 'IBS-DT', label: 'IBS — DT' },
    { value: 'IBS-IDT', label: 'IBS — IDT' },
    { value: 'IBS-AFM', label: 'IBS — AFM' },
    { value: 'IBS-FR', label: 'IBS — FR' },
    { value: 'IBS-Audit', label: 'IBS — Audit' },
    { value: 'IBS-Law', label: 'IBS — Law' },
    { value: 'IBS-SCPM', label: 'IBS — SC&PM' }
  ];
  
  openModal('<span class="material-symbols-rounded icon-sm">add</span> Add Task', `
    <div class="form-group">
      <label>Category</label>
      <select id="task-category">
        <option value="primary">Primary Subject</option>
        <option value="secondary">Secondary Subject</option>
        <option value="quick">Quick Task</option>
      </select>
    </div>
    <div class="form-group">
      <label>Subject</label>
      <select id="task-subject" onchange="onTaskSubjectChange()">
        <option value="">— Select —</option>
        ${subjects.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" id="task-chapter-group" style="display: none;">
      <label>Chapter (Optional)</label>
      <select id="task-chapter" onchange="onTaskChapterChange()">
      </select>
    </div>
    <div class="form-group" id="task-activity-group" style="display: none;">
      <label>Activity (Optional)</label>
      <select id="task-activity" onchange="onTaskChapterChange()">
        <option value="">— Select —</option>
        <option value="conceptBook">Book (Concepts)</option>
        <option value="questionBank">Question Bank</option>
        <option value="revisionVideo">Revision Video</option>
      </select>
    </div>
    <div class="form-group">
      <label>Task Description</label>
      <input type="text" id="task-name" placeholder="e.g. Ch 24 Transfer Pricing — ALP methods">
    </div>
    <button class="btn-primary" onclick="addPlannerTask()">Add Task <span class="material-symbols-rounded icon-sm">check_circle</span></button>
  `);
}

function onTaskSubjectChange() {
  const subj = document.getElementById('task-subject').value;
  const chapterGroup = document.getElementById('task-chapter-group');
  const activityGroup = document.getElementById('task-activity-group');
  const chapterSelect = document.getElementById('task-chapter');
  
  if (!subj) {
    chapterGroup.style.display = 'none';
    activityGroup.style.display = 'none';
    return;
  }
  
  let chapters = [];
  let isMain = false;
  
  if (subj === 'DT' || subj === 'IBS-DT') { chapters = DYNAMIC_DATA.dtChapters; isMain = (subj === 'DT'); }
  else if (subj === 'IDT' || subj === 'IBS-IDT') { chapters = DYNAMIC_DATA.idtChapters; isMain = (subj === 'IDT'); }
  else if (subj.startsWith('IBS-')) {
    const key = subj.replace('IBS-', '').toLowerCase();
    if (DYNAMIC_DATA.ibsSubjects[key]) {
      chapters = DYNAMIC_DATA.ibsSubjects[key].chapters;
    }
  }
  
  if (chapters.length > 0) {
    chapterGroup.style.display = 'block';
    chapterSelect.innerHTML = '<option value="">— Select Chapter —</option>' + 
      chapters.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      
    if (isMain) {
      activityGroup.style.display = 'block';
    } else {
      activityGroup.style.display = 'none';
      document.getElementById('task-activity').value = '';
    }
  } else {
    chapterGroup.style.display = 'none';
    activityGroup.style.display = 'none';
  }
}

function onTaskChapterChange() {
  const chapterSelect = document.getElementById('task-chapter');
  const chapterId = chapterSelect.value;
  const chapterName = chapterSelect.options[chapterSelect.selectedIndex]?.text;
  
  const activitySelect = document.getElementById('task-activity');
  const activity = activitySelect.value;
  const activityName = activitySelect.options[activitySelect.selectedIndex]?.text;
  
  const taskName = document.getElementById('task-name');
  
  if (chapterId) {
    // Strip emojis for cleaner task name
    const cleanActivity = activityName ? activityName.replace(/[^a-zA-Z\\s\\(\\)]/g, '').trim() : '';
    taskName.value = chapterName + (cleanActivity ? ` — ${cleanActivity}` : '');
  }
}

function addPlannerTask() {
  const name = document.getElementById('task-name').value.trim();
  const category = document.getElementById('task-category').value;
  const subject = document.getElementById('task-subject').value;
  
  const chapterId = document.getElementById('task-chapter') ? document.getElementById('task-chapter').value : '';
  let activityType = document.getElementById('task-activity') ? document.getElementById('task-activity').value : '';
  
  // For IBS subjects (no activity dropdown), implicitly set activity to 'done'
  if (subject && subject.startsWith('IBS-') && chapterId) {
    activityType = 'done';
  }
  
  if (!name) { showToast('Please enter a task name! <span class="material-symbols-rounded icon-sm">warning</span>'); return; }
  
  const tasks = getPlannerTasks();
  const key = dateKey(state.plannerDate);
  if (!tasks[key]) tasks[key] = [];
  
  tasks[key].push({
    name,
    category,
    subject,
    chapterId,
    activityType,
    done: false,
    originalIndex: tasks[key].length
  });
  
  savePlannerTasks(tasks);
  closeModal();
  renderPlanner();
  showToast('Task added! <span class="material-symbols-rounded icon-sm">check_circle</span>');
}

function copyToTomorrow() {
  const tasks = getPlannerTasks();
  const todayKey = dateKey(state.plannerDate);
  const tomorrowDate = new Date(state.plannerDate.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowKey = dateKey(tomorrowDate);
  
  const todayTasks = tasks[todayKey] || [];
  if (todayTasks.length === 0) { showToast('No tasks to copy! Add tasks first.'); return; }
  
  tasks[tomorrowKey] = todayTasks.map((t, i) => ({ ...t, done: false, originalIndex: i }));
  savePlannerTasks(tasks);
  showToast('Copied to tomorrow!');
}

// ═══════════════════════════════════════════
//  SYLLABUS TRACKER
// ═══════════════════════════════════════════
function renderSyllabus() {
  if (state.syllabusView === 'detail' && state.activeSubject) {
    renderSyllabusDetail(state.activeSubject);
  } else {
    showSubjectsList();
  }
}

function showSubjectsList() {
  state.syllabusView = 'list';
  document.getElementById('syllabus-detail').style.display = 'none';
  
  // Overall progress
  const pct = calculateOverallProgress();
  document.getElementById('overall-pct').textContent = pct + '%';
  document.getElementById('overall-bar').style.width = pct + '%';
  
  const container = document.getElementById('syllabus-subjects-list');
  clearSortables();
  container.style.display = 'block';
  
  const subjects = DYNAMIC_DATA.syllabusSubjects || [];
  
  container.innerHTML = subjects.map((subj, idx) => {
    const pct = calculateSubjectProgress(subj.id, subj.type);
    return `
      <div class="subject-card glass-card draggable-item" >
        <span class="drag-handle material-symbols-rounded">drag_handle</span>
        <div class="subj-info" onclick="openSubjectDetail('${subj.id}', '${subj.type}')" style="cursor:pointer; flex: 1">
          ${!isEditMode ? `
            <div class="subj-name"><span class="material-symbols-rounded icon-sm" style="vertical-align:middle; margin-right:4px;">menu_book</span> ${subj.name}</div>
            <div class="subj-source">${subj.source}</div>
          ` : `
            <div class="subj-name">
              <input type="text" class="inline-input" value="${subj.name.replace(/"/g, '&quot;')}" onclick="event.stopPropagation()" onchange="updateSyllabusSubject(${idx}, this.value)">
            </div>
            <div class="subj-source">${subj.source}</div>
          `}
        </div>
        ${!isEditMode ? `
        <div class="subj-progress">
          <span class="subj-pct">${pct}%</span>
          <div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
        </div>
        <span class="subj-arrow">▶</span>
        ` : `
        <div class="edit-mode-controls">
          <button class="delete-btn" onclick="event.stopPropagation(); deleteSyllabusSubject(${idx})"><span class="material-symbols-rounded icon-sm">delete</span></button>
        </div>
        `}
      </div>
    `;
  }).join('');
  
  if (isEditMode) {
    container.innerHTML += `<button class="add-item-btn" onclick="addSyllabusSubject()">+ Add Subject</button>`;
  }
}

function openSubjectDetail(key, type) {
  state.syllabusView = 'detail';
  state.activeSubject = { key, type };
  document.getElementById('syllabus-subjects-list').style.display = 'none';
  document.getElementById('syllabus-detail').style.display = 'block';
  renderSyllabusDetail({ key, type });
}

function renderSyllabusDetail(subject) {
  const { key, type } = subject;
  const progress = getSyllabusProgress();
  
  const subjData = DYNAMIC_DATA.syllabusSubjects.find(s => s.id === key);
  if (!subjData) return;
  const chapters = subjData.chapters || [];
  const title = subjData.name;
  
  const pct = calculateSubjectProgress(key, type);
  
  const headerEl = document.getElementById('syllabus-detail-header');
  headerEl.innerHTML = `
    <h3><span class="material-symbols-rounded icon-sm" style="vertical-align:middle; margin-right:6px;">menu_book</span> ${title}</h3>
    <div class="detail-progress">
      <span>${pct}% done</span>
      <div class="stat-bar stat-bar-lg"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
    </div>
  `;
  
  const contentEl = document.getElementById('syllabus-detail-content');
  
  if (type === 'main') {
    // DT/IDT: Columnar with 3 checkboxes
    contentEl.innerHTML = `
      <div class="syllabus-table">
        <div class="st-header">
          <span class="st-num">#</span>
          <span class="st-name">Chapter</span>
          <span class="st-check"><span class="material-symbols-rounded icon-sm">import_contacts</span></span>
          <span class="st-check"><span class="material-symbols-rounded icon-sm">help</span></span>
          <span class="st-check"><span class="material-symbols-rounded icon-sm">videocam</span></span>
        </div>
        ${chapters.map((ch, idx) => {
          const chProgress = progress[ch.id] || {};
          return `
            <div class="st-row ${isEditMode ? 'is-edit' : ''} draggable-item" draggable="${isEditMode}" ondragstart="handleDragStart(event, ${idx})" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ${idx}, 'syllabus-chapter', '${key}')" ondragend="handleDragEnd(event)">
              <span class="drag-handle material-symbols-rounded">drag_handle</span>
              ${!isEditMode ? `<span class="st-num">${idx + 1}</span><div class="st-name">${ch.name}</div>` : `
                <div class="st-name" style="flex:1; margin-right: 10px;">
                  <input type="text" class="inline-input" value="${ch.name}" onclick="event.stopPropagation()" onchange="updateSyllabusChapter('${key}', ${idx}, this.value)">
                </div>
              `}
              ${!isEditMode ? `
              <span class="st-check"><input type="checkbox" ${chProgress.conceptBook ? 'checked' : ''} onchange="toggleSyllabusCheck('${ch.id}', 'conceptBook', this.checked)"></span>
              <span class="st-check"><input type="checkbox" ${chProgress.questionBank ? 'checked' : ''} onchange="toggleSyllabusCheck('${ch.id}', 'questionBank', this.checked)"></span>
              <span class="st-check"><input type="checkbox" ${chProgress.revisionVideo ? 'checked' : ''} onchange="toggleSyllabusCheck('${ch.id}', 'revisionVideo', this.checked)"></span>
              ` : `
              <div class="edit-mode-controls">
                <button class="delete-btn" onclick="event.stopPropagation(); deleteSyllabusChapter('${key}', ${idx})"><span class="material-symbols-rounded icon-sm">delete</span></button>
              </div>
              `}
            </div>
          `;
        }).join('')}
      </div>
    `;
    if (isEditMode) {
      contentEl.innerHTML += `<button class="add-item-btn" onclick="addSyllabusChapter('${key}')">+ Add Chapter</button>`;
    }
  } else {
    // IBS: Simple checkbox
    contentEl.innerHTML = `
      <div class="syllabus-simple">
        ${chapters.map((ch, idx) => {
          const isDone = progress[ch.id]?.done || false;
          return `
            <div class="ss-row ${isDone ? 'done' : ''} draggable-item" draggable="${isEditMode}" ondragstart="handleDragStart(event, ${idx})" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ${idx}, 'syllabus-chapter', '${key}')" ondragend="handleDragEnd(event)" ${!isEditMode ? `onclick="toggleIbsCheck('${ch.id}')"` : ''}>
              <span class="drag-handle material-symbols-rounded">drag_handle</span>
              <span class="ss-check">${isDone ? '<span class="material-symbols-rounded icon-sm">check_box</span>' : '<span class="material-symbols-rounded icon-sm">check_box_outline_blank</span>'}</span>
              <span class="ss-num">${!isEditMode ? idx + 1 + '.' : ''}</span>
              ${!isEditMode ? `<span class="ss-name" style="flex:1">${ch.name}</span>` : `
              <div class="ss-name" style="flex:1; margin-right:10px;">
                <input type="text" class="inline-input" value="${ch.name}" onclick="event.stopPropagation()" onchange="updateSyllabusChapter('${key}', ${idx}, this.value)">
              </div>
              <div class="edit-mode-controls">
                <button class="delete-btn" onclick="event.stopPropagation(); deleteSyllabusChapter('${key}', ${idx})"><span class="material-symbols-rounded icon-sm">delete</span></button>
              </div>
              `}
            </div>
          `;
        }).join('')}
      </div>
    `;
    if (isEditMode) {
      contentEl.innerHTML += `<button class="add-item-btn" onclick="addSyllabusChapter('${key}')">+ Add Chapter</button>`;
    }
  }
}

function toggleSyllabusCheck(chapterId, field, checked) {
  const progress = getSyllabusProgress();
  if (!progress[chapterId]) progress[chapterId] = {};
  progress[chapterId][field] = checked;
  saveSyllabusProgress(progress);
  
  // Update progress display without full re-render
  const pct = calculateSubjectProgress(state.activeSubject.key, state.activeSubject.type);
  const headerEl = document.getElementById('syllabus-detail-header');
  const barEl = headerEl.querySelector('.stat-bar-fill');
  const pctEl = headerEl.querySelector('.detail-progress span');
  if (barEl) barEl.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '% done';
}

function toggleIbsCheck(chapterId) {
  const progress = getSyllabusProgress();
  if (!progress[chapterId]) progress[chapterId] = {};
  progress[chapterId].done = !progress[chapterId].done;
  saveSyllabusProgress(progress);
  renderSyllabusDetail(state.activeSubject);
}

// ─── Progress Calculation ───────────────
function calculateSubjectProgress(key, type) {
  const progress = getSyllabusProgress();
  const subj = DYNAMIC_DATA.syllabusSubjects?.find(s => s.id === key);
  if (!subj || !subj.chapters) return 0;
  
  const chapters = subj.chapters;
  let total = 0, done = 0;
  
  if (type === 'main') {
    total = chapters.length * 3;
    chapters.forEach(ch => {
      const p = progress[ch.id] || {};
      if (p.conceptBook) done++;
      if (p.questionBank) done++;
      if (p.revisionVideo) done++;
    });
  } else {
    total = chapters.length;
    chapters.forEach(ch => {
      if (progress[ch.id]?.done) done++;
    });
  }
  
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function calculateOverallProgress() {
  const subjects = [
    { key: 'dt', type: 'main', weight: 3 },
    { key: 'idt', type: 'main', weight: 3 },
    { key: 'ibs-afm', type: 'ibs', weight: 1 },
    { key: 'ibs-fr', type: 'ibs', weight: 1 },
    { key: 'ibs-audit', type: 'ibs', weight: 1 },
    { key: 'ibs-law', type: 'ibs', weight: 1 },
    { key: 'ibs-scpm', type: 'ibs', weight: 1 }
  ];
  
  let totalWeight = 0, weightedSum = 0;
  subjects.forEach(s => {
    const pct = calculateSubjectProgress(s.key, s.type);
    weightedSum += pct * s.weight;
    totalWeight += s.weight;
  });
  
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// ═══════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════
function init() {
  // Initialize Themes
  initTheme();
  
  // Load dynamic data
  loadDynamicData();
  
  // Load saved schedule preference
  const saved = loadState();
  if (saved.activeSchedule) state.activeSchedule = saved.activeSchedule;
  
  // Render initial tab (updates UI state properly)
  switchTab(state.activeTab);
  
  // Start countdown timer
  setInterval(updateCountdown, 1000);
  
  // Update current activity every minute
  setInterval(updateCurrentActivity, 60000);
}

// Start when DOM ready
document.addEventListener('DOMContentLoaded', init);

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.log('SW error:', err));
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        window.location.reload();
        refreshing = true;
      }
    });

}

// ═══════════════════════════════════════════
//  MENU, THEMES & DATA SHARING
// ═══════════════════════════════════════════
function openMenuModal() {
  openModal('☰ Settings & Tools', `
    <button class="menu-btn" onclick="toggleEditMode(); closeModal()">
      <span class="menu-btn-icon">${isEditMode ? '<span class="material-symbols-rounded icon-sm">check_circle</span>' : '<span class="material-symbols-rounded icon-sm">edit</span>'}</span> Edit Mode: <strong style="color: ${isEditMode ? 'var(--color-primary)' : 'inherit'}">${isEditMode ? 'ON' : 'OFF'}</strong>
    </button>
    <button class="menu-btn" onclick="openThemeModal()">
      <span class="material-symbols-rounded menu-btn-icon">palette</span> Customize Theme
    </button>
    <button class="menu-btn" onclick="shareProgressPDF()">
      <span class="material-symbols-rounded menu-btn-icon">picture_as_pdf</span> Share Progress (PDF)
    </button>
    <button class="menu-btn" onclick="exportData()">
      <span class="menu-btn-icon"><span class="material-symbols-rounded icon-sm">upload</span></span> Share Backup (Export)
    </button>
    <button class="menu-btn" onclick="triggerImport()">
      <span class="menu-btn-icon"><span class="material-symbols-rounded icon-sm">download</span></span> Load Backup (Import)
    </button>
  `);
}

function openThemeModal() {
  const currentTheme = localStorage.getItem('ca-theme') || 'default';
  openModal('Select Theme', `
    <p style="text-align:center; color:var(--text-secondary); margin-bottom: 20px;">Personalize your app colors</p>
    <div class="theme-picker">
      <div class="theme-circle tc-default ${currentTheme === 'default' ? 'active' : ''}" onclick="setTheme('default', this)"></div>
      <div class="theme-circle tc-ocean ${currentTheme === 'ocean' ? 'active' : ''}" onclick="setTheme('ocean', this)"></div>
      <div class="theme-circle tc-forest ${currentTheme === 'forest' ? 'active' : ''}" onclick="setTheme('forest', this)"></div>
      <div class="theme-circle tc-sunset ${currentTheme === 'sunset' ? 'active' : ''}" onclick="setTheme('sunset', this)"></div>
      <div class="theme-circle tc-rose ${currentTheme === 'rose' ? 'active' : ''}" onclick="setTheme('rose', this)"></div>
    </div>
    <button class="btn-primary" style="margin-top:20px" onclick="openMenuModal()">Back to Menu</button>
  `);
}

function setTheme(themeName, element) {
  // Remove all theme classes
  document.body.classList.remove('theme-ocean', 'theme-forest', 'theme-sunset', 'theme-rose');
  
  if (themeName !== 'default') {
    document.body.classList.add('theme-' + themeName);
  }
  localStorage.setItem('ca-theme', themeName);
  
  // Update UI
  if (element) {
    document.querySelectorAll('.theme-circle').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
  }
  
  // Re-render chart if on Exams tab to update chart color
  if (state.activeTab === 'exams') {
    renderScoreChart();
  }
}

// ─── SYLLABUS EDIT HANDLERS ─────────────
function reorderSyllabusSubject(from, to) {
  reorderArray(DYNAMIC_DATA.syllabusSubjects, from, to);
}
function updateSyllabusSubject(idx, newName) {
  if (!newName) return;
  DYNAMIC_DATA.syllabusSubjects[idx].name = newName;
  saveDynamicData();
}
function deleteSyllabusSubject(idx) {
  confirmDelete(DYNAMIC_DATA.syllabusSubjects[idx].name, () => {
    DYNAMIC_DATA.syllabusSubjects.splice(idx, 1);
    saveDynamicData();
    renderSyllabus();
  });
}
function addSyllabusSubject() {
  openFormModal('Add New Subject', [
    { label: 'Subject Name', type: 'text', placeholder: 'e.g., Paper 6: IBS' }
  ], (name) => {
    if (!name) return;
    const id = 'subj-' + Date.now();
    const type = confirm('Is this a Main Subject (with Book/QB/Video tracking)?\nClick OK for Main, Cancel for Simple (like IBS).') ? 'main' : 'ibs';
    DYNAMIC_DATA.syllabusSubjects.push({ id, name, source: '', type, chapters: [] });
    saveDynamicData();
    renderSyllabus();
  });
}

function reorderSyllabusChapter(from, to, subjectId) {
  const subj = DYNAMIC_DATA.syllabusSubjects.find(s => s.id === subjectId);
  if (subj) reorderArray(subj.chapters, from, to);
}
function updateSyllabusChapter(subjectId, idx, newName) {
  if (!newName) return;
  const subj = DYNAMIC_DATA.syllabusSubjects.find(s => s.id === subjectId);
  if (subj) {
    subj.chapters[idx].name = newName;
    saveDynamicData();
  }
}
function deleteSyllabusChapter(subjectId, idx) {
  const subj = DYNAMIC_DATA.syllabusSubjects.find(s => s.id === subjectId);
  if (subj) {
    confirmDelete(subj.chapters[idx].name, () => {
      subj.chapters.splice(idx, 1);
      saveDynamicData();
      renderSyllabusDetail({ key: subj.id, type: subj.type });
    });
  }
}
function addSyllabusChapter(subjectId) {
  const subj = DYNAMIC_DATA.syllabusSubjects.find(s => s.id === subjectId);
  if (subj) {
    openFormModal('Add Chapter', [
      { label: 'Chapter Name', type: 'text', placeholder: 'e.g., Chapter 1' }
    ], (name) => {
      if (!name) return;
      subj.chapters.push({ id: 'ch-' + Date.now(), name });
      saveDynamicData();
      renderSyllabusDetail({ key: subj.id, type: subj.type });
    });
  }
}

// ─── EXAMS EDIT HANDLERS ───────────────
function reorderMock(from, to, seriesKey) {
  const series = DYNAMIC_DATA.mocks.find(s => s.id === seriesKey);
  if (series) reorderArray(series.tests, from, to);
}
function updateMock(seriesKey, idx, field, value) {
  const series = DYNAMIC_DATA.mocks.find(s => s.id === seriesKey);
  if (!series) return;
  const mock = series.tests[idx];
  mock[field] = value;
  saveDynamicData();
}
function deleteMock(seriesKey, idx) {
  const series = DYNAMIC_DATA.mocks.find(s => s.id === seriesKey);
  confirmDelete(series.tests[idx].subject, () => {
    series.tests.splice(idx, 1);
    saveDynamicData();
    renderExams();
  });
}
function addMock(seriesKey) {
  const series = DYNAMIC_DATA.mocks.find(s => s.id === seriesKey);
  openFormModal('Add Mock', [
    { label: 'Subject', type: 'text', placeholder: 'e.g., DT Full Syllabus' },
    { label: 'Date', type: 'date', value: '2026-08-01' }
  ], (subj, date) => {
    if (!subj || !date) return;
    series.tests.push({ id: 'm-new-' + Date.now(), subject: subj, date: date, series: series.name });
    saveDynamicData();
    renderExams();
  });
}

function reorderExam(from, to) {
  reorderArray(DYNAMIC_DATA.finalExams, from, to);
}
function updateExam(idx, field, value) {
  const exam = DYNAMIC_DATA.finalExams[idx];
  if (!exam) return;
  exam[field] = value;
  saveDynamicData();
}
function deleteExam(idx) {
  confirmDelete(DYNAMIC_DATA.finalExams[idx].subject, () => {
    DYNAMIC_DATA.finalExams.splice(idx, 1);
    saveDynamicData();
    renderExams();
  });
}
function addExam() {
  openFormModal('Add Final Exam', [
    { label: 'Subject', type: 'text', placeholder: 'e.g., Paper 6: IBS' },
    { label: 'Date', type: 'date', value: '2026-11-01' },
    { label: 'Day', type: 'text', placeholder: 'e.g., Monday' },
    { label: 'Time', type: 'text', placeholder: 'e.g., 2:00 PM - 6:00 PM' }
  ], (subj, date, day, time) => {
    if (!subj || !date) return;
    DYNAMIC_DATA.finalExams.push({ id: 'final-new-' + Date.now(), subject: subj, date, day, time });
    saveDynamicData();
    renderExams();
  });
}

// ─── SCHEDULE EDIT HANDLERS ─────────────
function reorderScheduleSlot(from, to, scheduleKey) {
  reorderArray(DYNAMIC_DATA.schedules[scheduleKey].slots, from, to);
}
function updateScheduleSlot(scheduleKey, idx, field, value) {
  const slot = DYNAMIC_DATA.schedules[scheduleKey].slots[idx];
  if (!slot) return;
  slot[field] = value;
  saveDynamicData();
}
function deleteScheduleSlot(scheduleKey, idx) {
  confirmDelete(DYNAMIC_DATA.schedules[scheduleKey].slots[idx].label, () => {
    DYNAMIC_DATA.schedules[scheduleKey].slots.splice(idx, 1);
    saveDynamicData();
    renderSchedule();
  });
}
function addScheduleSlot(scheduleKey) {
  openFormModal('Add Schedule Slot', [
    { label: 'Label', type: 'text', placeholder: 'e.g., Break / Revision' },
    { label: 'Start - End Time', type: 'text', placeholder: 'e.g., 14:00-15:00' },
    { label: 'Duration (minutes)', type: 'number', value: 60 }
  ], (label, range, dur) => {
    if (!label) return;
    DYNAMIC_DATA.schedules[scheduleKey].slots.push({ id: 's-new-' + Date.now(), label, startRange: range, duration: parseInt(dur) || 60, type: 'study', icon: '<span class="material-symbols-rounded icon-sm">edit_document</span>' });
    saveDynamicData();
    renderSchedule();
  });
}

function initTheme() {
  const savedTheme = localStorage.getItem('ca-theme') || 'default';
  setTheme(savedTheme);
}

// ─── Data Export / Import ───
async function exportData() {
  try {
    const data = localStorage.getItem(getStorageKey()) || '{}';
    const exportPayload = { trackerData: JSON.parse(data), dynamicData: DYNAMIC_DATA };
    const jsonString = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ca-progress-${state.activeGroup}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    showToast('Backup downloaded! <span class="material-symbols-rounded icon-sm">download</span>');
  } catch (err) {
    console.error("Export error:", err);
    showToast('Export failed!');
  }
}

function triggerImport() {
  document.getElementById('import-file').click();
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data && typeof data === 'object') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        showToast('Data restored successfully! Refreshing...');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      alert('Invalid backup file! Make sure you selected the correct .json file.');
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // reset input
}

// ─── PDF Generation ───
function shareProgressPDF() {
  const overallPct = calculateOverallProgress();
  const dtPct = calculateSubjectProgress('dt', 'main');
  const idtPct = calculateSubjectProgress('idt', 'main');
  
  const scores = getMockScores();
  let mocksHtml = '';
  Object.keys(scores).forEach(k => {
    mocksHtml += `<div class="print-row"><span>Mock ${k}</span> <strong>${scores[k].score}/100</strong></div>`;
  });
  if (!mocksHtml) mocksHtml = '<p style="color:#666">No mock scores recorded yet.</p>';
  
  const html = `
    <div class="print-title">CA Final Group 2 Progress Report</div>
    
    <div class="print-card">
      <h3 style="margin-bottom:10px">Overall Syllabus Completion</h3>
      <div style="font-size:32px; font-weight:900; text-align:center">${overallPct}%</div>
      <div class="print-bar"><div class="print-bar-fill" style="width:${overallPct}%"></div></div>
    </div>
    
    <div class="print-card">
      <h3 style="margin-bottom:10px">Subject Details</h3>
      <div class="print-row"><span>Paper 4: Direct Tax</span> <strong>${dtPct}%</strong></div>
      <div class="print-bar" style="margin-bottom:15px"><div class="print-bar-fill" style="width:${dtPct}%"></div></div>
      
      <div class="print-row"><span>Paper 5: Indirect Tax</span> <strong>${idtPct}%</strong></div>
      <div class="print-bar"><div class="print-bar-fill" style="width:${idtPct}%"></div></div>
    </div>
    
    <div class="print-card">
      <h3 style="margin-bottom:10px">Mock Test Scores</h3>
      ${mocksHtml}
    </div>
    
    <p style="text-align:center; color:#666; margin-top:30px; font-size:12px;">Generated via CA Final Study Companion PWA</p>
  `;
  
  document.getElementById('print-section').innerHTML = html;
  closeModal();
  setTimeout(() => window.print(), 500);
}

// ─── Test Series Managers ─────────────────────
function addMockSeries() {
  openFormModal('Add Test Series', [
    { label: 'Series Name', type: 'text', placeholder: 'e.g., ICAI MTPs' }
  ], (name) => {
    if (!name) return;
    const id = 'series_' + Date.now();
    DYNAMIC_DATA.mocks.push({ id, name, tests: [] });
    saveDynamicData();
    renderExams();
  });
}

function updateMockSeries(idx, name) {
  if (!name) return;
  DYNAMIC_DATA.mocks[idx].name = name;
  saveDynamicData();
}

function deleteMockSeries(idx) {
  if (confirm(`Delete series "${DYNAMIC_DATA.mocks[idx].name}" and all its mocks?`)) {
    DYNAMIC_DATA.mocks.splice(idx, 1);
    saveDynamicData();
    renderExams();
  }
}


function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}
function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if(btn) btn.innerHTML = theme === 'light' ? '<span class="material-symbols-rounded">dark_mode</span>' : '<span class="material-symbols-rounded">light_mode</span>';
}
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    } else {
        updateThemeIcon(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    }
});


window.moveSubjectUp = function(idx) {
  event.stopPropagation();
  if (idx > 0) {
    const temp = DYNAMIC_DATA.syllabusSubjects[idx];
    DYNAMIC_DATA.syllabusSubjects[idx] = DYNAMIC_DATA.syllabusSubjects[idx - 1];
    DYNAMIC_DATA.syllabusSubjects[idx - 1] = temp;
    saveDynamicData();
    renderSyllabus();
  }
};
window.moveSubjectDown = function(idx) {
  event.stopPropagation();
  if (idx < DYNAMIC_DATA.syllabusSubjects.length - 1) {
    const temp = DYNAMIC_DATA.syllabusSubjects[idx];
    DYNAMIC_DATA.syllabusSubjects[idx] = DYNAMIC_DATA.syllabusSubjects[idx + 1];
    DYNAMIC_DATA.syllabusSubjects[idx + 1] = temp;
    saveDynamicData();
    renderSyllabus();
  }
};
