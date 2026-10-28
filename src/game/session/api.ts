/** Empty on the website (same origin); the deployed website's origin in the iOS/Android app. */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "";

/** Running as the Capacitor app, whose build ships in the app bundle. */
export const IN_APP = API_ORIGIN !== "";

export const apiUrl = (path: string) => API_ORIGIN + path;
