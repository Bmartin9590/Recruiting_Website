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

That creates:

- A Google Form for athlete submissions
- A linked Google Sheet for responses
- An `Athletes` sheet with public-facing fields
- An on-submit sync trigger

New form submissions land in the `Athletes` sheet with a blank `publish` column. Change that value to `yes` only when you want an athlete visible on the public website.

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
  dataMode: "remote",
  remoteDataUrl: "YOUR_APPS_SCRIPT_WEB_APP_URL",
  remoteJsonpUrl: "YOUR_APPS_SCRIPT_WEB_APP_URL",
  localDataUrl: "./data/athletes.json",
  coachEmail: "your-email@example.com",
  coachPhone: "(240) 555-0147",
};
```

`remoteJsonpUrl` gives you a fallback for static hosting if the browser blocks direct cross-origin fetches to the Apps Script endpoint.

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

### Photos

Google Form file uploads usually require respondents to sign in with Google. If you want no-login submissions, use the `Photo URL` field instead and have athletes paste a headshot link.

The Apps Script includes a `MAKE_PHOTOS_PUBLIC` flag. Leave it `false` unless you are comfortable making uploaded athlete photos viewable on the public site.

### Hudl stats

The workflow includes a Hudl profile link and manual stat fields. Automatic Hudl stat pulling is not included here because Hudl access and data availability vary, and many setups require a private integration or manual export workflow.

If you want, the next step can be a Hudl import helper that converts exported stat CSVs into the JSON feed.

### Logo

This build includes a custom Clarksburg-themed SVG mark in `assets/clarksburg-football-mark.svg` so the site is usable immediately. If you have the official school logo file, replace that SVG with your official asset and keep the same filename for an instant swap.
