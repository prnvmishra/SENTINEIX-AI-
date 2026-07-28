export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api",
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000",
  emailjs: {
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined,
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined,
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined,
    autoReplyTemplateId: import.meta.env.VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID as string | undefined,
  },
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
      (import.meta.env.VITE_FIREBASE_PROJECT_ID
        ? `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`
        : undefined),
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  },
} as const;

export const isFirebaseConfigured = Boolean(env.firebase.apiKey && env.firebase.projectId);
