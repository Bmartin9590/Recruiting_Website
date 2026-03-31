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

function safeText(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).replace(/\s+/g, " ").trim();
  return text || fallback;
}

function safeList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => safeText(value)).filter(Boolean);
}

function safeUrl(value, options = {}) {
  const { allowRelative = false, allowedProtocols = ["https:", "http:"] } = options;
  const raw = safeText(value);

  if (!raw) {
    return "";
  }

  if (allowRelative && (/^\.\.?\//.test(raw) || raw.startsWith("/"))) {
    return raw;
  }

  try {
    const url = new URL(raw, window.location.href);
    if (!allowedProtocols.includes(url.protocol)) {
      return "";
    }
    return url.href;
  } catch {
    return "";
  }
}

function normalizeXHandle(value) {
  const raw = safeText(value);

  if (!raw) {
    return "";
  }

  if (raw.includes("x.com/") || raw.includes("twitter.com/")) {
    const safeProfileUrl = safeUrl(raw);
    if (!safeProfileUrl) {
      return "";
    }

    try {
      const parsed = new URL(safeProfileUrl);
      const handle = parsed.pathname.replace(/^\/+/, "").split("/")[0];
      return handle ? `@${handle.replace(/^@+/, "")}` : "";
    } catch {
      return "";
    }
  }

  const normalized = raw.replace(/^@+/, "").replace(/[^a-zA-Z0-9_]/g, "");
  return normalized ? `@${normalized}` : "";
}

function xProfileUrl(handle) {
  const normalized = normalizeXHandle(handle);
  if (!normalized) {
    return "";
  }

  return `https://x.com/${normalized.slice(1)}`;
}

function createNode(tagName, options = {}) {
  const { className = "", text = "", attrs = {} } = options;
  const node = document.createElement(tagName);

  if (className) {
    node.className = className;
  }

  if (text) {
    node.textContent = text;
  }

  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      node.setAttribute(key, value);
    }
  });

  return node;
}

function buildButtonLink({ label, href, className }) {
  const safeHref = safeUrl(href);
  if (!safeHref) {
    return null;
  }

  return createNode("a", {
    className,
    text: label,
    attrs: {
      href: safeHref,
      target: "_blank",
      rel: "noreferrer",
    },
  });
}

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
  wrapper.appendChild(createNode("p", { className: "metric-value", text: safeText(metric.value, "0") }));
  wrapper.appendChild(createNode("p", { className: "metric-label", text: safeText(metric.label) }));
  return wrapper;
}

