/**
 * Color-coded activity badges on the Slides editor's filmstrip thumbnails.
 *
 * Each thumbnail's background group has a stable id of the form
 * "filmstrip-slide-{index}-...-bg" (discovered June 2026). We read the
 * presentation's activity config directly from Firebase (open read, no auth
 * needed) and overlay a small colored label (POLL/QUIZ/TEXT/MSSG) on any
 * slide that has an activity.
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

const ACTIVITY_LABELS: Record<string, string> = {
  poll: 'POLL',
  quiz: 'QUIZ',
  'word-cloud': 'CLOUD',
  'text-response': 'TEXT',
  announcement: 'MSSG',
};

const BADGE_WIDTH = 42;
const BADGE_HEIGHT = 16;

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
  // Use DOM order (forEach index) not the numeric prefix in the element ID.
  // When Google Slides inserts a slide it may assign the same numeric prefix
  // to the new element before renumbering others, causing duplicate badges.
  // DOM order always reflects current visual slide order immediately.
  document.querySelectorAll('g[id^="filmstrip-slide-"][id$="-bg"]').forEach((el, domIndex) => {
    const type = activitiesByIndex[domIndex];
    if (!type) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return; // off-screen/virtualized thumbnail

    const badge = document.createElement('div');
    badge.style.position = 'fixed';
    badge.style.left = `${r.x + r.width - BADGE_WIDTH + 2}px`;
    badge.style.top = `${r.y - 4}px`;
    badge.style.width = `${BADGE_WIDTH}px`;
    badge.style.height = `${BADGE_HEIGHT}px`;
    badge.style.borderRadius = '4px';
    badge.style.background = ACTIVITY_COLORS[type] || '#999';
    badge.style.border = '1.5px solid white';
    badge.style.boxShadow = '0 1px 3px rgba(0,0,0,.4)';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.color = '#fff';
    badge.style.fontFamily = 'sans-serif';
    badge.style.fontSize = '9px';
    badge.style.fontWeight = 'bold';
    badge.style.letterSpacing = '0.3px';
    badge.style.lineHeight = '1';
    badge.textContent = ACTIVITY_LABELS[type] || type.slice(0, 4).toUpperCase();
    badge.title = `${type} - click to edit`;
    if (onBadgeClick) {
      // The layer itself stays pointer-events:none (so it doesn't block
      // clicking the actual thumbnail underneath) - only the badge itself is
      // clickable.
      badge.style.pointerEvents = 'auto';
      badge.style.cursor = 'pointer';
      badge.onclick = (e) => {
        e.stopPropagation();
        onBadgeClick?.(domIndex);
      };
    }
    layer.appendChild(badge);
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
