# Demo video recorder

Records a narrated, captioned walkthrough of the citizen-report flow:

1. A citizen reports a stalled site (with photo) on the public portal.
2. Staff see it on the dashboard.
3. Staff triage and escalate it to a fraud flag, which blocks payment.
4. The project page shows the citizen signal and the open flag.
5. The two-person rule: whoever raised the flag can't clear it.
6. A second reviewer resolves it.
7. The citizen checks back with their tracking code and sees the outcome.

## Run

Start the full stack first (`docker compose up -d`, then the staff dashboard on
:5173). Use seeded demo data (`python manage.py seed_infratrack`) and log-ins from
the main README.

```bash
cd scripts/demo
npm install
npm run record
```

Output: `video/infratrack-citizen-report-demo.webm` (1366×768, VP9), about 3 minutes.

## Notes

- It drives the Microsoft Edge that's installed on the machine (`channel: "msedge"`),
  so Playwright never downloads a browser. Change `channel` in `record-demo.js`
  to use Chrome instead.
- Frames come from the DevTools screencast and are encoded to WebM inside the
  browser (`encode.js`), so **no ffmpeg is needed**. If encoding fails, the frames
  stay in `frames/`: rerun `node encode.js frames video/out.webm` without
  re-recording.
- Each take submits a real citizen report. The portal allows 3 reports per person
  per project per day (`CITIZEN_REPORT_DAILY_LIMIT_PER_PROJECT`), so clear earlier
  demo reports before retaking.
