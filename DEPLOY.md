# Putting LAN Chat online (free)

About 10 minutes, once. After this you get a link like `https://lan-chat.onrender.com`
that anyone can open on any phone or computer.

## 1. Free database (Neon) - keeps messages safe

1. Go to https://neon.tech and sign up (the "Continue with GitHub" or Google button is fine).
2. Create a project (any name, pick the region closest to you).
3. Click **Connect**, and copy the connection string. It looks like
   `postgresql://user:password@ep-something.neon.tech/neondb?sslmode=require`
4. Keep it somewhere for step 3. Treat it like a password.

## 2. Put the code on GitHub

1. Sign up / log in at https://github.com.
2. Click **+** (top right) > **New repository**. Name it `chat`, click **Create repository**.
3. On the next page click **uploading an existing file**.
4. Open the `MessagingWebsite` folder on your computer, select **everything inside it**
   (`Messagingwebsite.py`, `requirements.txt`, `render.yaml`, `DEPLOY.md`, and the `static` folder)
   and drag it onto the page. Do **not** upload `chat.db` if you have one.
5. Click **Commit changes**.

## 3. Host it (Render)

1. Go to https://render.com and sign up with **GitHub**.
2. Click **New +** > **Blueprint**, and pick your `chat` repository (allow Render access if asked).
3. Render reads `render.yaml` and asks for `DATABASE_URL`: paste the Neon string from step 1.
4. Click **Apply** / **Deploy**. Wait 2-3 minutes until it says **Live**.
5. Your link is shown at the top of the service page. Open it, create your account, and share the link.

## Good to know

- **Free plan sleep:** after 15 minutes with nobody on the site, Render pauses it.
  The next visitor waits ~30-60 seconds while it wakes up. Messages are not lost.
- **Updating the site:** upload changed files to the GitHub repo again; Render redeploys automatically.
- **Limits:** files up to 10 MB each; Neon's free database holds about 0.5 GB.
- Running it on your own computer still works: `python Messagingwebsite.py` (no database setup needed).
