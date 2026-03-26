'use strict';

/* ═══════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════ */
const NOTE_WHITES   = ['C','D','E','F','G','A','B'];
const NOTE_ALL      = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_COLORS   = {C:'#FF2D78',D:'#FF6B35',E:'#F59E0B',F:'#39D98A',G:'#00D4FF',A:'#A855F7',B:'#FF8C5A'};
const SHARP_COLORS  = {'C#':'#FF5599','D#':'#FF8C5A','F#':'#34D399','G#':'#22D3EE','A#':'#C084FC'};
const PIANO_START   = 36;  // C2
const PIANO_END     = 84;  // C6
const N_OCTAVES     = 4;

/* ═══════════════════════════════════════════════════════
   AUDIO
═══════════════════════════════════════════════════════ */
const sampler = new Tone.Sampler({
  urls: {
    'C4':'C4.mp3','D#4':'Ds4.mp3','F#4':'Fs4.mp3','A4':'A4.mp3',
    'C5':'C5.mp3','D#5':'Ds5.mp3','F#5':'Fs5.mp3','A5':'A5.mp3',
    'C3':'C3.mp3','D#3':'Ds3.mp3','F#3':'Fs3.mp3','A3':'A3.mp3',
  },
  baseUrl:'https://tonejs.github.io/audio/salamander/',
  release: 0.5,
}).toDestination();

const correctSynth = new Tone.Synth({
  oscillator:{type:'sine'},
  envelope:{attack:.005,decay:.1,sustain:.2,release:.3},
  volume:-18,
}).toDestination();

const wrongSynth = new Tone.Synth({
  oscillator:{type:'sawtooth'},
  envelope:{attack:.01,decay:.08,sustain:0,release:.12},
  volume:-22,
}).toDestination();

async function ensureAudio() {
  if (Tone.context.state !== 'running') await Tone.start();
}

function playNoteHz(midi) {
  if (!state.sound) return;
  ensureAudio().then(() => {
    const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const note = names[midi % 12] + (Math.floor(midi/12)-1);
    sampler.triggerAttackRelease(note, '4n', Tone.now());
  });
}

function playCorrect() {
  if (!state.sound) return;
  ensureAudio().then(() => {
    correctSynth.triggerAttackRelease('C5','16n',Tone.now());
    correctSynth.triggerAttackRelease('E5','16n',Tone.now()+.1);
    correctSynth.triggerAttackRelease('G5','16n',Tone.now()+.2);
  });
}

function playWrong() {
  if (!state.sound) return;
  ensureAudio().then(() => wrongSynth.triggerAttackRelease('C2','8n',Tone.now()));
}

/* ═══════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════ */
let state = {
  running:       false,
  mode:          'name',   // 'name' | 'find' | 'octave'
  range:         'white',
  diff:          'easy',
  register:      'mid',
  count:         10,
  sound:         true,

  questionNum:   0,
  totalQ:        0,
  correct:       0,
  streak:        0,
  bestStreak:    0,
  log:           [],

  currentMidi:   null,
  currentNote:   null,  // { name, octave, isSharp }
  phase:         'name', // 'name' → 'accidental' → 'octave' → done
  nameGuess:     null,
  answered:      false,
  questionStart: 0,
  timerRAF:      null,

  noteErrors:    {},   // note name → count of errors
  highlightMidi: null, // currently highlighted key
  highlightResult: null, // 'correct' | 'wrong'
};

