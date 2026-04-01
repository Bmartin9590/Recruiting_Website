# Clarksburg Football Recruiting Hub

This project gives you one clean recruiting workflow:

1. Athletes submit one Google Form.
2. Responses land in one Google Sheet.
3. An Apps Script publishes public-safe athlete JSON.
4. This static site reads that JSON and renders athlete profiles.

The site is plain HTML, CSS, and JavaScript so it can be hosted free on GitHub Pages.

## What's Included

- `index.html`: the recruiting landing page and athlete profile experience
- `styles.css`: glass-inspired navy, Carolina blue, and white theme
- `js/config.js`: switch between sample local data and a live Apps Script endpoint
- `data/athletes.json`: sample athlete data so the site works immediately
- `google-apps-script/RecruitingWorkflow.gs`: script to create the Google Form and publish athlete JSON

## Recommended Workflow

### 1. Create the Google Form and Sheet

1. Open [script.google.com](https://script.google.com).
2. Create a new Apps Script project.
3. Paste in `google-apps-script/RecruitingWorkflow.gs`.
4. Replace the default `appsscript.json` manifest with the one in this repo.
5. Run `createRecruitingWorkflow()` once.
6. Approve Google permissions.
7. Open the generated Google Form and add one `File upload` question under the `Athlete Headshot` section.
8. Title that question `Upload Athlete Headshot` and use help text like: `Upload a clear head-and-shoulders photo from your phone. Use a single-athlete photo with no filters, sunglasses, or group shots.`

That creates:

- A Google Form for athlete submissions
- A linked Google Sheet for responses
- An `Athletes` sheet with public-facing fields
- An on-submit sync trigger

New form submissions land in the `Athletes` sheet with a blank `publish` column. Change that value to `yes` only when you want an athlete visible on the public website.

### 1B. Create the recruiter inquiry form

Run `createRecruiterInquiryForm()` in the same Apps Script project if you want recruiters to request contact, transcripts, or additional film without exposing coach or athlete phone numbers on the public website.

### 2. Deploy the JSON endpoint

1. In Apps Script, click `Deploy` > `New deployment`.
2. Choose `Web app`.
3. Execute as: `Me`
4. Who has access: `Anyone`
5. Deploy and copy the web app URL

### 3. Connect the website

Update `js/config.js`:

```js
window.RECRUITING_CONFIG = {
  schoolName: "Clarksburg High School Football",
  formUrl: "YOUR_GOOGLE_FORM_URL",
  recruiterInquiryUrl: "YOUR_RECRUITER_INQUIRY_FORM_URL",
  dataMode: "remote",
  remoteDataUrl: "YOUR_APPS_SCRIPT_WEB_APP_URL",
  remoteJsonpUrl: "YOUR_APPS_SCRIPT_WEB_APP_URL",
  localDataUrl: "./data/athletes.json",
  coachEmail: "",
  coachPhone: "",
  displayCoachDirectContact: false,
  publicContactNote:
    "Recruiters can request athlete contact, transcripts, and additional information through our recruiting request form.",
};
```

`remoteJsonpUrl` gives you a fallback for static hosting if the browser blocks direct cross-origin fetches to the Apps Script endpoint.

Do not put private phone numbers or non-public email addresses in `js/config.js`. This repository is a static website, so any client-side config is publicly viewable.

### 4. Host for free

GitHub Pages is the simplest option.

1. Put these files in a GitHub repository.
2. Push to GitHub.
3. In repository settings, enable `Pages` from the main branch.
4. Your site will be live on a free GitHub Pages URL.

## Important Notes

### Student privacy

The Google Form can collect phone numbers and parent contact info, but the public JSON feed intentionally excludes private contact fields. The public website should only show recruiting-safe profile data.

This build also adds a coach approval gate: athletes are not shown publicly until the `publish` column in the `Athletes` sheet is set to `yes`.

Direct coach phone numbers and emails can stay hidden on the public site. The recommended setup is to use a separate recruiter inquiry form and keep `displayCoachDirectContact` set to `false`. If you place a phone number or email in `js/config.js`, treat it as public information.

If you want recruiters to contact athletes on their own, the safer public option is to collect an athlete-approved `X Handle` and display that on the profile instead of phone numbers.

### Photos

Google Form file uploads require athletes to sign in with Google, which works well for your school since every student already has an account. The script now adds an `Athlete Headshot` section, and you finish the setup by adding the `Upload Athlete Headshot` file-upload question manually in the form editor.

The Apps Script includes a `MAKE_PHOTOS_PUBLIC` flag. Leave it `false` unless you are comfortable making uploaded athlete photos viewable on the public site.

### Hudl stats

The workflow includes a Hudl profile link and manual stat fields. Automatic Hudl stat pulling is not included here because Hudl access and data availability vary, and many setups require a private integration or manual export workflow.

If you want, the next step can be a Hudl import helper that converts exported stat CSVs into the JSON feed.

### Logo

This build includes a custom Clarksburg-themed SVG mark in `assets/clarksburg-football-mark.svg` so the site is usable immediately. If you have the official school logo file, replace that SVG with your official asset and keep the same filename for an instant swap.

### Hardening notes

- Athlete profile text is sanitized before it is rendered on the public site.
- Public links and image URLs are restricted to safe URL formats.
- The page includes a restrictive Content Security Policy to reduce injection risk.
- Coach-only publication control stays in the `publish` column of the `Athletes` sheet.
- Coach public notes are preserved during syncs and are no longer collected from athletes through the intake form.
