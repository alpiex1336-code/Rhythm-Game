const SONGS = [
  {
    id: "soundhelix1",
    title: "Neon Chase",
    artist: "SoundHelix Demo",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    stars: 2,
    baseTravelTime: 2.9,
    maxNotesPerSecond: 2,
    densityScale: 0.42,
    holdChanceBase: 0.008,
    chordChanceScale: 0.07,
    bpm: 124,
    startAt: 3.5,
    endAt: 105,
    profile: [
      { from: 0, to: 20, density: 0.42, chaos: 0.08 },
      { from: 20, to: 55, density: 0.56, chaos: 0.16 },
      { from: 55, to: 85, density: 0.68, chaos: 0.22 },
      { from: 85, to: 105, density: 0.48, chaos: 0.1 }
    ]
  },
  {
    id: "soundhelix2",
    title: "Skyline Pulse",
    artist: "SoundHelix Demo",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    stars: 3,
    baseTravelTime: 2.35,
    maxNotesPerSecond: 2,
    densityScale: 0.57,
    holdChanceBase: 0.028,
    chordChanceScale: 0.13,
    bpm: 132,
    startAt: 4.2,
    endAt: 100,
    profile: [
      { from: 0, to: 25, density: 0.48, chaos: 0.17 },
      { from: 25, to: 60, density: 0.66, chaos: 0.28 },
      { from: 60, to: 90, density: 0.8, chaos: 0.39 },
      { from: 90, to: 100, density: 0.53, chaos: 0.19 }
    ]
  },
  {
    id: "soundhelix3",
    title: "Midnight Drift",
    artist: "SoundHelix Demo",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    stars: 5,
    baseTravelTime: 1.85,
    maxNotesPerSecond: 2,
    densityScale: 0.9,
    holdChanceBase: 0.095,
    chordChanceScale: 0.28,
    speedProfile: [
      { from: 0, to: 14, multiplier: 0.65 },
      { from: 14, to: 27, multiplier: 1.35 },
      { from: 27, to: 39, multiplier: 0.72 },
      { from: 39, to: 53, multiplier: 1.55 },
      { from: 53, to: 66, multiplier: 0.78 },
      { from: 66, to: 79, multiplier: 1.72 },
      { from: 79, to: 95, multiplier: 1.18 }
    ],
    bpm: 118,
    startAt: 3,
    endAt: 95,
    profile: [
      { from: 0, to: 24, density: 0.62, chaos: 0.24 },
      { from: 24, to: 58, density: 0.8, chaos: 0.38 },
      { from: 58, to: 80, density: 0.95, chaos: 0.55 },
      { from: 80, to: 95, density: 0.72, chaos: 0.34 }
    ]
  }
];

const DIRECTION_META = [
  { lane: 0, key: "ArrowLeft", symbol: "←", cls: "left" },
  { lane: 1, key: "ArrowUp", symbol: "↑", cls: "up" },
  { lane: 2, key: "ArrowRight", symbol: "→", cls: "right" },
  { lane: 3, key: "ArrowDown", symbol: "↓", cls: "down" }
];

const elements = {
  homeScreen: document.getElementById("homeScreen"),
  gameScreen: document.getElementById("gameScreen"),
  resultModal: document.getElementById("resultModal"),
  songSelect: document.getElementById("songSelect"),
  startBtn: document.getElementById("startBtn"),
  randomSongBtn: document.getElementById("randomSongBtn"),
  retryBtn: document.getElementById("retryBtn"),
  homeBtn: document.getElementById("homeBtn"),
  backHomeBtn: document.getElementById("backHomeBtn"),
  notesLayer: document.getElementById("notesLayer"),
  playfield: document.getElementById("playfield"),
  detectZone: document.getElementById("detectZone"),
  songAudio: document.getElementById("songAudio"),
  currentSongName: document.getElementById("currentSongName"),
  scoreValue: document.getElementById("scoreValue"),
  successValue: document.getElementById("successValue"),
  comboValue: document.getElementById("comboValue"),
  judgementText: document.getElementById("judgementText"),
  finalScore: document.getElementById("finalScore"),
  finalPercent: document.getElementById("finalPercent")
};