/* ═══════════════════════════════════════════════════════
   SETTINGS HANDLERS
═══════════════════════════════════════════════════════ */
function activateSeg(btn) {
  btn.closest('.seg-control').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function setMode(m, btn) {
  if (state.running) return;
  state.mode = m;
  document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  updateModeUI();
}
function setRange(r, btn) { activateSeg(btn); state.range = r; }
function setDiff(d, btn)  { activateSeg(btn); state.diff = d; }
function setRegister(r, btn){ activateSeg(btn); state.register = r; }
function setCount(n, btn) { activateSeg(btn); state.count = n; }
function setSound(v, btn) { activateSeg(btn); state.sound = v; }

function updateModeUI() {
  const isFind = state.mode === 'find';
  const isOct  = state.mode === 'octave';

  document.getElementById('noteDisplayArea').style.display   = isFind ? 'flex' : 'none';
  document.getElementById('pianoLabel').textContent          = isFind
    ? 'Click the key that matches the note shown below'
    : 'A key will highlight — name it below';

  document.getElementById('nameAnswerSection').style.display = isFind ? 'none' : 'block';
  document.getElementById('accidentalRow').style.display     = 'none'; // shown dynamically
  document.getElementById('octaveRow').style.display         = isOct ? 'block' : 'none';
}

/* ═══════════════════════════════════════════════════════
   NOTE POOL
═══════════════════════════════════════════════════════ */
function buildPool() {
  const midLow  = state.register === 'mid' ? 48 : 36;   // C3 or C2
  const midHigh = state.register === 'mid' ? 72 : 84;   // C5 or C6

  const sharps = new Set(['C#','D#','F#','G#','A#']);
  const pool   = [];

  for (let midi = midLow; midi <= midHigh; midi++) {
    const name = NOTE_ALL[midi % 12];
    const isSharp = name.includes('#');
    if (state.range === 'white' && isSharp) continue;

    // Difficulty filter
    if (state.diff === 'easy') {
      // Stick to C3-C5 white keys only
      if (isSharp) continue;
      if (midi < 48 || midi > 72) continue;
    } else if (state.diff === 'mid') {
      if (isSharp && state.range === 'all') {
        if (Math.random() > 0.3) continue; // fewer sharps
      }
    }

    pool.push(midi);
  }
  return pool;
}

/* ═══════════════════════════════════════════════════════
   SESSION CONTROL
═══════════════════════════════════════════════════════ */
function startSession() {
  ensureAudio();
  state.running       = true;
  state.questionNum   = 0;
  state.totalQ        = 0;
  state.correct       = 0;
  state.streak        = 0;
  state.bestStreak    = 0;
  state.log           = [];
  state.noteErrors    = {};

  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('stopBtn').style.display  = 'block';
  document.getElementById('sessionLog').innerHTML   = '<div class="log-empty" style="opacity:.5">Session started…</div>';
  document.getElementById('aiBody').innerHTML       = '<p style="color:var(--muted2);font-style:italic">Complete at least 5 notes to unlock AI analysis.</p>';
  document.getElementById('analyseBtn').disabled    = true;
  hideFeedback();
  updateStats();
  nextQuestion();
}

function stopSession() {
  state.running = false;
  cancelAnimationFrame(state.timerRAF);
  setTimerDisplay(null);
  document.getElementById('startBtn').style.display = 'block';
  document.getElementById('stopBtn').style.display  = 'none';
  state.highlightMidi   = null;
  state.highlightResult = null;
  drawPiano();
  setButtonsDisabled(true);
  updateStats();
  if (state.log.length >= 3) document.getElementById('analyseBtn').disabled = false;
}

function nextQuestion() {
  if (!state.running) return;
  if (state.count > 0 && state.questionNum >= state.count) {
    sessionComplete(); return;
  }
  state.questionNum++;
  state.totalQ++;
  state.answered  = false;
  state.nameGuess = null;
  state.phase     = 'name';

  const pool = buildPool();
  if (!pool.length) { toast('No notes in range — check settings'); stopSession(); return; }

  const midi = pool[Math.floor(Math.random() * pool.length)];
  const name = NOTE_ALL[midi % 12];
  const oct  = Math.floor(midi / 12) - 1;
  const isSharp = name.includes('#');

  state.currentMidi = midi;
  state.currentNote = { name, octave: oct, isSharp };

  // Highlight the key
  state.highlightMidi   = midi;
  state.highlightResult = null;
  drawPiano();

  // For "find the key" mode — show the note to find
  if (state.mode === 'find' || state.mode === 'octave') {
    document.getElementById('noteBig').textContent = name;
    document.getElementById('noteOctaveBadge').style.display = state.mode === 'octave' ? 'inline-block' : 'none';
    document.getElementById('noteOctaveBadge').textContent   = `Octave ${oct}`;
    document.getElementById('findIdleOverlay').style.display = 'none';
    // In find mode: hide the key highlight until they click
    state.highlightMidi = null;
    drawPiano();
  }

  // Reset accidental/octave rows
  document.getElementById('accidentalRow').style.display = 'none';
  document.getElementById('octaveRow').style.display     = state.mode === 'octave' ? 'block' : 'none';
  setButtonsDisabled(false);
  setOctaveButtonsDisabled(state.mode !== 'octave' || state.phase !== 'octave');

  // Progress
  if (state.count > 0)
    document.getElementById('progressFill').style.width = ((state.questionNum-1)/state.count*100)+'%';
  document.getElementById('sessionCounter').textContent = `${state.correct} / ${state.totalQ}`;

  hideFeedback();
  clearButtonStyles();
  state.questionStart = performance.now();
  startTimer();
  playNoteHz(midi);
}

function sessionComplete() {
  stopSession();
  const acc = state.totalQ > 0 ? Math.round(state.correct/state.totalQ*100) : 0;
  showFeedback('correct','🏆',
    `Session complete! ${state.correct}/${state.totalQ} correct`,
    `Accuracy: ${acc}% · Best streak: ${state.bestStreak}`);
  if (state.log.length >= 3) document.getElementById('analyseBtn').disabled = false;
  updateWeakSpots();
}

/* ═══════════════════════════════════════════════════════
   ANSWER HANDLERS
═══════════════════════════════════════════════════════ */
function handleNameAnswer(guess) {
  if (!state.running || state.answered) return;
  if (state.mode === 'find') return; // handled by piano click

  const cn    = state.currentNote;
  const needsAccidental = cn.isSharp;

  if (!needsAccidental) {
    // White key — name is enough
    finishAnswer(guess, null);
    return;
  }

  // Sharp key — first confirm name, then ask accidental
  if (state.phase === 'name') {
    state.nameGuess = guess;
    state.phase     = 'accidental';
    // Highlight the chosen name button
    document.querySelectorAll('.note-btn').forEach(b => b.classList.remove('correct','wrong'));
    const btn = document.querySelector(`.note-btn[data-note="${guess}"]`);
    if (btn) btn.style.borderColor = 'var(--sky)';
    document.getElementById('accidentalRow').style.display = 'block';
    return;
  }
}

function handleAccidental(type) {
  if (!state.running || state.answered || state.phase !== 'accidental') return;
  const guess = type === 'sharp'   ? state.nameGuess + '#'
              : type === 'flat'    ? state.nameGuess + 'b'
              : state.nameGuess;
  finishAnswer(guess, null);
}

function handleOctaveAnswer(oct) {
  if (!state.running || state.answered) return;
  if (state.mode !== 'octave') return;

  // In octave mode: pick name first then octave
  if (state.phase === 'name' || state.phase === 'octave_wait') {
    // If name already confirmed, check octave
    if (state.nameGuess !== null) {
      finishAnswer(state.nameGuess, oct);
    }
  }
}

function handlePianoClick(midi) {
  if (!state.running || state.answered) return;
  if (state.mode === 'find') {
    finishAnswer(null, null, midi);
  }
}

function finishAnswer(nameGuess, octGuess, clickedMidi) {
  if (state.answered) return;
  state.answered = true;
  cancelAnimationFrame(state.timerRAF);

  const elapsed = (performance.now() - state.questionStart) / 1000;
  const cn      = state.currentNote;
  let correct   = false;

  if (state.mode === 'find') {
    correct = clickedMidi === state.currentMidi;
  } else if (state.mode === 'octave') {
    const nameMatch = nameGuess === cn.name;
    const octMatch  = octGuess  === cn.octave;
    correct = nameMatch && octMatch;
  } else {
    correct = nameGuess === cn.name;
  }

  const tooSlow = elapsed > 4.0;
  const win     = correct && !tooSlow;

  // Reveal key
  state.highlightMidi   = state.currentMidi;
  state.highlightResult = win ? 'correct' : 'wrong';
  drawPiano();

  // Button colours
  if (state.mode !== 'find' && nameGuess) {
    const base = nameGuess.replace('#','').replace('b','');
    const btn  = document.querySelector(`.note-btn[data-note="${base}"]`);
    if (btn) { btn.classList.remove('correct','wrong'); btn.classList.add(win ? 'correct' : 'wrong'); }
    if (!win) {
      const cBase = cn.name.replace('#','').replace('b','');
      const cb = document.querySelector(`.note-btn[data-note="${cBase}"]`);
      if (cb) cb.classList.add('correct');
    }
  }

  setButtonsDisabled(true);
  setTimerDisplay(elapsed, elapsed <= 1.5 ? 'green' : elapsed <= 3 ? 'amber' : 'red');

  if (win) { state.correct++; state.streak++; state.bestStreak = Math.max(state.bestStreak, state.streak); playCorrect(); }
  else     { state.streak = 0; playWrong(); if (cn.name) { state.noteErrors[cn.name] = (state.noteErrors[cn.name]||0)+1; } }

  // Feedback
  const display = cn.name + cn.octave;
  if (tooSlow && !correct) {
    showFeedback('slow','⏰','Too slow!',`The note was ${display}`);
  } else if (tooSlow && correct) {
    showFeedback('slow','⏰','Correct but too slow!',`${elapsed.toFixed(1)}s — keep practising your speed`);
  } else if (win) {
    const speed = elapsed < 1 ? 'Lightning fast! ⚡' : elapsed < 2 ? 'Nice! 🎯' : 'Correct! ✓';
    showFeedback('correct','✓',`${speed} — ${display}`,`${elapsed.toFixed(2)}s · Streak: ${state.streak}🔥`);
  } else {
    showFeedback('wrong','✗',`Not quite — it was ${display}`,
      state.mode === 'find' ? `You clicked ${NOTE_ALL[clickedMidi%12]}${Math.floor(clickedMidi/12)-1}` : `You guessed ${nameGuess || '—'}`);
  }

  // Streak badge
  document.getElementById('streakDisplay').style.display = state.streak >= 3 ? 'flex' : 'none';
  document.getElementById('streakText').textContent = `Streak: ${state.streak} 🔥`;

  // Log entry
  state.log.push({ note: display, guess: nameGuess || (clickedMidi ? NOTE_ALL[clickedMidi%12]+Math.floor(clickedMidi/12-1) : '?'), time: elapsed, correct: win, tooSlow });
  addLogRow(display, nameGuess || '?', elapsed, win ? 'ok' : (tooSlow ? 'slow' : 'no'));
  updateStats();

  setTimeout(() => { if (state.running) nextQuestion(); }, 1100);
}

/* ═══════════════════════════════════════════════════════
   MIDI INPUT
═══════════════════════════════════════════════════════ */
function initMidi() {
  if (!navigator.requestMIDIAccess) return;
  navigator.requestMIDIAccess().then(access => {
    const update = () => {
      let count = 0;
      access.inputs.forEach(inp => {
        inp.onmidimessage = msg => {
          const [status, note, vel] = msg.data;
          const isOn = (status & 0xF0) === 0x90 && vel > 0;
          if (!isOn) return;
          ensureAudio();
          if (state.mode === 'find') {
            handlePianoClick(note);
          } else {
            const name = NOTE_ALL[note % 12];
            const base = name.replace('#','');
            handleNameAnswer(base);
          }
        };
        count++;
      });
      const dot = document.getElementById('midiDot');
      const lbl = document.getElementById('midiLabel');
      dot.classList.toggle('connected', count > 0);
      lbl.textContent = count ? `MIDI: ${count} device${count>1?'s':''}` : 'MIDI: off';
    };
    update();
    access.onstatechange = update;
  });
}
initMidi();

/* ═══════════════════════════════════════════════════════
   PIANO CANVAS
═══════════════════════════════════════════════════════ */
const pianoCanvas = document.getElementById('pianoCanvas');
const pCtx        = pianoCanvas.getContext('2d');

function getWhiteKeys() {
  const whites = [];
  for (let m = PIANO_START; m <= PIANO_END; m++) {
    if (!NOTE_ALL[m%12].includes('#')) whites.push(m);
  }
  return whites;
}
const WHITE_KEYS = getWhiteKeys();
const N_WHITE    = WHITE_KEYS.length;

function buildLayout(w) {
  const wkw  = w / N_WHITE;
  const keys = [];
  let wi = 0;
  for (let m = PIANO_START; m <= PIANO_END; m++) {
    const name = NOTE_ALL[m%12];
    const isSharp = name.includes('#');
    if (!isSharp) {
      keys.push({ midi:m, x:wi*wkw, w:wkw, isSharp:false });
      wi++;
    } else {
      const bx = (wi-1)*wkw + wkw*0.65;
      keys.push({ midi:m, x:bx, w:wkw*0.6, isSharp:true });
    }
  }
  return { keys, wkw };
}

function drawPiano() {
  const W = pianoCanvas.width;
  const H = pianoCanvas.height;
  pCtx.clearRect(0,0,W,H);
  pCtx.fillStyle = '#0a0812';
  pCtx.fillRect(0,0,W,H);

  const { keys, wkw } = buildLayout(W);
  const BKH = H * 0.62;
  const r   = 5;

  // White keys
  keys.filter(k=>!k.isSharp).forEach(k => {
    const isHL   = k.midi === state.highlightMidi;
    const result = state.highlightResult;
    let fill = '#f5f2ec';
    if (isHL && result === 'correct') fill = '#39D98A';
    else if (isHL && result === 'wrong') fill = '#EF4444';
    else if (isHL) {
      const base = NOTE_ALL[k.midi%12].replace('#','');
      fill = NOTE_COLORS[base] || '#FF2D78';
    }

    if (isHL) { pCtx.shadowColor = fill; pCtx.shadowBlur = 18; }
    pCtx.fillStyle = fill;
    pCtx.beginPath();
    pCtx.moveTo(k.x+1,0); pCtx.lineTo(k.x+wkw-1,0);
    pCtx.lineTo(k.x+wkw-1,H-r);
    pCtx.arcTo(k.x+wkw-1,H,k.x+wkw-1-r,H,r);
    pCtx.lineTo(k.x+1+r,H);
    pCtx.arcTo(k.x+1,H,k.x+1,H-r,r);
    pCtx.lineTo(k.x+1,0); pCtx.closePath();
    pCtx.fill();
    pCtx.shadowBlur = 0;
    pCtx.strokeStyle = '#333'; pCtx.lineWidth = 0.8; pCtx.stroke();

    // Octave labels
    const name = NOTE_ALL[k.midi%12];
    const oct  = Math.floor(k.midi/12)-1;
    if (name === 'C') {
      pCtx.fillStyle = isHL ? '#fff' : '#8a6030';
      pCtx.font = `bold ${Math.max(7,wkw*.4)}px "DM Mono",monospace`;
      pCtx.textAlign = 'center';
      pCtx.fillText('C'+oct, k.x+wkw/2, H-6);
    }
    // Note name on highlighted key
    if (isHL) {
      pCtx.fillStyle = '#fff';
      pCtx.font = `bold ${Math.max(9,wkw*.5)}px "DM Mono",monospace`;
      pCtx.textAlign = 'center';
      pCtx.fillText(NOTE_ALL[k.midi%12], k.x+wkw/2, H*0.55);
    }
  });

  // Black keys
  keys.filter(k=>k.isSharp).forEach(k => {
    const isHL   = k.midi === state.highlightMidi;
    const result = state.highlightResult;
    const base   = NOTE_ALL[k.midi%12].replace('#','');
    let fill = '#1a1428';
    if (isHL && result === 'correct') fill = '#39D98A';
    else if (isHL && result === 'wrong') fill = '#EF4444';
    else if (isHL) fill = SHARP_COLORS[NOTE_ALL[k.midi%12]] || '#FF2D78';

    if (isHL) { pCtx.shadowColor = fill; pCtx.shadowBlur = 14; }
    pCtx.fillStyle = fill;
    pCtx.beginPath();
    pCtx.moveTo(k.x,0); pCtx.lineTo(k.x+k.w,0);
    pCtx.lineTo(k.x+k.w,BKH-r);
    pCtx.arcTo(k.x+k.w,BKH,k.x+k.w-r,BKH,r);
    pCtx.lineTo(k.x+r,BKH);
    pCtx.arcTo(k.x,BKH,k.x,BKH-r,r);
    pCtx.lineTo(k.x,0); pCtx.closePath();
    pCtx.fill();
    pCtx.shadowBlur = 0;
    pCtx.strokeStyle = 'rgba(0,0,0,.5)'; pCtx.lineWidth = 0.5; pCtx.stroke();

    if (isHL) {
      pCtx.fillStyle = '#fff';
      pCtx.font = `bold ${Math.max(7,k.w*.55)}px "DM Mono",monospace`;
      pCtx.textAlign = 'center';
      pCtx.fillText(NOTE_ALL[k.midi%12], k.x+k.w/2, BKH*0.65);
    }
  });
}

// Piano click handler
pianoCanvas.addEventListener('click', e => {
  if (!state.running || state.answered) return;
  if (state.mode !== 'find') return;
  ensureAudio();
  const rect = pianoCanvas.getBoundingClientRect();
  const cx   = (e.clientX - rect.left) * (pianoCanvas.width / rect.width);
  const cy   = (e.clientY - rect.top)  * (pianoCanvas.height / rect.height);
  const { keys } = buildLayout(pianoCanvas.width);
  const BKH = pianoCanvas.height * 0.62;
  let hit = null;
  if (cy < BKH) {
    for (const k of keys.filter(k=>k.isSharp)) {
      if (cx >= k.x && cx <= k.x+k.w) { hit = k; break; }
    }
  }
  if (!hit) {
    const wi = Math.floor(cx / (pianoCanvas.width / N_WHITE));
    hit = keys.filter(k=>!k.isSharp)[wi] || null;
  }
  if (hit) handlePianoClick(hit.midi);
});

pianoCanvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  const rect = pianoCanvas.getBoundingClientRect();
  const cx   = (t.clientX - rect.left) * (pianoCanvas.width / rect.width);
  const cy   = (t.clientY - rect.top)  * (pianoCanvas.height / rect.height);
  const { keys } = buildLayout(pianoCanvas.width);
  const BKH = pianoCanvas.height * 0.62;
  let hit = null;
  if (cy < BKH) {
    for (const k of keys.filter(k=>k.isSharp)) {
      if (cx >= k.x && cx <= k.x+k.w) { hit = k; break; }
    }
  }
  if (!hit) {
    const wi = Math.floor(cx / (pianoCanvas.width / N_WHITE));
    hit = keys.filter(k=>!k.isSharp)[wi] || null;
  }
  if (hit && state.mode === 'find') handlePianoClick(hit.midi);
},{passive:false});

