const state = {
  athletes: [],
  filteredAthletes: [],
  selectedAthlete: null,
};

const elements = {
  searchInput: document.getElementById("search-input"),
  positionFilter: document.getElementById("position-filter"),
  classFilter: document.getElementById("class-filter"),
  athleteGrid: document.getElementById("athlete-grid"),
  heroMetrics: document.getElementById("hero-metrics"),
  coachContact: document.getElementById("coach-contact"),
  profileModal: document.getElementById("profile-modal"),
  modalContent: document.getElementById("modal-content"),
  modalClose: document.getElementById("modal-close"),
  submitProfileButton: document.getElementById("submit-profile-button"),
  athleteCardTemplate: document.getElementById("athlete-card-template"),
};

function isPlaceholderUrl(url) {
  return !url || url.includes("REPLACE_WITH_YOUR_FORM_ID");
}

function formatClassYear(year) {
  if (!year) return "Class TBD";
  return `Class of ${year}`;
}

function parseNumericValue(value) {
  const numeric = Number.parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function getSummaryStats(athletes) {
  const athleteCount = athletes.length;
  const gpas = athletes
    .map((athlete) => parseNumericValue(athlete.gpa))
    .filter((value) => value !== null);
  const averageGpa = gpas.length
    ? (gpas.reduce((total, current) => total + current, 0) / gpas.length).toFixed(2)
    : "N/A";
  const classYears = new Set(athletes.map((athlete) => athlete.graduationYear).filter(Boolean));

  return [
    { label: "Featured athletes", value: athleteCount || "0" },
    { label: "Average GPA", value: averageGpa },
    { label: "Classes represented", value: classYears.size || "0" },
  ];
}

function buildMetricCard(metric) {
  const wrapper = document.createElement("article");
  wrapper.className = "metric-card";
  wrapper.innerHTML = `
    <p class="metric-value">${metric.value}</p>
    <p class="metric-label">${metric.label}</p>
  `;
  return wrapper;
}

function normalizeAthlete(rawAthlete) {
  return {
    id: rawAthlete.id || crypto.randomUUID(),
    name: rawAthlete.name || "Unnamed Athlete",
    graduationYear: rawAthlete.graduationYear || "",
    jerseyNumber: rawAthlete.jerseyNumber || "",
    positions: Array.isArray(rawAthlete.positions) ? rawAthlete.positions : [],
    height: rawAthlete.height || "Not listed",
    weight: rawAthlete.weight || "Not listed",
    gpa: rawAthlete.gpa || "Not listed",
    why: rawAthlete.why || "Why statement coming soon.",
    hudlUrl: rawAthlete.hudlUrl || "",
    highlightUrl: rawAthlete.highlightUrl || rawAthlete.hudlUrl || "",
    photoUrl: rawAthlete.photoUrl || "./assets/headshot-placeholder.svg",
    hometown: rawAthlete.hometown || "Clarksburg, MD",
    academicInterests: rawAthlete.academicInterests || "Open",
    statsSummary: rawAthlete.statsSummary || "",
    coachNote: rawAthlete.coachNote || "",
    achievements: Array.isArray(rawAthlete.achievements) ? rawAthlete.achievements : [],
    stats: rawAthlete.stats || {},
  };
}

async function loadAthletes() {
  const config = window.RECRUITING_CONFIG || {};
  if (config.dataMode === "remote" && (config.remoteDataUrl || config.remoteJsonpUrl)) {
    if (config.remoteDataUrl) {
      try {
        const response = await fetch(config.remoteDataUrl, { headers: { Accept: "application/json" } });

        if (!response.ok) {
          throw new Error(`Unable to load athlete data from ${config.remoteDataUrl}`);
        }

        const payload = await response.json();
        return (Array.isArray(payload) ? payload : payload.athletes || []).map(normalizeAthlete);
      } catch (error) {
        if (!config.remoteJsonpUrl) {
          throw error;
        }
      }
    }

    const payload = await loadJsonpPayload(config.remoteJsonpUrl || config.remoteDataUrl);
    return (Array.isArray(payload) ? payload : payload.athletes || []).map(normalizeAthlete);
  }

  const response = await fetch(config.localDataUrl, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error(`Unable to load athlete data from ${config.localDataUrl}`);
  }

  const payload = await response.json();
  return (Array.isArray(payload) ? payload : payload.athletes || []).map(normalizeAthlete);
}

function loadJsonpPayload(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `chsRecruiting_${Date.now()}`;
    const script = document.createElement("script");
    const separator = url.includes("?") ? "&" : "?";

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    function cleanup() {
      delete window[callbackName];
      script.remove();
    }

    script.onerror = () => {
      cleanup();
      reject(new Error(`Unable to load JSONP athlete data from ${url}`));
    };

    script.src = `${url}${separator}callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

function updateHeroMetrics(athletes) {
  elements.heroMetrics.innerHTML = "";
  getSummaryStats(athletes).forEach((metric) => {
    elements.heroMetrics.appendChild(buildMetricCard(metric));
  });
}

function populateFilters(athletes) {
  const positions = [...new Set(athletes.flatMap((athlete) => athlete.positions).filter(Boolean))].sort();
  const classYears = [...new Set(athletes.map((athlete) => athlete.graduationYear).filter(Boolean))].sort();

  positions.forEach((position) => {
    const option = document.createElement("option");
    option.value = position;
    option.textContent = position;
    elements.positionFilter.appendChild(option);
  });

  classYears.forEach((year) => {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = `Class of ${year}`;
    elements.classFilter.appendChild(option);
  });
}

function athleteMatchesFilters(athlete) {
  const searchValue = elements.searchInput.value.trim().toLowerCase();
  const positionValue = elements.positionFilter.value;
  const classValue = elements.classFilter.value;

  const searchTarget = [
    athlete.name,
    athlete.positions.join(" "),
    athlete.statsSummary,
    athlete.coachNote,
    athlete.achievements.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  const matchesSearch = !searchValue || searchTarget.includes(searchValue);
  const matchesPosition = positionValue === "all" || athlete.positions.includes(positionValue);
  const matchesClass = classValue === "all" || String(athlete.graduationYear) === classValue;

  return matchesSearch && matchesPosition && matchesClass;
}

function renderAthleteGrid() {
  state.filteredAthletes = state.athletes.filter(athleteMatchesFilters);
  elements.athleteGrid.innerHTML = "";

  if (!state.filteredAthletes.length) {
    const emptyState = document.createElement("article");
    emptyState.className = "glass-panel empty-state";
    emptyState.innerHTML =
      "<h4>No athletes match this filter set yet.</h4><p>Clear a filter or add another athlete record to the data source.</p>";
    elements.athleteGrid.appendChild(emptyState);
    return;
  }

  state.filteredAthletes.forEach((athlete) => {
    const fragment = elements.athleteCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".athlete-card");
    const photo = fragment.querySelector(".athlete-photo");
    const athleteClass = fragment.querySelector(".athlete-class");
    const name = fragment.querySelector(".athlete-name");
    const number = fragment.querySelector(".athlete-number");
    const meta = fragment.querySelector(".athlete-meta");
    const summary = fragment.querySelector(".athlete-summary");
    const cardStats = fragment.querySelector(".card-stats");
    const button = fragment.querySelector(".card-button");

    photo.src = athlete.photoUrl;
    photo.alt = `${athlete.name} headshot`;
    athleteClass.textContent = formatClassYear(athlete.graduationYear);
    name.textContent = athlete.name;
    number.textContent = athlete.jerseyNumber ? `#${athlete.jerseyNumber}` : "";
    meta.textContent = `${athlete.positions.join(" / ")} • ${athlete.height} • ${athlete.weight}`;
    summary.textContent = athlete.statsSummary || athlete.why;

    const statPills = [
      athlete.gpa && `GPA ${athlete.gpa}`,
      athlete.positions[0],
      athlete.achievements[0],
    ].filter(Boolean);

    statPills.forEach((stat) => {
      const pill = document.createElement("span");
      pill.className = "stat-pill";
      pill.textContent = stat;
      cardStats.appendChild(pill);
    });

    button.addEventListener("click", () => openProfile(athlete));
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      openProfile(athlete);
    });

    elements.athleteGrid.appendChild(fragment);
  });
}