const HOLD_HEAD_HEIGHT = 52;
const HOLD_MAX_POINTS = 260;
const MAX_CONCURRENT_REQUIRED_KEYS = 2;
const HOLD_RELEASE_GRACE = 0.14;
const MAX_TOUCH_WINDOW_SECONDS = 0.3;
const HAPTIC_COOLDOWN_MS = 55;
const GRADE_RULES = [
  { name: "PERFECT", min: 0.99, points: 120, color: "#95ffce", success: true },
  { name: "GREAT", min: 0.75, points: 90, color: "#8cd3ff", success: true },
  { name: "GOOD", min: 0.5, points: 60, color: "#ffe38c", success: true },
  { name: "BAD", min: 0.2, points: 25, color: "#ffb88a", success: true },
  { name: "MISS", min: 0, points: 0, color: "#ff7f9c", success: false }
];

const state = {
  song: null,
  notes: [],
  noteMapByLane: [[], [], [], []],
  isPlaying: false,
  chartEndTime: 0,
  score: 0,
  combo: 0,
  successHits: 0,
  successfulNotes: 0,
  totalJudgedNotes: 0,
  animationHandle: null,
  zoneTopY: 0,
  zoneBottomY: 0,
  pressedLanes: new Set(),
  justPressedLanes: new Set(),
  prevSongTime: 0,
  lastHapticAtMs: 0
};

const chartAnalysisCache = new Map();
let chartAudioContext = null;

function hashSeed(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function makeRandom(seedValue) {
  let seed = hashSeed(seedValue) || 1;
  return function rand() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 10000) / 10000;
  };
}

function getSection(song, relativeTime) {
  for (const section of song.profile) {
    if (relativeTime >= section.from && relativeTime < section.to) {
      return section;
    }
  }
  return song.profile[song.profile.length - 1];
}

function chooseLane(rand, previousLane) {
  let lane = Math.floor(rand() * 4);
  if (lane === previousLane && rand() < 0.72) {
    lane = (lane + 1 + Math.floor(rand() * 2)) % 4;
  }
  return lane;
}

function createTapNote(id, lane, time, travelTime) {
  return {
    id,
    lane,
    type: "tap",
    time,
    travelTime,
    endTime: time,
    judged: false,
    muted: false,
    hit: false,
    element: null,
    topY: -9999,
    bottomY: -9999,
    overlapRatio: 0
  };
}

function createHoldNote(id, lane, time, duration, travelTime) {
  return {
    id,
    lane,
    type: "hold",
    time,
    travelTime,
    duration,
    endTime: time + duration,
    judged: false,
    muted: false,
    hit: false,
    started: false,
    headGrade: null,
    heldTime: 0,
    unheldGap: 0,
    trailHeight: 0,
    holdSparkEl: null,
    element: null,
    topY: -9999,
    bottomY: -9999,
    overlapRatio: 0
  };
}

function getTravelTimeForNote(song, absoluteTime) {
  const relative = absoluteTime - song.startAt;
  if (!song.speedProfile || song.speedProfile.length === 0) {
    return song.baseTravelTime;
  }
  const section = song.speedProfile.find((item) => relative >= item.from && relative < item.to);
  const multiplier = section?.multiplier || 1;
  return Math.max(1.35, song.baseTravelTime / multiplier);
}

