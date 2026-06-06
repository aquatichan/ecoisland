// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import {
  Search, BotMessageSquare, MessageCircleMore, Trophy, Settings, Leaf, Globe, Camera,
  BarChart3, BookOpen, Recycle, Palmtree, Menu, X,
  ChevronRight, TreePine, Sun, Moon, Send, Loader2, ImagePlus,
  ArrowLeft, User as UserIcon
} from "lucide-react";

import LevelUpBar from "@/components/LevelUpBar";
import UserProfileModal from "@/components/UserProfileModal";

import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/firebase";
import {
  collection, query, where, orderBy, limit, getDocs,
  startAt, endAt, or
} from "firebase/firestore";
import { callGemini } from "@/config/ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const navigationItems = [
  { title: "Your Island", url: createPageUrl("Island"), icon: Palmtree, description: "Customize your Ecoisland", color: "#00c896" },
  { title: "Carbon Footprint", url: createPageUrl("CarbonFootprint"), icon: Leaf, description: "Track your carbon footprint", color: "#10b981" },
  { title: "Regional Data", url: createPageUrl("RegionalData"), icon: Globe, description: "Local sustainability insights", color: "#06b6d4" },
  { title: "Danger Scan", url: createPageUrl("DangerScan"), icon: Camera, description: "Report issues via image AI", color: "#f97316" },
  { title: "Action Feed", url: createPageUrl("ActionFeed"), icon: Recycle, description: "See what others are up to", color: "#8b5cf6" },
  { title: "Impact Visualizer", url: createPageUrl("Impact"), icon: BarChart3, description: "See your impact come to life", color: "#ec4899" },
  { title: "AP Environmental Science", url: createPageUrl("APES"), icon: BookOpen, description: "Get a 5 on the AP Exam", color: "#f59e0b" },
];

