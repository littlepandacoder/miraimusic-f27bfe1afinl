/**
 * Audio Bridge: Connects audio input system to Piano Hero game
 * Sends detected notes to the game via postMessage
 */

export class AudioBridge {
  private gameWindow: Window | null = null;
  private isActive = false;

  /**
   * Initialize bridge with game window (usually an iframe)
   */
  setGameWindow(window: Window) {
    this.gameWindow = window;
  }

  /**
   * Send detected note to the game
   * The game will receive it as if it came from MIDI or keyboard
   */
  sendNoteToGame(noteData: {
    midiNote: number;
    noteName: string;
    frequency: number;
    cents: number; // -50 to +50, how many cents off from perfect
    confidence: number; // 0-1
  }) {
    if (!this.gameWindow || !this.isActive) return;

    // Send message to game in format it can understand
    this.gameWindow.postMessage(
      {
        type: "AUDIO_NOTE_DETECTED",
        payload: noteData,
      },
      "*"
    );
  }

  /**
   * Activate/deactivate audio input in the game
   */
  setActive(active: boolean) {
    this.isActive = active;
    if (this.gameWindow) {
      this.gameWindow.postMessage(
        {
          type: "AUDIO_INPUT_STATE",
          payload: { active },
        },
        "*"
      );
    }
  }

  /**
   * Clear any active notes (when audio input stops)
   */
  clearNotes() {
    if (this.gameWindow && this.isActive) {
      this.gameWindow.postMessage(
        {
          type: "AUDIO_NOTE_OFF",
          payload: {},
        },
        "*"
      );
    }
  }
}

export const audioBridge = new AudioBridge();