async function getSongAnalysis(song) {
  if (chartAnalysisCache.has(song.id)) {
    return chartAnalysisCache.get(song.id);
  }

  const beat = 60 / song.bpm;
  const fallback = {
    points: Array.from({ length: Math.floor((song.endAt - song.startAt) / (beat / 2)) }, (_, idx) => ({
      time: song.startAt + idx * (beat / 2),
      norm: idx % 2 === 0 ? 0.68 : 0.42
    }))
  };

  try {
    const response = await fetch(song.url);
    const buffer = await response.arrayBuffer();
    if (!chartAudioContext) {
      chartAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const audioBuffer = await chartAudioContext.decodeAudioData(buffer.slice(0));
    const sampleRate = audioBuffer.sampleRate;
    const channels = Math.min(2, audioBuffer.numberOfChannels);
    const channelData = [];
    for (let i = 0; i < channels; i += 1) {
      channelData.push(audioBuffer.getChannelData(i));
    }

    const points = [];
    const step = beat / 2;
    for (let t = song.startAt; t < song.endAt; t += step) {
      const startIdx = Math.max(0, Math.floor((t - 0.03) * sampleRate));
      const endIdx = Math.min(audioBuffer.length, Math.floor((t + 0.08) * sampleRate));
      if (endIdx <= startIdx + 4) {
        points.push({ time: t, energy: 0 });
        continue;
      }

      let sum = 0;
      let count = 0;
      for (let i = startIdx; i < endIdx; i += 1) {
        let mixed = 0;
        for (let c = 0; c < channels; c += 1) {
          mixed += channelData[c][i];
        }
        mixed /= channels;
        sum += mixed * mixed;
        count += 1;
      }
      points.push({ time: t, energy: Math.sqrt(sum / Math.max(1, count)) });
    }

    const energies = points.map((p) => p.energy).sort((a, b) => a - b);
    const maxEnergy = energies[energies.length - 1] || 1;
    const baseline = energies[Math.floor(energies.length * 0.62)] || maxEnergy * 0.5;
    const analyzed = {
      points: points.map((point) => ({
        time: point.time,
        norm: Math.max(0, Math.min(1, (point.energy - baseline * 0.55) / Math.max(0.0001, maxEnergy - baseline * 0.45)))
      }))
    };
    chartAnalysisCache.set(song.id, analyzed);
    return analyzed;
  } catch {
    chartAnalysisCache.set(song.id, fallback);
    return fallback;
  }
}

function createChart(song, analysis) {
  const rand = makeRandom(`${song.id}-${Date.now()}`);
  const beat = 60 / song.bpm;
  const notes = [];
  const laneAvailableAt = [song.startAt, song.startAt, song.startAt, song.startAt];
  const secondLoad = new Map();
  const activeHoldEndTimes = [];
  const points = analysis?.points || [];
  let id = 0;
  let previousLane = -1;

  function pruneActiveHolds(currentTime) {
    for (let i = activeHoldEndTimes.length - 1; i >= 0; i -= 1) {
      if (activeHoldEndTimes[i] <= currentTime) {
        activeHoldEndTimes.splice(i, 1);
      }
    }
  }

  for (const point of points) {
    const eventTime = point.time;
    const section = getSection(song, eventTime - song.startAt);
    const chance = Math.max(0.12, section.density * song.densityScale * (0.35 + point.norm * 0.95));
    pruneActiveHolds(eventTime);
    const activeHoldCount = activeHoldEndTimes.length;
    const secondBucket = Math.floor(eventTime);
    const secondCount = secondLoad.get(secondBucket) || 0;
    const maxStartsAllowedNow = Math.max(0, MAX_CONCURRENT_REQUIRED_KEYS - activeHoldCount);

    if (rand() < chance && secondCount < song.maxNotesPerSecond && maxStartsAllowedNow > 0) {
      const plannedLanes = [];
      const firstLane = chooseLane(rand, previousLane);
      plannedLanes.push(firstLane);

      if (
        rand() < section.chaos * song.chordChanceScale * (0.55 + point.norm * 0.7) &&
        secondCount + plannedLanes.length < song.maxNotesPerSecond &&
        plannedLanes.length < maxStartsAllowedNow
      ) {
        const secondLane = (firstLane + 1 + Math.floor(rand() * 3)) % 4;
        if (!plannedLanes.includes(secondLane)) {
          plannedLanes.push(secondLane);
        }
      }

      let startsPlaced = 0;
      for (const lane of plannedLanes) {
        if (startsPlaced >= maxStartsAllowedNow) {
          break;
        }
        if (eventTime < laneAvailableAt[lane]) {
          continue;
        }

        if ((secondLoad.get(secondBucket) || 0) >= song.maxNotesPerSecond) {
          continue;
        }

        const noteTravelTime = getTravelTimeForNote(song, eventTime);
        const makeHold = rand() < song.holdChanceBase + section.chaos * 0.03 + (point.norm > 0.72 ? 0.025 : 0);
        if (makeHold) {
          const holdBeats = 2 + Math.floor(rand() * (point.norm > 0.7 ? 4 : 3));
          const duration = holdBeats * beat;
          if (eventTime + duration < song.endAt - 1) {
            notes.push(createHoldNote(id += 1, lane, eventTime, duration, noteTravelTime));
            laneAvailableAt[lane] = eventTime + duration + beat * 0.18;
            secondLoad.set(secondBucket, (secondLoad.get(secondBucket) || 0) + 1);
            activeHoldEndTimes.push(eventTime + duration);
            startsPlaced += 1;
            continue;
          }
        }

        notes.push(createTapNote(id += 1, lane, eventTime, noteTravelTime));
        laneAvailableAt[lane] = eventTime + beat * 0.24;
        secondLoad.set(secondBucket, (secondLoad.get(secondBucket) || 0) + 1);
        startsPlaced += 1;
      }

      previousLane = firstLane;
    }
  }

  return sanitizeChart(song, notes.sort((a, b) => a.time - b.time));
}

function sanitizeChart(song, notes) {
  const kept = [];
  const activeHoldEnds = [];
  const recentStarts = [];
  const secondLoad = new Map();

  for (const note of notes) {
    for (let i = activeHoldEnds.length - 1; i >= 0; i -= 1) {
      if (activeHoldEnds[i] <= note.time) {
        activeHoldEnds.splice(i, 1);
      }
    }

    while (recentStarts.length > 0 && recentStarts[0] < note.time - MAX_TOUCH_WINDOW_SECONDS) {
      recentStarts.shift();
    }

    const secondBucket = Math.floor(note.time);
    const startsInSecond = secondLoad.get(secondBucket) || 0;
    if (startsInSecond >= song.maxNotesPerSecond) {
      continue;
    }
    if (activeHoldEnds.length >= MAX_CONCURRENT_REQUIRED_KEYS) {
      continue;
    }
    if (activeHoldEnds.length + recentStarts.length >= MAX_CONCURRENT_REQUIRED_KEYS) {
      continue;
    }

    kept.push(note);
    secondLoad.set(secondBucket, startsInSecond + 1);
    recentStarts.push(note.time);
    if (note.type === "hold") {
      activeHoldEnds.push(note.endTime);
    }
  }

  return kept;
}

function updateZoneBounds() {
  const zoneRect = elements.detectZone.getBoundingClientRect();
  const fieldRect = elements.playfield.getBoundingClientRect();
  state.zoneTopY = zoneRect.top - fieldRect.top;
  state.zoneBottomY = state.zoneTopY + zoneRect.height;
}

function getZoneCenterY() {
  return (state.zoneTopY + state.zoneBottomY) / 2;
}

function createNoteElement(note) {
  const meta = DIRECTION_META[note.lane];
  const noteEl = document.createElement("div");
  noteEl.className = `note ${meta.cls}${note.type === "hold" ? " hold" : ""}`;
  noteEl.style.left = `${note.lane * 25}%`;
  noteEl.style.display = "none";
  noteEl.textContent = meta.symbol;
  if (note.type === "hold") {
    const pxPerSecond = getZoneCenterY() / note.travelTime;
    const trailHeight = Math.max(40, Math.round(note.duration * pxPerSecond));
    const totalHeight = trailHeight + HOLD_HEAD_HEIGHT;
    note.trailHeight = trailHeight;
    noteEl.style.height = `${totalHeight}px`;
    noteEl.innerHTML = `<span class="trail"></span><span class="head">${meta.symbol}</span>`;
  }
  elements.notesLayer.appendChild(noteEl);
  note.element = noteEl;
}

function updateHud() {
  elements.scoreValue.textContent = String(state.score);
  elements.comboValue.textContent = String(state.combo);
  const judged = state.totalJudgedNotes;
  const total = judged === 0 ? 0 : (state.successfulNotes / judged) * 100;
  elements.successValue.textContent = `${total.toFixed(1)}%`;
}

function showJudgement(text, color) {
  elements.judgementText.textContent = text;
  elements.judgementText.style.color = color;
}

function triggerHapticSuccess(durationMs = 16) {
  const now = performance.now();
  if (now - state.lastHapticAtMs < HAPTIC_COOLDOWN_MS) {
    return;
  }
  state.lastHapticAtMs = now;

  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(durationMs);
  }

  elements.playfield.classList.add("hit-pulse");
  setTimeout(() => {
    elements.playfield.classList.remove("hit-pulse");
  }, 80);
}

