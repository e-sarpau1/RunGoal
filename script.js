// =====================================
// RUNG OAL - DATA OG INNSTILLINGAR
// =====================================

const DEFAULT_SETTINGS = {
    targetDistance: 2.5,
    targetMinutes: 15,
    goalWeeks: 12,
    weeklyDistance: 2,
    runningDays: 2
};

function loadData(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
        console.error("Kunne ikkje lese lagra data:", error);
        return fallback;
    }
}

let settings = {
    ...DEFAULT_SETTINGS,
    ...loadData("rungoal-settings", {})
};

settings.targetDistance = Number(settings.targetDistance) || 2.5;
settings.targetMinutes = Number(settings.targetMinutes) || 15;
settings.goalWeeks = Number(settings.goalWeeks) || 12;
settings.weeklyDistance = Number(settings.weeklyDistance) || 2;

settings.runningDays = [1, 2, 3].includes(Number(settings.runningDays))
    ? Number(settings.runningDays)
    : 3;

// Gjer gamle registreringar kompatible med den nye versjonen.
let runs = loadData("rungoal-runs", []);

if (!Array.isArray(runs)) {
    runs = [];
}

runs = runs.map(run => ({
    ...run,
    id: String(run.id || createRunId()),
    distance: Number(run.distance),
    durationMs: Number(run.durationMs ?? run.elapsedMs),
    feeling: run.feeling || "normal"
})).filter(run =>
    Number.isFinite(run.distance) &&
    run.distance > 0 &&
    Number.isFinite(run.durationMs) &&
    run.durationMs > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(run.date)
);

const FEELING_LABELS = {
    easy: "Lett og behageleg",
    normal: "Passe tung",
    hard: "Tung",
    pain: "Smerter"
};


// =====================================
// HJELPEFUNKSJONAR
// =====================================

function createRunId() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveData() {
    try {
        localStorage.setItem("rungoal-settings", JSON.stringify(settings));
        localStorage.setItem("rungoal-runs", JSON.stringify(runs));
    } catch (error) {
        console.error("Kunne ikkje lagre data:", error);
        alert("Kunne ikkje lagre data. Kontroller lagringsplassen på eininga.");
    }
}

function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function dateFromString(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatDate(dateString) {
    return dateFromString(dateString).toLocaleDateString("nn-NO", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function getWeekStart(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);

    const day = (result.getDay() + 6) % 7;
    result.setDate(result.getDate() - day);

    return result;
}

function getWeekKey(dateString) {
    return getLocalDateString(getWeekStart(dateFromString(dateString)));
}

function getDaysSince(dateString) {
    const today = dateFromString(getLocalDateString(new Date()));
    const date = dateFromString(dateString);

    return Math.floor((today - date) / 86400000);
}

function formatDistance(distance) {
    return Number(distance).toLocaleString("nn-NO", {
        maximumFractionDigits: 2
    });
}

function formatPace(minutesPerKm) {
    if (!Number.isFinite(minutesPerKm) || minutesPerKm <= 0) {
        return "–";
    }

    const totalSeconds = Math.round(minutesPerKm * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDuration(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getRunPace(run) {
    return (run.durationMs / 60000) / run.distance;
}

function getRunSpeed(run) {
    return run.distance / (run.durationMs / 3600000);
}

function getLatestRun() {
    if (runs.length === 0) return null;

    return [...runs].sort((a, b) => {
        return b.date.localeCompare(a.date);
    })[0];
}

function getRunsThisWeek() {
    const start = getWeekStart(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return runs.filter(run => {
        const date = dateFromString(run.date);
        return date >= start && date < end;
    });
}


// =====================================
// NAVIGASJON
// =====================================

function openPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.toggle("active", page.id === pageId);
    });

    document.querySelectorAll(".nav-button").forEach(button => {
        button.classList.toggle("active", button.dataset.page === pageId);
    });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.page);
    });
});

document.querySelectorAll("[data-open-page]").forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.openPage);
    });
});


// =====================================
// MÅL OG INNSTILLINGAR
// =====================================

