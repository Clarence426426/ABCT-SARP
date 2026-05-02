# Google Apps Script Web App

Use this folder for the fully Google-hosted version of the ABCT SARP Form.

## Deploy

1. Open [script.google.com](https://script.google.com).
2. Create a new Apps Script project.
3. Create two files in the project:
   - `Code.gs`
   - `Index.html`
4. Paste the contents of this folder's `Code.gs` into Apps Script's `Code.gs`.
5. Paste the contents of this folder's `Index.html` into Apps Script's `Index.html`.
6. Click **Deploy** > **New deployment**.
7. Select **Web app**.
8. Set **Execute as** to **Me**.
9. Set **Who has access** to the group you want:
   - **Anyone**: users outside your organization can open it.
   - **Anyone within your organization**: only your institution can open it.
10. Click **Deploy** and copy the web app URL.

Users open that web app URL directly. When they click **Submit Final**, Apps Script saves the data into a Google Sheet named `ABCT SARP Submissions` in your Drive.

## Updating Later

After editing `Index.html` or `Code.gs` in Apps Script, go to **Deploy** > **Manage deployments**, edit the active deployment, choose **New version**, then deploy again.
