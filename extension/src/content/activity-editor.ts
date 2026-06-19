/**
 * On-slide "+ Add Activity" authoring panel.
 *
 * Lets a presenter add a poll/quiz/text-response/announcement to whichever
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

// "word-cloud" isn't a real implemented type (no attendee-side component
// exists for it yet) - don't offer it here until that exists, or this
// silently creates an activity nobody can answer.
const ACTIVITY_TYPES = ['poll', 'quiz', 'text-response', 'announcement'] as const;
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

interface SlideTextExtraction {
  title: string;
  bulletLines: string[];
}

/**
 * Pulls the visible title + bullet-list text directly off the currently
 * open slide, so a presenter who already typed a question into the title
 * box and answer options into a bulleted list doesn't have to retype them
 * into this panel.
 *
 * Discovered June 2026: each shape on the slide renders as
 * <g id="editor-{slideObjectId}_{shapeIndex}">, and each line/paragraph
 * within it as a child <g id="...-paragraph-{n}">, with the actual text
 * split word-by-word into <text>/<tspan> nodes inside that (for kerning,
 * not because lines are split further). Grouping fragments by
 * (shapeKey, paragraphIndex) and sorting by x reconstructs each line;
 * grouping lines by shapeKey and sorting by paragraphIndex reconstructs
 * each shape's full text. The topmost shape is treated as the title, the
 * next one down as the bullet list - this is a position-based heuristic
 * (no semantic "this is the title placeholder" attribute was found), so it
 * assumes a fairly normal title-above-body layout.
 */
function extractSlideTextContent(): SlideTextExtraction | null {
  // Skip the filmstrip rail by its actual measured right edge, not a guessed
  // fraction of window width - a fixed percentage cut into the real canvas
  // on typical screen widths and silently dropped the first word(s) of
  // titles that start close to the left edge.
  let minX = 0;
  document.querySelectorAll('g[id^="filmstrip-slide-"][id$="-bg"]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0) minX = Math.max(minX, r.x + r.width);
  });
  minX += 8; // small margin past the filmstrip edge

  interface Fragment {
    shapeKey: string;
    paragraphIndex: number;
    x: number;
    y: number;
    text: string;
  }
  const fragments: Fragment[] = [];

  // List-marker glyphs render as their own separate text fragment (not part
  // of the actual line content) - drop fragments that are purely one of
  // these, or every bullet line would come through as "● <text>".
  const BULLET_ONLY = /^[•●○◦▪▫▸▹‣∙·∘※]+$/;

  document.querySelectorAll('text, tspan').forEach((el) => {
    const text = el.textContent || '';
    if (!text.trim() || BULLET_ONLY.test(text.trim())) return;
    const r = el.getBoundingClientRect();
    if (r.x < minX || r.width === 0) return;

    let node: Element | null = el.parentElement;
    let shapeKey: string | null = null;
    let paragraphIndex = 0;
    for (let depth = 0; depth < 15 && node; depth++) {
      const id = node.getAttribute ? node.getAttribute('id') : null;
      if (id) {
        const m = id.match(/^editor-(.+?_\d+)-paragraph-(\d+)$/);
        if (m) {
          shapeKey = m[1];
          paragraphIndex = parseInt(m[2], 10);
          break;
        }
      }
      node = node.parentElement;
    }
    if (!shapeKey) return;

    fragments.push({ shapeKey, paragraphIndex, x: r.x, y: r.y, text });
  });

  if (!fragments.length) return null;

  const lineMap = new Map<string, { shapeKey: string; paragraphIndex: number; y: number; parts: Fragment[] }>();
  for (const f of fragments) {
    const key = `${f.shapeKey}::${f.paragraphIndex}`;
    if (!lineMap.has(key)) {
      lineMap.set(key, { shapeKey: f.shapeKey, paragraphIndex: f.paragraphIndex, y: f.y, parts: [] });
    }
    lineMap.get(key)!.parts.push(f);
  }

  const lines = Array.from(lineMap.values())
    .map((l) => ({
      shapeKey: l.shapeKey,
      paragraphIndex: l.paragraphIndex,
      y: Math.min(...l.parts.map((p) => p.y)),
      text: l.parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    }))
    .filter((l) => l.text);

  const shapeMap = new Map<string, { y: number; lines: string[] }>();
  for (const l of lines) {
    if (!shapeMap.has(l.shapeKey)) shapeMap.set(l.shapeKey, { y: l.y, lines: [] });
    const s = shapeMap.get(l.shapeKey)!;
    s.y = Math.min(s.y, l.y);
    s.lines[l.paragraphIndex] = l.text;
  }

  const shapes = Array.from(shapeMap.values())
    .map((s) => ({ y: s.y, lines: s.lines.filter(Boolean) }))
    .sort((a, b) => a.y - b.y);

  if (!shapes.length) return null;

  const title = shapes[0].lines.join(' ');
  const bulletLines = shapes.length > 1 ? shapes[1].lines : [];

  return { title, bulletLines };
}

