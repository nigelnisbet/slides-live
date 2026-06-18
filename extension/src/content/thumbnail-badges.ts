/**
 * Color-coded activity badges on the Slides editor's filmstrip thumbnails.
 *
 * Each thumbnail's background group has a stable id of the form
 * "filmstrip-slide-{index}-...-bg" (discovered June 2026). We read the
 * presentation's activity config directly from Firebase (open read, no auth
 * needed) and overlay a small colored dot on any slide that has an activity.
 *
 * Note: Slides enforces a Trusted Types CSP, so all DOM updates here use
 * createElement/replaceChildren - never innerHTML.
 */
import { ref, onValue } from 'firebase/database';
import { database } from './firebase-client';

const ACTIVITY_COLORS: Record<string, string> = {
  poll: '#3b82f6',
  quiz: '#f59e0b',
  'word-cloud': '#8b5cf6',
  'text-response': '#8b5cf6',
  announcement: '#10b981',
};

const LAYER_ID = 'slideslive-badge-layer';

let activitiesByIndex: Record<number, string> = {};
let renderScheduled = false;
let onBadgeClick: ((slideIndex: number) => void) | null = null;

function ensureLayer(): HTMLDivElement {
  let layer = document.getElementById(LAYER_ID) as HTMLDivElement | null;
  if (!layer) {
    layer = document.createElement('div');
    layer.id = LAYER_ID;
    layer.style.position = 'fixed';
    layer.style.top = '0';
    layer.style.left = '0';
    layer.style.pointerEvents = 'none';
    layer.style.zIndex = '2147483647';
    document.body.appendChild(layer);
  }
  return layer;
}

function render() {
  const layer = ensureLayer();
  layer.replaceChildren();
  document.querySelectorAll('g[id^="filmstrip-slide-"][id$="-bg"]').forEach((el) => {
    const m = el.id.match(/^filmstrip-slide-(\d+)-/);
    if (!m) return;
    const idx = parseInt(m[1], 10);
    const type = activitiesByIndex[idx];
    if (!type) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return; // off-screen/virtualized thumbnail

    const dot = document.createElement('div');
    dot.style.position = 'fixed';
    dot.style.left = `${r.x + r.width - 14}px`;
    dot.style.top = `${r.y - 4}px`;
    dot.style.width = '16px';
    dot.style.height = '16px';
    dot.style.borderRadius = '50%';
    dot.style.background = ACTIVITY_COLORS[type] || '#999';
    dot.style.border = '2px solid white';
    dot.style.boxShadow = '0 1px 3px rgba(0,0,0,.4)';
    dot.title = `${type} - click to edit`;
    if (onBadgeClick) {
      // The layer itself stays pointer-events:none (so it doesn't block
      // clicking the actual thumbnail underneath) - only the dot itself is
      // clickable.
      dot.style.pointerEvents = 'auto';
      dot.style.cursor = 'pointer';
      dot.onclick = (e) => {
        e.stopPropagation();
        onBadgeClick?.(idx);
      };
    }
    layer.appendChild(dot);
  });
}

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    render();
  });
}

let initialized = false;

export function initThumbnailBadges(presentationId: string, onClick?: (slideIndex: number) => void) {
  if (initialized) return;
  initialized = true;
  onBadgeClick = onClick || null;

  const configRef = ref(database, `presentations/${presentationId}/config`);
  onValue(configRef, (snap) => {
    const config = snap.val();
    const activities = (config && config.activities) || [];
    const next: Record<number, string> = {};
    for (const a of activities) {
      if (a && a.slidePosition && typeof a.slidePosition.indexh === 'number') {
        next[a.slidePosition.indexh] = a.activityType;
      }
    }
    activitiesByIndex = next;
    scheduleRender();
  });

  window.addEventListener('scroll', scheduleRender, true);
  window.addEventListener('resize', scheduleRender);
  // Filmstrip can scroll internally without bubbling a window scroll event in
  // some Slides builds - cheap insurance, not just relying on the listeners above.
  setInterval(scheduleRender, 1000);
}
