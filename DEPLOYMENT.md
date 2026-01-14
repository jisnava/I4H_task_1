# How to Deploy to GitHub & Netlify

This guide will help you put your "Infinity Tasks" app online permanently for free.

## Step 1: Create a GitHub Repository
1.  Log in to your [GitHub account](https://github.com/).
2.  Click the **+** icon in the top right corner and select **New repository**.
3.  **Repository name**: Enter `infinity-tasks` (or any name you like).
4.  **Public/Private**: Choose "Public".
5.  Click **Create repository**.
6.  **Important**: Keep this page open! You will need the URL (e.g., `https://github.com/your-username/infinity-tasks.git`).

## Step 2: Upload Your Code (Using VS Code)
1.  In VS Code, open the **Source Control** icon on the left sidebar (looks like a graph node).
2.  Click **Publish to GitHub** (or "Initialize Repository" then "Publish").
3.  If asked, verify which files to include (select all) and choose "Publish to public repository".
    *   *Alternative (Terminal Way)*:
        1.  Open Terminal (`Ctrl + `).
        2.  Type: `git init` and press Enter.
        3.  Type: `git add .` and press Enter.
        4.  Type: `git commit -m "First commit"` and press Enter.
        5.  Type: `git branch -M main` and press Enter.
        6.  Type: `git remote add origin YOUR_GITHUB_URL` (paste the URL from Step 1) and press Enter.
        7.  Type: `git push -u origin main` and press Enter.

## Step 3: Connect to Netlify
1.  Go to [Netlify](https://www.netlify.com/) and Log In / Sign Up.
2.  On your dashboard, click **Add new site** > **Import from an existing project**.
3.  Select **GitHub**.
4.  Authorize Netlify to access your GitHub account.
5.  Search for your repository (`infinity-tasks`) and select it.
6.  **Build settings**:
    *   **Base directory**: Leave empty (or `/`).
    *   **Publish directory**: Leave empty (or `/`).
    *   **Build command**: Leave empty.
7.  Click **Deploy infinity-tasks**.

## Success!
Netlify will give you a link (e.g., `https://funny-puffin-123.netlify.app`).
- You can now open this link on your **Mobile Phone** or share it with friends!
- Whenever you make changes in VS Code and "Push" to GitHub, your live site will update automatically!
