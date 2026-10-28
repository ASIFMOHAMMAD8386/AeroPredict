# Put AeroPredict on GitHub

Use the extracted folder from the supplied ZIP. It contains the complete project without the actual API key, local database, logs or running tunnel information.

## Easiest route: GitHub Desktop

1. Extract the ZIP into a new folder, then install [GitHub Desktop](https://desktop.github.com/) and sign in.
2. In Desktop choose **File → Add local repository**, then select the extracted `AeroPredict_Local_Presentation` folder.
3. If Desktop says it is not a Git repository, choose **create a repository here**. Keep the existing project folder as the repository location; do not create another nested project folder. Name it `AeroPredict` if desired.
4. Review the changed files. `.gitignore` excludes `.env`, `.local/`, logs and generated QR links. Keep the bundled third-party notices.
5. Enter the commit summary `Add AeroPredict flight presentation` and choose **Commit to main** if the files have not already been committed.
6. Click **Publish repository**. Choose a public repository if your teacher and classmates should see the code, then publish.
7. Share the repository address to show the source code. Anyone downloading it extracts the files and runs **START_HERE.cmd** on Windows x64 with Node.js 24 or newer.

Official [GitHub Desktop instructions](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop).

Upload the extracted source files through Desktop. The ZIP is a delivery container; putting only a ZIP in the repository hides the useful source view. The browser uploader also limits each file to 25 MiB; see [GitHub file uploads](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).

## Share a working website with your class

Double-click **START_HERE.cmd**. It opens `http://localhost:4180/classroom/` (or your configured port) as soon as the local server is ready. You can open the simulator immediately while the public link connects. The page displays the QR automatically after verification. The launcher replaces expired tunnels and reuses working ones. Show the large QR on your presentation screen. Phones can use mobile data or any Wi-Fi while public sharing is active. The generated `presentation/simulation-public-qr.png` can also be inserted into slides.

Keep the laptop awake and connected. **STOP_HERE.cmd** stops both the tunnel and local server. Each new tunnel can receive a different address, so generate the QR again each session. These are temporary demonstration links, with no uptime guarantee; [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

GitHub stores and shares your code. Uploading a repository alone does not start this Node.js backend. [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) hosts static files and cannot run this project's local server, SQLite cache or private Aviationstack integration. Use the launcher for the complete local project and public QR. A permanent always-on website would require a separate backend deployment.

Simulation needs no key. For live mode on a newly downloaded copy, run **SET_API_KEY.cmd** and configure your own key privately. Startup and sharing do not consume flight-provider calls; pressing Load live flights may consume one according to the cache and budget rules. Never commit an actual `.env` file.
