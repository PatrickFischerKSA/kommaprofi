const LEVELS = [
  {
    id: "Starter",
    name: "Starter*in",
    tag: "Basis",
    blurb:
      "Kurze und klare Übungen: einfache Aufzählungen, Zusätze und erste sichere Nicht-Komma-Fälle.",
  },
  {
    id: "Azubi",
    name: "Azubi",
    tag: "Aufbau",
    blurb:
      "Mehr Satzgefühl: Nebensätze, Infinitivgruppen und erste Strukturentscheidungen ohne Layout-Hilfe.",
  },
  {
    id: "Profi",
    name: "Profi",
    tag: "Feinheiten",
    blurb:
      "Grenzfälle, freigestellte Kommas und Duden-Sonderregeln mit sauberer Begründung.",
    forceWhy: true,
  },
  {
    id: "Expert",
    name: "Expert*in",
    tag: "Komplex",
    blurb:
      "Mehrteilige Satzstrukturen, Einschübe und regelbasierte Entscheidungen unter Druck.",
    forceWhy: true,
  },
];

const STORAGE_KEY = "kommaprofi-progress-v2";
const OPTIONS_KEY = "kommaprofi-options-v1";
const ROUND_SIZE = 6;
const MISTAKE_IMAGE_SRC = "assets/Kommasetzen.jpg";
const MISTAKE_MEDIA = {
  1: {
    type: "image",
    src: MISTAKE_IMAGE_SRC,
    duration: 2200,
  },
  2: {
    type: "video",
    src: "assets/error-rotation-1.mp4",
    duration: 4500,
  },
  3: {
    type: "video",
    src: "assets/error-rotation-2.mp4",
    duration: 5000,
  },
};

const state = {
  rules: {},
  exercises: [],
  currentLevelId: LEVELS[0].id,
  round: [],
  currentIndex: 0,
  selectedSlots: new Set(),
  ruleSelections: {},
  attemptsOnTask: 0,
  locked: false,
  evaluation: null,
  progress: createEmptyProgress(),
  options: {
    requireWhy: false,
    chMode: false,
    errorMode: false,
  },
  mistakeStage: 0,
  mistakeHideTimer: null,
  mistakeResetTimer: null,
  restartPending: false,
};

const levelGridEl = document.getElementById("level-grid");
const overallProgressCopyEl = document.getElementById("overall-progress-copy");
const levelLabelEl = document.getElementById("level-label");
const taskTitleEl = document.getElementById("task-title");
const taskSubtitleEl = document.getElementById("task-subtitle");
const taskInstructionEl = document.getElementById("task-instruction");
const overallSolvedEl = document.getElementById("overall-solved");
const overallTotalEl = document.getElementById("overall-total");
const accuracyValueEl = document.getElementById("accuracy-value");
const accuracyCopyEl = document.getElementById("accuracy-copy");
const levelProgressEl = document.getElementById("level-progress");
const levelProgressCopyEl = document.getElementById("level-progress-copy");
const roundProgressEl = document.getElementById("round-progress");
const roundProgressCopyEl = document.getElementById("round-progress-copy");
const loadingBoxEl = document.getElementById("loading-box");
const trainerContentEl = document.getElementById("trainer-content");
const sentenceAreaEl = document.getElementById("sentence-area");
const rulePanelEl = document.getElementById("rule-panel");
const ruleAreaEl = document.getElementById("rule-area");
const feedbackBoxEl = document.getElementById("feedback-box");
const feedbackTextEl = document.getElementById("feedback-text");
const solutionBoxEl = document.getElementById("solution-box");
const requireWhyEl = document.getElementById("require-why");
const chModeEl = document.getElementById("ch-mode");
const errorModeEl = document.getElementById("error-mode");
const checkBtn = document.getElementById("check-btn");
const resetBtn = document.getElementById("reset-btn");
const nextBtn = document.getElementById("next-btn");
const newRoundBtn = document.getElementById("new-round-btn");
const rulebookListEl = document.getElementById("rulebook-list");
const mistakeMediaEl = document.getElementById("mistake-media");
const mistakeImageEl = document.getElementById("mistake-image");
const mistakeVideoEl = document.getElementById("mistake-video");

