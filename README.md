# Govind Sarthi AI (श्री गोविंद सारथी)

A spiritual, philosophical reflection journal inspired by the **Bhagavad Gita** and **Mahabharata**, built with **Google Gemini 3.6 Flash**, **Firebase Authentication**, and **Cloud Firestore**.

Govind acts as a divine charioteer (सारथी) and compassionate conscience guide, helping users untangle internal moral dilemmas (द्वंद्व), anger, attachment, and self-doubt using timeless wisdom and Socratic inquiry.

The application isolates each seeker's reflections with strict Firestore security rules and protects API credentials using server-side proxies and Google Cloud Secret Manager.

---

## Architecture & Spiritual Experience Highlights

1. **Divine Conscience Guide (Shri Govind Persona)**: Empathetic, dignified guidance addressing the user as Parth (पार्थ), focusing on self-realization (आत्म-बोध), Nishkama Karma (निष्काम कर्म), and timeless moral perspectives from the Gita and Mahabharata.
2. **Context-Aware Sanskrit Shlokas**: Auspicious verses (e.g. *Karmanye Vadhikaraste*, *Yada Yada Hi Dharmasya*, *Krodhad Bhavati Sammohah*) dynamically paired with reflections.
3. **Flute & Tanpura Drone with Smart Ducking**: Built-in Web Audio synthesis providing meditative acoustic accompaniment that smoothly ducks to 5% volume when Govind speaks and fades back to 22% afterwards.
4. **3D Botanical Floating Petals**: Dynamic canvas simulating drifting garden petals responding organically to breeze and cursor movement.
5. **Strict Firestore Authorization**: Database security rules restrict access solely to documents under `/users/{userId}/interactions/{interactionId}` where `request.auth.uid == userId`.
6. **Resilient Gemini 3.6 Flash Fallback Ladder**:
   - Primary: `gemini-3.6-flash`
   - High-Availability Fallback: `gemini-3.1-flash-lite`
   - Dynamic Alias: `gemini-flash-latest`
   - Deep Reasoning Fallback: `gemini-3.7-flash`
7. **Zero-Hardcoding Hygiene**: `GEMINI_API_KEY` is completely isolated to the server-side Express backend and injected dynamically via Secret Manager / environment variables.
8. **Zero-Crash Payload Hygiene**: Strict recursive undefined-stripping prior to database write operations.

---

## 1. Environment & Prerequisites