interface ActivityConfigEntry {
  slidePosition: { indexh: number; indexv: number; timestamp: number; slideObjectId?: string };
  activityType: string;
  activityId: string;
  config: Record<string, unknown>;
}

// Extract the stable Google Slides object ID for a slide from the filmstrip DOM.
// The bg element id is "filmstrip-slide-{N}-{objectId}-bg" where N is 0-based index.
// This objectId is stable across slide insertions/deletions/reorders, unlike the index.
function getFilmstripObjectId(slideIndex: number): string | null {
  // Use DOM order (querySelectorAll index), not the numeric prefix in the ID.
  const bgs = document.querySelectorAll('g[id^="filmstrip-slide-"][id$="-bg"]');
  const el = bgs[slideIndex];
  if (!el) return null;
  const m = el.id.match(/^filmstrip-slide-\d+-(.+)-bg$/);
  return m ? m[1] : null;
}

// Build a map of slideObjectId → current slide index from the live filmstrip DOM.
function buildObjectIdIndexMap(): Map<string, number> {
  const map = new Map<string, number>();
  // Use DOM order (forEach index) not the numeric prefix in the element ID —
  // the prefix may not update immediately when slides are inserted/reordered.
  document.querySelectorAll('g[id^="filmstrip-slide-"][id$="-bg"]').forEach((el, domIndex) => {
    const m = el.id.match(/^filmstrip-slide-\d+-(.+)-bg$/);
    if (m) map.set(m[1], domIndex);
  });
  return map;
}