function buildFacts(athlete) {
  return [
    { label: "Position", value: athlete.positions.join(" / ") || "Not listed" },
    { label: "Height", value: athlete.height },
    { label: "Weight", value: athlete.weight },
    { label: "GPA", value: athlete.gpa },
  ];
}

function buildStatBoxes(stats) {
  return Object.entries(stats)
    .filter(([, value]) => value)
    .map(([label, value]) => {
      const friendlyLabel = label.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
      return `
        <div class="stat-box">
          <span class="stat-label">${friendlyLabel}</span>
          <p class="stat-value">${value}</p>
        </div>
      `;
    })
    .join("");
}

function openProfile(athlete) {
  state.selectedAthlete = athlete;
  const factsMarkup = buildFacts(athlete)
    .map(
      (fact) => `
        <div class="fact-box">
          <span class="fact-label">${fact.label}</span>
          <p class="fact-value">${fact.value}</p>
        </div>
      `
    )
    .join("");

  const linkMarkup = `
    ${athlete.hudlUrl ? `<a class="primary-button" href="${athlete.hudlUrl}" target="_blank" rel="noreferrer">Open Hudl</a>` : ""}
    ${
      athlete.highlightUrl
        ? `<a class="ghost-button" href="${athlete.highlightUrl}" target="_blank" rel="noreferrer">Watch Highlights</a>`
        : ""
    }
  `;

  const tags = [
    athlete.academicInterests && `Academic interests: ${athlete.academicInterests}`,
    athlete.achievements[0] && athlete.achievements[0],
    athlete.achievements[1] && athlete.achievements[1],
  ]
    .filter(Boolean)
    .map((tag) => `<div class="tag-box">${tag}</div>`)
    .join("");

  elements.modalContent.innerHTML = `
    <div class="profile-layout">
      <div>
        <img class="profile-image" src="${athlete.photoUrl}" alt="${athlete.name} headshot" />
      </div>
      <div class="profile-panel">
        <p class="eyebrow">${formatClassYear(athlete.graduationYear)}</p>
        <h3 class="profile-title">${athlete.name}</h3>
        <p class="profile-subtitle">${athlete.positions.join(" / ")} • ${athlete.hometown}</p>
        <div class="profile-quickfacts">${factsMarkup}</div>
        <p class="profile-copy"><strong>Why:</strong> ${athlete.why}</p>
        ${
          athlete.coachNote
            ? `<p class="profile-copy"><strong>Coach note:</strong> ${athlete.coachNote}</p>`
            : ""
        }
        ${linkMarkup ? `<div class="profile-links">${linkMarkup}</div>` : ""}
        ${
          athlete.statsSummary
            ? `<p class="profile-copy"><strong>Season snapshot:</strong> ${athlete.statsSummary}</p>`
            : ""
        }
        ${
          Object.keys(athlete.stats).length
            ? `<div class="profile-stats-grid">${buildStatBoxes(athlete.stats)}</div>`
            : ""
        }
        ${tags ? `<div class="profile-tags">${tags}</div>` : ""}
      </div>
    </div>
  `;

  elements.profileModal.showModal();
}

