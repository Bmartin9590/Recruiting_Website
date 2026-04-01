const FORM_TITLE = "Clarksburg High School Football Recruiting Profile";
const RECRUITER_INQUIRY_FORM_TITLE = "Clarksburg Football Recruiter Inquiry";
const SHEET_NAME = "Athletes";
const MAKE_PHOTOS_PUBLIC = false;
const SPREADSHEET_ID_PROPERTY = "RECRUITING_SPREADSHEET_ID";
const FORM_ID_PROPERTY = "RECRUITING_FORM_ID";
const EXISTING_RECRUITING_SPREADSHEET_ID = "";
const EXISTING_RECRUITING_FORM_ID = "";

function createRecruitingWorkflow() {
  const form = FormApp.create(FORM_TITLE);
  form.setDescription(
    "Complete this recruiting profile so Clarksburg High School coaches can publish a college-ready profile page."
  );
  form.setCollectEmail(true);
  form.setAllowResponseEdits(true);

  addShortAnswer_(form, "Athlete Full Name", true);
  addSectionHeader_(
    form,
    "Athlete Headshot",
    "After the form is created, add a File upload question here in the Google Forms editor. Athletes should upload a clear head-and-shoulders photo from their phone, with no filters, sunglasses, or group shots."
  );
  addShortAnswer_(form, "Graduation Year", true);
  addShortAnswer_(form, "Jersey Number", false);
  addShortAnswer_(form, "Primary Position", true);
  addShortAnswer_(form, "Secondary Position", false);
  addShortAnswer_(form, "Height", true);
  addShortAnswer_(form, "Weight", true);
  addShortAnswer_(form, "GPA", true);
  addShortAnswer_(form, "Hometown", false);
  addShortAnswer_(form, "Athlete Cell Phone", false);
  addShortAnswer_(form, "Athlete Email", false);
  addShortAnswer_(form, "X Handle", false);
  addShortAnswer_(form, "Parent / Guardian Name", false);
  addShortAnswer_(form, "Parent / Guardian Email", false);
  addShortAnswer_(form, "Parent / Guardian Phone", false);
  addParagraph_(form, "Why do you play football?", true);
  addShortAnswer_(form, "Hudl Profile URL", true);
  addShortAnswer_(form, "Highlight Video URL", false);
  addShortAnswer_(form, "Academic Interests / Intended Major", false);
  addParagraph_(form, "Honors / Awards / Recruiting Notes", false);
  addParagraph_(form, "Season Stats Summary", false);
  addShortAnswer_(form, "Passing Yards", false);
  addShortAnswer_(form, "Passing Touchdowns", false);
  addShortAnswer_(form, "Rushing Yards", false);
  addShortAnswer_(form, "Rushing Touchdowns", false);
  addShortAnswer_(form, "Receptions", false);
  addShortAnswer_(form, "Receiving Yards", false);
  addShortAnswer_(form, "Receiving / Total Touchdowns", false);
  addShortAnswer_(form, "Tackles", false);
  addShortAnswer_(form, "Interceptions", false);
  addShortAnswer_(form, "Bench Max", false);
  addShortAnswer_(form, "Squat Max", false);

  const spreadsheet = SpreadsheetApp.create("CHS Football Recruiting Responses");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  PropertiesService.getScriptProperties().setProperties({
    RECRUITING_SPREADSHEET_ID: spreadsheet.getId(),
    RECRUITING_FORM_ID: form.getId(),
  });

  SpreadsheetApp.flush();
  Utilities.sleep(1500);

  const responsesSheet = spreadsheet.getSheets()[0];
  responsesSheet.setFrozenRows(1);

  upsertAthleteSheet_(spreadsheet);
  syncAthleteSheet();

  ScriptApp.newTrigger("syncAthleteSheet").forSpreadsheet(spreadsheet).onFormSubmit().create();

  Logger.log("Form URL: " + form.getPublishedUrl());
  Logger.log("Edit Form URL: " + form.getEditUrl());
  Logger.log("Spreadsheet URL: " + spreadsheet.getUrl());
}

function createRecruiterInquiryForm() {
  const form = FormApp.create(RECRUITER_INQUIRY_FORM_TITLE);
  form.setDescription(
    "College recruiters can use this form to request athlete contact, transcripts, or additional film from Clarksburg High School Football."
  );
  form.setCollectEmail(true);

  addShortAnswer_(form, "Recruiter Full Name", true);
  addShortAnswer_(form, "College / Program", true);
  addShortAnswer_(form, "Role / Title", true);
  addShortAnswer_(form, "Recruiter Phone Number", false);
  addShortAnswer_(form, "Athlete Name", true);
  addShortAnswer_(form, "Graduation Year", false);
  addParagraph_(form, "What information are you requesting?", true);
  addParagraph_(form, "Additional message", false);

  Logger.log("Recruiter Inquiry Form URL: " + form.getPublishedUrl());
  Logger.log("Recruiter Inquiry Edit URL: " + form.getEditUrl());
}

