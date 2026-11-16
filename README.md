# TripMate - Group Trip Planner

TripMate is a Progressive Web App that keeps a group's trip plan in one place. The organiser signs in with Google and builds a day-by-day itinerary. Travellers join with an invite code, read the plan offline, and get a push notification when it changes.

## User stories

1. **Organiser:** As a trip organiser, I want to create and update a day-by-day itinerary so that my group always has the latest travel plan.
2. **Traveller:** As a traveller, I want to view the trip itinerary offline and be notified when it changes so that I stay up to date even without mobile data.

## Technologies

| Part | Used |
| --- | --- |
| Frontend | React, React Router, Vite, vite-plugin-pwa |
| Backend | Node.js, Express |
| Database | MongoDB replica set, Mongoose |
| Security | Google OAuth 2.0, JWT, roles, Helmet, rate limiting, input validation |
| Offline | Service worker cache, IndexedDB |
| Notifications | Web Push API with VAPID keys |
| Testing | Node test runner and Supertest (API), Vitest and React Testing Library (frontend) |

## Folders

```
server/src/
  index.js               starts the server
  db.js                  one shared MongoDB connection (Singleton)
  logger.js              logs requests and errors to the terminal and logs/app.log
  app.js                 security headers, routes, error handling
  models/Trip.js         trip, activity and push subscription data
  middleware/auth.js     JWT check and roles
  routes/auth.js         Google sign in and invite code join
  routes/trips.js        CRUD for trips and activities
  tripEvents.js          tells observers when a trip changes (Observer)
  push.js                sends push notifications (an observer)
server/tests/
  setup.js               shared setup: in-memory MongoDB, fake Google and push
  auth.test.js           sign in, invite code, JWT tricks
  trips.test.js          trip CRUD and who may use it
  activities.test.js     activity CRUD
  push.test.js           push alerts
  db.test.js             one shared connection (Singleton)
  tripEvents.test.js     observers (Observer)
  middleware.test.js     unit tests for the auth filters
  Trip.model.test.js     unit tests for the data rules
client/src/
  App.jsx                pages and routes
  api.js                 API calls and offline fallback
  offlineDB.js           IndexedDB
  push.js                push subscription in the browser
  service-worker.js      offline cache and push events
  pages/                 Login, Trips, Trip
  components/            forms
postman/
  TripMate.postman_collection.json   API tests for Postman
scripts/
  start-replica-set.ps1  starts 3 MongoDB members
```

## How to run

Needs Node.js 22 or newer and MongoDB with mongosh.

**1. Install**

```
cd server
npm install
cd ../client
npm install
```

**2. Create the settings**

Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`.

- Make the VAPID keys with `npx web-push generate-vapid-keys` in the `server` folder. The public key goes in both `.env` files.
- Create a Google client id in [Google Cloud Console](https://console.cloud.google.com/apis/credentials): Create credentials > OAuth client ID > Web application. Add `http://localhost`, `http://localhost:5000` and `http://localhost:5173` under Authorised JavaScript origins. The client id goes in both `.env` files.

**3. Start the database**

From the `tripmate` folder:

```
powershell -ExecutionPolicy Bypass -File scripts/start-replica-set.ps1
```

**4. Build and start**

```
cd client
npm run build
cd ../server
npm start
```

Open http://localhost:5000.

Offline mode and push only work in this built version, not in `npm run dev`.

## See the data in MongoDB Compass

Connect with this address while the replica set is running, then open the `tripmate` database and the `trips` collection:

```
mongodb://localhost:27031,localhost:27032,localhost:27033/?replicaSet=rs0
```

The data files are stored on this computer in `db-data`.

## Tests

Every source file has its own test file. Frontend tests sit next to their file (for example `Login.jsx` and `Login.test.jsx`), and server tests are in `server/tests`. The server has 67 tests and the frontend has 91.

```
cd server
npm test
cd ../client
npm test
```

## Postman

`postman/TripMate.postman_collection.json` tests every API route: sign in, trip and activity CRUD, traveller access, push subscriptions and security checks (26 requests, 40 checks).

1. In Postman choose **Import** and pick the file.
2. Start the server and sign in as the organiser at http://localhost:5000.
3. Press F12 > Application > Local storage > http://localhost:5000, open `session` and copy the `token` value.
4. Paste it into the collection variable `organiserToken`.
5. Run the whole collection with the **Runner**. The requests pass the trip id, invite code and traveller token to each other, and the last folder deletes the test trip.

## Demo steps

1. Sign in with Google, create a trip and add activities.
2. Open a second browser or Chrome profile, enter the invite code, and click **Turn on alerts**. Private windows block notifications.
3. Add an activity as the organiser. The traveller gets a notification and the page updates.
4. In DevTools > Network choose **Offline** on the traveller window and reload. The plan still opens.
