// Hent skjemaet frå HTML
const goalForm = document.getElementById("goalForm");


// Når brukaren trykkjer på knappen
goalForm.addEventListener("submit", function(event) {

    event.preventDefault();

    // Hent informasjon frå skjemaet
    const distance = Number(document.getElementById("distance").value);
    const targetTime = Number(document.getElementById("time").value);
    const weeks = Number(document.getElementById("weeks").value);
    const currentKm = Number(document.getElementById("currentKm").value);
    const days = Number(document.getElementById("days").value);

    // Sjekk at verdiane er gyldige
    if (
        !Number.isFinite(distance) ||
        !Number.isFinite(targetTime) ||
        !Number.isFinite(currentKm) ||
        distance <= 0 ||
        targetTime <= 0 ||
        currentKm <= 0
    ) {
        alert("Skriv inn gyldige tal i alle felta.");
        return;
    }

    // REKN UT FART

    const speed = distance / (targetTime / 60);

    // Minutt per kilometer
    const paceSeconds = (targetTime * 60) / distance;

    const paceMinutes = Math.floor(paceSeconds / 60);

    const remainingSeconds = Math.round(paceSeconds % 60);

    const pace =
        paceMinutes + ":" +
        String(remainingSeconds).padStart(2, "0");


    // VIS RESULTAT

    document.getElementById("resultDistance").textContent =
        formatNumber(distance) + " km";

    document.getElementById("resultSpeed").textContent =
        formatNumber(speed) + " km/t";

    document.getElementById("resultPace").textContent =
        pace + " min/km";


    // LAG TRENINGSPLAN

    createTrainingPlan(distance, currentKm, weeks, days);

    // Vis resultatdelen
    document.getElementById("results").classList.remove("hidden");

    // Flytt brukaren ned til resultata
    document.getElementById("results").scrollIntoView({
        behavior: "smooth"
    });

});


// FORMATER TAL
function formatNumber(number) {
    return number.toLocaleString("nb-NO", {
        maximumFractionDigits: 1
    });
}


// LAG TRENINGSPLAN
function createTrainingPlan(distance, currentKm, weeks, days) {

    const planContainer = document.getElementById("trainingPlan");

    // Fjern den gamle planen
    planContainer.innerHTML = "";

    // Estimert øvre treningsmengde
    const peakWeeklyKm = Math.max(currentKm, distance * 1.4);

    // Start med ei kortare økt
    const startingLongRun = Math.min(
        distance * 0.45,
        currentKm * 0.6
    );

    let previousWeeklyKm = currentKm;
    let previousLongRun = startingLongRun;

    // Gå gjennom alle vekene
    for (let week = 1; week <= weeks; week++) {

        let weeklyKm;
        let longRun;

        // Siste veke er veka brukaren prøver målet sitt
        if (week === weeks) {

            const extraKm = Math.max(
                0.5,
                Math.min(currentKm * 0.5, distance * 0.4)
            );

            longRun = distance;
            weeklyKm = distance + extraKm;

        } else {

            // Gradvis auke i treningsmengda
            const progress = (week - 1) / (weeks - 2);

            // Jamn overgang frå start til mål
            const smoothProgress =
                progress * progress * (3 - 2 * progress);

            weeklyKm = currentKm +
                (peakWeeklyKm - currentKm) * smoothProgress;

            longRun = startingLongRun +
                (distance * 0.85 - startingLongRun) * smoothProgress;

            // Litt rolegare treningsveker
            if (week % 4 === 0) {

                weeklyKm = Math.max(
                    currentKm,
                    previousWeeklyKm * 0.85
                );

                longRun = Math.max(
                    startingLongRun,
                    previousLongRun * 0.85
                );
            }

            // Den lengste turen skal ikkje bli for stor del
            // av den totale vekesmengda
            longRun = Math.min(longRun, weeklyKm * 0.68);

            previousWeeklyKm = weeklyKm;
            previousLongRun = longRun;
        }

        // Resten av kilometerane blir fordelte på andre økter
        const otherKm = Math.max(0, weeklyKm - longRun);

        let sessions = [];

        for (let i = 0; i < days; i++) {

            let sessionDistance;

            if (i === days - 1) {
                sessionDistance = longRun;
            } else {
                sessionDistance = otherKm / (days - 1);
            }

            sessions.push({
                distance: sessionDistance,
                isLong: i === days - 1
            });
        }

        // Lag eit kort til kvar veke
        const card = document.createElement("div");

        card.className = "week-card";

        let sessionsHTML = "";

        sessions.forEach(function(session, index) {

            let title;

            if (week === weeks && session.isLong) {
                title = "Måltur";
            } else if (session.isLong) {
                title = "Lengre, roleg tur";
            } else {
                title = "Rolig løpetur";
            }

            sessionsHTML += `
                <p>
                    <strong>Økt ${index + 1} – ${title}:</strong>
                    ${formatNumber(session.distance)} km
                </p>
            `;
        });

        let description = "";

        if (week === weeks) {
            description =
                "Prøv måldistansen i eit kontrollert tempo dersom kroppen kjennest klar.";
        } else if (week % 4 === 0) {
            description =
                "Ei rolegare veke med litt mindre trening og ekstra restitusjon.";
        } else {
            description =
                "Spring i eit behageleg tempo og bygg opp uthaldet gradvis.";
        }

        card.innerHTML = `
            <h3>Veke ${week}</h3>

            ${sessionsHTML}

            <p class="total">
                Totalt: ${formatNumber(
                    sessions.reduce((sum, session) => sum + session.distance, 0)
                )} km
            </p>

            <p>${description}</p>
        `;

        planContainer.appendChild(card);
    }
}