function createEmptyProgress() {
  return {
    attempts: 0,
    successes: 0,
    solvedIds: [],
    levelStats: Object.fromEntries(
      LEVELS.map((level) => [
        level.id,
        {
          attempts: 0,
          successes: 0,
          solvedIds: [],
        },
      ])
    ),
  };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyProgress();
    }

    const parsed = JSON.parse(raw);
    const fresh = createEmptyProgress();

    fresh.attempts = Number(parsed.attempts) || 0;
    fresh.successes = Number(parsed.successes) || 0;
    fresh.solvedIds = Array.isArray(parsed.solvedIds) ? parsed.solvedIds : [];

    LEVELS.forEach((level) => {
      const stats = parsed.levelStats?.[level.id] || {};
      fresh.levelStats[level.id] = {
        attempts: Number(stats.attempts) || 0,
        successes: Number(stats.successes) || 0,
        solvedIds: Array.isArray(stats.solvedIds) ? stats.solvedIds : [],
      };
    });

    return fresh;
  } catch (error) {
    console.warn("Fortschritt konnte nicht geladen werden.", error);
    return createEmptyProgress();
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function loadOptions() {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    state.options.requireWhy = Boolean(parsed.requireWhy);
    state.options.chMode = Boolean(parsed.chMode);
    state.options.errorMode = Boolean(parsed.errorMode);
  } catch (error) {
    console.warn("Optionen konnten nicht geladen werden.", error);
  }
}

function saveOptions() {
  localStorage.setItem(OPTIONS_KEY, JSON.stringify(state.options));
}

function clearMistakeTimers() {
  if (state.mistakeHideTimer) {
    window.clearTimeout(state.mistakeHideTimer);
    state.mistakeHideTimer = null;
  }

  if (state.mistakeResetTimer) {
    window.clearTimeout(state.mistakeResetTimer);
    state.mistakeResetTimer = null;
  }
}

function hideMistakeMedia() {
  mistakeMediaEl.classList.add("hidden");
  mistakeImageEl.classList.add("hidden");
  mistakeVideoEl.classList.add("hidden");
  mistakeVideoEl.pause();
  mistakeVideoEl.removeAttribute("src");
  mistakeVideoEl.load();
}

function applyMistakeStage() {
  document.body.classList.remove(
    "mistake-stage-1",
    "mistake-stage-2",
    "mistake-stage-3"
  );

  if (state.mistakeStage > 0) {
    document.body.classList.add(`mistake-stage-${state.mistakeStage}`);
  }
}

function clearMistakeMode() {
  clearMistakeTimers();
  state.mistakeStage = 0;
  state.restartPending = false;
  applyMistakeStage();
  hideMistakeMedia();
}

function restartTrainerFromBeginning() {
  clearMistakeMode();
  state.currentLevelId = LEVELS[0].id;
  startRound();
  setFeedback(
    "Der Fehlerrausch ist vorbei. Der Trainer startet wieder am Anfang.",
    "info"
  );
}

function showMistakeMedia(stage) {
  const config = MISTAKE_MEDIA[stage];
  if (!config) {
    return;
  }

  clearMistakeTimers();
  mistakeMediaEl.classList.remove("hidden");
  mistakeImageEl.classList.add("hidden");
  mistakeVideoEl.classList.add("hidden");

  if (config.type === "image") {
    mistakeImageEl.src = config.src;
    mistakeImageEl.classList.remove("hidden");
    state.mistakeHideTimer = window.setTimeout(() => {
      hideMistakeMedia();
    }, config.duration);
    return;
  }

  mistakeVideoEl.src = config.src;
  mistakeVideoEl.classList.remove("hidden");
  mistakeVideoEl.currentTime = 0;
  mistakeVideoEl.load();
  const playPromise = mistakeVideoEl.play();
  if (playPromise?.catch) {
    playPromise.catch(() => {});
  }

  if (stage === 3) {
    state.restartPending = true;
    state.mistakeResetTimer = window.setTimeout(() => {
      restartTrainerFromBeginning();
    }, config.duration);
    return;
  }

  state.mistakeHideTimer = window.setTimeout(() => {
    hideMistakeMedia();
  }, config.duration);
}

