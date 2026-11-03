// Who is signed in, and their live profile document.
//
// On sign-in the app first calls /api/sync, which creates the profile for new
// students (with the welcome Treecoins) and migrates older accounts once.
// After that the profile stays live through a Firestore listener, so coins,
// streaks and the island update the moment the server records a reward.
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup, signOut as fbSignOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserDoc } from "@/shared/types";
import { ApiError, api } from "./api";
import { USE_EMULATORS, auth, db, googleProvider } from "./firebase";
import { track } from "./analytics";

export type SessionStatus = "loading" | "signed_out" | "ready" | "error";

type Session = {
  status: SessionStatus;
  authUser: User | null;
  profile: UserDoc | null;
  /** Set when the server could not be reached; the app still works read-only. */
  error: string | null;
  retry: () => void;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function SessionProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [sync, setSync] = useState<"idle" | "pending" | "done" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setAuthUser(u);
        setAuthReady(true);
        if (!u) {
          setProfile(null);
          setProfileLoaded(false);
          setSync("idle");
          setError(null);
        }
      }),
    [],
  );

  const uid = authUser?.uid;

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    setSync("pending");
    setError(null);
    (async () => {
      let message = "Ecoisland's server isn't responding, so progress can't be saved right now.";
      for (let i = 0; i < 3; i++) {
        try {
          const res = await api<{ created: boolean }>("sync");
          if (res.created) track("sign_up", { method: "google" });
          if (!cancelled) setSync("done");
          return;
        } catch (err) {
          if (err instanceof ApiError) message = err.message;
          const permanent = err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 429;
          if (permanent) break;
          await sleep(700 * (i + 1));
        }
      }
      if (!cancelled) {
        setSync("failed");
        setError(message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  useEffect(() => {
    if (!uid) return;
    setProfileLoaded(false);
    return onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        setProfile(snap.exists() ? ({ ...(snap.data() as UserDoc), id: snap.id } as UserDoc) : null);
        setProfileLoaded(true);
      },
      (err) => {
        console.error("profile listener", err);
        setProfileLoaded(true);
        setError("Couldn't load your profile. Check your connection and refresh.");
      },
    );
  }, [uid]);

  const signIn = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      track("login", { method: "google" });
      return true;
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return false;
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  let status: SessionStatus = "loading";
  if (!authReady) status = "loading";
  else if (!authUser) status = "signed_out";
  else if (profile && (sync === "done" || sync === "failed")) status = "ready";
  else if (sync === "failed" && profileLoaded && !profile) status = "error";

  const value = useMemo<Session>(
    () => ({ status, authUser, profile, error, retry, signIn, signOut }),
    [status, authUser, profile, error, retry, signIn, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}

/** The signed-in profile. Only use inside routes guarded by RequireProfile. */
export function useProfile(): UserDoc {
  const { profile } = useSession();
  if (!profile) throw new Error("useProfile without a profile");
  return profile;
}

/** A profile counts as set up once the new onboarding has been completed. */
export function isOnboarded(p: UserDoc | null | undefined): boolean {
  return !!p && p.onboarding_complete === true && !!p.role && !!p.username_lower;
}

// Emulator-only helper for automated tests: sign in without a Google popup.
if (USE_EMULATORS && typeof window !== "undefined") {
  (window as unknown as { __ecoSignIn: (uid: string, name: string) => Promise<unknown> }).__ecoSignIn = (uid, name) =>
    signInWithCredential(
      auth,
      GoogleAuthProvider.credential(JSON.stringify({ sub: uid, email: `${uid}@example.com`, name, email_verified: true })),
    );
}
