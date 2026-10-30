// ======================================
// RUNG OAL - HOVUDFUNKSJONAR
// ======================================

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

let runs = loadData("rungoal-runs", []);

let elapsedMs = 0;
let startedAt = null;
let timerInterval = null;

let calendarMonth = new Date();
calendarMonth.setDate(1);

let selectedDate = getLocalDateString(new Date());

const feelingLabels = {
    easy: "Lett og behageleg",
    normal: "Passe tung",
    hard: "Tung",
    pain: "Smerter"
};


// ======================================
// LAGRING OG DATOAR
// ======================================

function saveData() {
    localStorage.setItem("rungoal-settings", JSON.stringify(settings));
    localStorage.setItem("rungoal-runs", JSON.stringify(runs));
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

function isDateInCurrentWeek(dateString) {
    const date = dateFromString(dateString);
    const start = getWeekStart(new Date());
    const end = new Date(start);

    end.setDate(end.getDate() + 7);

    return date >= start && date < end;
}


// ======================================
// FORMATERING
// ======================================

function formatDistance(distance) {
    return Number(distance).toLocaleString("nn-NO", {
        maximumFractionDigits: 2
    });
}

function formatPace(minutesPerKm) {
    if (!Number.isFinite(minutesPerKm) || minutesPerKm <= 0) {
        return "–";
    }

    const minutes = Math.floor(minutesPerKm);
    const seconds = Math.round((minutesPerKm - minutes) * 60);

    if (seconds === 60) {
        return `${minutes + 1}:00`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDuration(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
        return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getRunPace(run) {
    const minutes = run.elapsedMs / 60000;
    return minutes / run.distance;
}

function getRunSpeed(run) {
    const hours = run.elapsedMs / 3600000;
    return run.distance / hours;
}


// ======================================
// NAVIGERING
// ======================================

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


// ======================================
// MÅL OG INNSTILLINGAR
// ======================================

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
        newSettings.targetDistance <= 0 ||
        newSettings.targetMinutes <= 0 ||
        newSettings.goalWeeks <= 0 ||
        newSettings.weeklyDistance < 0 ||
        newSettings.runningDays < 1 ||
        newSettings.runningDays > 7
    ) {
        alert("Kontroller at du har fylt inn gyldige tal.");
        return;
    }

    settings = newSettings;
    saveData();
    renderAll();

    alert("Målet ditt er lagra!");
});


// ======================================
// STOPPEKLOKKE
// ======================================

const stopwatchDisplay = document.getElementById("stopwatch");
const startButton = document.getElementById("startTimer");
const pauseButton = document.getElementById("pauseTimer");
const resetButton = document.getElementById("resetTimer");

function updateStopwatchDisplay() {
    let currentTime = elapsedMs;

    if (startedAt !== null) {
        currentTime += Date.now() - startedAt;
    }

    stopwatchDisplay.textContent = formatDuration(currentTime);
}

function startStopwatch() {
    if (startedAt !== null) return;

    startedAt = Date.now();

    timerInterval = setInterval(updateStopwatchDisplay, 200);

    startButton.disabled = true;
    pauseButton.disabled = false;

    updateStopwatchDisplay();
}

function pauseStopwatch() {
    if (startedAt === null) return;

    elapsedMs += Date.now() - startedAt;
    startedAt = null;

    clearInterval(timerInterval);
    timerInterval = null;

    startButton.disabled = false;
    pauseButton.disabled = true;

    updateStopwatchDisplay();
}

function resetStopwatch() {
    pauseStopwatch();

    elapsedMs = 0;

    updateStopwatchDisplay();

    startButton.disabled = false;
    pauseButton.disabled = true;
}

startButton.addEventListener("click", startStopwatch);
pauseButton.addEventListener("click", pauseStopwatch);
resetButton.addEventListener("click", resetStopwatch);


// ======================================
// REGISTRERE LØPETUR
// ======================================

document.getElementById("runDate").value = getLocalDateString(new Date());

document.getElementById("runForm").addEventListener("submit", event => {
    event.preventDefault();

    pauseStopwatch();

    const distance = Number(document.getElementById("runDistance").value);
    const date = document.getElementById("runDate").value;
    const feeling = document.getElementById("runFeeling").value;

    if (!distance || distance <= 0) {
        alert("Skriv inn ei gyldig distanse.");
        return;
    }

    if (!date) {
        alert("Vel dato for løpeturen.");
        return;
    }

    if (elapsedMs <= 0) {
        alert("Start stoppeklokka før du lagrar løpeturen.");
        return;
    }

    const run = {
        id: createRunId(),
        date: date,
        distance: distance,
        elapsedMs: elapsedMs,
        feeling: feeling
    };

    runs.push(run);

    saveData();
    resetStopwatch();

    document.getElementById("runDistance").value = "";
    document.getElementById("runFeeling").value = "easy";
    document.getElementById("runDate").value = getLocalDateString(new Date());

    renderAll();
    openPage("dashboard");

    alert("Løpeturen er lagra!");
});

function createRunId() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}


