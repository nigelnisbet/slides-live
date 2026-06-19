/**
 * Floating "live stats" window via classic <video> Picture-in-Picture.
 *
 * Validated June 2026: this is the only mechanism that survives Google
 * Slides' real Present-mode fullscreen (the newer Document PiP API kicks
 * the page out of fullscreen - a dealbreaker). It persists across slide
 * navigation, is resize-aware (compact "X answered" vs an expanded results
 * view), and is freely draggable.
 *
 * Critical gotcha: the PiP pipeline must be started BEFORE Present is
 * clicked. Starting it while already fullscreen doesn't get composited
 * above the fullscreen layer until a fullscreen toggle forces a re-layer.
 * That's why this is wired to in-page buttons clicked from the editor, not
 * to anything inside Present mode itself.
 *
 * Two entry points:
 * - initGoLiveButton(): the default, always-visible "Go Live" button that
 *   creates a session AND starts PiP in one click - the primary UX.
 * - showStartPipButton(): a fallback for when a session is *already*
 *   active (e.g. page reload mid-session) - PiP still needs a fresh click
 *   to satisfy the user-activation requirement, but there's no session to
 *   create this time.
 */
import { ref, onValue } from 'firebase/database';
import { database } from './firebase-client';

const CANVAS_SIZE = 500; // logical drawing units (0–500 coordinate space)
const SCALE = 4;         // render at 4× density for crispness - applied as
                         // ctx.scale(SCALE,SCALE) once so ALL draw functions
                         // use the 0–CANVAS_SIZE space unchanged.
                         // Main cost is video encoding (captureStream), not
                         // canvas drawing - bump back to SCALE=2 and fps=15
                         // if encoding overhead becomes noticeable, or if
                         // we add animations (word cloud etc) that need
                         // higher throughput.
const COMPACT_THRESHOLD = 320; // CSS px of the PiP window (not canvas pixels)

interface LiveState {
  participantCount: number;
  currentActivity: any | null;
  aggregatedResults: any | null;
  // text-response answers are plain strings, which the existing
  // aggregation logic (FirebaseContext.tsx's incrementResponseArray) only
  // knows how to bucket for array/number answers (poll/quiz shapes) - for
  // strings it silently no-ops, so the actual text never reaches
  // aggregatedResults. Read the raw per-participant responses instead.
  textResponses: string[];
}

const state: LiveState = {
  participantCount: 0,
  currentActivity: null,
  aggregatedResults: null,
  textResponses: [],
};

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let video: HTMLVideoElement | null = null;
let pipWindow: PictureInPictureWindow | null = null;
let drawing = false;
let qrImage: HTMLImageElement | null = null;
let joinCode = '';
let activeQrCodeUrl: string | undefined;
let endingIntentionally = false;

function drawBranding() {
  if (!ctx) return;
  // Two-tone wordmark centred along the bottom - call this LAST in each
  // draw function so it sits on top of all other content.
  ctx.save();
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'left';
  const slidesW = ctx.measureText('slides').width;
  const liveW = ctx.measureText('Live').width;
  const startX = (CANVAS_SIZE - slidesW - liveW) / 2;
  const y = CANVAS_SIZE - 14;
  ctx.fillStyle = '#374151';
  ctx.fillText('slides', startX, y);
  ctx.fillStyle = '#3b82f6';
  ctx.fillText('Live', startX + slidesW, y);
  ctx.restore();
}

// Announcements are presenter-broadcast text with no audience response to
// aggregate, so there's nothing to show stats for - keep the QR/join view
// up rather than switching to an empty-looking "0 answered" screen.
function showJoinPrompt(activity: any): boolean {
  return !activity || activity.type === 'announcement';
}

