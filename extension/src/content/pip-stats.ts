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

const CANVAS_SIZE = 500;
const COMPACT_THRESHOLD = 320; // px - below this, show the compact view

interface LiveState {
  participantCount: number;
  currentActivity: any | null;
  aggregatedResults: any | null;
}

const state: LiveState = { participantCount: 0, currentActivity: null, aggregatedResults: null };

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
  ctx.fillStyle = '#3b82f6';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('slidesLive', 16, 26);
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
  const y = compact ? 460 : 430;
  ctx.fillText(`${state.participantCount} connected`, CANVAS_SIZE / 2, y);
}

function drawCompact() {
  if (!ctx) return;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  drawBranding();

  const activity = state.currentActivity;
  if (showJoinPrompt(activity)) {
    drawJoinPrompt(true);
    return;
  }

  ctx.textAlign = 'center';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#111';
  ctx.fillText(String(activity.type).toUpperCase(), CANVAS_SIZE / 2, 180);

  const count = state.aggregatedResults?.totalResponses ?? 0;
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(String(count), CANVAS_SIZE / 2, 260);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText('answered', CANVAS_SIZE / 2, 300);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#999';
  ctx.fillText('(drag corner to expand)', CANVAS_SIZE / 2, 470);
}

function drawExpanded() {
  if (!ctx) return;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  drawBranding();

  const activity = state.currentActivity;
  if (showJoinPrompt(activity)) {
    drawJoinPrompt(false);
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
  ctx.fillText(`${total} response${total === 1 ? '' : 's'}`, 20, 88);

  const options: string[] = activity.options || [];
  const counts: number[] = state.aggregatedResults?.responses || [];
  const max = Math.max(1, ...counts, 0);
  const barColors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

  options.forEach((opt, i) => {
    const y = 130 + i * 70;
    if (y > CANVAS_SIZE - 40) return;
    ctx!.fillStyle = '#111';
    ctx!.font = '16px sans-serif';
    ctx!.fillText(`${opt}: ${counts[i] || 0}`, 20, y);
    const barW = (CANVAS_SIZE - 40) * ((counts[i] || 0) / max);
    ctx!.fillStyle = barColors[i % barColors.length];
    ctx!.fillRect(20, y + 10, Math.max(2, barW), 26);
  });
}

function draw() {
  if (!drawing) return;
  const width = pipWindow?.width || CANVAS_SIZE;
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
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  canvas.style.display = 'none';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');

  video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.style.display = 'none';
  document.body.appendChild(video);

  drawing = true;
  draw();

  const stream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(15);
  video.srcObject = stream;
  await video.play();

  // Doesn't remove the native timeline/CC/LIVE badge (that's fixed browser
  // chrome for any non-seekable PiP stream), but gives the overlay a proper
  // title instead of a generic/blank one - makes it read as intentional
  // branding rather than a stray video window.
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Live Stats',
      artist: 'slidesLive',
    });
  }

  pipWindow = await video.requestPictureInPicture();

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
  onValue(ref(database, `sessions/${sessionCode}/currentActivity`), (snap) => {
    state.currentActivity = snap.val();
  });
  onValue(ref(database, `sessions/${sessionCode}/aggregatedResults`), (snap) => {
    const all = snap.val() || {};
    const activityId = state.currentActivity?.activityId;
    state.aggregatedResults = activityId ? all[activityId] : null;
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

/** Default, always-visible button: creates a session and starts PiP in one click. */
export function initGoLiveButton(presentationId: string) {
  if (document.getElementById(GO_LIVE_BUTTON_ID) || document.getElementById(TRIGGER_BUTTON_ID)) return;

  const btn = makeButton(GO_LIVE_BUTTON_ID, '🔴 Go Live', { background: '#10b981', align: 'center' });
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = 'Going live...';
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CREATE_SESSION', presentationId });
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