function fillGoalForm() {
    document.getElementById("targetDistance").value = settings.targetDistance;
    document.getElementById("targetMinutes").value = settings.targetMinutes;
    document.getElementById("goalWeeks").value = settings.goalWeeks;
    document.getElementById("weeklyDistance").value = settings.weeklyDistance;
    document.getElementById("runningDays").value = settings.runningDays;
}

document.getElementById("goalForm").addEventListener("submit", event => {
    event.preventDefault();

    const newSettings = {
        targetDistance: Number(document.getElementById("targetDistance").value),
        targetMinutes: Number(document.getElementById("targetMinutes").value),
        goalWeeks: Number(document.getElementById("goalWeeks").value),
        weeklyDistance: Number(document.getElementById("weeklyDistance").value),
        runningDays: Number(document.getElementById("runningDays").value)
    };

    if (
        !Number.isFinite(newSettings.targetDistance) ||
        newSettings.targetDistance <= 0 ||
        !Number.isFinite(newSettings.targetMinutes) ||
        newSettings.targetMinutes <= 0 ||
        !Number.isInteger(newSettings.goalWeeks) ||
        newSettings.goalWeeks < 1 ||
        newSettings.goalWeeks > 52 ||
        !Number.isFinite(newSettings.weeklyDistance) ||
        newSettings.weeklyDistance <= 0 ||
        ![1, 2, 3].includes(newSettings.runningDays)
    ) {
        alert("Kontroller at du har fylt inn gyldige verdiar.");
        return;
    }

    settings = newSettings;
    saveData();
    renderAll();

    alert("Målet ditt er lagra!");
});


// =====================================
// STOPPEKLOKKE
// =====================================

const stopwatchDisplay = document.getElementById("stopwatch");
const startButton = document.getElementById("startTimer");
const pauseButton = document.getElementById("pauseTimer");
const resetButton = document.getElementById("resetTimer");

let elapsedMs = 0;
let startedAt = null;
let timerInterval = null;

function getCurrentElapsed() {
    if (startedAt === null) {
        return elapsedMs;
    }

    return elapsedMs + (Date.now() - startedAt);
}

function updateStopwatchDisplay() {
    stopwatchDisplay.textContent = formatDuration(getCurrentElapsed());
}

function startStopwatch() {
    if (startedAt !== null) return;

    startedAt = Date.now();

    timerInterval = setInterval(updateStopwatchDisplay, 200);

    startButton.disabled = true;
    pauseButton.disabled = false;

    document.getElementById("timerStatus").textContent =
        "Stoppeklokka går. Denne tida blir brukt når du lagrar løpeturen.";

    updateStopwatchDisplay();
}

function pauseStopwatch() {
    if (startedAt === null) return;

    elapsedMs = getCurrentElapsed();
    startedAt = null;

    clearInterval(timerInterval);
    timerInterval = null;

    startButton.disabled = false;
    pauseButton.disabled = true;

    document.getElementById("timerStatus").textContent =
        "Stoppeklokka er sett på pause. Du kan starte henne igjen.";

    updateStopwatchDisplay();
}

function resetStopwatch() {
    if (startedAt !== null) {
        pauseStopwatch();
    }

    elapsedMs = 0;
    startedAt = null;

    clearInterval(timerInterval);
    timerInterval = null;

    startButton.disabled = false;
    pauseButton.disabled = true;

    document.getElementById("timerStatus").textContent =
        "Stoppeklokka er nullstilt.";

    updateStopwatchDisplay();
}

startButton.addEventListener("click", startStopwatch);
pauseButton.addEventListener("click", pauseStopwatch);
resetButton.addEventListener("click", resetStopwatch);


// =====================================
// REGISTRERE LØPETUR
// =====================================

document.getElementById("runDate").value = getLocalDateString(new Date());

