# Quick Setup

## Local Preview

From this folder, run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Live Data Checklist

1. Run `createRecruitingWorkflow()` in Apps Script.
2. Copy the public Google Form URL into `js/config.js`.
3. Deploy the Apps Script as a web app and copy the web app URL into `js/config.js`.
4. Change `dataMode` from `"local"` to `"remote"`.
5. Replace the placeholder athlete entries in `data/athletes.json` if you want your local demo data to match your real roster.
6. If direct JSON fetch is blocked on your host, add the same Apps Script URL to `remoteJsonpUrl`.

## Coaching Workflow

- Athletes complete the form.
- You review the Google Sheet.
- You set `publish` to `yes` for athletes ready to go live.
- The public site automatically reflects approved fields from the sheet feed.
- College coaches use the site instead of asking for separate documents.

## Suggested Next Additions

- Add an `Offers` field
- Add an `NCAA ID` field
- Add a `Transcript available on request` flag
- Add a `Combine metrics` section for 40, shuttle, vertical, and broad jump
