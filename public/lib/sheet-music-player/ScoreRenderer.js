/**
 * ScoreRenderer.js
 *
 * Wraps OpenSheetMusicDisplay (OSMD) for rendering MusicXML and managing cursor.
 * Handles:
 * - Loading and rendering MusicXML files
 * - Managing OSMD cursor for visual playback indication
 * - Auto-scrolling to keep cursor in view
 * - Responsive canvas sizing
 */

export class ScoreRenderer {
  constructor(containerSelector, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.osmd = null;
    this.canvas = null;
    this.zoom = options.zoom ?? 1.0;
    this.autoScroll = options.autoScroll ?? true;
    this.cursorColor = options.cursorColor ?? 'rgba(255, 45, 120, 0.5)'; // Pink with transparency
    this.cursorWidth = options.cursorWidth ?? 3;
  }

  /**
   * Initialize OSMD and load MusicXML
   */
  async loadScore(musicxmlUrl) {
    try {
      // Create OSMD instance
      this.osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(this.container, {
        autoResize: true,
        backend: 'canvas'
      });

      // Load the score
      await this.osmd.load(musicxmlUrl);
      this.osmd.render();

      // Set up the canvas cursor styling
      this._setupCursor();

      // Handle window resize
      window.addEventListener('resize', () => this._handleResize());

      console.log('[ScoreRenderer] Score loaded successfully');
      return this.osmd;
    } catch (error) {
      console.error('[ScoreRenderer] Failed to load score:', error);
      throw error;
    }
  }

  /**
   * Set up cursor styling and positioning
   */
  _setupCursor() {
    if (!this.osmd.cursor) {
      console.warn('[ScoreRenderer] OSMD cursor not available');
      return;
    }

    // Configure cursor appearance
    this.osmd.cursor.color = this.cursorColor;
    this.osmd.cursor.cursorLineWidth = this.cursorWidth;
  }

  /**
   * Move cursor to a specific checkpoint (by index)
   */
  setCursorToCheckpoint(checkpointIndex) {
    if (!this.osmd || !this.osmd.cursor) return;

    try {
      // OSMD cursor is 1-indexed
      this.osmd.cursor.setIterator(checkpointIndex);
      this._autoScrollToCursor();
    } catch (error) {
      console.warn('[ScoreRenderer] Failed to set cursor:', error);
    }
  }

  /**
   * Reset cursor to start
   */
  resetCursor() {
    if (!this.osmd || !this.osmd.cursor) return;
    this.osmd.cursor.reset();
    this._autoScrollToCursor();
  }

  /**
   * Show/hide cursor
   */
  showCursor(visible = true) {
    if (!this.osmd || !this.osmd.cursor) return;
    // OSMD doesn't have a built-in hide, but we can adjust opacity
    if (this.osmd.cursor.element) {
      this.osmd.cursor.element.style.opacity = visible ? '1' : '0';
    }
  }

  /**
   * Auto-scroll container to keep cursor in view
   */
  _autoScrollToCursor() {
    if (!this.autoScroll || !this.osmd || !this.osmd.cursor) return;

    // Get cursor position (approximate)
    // OSMD cursor is positioned via SVG/Canvas, but the container may need scrolling
    const canvas = this.container.querySelector('canvas');
    if (canvas) {
      // Keep cursor roughly in the center of the viewport
      const cursorX = canvas.offsetWidth * 0.5;
      this.container.scrollLeft = Math.max(0, cursorX - this.container.offsetWidth / 2);
    }
  }

  /**
   * Handle window resize
   */
  _handleResize() {
    if (!this.osmd) return;

    try {
      // OSMD handles autoResize, but we can trigger render
      this.osmd.render();
    } catch (error) {
      console.warn('[ScoreRenderer] Resize render failed:', error);
    }
  }

  /**
   * Get OSMD instance for direct manipulation if needed
   */
  getOsmd() {
    return this.osmd;
  }

  /**
   * Get score dimensions
   */
  getScoreDimensions() {
    if (!this.osmd) return null;

    const canvas = this.container.querySelector('canvas');
    if (canvas) {
      return {
        width: canvas.offsetWidth,
        height: canvas.offsetHeight
      };
    }
    return null;
  }

  /**
   * Set zoom level
   */
  setZoom(zoomLevel) {
    this.zoom = zoomLevel;
    if (!this.osmd) return;

    try {
      this.osmd.zoom = zoomLevel * 100; // OSMD expects zoom as percentage
      this.osmd.render();
    } catch (error) {
      console.warn('[ScoreRenderer] Failed to set zoom:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    window.removeEventListener('resize', () => this._handleResize());
    if (this.osmd) {
      // OSMD cleanup if available
      if (this.osmd.cursor) {
        this.osmd.cursor.reset();
      }
    }
  }
}