// Shown whenever there's no live activity (or an announcement) - the
// QR/join code is what matters most here, since this is what people see
// while waiting to join.
function drawJoinPrompt(compact: boolean) {
  if (!ctx) return;
  ctx.textAlign = 'center';
  ctx.font = compact ? 'bold 18px sans-serif' : 'bold 22px sans-serif';
  ctx.fillStyle = '#111';
  ctx.fillText('Join at slides-live.com', CANVAS_SIZE / 2, compact ? 60 : 70);

  ctx.font = 'bold 32px monospace';
  ctx.fillStyle = '#3b82f6';
  ctx.fillText(joinCode, CANVAS_SIZE / 2, compact ? 96 : 110);

  if (qrImage && qrImage.complete && qrImage.naturalWidth > 0) {
    const size = compact ? 220 : 260;
    const x = (CANVAS_SIZE - size) / 2;
    const y = compact ? 120 : 140;
    ctx.drawImage(qrImage, x, y, size, size);
  }

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#666';
  const y = compact ? 438 : 415;
  ctx.fillText(`${state.participantCount} connected`, CANVAS_SIZE / 2, y);
}

// inward=false → right triangle, apex at corner pointing outward (expand)
// inward=true  → right triangle, apex pointing toward centre (shrink)
// Both triangles use the same three points of a PAD×ARM rectangle at each
// corner - just opposite diagonals, so the shape is identical but flipped.
function drawExpandHint(inward = false) {
  if (!ctx) return;
  ctx.save();
  ctx.fillStyle = '#3b82f6';
  const ARM = 36;
  // Expand (outward): triangles sit just inside the corner so the apex
  // is visible pointing toward the edge.
  // Shrink (inward): negative PAD pushes the base vertices off-canvas -
  // they clip at the window edge, making it obvious you drag from the very
  // edge itself, with the apex pointing inward toward centre.
  const PAD = inward ? -3 : 6;
  const corners: [number, number, number, number][] = [
    [PAD,               PAD,               1,  1],
    [CANVAS_SIZE - PAD, PAD,              -1,  1],
    [PAD,               CANVAS_SIZE - PAD,  1, -1],
    [CANVAS_SIZE - PAD, CANVAS_SIZE - PAD, -1, -1],
  ];
  corners.forEach(([ax, ay, idx, idy]) => {
    ctx!.beginPath();
    if (!inward) {
      // Apex at (ax,ay) = the corner → points outward
      ctx!.moveTo(ax, ay);
      ctx!.lineTo(ax + idx * ARM, ay);
      ctx!.lineTo(ax, ay + idy * ARM);
    } else {
      // Apex at (ax+idx*ARM, ay+idy*ARM) = inner point → points toward centre
      ctx!.moveTo(ax + idx * ARM, ay);
      ctx!.lineTo(ax, ay + idy * ARM);
      ctx!.lineTo(ax + idx * ARM, ay + idy * ARM);
    }
    ctx!.closePath();
    ctx!.fill();
  });
  ctx.restore();
}

function drawCompact() {
  if (!ctx) return;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.textAlign = 'center';
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('drag to expand', CANVAS_SIZE / 2, 30);

  const activity = state.currentActivity;
  if (showJoinPrompt(activity)) {
    drawJoinPrompt(true);
    drawExpandHint(false);
    drawBranding();
    return;
  }

  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#111';
  ctx.fillText(String(activity.type).toUpperCase(), CANVAS_SIZE / 2, 200);

  const count = state.aggregatedResults?.totalResponses ?? 0;
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(String(count), CANVAS_SIZE / 2, 295);

  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText('answered', CANVAS_SIZE / 2, 335);

  // outward-pointing triangles at corners = drag corner outward to expand
  drawExpandHint(false);
  drawBranding();
}