document.getElementById("runForm").addEventListener("submit", event => {
    event.preventDefault();

    // Stoppar klokka dersom ho framleis går.
    if (startedAt !== null) {
        pauseStopwatch();
    }

    const distance = Number(document.getElementById("runDistance").value);
    const date = document.getElementById("runDate").value;
    const feeling = document.getElementById("runFeeling").value;

    const manualMinutes = Number(
        document.getElementById("manualMinutes").value || 0
    );

    const manualSeconds = Number(
        document.getElementById("manualSeconds").value || 0
    );

    if (!Number.isFinite(distance) || distance <= 0 || distance > 500) {
        alert("Skriv inn ei gyldig distanse.");
        return;
    }

    if (!date) {
        alert("Vel dato for løpeturen.");
        return;
    }

    if (date > getLocalDateString(new Date())) {
        alert("Datoen kan ikkje vere i framtida.");
        return;
    }

    let durationMs;

    // Stoppeklokka blir brukt dersom ho har vore starta.
    if (elapsedMs > 0) {
        durationMs = elapsedMs;
    } else {
        // Viss ikkje, brukar appen tida som er skriven inn manuelt.
        if (
            !Number.isInteger(manualMinutes) ||
            !Number.isInteger(manualSeconds) ||
            manualMinutes < 0 ||
            manualMinutes > 999 ||
            manualSeconds < 0 ||
            manualSeconds > 59
        ) {
            alert("Skriv inn ei gyldig tid.");
            return;
        }

        durationMs = (manualMinutes * 60 + manualSeconds) * 1000;
    }

    if (durationMs <= 0) {
        alert("Start stoppeklokka eller skriv inn tida manuelt.");
        return;
    }

    const run = {
        id: createRunId(),
        date: date,
        distance: distance,
        durationMs: durationMs,
        feeling: feeling
    };

    runs.push(run);

    saveData();
    resetStopwatch();

    document.getElementById("runForm").reset();
    document.getElementById("runDate").value = getLocalDateString(new Date());

    renderAll();
    openPage("dashboard");

    alert("Løpeturen er lagra!");
});


// =====================================
// FRAMSIDE OG STATISTIKK
// =====================================

function renderDashboard() {
    const totalDistance = runs.reduce((sum, run) => {
        return sum + run.distance;
    }, 0);

    const weekRuns = getRunsThisWeek();

    const weeklyDistance = weekRuns.reduce((sum, run) => {
        return sum + run.distance;
    }, 0);

    const bestRun = runs.reduce((best, run) => {
        if (!best || getRunPace(run) < getRunPace(best)) {
            return run;
        }

        return best;
    }, null);

    const longestRun = runs.reduce((longest, run) => {
        return Math.max(longest, run.distance);
    }, 0);

    document.getElementById("weekDistance").textContent =
        `${formatDistance(weeklyDistance)} / ${formatDistance(settings.weeklyDistance)} km`;

    document.getElementById("totalDistance").textContent =
        `${formatDistance(totalDistance)} km`;

    document.getElementById("runCount").textContent = runs.length;

    document.getElementById("bestPace").textContent =
        bestRun ? formatPace(getRunPace(bestRun)) : "–";

    document.getElementById("goalTitle").textContent =
        `${formatDistance(settings.targetDistance)} km på ${formatDistance(settings.targetMinutes)} min`;

    document.getElementById("progressDescription").textContent =
        `Lengste tur: ${formatDistance(longestRun)} av ${formatDistance(settings.targetDistance)} km`;

    const progress = Math.min(
        100,
        (longestRun / settings.targetDistance) * 100
    );

    document.getElementById("progressPercent").textContent =
        `${Math.round(progress)} %`;

    document.getElementById("progressBar").style.width =
        `${progress}%`;

    document.getElementById("goalPace").textContent =
        `${formatPace(settings.targetMinutes / settings.targetDistance)} min/km`;

    document.getElementById("weeksLeft").textContent =
        `${settings.goalWeeks} veker`;

    const weekStart = getWeekStart(new Date());

    document.getElementById("currentWeekLabel").textContent =
        `Frå ${weekStart.getDate()}/${weekStart.getMonth() + 1}`;

    renderNextRun();
}


// =====================================
// NESTE LØPETUR
// =====================================