function syncAthleteSheet() {
  const spreadsheet = getRecruitingSpreadsheet_();
  const responseSheet = getResponseSheet_(spreadsheet);
  const athleteSheet = upsertAthleteSheet_(spreadsheet);
  const overridesMap = getExistingOverridesMap_(athleteSheet);
  const rows = responseSheet.getDataRange().getValues();

  if (rows.length <= 1) {
    if (athleteSheet.getLastRow() > 1) {
      athleteSheet
        .getRange(2, 1, athleteSheet.getLastRow() - 1, athleteSheet.getLastColumn())
        .clearContent();
    }
    return;
  }

  const headers = rows[0];
  const payload = rows.slice(1).map((row) => mapRowToAthlete_(headers, row));
  const values = payload.map((athlete) => flattenAthleteForSheet_(athlete, overridesMap[athlete.id] || {}));

  athleteSheet.getRange(2, 1, Math.max(athleteSheet.getMaxRows() - 1, 1), athleteSheet.getLastColumn()).clearContent();
  athleteSheet.getRange(2, 1, values.length, values[0].length).setValues(values);
}

function repairRecruitingWorkflow() {
  const spreadsheet = getRecruitingSpreadsheet_();
  upsertAthleteSheet_(spreadsheet);

  ScriptApp.getProjectTriggers()
    .filter(function (trigger) {
      return trigger.getHandlerFunction() === "syncAthleteSheet";
    })
    .forEach(function (trigger) {
      ScriptApp.deleteTrigger(trigger);
    });

  ScriptApp.newTrigger("syncAthleteSheet").forSpreadsheet(spreadsheet).onFormSubmit().create();
  syncAthleteSheet();

  Logger.log("Recruiting workflow repaired for spreadsheet: " + spreadsheet.getUrl());
}

function adoptExistingRecruitingSpreadsheet() {
  if (!safeString_(EXISTING_RECRUITING_SPREADSHEET_ID)) {
    throw new Error("Set EXISTING_RECRUITING_SPREADSHEET_ID at the top of the script first.");
  }

  const spreadsheet = SpreadsheetApp.openById(EXISTING_RECRUITING_SPREADSHEET_ID);
  PropertiesService.getScriptProperties().setProperty(SPREADSHEET_ID_PROPERTY, spreadsheet.getId());
  if (safeString_(EXISTING_RECRUITING_FORM_ID)) {
    PropertiesService.getScriptProperties().setProperty(FORM_ID_PROPERTY, EXISTING_RECRUITING_FORM_ID);
  }

  upsertAthleteSheet_(spreadsheet);

  ScriptApp.getProjectTriggers()
    .filter(function (trigger) {
      return trigger.getHandlerFunction() === "syncAthleteSheet";
    })
    .forEach(function (trigger) {
      ScriptApp.deleteTrigger(trigger);
    });

  ScriptApp.newTrigger("syncAthleteSheet").forSpreadsheet(spreadsheet).onFormSubmit().create();
  syncAthleteSheet();

  Logger.log("Now using existing recruiting spreadsheet: " + spreadsheet.getUrl());
}

function sendEditLinksToAllRespondents() {
  const form = getRecruitingForm_();
  const responses = form.getResponses();
  let sentCount = 0;
  const skipped = [];

  form.setAllowResponseEdits(true);

  responses.forEach(function (response) {
    const email = safeString_(response.getRespondentEmail());
    const editUrl = safeString_(response.getEditResponseUrl());
    const athleteName = getAthleteNameFromResponse_(response);

    if (!email || !editUrl) {
      skipped.push(athleteName || email || response.getId() || "unknown response");
      return;
    }

    MailApp.sendEmail({
      to: email,
      subject: "Update your Clarksburg Football recruiting profile",
      htmlBody: buildEditLinkEmail_(athleteName, editUrl),
      name: "Clarksburg Football Recruiting",
    });

    sentCount += 1;
  });

  Logger.log("Sent edit links: " + sentCount);
  Logger.log("Skipped responses: " + JSON.stringify(skipped));
}