function spawnSpark(note) {
  if (!note || typeof note.topY !== "number") {
    return;
  }
  const spark = document.createElement("div");
  spark.className = "spark";
  spark.style.left = `${note.lane * 25 + 12.5}%`;
  spark.style.top = `${Math.max(10, note.topY - 12)}px`;
  elements.notesLayer.appendChild(spark);
  setTimeout(() => {
    spark.remove();
  }, 500);
}

function spawnHoldSpark(note) {
  if (!note || note.holdSparkEl) {
    return;
  }
  const spark = document.createElement("div");
  spark.className = "hold-spark";
  note.holdSparkEl = spark;
  elements.notesLayer.appendChild(spark);
  updateHoldSparkPosition(note);
}

function updateHoldSparkPosition(note) {
  if (!note?.holdSparkEl || typeof note.topY !== "number") {
    return;
  }
  note.holdSparkEl.style.left = `${note.lane * 25 + 12.5}%`;
  note.holdSparkEl.style.top = `${Math.max(8, note.topY - 12)}px`;
}

function endHoldSpark(note) {
  if (!note?.holdSparkEl) {
    return;
  }
  const spark = note.holdSparkEl;
  note.holdSparkEl = null;
  spark.classList.add("end");
  setTimeout(() => {
    spark.remove();
  }, 500);
}

