# Privacy Policy — The Jobify Portal

**Effective date:** 2026-04-25
**Project type:** Free, open-source, non-commercial desktop application
**License:** MIT — free to use, modify, and distribute

---

## Plain-Language Summary

The Jobify Portal is a **local-first** application. It stores everything on your own machine. It has no servers, no accounts, no analytics, and no telemetry. The only data that ever leaves your machine is the text sent to third-party APIs that you explicitly configure — and that data goes directly to those services, not to any developer-controlled infrastructure.

You can verify every claim in this document by reading the source code. It is fully open.

---

## 1. Who This Policy Applies To

This policy applies to anyone who downloads, installs, or runs The Jobify Portal. There is no registration process and no user account. There is no "operator" in the traditional sense — the person running the app is in full control of their own data.

---

## 2. What Data the App Processes

### 2.1 Data Stored Locally on Your Device

The following data is written to your device's local app data directory and **never transmitted to any developer-controlled server:**

| Data | Purpose | Location on disk |
|------|---------|-----------------|
| Your name | Personalisation only | `config.json` |
| OpenAI API key | Used as credential for OpenAI API calls | `config.json` |
| RapidAPI key | Used as credential for JSearch API calls | `config.json` |
| Adzuna App ID + Key | Used as credentials for Adzuna API calls | `config.json` |
| Reed API key | Used as credential for Reed API calls | `config.json` |
| Preferred locations | Passed as search parameters to job APIs | `config.json` |
| Extracted skill profile | Displayed on the Skills screen | `config.json` |
| Resume embedding vector | Used for cosine similarity scoring | `config.json` |
| Scored job results | Displayed on the Jobs screen | `config.json` |

**Storage file paths:**

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\the-jobify-portal\config.json` |
| macOS | `~/Library/Application Support/the-jobify-portal/config.json` |
| Linux | `~/.config/the-jobify-portal/config.json` |

To delete all stored data, delete this file. Uninstalling the application does not automatically remove this file on all platforms.

### 2.2 Data Sent to Third-Party Services

The app makes outbound API calls **only when you initiate an action** (clicking Extract Details or Find Matching Jobs). The following data leaves your machine during those actions:

#### OpenAI (`api.openai.com`)
- **When:** On API key validation (Setup screen), on resume extraction (Upload screen), and on job/resume embedding generation
- **What is sent:**
  - Your OpenAI API key (as an HTTP Authorization header)
  - The raw text extracted from your resume PDF (for profile extraction and embedding)
  - Job title + company + job description text for each job (for embedding, during scoring)
- **What OpenAI does with this data:** Governed by [OpenAI's Privacy Policy](https://openai.com/privacy) and [API Data Usage Policies](https://openai.com/policies/api-data-usage-policies). As of 2025, OpenAI does not use API-submitted data to train models by default.

#### RapidAPI / JSearch (`jsearch.p.rapidapi.com`)
- **When:** Only if you have entered a RapidAPI key, and only when a job search runs
- **What is sent:**
  - Your RapidAPI key (as an HTTP header)
  - A search query string composed of your top skills and preferred locations (e.g. `"React Node.js in Bangalore, India"`) — no personal information
- **What RapidAPI does with this data:** Governed by [RapidAPI's Privacy Policy](https://rapidapi.com/privacy)

#### Adzuna (`api.adzuna.com`)
- **When:** Only if you have entered Adzuna credentials, and only when a job search runs
- **What is sent:**
  - Your Adzuna App ID and App Key (as URL query parameters)
  - A search query composed of your top skills and a city/country (e.g. `what=React Node.js&where=Berlin`) — no personal information
- **What Adzuna does with this data:** Governed by [Adzuna's Privacy Policy](https://www.adzuna.co.uk/privacy-policy)

#### Reed (`www.reed.co.uk`)
- **When:** Only if you have entered a Reed API key and London/UK is a preferred location, and only when a job search runs
- **What is sent:**
  - Your Reed API key (as an HTTP Basic Auth header)
  - A keyword string composed of your top skills — no personal information
- **What Reed does with this data:** Governed by [Reed's Privacy Policy](https://www.reed.co.uk/privacy-policy)

---

## 3. What Data the App Does NOT Collect

- ❌ No analytics or usage tracking of any kind
- ❌ No crash reporting sent to any server
- ❌ No telemetry, event logging, or behavioural data
- ❌ No advertising identifiers
- ❌ No data is ever sent to the developer of this application
- ❌ No accounts, no registration, no email addresses
- ❌ Your resume PDF is read from disk into memory and never copied, moved, or uploaded anywhere
- ❌ API keys are never logged to disk, the terminal, or any external service

---

## 4. Third-Party Services Summary

The app integrates with third-party APIs that you configure. Their privacy practices are independent of this project:

| Service | Required | Privacy Policy |
|---------|----------|---------------|
| OpenAI | Yes | [openai.com/privacy](https://openai.com/privacy) |
| RapidAPI (JSearch) | No | [rapidapi.com/privacy](https://rapidapi.com/privacy) |
| Adzuna | No | [adzuna.co.uk/privacy-policy](https://www.adzuna.co.uk/privacy-policy) |
| Reed | No | [reed.co.uk/privacy-policy](https://www.reed.co.uk/privacy-policy) |
| RemoteOK | No | [remoteok.com/privacy-policy](https://remoteok.com/privacy-policy) |

The app also makes a single unauthenticated GET request to `https://remoteok.com/api` during job searches when Remote is a preferred location. No credentials or personal data are sent in this request — only a standard `User-Agent` header identifying the application.

---

## 5. Children's Privacy

This application is not directed at children under the age of 13. It does not knowingly collect any personal information from children. Because all data is stored locally and no data is transmitted to the developer, there is no mechanism by which the developer could collect such information regardless.

---

## 6. Your Rights and Controls

Because this application stores all data locally and transmits nothing to the developer, you have complete control:

- **Access your data:** Open the config file at the path listed in Section 2.1 — it is a plain JSON file
- **Delete your data:** Delete the config file, or delete the `the-jobify-portal` app data folder entirely
- **Revoke API access:** Delete your API keys from the respective service dashboards (OpenAI, RapidAPI, Adzuna, Reed). Removing a key from the app's Setup screen and saving will overwrite the stored credential.
- **Audit the code:** The full source code is available in this repository. Every IPC handler, every fetch call, and every store write is readable.

---

## 7. Open Source and Auditability

This project is released under the **MIT License** and is fully open source. There are no obfuscated binaries, no minified-only distributions, and no proprietary backend services. Anyone can:

- Read the entire codebase to verify the claims in this policy
- Fork the project and modify it for personal use
- Contribute improvements under the same MIT license
- Self-host or self-build the application

Privacy claims made in this document can be verified directly against the source code at any time.

---

## 8. Changes to This Policy

If this project evolves in a way that materially changes how data is handled, the **Effective date** at the top of this document will be updated and the change will be described in the project's commit history. Because the project is open source, the full history of this file is publicly auditable via git.

---

## 9. Contact

This is a free, non-commercial, open-source project maintained by individual contributors. There is no company behind it.

For questions, concerns, or to report a privacy-related issue, please [open an issue](../../issues) in this repository.

---

*The Jobify Portal is free software. It will remain free. Your data is yours.*