function triggerMistakeMode() {
  if (!state.options.errorMode || state.restartPending) {
    return;
  }

  state.mistakeStage = Math.min(state.mistakeStage + 1, 3);
  applyMistakeStage();
  showMistakeMedia(state.mistakeStage);
}

function levelMeta(levelId) {
  return LEVELS.find((level) => level.id === levelId);
}

function currentExercise() {
  return state.round[state.currentIndex];
}

function currentLevelExercises() {
  return state.exercises.filter((exercise) => exercise.level === state.currentLevelId);
}

function currentLevelStats() {
  return state.progress.levelStats[state.currentLevelId];
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function sortRuleCodes(codes) {
  return [...codes].sort((left, right) =>
    left.localeCompare(right, "de", { numeric: true })
  );
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function tokenize(text) {
  return normalizeWhitespace(text).split(" ");
}

function compileExercise(exercise) {
  const parts = exercise.text
    .split("|")
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
  const tokens = tokenize(parts.join(" "));
  const boundaryIndices = [];
  let prefix = "";

  for (let index = 0; index < parts.length - 1; index += 1) {
    prefix = prefix ? `${prefix} ${parts[index]}` : parts[index];
    boundaryIndices.push(tokenize(prefix).length - 1);
  }

  const slots = new Array(Math.max(0, tokens.length - 1)).fill("—");
  const reasons = new Array(slots.length).fill("");

  (exercise.slots || []).forEach((symbol, boundaryIndex) => {
    const tokenBoundary = boundaryIndices[boundaryIndex];
    if (tokenBoundary !== undefined) {
      slots[tokenBoundary] = symbol;
    }
  });

  (exercise.reasons || []).forEach((reason, boundaryIndex) => {
    const tokenBoundary = boundaryIndices[boundaryIndex];
    if (tokenBoundary !== undefined) {
      reasons[tokenBoundary] = reason;
    }
  });

  const alternativeSlots = (exercise.also_ok || []).map((variant) => {
    const result = new Array(slots.length).fill("—");

    variant.forEach((symbol, boundaryIndex) => {
      const tokenBoundary = boundaryIndices[boundaryIndex];
      if (tokenBoundary !== undefined) {
        result[tokenBoundary] = symbol;
      }
    });

    return result;
  });

  return {
    ...exercise,
    parts,
    tokens,
    slots,
    reasons,
    alternativeSlots,
  };
}

function formatSentence(exercise, slotArray) {
  const fragments = [];

  exercise.tokens.forEach((token, index) => {
    let fragment = token;
    if (slotArray[index] === ",") {
      fragment += ",";
    }
    fragments.push(fragment);
  });

  return fragments.join(" ");
}

function formatPrimarySolution(exercise) {
  return formatSentence(exercise, exercise.slots);
}

function getAlternativeSolutions(exercise) {
  return exercise.alternativeSlots.map((variant) => formatSentence(exercise, variant));
}

function currentNeedsWhy() {
  const meta = levelMeta(state.currentLevelId);
  return Boolean(meta?.forceWhy || state.options.requireWhy);
}

function getTotalExerciseCount() {
  return state.exercises.length;
}

function getAccuracy(progress = state.progress) {
  if (progress.attempts === 0) {
    return 0;
  }

  return Math.round((progress.successes / progress.attempts) * 100);
}

function setFeedback(message, tone = "info") {
  feedbackTextEl.textContent = message;
  feedbackBoxEl.className = `feedback-box ${tone}`;
}

function setLoading(message) {
  loadingBoxEl.textContent = message;
}

function buildRound(levelId) {
  const pool = state.exercises.filter((exercise) => exercise.level === levelId);
  const solvedSet = new Set(state.progress.levelStats[levelId]?.solvedIds || []);
  const unsolved = shuffle(pool.filter((exercise) => !solvedSet.has(exercise.id)));
  const solved = shuffle(pool.filter((exercise) => solvedSet.has(exercise.id)));
  const selected = [...unsolved, ...solved].slice(0, Math.min(ROUND_SIZE, pool.length));

  return selected;
}

function resetTaskState() {
  state.selectedSlots = new Set();
  state.ruleSelections = {};
  state.attemptsOnTask = 0;
  state.locked = false;
  state.evaluation = null;
  nextBtn.classList.add("hidden");
  checkBtn.disabled = false;
  resetBtn.disabled = false;
  solutionBoxEl.classList.add("hidden");
  solutionBoxEl.innerHTML = "";
}

function startRound() {
  if (state.restartPending) {
    return;
  }

  state.round = buildRound(state.currentLevelId);
  state.currentIndex = 0;
  resetTaskState();
  render();
  setFeedback(
    "Klicke zwischen den Wörtern auf die Punkte. Auch Aufgaben ohne Komma kannst du direkt prüfen.",
    "info"
  );
}

function startLevel(levelId) {
  if (state.restartPending) {
    return;
  }

  state.currentLevelId = levelId;
  startRound();
}

function buildUserSlots(exercise) {
  return exercise.tokens.slice(0, -1).map((_, index) =>
    state.selectedSlots.has(index) ? "," : "—"
  );
}

function matchesVariant(guess, variant, reasons, chMode) {
  for (let index = 0; index < guess.length; index += 1) {
    if (chMode && reasons[index] === "D132") {
      if (guess[index] === "," || guess[index] === "—") {
        continue;
      }
    }

    if (guess[index] !== variant[index]) {
      return false;
    }
  }

  return true;
}

function getVariantDistance(guess, variant, reasons, chMode) {
  let mismatches = 0;

  for (let index = 0; index < guess.length; index += 1) {
    if (chMode && reasons[index] === "D132") {
      continue;
    }

    if (guess[index] !== variant[index]) {
      mismatches += 1;
    }
  }

  return mismatches;
}

function getBestVariant(exercise, guess) {
  const variants = [exercise.slots, ...exercise.alternativeSlots];
  let best = variants[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  variants.forEach((variant) => {
    const distance = getVariantDistance(
      guess,
      variant,
      exercise.reasons,
      state.options.chMode
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      best = variant;
    }
  });

  return best;
}

function evaluateCurrentExercise() {
  const exercise = currentExercise();
  const guess = buildUserSlots(exercise);
  const variants = [exercise.slots, ...exercise.alternativeSlots];
  const matchingVariant = variants.find((variant) =>
    matchesVariant(guess, variant, exercise.reasons, state.options.chMode)
  );
  const target = matchingVariant || getBestVariant(exercise, guess);
  const missing = [];
  const extra = [];
  const wrongRules = [];
  const missingRules = [];

  guess.forEach((symbol, index) => {
    if (symbol === "—" && target[index] === ",") {
      missing.push(index);
    }

    if (symbol === "," && target[index] === "—") {
      extra.push(index);
    }

    if (symbol === "," && target[index] === ",") {
      const expectedRule = exercise.reasons[index];
      if (!state.ruleSelections[index] && currentNeedsWhy()) {
        missingRules.push(index);
      } else if (
        currentNeedsWhy() &&
        expectedRule &&
        state.ruleSelections[index] !== expectedRule
      ) {
        wrongRules.push(index);
      }
    }
  });

  const isCorrect =
    Boolean(matchingVariant) &&
    (!currentNeedsWhy() ||
      [...state.selectedSlots].every((index) => {
        const expectedRule = exercise.reasons[index];
        return !expectedRule || state.ruleSelections[index] === expectedRule;
      }));

  return {
    guess,
    target,
    isCorrect,
    missing,
    extra,
    wrongRules,
    missingRules,
  };
}

function getBoundaryLabel(exercise, index) {
  return `nach "${exercise.tokens[index]}"`;
}

function getContextSnippet(exercise, index) {
  const start = Math.max(0, index - 2);
  const end = Math.min(exercise.tokens.length - 1, index + 2);
  const left = exercise.tokens.slice(start, index + 1).join(" ");
  const right = exercise.tokens.slice(index + 1, end + 1).join(" ");
  return `${left} <mark>,</mark> ${right}`;
}

function buildHint(exercise, evaluation) {
  if (evaluation.missing.length > 0) {
    const index = evaluation.missing[0];
    const ruleCode = exercise.reasons[index];
    const ruleLabel = state.rules[ruleCode] || "passende Regel";
    return `Dir fehlt ein Komma ${getBoundaryLabel(
      exercise,
      index
    )}. Prüfe dort besonders die Struktur "${ruleCode}: ${ruleLabel}".`;
  }

  if (evaluation.extra.length > 0) {
    return `Mindestens ein Komma ist zu viel, zum Beispiel ${getBoundaryLabel(
      exercise,
      evaluation.extra[0]
    )}. Dort liegt vermutlich keine echte Satzgrenze vor.`;
  }

  if (evaluation.missingRules.length > 0) {
    return `Die Kommasetzung kann stimmen, aber mindestens einer gesetzten Stelle fehlt noch die Regelzuordnung.`;
  }

  if (evaluation.wrongRules.length > 0) {
    const index = evaluation.wrongRules[0];
    const expectedRule = exercise.reasons[index];
    return `Die gesetzte Stelle ${getBoundaryLabel(
      exercise,
      index
    )} braucht die Regel ${expectedRule}: ${state.rules[expectedRule] || "Duden-Regel"}.`;
  }

  return "Analysiere den Satz noch einmal von der Satzstruktur her: Was gehört zusammen, was ist Einschub, was ist Nebensatz?";
}

function lockTask() {
  state.locked = true;
  checkBtn.disabled = true;
  resetBtn.disabled = true;
  nextBtn.classList.remove("hidden");
}

function recordAttempt(success) {
  const levelStats = currentLevelStats();

  state.progress.attempts += 1;
  levelStats.attempts += 1;

  if (success) {
    state.progress.successes += 1;
    levelStats.successes += 1;

    const exerciseId = currentExercise().id;

    if (!state.progress.solvedIds.includes(exerciseId)) {
      state.progress.solvedIds.push(exerciseId);
    }

    if (!levelStats.solvedIds.includes(exerciseId)) {
      levelStats.solvedIds.push(exerciseId);
    }
  }

  saveProgress();
}

function renderLevelCards() {
  levelGridEl.innerHTML = "";

  LEVELS.forEach((level) => {
    const stats = state.progress.levelStats[level.id];
    const total = state.exercises.filter((exercise) => exercise.level === level.id).length;
    const solved = stats?.solvedIds.length || 0;
    const ratio = total === 0 ? 0 : Math.round((solved / total) * 100);

    const button = document.createElement("button");
    button.type = "button";
    button.className = `level-card${level.id === state.currentLevelId ? " active" : ""}`;
    button.addEventListener("click", () => startLevel(level.id));

    button.innerHTML = `
      <div class="level-top">
        <div>
          <p class="level-name">${level.name}</p>
        </div>
        <span class="level-tag">${level.tag}</span>
      </div>
      <p>${level.blurb}</p>
      <div class="level-progress-line">
        <span>${solved}/${total} gelöst</span>
        <div class="progress-bar" aria-hidden="true">
          <span style="width: ${ratio}%"></span>
        </div>
      </div>
    `;

    levelGridEl.appendChild(button);
  });

  overallProgressCopyEl.textContent = `${state.progress.solvedIds.length} von ${getTotalExerciseCount()} Aufgaben bereits gelöst`;
}

function renderRulebook() {
  rulebookListEl.innerHTML = "";
  const usedCodes = new Set();

  state.exercises.forEach((exercise) => {
    exercise.reasons.forEach((code) => {
      if (code) {
        usedCodes.add(code);
      }
    });
  });

  sortRuleCodes(usedCodes).forEach((code) => {
    const item = document.createElement("article");
    item.className = "rulebook-item";
    item.innerHTML = `<strong>${code}</strong><p>${state.rules[code] || "Beschreibung folgt."}</p>`;
    rulebookListEl.appendChild(item);
  });
}

function renderHeader() {
  const exercise = currentExercise();
  const meta = levelMeta(state.currentLevelId);
  const totalInLevel = currentLevelExercises().length;
  const solvedInLevel = currentLevelStats().solvedIds.length;
  const accuracy = getAccuracy();

  levelLabelEl.textContent = meta?.name || state.currentLevelId;
  taskTitleEl.textContent = exercise
    ? `Aufgabe ${state.currentIndex + 1} von ${state.round.length}`
    : "Keine Aufgabe verfügbar";
  taskSubtitleEl.textContent = exercise
    ? `${exercise.id} im Niveau ${meta?.name}. Diese Runde bevorzugt neue Aufgaben, wiederholt aber bei Bedarf bereits gelöste.`
    : "Es konnte keine Übung für dieses Niveau geladen werden.";
  taskInstructionEl.textContent = currentNeedsWhy()
    ? "Setze die Kommas und ordne jeder gesetzten Stelle den passenden Duden-Code zu."
    : "Setze alle nötigen Kommas. Auch kein Komma kann die richtige Lösung sein.";

  overallSolvedEl.textContent = String(state.progress.solvedIds.length);
  overallTotalEl.textContent = `von ${getTotalExerciseCount()}`;
  accuracyValueEl.textContent = `${accuracy}%`;
  accuracyCopyEl.textContent =
    state.progress.attempts === 0
      ? "Noch keine Prüfung"
      : `${state.progress.successes} von ${state.progress.attempts} Versuchen korrekt`;
  levelProgressEl.textContent = `${solvedInLevel}/${totalInLevel}`;
  levelProgressCopyEl.textContent =
    solvedInLevel === 0
      ? "Noch keine Aufgabe gelöst"
      : `${Math.round((solvedInLevel / totalInLevel) * 100)}% des Niveaus geschafft`;
  roundProgressEl.textContent = exercise
    ? `${state.currentIndex + 1}/${state.round.length}`
    : "0/0";
  roundProgressCopyEl.textContent = exercise
    ? `Aktuelle Runde im Niveau ${meta?.name}`
    : "Noch nicht gestartet";
}

function renderSentence() {
  sentenceAreaEl.innerHTML = "";
  const exercise = currentExercise();

  if (!exercise) {
    return;
  }

  exercise.tokens.forEach((token, index) => {
    const tokenEl = document.createElement("span");
    tokenEl.className = "token";
    tokenEl.textContent = token;
    sentenceAreaEl.appendChild(tokenEl);

    if (index < exercise.tokens.length - 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `comma-btn${state.selectedSlots.has(index) ? " active" : ""}${
        state.locked ? " locked" : ""
      }`;
      button.dataset.index = String(index);
      button.textContent = state.selectedSlots.has(index) ? "," : "·";
      button.setAttribute(
        "aria-label",
        `${state.selectedSlots.has(index) ? "Komma entfernen" : "Komma setzen"} ${getBoundaryLabel(
          exercise,
          index
        )}`
      );
      button.disabled = state.locked;
      button.addEventListener("click", () => toggleSlot(index));
      sentenceAreaEl.appendChild(button);
    }
  });
}

function renderRulePanel() {
  ruleAreaEl.innerHTML = "";

  if (!currentNeedsWhy()) {
    rulePanelEl.classList.add("hidden");
    return;
  }

  rulePanelEl.classList.remove("hidden");
  const exercise = currentExercise();
  const selected = [...state.selectedSlots].sort((left, right) => left - right);

  if (selected.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "rule-context";
    emptyState.textContent =
      "Sobald du ein Komma setzt, kannst du die passende Duden-Regel direkt zuordnen.";
    ruleAreaEl.appendChild(emptyState);
    return;
  }

  selected.forEach((index, position) => {
    const card = document.createElement("article");
    card.className = "rule-card";

    const context = document.createElement("p");
    context.className = "rule-context";
    context.innerHTML = `Stelle ${position + 1}: ${getContextSnippet(exercise, index)}`;

    const select = document.createElement("select");
    select.className = "rule-select";
    select.dataset.index = String(index);

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Regel wählen";
    select.appendChild(placeholder);

    sortRuleCodes(Object.keys(state.rules)).forEach((code) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = `${code}: ${state.rules[code]}`;
      option.selected = state.ruleSelections[index] === code;
      select.appendChild(option);
    });

    select.disabled = state.locked;
    select.addEventListener("change", (event) => {
      state.ruleSelections[index] = event.target.value;
    });

    card.append(context, select);
    ruleAreaEl.appendChild(card);
  });
}

function renderSolution() {
  const exercise = currentExercise();
  const evaluation = state.evaluation;

  if (!exercise || !evaluation || !state.locked) {
    solutionBoxEl.classList.add("hidden");
    solutionBoxEl.innerHTML = "";
    return;
  }

  const alternativeSolutions = getAlternativeSolutions(exercise);
  const mistakeTags = [];

  evaluation.missing.forEach((index) => {
    mistakeTags.push(`Fehlte ${getBoundaryLabel(exercise, index)}`);
  });
  evaluation.extra.forEach((index) => {
    mistakeTags.push(`Zu viel ${getBoundaryLabel(exercise, index)}`);
  });
  evaluation.wrongRules.forEach((index) => {
    mistakeTags.push(`Falsche Regel ${exercise.reasons[index]} ${getBoundaryLabel(exercise, index)}`);
  });

  const explanationItems = exercise.reasons
    .map((code, index) => {
      if (!code || exercise.slots[index] !== ",") {
        return "";
      }

      return `<li><strong>${code}</strong> ${getBoundaryLabel(exercise, index)}: ${
        state.rules[code] || "Duden-Regel"
      }</li>`;
    })
    .filter(Boolean)
    .join("");

  solutionBoxEl.innerHTML = `
    <div class="solution-header">
      <div>
        <p class="eyebrow">Musterlösung</p>
        <h3>${formatPrimarySolution(exercise)}</h3>
      </div>
    </div>
    ${
      mistakeTags.length > 0
        ? `<div class="mistake-tags">${mistakeTags
            .map((tag) => `<span class="mistake-tag">${tag}</span>`)
            .join("")}</div>`
        : ""
    }
    ${
      alternativeSolutions.length > 0
        ? `<div class="solution-callout"><strong>Auch akzeptiert:</strong> ${alternativeSolutions.join(
            " | "
          )}</div>`
        : ""
    }
    ${
      exercise.note
        ? `<div class="note-box"><strong>Hinweis:</strong> ${exercise.note}</div>`
        : ""
    }
    ${
      explanationItems
        ? `<div class="solution-list"><h4>Regelbegründung</h4><ul>${explanationItems}</ul></div>`
        : ""
    }
    <div class="solution-chip-row">
      <span class="solution-chip">ID ${exercise.id}</span>
      <span class="solution-chip">Niveau ${state.currentLevelId}</span>
      <span class="solution-chip">${
        currentNeedsWhy() ? "Mit Regelzuordnung" : "Nur Kommasetzung"
      }</span>
    </div>
  `;

  solutionBoxEl.classList.remove("hidden");
}

function render() {
  renderLevelCards();
  renderHeader();
  renderSentence();
  renderRulePanel();
  renderSolution();
}

function toggleSlot(index) {
  if (state.locked || state.restartPending) {
    return;
  }

  if (state.selectedSlots.has(index)) {
    state.selectedSlots.delete(index);
    delete state.ruleSelections[index];
  } else {
    state.selectedSlots.add(index);
  }

  renderSentence();
  renderRulePanel();
}

function clearSelection() {
  if (state.locked || state.restartPending) {
    return;
  }

  state.selectedSlots = new Set();
  state.ruleSelections = {};
  state.evaluation = null;
  solutionBoxEl.classList.add("hidden");
  solutionBoxEl.innerHTML = "";
  renderSentence();
  renderRulePanel();
  setFeedback("Auswahl gelöscht. Du kannst den Satz jetzt neu analysieren.", "info");
}

function handleSuccess() {
  recordAttempt(true);
  state.evaluation = evaluateCurrentExercise();
  setFeedback(
    currentNeedsWhy()
      ? "Stark. Kommasetzung und Regelzuordnung stimmen."
      : "Stark. Die Kommasetzung stimmt.",
    "success"
  );
  lockTask();
  render();
}

function handleFailure() {
  const exercise = currentExercise();
  recordAttempt(false);
  state.attemptsOnTask += 1;
  state.evaluation = evaluateCurrentExercise();
  triggerMistakeMode();

  if (state.attemptsOnTask < 2) {
    setFeedback(buildHint(exercise, state.evaluation), "error");
    solutionBoxEl.classList.add("hidden");
    solutionBoxEl.innerHTML = "";
    return;
  }

  setFeedback(
    "Noch nicht korrekt. Die Musterlösung ist jetzt sichtbar, damit du die Satzstruktur gezielt nacharbeiten kannst.",
    "error"
  );
  lockTask();
  render();
}

function checkCurrentTask() {
  const exercise = currentExercise();

  if (!exercise || state.restartPending) {
    return;
  }

  if (currentNeedsWhy()) {
    const selected = [...state.selectedSlots];
    const unassigned = selected.filter((index) => !state.ruleSelections[index]);
    if (unassigned.length > 0) {
      setFeedback("Ordne jedem gesetzten Komma zuerst eine Regel zu.", "error");
      return;
    }
  }

  const evaluation = evaluateCurrentExercise();
  state.evaluation = evaluation;

  if (evaluation.isCorrect) {
    handleSuccess();
    return;
  }

  handleFailure();
}

function nextTask() {
  if (state.restartPending) {
    return;
  }

  if (state.currentIndex < state.round.length - 1) {
    state.currentIndex += 1;
  } else {
    state.round = buildRound(state.currentLevelId);
    state.currentIndex = 0;
  }

  resetTaskState();
  render();
  setFeedback(
    "Nächste Aufgabe geladen. Lies den Satz einmal komplett, bevor du einzelne Stellen anklickst.",
    "info"
  );
}

function handleOptionChange() {
  state.options.requireWhy = requireWhyEl.checked;
  state.options.chMode = chModeEl.checked;
  state.options.errorMode = errorModeEl.checked;
  saveOptions();
  if (!state.options.errorMode) {
    clearMistakeMode();
  }
  resetTaskState();
  render();
  setFeedback(
    currentNeedsWhy()
      ? "Regelbegründung ist aktiv. Jede gesetzte Stelle braucht jetzt einen Duden-Code."
      : state.options.errorMode
        ? "Modus aktualisiert. Fehlerbild, Videos und Trübungsstufen sind jetzt aktiv."
        : "Modus aktualisiert. Du trainierst jetzt nur die Kommasetzung.",
    "info"
  );
}

function initialiseData() {
  const rawRules = window.KOMMAPROFI_RULES;
  const rawExercises = window.KOMMAPROFI_EXERCISES;

  if (!rawRules || !rawExercises) {
    throw new Error("Die eingebetteten Übungsdaten konnten nicht gefunden werden.");
  }

  state.rules = rawRules;
  state.exercises = rawExercises.map(compileExercise);
  state.progress = loadProgress();
  loadOptions();

  requireWhyEl.checked = state.options.requireWhy;
  chModeEl.checked = state.options.chMode;
  errorModeEl.checked = state.options.errorMode;
  overallTotalEl.textContent = `von ${state.exercises.length}`;

  renderRulebook();
  loadingBoxEl.classList.add("hidden");
  trainerContentEl.classList.remove("hidden");
  startRound();
}

checkBtn.addEventListener("click", checkCurrentTask);
resetBtn.addEventListener("click", clearSelection);
nextBtn.addEventListener("click", nextTask);
newRoundBtn.addEventListener("click", startRound);
requireWhyEl.addEventListener("change", handleOptionChange);
chModeEl.addEventListener("change", handleOptionChange);
errorModeEl.addEventListener("change", handleOptionChange);

try {
  setLoading("Übungen werden vorbereitet ...");
  initialiseData();
} catch (error) {
  console.error(error);
  loadingBoxEl.classList.remove("hidden");
  trainerContentEl.classList.add("hidden");
  setLoading(
    "Die App konnte nicht gestartet werden. Bitte prüfe, ob alle Projektdateien vollständig geladen wurden."
  );
}