function drawExpanded() {
  if (!ctx) return;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.textAlign = 'center';
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('drag to shrink', CANVAS_SIZE / 2, 30);

  const activity = state.currentActivity;
  if (showJoinPrompt(activity)) {
    drawJoinPrompt(false);
    drawExpandHint(true);
    drawBranding();
    return;
  }

  ctx.textAlign = 'left';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#111';
  const prompt = activity.question || activity.message || activity.type;
  ctx.fillText(String(prompt), 20, 60);

  const total = state.aggregatedResults?.totalResponses ?? 0;
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText(`${total} response${total === 1 ? '' : 's'}`, 20, 78);

  if (activity.type === 'text-response') {
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#111';
    const lineHeight = 26;
    let y = 120;
    // newest first, most relevant to a presenter glancing live
    const all = state.textResponses;
    const recent = all.slice(-6).reverse();
    for (const response of recent) {
      if (y > CANVAS_SIZE - 55) break;
      const text = response.length > 60 ? response.slice(0, 57) + '...' : response;
      ctx.fillText(`"${text}"`, 20, y);
      y += lineHeight;
    }
    if (!recent.length) {
      ctx.fillStyle = '#999';
      ctx.fillText('Waiting for responses...', 20, y);
    } else if (all.length > 6) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '13px sans-serif';
      ctx.fillText(`+ ${all.length - 6} more`, 20, CANVAS_SIZE - 55);
    }
    drawExpandHint(true);
    drawBranding();
    return;
  }

  const options: string[] = activity.options || [];
  const counts: number[] = state.aggregatedResults?.responses || [];
  const max = Math.max(1, ...counts, 0);
  const barColors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

  options.forEach((opt, i) => {
    const y = 115 + i * 70;
    if (y > CANVAS_SIZE - 55) return;
    ctx!.fillStyle = '#111';
    ctx!.font = '16px sans-serif';
    ctx!.fillText(`${opt}: ${counts[i] || 0}`, 20, y);
    const barW = (CANVAS_SIZE - 40) * ((counts[i] || 0) / max);
    ctx!.fillStyle = barColors[i % barColors.length];
    ctx!.fillRect(20, y + 10, Math.max(2, barW), 26);
  });

  drawExpandHint(true); // inward-pointing triangles = drag corner inward to shrink
  drawBranding();
}

let _loggedMode = false;
function draw() {
  if (!drawing) return;
  const width = pipWindow?.width || CANVAS_SIZE;
  if (!_loggedMode && pipWindow) {
    console.log('[SlidesLive PiP] pipWindow.width:', width, '— mode:', width < COMPACT_THRESHOLD ? 'COMPACT' : 'EXPANDED');
    _loggedMode = true;
  }
  if (width < COMPACT_THRESHOLD) drawCompact();
  else drawExpanded();
  requestAnimationFrame(draw);
}

export function isPipActive(): boolean {
  return drawing;
}