function closeProfile() {
  if (elements.profileModal.open) {
    elements.profileModal.close();
  }
}

function wireEvents() {
  [elements.searchInput, elements.positionFilter, elements.classFilter].forEach((element) => {
    element.addEventListener("input", renderAthleteGrid);
    element.addEventListener("change", renderAthleteGrid);
  });

  elements.modalClose.addEventListener("click", closeProfile);
  elements.profileModal.addEventListener("click", (event) => {
    const dialogBox = elements.profileModal.getBoundingClientRect();
    const clickedOutside =
      event.clientX < dialogBox.left ||
      event.clientX > dialogBox.right ||
      event.clientY < dialogBox.top ||
      event.clientY > dialogBox.bottom;

    if (clickedOutside) {
      closeProfile();
    }
  });
}

function configureSubmitButton() {
  const config = window.RECRUITING_CONFIG || {};

  if (isPlaceholderUrl(config.formUrl)) {
    elements.submitProfileButton.removeAttribute("target");
    elements.submitProfileButton.removeAttribute("rel");
    elements.submitProfileButton.href = "#workflow";
    elements.submitProfileButton.textContent = "Connect Google Form URL";
    return;
  }

  elements.submitProfileButton.href = config.formUrl;
}

function renderCoachContact() {
  const config = window.RECRUITING_CONFIG || {};
  elements.coachContact.innerHTML = `
    <p class="eyebrow">Coach Contact</p>
    <div>${config.coachEmail || "Add a coach email in js/config.js"}</div>
    <div>${config.coachPhone || "Add a coach phone number in js/config.js"}</div>
  `;
}

async function init() {
  configureSubmitButton();
  renderCoachContact();
  wireEvents();

  try {
    state.athletes = await loadAthletes();
    updateHeroMetrics(state.athletes);
    populateFilters(state.athletes);
    renderAthleteGrid();
  } catch (error) {
    elements.athleteGrid.innerHTML = `
      <article class="glass-panel empty-state">
        <h4>Data source not connected yet.</h4>
        <p>${error.message}</p>
      </article>
    `;
  }
}

init();
