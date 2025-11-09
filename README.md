# Todo List Application

A simple, fully functional todo list application built with Next.js, Auth.js,
Firebase Firestore, and Tailwind CSS.

## Features

- User authentication with Firebase Auth (Email/Password and Google Sign-In)
- NextAuth.js integration for session management
- Firebase Firestore for data storage
- Light and dark theme toggle
- Create, read, update, and delete todos
- User-specific todo collections

## Getting Started

First, install dependencies:

```bash
npm install
```

Set up your environment variables in `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
AUTH_SECRET=
FIREBASE_SERVICE_ACCOUNT=
```

**Note:** `FIREBASE_SERVICE_ACCOUNT` should be a JSON string containing your
Firebase service account credentials. This is required for Firebase Auth state
restoration. See the Firebase Admin SDK setup section below.

### Setting up Firebase Authentication

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project or create a new one
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Email/Password** authentication
5. Enable **Google** authentication:
   - Click on Google provider
   - Enable it and save
   - No additional OAuth credentials needed - Firebase handles this
     automatically

The app uses Firebase Authentication for both email/password and Google sign-in,
following the
[Firebase documentation](https://firebase.google.com/docs/auth/web/password-auth)
and
[Google Sign-In guide](https://firebase.google.com/docs/auth/web/google-signin).

### Setting up Firebase Admin SDK

To enable Firebase Auth state restoration (required for Firestore queries to
work after authentication), you need to set up Firebase Admin SDK:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Convert the JSON file content to a single-line string and set it as the
   `FIREBASE_SERVICE_ACCOUNT` environment variable

Alternatively, if you're deploying to Firebase Hosting or Google Cloud Run, the
Admin SDK will use default credentials automatically.

**Important:** The Firebase Admin SDK is required to restore Firebase Auth state
after page reloads, which ensures Firestore queries work properly.

### Setting up Firestore Security Rules

Make sure your Firestore security rules allow authenticated users to access
their own todos:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/todos/{todoId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the
application.

## Firebase Emulator Suite

This project includes Firebase Emulator Suite configuration for local testing.
This allows you to run tests without affecting your production Firebase
environment.

### Setting up the Emulator Suite

The emulator configuration is already set up in `firebase.json`. The emulators
run on the following ports:

- **Auth Emulator**: `localhost:9099`
- **Firestore Emulator**: `localhost:8080`
- **Emulator UI**: `localhost:4000`

### Running with Emulators

#### Start Emulators

To start the Firebase emulators:

```bash
npm run emulators:start
```

This will start all configured emulators and open the Emulator UI at
[http://localhost:4000](http://localhost:4000).

#### Run Development Server with Emulators

To run the Next.js development server connected to the emulators:

```bash
npm run dev:emulator
```

This sets the required environment variables
(`NEXT_PUBLIC_USE_FIREBASE_EMULATOR` and `USE_FIREBASE_EMULATOR`) and starts the
dev server.

#### Run Tests with Emulators

To run Cypress tests with emulators (automatically starts and stops emulators):

```bash
npm run cy:run:emulator
```

Or use the convenience script:

```bash
npm run test:emulator
```

The `firebase emulators:exec` command automatically starts the emulators before
running tests and stops them after completion.

### Environment Variables for Emulator Mode

When running with emulators, the following environment variables are
automatically set:

- `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` - Enables client-side SDK emulator
  connections
- `USE_FIREBASE_EMULATOR=true` - Enables server-side Admin SDK emulator
  connections
- `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` - Admin SDK Auth emulator host
  (set programmatically)
- `FIRESTORE_EMULATOR_HOST=localhost:8080` - Admin SDK Firestore emulator host
  (set programmatically)

### Emulator vs Production Mode

- **Production Mode** (default): Connects to your production Firebase project
- **Emulator Mode**: Connects to local emulators running on your machine

The app automatically detects emulator mode via environment variables and
connects to the appropriate endpoints. Emulator data is ephemeral and resets
when emulators are restarted.

### Benefits of Using Emulators

- **No Production Pollution**: Tests don't create users or data in your
  production environment
- **Fast Testing**: Local emulators are faster than production API calls
- **Isolated Testing**: Each test run starts with a clean slate
- **Cost Savings**: No Firebase usage costs during testing

## Tech Stack

- Next.js 16.1 (App Router)
- Auth.js v5
- Firebase Firestore
- Tailwind CSS v4
- TypeScript
- next-themes