export async function startPipStats(sessionCode: string, qrCodeUrl?: string): Promise<void> {
  if (drawing) return;

  joinCode = sessionCode;
  activeQrCodeUrl = qrCodeUrl;
  endingIntentionally = false;
  if (qrCodeUrl) {
    qrImage = new Image();
    // Without this, drawing a cross-origin image onto the canvas taints it,
    // and captureStream() renders the tainted region as a corrupted/blocked
    // gray placeholder instead of the actual image. api.qrserver.com sends
    // Access-Control-Allow-Origin: *, so a proper CORS-checked load avoids
    // the taint entirely.
    qrImage.crossOrigin = 'anonymous';
    qrImage.onerror = () => console.warn('[SlidesLive] QR image failed to load:', qrCodeUrl);
    qrImage.src = qrCodeUrl;
  }

  canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE * SCALE;   // physical pixel buffer at 4× density
  canvas.height = CANVAS_SIZE * SCALE;
  canvas.style.display = 'none';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  // Scale the context once so ALL draw calls use the 0–CANVAS_SIZE
  // logical space unchanged. Setting canvas.width/height resets any
  // existing transform, so this must come AFTER the size assignment.
  ctx?.scale(SCALE, SCALE);

  video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.style.display = 'none';
  document.body.appendChild(video);

  drawing = true;
  draw();

  const stream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
  video.srcObject = stream;
  await video.play();

  pipWindow = await (video as any).requestPictureInPicture({ width: 260 });

  video.addEventListener('leavepictureinpicture', () => {
    pipWindow = null;
    drawing = false;
    // The presenter closed the floating window (native close/back-to-tab
    // button) without ending the session - the session is still live, so
    // offer a way to reopen it instead of leaving them stuck until a page
    // refresh. Skipped when *we* triggered the close via End Session.
    if (!endingIntentionally) {
      showStartPipButton(sessionCode, activeQrCodeUrl);
    }
  });

  // A window.focus()-on-resize fix was tried here and reverted: it broke
  // slide clicks/navigation in the Slides editor, almost certainly because
  // PictureInPictureWindow's 'resize' event fires far more often than just
  // "drag finished" (e.g. on every micro-adjustment), so repeatedly forcing
  // focus fought with Slides' own click handling. A debounced version
  // (only focus once resize events stop firing for ~300ms) is worth
  // retrying, but isn't implemented yet.

  // Live data feed - direct Firebase reads, sessions/$code is open-read so
  // no auth needed here.
  onValue(ref(database, `sessions/${sessionCode}/participants`), (snap) => {
    const participants = snap.val();
    state.participantCount = participants
      ? Object.values(participants).filter((p: any) => p?.isActive).length
      : 0;
  });

  // aggregatedResults/responses are scoped to whichever activityId is
  // current, re-subscribed fresh every time the activity actually changes
  // (not just whenever those paths happen to update on their own). Without
  // this, switching activities left the PREVIOUS activity's results on
  // screen until someone happened to submit a new response - nothing
  // forced a re-read for the new activity in the meantime.
  let lastActivityId: string | null = null;
  let unsubscribeAggregated: (() => void) | null = null;
  let unsubscribeResponses: (() => void) | null = null;

  onValue(ref(database, `sessions/${sessionCode}/currentActivity`), (snap) => {
    state.currentActivity = snap.val();
    const activityId = state.currentActivity?.activityId ?? null;
    if (activityId === lastActivityId) return;
    lastActivityId = activityId;

    unsubscribeAggregated?.();
    unsubscribeResponses?.();
    state.aggregatedResults = null;
    state.textResponses = [];
    if (!activityId) return;

    unsubscribeAggregated = onValue(ref(database, `sessions/${sessionCode}/aggregatedResults/${activityId}`), (s) => {
      state.aggregatedResults = s.val();
    });
    unsubscribeResponses = onValue(ref(database, `sessions/${sessionCode}/responses/${activityId}`), (s) => {
      const forActivity = s.val();
      state.textResponses = forActivity
        ? (Object.values(forActivity) as any[])
            .map((r) => r?.answer)
            .filter((a): a is string => typeof a === 'string')
        : [];
    });
  });
}

function makeButton(
  id: string,
  label: string,
  options: { background?: string; align?: 'left' | 'center' } = {}
): HTMLButtonElement {
  const { background = '#ef4444', align = 'left' } = options;
  const btn = document.createElement('button');
  btn.id = id;
  btn.textContent = label;
  btn.style.position = 'fixed';
  btn.style.bottom = '24px';
  if (align === 'center') {
    btn.style.left = '50%';
    btn.style.transform = 'translateX(-50%)';
  } else {
    btn.style.left = '24px';
  }
  btn.style.zIndex = '2147483647';
  btn.style.padding = '12px 18px';
  btn.style.fontSize = '14px';
  btn.style.fontWeight = 'bold';
  btn.style.background = background;
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.borderRadius = '24px';
  btn.style.boxShadow = '0 2px 10px rgba(0,0,0,.3)';
  btn.style.cursor = 'pointer';
  return btn;
}

const GO_LIVE_BUTTON_ID = 'slideslive-go-live-btn';
const TRIGGER_BUTTON_ID = 'slideslive-start-pip-btn';
const END_SESSION_BUTTON_ID = 'slideslive-end-session-btn';