function debugRecruitingWorkflow() {
  const spreadsheet = getRecruitingSpreadsheet_();
  const responseSheet = getResponseSheet_(spreadsheet);
  const rows = responseSheet.getDataRange().getValues();
  const headers = rows.length ? rows[0] : [];
  const expectedHeaders = getExpectedResponseHeaders_();
  const missingHeaders = expectedHeaders.filter(function (header) {
    return headers.indexOf(header) === -1;
  });

  Logger.log("Spreadsheet URL: " + spreadsheet.getUrl());
  Logger.log("Response sheet: " + responseSheet.getName());
  Logger.log("Header count: " + headers.length);
  Logger.log("Headers: " + JSON.stringify(headers));
  Logger.log("Missing expected headers: " + JSON.stringify(missingHeaders));
  Logger.log("Response row count: " + Math.max(rows.length - 1, 0));
}

function doGet(e) {
  const spreadsheet = getRecruitingSpreadsheet_();
  const athleteSheet = spreadsheet.getSheetByName(SHEET_NAME);
  const rows = athleteSheet.getDataRange().getValues();

  if (rows.length <= 1) {
    return formatOutput_(e, { athletes: [] });
  }

  const headers = rows[0];
  const athletes = rows
    .slice(1)
    .map((row) => mapAthleteSheetRowToJson_(headers, row))
    .filter(function (athlete) {
      return athlete !== null;
    });

  return formatOutput_(e, { athletes: athletes });
}

