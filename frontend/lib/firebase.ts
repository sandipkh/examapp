import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import {
  initializeApp,
  getApps,
  getApp,
  type FirebaseApp,
} from "firebase/app";
import {
  getAuth,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  type ConfirmationResult,
  type Auth,
} from "firebase/auth";

WebBrowser.maybeCompleteAuthSession();

const extra = Constants.expoConfig?.extra ?? {};

// Log config on startup for debugging
console.log("[firebase] Constants.expoConfig.extra:", JSON.stringify(extra, null, 2));
console.log("[firebase] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:", process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

// Firebase config — prefer EXPO_PUBLIC_ env vars, fall back to app.json extra
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || extra.firebaseApiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || extra.firebaseAuthDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || extra.firebaseProjectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || extra.firebaseStorageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || extra.firebaseMessagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || extra.firebaseAppId,
};

// Initialize Firebase (singleton)
const app: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);

// Google OAuth client ID
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || extra.googleWebClientId || undefined;
console.log("[firebase] Google Web Client ID:", webClientId);

// Redirect URI — hardcoded to Expo auth proxy (SDK 54 removed useProxy)
const GOOGLE_REDIRECT_URI = "https://auth.expo.io/@sandipkh/upsc-ias-prep";
console.log("[firebase] Google redirectUri:", GOOGLE_REDIRECT_URI);

// ── Phone OTP ────────────────────────────────────────────

let confirmationResult: ConfirmationResult | null = null;

export async function sendOtp(phone: string): Promise<string> {
  // On web, signInWithPhoneNumber needs a RecaptchaVerifier.
  // On native, Firebase handles it via the native SDK.
  // For now, this uses the JS SDK approach.
  const result = await signInWithPhoneNumber(auth, phone);
  confirmationResult = result;
  return result.verificationId;
}

export async function confirmOtp(
  verificationId: string,
  otp: string
): Promise<string> {
  const credential = PhoneAuthProvider.credential(verificationId, otp);
  const userCredential = await signInWithCredential(auth, credential);
  const idToken = await userCredential.user.getIdToken();
  return idToken;
}

// ── Google Sign-In ────────────────────────────────────────
// SDK 54 removed the auth.expo.io proxy integration from expo-auth-session,
// but the proxy itself is still running. We call it manually via WebBrowser.

function buildGoogleAuthUrl(): string {
  if (!webClientId) {
    throw new Error("Google Web Client ID is not configured");
  }
  const params = new URLSearchParams({
    client_id: webClientId,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "id_token",
    scope: "openid profile email",
    nonce: Math.random().toString(36).substring(2),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function signInWithGoogle(): Promise<string> {
  const authUrl = buildGoogleAuthUrl();

  // The Expo auth proxy flow:
  // 1. We open: https://auth.expo.io/@sandipkh/upsc-ias-prep/start?authUrl=<encoded>
  // 2. Proxy forwards user to Google OAuth with redirect_uri=auth.expo.io/...
  // 3. After login, Google redirects back to proxy
  // 4. Proxy redirects to exp://... which the in-app browser intercepts
  // returnUrl = where the proxy redirects back to (Expo Go deep link)
  const returnUrl = Linking.createURL("");
  console.log("[signInWithGoogle] returnUrl:", returnUrl);

  const proxyUrl =
    `https://auth.expo.io/@sandipkh/upsc-ias-prep/start?authUrl=` +
    encodeURIComponent(authUrl) +
    `&returnUrl=` +
    encodeURIComponent(returnUrl);

  const result = await WebBrowser.openAuthSessionAsync(proxyUrl, returnUrl);

  if (result.type !== "success" || !result.url) {
    throw new Error(
      result.type === "dismiss"
        ? "Google sign-in was cancelled"
        : `Google sign-in failed: ${result.type}`
    );
  }

  // Parse the id_token from the redirect URL
  const urlParams = new URLSearchParams(result.url.split("#")[1] || result.url.split("?")[1] || "");
  const googleIdToken = urlParams.get("id_token");

  if (!googleIdToken) {
    throw new Error("No id_token received from Google");
  }

  // Exchange Google ID token for Firebase credential and sign in
  const credential = GoogleAuthProvider.credential(googleIdToken);
  const userCredential = await signInWithCredential(auth, credential);
  const firebaseIdToken = await userCredential.user.getIdToken();
  return firebaseIdToken;
}

// ── Sign Out ─────────────────────────────────────────────

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export { auth };
