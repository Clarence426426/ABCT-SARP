# ABCT SARP Form

A browser-based ABCT SARP score entry form.

## Use

Open `index.html` in a browser, or publish this repository with GitHub Pages.

## Google Sheets Submissions

To save final submissions centrally, deploy the Apps Script backend in `google-sheets-backend/Code.gs`, then paste the deployed `/exec` URL into `GOOGLE_SHEETS_WEB_APP_URL` in `index.html`.

Without that URL, the form still works locally and downloads a JSON submission file when users submit.