function removeHoldSpark(note) {
  if (!note?.holdSparkEl) {
    return;
  }
  note.holdSparkEl.remove();
  note.holdSparkEl = null;
}

function judgeFromOverlap(overlapRatio) {
  for (const rule of GRADE_RULES) {
    if (overlapRatio >= rule.min) {
      return rule;
    }
  }
  return GRADE_RULES[GRADE_RULES.length - 1];
}

function markMiss(note) {
  if (note.judged) {
    return;
  }
  note.judged = true;
  state.totalJudgedNotes += 1;
  state.combo = 0;
  if (note.element) {
    note.element.classList.add("hit");
  }
  removeHoldSpark(note);
  showJudgement("MISS", "#ff7f9c");
  updateHud();
}

function markTapHit(note, overlapRatio) {
  const grade = judgeFromOverlap(overlapRatio);
  note.judged = true;
  note.hit = grade.success;
  state.totalJudgedNotes += 1;

  if (grade.success) {
    state.successHits += 1;
    state.successfulNotes += 1;
    state.combo += 1;
    state.score += grade.points + Math.floor(state.combo * 0.8);
    triggerHapticSuccess(18);
    spawnSpark(note);
  } else {
    state.combo = 0;
  }

  if (note.element) {
    note.element.classList.add("hit");
  }
  showJudgement(grade.name, grade.color);
  updateHud();
}

function markWrongKeyPress() {
  if (state.combo > 0) {
    state.combo = 0;
  }
  showJudgement("WRONG KEY", "#ff9a9a");
  updateHud();
}

function finalizeHold(note, reason = "end") {
  if (note.judged) {
    return;
  }
  note.judged = true;
  note.hit = note.heldTime > 0;
  state.totalJudgedNotes += 1;

  const heldRatio = Math.max(0, Math.min(1, note.heldTime / note.duration));
  state.successHits += heldRatio;
  if (heldRatio >= 0.98) {
    state.successfulNotes += 1;
  }

  // Partial hold should not unexpectedly break combo.
  if (heldRatio > 0) {
    state.combo += 1;
    triggerHapticSuccess(20);
  } else {
    state.combo = 0;
  }

  const startBonus = note.headGrade?.points || 0;
  const holdPoints = Math.round(HOLD_MAX_POINTS * heldRatio);
  state.score += holdPoints + Math.round(startBonus * 0.35);

  if (note.element) {
    note.element.classList.add("hit");
  }
  endHoldSpark(note);
  const label = reason === "break" ? "HOLD BREAK" : "HOLD";
  showJudgement(`${label} ${Math.round(heldRatio * 100)}%`, "#d4a4ff");
  updateHud();
}

function computeNotePosition(note, songTime) {
  const spawnTime = note.time - note.travelTime;
  const progress = (songTime - spawnTime) / note.travelTime;
  const headTop = progress * getZoneCenterY();
  const headHeight = HOLD_HEAD_HEIGHT;
  const trailHeight = note.type === "hold" ? (note.trailHeight || Math.max(40, Math.round(note.duration * (getZoneCenterY() / note.travelTime)))) : 0;
  const renderTop = note.type === "hold" ? headTop - trailHeight : headTop;
  const renderBottom = headTop + headHeight;
  return { headTop, headBottom: headTop + headHeight, renderTop, renderBottom, headHeight };
}

function getOverlapRatio(top, bottom, height) {
  const overlapPx = Math.max(0, Math.min(bottom, state.zoneBottomY) - Math.max(top, state.zoneTopY));
  return overlapPx / height;
}

function renderNotes(songTime) {
  const playfieldHeight = elements.playfield.clientHeight;

  for (const note of state.notes) {
    if (note.judged) {
      continue;
    }

    const position = computeNotePosition(note, songTime);
    note.topY = position.headTop;
    note.bottomY = position.headBottom;
    note.overlapRatio = getOverlapRatio(position.headTop, position.headBottom, position.headHeight);
    if (note.type === "hold" && note.started) {
      updateHoldSparkPosition(note);
    }

    if (note.type === "tap" && position.headTop > state.zoneBottomY) {
      markMiss(note);
      continue;
    }

    if (note.type === "hold" && !note.started && position.headTop > state.zoneBottomY) {
      markMiss(note);
      continue;
    }

    if (note.type === "hold" && note.started && songTime >= note.endTime) {
      finalizeHold(note, "end");
      continue;
    }

    if (position.renderBottom < -120 || position.renderTop > playfieldHeight + 120) {
      note.element.style.display = "none";
    } else {
      note.element.style.display = "grid";
      note.element.style.transform = `translateY(${position.renderTop.toFixed(2)}px)`;
    }
  }
}