// ======================================
// STATISTIKK OG FRAMSIDE
// ======================================

function renderDashboard() {
    const totalDistance = runs.reduce((sum, run) => {
        return sum + Number(run.distance);
    }, 0);

    const weeklyDistance = runs
        .filter(run => isDateInCurrentWeek(run.date))
        .reduce((sum, run) => sum + Number(run.distance), 0);

    const bestRun = runs.reduce((best, run) => {
        if (!best || getRunPace(run) < getRunPace(best)) {
            return run;
        }

        return best;
    }, null);

    const longestRun = runs.reduce((longest, run) => {
        return Math.max(longest, Number(run.distance));
    }, 0);

    document.getElementById("weekDistance").textContent =
        `${formatDistance(weeklyDistance)} km`;

    document.getElementById("runCount").textContent = runs.length;

    document.getElementById("totalDistance").textContent =
        `${formatDistance(totalDistance)} km`;

    document.getElementById("bestPace").textContent =
        bestRun ? `${formatPace(getRunPace(bestRun))}` : "–";

    document.getElementById("goalTitle").textContent =
        `${formatDistance(settings.targetDistance)} km på ${formatDistance(settings.targetMinutes)} min`;

    const progress = Math.min(
        100,
        (longestRun / settings.targetDistance) * 100
    );

    document.getElementById("progressDescription").textContent =
        `Lengste tur: ${formatDistance(longestRun)} av ${formatDistance(settings.targetDistance)} km`;

    document.getElementById("progressPercent").textContent =
        `${Math.round(progress)} %`;

    document.getElementById("progressBar").style.width =
        `${progress}%`;

    const targetPace = settings.targetMinutes / settings.targetDistance;

    document.getElementById("goalPace").textContent =
        `${formatPace(targetPace)} min/km`;

    document.getElementById("weeksLeft").textContent =
        `${settings.goalWeeks} veker`;

    renderNextRun();
}


// ======================================
// NESTE LØPETUR
// ======================================

function getLatestRun() {
    if (runs.length === 0) return null;

    return [...runs].sort((a, b) => {
        return b.date.localeCompare(a.date);
    })[0];
}

function renderNextRun() {
    const text = document.getElementById("nextRunText");
    const latestRun = getLatestRun();

    if (!latestRun) {
        text.textContent =
            "Start med ein roleg tur. Når du har registrert han, kan RunGoal gi deg eit forslag til neste økt.";
        return;
    }

    if (latestRun.feeling === "pain") {
        text.textContent =
            "Du registrerte smerter på siste tur. Ta pause frå løping dersom du framleis har vondt. Snakk med ein føresett eller helsepersonell dersom smertene held fram.";
        return;
    }

    if (latestRun.feeling === "hard") {
        text.textContent =
            "Siste tur var tung. Neste tur kan vere kortare og rolegare. Ta ein ekstra kviledag dersom du treng det.";
        return;
    }

    text.textContent =
        "Hald fram med rolege løpeturar og ta kvile mellom øktene. Du treng ikkje auke farten kvar gong.";
}


// ======================================
// TRENINGSPLAN
// ======================================