Ensure the following tools are installed and configured:
- [Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/install)
- [Firebase CLI](https://firebase.google.com/docs/cli)
- [Node.js (v20+)](https://nodejs.org/)

### Enable Required Google Cloud APIs

```bash
# Set your project ID
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export REGION="us-central1"
export SERVICE_NAME="govind-sarthi-ai"

gcloud config set project $PROJECT_ID

# Enable Cloud Run, Secret Manager, Cloud Build, and Cloud Firestore APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com
```

---

## 2. Secret Management Setup

Create the `GEMINI_API_KEY` in Google Cloud Secret Manager and grant the Cloud Run runtime service account the necessary IAM permissions to access it.

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Identify your project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# 3. Grant the Compute Engine / Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration & Rules

Deploy owner-bound Firestore security rules ensuring user data isolation:

### `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Cloud Run Deployment Flow

Deploy the containerized full-stack application directly to Google Cloud Run, mounting the `GEMINI_API_KEY` secret:

```bash
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port=3000
```

### Required Campaign Verification Labeling

Apply the mandatory challenge label to register the service for automated campaign verification:

```bash
gcloud run services update $SERVICE_NAME \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=$REGION
```

---

## 5. Threat Summary Table (OWASP & LLM 5 Threat Zones)

| Threat Zone | OWASP Reference | Identified Risk | Active Countermeasure | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Input Surfaces** | OWASP A03 / LLM02 | Malicious prompt injections, oversized payload buffer exhaustion | Strict 8000-character input cap, JSON body validation, null-safe destructuring | Enforced |
| **Planning & Reasoning** | OWASP LLM01 | Indirect prompt injection hijacking assistant persona | Scoped Govind Sarthi master prompt, user content partitioned as plain data | Enforced |
| **Tool Execution** | OWASP A01 / LLM06 | Privilege escalation via dynamic code execution or shell access | Scoped REST endpoints (`/api/gemini/reflect` and `/api/reflections`), zero eval/exec | Enforced |
| **Memory & State** | OWASP A01 | Cross-user data leakage, document eavesdropping | Firestore security rules strictly enforcing `request.auth.uid == userId` | Enforced |
| **Inter-System Communication** | OWASP A02 | Browser API key theft, transient upstream outages | Keys kept server-only; 4-tier model fallback ladder (`3.6-flash` &rarr; `3.1-flash-lite` &rarr; `flash-latest` &rarr; `3.7-flash`) | Enforced |

---

## 6. Functional Test Cases & Verification Walkthrough

Every user interaction is covered by an explicit verification procedure:

### Test Case 1: Landing Page & Botanical Atmosphere
- **Step 1.1**: Open root URL in browser.
- **Expected Result**: The Celestial Garden landing page displays with "श्री गोविंद सारथी", Sanskrit verse banner, and floating petals animation.
- **Step 1.2**: Click "बांसुरी संगीत" in the top bar.
- **Expected Result**: Ambient meditative tanpura and flute drone commences smoothly.
- **Step 1.3**: Click "सुरक्षा एवं Threat Model" button.
- **Expected Result**: Threat Model modal opens, displaying the 5 threat zones, OWASP mappings, and deployed `firestore.rules`.

### Test Case 2: User Authentication via Google Sign-In
- **Step 2.1**: Click "Google से प्रवेश करें" (or "पार्थ (Arjuna) के रूप में प्रवेश करें" for instant sandbox preview).
- **Expected Result**: The user authenticates and enters the private dashboard addressed with honor as Parth (पार्थ).

### Test Case 3: Creating a Spiritual Reflection & Receiving Counsel
- **Step 3.1**: In the reflection composer, enter: `"कक्षा में मित्र पर क्रोधित हो गया क्योंकि उसने अनुचित उपहास किया..."`
- **Step 3.2**: Click "मार्गदर्शन लें" or press `Enter`.
- **Expected Result**:
  1. User message bubble renders immediately in the conversation stream.
  2. Shri Govind responds with compassionate Gita wisdom on overcoming anger (क्रोध).
  3. A dedicated Sanskrit Shloka banner (*Krodhad Bhavati Sammohah*) is displayed.
  4. Ambient music volume ducks smoothly as Govind's voice guidance plays.
  5. Persistence indicator confirms write to Firestore (`/users/{userId}/interactions/{interactionId}`).

### Test Case 4: Switching Reflection Modes (दृष्टिकोण & सार)
- **Step 4.1**: Click the "दृष्टिकोण (Angles)" tab or click "मार्गदर्शन के दृष्टिकोण".
- **Expected Result**: Govind provides 4 distinct dharmic perspectives to resolve the inner dilemma.
- **Step 4.2**: Click "सारांश एवं निष्काम कर्म संदेश".
- **Expected Result**: An executive synthesis card appears summarizing the core conflict (द्वंद्व) and actionable duty steps.

### Test Case 5: Audio Controls & Speech Synthesis
- **Step 5.1**: Click the speaker icon on any message bubble.
- **Expected Result**: Speech synthesis reads Govind's counsel aloud with soothing cadence.
- **Step 5.2**: Click the "वाणी सक्रिय / मौन" toggle in the header.
- **Expected Result**: Toggles vocal playback state without affecting ambient background drone.

### Test Case 6: History Navigation & Search
- **Step 6.1**: Click "+ नवीन चिंतन" in the sidebar.
- **Expected Result**: A fresh reflection canvas opens with welcome message and thought starters.
- **Step 6.2**: In the sidebar search bar, type a keyword from the previous reflection.
- **Expected Result**: The list filters instantly. Click the item to reload and resume dialogue.

### Test Case 7: Data Isolation & Sign Out
- **Step 7.1**: Click "प्रस्थान करें (Sign Out)" in the top right.
- **Expected Result**: Auth session is cleared, audio stops, and the user returns to the Landing Page.
- **Step 7.2**: Sign in with another account.
- **Expected Result**: Previous user's documents remain completely inaccessible under Firestore rules.