function getBestTapCandidate(lane) {
  const laneNotes = state.noteMapByLane[lane];
  let best = null;
  let bestOverlap = 0;

  for (const note of laneNotes) {
    if (note.judged || note.type !== "tap") {
      continue;
    }
    if (note.overlapRatio > bestOverlap) {
      bestOverlap = note.overlapRatio;
      best = note;
    }
  }
  return { note: best, overlap: bestOverlap };
}

function getBestHoldStartCandidate(lane) {
  const laneNotes = state.noteMapByLane[lane];
  let best = null;
  let bestOverlap = 0;

  for (const note of laneNotes) {
    if (note.judged || note.type !== "hold" || note.started) {
      continue;
    }
    if (note.overlapRatio > bestOverlap) {
      bestOverlap = note.overlapRatio;
      best = note;
    }
  }
  return { note: best, overlap: bestOverlap };
}

function hasAnyNoteTouchingZone() {
  return state.notes.some((note) => !note.judged && note.overlapRatio > 0);
}

function hasActiveStartedHold() {
  return state.notes.some((note) => note.type === "hold" && note.started && !note.judged);
}

function consumeTopTouchableNoteAsMiss(songTime) {
  const candidates = Array.from(getRequiredLaneCandidates(songTime).values())
    .map((item) => item.note)
    .filter((note) => note.type === "tap" || (note.type === "hold" && !note.started));
  if (candidates.length === 0) {
    return false;
  }
  candidates.sort((a, b) => b.overlapRatio - a.overlapRatio);
  markMiss(candidates[0]);
  return true;
}

function getRequiredLaneCandidates(songTime) {
  const laneCandidates = new Map();
  for (const note of state.notes) {
    if (note.judged) {
      continue;
    }

    let isRequired = false;
    let priority = 0;
    if (note.type === "hold") {
      if (note.started && songTime < note.endTime) {
        isRequired = true;
        priority = 1000;
      } else if (!note.started && note.overlapRatio > 0) {
        isRequired = true;
        priority = 230 + note.overlapRatio;
      }
    } else if (note.overlapRatio > 0) {
      isRequired = true;
      priority = 130 + note.overlapRatio;
    }

    if (!isRequired) {
      continue;
    }

    const existing = laneCandidates.get(note.lane);
    if (!existing || existing.priority < priority) {
      laneCandidates.set(note.lane, { note, priority });
    }
  }
  return laneCandidates;
}

function muteOverflowNote(note) {
  if (!note || note.judged) {
    return false;
  }
  note.judged = true;
  note.muted = true;
  removeHoldSpark(note);
  if (note.element) {
    note.element.style.display = "none";
  }
  return true;
}

function enforceConcurrentCap(songTime) {
  const laneCandidates = getRequiredLaneCandidates(songTime);
  const overflow = Math.max(0, laneCandidates.size - MAX_CONCURRENT_REQUIRED_KEYS);
  let changed = false;
  if (overflow > 0) {
    const sorted = Array.from(laneCandidates.values()).sort((a, b) => b.priority - a.priority);
    const toMute = sorted.slice(MAX_CONCURRENT_REQUIRED_KEYS);
    for (const item of toMute) {
      changed = muteOverflowNote(item.note) || changed;
    }
  }
  return changed;
}

function processJustPressedInputs(songTime) {
  if (state.justPressedLanes.size === 0) {
    return;
  }

  const lanes = Array.from(state.justPressedLanes);
  state.justPressedLanes.clear();
  const anyTouching = hasAnyNoteTouchingZone();
  const actions = [];
  let hasWrongPress = false;

  for (const lane of lanes) {
    const holdCandidate = getBestHoldStartCandidate(lane);
    if (holdCandidate.note && holdCandidate.overlap > 0) {
      actions.push({ kind: "holdStart", note: holdCandidate.note, overlap: holdCandidate.overlap });
      continue;
    }

    const tapCandidate = getBestTapCandidate(lane);
    if (tapCandidate.note && tapCandidate.overlap > 0) {
      actions.push({ kind: "tap", note: tapCandidate.note, overlap: tapCandidate.overlap });
      continue;
    }

    if (anyTouching) {
      hasWrongPress = true;
    }
  }

  if (hasWrongPress) {
    if (hasActiveStartedHold()) {
      return;
    }
    consumeTopTouchableNoteAsMiss(songTime);
    markWrongKeyPress();
    return;
  }

  for (const action of actions) {
    if (action.kind === "tap") {
      markTapHit(action.note, action.overlap);
      continue;
    }
    if (action.kind === "holdStart") {
      startHold(action.note, action.overlap);
    }
  }
}

