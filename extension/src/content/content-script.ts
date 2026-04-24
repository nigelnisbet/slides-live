/**
 * Content script for Google Slides
 *
 * Detects slide changes in Google Slides presentations.
 * Works in edit mode by watching the filmstrip.
 */

interface SlideInfo {
  slideIndex: number;
  slideId: string | null;
  presentationId: string;
  isPresenting: boolean;
}

let lastReportedIndex = -1;
let pollInterval: number | null = null;
let lastUrl = '';

// Extract presentation ID from URL
function getPresentationId(): string | null {
  const match = window.location.pathname.match(/\/presentation\/d\/([^\/]+)/);
  return match ? match[1] : null;
}

// Check if in presentation mode
function isInPresentationMode(): boolean {
  return window.location.pathname.includes('/present') ||
         window.location.href.includes('localpresent');
}

// Get slide ID from URL (hash or query param)
function getSlideIdFromUrl(): string | null {
  // Try hash first
  const hashMatch = window.location.hash.match(/slide=id\.([a-zA-Z0-9_-]+)/);
  if (hashMatch) {
    return hashMatch[1];
  }

  // Try query param
  const url = new URL(window.location.href);
  const slideParam = url.searchParams.get('slide');
  if (slideParam) {
    const match = slideParam.match(/id\.([a-zA-Z0-9_-]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Get slide index from filmstrip by finding selected thumbnail
function getSlideIndexFromFilmstrip(): number {
  // Try multiple selectors for filmstrip thumbnails
  const selectors = [
    '.punch-filmstrip-thumbnail[aria-selected="true"]',
    '.punch-filmstrip-thumbnail.punch-filmstrip-thumbnail-selected',
    '[data-slide-id][aria-selected="true"]',
    '.punch-filmstrip .punch-filmstrip-thumbnail[tabindex="0"]',
  ];

  for (const selector of selectors) {
    const selected = document.querySelector(selector);
    if (selected) {
      // Find all thumbnails and get index
      const allThumbnails = document.querySelectorAll('.punch-filmstrip-thumbnail');
      const index = Array.from(allThumbnails).indexOf(selected);
      if (index >= 0) {
        console.log('[Google Slides Extension] Found selected via:', selector, 'index:', index);
        return index;
      }
    }
  }

  // Alternative: look for focused/active thumbnail
  const filmstrip = document.querySelector('.punch-filmstrip');
  if (filmstrip) {
    const thumbnails = filmstrip.querySelectorAll('.punch-filmstrip-thumbnail');
    console.log('[Google Slides Extension] Found', thumbnails.length, 'thumbnails in filmstrip');

    for (let i = 0; i < thumbnails.length; i++) {
      const thumb = thumbnails[i] as HTMLElement;
      const ariaSelected = thumb.getAttribute('aria-selected');
      const classList = Array.from(thumb.classList);

      // Check various indicators of selection
      if (ariaSelected === 'true' ||
          classList.some(c => c.includes('selected')) ||
          thumb.matches(':focus') ||
          thumb.querySelector('.punch-filmstrip-thumbnail-border-highlight')) {
        console.log('[Google Slides Extension] Found selected thumbnail at index:', i);
        return i;
      }
    }
  }

  return -1;
}

// Build a map of slide IDs to indices from the filmstrip
function buildSlideIdMap(): Map<string, number> {
  const map = new Map<string, number>();
  const thumbnails = document.querySelectorAll('.punch-filmstrip-thumbnail');

  thumbnails.forEach((thumb, index) => {
    // Try to get slide ID from various attributes
    const slideId = thumb.getAttribute('data-slide-id') ||
                    thumb.getAttribute('data-id') ||
                    thumb.getAttribute('aria-label')?.match(/slide\s*(\S+)/i)?.[1];

    if (slideId) {
      map.set(slideId, index);
    }
  });

  return map;
}

// Try to find slide index by matching URL slide ID with filmstrip
function getSlideIndexByUrlId(): number {
  const urlSlideId = getSlideIdFromUrl();
  if (!urlSlideId) return -1;

  // Special case: "p" alone means first slide
  if (urlSlideId === 'p') {
    return 0;
  }

  // Try to match against filmstrip thumbnails
  const thumbnails = document.querySelectorAll('.punch-filmstrip-thumbnail');

  for (let i = 0; i < thumbnails.length; i++) {
    const thumb = thumbnails[i];
    const html = thumb.outerHTML;
    // Check if this thumbnail's HTML contains the slide ID
    if (html.includes(urlSlideId)) {
      console.log('[Google Slides Extension] Matched URL slide ID to thumbnail:', i);
      return i;
    }
  }

  return -1;
}

// Main detection function
function detectCurrentSlideIndex(): number {
  // Method 1: Direct filmstrip selection (most reliable)
  let index = getSlideIndexFromFilmstrip();
  if (index >= 0) {
    return index;
  }

  // Method 2: Match URL slide ID to filmstrip
  index = getSlideIndexByUrlId();
  if (index >= 0) {
    return index;
  }

  // Method 3: Parse "p" format slide IDs
  const slideId = getSlideIdFromUrl();
  if (slideId === 'p') {
    return 0;
  }
  if (slideId) {
    const pMatch = slideId.match(/^p(\d+)$/);
    if (pMatch) {
      return parseInt(pMatch[1], 10);
    }
  }

  console.log('[Google Slides Extension] Could not detect slide index');
  return 0;
}

// Get total slide count
function getTotalSlides(): number {
  return document.querySelectorAll('.punch-filmstrip-thumbnail').length;
}

// Detect current slide
function detectCurrentSlide(): SlideInfo | null {
  const presentationId = getPresentationId();
  if (!presentationId) return null;

  const isPresenting = isInPresentationMode();
  const slideIndex = detectCurrentSlideIndex();
  const slideId = getSlideIdFromUrl();

  return {
    slideIndex,
    slideId,
    presentationId,
    isPresenting,
  };
}

// Report slide change to background script
function reportSlideChange(slideInfo: SlideInfo) {
  if (slideInfo.slideIndex === lastReportedIndex) return;

  console.log('[Google Slides Extension] === SLIDE CHANGE ===');
  console.log('[Google Slides Extension] Slide:', slideInfo.slideIndex + 1, '(0-indexed:', slideInfo.slideIndex, ')');
  console.log('[Google Slides Extension] Slide ID:', slideInfo.slideId);

  lastReportedIndex = slideInfo.slideIndex;

  chrome.runtime.sendMessage({
    type: 'SLIDE_CHANGED',
    data: {
      presentationId: slideInfo.presentationId,
      slideIndex: slideInfo.slideIndex,
      slideId: slideInfo.slideId,
      isPresenting: slideInfo.isPresenting,
      indexh: slideInfo.slideIndex,
      indexv: 0,
    },
  }).catch(err => {
    console.log('[Google Slides Extension] Message error:', err.message);
  });
}

// Check for changes
function checkForChanges() {
  const currentUrl = window.location.href;
  const urlChanged = currentUrl !== lastUrl;

  if (urlChanged) {
    lastUrl = currentUrl;
    console.log('[Google Slides Extension] URL changed');
  }

  const slideInfo = detectCurrentSlide();
  if (slideInfo && slideInfo.slideIndex !== lastReportedIndex) {
    reportSlideChange(slideInfo);
  }
}

// Poll for changes
function startPolling() {
  if (pollInterval) return;

  lastUrl = window.location.href;

  pollInterval = window.setInterval(checkForChanges, 500);
  console.log('[Google Slides Extension] Started polling');
}

// Set up observers
function setupObservers() {
  // URL changes
  window.addEventListener('hashchange', () => {
    console.log('[Google Slides Extension] Hash changed');
    setTimeout(checkForChanges, 100);
  });

  window.addEventListener('popstate', () => {
    console.log('[Google Slides Extension] Popstate');
    setTimeout(checkForChanges, 100);
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
         'PageUp', 'PageDown', ' ', 'Enter', 'Home', 'End'].includes(e.key)) {
      setTimeout(checkForChanges, 200);
    }
  }, true);

  // Mouse clicks
  document.addEventListener('click', () => {
    setTimeout(checkForChanges, 200);
  }, true);

  // Filmstrip observer
  const setupFilmstripObserver = () => {
    const filmstrip = document.querySelector('.punch-filmstrip');
    if (filmstrip) {
      console.log('[Google Slides Extension] Setting up filmstrip observer');

      const observer = new MutationObserver(() => {
        setTimeout(checkForChanges, 50);
      });

      observer.observe(filmstrip, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-selected', 'class', 'tabindex'],
      });

      return true;
    }
    return false;
  };

  // Try to set up filmstrip observer, retry if not found
  if (!setupFilmstripObserver()) {
    console.log('[Google Slides Extension] Filmstrip not found, will retry...');
    let retries = 0;
    const retryInterval = setInterval(() => {
      if (setupFilmstripObserver() || retries > 10) {
        clearInterval(retryInterval);
        if (retries > 10) {
          console.log('[Google Slides Extension] Gave up waiting for filmstrip');
        }
      }
      retries++;
    }, 1000);
  }

  // Start polling
  startPolling();
}

// Initialize
function init() {
  const presentationId = getPresentationId();
  const isPresenting = isInPresentationMode();
  const slideId = getSlideIdFromUrl();
  const totalSlides = getTotalSlides();

  console.log('[Google Slides Extension] =============================');
  console.log('[Google Slides Extension] Content script initialized');
  console.log('[Google Slides Extension] URL:', window.location.href);
  console.log('[Google Slides Extension] Presentation ID:', presentationId);
  console.log('[Google Slides Extension] Current slide ID:', slideId);
  console.log('[Google Slides Extension] Is presenting:', isPresenting);
  console.log('[Google Slides Extension] Total slides:', totalSlides);
  console.log('[Google Slides Extension] =============================');

  if (!presentationId) {
    console.log('[Google Slides Extension] Not a presentation page');
    return;
  }

  // Wait a bit for the filmstrip to fully load
  setTimeout(() => {
    const slideInfo = detectCurrentSlide();
    if (slideInfo) {
      console.log('[Google Slides Extension] Initial slide detected:', slideInfo.slideIndex + 1);
      reportSlideChange(slideInfo);
    }

    setupObservers();
  }, 1000);

  // Notify background
  chrome.runtime.sendMessage({
    type: 'PAGE_LOADED',
    data: {
      presentationId,
      totalSlides,
      isPresenting,
    },
  }).catch(() => {});
}

// Wait for page to be ready
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}