// ──────────────────────────────────────────────────────
// EcoAI Chatbot
// ──────────────────────────────────────────────────────
const ECOAI_SYSTEM = `You are EcoAI, the intelligent assistant built into Ecoisland — a sustainability-focused social platform. You help users:
- Understand their carbon footprint and get reduction tips
- Find environmental opportunities and community actions
- Learn about eco-friendly products and practices
- Analyze impact stats and community data
- Answer questions about sustainability, climate change, and green living
- Provide encouragement for their eco-journey

Be friendly, concise, and actionable. Use emojis sparingly. If the user shares an image, analyze it for environmental hazards or sustainability insights. Always stay on topic: sustainability, environment, and Ecoisland features.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imagePreview?: string;
}

function EcoAIChatbot({ user, onClose }: { user: any; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey! I'm **EcoAI** 🌿 — your Ecoisland sustainability assistant. Ask me anything about your eco-journey, carbon footprint, community actions, or upload an image for a danger scan!" }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text && !pendingImage) return;
    if (isThinking) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text || (pendingImage ? "Please analyze this image." : ""),
      imagePreview: pendingImage?.preview,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    const capturedImage = pendingImage;
    setPendingImage(null);
    setIsThinking(true);

    try {
      const conversation = [...messages.slice(-10), userMsg];
      const contents = conversation.map((message, index) => {
        const isLatestUserImage = index === conversation.length - 1 && capturedImage;
        if (isLatestUserImage && capturedImage) {
          const base64 = capturedImage.preview.split(",")[1];
          const mimeType = capturedImage.file.type || "image/jpeg";
          return {
            role: "user" as const,
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: message.content || "Analyze this image for environmental hazards, sustainability concerns, or eco-relevant insights." },
            ],
          };
        }
        return {
          role: message.role === "assistant" ? "model" as const : "user" as const,
          parts: [{ text: message.content }],
        };
      });

      const reply = await callGemini({
        systemPrompt: ECOAI_SYSTEM,
        contents,
        temperature: 0.5,
        maxOutputTokens: 600,
      });
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error("EcoAI error:", e);
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Something went wrong. Check your Gemini API key in `.env` and try again." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setPendingImage({ file, preview: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Use react-markdown + remark-gfm for richer markdown rendering in messages
  const MarkdownContent = ({ text }: { text: string }) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline" />,
        ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 ml-1 space-y-1" />,
        ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 ml-1 space-y-1" />,
        li: ({ node, ...props }) => <li {...props} className="ml-1" />,
        code: ({ node, inline, className, children, ...props }) =>
          inline ? (
            <code className="bg-black/10 px-1 rounded text-sm" {...props}>{children}</code>
          ) : (
            <pre className="bg-black/5 p-2 rounded overflow-auto" {...props}><code>{children}</code></pre>
          ),
      }}
    >
      {text}
    </ReactMarkdown>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 20 }}
      transition={{ type: "spring", damping: 24, stiffness: 300 }}
      className="fixed bottom-4 right-4 z-[150] w-[360px] max-h-[560px] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
      style={{
        background: "var(--bg-modal)",
        border: "2px solid rgba(0,200,150,0.25)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,200,150,0.1)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: "linear-gradient(135deg, rgba(0,200,150,0.15), rgba(6,182,212,0.1))", borderBottom: "1px solid rgba(0,200,150,0.15)" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)" }}>
          <BotMessageSquare className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-black text-sm" style={{ color: "var(--text-primary)" }}>EcoAI</p>
          <p className="text-xs" style={{ color: "var(--text-faint)" }}>Powered by Gemini 2.5 Flash</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-faint)" }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)" }}>
                <BotMessageSquare className="w-3 h-3 text-white" />
              </div>
            )}
            <div
              className="max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed"
              style={{
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #00c896, #06b6d4)"
                  : "var(--bg-subtle)",
                color: msg.role === "user" ? "white" : "var(--text-secondary)",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              }}
            >
              {msg.imagePreview && (
                <img src={msg.imagePreview} alt="" className="w-full rounded-lg mb-2 max-h-28 object-cover" />
              )}
              <div className="prose prose-sm prose-invert max-w-full break-words">
                <MarkdownContent text={msg.content} />
              </div>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)" }}>
              <BotMessageSquare className="w-3 h-3 text-white" />
            </div>
            <div className="px-3 py-2 rounded-2xl" style={{ background: "var(--bg-subtle)" }}>
              <div className="flex gap-1 items-center h-5">
                {[0, 1, 2].map(j => (
                  <motion.div key={j} className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: j * 0.15 }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      {pendingImage && (
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-emerald-400/40">
            <img src={pendingImage.preview} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center text-white"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderTop: "1px solid var(--border-card)" }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="p-2 rounded-xl flex-shrink-0 transition-colors"
          style={{ background: "var(--bg-subtle)", color: "var(--text-faint)" }}
          title="Upload image for analysis"
        >
          <ImagePlus className="w-4 h-4" />
        </button>
        <input
          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none resize-none"
          style={{
            background: "var(--bg-input)",
            border: "1.5px solid var(--border-input)",
            color: "var(--text-primary)",
          }}
          placeholder="Ask EcoAI anything…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
        />
        <button
          onClick={sendMessage}
          disabled={isThinking || (!input.trim() && !pendingImage)}
          className="p-2 rounded-xl flex-shrink-0 text-white transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)" }}
        >
          {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────
// Global Search Bar (sliding)
// ──────────────────────────────────────────────────────
type SearchResult = {
  type: "user" | "post";
  id: string;
  title: string;
  subtitle: string;
  avatar?: string;
};

function GlobalSearchBar({ onClose, onSelectUser }: { onClose: () => void; onSelectUser: (uid: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (val: string) => {
    if (!val.trim()) { setResults([]); return; }
    setIsSearching(true);
    try {
      const lower = val.toLowerCase();

      // Users: fetch all and filter client-side (same approach as Settings)
      const usersSnap = await getDocs(collection(db, "users"));
      const userResults: SearchResult[] = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter((u: any) =>
          u.username?.toLowerCase().includes(lower) ||
          u.full_name?.toLowerCase().includes(lower) ||
          u.bio?.toLowerCase().includes(lower)
        )
        .slice(0, 5)
        .map((u: any) => ({
          type: "user" as const,
          id: u.id,
          title: u.username || u.full_name || "Unknown",
          subtitle: u.bio ? u.bio.slice(0, 60) : (u.city || "Ecoislander"),
          avatar: u.avatar_url,
        }));

      // Posts: fetch recent and filter client-side
      const postsSnap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(100)));
      const postResults: SearchResult[] = postsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter((p: any) =>
          p.title?.toLowerCase().includes(lower) ||
          p.description?.toLowerCase().includes(lower) ||
          p.tags?.some((t: string) => t.toLowerCase().includes(lower))
        )
        .slice(0, 5)
        .map((p: any) => ({
          type: "post" as const,
          id: p.id,
          title: p.title || "Untitled Post",
          subtitle: `by ${p.username || "Anonymous"} · ${p.likesCount || 0} likes`,
        }));

      setResults([...userResults, ...postResults]);
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChange = (val: string) => {
    setQ(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 350);
  };

  return (
    <motion.div
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: "100%" }}
      exit={{ opacity: 0, width: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-center gap-2 w-full max-w-xl relative"
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1.5px solid rgba(255,255,255,0.2)",
            color: "white",
          }}
          placeholder="Search users and posts…"
          value={q}
          onChange={e => handleChange(e.target.value)}
        />

        {/* Dropdown */}
        <AnimatePresence>
          {(results.length > 0 || (q && isSearching)) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-[100] shadow-2xl"
              style={{ background: "rgba(10,31,23,0.97)", border: "1px solid rgba(0,200,150,0.2)", backdropFilter: "blur(16px)" }}
            >
              {isSearching && (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…
                </div>
              )}
              {!isSearching && results.length === 0 && q && (
                <div className="px-4 py-3 text-sm text-slate-400">No results for "{q}"</div>
              )}
              {results.map(r => (
                <button
                  key={`${r.type}-${r.id}`}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  onClick={() => {
                    if (r.type === "user") {
                      onSelectUser(r.id);
                      onClose();
                    }
                    // posts: no profile nav for now, could navigate to feed
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                    style={{ background: r.type === "user" ? "linear-gradient(135deg,#00c896,#06b6d4)" : "rgba(139,92,246,0.4)" }}>
                    {r.type === "user"
                      ? (r.avatar ? <img src={r.avatar} className="w-full h-full object-cover" alt="" /> : r.title[0]?.toUpperCase())
                      : <Recycle className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{r.title}</p>
                    <p className="text-xs text-slate-400 truncate">{r.type === "user" ? "👤 User" : "📝 Post"} · {r.subtitle}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={onClose}
        className="p-2 rounded-lg text-slate-400 hover:text-white transition-colors flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────
// Layout
// ──────────────────────────────────────────────────────
export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Feature states
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    User.me()
      .then(u => mounted && setUser(u))
      .catch(() => mounted && setUser(null))
      .finally(() => mounted && setIsLoading(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user && currentPageName !== "Onboarding") {
      navigate(createPageUrl("Onboarding"), { replace: true });
      return;
    }
    if (user && !user.onboarding_complete && currentPageName !== "Onboarding") {
      navigate(createPageUrl("Onboarding"), { replace: true });
    }
  }, [user, isLoading, currentPageName, navigate]);

  const handleBuyXp = async () => {
    const cost = 4;
    const xpGain = 5;
    if ((user.treecoins || 0) < cost) { alert("Not enough Treecoins!"); return; }
    let xp = (user.xp || 0) + xpGain;
    let level = user.eco_level || 1;
    let xpNext = user.xp_to_next_level || 25;
    if (xp >= xpNext) { level++; xp -= xpNext; xpNext = Math.floor(xpNext * 1.2); alert(`Level ${level} reached!`); }
    const updated = { treecoins: user.treecoins - cost, xp, eco_level: level, xp_to_next_level: xpNext };
    await User.updateMyUserData(updated);
    setUser(prev => ({ ...prev, ...updated }));
  };

  const handleSearchToggle = () => {
    setSearchOpen(o => !o);
    setChatbotOpen(false);
  };

  const handleChatbotToggle = () => {
    setChatbotOpen(o => !o);
    setSearchOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse at 50% 0%, #062d1e 0%, #020c08 70%)" }}>
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-t-emerald-400 animate-spin" />
            <img src="/ecoisland_logo_new.png" alt="Ecoisland" className="absolute inset-4 w-12 h-12 object-contain" />
          </div>
          <p className="text-emerald-400 font-medium tracking-widest text-sm uppercase">Loading Ecoisland...</p>
        </div>
      </div>
    );
  }

  if (currentPageName === "Onboarding") return children;
  if (!user) return null;

  const SidebarContent = () => (
    <nav className="p-5 flex flex-col h-full">
      <div className="space-y-1 flex-1">
        {navigationItems.map(item => {
          const isActive = location.pathname === item.url;
          return (
            <Link
              key={item.title}
              to={item.url}
              onClick={() => setMobileOpen(false)}
              className={`flex gap-3 p-3 rounded-xl relative overflow-hidden transition-all duration-200 group ${
                isActive
                  ? "bg-emerald-500/15 border border-emerald-500/30"
                  : "hover:bg-white/5 border border-transparent"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full" style={{ background: item.color }} />
              )}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: isActive ? `${item.color}22` : "rgba(255,255,255,0.05)" }}
              >
                <item.icon className="w-4.5 h-4.5" style={{ color: isActive ? item.color : "#94a3b8" }} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium leading-tight ${isActive ? "text-white" : "text-slate-300 group-hover:text-white"}`}>
                  {item.title}
                </p>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400 ml-auto self-center flex-shrink-0" />}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <LevelUpBar
          currentXp={user.xp}
          xpToNextLevel={user.xp_to_next_level}
          treecoins={user.treecoins}
          onBuyXp={handleBuyXp}
        />
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen" style={{ background: "#f0faf5" }}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 eco-header">
        <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Mobile menu trigger */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Desktop logo */}
          <Link to={createPageUrl("Dashboard")} className="hidden md:flex items-center gap-3 flex-shrink-0">
            <img src="/ecoisland_logo_new.png" alt="Ecoisland" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-bold text-lg text-white leading-tight">Ecoisland</h1>
              <p className="text-xs text-emerald-400/70">All for a greener future</p>
            </div>
          </Link>

          {/* Mobile logo */}
          <Link to={createPageUrl("Dashboard")} className="md:hidden flex items-center gap-2">
            <img src="/ecoisland_logo_new.png" alt="Ecoisland" className="w-8 h-8 object-contain" />
            <span className="font-bold text-white">Ecoisland</span>
          </Link>

          {/* Header center: search bar OR search+chatbot buttons */}
          <div className="hidden md:flex flex-1 justify-center items-center">
            <AnimatePresence mode="wait">
              {searchOpen ? (
                <GlobalSearchBar
                  key="search-bar"
                  onClose={() => setSearchOpen(false)}
                  onSelectUser={(uid) => setProfileUserId(uid)}
                />
              ) : (
                <motion.div
                  key="action-buttons"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-4"
                >
                  <button
                    type="button"
                    className="uiverse"
                    onClick={handleSearchToggle}
                  >
                    <Search className="w-6 h-6" />
                    <span className="tooltip">Search</span>
                  </button>
                  <button
                    type="button"
                    className="uiverse"
                    onClick={handleChatbotToggle}
                    style={chatbotOpen ? { background: "linear-gradient(320deg, #00c896, #06b6d4)", color: "white" } : {}}
                  >
                    <BotMessageSquare className="w-6 h-6" />
                    <span className="tooltip">Chatbot</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2 rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {theme === "dark"
                ? <Sun  className="w-4 h-4 text-amber-300" />
                : <Moon className="w-4 h-4 text-slate-300" />}
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.2)" }}>
              <TreePine className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-300">{user.treecoins ?? 0}</span>
              <span className="text-xs text-emerald-500/70 hidden sm:block">TC</span>
            </div>

            <Link to={createPageUrl("Leaderboard")} title="Leaderboard">
              <button className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors">
                <Trophy className="w-5 h-5" />
              </button>
            </Link>
            <Link to={createPageUrl("Settings")} title="Settings">
              <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </Link>

            {user.avatar_url ? (
              <Link to={createPageUrl("Settings")}>
                <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full ring-2 ring-emerald-500/40 object-cover" />
              </Link>
            ) : (
              <Link to={createPageUrl("Settings")}>
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-sm font-bold">
                  {(user.username || user.full_name || "U")[0].toUpperCase()}
                </div>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile overlay sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-72 z-50 md:hidden overflow-y-auto eco-sidebar"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden md:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 overflow-y-auto z-30 eco-sidebar">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="md:ml-72 min-h-[calc(100vh-4rem)] main-content-area" style={{ background: "var(--bg-page)" }}>
        {children}
      </main>

      {/* EcoAI chatbot (bottom-right) */}
      <AnimatePresence>
        {chatbotOpen && (
          <EcoAIChatbot key="ecoai" user={user} onClose={() => setChatbotOpen(false)} />
        )}
      </AnimatePresence>

      {/* User Profile Modal (from search or any trigger) */}
      <UserProfileModal
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}