function startHold(note, overlapRatio) {
  if (!note || note.judged || note.started || note.type !== "hold" || overlapRatio <= 0) {
    return false;
  }
  note.started = true;
  note.headGrade = judgeFromOverlap(overlapRatio);
  note.unheldGap = 0;
  triggerHapticSuccess(12);
  spawnHoldSpark(note);
  showJudgement(`HOLD START ${note.headGrade.name}`, "#b4ffea");
  return true;
}

function processHeldKeyStarts() {
  if (state.pressedLanes.size === 0) {
    return;
  }
  for (const lane of state.pressedLanes) {
    const holdCandidate = getBestHoldStartCandidate(lane);
    if (holdCandidate.note && holdCandidate.overlap > 0) {
      startHold(holdCandidate.note, holdCandidate.overlap);
    }
  }
}

function updateHoldProgress(songTime) {
  const dtStart = Math.max(0, state.prevSongTime);
  const dtEnd = Math.max(dtStart, songTime);

  for (const note of state.notes) {
    if (note.judged || note.type !== "hold" || !note.started) {
      continue;
    }
    const holdWindowStart = Math.max(dtStart, note.time);
    const holdWindowEnd = Math.min(dtEnd, note.endTime);
    if (holdWindowEnd <= holdWindowStart) {
      continue;
    }

    const dt = holdWindowEnd - holdWindowStart;
    if (state.pressedLanes.has(note.lane)) {
      note.heldTime += dt;
      note.unheldGap = 0;
    } else if (note.unheldGap < HOLD_RELEASE_GRACE) {
      const graceLeft = HOLD_RELEASE_GRACE - note.unheldGap;
      note.heldTime += Math.min(dt, graceLeft);
      note.unheldGap += dt;
    } else {
      note.unheldGap += dt;
      finalizeHold(note, "break");
    }
  }
}

function getSongTime() {
  return elements.songAudio.currentTime;
}

function finalizeGame() {
  state.isPlaying = false;
  cancelAnimationFrame(state.animationHandle);
  elements.songAudio.pause();

  for (const note of state.notes) {
    if (note.type === "hold" && note.started && !note.judged) {
      finalizeHold(note, "end");
    }
  }

  const totalNotes = state.totalJudgedNotes || 1;
  const successPercent = (state.successfulNotes / totalNotes) * 100;
  elements.finalScore.textContent = String(state.score);
  elements.finalPercent.textContent = `${successPercent.toFixed(1)}% (${state.successfulNotes}/${state.totalJudgedNotes})`;
  elements.resultModal.classList.remove("hidden");
}

function gameLoop() {
  if (!state.isPlaying) {
    return;
  }

  updateZoneBounds();
  const songTime = getSongTime();
  renderNotes(songTime);
  const changedByCap = enforceConcurrentCap(songTime);
  if (changedByCap) {
    renderNotes(songTime);
  }
  processHeldKeyStarts();
  processJustPressedInputs(songTime);
  updateHoldProgress(songTime);
  state.prevSongTime = songTime;

  if (songTime >= state.chartEndTime + 0.5 || elements.songAudio.ended) {
    finalizeGame();
    return;
  }
  state.animationHandle = requestAnimationFrame(gameLoop);
}

function mountNotes() {
  elements.notesLayer.innerHTML = "";
  state.noteMapByLane = [[], [], [], []];
  for (const note of state.notes) {
    createNoteElement(note);
    state.noteMapByLane[note.lane].push(note);
  }
}

function resetGameStats() {
  state.score = 0;
  state.combo = 0;
  state.successHits = 0;
  state.successfulNotes = 0;
  state.totalJudgedNotes = 0;
  state.pressedLanes.clear();
  state.justPressedLanes.clear();
  state.prevSongTime = 0;
  updateHud();
  showJudgement("Ready", "#f4f5ff");
}

function switchScreen(target) {
  elements.homeScreen.classList.toggle("active", target === "home");
  elements.gameScreen.classList.toggle("active", target === "game");
}