// Re-index all activities whose slide was moved, and remove any whose slide was
// deleted. Runs after filmstrip mutations. Badge refresh is automatic because
// thumbnail-badges.ts has a Firebase onValue listener on the same config path.
export async function syncActivityPositions(presentationId: string): Promise<void> {
  const objectIdMap = buildObjectIdIndexMap();
  if (objectIdMap.size === 0) return; // filmstrip not loaded yet

  const configRef = ref(database, `presentations/${presentationId}/config`);
  const snap = await get(configRef);
  if (!snap.exists()) return;

  const existing = snap.val();
  const activities: ActivityConfigEntry[] = existing.activities || [];
  let changed = false;

  const updated = activities
    .map(activity => {
      const slideObjectId = activity.slidePosition?.slideObjectId;
      if (!slideObjectId) return activity; // pre-fix activity without objectId — leave alone

      const newIndex = objectIdMap.get(slideObjectId);
      if (newIndex === undefined) {
        // The slide this activity was on has been deleted — remove the activity
        changed = true;
        return null;
      }
      if (newIndex === activity.slidePosition.indexh) return activity; // no change needed
      changed = true;
      return { ...activity, slidePosition: { ...activity.slidePosition, indexh: newIndex } };
    })
    .filter((a): a is ActivityConfigEntry => a !== null);

  if (changed) {
    await set(configRef, { ...existing, activities: updated, updatedAt: Date.now() });
  }
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
  } else if (type === 'text-response') {
    config = { type, activityId, prompt: question, maxLength: 500 };
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
    slidePosition: {
      indexh: slideIndex,
      indexv: 0,
      timestamp: Date.now(),
      slideObjectId: getFilmstripObjectId(slideIndex) ?? undefined,
    },
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

  // Wired up further down (once qInput/optRows/etc exist) - created here so
  // it sits at the top of the panel, above the fields it fills in.
  const importBtn = styledEl('button', {
    width: '100%',
    padding: '8px',
    marginBottom: '10px',
    background: '#eff6ff',
    color: '#3b82f6',
    border: '1px dashed #93c5fd',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  });
  importBtn.textContent = '📥 Import title + bullets from this slide';
  panel.appendChild(importBtn);
  const importStatus = styledEl('div', { color: '#666', fontSize: '11px', marginBottom: '10px', minHeight: '12px' });
  panel.appendChild(importStatus);

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
  panel.appendChild(qLabel);

  const qInput = styledEl('input', {
    width: '100%',
    marginBottom: '10px',
    padding: '6px',
    boxSizing: 'border-box',
  }) as HTMLInputElement;
  qInput.type = 'text';
  qInput.value = existingActivity
    ? String(
        existingActivity.config.question ?? existingActivity.config.prompt ?? existingActivity.config.message ?? ''
      )
    : '';
  panel.appendChild(qInput);

  const QUESTION_LABELS: Record<string, { label: string; placeholder: string }> = {
    poll: { label: 'Question', placeholder: "e.g. What's your favorite color?" },
    quiz: { label: 'Question', placeholder: "e.g. What's the capital of France?" },
    'text-response': { label: 'Prompt', placeholder: 'e.g. What questions do you have so far?' },
    announcement: { label: 'Message', placeholder: 'e.g. Welcome! Grab a coffee, we start in 5 minutes.' },
  };
  function updateQuestionLabel() {
    const info = QUESTION_LABELS[typeSelect.value] || QUESTION_LABELS.poll;
    qLabel.textContent = info.label;
    qInput.placeholder = info.placeholder;
  }

  const optsWrap = styledEl('div', { marginBottom: '10px' });
  const optsLabel = styledEl('div', { marginBottom: '4px' });
  optsLabel.textContent = 'Options';
  optsWrap.appendChild(optsLabel);
  const correctHint = styledEl('div', { color: '#666', fontSize: '11px', marginBottom: '6px', display: 'none' });
  correctHint.textContent = 'Select the radio next to the correct answer';
  optsWrap.appendChild(correctHint);

  const optRows: { input: HTMLInputElement; correctRadio: HTMLInputElement; row: HTMLDivElement }[] = [];
  const addOptBtn = styledEl('button', { fontSize: '12px', padding: '4px 8px', marginBottom: '4px' });
  addOptBtn.textContent = '+ option';

  function updateCorrectVisibility() {
    const isQuiz = typeSelect.value === 'quiz';
    const needsOptions = typeSelect.value === 'poll' || isQuiz;
    optsWrap.style.display = needsOptions ? 'block' : 'none';
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
  typeSelect.onchange = () => {
    updateCorrectVisibility();
    updateQuestionLabel();
  };
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
  updateQuestionLabel();
  panel.appendChild(optsWrap);

  function setOptionLines(lines: string[]) {
    // Remove existing option rows entirely rather than overwriting values
    // in place, since imported bullet counts rarely match whatever was
    // there before (defaults to 2 blank rows).
    optRows.splice(0).forEach((r) => r.row.remove());
    const toAdd = lines.length ? lines : ['', ''];
    toAdd.forEach((line) => addOptionInput(line));
    optRows[0].correctRadio.checked = true;
    updateCorrectVisibility();
  }

  importBtn.onclick = () => {
    const extracted = extractSlideTextContent();
    if (!extracted || !extracted.title) {
      importStatus.textContent = "Couldn't find readable title/bullet text on this slide.";
      return;
    }
    qInput.value = extracted.title;
    if (extracted.bulletLines.length) {
      setOptionLines(extracted.bulletLines);
      importStatus.textContent = `Imported title + ${extracted.bulletLines.length} bullet line${extracted.bulletLines.length === 1 ? '' : 's'}.`;
    } else {
      importStatus.textContent = 'Imported title (no bullet list found on this slide).';
    }
  };

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