window.addEventListener('resize', () => {
  pianoCanvas.width = pianoCanvas.parentElement.clientWidth || 900;
  drawPiano();
});

/* ═══════════════════════════════════════════════════════
   TIMER
═══════════════════════════════════════════════════════ */
const TIMER_LIMIT = 4.0;

function startTimer() {
  cancelAnimationFrame(state.timerRAF);
  const start = performance.now();
  const ring  = document.getElementById('timerRing');
  const text  = document.getElementById('timerText');
  const CIRC  = 220;

  function tick() {
    const elapsed = (performance.now() - start) / 1000;
    if (elapsed >= TIMER_LIMIT) {
      handleTimeout();
      return;
    }
    const frac   = elapsed / TIMER_LIMIT;
    const offset = CIRC - frac * CIRC;
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = elapsed < 1.5 ? 'var(--green)' : elapsed < 3 ? 'var(--amber)' : 'var(--red)';
    text.textContent  = (TIMER_LIMIT - elapsed).toFixed(1);
    state.timerRAF = requestAnimationFrame(tick);
  }
  tick();
}

function handleTimeout() {
  if (!state.running || state.answered) return;
  state.answered = true;
  cancelAnimationFrame(state.timerRAF);
  const cn = state.currentNote;
  state.streak = 0;
  state.highlightMidi   = state.currentMidi;
  state.highlightResult = 'wrong';
  drawPiano();
  setButtonsDisabled(true);
  setTimerDisplay(TIMER_LIMIT, 'red');
  showFeedback('slow','⏰','Time\'s up!',`The note was ${cn.name}${cn.octave} — keep practising`);
  state.log.push({ note:cn.name+cn.octave, guess:'(timeout)', time:TIMER_LIMIT, correct:false, tooSlow:true });
  addLogRow(cn.name+cn.octave,'—',TIMER_LIMIT,'slow');
  updateStats();
  setTimeout(() => { if (state.running) nextQuestion(); }, 1100);
}