function normalizeAthlete(rawAthlete) {
  const positions = safeList(rawAthlete.positions);
  const achievements = safeList(rawAthlete.achievements);
  const photoUrl =
    safeUrl(rawAthlete.photoUrl, { allowRelative: true }) || "./assets/headshot-placeholder.svg";
  const hudlUrl = safeUrl(rawAthlete.hudlUrl);
  const highlightUrl = safeUrl(rawAthlete.highlightUrl) || hudlUrl;

  return {
    id: rawAthlete.id || crypto.randomUUID(),
    name: safeText(rawAthlete.name, "Unnamed Athlete"),
    graduationYear: safeText(rawAthlete.graduationYear),
    jerseyNumber: safeText(rawAthlete.jerseyNumber),
    positions: positions,
    height: safeText(rawAthlete.height, "Not listed"),
    weight: safeText(rawAthlete.weight, "Not listed"),
    gpa: safeText(rawAthlete.gpa, "Not listed"),
    why: safeText(rawAthlete.why, "Why statement coming soon."),
    xHandle: normalizeXHandle(rawAthlete.xHandle),
    hudlUrl: hudlUrl,
    highlightUrl: highlightUrl,
    photoUrl: photoUrl,
    hometown: safeText(rawAthlete.hometown, "Clarksburg, MD"),
    academicInterests: safeText(rawAthlete.academicInterests, "Open"),
    statsSummary: safeText(rawAthlete.statsSummary),
    coachNote: safeText(rawAthlete.coachNote),
    achievements: achievements,
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
    athlete.xHandle,
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
    emptyState.appendChild(createNode("h4", { text: "No athletes match this filter set yet." }));
    emptyState.appendChild(
      createNode("p", { text: "Clear a filter or add another athlete record to the data source." })
    );
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
    meta.textContent = `${athlete.positions.join(" / ") || "Position TBD"} • ${athlete.height} • ${athlete.weight}`;
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
  const fragment = document.createDocumentFragment();

  Object.entries(stats)
    .filter(([, value]) => value)
    .forEach(([label, value]) => {
      const friendlyLabel = label.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
      const box = createNode("div", { className: "stat-box" });
      box.appendChild(createNode("span", { className: "stat-label", text: friendlyLabel }));
      box.appendChild(createNode("p", { className: "stat-value", text: safeText(value) }));
      fragment.appendChild(box);
    });

  return fragment;
}

function buildFactBoxes(athlete) {
  const fragment = document.createDocumentFragment();

  buildFacts(athlete).forEach((fact) => {
    const box = createNode("div", { className: "fact-box" });
    box.appendChild(createNode("span", { className: "fact-label", text: fact.label }));
    box.appendChild(createNode("p", { className: "fact-value", text: fact.value }));
    fragment.appendChild(box);
  });

  return fragment;
}

function openProfile(athlete) {
  state.selectedAthlete = athlete;
  elements.modalContent.replaceChildren();

  const layout = createNode("div", { className: "profile-layout" });
  const imageWrap = createNode("div");
  const image = createNode("img", {
    className: "profile-image",
    attrs: {
      src: athlete.photoUrl,
      alt: `${athlete.name} headshot`,
      loading: "lazy",
    },
  });
  imageWrap.appendChild(image);

  const panel = createNode("div", { className: "profile-panel" });
  panel.appendChild(createNode("p", { className: "eyebrow", text: formatClassYear(athlete.graduationYear) }));
  panel.appendChild(createNode("h3", { className: "profile-title", text: athlete.name }));
  panel.appendChild(
    createNode("p", {
      className: "profile-subtitle",
      text: `${athlete.positions.join(" / ") || "Position TBD"} • ${athlete.hometown}`,
    })
  );

  const quickFacts = createNode("div", { className: "profile-quickfacts" });
  quickFacts.appendChild(buildFactBoxes(athlete));
  panel.appendChild(quickFacts);

  const whyCopy = createNode("p", { className: "profile-copy" });
  const whyStrong = createNode("strong", { text: "Why: " });
  whyCopy.appendChild(whyStrong);
  whyCopy.appendChild(document.createTextNode(athlete.why));
  panel.appendChild(whyCopy);

  if (athlete.coachNote) {
    const coachCopy = createNode("p", { className: "profile-copy" });
    coachCopy.appendChild(createNode("strong", { text: "Coach note: " }));
    coachCopy.appendChild(document.createTextNode(athlete.coachNote));
    panel.appendChild(coachCopy);
  }

  const links = [
    buildButtonLink({ label: "Open Hudl", href: athlete.hudlUrl, className: "primary-button" }),
    buildButtonLink({ label: "Watch Highlights", href: athlete.highlightUrl, className: "ghost-button" }),
    buildButtonLink({ label: athlete.xHandle || "View X Profile", href: xProfileUrl(athlete.xHandle), className: "ghost-button" }),
  ].filter(Boolean);

  if (links.length) {
    const linksWrap = createNode("div", { className: "profile-links" });
    links.forEach((link) => linksWrap.appendChild(link));
    panel.appendChild(linksWrap);
  }

  if (athlete.statsSummary) {
    const summaryCopy = createNode("p", { className: "profile-copy" });
    summaryCopy.appendChild(createNode("strong", { text: "Season snapshot: " }));
    summaryCopy.appendChild(document.createTextNode(athlete.statsSummary));
    panel.appendChild(summaryCopy);
  }

  if (Object.keys(athlete.stats).length) {
    const statsGrid = createNode("div", { className: "profile-stats-grid" });
    statsGrid.appendChild(buildStatBoxes(athlete.stats));
    panel.appendChild(statsGrid);
  }

  const tags = [
    athlete.xHandle && `X: ${athlete.xHandle}`,
    athlete.academicInterests && `Academic interests: ${athlete.academicInterests}`,
    athlete.achievements[0] && athlete.achievements[0],
    athlete.achievements[1] && athlete.achievements[1],
  ].filter(Boolean);

  if (tags.length) {
    const tagsWrap = createNode("div", { className: "profile-tags" });
    tags.forEach((tag) => tagsWrap.appendChild(createNode("div", { className: "tag-box", text: tag })));
    panel.appendChild(tagsWrap);
  }

  layout.appendChild(imageWrap);
  layout.appendChild(panel);
  elements.modalContent.appendChild(layout);

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
  elements.coachContact.replaceChildren();

  elements.coachContact.appendChild(createNode("p", { className: "eyebrow", text: "Recruiter Access" }));
  elements.coachContact.appendChild(
    createNode("div", {
      text:
        safeText(
          config.publicContactNote,
          "Recruiters can request athlete contact and supporting information through our staff-managed inquiry form."
        ),
    })
  );

  const inquiryLink = buildButtonLink({
    label: "Request Contact / Transcript",
    href: config.recruiterInquiryUrl,
    className: "ghost-button contact-button",
  });

  if (inquiryLink) {
    elements.coachContact.appendChild(inquiryLink);
  }

  if (config.displayCoachDirectContact) {
    const directWrap = createNode("div", { className: "direct-contact-list" });
    directWrap.appendChild(
      createNode("div", { text: safeText(config.coachEmail, "Add a coach email in js/config.js") })
    );
    directWrap.appendChild(
      createNode("div", { text: safeText(config.coachPhone, "Add a coach phone number in js/config.js") })
    );
    elements.coachContact.appendChild(directWrap);
  }
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
    const emptyState = document.createElement("article");
    emptyState.className = "glass-panel empty-state";
    emptyState.appendChild(createNode("h4", { text: "Data source not connected yet." }));
    emptyState.appendChild(createNode("p", { text: safeText(error.message, "Unable to load athlete data.") }));
    elements.athleteGrid.replaceChildren(emptyState);
  }
}

init();