function waitForAudioReady(audio, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    let finished = false;
    let timeoutId = null;

    const cleanup = () => {
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("loadedmetadata", onCanPlay);
      audio.removeEventListener("error", onError);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    const done = (handler) => {
      if (finished) {
        return;
      }
      finished = true;
      cleanup();
      handler();
    };

    const onCanPlay = () => done(resolve);
    const onError = () => done(() => reject(new Error("Audio load failed")));

    audio.addEventListener("canplay", onCanPlay, { once: true });
    audio.addEventListener("loadedmetadata", onCanPlay, { once: true });
    audio.addEventListener("error", onError, { once: true });

    timeoutId = setTimeout(() => {
      done(() => reject(new Error("Audio load timeout")));
    }, timeoutMs);
  });
}

async function startGame(songId) {
  const song = SONGS.find((item) => item.id === songId);
  if (!song) {
    return;
  }

  state.song = song;
  resetGameStats();
  const analysis = await getSongAnalysis(song);
  state.notes = createChart(song, analysis);
  state.chartEndTime = Math.min(song.endAt, state.notes[state.notes.length - 1]?.endTime + 1 || song.endAt);

  switchScreen("game");
  elements.resultModal.classList.add("hidden");
  elements.notesLayer.style.opacity = "0";
  updateZoneBounds();
  mountNotes();
  elements.currentSongName.textContent = `${song.title} - ${song.artist} (${song.stars}/5)`;

  elements.songAudio.pause();
  elements.songAudio.removeAttribute("src");
  elements.songAudio.load();
  elements.songAudio.src = song.url;
  elements.songAudio.load();
  elements.startBtn.disabled = true;

  try {
    await waitForAudioReady(elements.songAudio);
    await elements.songAudio.play();
    state.isPlaying = true;
    renderNotes(0);
    elements.notesLayer.style.opacity = "1";
    state.animationHandle = requestAnimationFrame(gameLoop);
  } catch (error) {
    switchScreen("home");
    alert("Audio playback failed. Please refresh the page and run from localhost (python3 -m http.server).");
  } finally {
    elements.startBtn.disabled = false;
  }
}

function stopAndReturnHome() {
  state.isPlaying = false;
  cancelAnimationFrame(state.animationHandle);
  elements.songAudio.pause();
  elements.songAudio.currentTime = 0;
  state.pressedLanes.clear();
  state.justPressedLanes.clear();
  for (const note of state.notes) {
    removeHoldSpark(note);
  }
  elements.notesLayer.style.opacity = "1";
  elements.resultModal.classList.add("hidden");
  switchScreen("home");
}

function initSongMenu() {
  const stars = (count) => "★★★★★".slice(0, count) + "☆☆☆☆☆".slice(count);
  const fragment = document.createDocumentFragment();
  for (const song of SONGS) {
    const option = document.createElement("option");
    option.value = song.id;
    option.textContent = `${song.title} (${song.artist}) - ${stars(song.stars)} ${song.stars}/5`;
    fragment.appendChild(option);
  }
  elements.songSelect.appendChild(fragment);
  elements.songSelect.value = SONGS[0].id;
}

function pickRandomSong() {
  const randomSong = SONGS[Math.floor(Math.random() * SONGS.length)];
  elements.songSelect.value = randomSong.id;
}

function mapEventToLane(eventKey) {
  return DIRECTION_META.find((item) => item.key === eventKey)?.lane;
}

function onKeyDown(event) {
  if (!state.isPlaying) {
    return;
  }
  const lane = mapEventToLane(event.key);
  if (lane === undefined) {
    return;
  }
  event.preventDefault();
  if (event.repeat) {
    return;
  }
  state.pressedLanes.add(lane);
  state.justPressedLanes.add(lane);
}

function onKeyUp(event) {
  const lane = mapEventToLane(event.key);
  if (lane === undefined) {
    return;
  }
  event.preventDefault();
  state.pressedLanes.delete(lane);
}

function setupEvents() {
  elements.startBtn.addEventListener("click", () => {
    startGame(elements.songSelect.value);
  });

  elements.randomSongBtn.addEventListener("click", pickRandomSong);

  elements.retryBtn.addEventListener("click", () => {
    elements.resultModal.classList.add("hidden");
    startGame(state.song?.id || elements.songSelect.value);
  });

  elements.homeBtn.addEventListener("click", stopAndReturnHome);
  elements.backHomeBtn.addEventListener("click", stopAndReturnHome);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
}

function init() {
  initSongMenu();
  setupEvents();
  updateHud();
}

init();