// Tried auto-clicking Slides' own "Start slideshow" button
// (#punch-start-presentation-left) right after PiP starts, to save the
// presenter a second click. Confirmed (live test, June 2026) that it
// doesn't work: by the time we get there we're a couple of awaits removed
// from the original click, so the browser's user-activation window for
// the Fullscreen API has already expired, and Slides' own click handler
// silently can't get fullscreen permission. No clean way around this
// without breaking the "PiP must start before fullscreen" ordering that
// already matters - not re-attempting.

/** Default, always-visible button: creates a session and starts PiP in one click. */
export function initGoLiveButton(presentationId: string, getCurrentSlideIndex: () => number) {
  if (document.getElementById(GO_LIVE_BUTTON_ID) || document.getElementById(TRIGGER_BUTTON_ID)) return;

  const btn = makeButton(GO_LIVE_BUTTON_ID, '🔴 Go Live', { background: '#10b981', align: 'center' });
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = 'Going live...';
    try {
      // Without passing the current slide along, the session always starts
      // as if slide 1 were showing - an attendee joining while the
      // presenter is already on, say, slide 3 would see "connected"
      // instead of slide 3's activity until the next slide change.
      const slideIndex = getCurrentSlideIndex();
      const response = await chrome.runtime.sendMessage({ type: 'CREATE_SESSION', presentationId, slideIndex });
      if (!response?.success) throw new Error(response?.error || 'Failed to create session');
      await startPipStats(response.sessionCode, response.qrCode);
      btn.remove();
      showEndSessionButton(response.sessionCode);
    } catch (err) {
      console.warn('[SlidesLive] Go Live failed:', (err as Error).message);
      btn.textContent = '🔴 Go Live (retry)';
      btn.disabled = false;
    }
  };
  document.body.appendChild(btn);
}

export function removeGoLiveButton() {
  document.getElementById(GO_LIVE_BUTTON_ID)?.remove();
}

/** Fallback for when a session is already active (e.g. page reload, or the
 * floating window was closed) - PiP still needs a fresh click. */
export function showStartPipButton(sessionCode: string, qrCodeUrl?: string) {
  removeGoLiveButton();
  showEndSessionButton(sessionCode);
  if (document.getElementById(TRIGGER_BUTTON_ID)) return;

  const btn = makeButton(TRIGGER_BUTTON_ID, '📊 Start Floating Stats', { background: '#10b981', align: 'center' });
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = 'Starting...';
    try {
      await startPipStats(sessionCode, qrCodeUrl);
      btn.remove();
    } catch (err) {
      btn.textContent = '📊 Start Floating Stats (retry)';
      btn.disabled = false;
      console.warn('[SlidesLive] PiP failed to start:', (err as Error).message);
    }
  };
  document.body.appendChild(btn);
}

export function hideStartPipButton() {
  document.getElementById(TRIGGER_BUTTON_ID)?.remove();
}

/** Persistent control while a session is live - shown regardless of whether
 * the floating window itself is currently open, so the extension popup
 * never needs to be touched for the core flow. */
export function showEndSessionButton(_sessionCode: string) {
  if (document.getElementById(END_SESSION_BUTTON_ID)) return;
  const btn = makeButton(END_SESSION_BUTTON_ID, '⏹ End Session', { background: '#ef4444', align: 'left' });
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = 'Ending...';
    endingIntentionally = true;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      await chrome.runtime.sendMessage({ type: 'END_SESSION' });
      // The background broadcasts SESSION_ENDED back to this tab, which is
      // what actually resets the Go Live / Start Floating Stats buttons -
      // see content-script.ts's message listener.
      btn.remove();
    } catch (err) {
      console.warn('[SlidesLive] End Session failed:', (err as Error).message);
      btn.textContent = '⏹ End Session (retry)';
      btn.disabled = false;
      endingIntentionally = false;
    }
  };
  document.body.appendChild(btn);
}

export function hideEndSessionButton() {
  document.getElementById(END_SESSION_BUTTON_ID)?.remove();
}