function renderPlan() {
    const summary = document.getElementById("planSummary");
    const sessions = document.getElementById("trainingSessions");
    const latestRun = getLatestRun();

    const days = Number(settings.runningDays);
    const weeklyKm = Number(settings.weeklyDistance);

    summary.textContent =
        `Du har valt ${days} løpedag${days === 1 ? "" : "ar"} i veka og oppgitt ${formatDistance(weeklyKm)} km som vanleg vekesdistanse. Planen under er eit forslag, ikkje noko du må gjennomføre.`;

    sessions.innerHTML = "";

    if (latestRun && latestRun.feeling === "pain") {
        sessions.innerHTML = `
            <div class="session-card">
                <h3>Ta ein pause</h3>
                <p>Du har registrert smerter på siste løpetur. Vent med neste løpetur dersom du framleis har vondt. Snakk med ein føresett eller helsepersonell dersom smertene held fram.</p>
            </div>
        `;

        return;
    }

    const numberOfSessions = Math.min(days, 3);

    let suggestions = [];

    if (numberOfSessions === 1) {
        suggestions = [
            ["Økt 1", "Ein roleg tur eller veksling mellom gange og jogging. Avslutt medan du framleis har litt overskot."]
        ];
    } else if (numberOfSessions === 2) {
        suggestions = [
            ["Økt 1", "Ein kort og roleg tur. Ta pausar med gange dersom du treng det."],
            ["Økt 2", "Ein roleg tur som kan vere litt lengre enn den første, dersom kroppen kjennest bra."]
        ];
    } else {
        suggestions = [
            ["Økt 1", "Ein kort og roleg tur."],
            ["Økt 2", "Ein roleg tur med god tid til pausar."],
            ["Økt 3", "Ein behageleg tur. Hald eit tempo der du framleis kan snakke."]
        ];
    }

    if (latestRun && latestRun.feeling === "hard") {
        suggestions = suggestions.map(([title]) => [
            title,
            "Gjer økta kort og roleg, eller ta ein ekstra kviledag dersom du treng det."
        ]);
    }

    suggestions.forEach(([title, description], index) => {
        const card = document.createElement("div");
        card.className = "session-card";

        card.innerHTML = `
            <h3><span class="session-number">${index + 1}</span>${title}</h3>
            <p>${description}</p>
        `;

        sessions.appendChild(card);
    });

    if (latestRun && latestRun.feeling !== "hard") {
        const note = document.createElement("p");
        note.className = "empty-message";
        note.textContent = "Legg inn kviledagar mellom løpeturane. Du kan justere planen under «Målet mitt».";
        sessions.appendChild(note);
    }
}


// ======================================
// GRAF OVER DEI SISTE SEKS VEKENE
// ======================================

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
            .reduce((sum, run) => sum + Number(run.distance), 0);

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


// ======================================
// KALENDER
// ======================================

function renderCalendar() {
    const monthTitle = document.getElementById("calendarMonth");
    const grid = document.getElementById("calendarGrid");

    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    monthTitle.textContent = calendarMonth.toLocaleDateString("nn-NO", {
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
        const dateString = getLocalDateString(new Date(year, month, day));

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
        container.innerHTML = `<p class="empty-message">Ingen registrerte løpeturar denne dagen.</p>`;
        return;
    }

    dayRuns.forEach(run => {
        const item = document.createElement("div");
        item.className = "day-run";

        item.innerHTML = `
            <div>
                <strong>${formatDistance(run.distance)} km</strong>
                <p>${formatDuration(run.elapsedMs)} · ${feelingLabels[run.feeling]}</p>
            </div>
            <div>
                <strong>${formatPace(getRunPace(run))}</strong>
                <p>min/km</p>
            </div>
        `;

        container.appendChild(item);
    });
}


// ======================================
// ALLE LØPETURANE
// ======================================

function renderHistory() {
    const history = document.getElementById("runHistory");
    history.innerHTML = "";

    if (runs.length === 0) {
        history.innerHTML = `<p class="empty-message">Du har ikkje registrert nokon løpeturar enno.</p>`;
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
                <p>${formatDate(run.date)} · ${formatDuration(run.elapsedMs)}</p>
                <p>${feelingLabels[run.feeling] || "Ikkje oppgitt"}</p>
            </div>

            <div>
                <strong>${formatPace(getRunPace(run))}</strong>
                <p>min/km</p>
                <button class="delete-run" data-delete="${run.id}" type="button">Slett</button>
            </div>
        `;

        history.appendChild(item);
    });
}

document.getElementById("runHistory").addEventListener("click", event => {
    const button = event.target.closest("[data-delete]");

    if (!button) return;

    const runId = button.dataset.delete;

    const confirmed = confirm("Vil du slette denne løpeturen?");

    if (!confirmed) return;

    runs = runs.filter(run => String(run.id) !== String(runId));

    saveData();
    renderAll();
});


// ======================================
// EKSPORTERE DATA
// ======================================

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


// ======================================
// OPPDATERE HEILE APPEN
// ======================================

function renderAll() {
    renderDashboard();
    renderPlan();
    renderWeeklyChart();
    renderCalendar();
    renderSelectedDay();
    renderHistory();
}


// ======================================
// STARTE APPEN
// ======================================

fillGoalForm();
renderAll();
updateStopwatchDisplay();


// ======================================
// PWA - SERVICE WORKER
// ======================================

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