function renderNextRun() {
    const title = document.getElementById("nextRunTitle");
    const text = document.getElementById("nextRunText");

    const latestRun = getLatestRun();

    if (!latestRun) {
        title.textContent = "Start med ein roleg tur";
        text.textContent =
            "Når du har registrert den første løpeturen, kan RunGoal gi deg eit forslag til neste økt.";
        return;
    }

    const daysSince = getDaysSince(latestRun.date);

    if (daysSince <= 7 && latestRun.feeling === "pain") {
        title.textContent = "Ta ein pause";
        text.textContent =
            "Du registrerte smerter på siste tur. Ta pause frå løpinga dersom du framleis har vondt. Snakk med ein føresett eller helsepersonell dersom smertene held fram.";
        return;
    }

    if (daysSince <= 7 && latestRun.feeling === "hard") {
        title.textContent = "Ta ei rolegare økt";
        text.textContent =
            "Siste tur var tung. Neste tur kan vere kortare og rolegare, eller du kan ta ein ekstra kviledag.";
        return;
    }

    title.textContent = "Hald fram i ditt eige tempo";
    text.textContent =
        "Planlegg neste tur med god tid til kvile. Du treng ikkje springe fortare kvar gong.";
}


// =====================================
// SMARTARE TRENINGSPLAN
// =====================================

function getSuggestedWeeklyDistance() {
    const today = dateFromString(getLocalDateString(new Date()));
    const fourWeeksAgo = new Date(today);

    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 27);

    const recentRuns = runs.filter(run => {
        const date = dateFromString(run.date);
        return date >= fourWeeksAgo && date <= today;
    });

    // Utan nyare registreringar brukar appen vekedistansen
    // som brukaren sjølv har valt.
    if (recentRuns.length === 0) {
        return settings.weeklyDistance;
    }

    // Finn kor mange ulike veker brukaren har sprunge.
    const activeWeeks = new Set(
        recentRuns.map(run => getWeekKey(run.date))
    );

    const recentTotal = recentRuns.reduce((sum, run) => {
        return sum + run.distance;
    }, 0);

    // Bruk gjennomsnittet av vekene med registrert løping.
    const recentAverage = recentTotal / activeWeeks.size;

    // Planforslaget skal ikkje automatisk auke mengda.
    return Math.min(settings.weeklyDistance, recentAverage);
}

function renderPlan() {
    const title = document.getElementById("planTitle");
    const summary = document.getElementById("planSummary");
    const sessions = document.getElementById("trainingSessions");

    sessions.innerHTML = "";

    const latestRun = getLatestRun();
    const daysSince = latestRun ? getDaysSince(latestRun.date) : Infinity;

    // Ved nyleg registrerte smerter blir løpeøktene sette på pause.
    if (
        latestRun &&
        latestRun.feeling === "pain" &&
        daysSince <= 7
    ) {
        title.textContent = "Ta ein pause frå løpinga";

        summary.textContent =
            "Du registrerte smerter på siste løpetur. Ikkje press deg vidare dersom du framleis har vondt.";

        const pauseCard = document.createElement("div");
        pauseCard.className = "session-card rest-card";
        pauseCard.innerHTML = `
            <h3>Ingen planlagde løpeturar akkurat no</h3>
            <p>Vent med løping til det kjennest greitt å vere aktiv igjen. Snakk med ein føresett eller helsepersonell dersom smertene held fram.</p>
        `;

        sessions.appendChild(pauseCard);
        return;
    }

    let weeklyTarget = getSuggestedWeeklyDistance();

    // Ei tung økt gir eit meir forsiktig forslag.
    const hadHardRun =
        latestRun &&
        latestRun.feeling === "hard" &&
        daysSince <= 7;

    if (hadHardRun) {
        weeklyTarget *= 0.8;
    }

    const sessionCount = settings.runningDays;

    const sessionDays = {
        1: ["Onsdag"],
        2: ["Tysdag", "Laurdag"],
        3: ["Måndag", "Onsdag", "Laurdag"]
    };

    const portions = {
        1: [1],
        2: [0.45, 0.55],
        3: [0.30, 0.30, 0.40]
    };

    const descriptions = {
        1: "Ein roleg tur. Ta pausar med gange dersom du treng det.",
        2: "Ein roleg tur med god tid til pausar.",
        3: "Ein roleg tur. Hald eit tempo der du framleis kan snakke."
    };

    if (hadHardRun) {
        title.textContent = "Ei litt lettare veke";
        summary.textContent =
            "Den siste turen din var tung. Difor foreslår RunGoal ei rolegare veke med litt mindre distanse.";
    } else if (runs.length > 0) {
        title.textContent = "Tilpassa planen din";
        summary.textContent =
            "Forslaget tek omsyn til løpeturane du har registrert dei siste fire vekene. Det aukar ikkje automatisk distansen etter ein god tur.";
    } else {
        title.textContent = "Din første veke";
        summary.textContent =
            "Dette er eit forsiktig startforslag basert på vekedistansen du har valt.";
    }

    for (let i = 0; i < sessionCount; i++) {
        const distance = weeklyTarget * portions[sessionCount][i];

        const card = document.createElement("article");
        card.className = "session-card";

        const heading = document.createElement("h3");
        heading.innerHTML =
            `<span class="session-number">${i + 1}</span>${sessionDays[sessionCount][i]}`;

        const distanceText = document.createElement("p");
        distanceText.textContent =
            `Forslag: omtrent ${formatDistance(distance)} km.`;

        const description = document.createElement("p");

        if (hadHardRun) {
            description.textContent =
                "Hald økta kort og roleg, eller vel ein ekstra kviledag dersom du treng det.";
        } else {
            description.textContent = descriptions[sessionCount];
        }

        card.appendChild(heading);
        card.appendChild(distanceText);
        card.appendChild(description);

        sessions.appendChild(card);
    }

    const restNote = document.createElement("p");
    restNote.className = "empty-message";
    restNote.textContent =
        "Legg inn kviledagar mellom øktene. Dette er eit forslag, og du kan korte ned eller droppe ei økt når du treng det.";

    sessions.appendChild(restNote);
}