function setTimerDisplay(val, color) {
  const ring = document.getElementById('timerRing');
  const text = document.getElementById('timerText');
  if (val === null) { ring.style.strokeDashoffset = 220; text.textContent = '—'; return; }
  const colors = { green:'var(--green)', amber:'var(--amber)', red:'var(--red)' };
  ring.style.stroke = colors[color] || 'var(--green)';
  text.textContent  = val.toFixed(1);
}

/* ═══════════════════════════════════════════════════════
   UI HELPERS
═══════════════════════════════════════════════════════ */
function setButtonsDisabled(d) {
  document.querySelectorAll('.note-btn').forEach(b => b.disabled = d);
  document.querySelectorAll('.oct-btn').forEach(b  => b.disabled = d);
}
function setOctaveButtonsDisabled(d) {
  document.querySelectorAll('.oct-btn').forEach(b => b.disabled = d);
}
function clearButtonStyles() {
  document.querySelectorAll('.note-btn').forEach(b => {
    b.classList.remove('correct','wrong');
    b.style.borderColor = '';
  });
}
function showFeedback(type, icon, main, sub) {
  const el = document.getElementById('feedbackBanner');
  el.className = `feedback-banner ${type} show`;
  document.getElementById('feedbackIcon').textContent = icon;
  document.getElementById('feedbackMain').textContent = main;
  document.getElementById('feedbackSub').textContent  = sub || '';
}
function hideFeedback() {
  document.getElementById('feedbackBanner').classList.remove('show');
}
function addLogRow(note, guess, time, result) {
  const log = document.getElementById('sessionLog');
  const empty = log.querySelector('.log-empty');
  if (empty) empty.remove();
  const row = document.createElement('div');
  row.className = 'log-row';
  row.innerHTML = `
    <span class="log-note">${note}</span>
    <span class="log-guess">→ ${guess}</span>
    <span class="log-time">${time.toFixed(2)}s</span>
    <span class="log-result ${result}">${result==='ok'?'✓':result==='slow'?'⏰':'✗'}</span>`;
  log.prepend(row);
}
function updateStats() {
  const acc = state.totalQ > 0 ? Math.round(state.correct/state.totalQ*100) : null;
  document.getElementById('statAccuracy').textContent = acc !== null ? acc+'%' : '—';
  document.getElementById('accuracyBar').style.width  = (acc||0)+'%';
  document.getElementById('statStreak').textContent   = state.bestStreak;

  const times = state.log.filter(l=>!l.tooSlow).map(l=>l.time);
  const avg   = times.length ? (times.reduce((a,b)=>a+b,0)/times.length).toFixed(2)+'s' : '—';
  document.getElementById('statAvgTime').textContent  = avg;
}
function updateWeakSpots() {
  const errs   = Object.entries(state.noteErrors).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const wrap   = document.getElementById('weakSpotsWrap');
  const spots  = document.getElementById('weakSpots');
  if (!errs.length) { wrap.style.display='none'; return; }
  wrap.style.display = 'block';
  spots.innerHTML = errs.map(([n,c]) =>
    `<span style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:var(--red);font-family:'DM Mono',monospace;font-size:.68rem;padding:.2rem .6rem;border-radius:100px">${n} (${c}✗)</span>`
  ).join('');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

/* ═══════════════════════════════════════════════════════
   AI ANALYSIS
═══════════════════════════════════════════════════════ */
async function runAIAnalysis() {
  const btn  = document.getElementById('analyseBtn');
  const body = document.getElementById('aiBody');
  btn.disabled = true;
  body.innerHTML = '<div class="ai-loading"><div class="ai-spinner"></div>Analysing your session…</div>';

  const acc    = state.totalQ > 0 ? Math.round(state.correct/state.totalQ*100) : 0;
  const times  = state.log.filter(l=>!l.tooSlow).map(l=>l.time);
  const avgT   = times.length ? (times.reduce((a,b)=>a+b,0)/times.length).toFixed(2) : 'n/a';
  const errors = state.log.filter(l=>!l.correct).map(l=>`${l.note}→${l.guess}`).join(', ') || 'none';
  const errs   = Object.entries(state.noteErrors).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([n,c])=>`${n}(${c}x)`).join(', ')||'none';
  const mode   = {name:'Name the Note',find:'Find the Key',octave:'With Octave'}[state.mode];

  const prompt = `You are a supportive piano teacher giving brief, specific feedback on a student's note naming practice session.

Session data:
- Mode: ${mode}
- Accuracy: ${acc}% (${state.correct}/${state.totalQ} correct)
- Average response time: ${avgT}s
- Best streak: ${state.bestStreak}
- Notes with most errors: ${errs}
- Incorrect answers: ${errors}

Give 2-3 short sentences of personalised feedback. Be encouraging but honest. Point out specific notes to practise if errors exist. Keep it under 80 words.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:200,
        messages:[{role:'user',content:prompt}]
      })
    });
    const data = await res.json();
    const text = data?.content?.[0]?.text || 'Unable to get analysis.';

    // Build chips
    const chips = [];
    if (acc >= 90) chips.push({cls:'good',label:'Excellent accuracy'});
    else if (acc < 60) chips.push({cls:'warn',label:'Needs more practice'});
    if (parseFloat(avgT) < 1.5) chips.push({cls:'good',label:'Fast responses'});
    else if (parseFloat(avgT) > 3) chips.push({cls:'warn',label:'Work on speed'});
    if (state.bestStreak >= 5) chips.push({cls:'good',label:`${state.bestStreak}🔥 Streak`});

    const chipHTML = chips.length
      ? `<div class="ai-chips">${chips.map(c=>`<span class="ai-chip ${c.cls}">${c.label}</span>`).join('')}</div>`
      : '';

    body.innerHTML = `<p>${text.replace(/\n/g,'</p><p>')}</p>${chipHTML}`;
  } catch(e) {
    body.innerHTML = `<p style="color:var(--muted2)">Analysis unavailable — check your connection.</p>`;
    btn.disabled = false;
  }
}

/* ═══════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════ */
pianoCanvas.width = pianoCanvas.parentElement?.clientWidth || 900;
drawPiano();
updateModeUI();
setButtonsDisabled(true);