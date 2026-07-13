/**
 * MidiInput.js
 *
 * Web MIDI API wrapper for handling MIDI device input.
 * Features:
 * - Device detection and selection
 * - Connection/disconnection handling
 * - Note-on/note-off event parsing
 * - Velocity and sustain pedal support
 * - Event emitter for playback engine
 */

export class MidiInput {
  constructor(options = {}) {
    this.midiAccess = null;
    this.inputDevice = null;
    this.isConnected = false;
    this.supportedBrowsers = ['Chrome', 'Edge', 'Opera'];
    this.listeners = {};
    this.heldNotes = new Set();
    this.sustainPedalHeld = false;

    this.onDeviceConnected = options.onDeviceConnected;
    this.onDeviceDisconnected = options.onDeviceDisconnected;
  }

  /**
   * Check if Web MIDI is supported
   */
  static isSupported() {
    return navigator.requestMIDIAccess !== undefined;
  }

  /**
   * Initialize Web MIDI access
   */
  async initialize() {
    if (!MidiInput.isSupported()) {
      console.warn('[MidiInput] Web MIDI not supported in this browser');
      this._emit('error', { message: 'Web MIDI not supported' });
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      console.log('[MidiInput] MIDI access granted');

      // Listen for device connect/disconnect
      this.midiAccess.addEventListener('statechange', (e) => this._handleStateChange(e));

      // Auto-select first input device if available
      this._autoSelectDevice();

      return true;
    } catch (error) {
      console.error('[MidiInput] Failed to access MIDI:', error);
      this._emit('error', { message: error.message });
      return false;
    }
  }

  /**
   * Get list of available input devices
   */
  getInputDevices() {
    if (!this.midiAccess) return [];

    const devices = [];
    for (const input of this.midiAccess.inputs.values()) {
      devices.push({
        id: input.id,
        name: input.name || 'Unknown Device',
        manufacturer: input.manufacturer || '',
        state: input.state
      });
    }
    return devices;
  }

  /**
   * Select a specific input device
   */
  selectDevice(deviceId) {
    if (!this.midiAccess) {
      console.warn('[MidiInput] MIDI not initialized');
      return false;
    }

    const device = this.midiAccess.inputs.get(deviceId);
    if (!device) {
      console.warn('[MidiInput] Device not found:', deviceId);
      return false;
    }

    // Disconnect previous device
    if (this.inputDevice) {
      this.inputDevice.removeEventListener('midimessage', (e) => this._handleMidiMessage(e));
    }

    this.inputDevice = device;
    this.inputDevice.addEventListener('midimessage', (e) => this._handleMidiMessage(e));
    this.isConnected = true;

    console.log('[MidiInput] Selected device:', device.name);
    this._emit('deviceChanged', { device: device.name });

    return true;
  }

  /**
   * Auto-select first available input device
   */
  _autoSelectDevice() {
    const devices = this.getInputDevices();
    if (devices.length > 0) {
      this.selectDevice(devices[0].id);
    }
  }

  /**
   * Handle MIDI device state changes (connect/disconnect)
   */
  _handleStateChange(event) {
    const device = event.port;
    console.log('[MidiInput] Device state changed:', device.name, device.state);

    if (device.state === 'connected') {
      this._emit('deviceConnected', { device: device.name });
      if (this.onDeviceConnected) this.onDeviceConnected(device);
      // Auto-select if no device is selected
      if (!this.inputDevice) {
        this.selectDevice(device.id);
      }
    } else if (device.state === 'disconnected') {
      this._emit('deviceDisconnected', { device: device.name });
      if (this.onDeviceDisconnected) this.onDeviceDisconnected(device);
      // Clear selection if disconnected device was selected
      if (this.inputDevice?.id === device.id) {
        this.inputDevice = null;
        this.isConnected = false;
        this._autoSelectDevice();
      }
    }
  }

  /**
   * Parse and handle MIDI messages
   */
  _handleMidiMessage(event) {
    const [status, note, velocity] = event.data;
    const channel = status & 0x0f;
    const command = status >> 4;

    // Note On (0x9)
    if (command === 0x9 && velocity > 0) {
      this.heldNotes.add(note);
      this._emit('noteOn', {
        midi: note,
        velocity: velocity,
        channel: channel
      });
    }
    // Note Off (0x8) or Note On with velocity 0
    else if (command === 0x8 || (command === 0x9 && velocity === 0)) {
      this.heldNotes.delete(note);
      this._emit('noteOff', {
        midi: note,
        velocity: velocity,
        channel: channel
      });
    }
    // Control Change (0xB) - Sustain Pedal
    else if (command === 0xb && note === 64) {
      this.sustainPedalHeld = velocity >= 64;
      this._emit('sustainPedal', {
        held: this.sustainPedalHeld,
        velocity: velocity
      });
    }
  }

  /**
   * Get currently held notes
   */
  getHeldNotes() {
    return Array.from(this.heldNotes);
  }

  /**
   * Check if a set of notes is being held
   */
  isPlayingNotes(noteArray) {
    return noteArray.every(note => this.heldNotes.has(note));
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  removeListener(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  _emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.inputDevice) {
      this.inputDevice.removeEventListener('midimessage', (e) => this._handleMidiMessage(e));
    }
    if (this.midiAccess) {
      this.midiAccess.removeEventListener('statechange', (e) => this._handleStateChange(e));
    }
  }
}
