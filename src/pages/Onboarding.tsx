// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  TreePine, ArrowRight, ArrowLeft, Upload, Sparkles,
  CheckCircle, Globe, Users, TrendingUp, Trophy, Zap, Leaf, AlertTriangle
} from "lucide-react";
import { db } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { REWARDS } from "@/utils/progression";
import confetti from "canvas-confetti";

const SLIDE_COUNT = 4;

const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

// Returns an error message string, or null when the (trimmed) username is valid.
function validateUsernameFormat(raw) {
  const candidate = (raw || "").trim();
  if (!candidate) return "Username is required";
  if (candidate.length < 3) return "Username must be at least 3 characters";
  if (candidate.length > 20) return "Username must be 20 characters or fewer";
  if (!USERNAME_PATTERN.test(candidate)) return "Only letters, numbers, underscores, hyphens, and periods are allowed";
  return null;
}

// True if another account (different uid) already uses this username.
async function isUsernameTaken(candidate, ownUid) {
  const snap = await getDocs(query(collection(db, "users"), where("username", "==", candidate)));
  return snap.docs.some(d => d.id !== ownUid);
}

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 600 : -600, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir < 0 ? 600 : -600, opacity: 0 }),
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [slide, setSlide] = useState(0);
  const [dir, setDir] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ username: "", bio: "", zip_code: "", city: "", country: "United States" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    User.me()
      .then(u => {
        setCurrentUser(u);
        if (u.onboarding_complete) navigate(createPageUrl("Dashboard"), { replace: true });
        else if (u.username) setFormData(p => ({ ...p, username: u.username || u.full_name || "" }));
      })
      .catch(() => {});
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    setBanner(null);
    try {
      await User.login();
      const u = await User.me();
      setCurrentUser(u);
      if (u.onboarding_complete) navigate(createPageUrl("Dashboard"), { replace: true });
      else goNext();
    } catch (error) {
      setBanner(`Login failed. ${error?.message || "Please try again."}`);
    } finally { setIsLoading(false); }
  };

  const validateUsernameSlide = async () => {
    const formatError = validateUsernameFormat(formData.username);
    if (formatError) {
      setErrors({ username: formatError });
      return false;
    }
    const candidate = formData.username.trim();
    setCheckingUsername(true);
    try {
      const taken = await isUsernameTaken(candidate, currentUser?.id);
      if (taken) {
        setErrors({ username: "That username is already taken. Try another one." });
        return false;
      }
    } catch {
      setErrors({ username: "Couldn't check username availability. Please try again." });
      return false;
    } finally {
      setCheckingUsername(false);
    }
    setErrors({});
    setFormData(p => ({ ...p, username: candidate }));
    return true;
  };

  const goNext = async () => {
    setBanner(null);
    if (slide === 1 && !(await validateUsernameSlide())) return;
    setDir(1);
    setSlide(s => Math.min(s + 1, SLIDE_COUNT - 1));
  };
  const goBack = () => { setBanner(null); setDir(-1); setSlide(s => Math.max(s - 1, 0)); };

  const handleFinish = async () => {
    setIsLoading(true);
    setBanner(null);
    try {
      let avatarUrl = currentUser?.avatar_url || "";
      if (avatarFile) {
        const { file_url } = await UploadFile({ file: avatarFile });
        avatarUrl = file_url;
      }
      // Re-read the user right before saving so the welcome gift can never be
      // granted twice (e.g. double-click, second device, stale state).
      let freshUser = currentUser;
      try { freshUser = await User.me(); } catch { /* fall back to state */ }

      const updates = {
        username: formData.username.trim(),
        bio: formData.bio.trim(),
        zip_code: formData.zip_code.trim(),
        city: formData.city.trim(),
        country: formData.country,
        avatar_url: avatarUrl,
        onboarding_complete: true,
      };
      if (!freshUser?.onboarding_complete) {
        updates.treecoins = (freshUser?.treecoins || 0) + REWARDS.ONBOARDING_GIFT_TC;
      }
      await User.updateMyUserData(updates);

      confetti({
        particleCount: 140,
        spread: 75,
        origin: { y: 0.6 },
        colors: ["#00c896", "#06b6d4", "#10b981", "#fbbf24"],
      });
      setTimeout(() => navigate(createPageUrl("Dashboard"), { replace: true }), 900);
    } catch {
      setBanner("Could not save your profile. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    const r = new FileReader();
    r.onload = (ev) => setAvatarPreview(ev.target.result);
    r.readAsDataURL(f);
  };

  const slides = [
    // Slide 0: Welcome / Login
    <div key="s0" className="text-center flex flex-col items-center justify-center h-full gap-6 px-4 py-1">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        className="relative"
      >
        <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: "radial-gradient(circle, #00c896, transparent)" }} />
      </motion.div>
      <div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-3" style={{ letterSpacing: "-0.03em" }}>
          Welcome to <span style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Ecoisland</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          The gamified sustainability platform for a greener future. Sign in to begin your journey.
        </p>
      </div>
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleLogin}
        disabled={isLoading}
        className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg text-black"
        style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)", boxShadow: "0 0 30px rgba(0,200,150,0.35)", minWidth: 260, justifyContent: "center" }}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </>
        )}
      </motion.button>
      <p className="text-slate-600 text-sm">By continuing, you agree to adhere to our <Link to="/tos" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Terms of Service</Link> and <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Privacy Policy</Link>.</p>
    </div>,

    // Slide 1: Username + Bio
    <div key="s1" className="flex flex-col gap-6 px-2 py-3">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-emerald-400" />
          <h2 className="text-2xl font-black text-white">Your Identity</h2>
        </div>
        <p className="text-slate-400 text-sm">How will the community know you?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Username <span className="text-red-400">*</span></label>
        <div className="relative">
          <input
            className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: errors.username ? "1.5px solid #ef4444" : "1.5px solid rgba(255,255,255,0.1)", boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3)", paddingRight: 44 }}
            placeholder="Choose a unique username..."
            value={formData.username}
            onChange={e => { setFormData(p => ({ ...p, username: e.target.value })); setErrors(p => ({ ...p, username: null })); }}
            onFocus={e => e.target.style.borderColor = "#00c896"}
            onBlur={e => e.target.style.borderColor = errors.username ? "#ef4444" : "rgba(255,255,255,0.1)"}
          />
          {checkingUsername && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid rgba(0,200,150,0.25)", borderTopColor: "#00c896" }} />
          )}
        </div>
        {errors.username
          ? <p className="text-red-400 text-xs mt-1">{errors.username}</p>
          : checkingUsername
            ? <p className="text-emerald-400/80 text-xs mt-1">Checking availability...</p>
            : <p className="text-slate-500 text-xs mt-1">3-20 characters. Letters, numbers, underscores, hyphens, and periods.</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Bio <span className="text-slate-500 text-xs">(optional)</span></label>
        <textarea
          className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all resize-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)", minHeight: 90 }}
          placeholder="What's your story? (e.g. `I'm on a mission to plant 100 trees!`)"
          value={formData.bio}
          onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))}
          onFocus={e => e.target.style.borderColor = "#00c896"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
        />
      </div>

      {/* Avatar upload */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Profile Picture <span className="text-slate-500 text-xs">(optional)</span></label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0" style={{ background: "rgba(0,200,150,0.1)", border: "2px solid rgba(0,200,150,0.3)" }}>
            {avatarPreview ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-emerald-400"><Upload className="w-5 h-5" /></div>}
          </div>
          <label className="cursor-pointer">
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            <span className="px-4 py-2 rounded-lg text-sm font-medium text-emerald-300 transition-colors" style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.25)" }}>
              Upload Photo
            </span>
          </label>
        </div>
      </div>
    </div>,

    // Slide 2: Location
    <div key="s2" className="flex flex-col gap-6 px-2 py-3">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-5 h-5 text-cyan-400" />
          <h2 className="text-2xl font-black text-white">Your Location</h2>
        </div>
        <p className="text-slate-400 text-sm">Used to personalize regional environmental data for you.</p>
      </div>
      {[
        { label: "City", key: "city", placeholder: "Houston", color: "#06b6d4" },
        { label: "ZIP Code", key: "zip_code", placeholder: "77077", color: "#06b6d4" },
        { label: "Country", key: "country", placeholder: "United States", color: "#06b6d4" },
      ].map(f => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-slate-300 mb-2">{f.label}</label>
          <input
            className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }}
            placeholder={f.placeholder}
            value={formData[f.key]}
            onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
            onFocus={e => e.target.style.borderColor = f.color}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
          />
        </div>
      ))}
    </div>,

    // Slide 3: Final confirmation
    <div key="s3" className="flex flex-col items-center gap-6 text-center px-2 py-1">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, rgba(0,200,150,0.3), rgba(6,182,212,0.3))", border: "2px solid rgba(0,200,150,0.5)", boxShadow: "0 0 30px rgba(0,200,150,0.25)" }}
      >
        <CheckCircle className="w-10 h-10 text-emerald-400" />
      </motion.div>
      <div>
        <h2 className="text-3xl font-black text-white mb-2">You're all set, {formData.username || "Explorer"}!</h2>
        <p className="text-slate-400 text-base max-w-sm mx-auto">Your Ecoisland is ready to flourish. Start your sustainability journey with a 50 Treecoin new user gift!</p>
      </div>
      <div className="w-full grid grid-cols-3 gap-3">
        {[
          { icon: Leaf, label: "Track Footprint", color: "#10b981" },
          { icon: TreePine, label: "Decorate Island", color: "#06b6d4" },
          { icon: Trophy, label: "Climb Leaderboard", color: "#f59e0b" },
        ].map(f => (
          <div key={f.label} className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <f.icon className="w-6 h-6 mx-auto mb-2" style={{ color: f.color }} />
            <p className="text-xs text-slate-400">{f.label}</p>
          </div>
        ))}
      </div>
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleFinish}
        disabled={isLoading}
        className="w-full py-4 rounded-2xl font-bold text-lg text-black flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)", boxShadow: "0 0 30px rgba(0,200,150,0.35)" }}
      >
        {isLoading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><Sparkles className="w-5 h-5" /> Launch My Island!</>}
      </motion.button>
    </div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "radial-gradient(ellipse at 30% 20%, #0a1f17 0%, #020c08 60%)" }}>
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(0,200,150,0.06)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(6,182,212,0.06)" }} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-xl mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/ecoisland_logo_new.png" alt="Ecoisland" className="w-24 h-24 mx-auto object-contain" style={{ filter: "drop-shadow(0 0 10px rgba(0,200,150,0.5))" }} />
        </div>

        {/* Progress dots */}
        {slide > 0 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: slide === i ? 24 : 8,
                  height: 8,
                  background: slide >= i ? "#00c896" : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
        )}

        {/* Card body */}
        <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(8,24,16,0.85)", border: "1.5px solid rgba(0,200,150,0.2)", backdropFilter: "blur(20px)", boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,200,150,0.1)" }}>
          <AnimatePresence>
            {banner && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mx-6 mt-5 flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm text-red-300"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)" }}
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
                <span>{banner}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="relative overflow-y-auto overflow-x-hidden" style={{ minHeight: "clamp(420px,55vh,640px)", maxHeight: "calc(100vh - 6rem)", padding: "26px 24px" }}>
            <AnimatePresence initial={false} custom={dir}>
              <motion.div
                key={slide}
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 p-6"
              >
                {slides[slide]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation buttons (skip slide 0 — has its own button) */}
          {slide > 0 && slide < SLIDE_COUNT - 1 && (
            <div className="flex items-center justify-between px-8 pb-8 gap-4">
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-slate-400 hover:text-white transition-colors text-sm font-medium"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={goNext}
                disabled={checkingUsername}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-black"
                style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)", opacity: checkingUsername ? 0.7 : 1, cursor: checkingUsername ? "wait" : "pointer" }}
              >
                {checkingUsername ? (
                  <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Checking...</>
                ) : (
                  <>Continue <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
