# Assignment 1 submission — Stark VMS

Vehicle list, registration, detail view, editing and deletion; duplicate number checks on create/edit; Flutter web, Spring Boot REST API and MySQL persistence.

## Contents

- `stark-vms-backend/`: Java 21 / Spring Boot 4.1.2 / Gradle 9.8.2 backend and existing tests.
- `stark_vms/`: Flutter frontend, generated REST/JSON code, lockfile and tests.
- `database/setup.sql`: creates this assignment's MySQL database.
- `docker-compose.yml`: optional local MySQL server.
- `scripts/smoke_test.py`: live REST regression checks, with automatic test-data cleanup.

This repository contains the self-contained Assignment 1 vehicle management application.

## Prerequisites

Java 21, Flutter (tested with **3.50.1 / Dart 3.14.0**), Python 3 and MySQL 8+. Gradle and Flutter dependency downloads need internet access. The Dart constraint is `^3.13.4`.

## Start MySQL

With an existing local MySQL server:

```bash
mysql -u root -p < database/setup.sql
```

Or, with Docker installed:

```bash
docker compose up -d db
```

The Docker example creates `stark_vms_assignment1` with development user `stark` and password `stark_dev_password`, exposed only on `127.0.0.1:3306`. Wait for the database to become healthy before starting the backend.

## Start the backend

From this submission folder:

```bash
cd stark-vms-backend
DB_USER=stark DB_PASSWORD=stark_dev_password bash gradlew bootRun
```

For an existing MySQL server, supply its credentials instead. The default username is `root` with an empty password. Configuration supports:

- `DB_URL` (default `jdbc:mysql://localhost:3306/stark_vms_assignment1`)
- `DB_USER` and `DB_PASSWORD`


Hibernate creates/updates tables, and the database seeder inserts sample vehicles only when the fleet is empty. The API runs at `http://localhost:9001/api`.

## Start Flutter Web

In another terminal, from this submission folder:

```bash
cd stark_vms
flutter pub get
flutter run -d chrome --dart-define=VMS_API_URL=http://localhost:9001/api
```

The default API URL is already `http://localhost:9001/api`. `VMS_API_URL` is a build-time setting; rebuild if changing it. For an Android emulator, use `http://10.0.2.2:9001/api`.

## Verify and build

With MySQL running and the same database environment variables set:

```bash
# In stark-vms-backend/
DB_USER=stark DB_PASSWORD=stark_dev_password bash gradlew test bootJar

# In stark_vms/
flutter analyze --no-fatal-infos
flutter test
flutter build web --release --no-web-resources-cdn

# From this submission folder, while the API is running
python3 scripts/smoke_test.py --url http://localhost:9001/api
```

The executable backend JAR is generated in `stark-vms-backend/build/libs/`; the web release is generated in `stark_vms/build/web/`. Serve the web directory with a local HTTP server rather than opening `index.html` as a file.

`--no-fatal-infos` allows informational framework deprecation notices while retaining failures for errors and warnings. The original shadcn UI version uses Flutter's older Material imports, which remain functional in the tested SDK.

## Repeat the browser and persistence checks

Optional browser regression scripts require Node.js 20+ and Playwright. Start the backend and serve the compiled web build on port 8000, then:

```bash
cd scripts
npm install
npx playwright install chromium
npm run test:browser

```

Set `VMS_WEB_URL` and `VMS_API_URL` when using different ports. To use an existing Chrome binary instead of downloading Chromium, set `CHROME_PATH` to its executable path.

To check database persistence, from this submission folder run:

```bash
python3 scripts/persistence_test.py prepare --state /tmp/vms-probe.json
# Stop and restart Spring Boot with the same MySQL database.
python3 scripts/persistence_test.py verify --state /tmp/vms-probe.json
```

The verification removes the temporary probe records after confirming they survived restart.

## Hosted deployment (Railway + Netlify)

The backend Dockerfile builds with Java 21 and the committed Gradle wrapper. Tests are run separately against a MySQL database; the image build only packages the executable JAR. The backend reads Railway's `PORT`, falling back to 9001 locally.

1. Create a Railway project with a MySQL service named `MySQL`, then add this GitHub repository as the backend service.
2. Set the backend Root Directory to `/stark-vms-backend`; Railway detects its Dockerfile.
3. Set these variables on the backend service (keep database credentials in Railway, never in GitHub or Netlify):

```text
DB_URL=jdbc:mysql://${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQLDATABASE}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
```

4. Deploy the backend and generate its public domain. Confirm `https://YOUR-BACKEND/api/vehicles` responds successfully.
5. In Netlify, set `VMS_API_URL=https://YOUR-BACKEND/api` with that actual domain, then redeploy. The committed `netlify.toml` installs the pinned Flutter SDK and publishes `stark_vms/build/web`.

This remains an assignment demonstration without login. Use sample data. Hosting availability and usage charges depend on the account's plan and trial balance.