function upsertAthleteSheet_(spreadsheet) {
  const athleteSheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  const headers = [
    "id",
    "publish",
    "name",
    "graduationYear",
    "jerseyNumber",
    "positions",
    "height",
    "weight",
    "gpa",
    "why",
    "xHandle",
    "hudlUrl",
    "highlightUrl",
    "photoUrl",
    "hometown",
    "academicInterests",
    "statsSummary",
    "coachNote",
    "achievements",
    "passingYards",
    "passingTouchdowns",
    "rushingYards",
    "rushingTouchdowns",
    "receptions",
    "receivingYards",
    "touchdowns",
    "tackles",
    "interceptions",
    "benchMax",
    "squatMax",
  ];

  const existingHeaderValues =
    athleteSheet.getLastRow() >= 1
      ? athleteSheet.getRange(1, 1, 1, headers.length).getValues()[0]
      : [];

  if (existingHeaderValues.join("|") !== headers.join("|")) {
    athleteSheet.clear();
    athleteSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  athleteSheet.setFrozenRows(1);
  return athleteSheet;
}

function getResponseSheet_(spreadsheet) {
  const sheets = spreadsheet.getSheets().filter(function (sheet) {
    return sheet.getName() !== SHEET_NAME;
  });

  const preferredSheet = sheets.find(function (sheet) {
    const headers = getSheetHeaders_(sheet);
    return (
      headers.indexOf("Athlete Full Name") !== -1 &&
      headers.indexOf("Graduation Year") !== -1 &&
      headers.indexOf("Hudl Profile URL") !== -1
    );
  });

  if (preferredSheet) {
    return preferredSheet;
  }

  if (sheets.length) {
    return sheets[0];
  }

  throw new Error("No response sheet found. Make sure the Google Form is linked to the recruiting spreadsheet.");
}

function getSheetHeaders_(sheet) {
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) {
    return [];
  }

  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function getExpectedResponseHeaders_() {
  return [
    "Athlete Full Name",
    "Graduation Year",
    "Jersey Number",
    "Primary Position",
    "Secondary Position",
    "Height",
    "Weight",
    "GPA",
    "Hometown",
    "Athlete Cell Phone",
    "Athlete Email",
    "X Handle",
    "Parent / Guardian Name",
    "Parent / Guardian Email",
    "Parent / Guardian Phone",
    "Why do you play football?",
    "Hudl Profile URL",
    "Highlight Video URL",
    "Academic Interests / Intended Major",
    "Honors / Awards / Recruiting Notes",
    "Season Stats Summary",
    "Passing Yards",
    "Passing Touchdowns",
    "Rushing Yards",
    "Rushing Touchdowns",
    "Receptions",
    "Receiving Yards",
    "Receiving / Total Touchdowns",
    "Tackles",
    "Interceptions",
    "Bench Max",
    "Squat Max",
  ];
}

function mapRowToAthlete_(headers, row) {
  const entry = {};
  headers.forEach((header, index) => {
    entry[header] = row[index];
  });

  const photoUploadValue = getFirstValue_(entry, [
    "Headshot / Athlete Photo",
    "Upload Athlete Headshot",
    "Profile Picture (Appropriate Pic!)",
  ]);
  const photoUrl = normalizePhotoValue_(photoUploadValue);
  const primaryPosition = getFirstValue_(entry, ["Primary Position"]);
  const secondaryPosition = getFirstValue_(entry, ["Secondary Position"]);

  return {
    id: buildSlug_(getFirstValue_(entry, ["Athlete Full Name"]), getFirstValue_(entry, ["Graduation Year"])),
    name: getFirstValue_(entry, ["Athlete Full Name"]),
    graduationYear: getFirstValue_(entry, ["Graduation Year"]),
    jerseyNumber: getFirstValue_(entry, ["Jersey Number"]),
    positions: [primaryPosition, secondaryPosition].filter(Boolean).join(" / "),
    height: getFirstValue_(entry, ["Height"]),
    weight: getFirstValue_(entry, ["Weight"]),
    gpa: getFirstValue_(entry, ["GPA"]),
    why: getFirstValue_(entry, ["Why do you play football?"]),
    xHandle: getFirstValue_(entry, ["X Handle"]),
    hudlUrl: getFirstValue_(entry, ["Hudl Profile URL"]),
    highlightUrl: getFirstValue_(entry, ["Highlight Video URL"]),
    photoUrl: safeString_(photoUrl),
    hometown: getFirstValue_(entry, ["Hometown"]),
    academicInterests: getFirstValue_(entry, ["Academic Interests / Intended Major"]),
    statsSummary: getFirstValue_(entry, ["Season Stats Summary"]),
    achievements: getFirstValue_(entry, ["Honors / Awards / Recruiting Notes"]),
    passingYards: getFirstValue_(entry, ["Passing Yards"]),
    passingTouchdowns: getFirstValue_(entry, ["Passing Touchdowns"]),
    rushingYards: getFirstValue_(entry, ["Rushing Yards"]),
    rushingTouchdowns: getFirstValue_(entry, ["Rushing Touchdowns"]),
    receptions: getFirstValue_(entry, ["Receptions"]),
    receivingYards: getFirstValue_(entry, ["Receiving Yards"]),
    touchdowns: getFirstValue_(entry, ["Receiving / Total Touchdowns"]),
    tackles: getFirstValue_(entry, ["Tackles"]),
    interceptions: getFirstValue_(entry, ["Interceptions"]),
    benchMax: getFirstValue_(entry, ["Bench Max"]),
    squatMax: getFirstValue_(entry, ["Squat Max"]),
  };
}

function flattenAthleteForSheet_(athlete, overrides) {
  return [
    athlete.id,
    safeString_(overrides.publish),
    athlete.name,
    athlete.graduationYear,
    athlete.jerseyNumber,
    athlete.positions,
    athlete.height,
    athlete.weight,
    athlete.gpa,
    athlete.why,
    athlete.xHandle,
    athlete.hudlUrl,
    athlete.highlightUrl,
    athlete.photoUrl,
    athlete.hometown,
    athlete.academicInterests,
    athlete.statsSummary,
    safeString_(overrides.coachNote),
    athlete.achievements,
    athlete.passingYards,
    athlete.passingTouchdowns,
    athlete.rushingYards,
    athlete.rushingTouchdowns,
    athlete.receptions,
    athlete.receivingYards,
    athlete.touchdowns,
    athlete.tackles,
    athlete.interceptions,
    athlete.benchMax,
    athlete.squatMax,
  ];
}

function mapAthleteSheetRowToJson_(headers, row) {
  const entry = {};
  headers.forEach((header, index) => {
    entry[header] = row[index];
  });

  if (safeString_(entry.publish).toLowerCase() !== "yes") {
    return null;
  }

  const positions = safeString_(entry.positions)
    .split("/")
    .map((position) => position.trim())
    .filter(Boolean);

  const achievements = safeString_(entry.achievements)
    .split(/[,;\n]/)
    .map((achievement) => achievement.trim())
    .filter(Boolean);

  return {
    id: safeString_(entry.id),
    name: safeString_(entry.name),
    graduationYear: safeString_(entry.graduationYear),
    jerseyNumber: safeString_(entry.jerseyNumber),
    positions: positions,
    height: safeString_(entry.height),
    weight: safeString_(entry.weight),
    gpa: safeString_(entry.gpa),
    why: safeString_(entry.why),
    xHandle: safeString_(entry.xHandle),
    hudlUrl: safeString_(entry.hudlUrl),
    highlightUrl: safeString_(entry.highlightUrl),
    photoUrl: safeString_(entry.photoUrl),
    hometown: safeString_(entry.hometown),
    academicInterests: safeString_(entry.academicInterests),
    statsSummary: safeString_(entry.statsSummary),
    coachNote: safeString_(entry.coachNote),
    achievements: achievements,
    stats: buildStatsObject_(entry),
  };
}

function buildStatsObject_(entry) {
  const statKeys = [
    "passingYards",
    "passingTouchdowns",
    "rushingYards",
    "rushingTouchdowns",
    "receptions",
    "receivingYards",
    "touchdowns",
    "tackles",
    "interceptions",
    "benchMax",
    "squatMax",
  ];

  return statKeys.reduce(function (stats, key) {
    const value = safeString_(entry[key]);
    if (value) {
      stats[key] = value;
    }
    return stats;
  }, {});
}

function normalizePhotoValue_(photoUploadValue) {
  const raw = safeString_(photoUploadValue);
  const fileIdMatch = raw.match(/[-\w]{25,}/);

  if (!fileIdMatch) {
    return raw;
  }

  const fileId = fileIdMatch[0];

  if (MAKE_PHOTOS_PUBLIC) {
    try {
      DriveApp.getFileById(fileId).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (error) {
      Logger.log("Unable to update file sharing for " + fileId + ": " + error);
    }
  }

  return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1200";
}

function addShortAnswer_(form, title, required) {
  form.addTextItem().setTitle(title).setRequired(required);
}

function addParagraph_(form, title, required) {
  form.addParagraphTextItem().setTitle(title).setRequired(required);
}

function addSectionHeader_(form, title, helpText) {
  const item = form.addSectionHeaderItem().setTitle(title);
  if (helpText) {
    item.setHelpText(helpText);
  }
}

function getAthleteNameFromResponse_(response) {
  const itemResponses = response.getItemResponses();

  for (var i = 0; i < itemResponses.length; i += 1) {
    var itemResponse = itemResponses[i];
    if (itemResponse.getItem().getTitle() === "Athlete Full Name") {
      return safeString_(itemResponse.getResponse());
    }
  }

  return "";
}

function buildEditLinkEmail_(athleteName, editUrl) {
  const greeting = athleteName ? "Hi " + athleteName + "," : "Hi,";

  return [
    "<p>" + greeting + "</p>",
    "<p>You can use the link below to update your Clarksburg High School Football recruiting profile, including your headshot, film links, and other information.</p>",
    '<p><a href="' + editUrl + '">Edit your recruiting profile</a></p>',
    "<p>If the link opens in the wrong Google account, switch to your school account first and then reopen it.</p>",
    "<p>Clarksburg Football</p>",
  ].join("");
}

function safeString_(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function getFirstValue_(entry, possibleHeaders) {
  for (var i = 0; i < possibleHeaders.length; i += 1) {
    var value = safeString_(entry[possibleHeaders[i]]);
    if (value) {
      return value;
    }
  }

  return "";
}

function buildSlug_(name, year) {
  return (
    safeString_(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    safeString_(year)
  );
}

function getRecruitingSpreadsheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_PROPERTY);

  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID not found. Run createRecruitingWorkflow() first.");
  }

  return SpreadsheetApp.openById(spreadsheetId);
}

function getRecruitingForm_() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const formId = safeString_(scriptProperties.getProperty(FORM_ID_PROPERTY)) || safeString_(EXISTING_RECRUITING_FORM_ID);

  if (!formId) {
    throw new Error("Form ID not found. Set FORM_ID_PROPERTY or EXISTING_RECRUITING_FORM_ID first.");
  }

  return FormApp.openById(formId);
}

function formatOutput_(e, payload) {
  const callbackName = e && e.parameter ? e.parameter.callback || e.parameter.prefix : "";
  const text = JSON.stringify(payload);

  if (callbackName) {
    return ContentService.createTextOutput(callbackName + "(" + text + ")").setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
  }

  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function getExistingOverridesMap_(athleteSheet) {
  const rows = athleteSheet.getDataRange().getValues();

  if (rows.length <= 1) {
    return {};
  }

  const headers = rows[0];
  const idIndex = headers.indexOf("id");
  const publishIndex = headers.indexOf("publish");
  const coachNoteIndex = headers.indexOf("coachNote");

  if (idIndex === -1 || publishIndex === -1 || coachNoteIndex === -1) {
    return {};
  }

  return rows.slice(1).reduce(function (map, row) {
    const id = safeString_(row[idIndex]);
    if (id) {
      map[id] = {
        publish: safeString_(row[publishIndex]),
        coachNote: safeString_(row[coachNoteIndex]),
      };
    }
    return map;
  }, {});
}
