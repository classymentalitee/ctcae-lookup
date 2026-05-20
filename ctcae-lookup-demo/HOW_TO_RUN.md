# CTCAE Lookup — DEMO VERSION
# =============================================
# No API key needed. No cost. Runs locally.
# =============================================

## HOW TO RUN (takes about 5 minutes)

### Step 1 — Install Node.js (one-time only)
Go to https://nodejs.org and download the "LTS" version.
Run the installer, click Next through everything.

### Step 2 — Open a terminal
- Windows: press Windows key, type "cmd", press Enter
- Mac: press Cmd+Space, type "terminal", press Enter

### Step 3 — Navigate to this folder
Type this in the terminal (replace the path with wherever you unzipped this):

  Windows:  cd C:\Users\YourName\Downloads\ctcae-lookup-demo\backend
  Mac:      cd ~/Downloads/ctcae-lookup-demo/backend

### Step 4 — Install and run
Type these two commands, pressing Enter after each:

  npm install
  node server.js

### Step 5 — Open the app
Open your browser and go to:

  http://localhost:3000

That's it! The app is running.

## DEMO SEARCH TERMS THAT WORK
The demo has pre-built responses for these (try them!):
  - "low pancreatic enzymes"
  - "patient hasn't eaten in 2 days"
  - "WBC 1.8"
  - "creatinine 2.4, baseline 0.9"
  - "severe mouth sores, can't swallow"
  - "tingling and numbness in feet"
  - "hair loss"
  - Anything else → shows a general anorexia/nausea example

## TO STOP THE APP
Go back to the terminal and press Ctrl+C

## READY TO GO LIVE?
Use the other zip (ctcae-lookup.zip) which connects to the real AI.
Follow the DEPLOY.md instructions inside it.
