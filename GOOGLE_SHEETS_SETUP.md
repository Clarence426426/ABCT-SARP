# Google Sheets Submission Setup

This app can save final submissions to a Google Sheet through Google Apps Script.

## 1. Create the backend

1. Open [script.google.com](https://script.google.com).
2. Create a new project.
3. Replace the default `Code.gs` with the contents of `google-sheets-backend/Code.gs`.
4. Click **Deploy** > **New deployment**.
5. Choose **Web app**.
6. Set **Execute as** to **Me**.
7. Set **Who has access** to **Anyone**.
8. Deploy and copy the web app URL. It should end with `/exec`.

## 2. Connect the app

Open `index.html` and replace this line:

```js
const GOOGLE_SHEETS_WEB_APP_URL = "";
```

with your deployed Apps Script URL:

```js
const GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
```

## 3. Publish the form

Host the folder with `index.html`, `styles.css`, `app.js`, and `assets/` on a static host such as GitHub Pages, Netlify, or Vercel.

When users click **Submit Final**, their data will be saved into a Google Sheet named `ABCT SARP Submissions` in your Google Drive.
