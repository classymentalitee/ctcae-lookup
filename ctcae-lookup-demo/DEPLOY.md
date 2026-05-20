# CTCAE Lookup — Deployment Guide
# ====================================================
# Follow these steps in order. Takes about 30–45 minutes.
# No prior coding experience required.
# ====================================================


## STEP 1 — Get an Anthropic API Key
# (This is what powers the AI search. You pay per use — typically pennies/day)

1. Go to https://console.anthropic.com
2. Sign up for an account
3. Go to "API Keys" → "Create Key"
4. Copy the key (starts with sk-ant-...) — save it somewhere safe


## STEP 2 — Put the code on GitHub
# (GitHub stores your code so Render can deploy it)

1. Go to https://github.com and create a free account
2. Click the "+" button → "New repository"
3. Name it: ctcae-lookup
4. Set to Public, click "Create repository"
5. On your computer, install GitHub Desktop: https://desktop.github.com
6. Open GitHub Desktop → File → Clone Repository → pick ctcae-lookup
7. Copy all the files from this project folder into that cloned folder:
     - backend/  (whole folder)
     - frontend/ (whole folder)
     - .gitignore
8. In GitHub Desktop: write a commit message like "Initial commit", click Commit, then Push


## STEP 3 — Deploy on Render
# (Render hosts your app on the internet for free to start)

1. Go to https://render.com and sign up with your GitHub account
2. Click "New +" → "Web Service"
3. Connect your GitHub account and select the ctcae-lookup repo
4. Fill in these settings:
     Name:           ctcae-lookup  (or whatever you like)
     Region:         US East (or closest to you)
     Branch:         main
     Root Directory: backend
     Runtime:        Node
     Build Command:  npm install
     Start Command:  node server.js
     Plan:           Free (to start)

5. Click "Advanced" → "Add Environment Variable":
     Key:   ANTHROPIC_API_KEY
     Value: (paste your sk-ant-... key here)

6. Click "Create Web Service"
7. Wait 2–3 minutes — Render will build and deploy your app
8. You'll get a URL like: https://ctcae-lookup.onrender.com
   → Your site is LIVE at that URL!


## STEP 4 — Get a Custom Domain (Optional but recommended)
# e.g. ctcaelookup.com or aeterm.com

1. Buy a domain at https://www.namecheap.com (~$10–15/year)
2. In Render: go to your service → "Settings" → "Custom Domains"
3. Click "Add Custom Domain" and follow Render's DNS instructions
4. In Namecheap: update the DNS records as Render instructs
5. Takes up to 24 hours to go live on your domain


## STEP 5 — Upgrade for More Traffic (When needed)
# The free Render tier spins down after inactivity (first request may be slow)
# Upgrade to Render's "Starter" plan ($7/month) for always-on service


## COST SUMMARY
# Anthropic API:    ~$0.01–0.05 per 100 searches (very cheap)
# Render hosting:   Free to start, $7/month for always-on
# Domain name:      ~$12/year
# GitHub:           Free
# TOTAL:            ~$10–20/month for a production public tool


## NEED HELP?
# If you get stuck on any step, take a screenshot of the error
# and ask Claude — paste the error message and which step you're on.
