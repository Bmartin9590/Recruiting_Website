# Quick Setup

## Local Preview

From this folder, run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Live Data Checklist

1. Run `createRecruitingWorkflow()` in Apps Script.
2. Run `createRecruiterInquiryForm()` if you want recruiters to contact staff through a private intake form instead of seeing direct phone numbers.
3. Copy the public Google Form URL into `js/config.js`.
4. Copy the recruiter inquiry form URL into `recruiterInquiryUrl` in `js/config.js`.
5. Deploy the Apps Script as a web app and copy the web app URL into `js/config.js`.
6. Change `dataMode` from `"local"` to `"remote"`.
7. Replace the placeholder athlete entries in `data/athletes.json` if you want your local demo data to match your real roster.
8. If direct JSON fetch is blocked on your host, add the same Apps Script URL to `remoteJsonpUrl`.

## Coaching Workflow

- Athletes complete the form.
- You review the Google Sheet.
- You set `publish` to `yes` for athletes ready to go live.
- The public site automatically reflects approved fields from the sheet feed.
- Recruiters use the recruiter inquiry form instead of scraping direct phone numbers from the site.

Public-safe athlete contact option:
- Add each athlete's approved `X Handle` in the athlete form so recruiters can message them without exposing phone numbers.

## Suggested Next Additions

- Add an `Offers` field
- Add an `NCAA ID` field
- Add a `Transcript available on request` flag
- Add a `Combine metrics` section for 40, shuttle, vertical, and broad jump
