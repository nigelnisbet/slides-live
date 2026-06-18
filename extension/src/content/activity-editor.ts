/**
 * On-slide "+ Add Activity" authoring panel.
 *
 * Lets a presenter add a poll/quiz/word-cloud/announcement to whichever
 * slide they're currently editing, without leaving Slides or opening the
 * separate Activity Builder web app. Writes straight to
 * presentations/{id}/config.activities, the same place the existing builder
 * and the extension's session-creation flow already read from.
 *
 * Only one activity per slide for now (keeps the data model and the UI
 * simple) - saving again for the same slide replaces the previous one.
 */
import { ref, get, set } from 'firebase/database';
import { database, ensureAnonymousAuth } from './firebase-client';

const ACTIVITY_TYPES = ['poll', 'quiz', 'word-cloud', 'announcement'] as const;
const BUTTON_ID = 'slideslive-add-activity-btn';
const PANEL_ID = 'slideslive-activity-panel';

function styledEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  styles?: Partial<CSSStyleDeclaration>
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  return e;
}

interface ActivityConfigEntry {
  slidePosition: { indexh: number; indexv: number; timestamp: number };
  activityType: string;
  activityId: string;
  config: Record<string, unknown>;
}

async function loadExistingActivity(
  presentationId: string,
  slideIndex: number
): Promise<ActivityConfigEntry | null> {
  const snap = await get(ref(database, `presentations/${presentationId}/config`));
  if (!snap.exists()) return null;
  const activities: ActivityConfigEntry[] = snap.val().activities || [];
  return activities.find((a) => a.slidePosition?.indexh === slideIndex) || null;
}

async function deleteActivity(presentationId: string, slideIndex: number): Promise<void> {
  await ensureAnonymousAuth();
  const configRef = ref(database, `presentations/${presentationId}/config`);
  const snap = await get(configRef);
  if (!snap.exists()) return;
  const existing = snap.val();
  const activities: ActivityConfigEntry[] = (existing.activities || []).filter(
    (a: ActivityConfigEntry) => a.slidePosition?.indexh !== slideIndex
  );
  await set(configRef, { ...existing, activities, updatedAt: Date.now() });
}