// =====================================
// GRAF - SEKS SISTE VEKER
// =====================================

function renderWeeklyChart() {
    const chart = document.getElementById("weeklyChart");
    chart.innerHTML = "";

    const currentWeek = getWeekStart(new Date());
    const weeks = [];

    for (let i = 5; i >= 0; i--) {
        const start = new Date(currentWeek);
        start.setDate(start.getDate() - (i * 7));

        const end = new Date(start);
        end.setDate(end.getDate() + 7);

        const distance = runs
            .filter(run => {
                const date = dateFromString(run.date);
                return date >= start && date < end;
            })
            .reduce((sum, run) => sum + run.distance, 0);

        weeks.push({
            label: `${start.getDate()}/${start.getMonth() + 1}`,
            distance: distance
        });
    }

    const maxDistance = Math.max(
        1,
        ...weeks.map(week => week.distance)
    );

    weeks.forEach(week => {
        const column = document.createElement("div");
        column.className = "chart-column";

        const height = week.distance === 0
            ? 3
            : Math.max(5, (week.distance / maxDistance) * 135);

        column.innerHTML = `
            <span class="chart-value">${formatDistance(week.distance)}</span>
            <div class="chart-bar-area">
                <div class="chart-bar" style="height: ${height}px"></div>
            </div>
            <span class="chart-label">${week.label}</span>
        `;

        chart.appendChild(column);
    });
}


// =====================================
// KALENDER
// =====================================

let calendarMonth = new Date();
calendarMonth.setDate(1);

let selectedDate = getLocalDateString(new Date());

function renderCalendar() {
    const title = document.getElementById("calendarMonth");
    const grid = document.getElementById("calendarGrid");

    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    title.textContent = calendarMonth.toLocaleDateString("nn-NO", {
        month: "long",
        year: "numeric"
    });

    grid.innerHTML = "";

    const dayNames = ["M", "T", "O", "T", "F", "L", "S"];

    dayNames.forEach(day => {
        const heading = document.createElement("div");
        heading.className = "calendar-day-name";
        heading.textContent = day;
        grid.appendChild(heading);
    });

    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const numberOfDays = new Date(year, month + 1, 0).getDate();
    const today = getLocalDateString(new Date());

    for (let i = 0; i < offset; i++) {
        const empty = document.createElement("div");
        empty.className = "calendar-day empty";
        grid.appendChild(empty);
    }

    for (let day = 1; day <= numberOfDays; day++) {
        const dateString = getLocalDateString(
            new Date(year, month, day)
        );

        const hasRun = runs.some(run => run.date === dateString);

        const button = document.createElement("button");
        button.className = "calendar-day";
        button.textContent = day;
        button.type = "button";

        if (hasRun) button.classList.add("has-run");
        if (dateString === selectedDate) button.classList.add("selected");
        if (dateString === today) button.classList.add("today");

        button.addEventListener("click", () => {
            selectedDate = dateString;
            renderCalendar();
            renderSelectedDay();
        });

        grid.appendChild(button);
    }
}