async function saveActivity(
  presentationId: string,
  slideIndex: number,
  type: string,
  question: string,
  options: string[],
  correctAnswer: number | null
): Promise<void> {
  await ensureAnonymousAuth();

  const activityId = `activity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let config: Record<string, unknown>;
  if (type === 'announcement') {
    config = { type, activityId, message: question };
  } else if (type === 'quiz') {
    config = {
      type,
      activityId,
      question,
      options,
      correctAnswer: correctAnswer ?? 0,
      points: 100,
      showResults: 'live',
    };
  } else {
    config = {
      type,
      activityId,
      question,
      options,
      allowMultiple: false,
      showResults: 'live',
    };
  }

  const newActivity: ActivityConfigEntry = {
    slidePosition: { indexh: slideIndex, indexv: 0, timestamp: Date.now() },
    activityType: type,
    activityId,
    config,
  };

  const configRef = ref(database, `presentations/${presentationId}/config`);
  const snap = await get(configRef);
  const existing = snap.exists() ? snap.val() : { presentationId, activities: [] };
  const activities: ActivityConfigEntry[] = (existing.activities || []).filter(
    (a: ActivityConfigEntry) => a.slidePosition?.indexh !== slideIndex
  );
  activities.push(newActivity);

  await set(configRef, { ...existing, presentationId, activities, updatedAt: Date.now() });
}

async function openPanel(presentationId: string, slideIndex: number) {
  document.getElementById(PANEL_ID)?.remove();

  const existingActivity = slideIndex >= 0 ? await loadExistingActivity(presentationId, slideIndex) : null;
  // The panel might have been closed/reopened for a different slide while
  // the lookup above was in flight - bail rather than show stale data.
  if (document.getElementById(PANEL_ID)) return;

  const panel = styledEl('div', {
    position: 'fixed',
    top: '80px',
    right: '24px',
    width: '300px',
    background: '#fff',
    color: '#111',
    borderRadius: '12px',
    boxShadow: '0 6px 24px rgba(0,0,0,.35)',
    padding: '16px',
    zIndex: '2147483647',
    fontFamily: 'sans-serif',
    fontSize: '14px',
  });
  panel.id = PANEL_ID;

  const title = styledEl('div', { fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' });
  title.textContent = existingActivity ? 'Edit Activity' : 'Add Activity';
  panel.appendChild(title);

  const slideLabel = styledEl('div', { color: '#666', marginBottom: '10px', fontSize: '12px' });
  slideLabel.textContent = slideIndex < 0 ? 'Could not detect current slide' : `For slide ${slideIndex + 1}`;
  panel.appendChild(slideLabel);

  const typeLabel = styledEl('div', { marginBottom: '4px' });
  typeLabel.textContent = 'Type';
  panel.appendChild(typeLabel);

  const typeSelect = styledEl('select', { width: '100%', marginBottom: '10px', padding: '6px' });
  ACTIVITY_TYPES.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  });
  if (existingActivity) typeSelect.value = existingActivity.activityType;
  panel.appendChild(typeSelect);

  const qLabel = styledEl('div', { marginBottom: '4px' });
  qLabel.textContent = 'Question / prompt';
  panel.appendChild(qLabel);

  const qInput = styledEl('input', {
    width: '100%',
    marginBottom: '10px',
    padding: '6px',
    boxSizing: 'border-box',
  }) as HTMLInputElement;
  qInput.type = 'text';
  qInput.placeholder = "e.g. What's your favorite color?";
  qInput.value = existingActivity
    ? String(existingActivity.config.question ?? existingActivity.config.message ?? '')
    : '';
  panel.appendChild(qInput);

  const optsWrap = styledEl('div', { marginBottom: '10px' });
  const optsLabel = styledEl('div', { marginBottom: '4px' });
  optsLabel.textContent = 'Options (poll/quiz only)';
  optsWrap.appendChild(optsLabel);
  const correctHint = styledEl('div', { color: '#666', fontSize: '11px', marginBottom: '6px', display: 'none' });
  correctHint.textContent = 'Select the radio next to the correct answer';
  optsWrap.appendChild(correctHint);

  const optRows: { input: HTMLInputElement; correctRadio: HTMLInputElement; row: HTMLDivElement }[] = [];
  const addOptBtn = styledEl('button', { fontSize: '12px', padding: '4px 8px', marginBottom: '4px' });
  addOptBtn.textContent = '+ option';

  function updateCorrectVisibility() {
    const isQuiz = typeSelect.value === 'quiz';
    correctHint.style.display = isQuiz ? 'block' : 'none';
    optRows.forEach(({ correctRadio }) => {
      correctRadio.style.display = isQuiz ? 'inline-block' : 'none';
    });
  }

  function addOptionInput(value = '') {
    const row = styledEl('div', { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' });
    const correctRadio = styledEl('input', { display: 'none', flexShrink: '0' }) as HTMLInputElement;
    correctRadio.type = 'radio';
    correctRadio.name = 'slideslive-correct-answer';
    correctRadio.title = 'Mark as correct answer';
    const inp = styledEl('input', {
      flex: '1',
      padding: '6px',
      boxSizing: 'border-box',
    }) as HTMLInputElement;
    inp.type = 'text';
    inp.value = value;
    inp.placeholder = 'Option text';
    row.appendChild(correctRadio);
    row.appendChild(inp);
    optRows.push({ input: inp, correctRadio, row });
    optsWrap.insertBefore(row, addOptBtn);
    updateCorrectVisibility();
  }
  addOptBtn.onclick = () => addOptionInput();
  typeSelect.onchange = updateCorrectVisibility;
  optsWrap.appendChild(addOptBtn);

  const existingOptions = (existingActivity?.config.options as string[] | undefined) || [];
  if (existingOptions.length) {
    existingOptions.forEach((opt) => addOptionInput(opt));
    const correctIdx = existingActivity?.config.correctAnswer as number | undefined;
    if (typeof correctIdx === 'number' && optRows[correctIdx]) {
      optRows[correctIdx].correctRadio.checked = true;
    } else {
      optRows[0].correctRadio.checked = true;
    }
  } else {
    addOptionInput();
    addOptionInput();
    optRows[0].correctRadio.checked = true; // sensible default so quiz always has *a* correct answer
  }
  updateCorrectVisibility();
  panel.appendChild(optsWrap);

  const statusMsg = styledEl('div', { color: '#666', fontSize: '12px', marginBottom: '4px', minHeight: '14px' });
  panel.appendChild(statusMsg);

  const btnRow = styledEl('div', { display: 'flex', gap: '8px', marginTop: '8px' });
  const saveBtn = styledEl('button', {
    flex: '1',
    padding: '10px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  });
  saveBtn.textContent = 'Save';
  const cancelBtn = styledEl('button', {
    flex: '1',
    padding: '10px',
    background: '#eee',
    color: '#111',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  });
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => panel.remove();

  saveBtn.onclick = async () => {
    if (slideIndex < 0) {
      statusMsg.textContent = 'Could not detect the current slide - try clicking a slide first.';
      return;
    }
    saveBtn.disabled = true;
    statusMsg.textContent = 'Saving...';
    try {
      // Filter empty option rows first, then find the correct-answer index
      // against the FILTERED array, so it still points at the right option
      // even if an earlier (now-empty) row got dropped.
      const filledRows = optRows.filter((r) => r.input.value.trim());
      const options = filledRows.map((r) => r.input.value.trim());
      const correctAnswer = filledRows.findIndex((r) => r.correctRadio.checked);
      await saveActivity(
        presentationId,
        slideIndex,
        typeSelect.value,
        qInput.value,
        options,
        correctAnswer >= 0 ? correctAnswer : null
      );
      statusMsg.textContent = 'Saved!';
      setTimeout(() => panel.remove(), 600);
    } catch (err) {
      statusMsg.textContent = 'Error: ' + (err as Error).message;
      saveBtn.disabled = false;
    }
  };

  btnRow.appendChild(saveBtn);
  btnRow.appendChild(cancelBtn);
  panel.appendChild(btnRow);

  if (existingActivity) {
    const deleteBtn = styledEl('button', {
      width: '100%',
      padding: '8px',
      marginTop: '8px',
      background: 'transparent',
      color: '#ef4444',
      border: 'none',
      cursor: 'pointer',
      fontSize: '13px',
    });
    deleteBtn.textContent = 'Delete this activity';
    deleteBtn.onclick = async () => {
      deleteBtn.disabled = true;
      statusMsg.textContent = 'Deleting...';
      try {
        await deleteActivity(presentationId, slideIndex);
        panel.remove();
      } catch (err) {
        statusMsg.textContent = 'Error: ' + (err as Error).message;
        deleteBtn.disabled = false;
      }
    };
    panel.appendChild(deleteBtn);
  }

  document.body.appendChild(panel);
}

let initialized = false;

export function initActivityEditor(presentationId: string, getCurrentSlideIndex: () => number) {
  if (initialized) return;
  initialized = true;

  const btn = styledEl('button', {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '2147483647',
    padding: '12px 18px',
    fontSize: '15px',
    fontWeight: 'bold',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '24px',
    boxShadow: '0 2px 10px rgba(0,0,0,.3)',
    cursor: 'pointer',
  });
  btn.id = BUTTON_ID;
  btn.textContent = '+ Add Activity';
  btn.onclick = () => openPanel(presentationId, getCurrentSlideIndex());
  document.body.appendChild(btn);
}

/** Opens the editor for a specific slide index directly - used by the
 * clickable thumbnail badges, independent of whichever slide is currently
 * visible/selected in the editor. */
export function openActivityEditorForSlide(presentationId: string, slideIndex: number) {
  openPanel(presentationId, slideIndex);
}

export function destroyActivityEditor() {
  document.getElementById(BUTTON_ID)?.remove();
  document.getElementById(PANEL_ID)?.remove();
  initialized = false;
}