document.getElementById("previousMonth").addEventListener("click", () => {
    calendarMonth.setMonth(calendarMonth.getMonth() - 1);
    selectedDate = getLocalDateString(calendarMonth);
    renderCalendar();
    renderSelectedDay();
});

document.getElementById("nextMonth").addEventListener("click", () => {
    calendarMonth.setMonth(calendarMonth.getMonth() + 1);
    selectedDate = getLocalDateString(calendarMonth);
    renderCalendar();
    renderSelectedDay();
});

function renderSelectedDay() {
    const title = document.getElementById("selectedDateTitle");
    const container = document.getElementById("selectedDayRuns");

    title.textContent = formatDate(selectedDate);
    container.innerHTML = "";

    const dayRuns = runs.filter(run => run.date === selectedDate);

    if (dayRuns.length === 0) {
        container.innerHTML =
            `<p class="empty-message">Ingen registrerte løpeturar denne dagen.</p>`;
        return;
    }

    dayRuns.forEach(run => {
        const item = document.createElement("div");
        item.className = "day-run";

        item.innerHTML = `
            <div>
                <strong>${formatDistance(run.distance)} km</strong>
                <p>${formatDuration(run.durationMs)} · ${FEELING_LABELS[run.feeling] || "Ikkje oppgitt"}</p>
            </div>
            <div>
                <strong>${formatPace(getRunPace(run))}</strong>
                <p>min/km</p>
            </div>
        `;

        container.appendChild(item);
    });
}


// =====================================
// HISTORIKK
// =====================================

function renderHistory() {
    const history = document.getElementById("runHistory");
    history.innerHTML = "";

    if (runs.length === 0) {
        history.innerHTML =
            `<p class="empty-message">Du har ikkje registrert nokon løpeturar enno.</p>`;
        return;
    }

    const sortedRuns = [...runs].sort((a, b) => {
        return b.date.localeCompare(a.date);
    });

    sortedRuns.forEach(run => {
        const item = document.createElement("div");
        item.className = "history-item";

        item.innerHTML = `
            <div>
                <strong>${formatDistance(run.distance)} km</strong>
                <p>${formatDate(run.date)} · ${formatDuration(run.durationMs)}</p>
                <p>${FEELING_LABELS[run.feeling] || "Ikkje oppgitt"}</p>
            </div>

            <div>
                <strong>${formatPace(getRunPace(run))}</strong>
                <p>min/km</p>
                <button class="delete-run" data-delete="${run.id}" type="button">
                    Slett
                </button>
            </div>
        `;

        history.appendChild(item);
    });
}

document.getElementById("runHistory").addEventListener("click", event => {
    const button = event.target.closest("[data-delete]");

    if (!button) return;

    const runId = button.dataset.delete;

    if (!confirm("Vil du slette denne løpeturen?")) {
        return;
    }

    runs = runs.filter(run => String(run.id) !== String(runId));

    saveData();
    renderAll();
});


// =====================================
// EKSPORT AV TRENINGSDATA
// =====================================

document.getElementById("exportData").addEventListener("click", () => {
    const backup = {
        app: "RunGoal",
        exportedAt: new Date().toISOString(),
        settings: settings,
        runs: runs
    };

    const file = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = "rungoal-sikkerheitskopi.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
});


// =====================================
// OPPDATERE HEILE APPEN
// =====================================

function renderAll() {
    renderDashboard();
    renderPlan();
    renderWeeklyChart();
    renderCalendar();
    renderSelectedDay();
    renderHistory();
}


// =====================================
// STARTE APPEN
// =====================================

fillGoalForm();
renderAll();
updateStopwatchDisplay();


// =====================================
// PWA - SERVICE WORKER
// =====================================

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js")
            .then(() => {
                console.log("RunGoal er klar som PWA!");
            })
            .catch(error => {
                console.error("Service worker-feil:", error);
            });
    });
}