// @ts-nocheck
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings as SettingsIcon, User as UserIcon, Search, Trash2,
  Upload, Save, AlertTriangle, CheckCircle, Loader2, Eye,
  Bell, Shield, Palette, ChevronRight, LogOut, X, Award
} from "lucide-react";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import { db, auth } from "@/firebase";
import { collection, query, getDocs, where, orderBy } from "firebase/firestore";
import { deleteUser } from "firebase/auth";

const TABS = [
  { key: "profile", label: "Profile", icon: UserIcon },
  { key: "discover", label: "Discover Users", icon: Search },
  { key: "account", label: "Account", icon: Shield },
];

// ─── ProfileTab ───────────────────────────────────────────────────────────────
function ProfileTab({ user, formData, setFormData, avatarPreview, handleAvatarChange, handleSave, isSaving, saveSuccess }) {
  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="eco-card p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-emerald-600" /> Profile Picture
        </h3>
        <div className="flex items-center gap-5">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: "var(--bg-success)", border: "2px solid var(--border-success)" }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-emerald-500">
                  {(formData.username || user?.full_name || "U")[0]?.toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-emerald-700 bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" /> Upload Photo
              </span>
            </label>
            <p className="text-xs text-slate-400 mt-1.5">JPG, PNG or GIF · Max 5MB</p>
          </div>
        </div>
      </div>

      {/* Info fields */}
      <div className="eco-card p-6">
        <h3 className="font-bold text-slate-800 mb-5">Personal Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { label: "Username", key: "username", placeholder: "new user" },
            { label: "City", key: "city", placeholder: "Houston" },
            { label: "ZIP Code", key: "zip_code", placeholder: "77077" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{f.label}</label>
              <input
                className="eco-input"
                placeholder={f.placeholder}
                value={formData[f.key]}
                onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Country</label>
            <select
              className="eco-input"
              value={formData.country}
              onChange={e => setFormData(p => ({ ...p, country: e.target.value }))}
            >
              {["United States","Canada","United Kingdom","Australia","Germany","France","Japan","India","Brazil","China","Mexico"].map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Bio</label>
          <textarea
            className="eco-input resize-none"
            placeholder="Tell the community about your sustainability journey..."
            rows={3}
            value={formData.bio}
            onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-3 mt-5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm transition-all"
            style={{
              background: isSaving ? "#94a3b8" : "linear-gradient(135deg, #00c896, #06b6d4)",
              boxShadow: isSaving ? "none" : "0 4px 15px rgba(0,200,150,0.3)"
            }}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save Changes"}
          </motion.button>
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium"
              >
                <CheckCircle className="w-4 h-4" /> Saved!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── DiscoverTab ──────────────────────────────────────────────────────────────
function DiscoverTab({ searchQuery, handleSearch, searchResults, allUsers }) {
  return (
    <div className="space-y-5">
      <div className="eco-card p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-500" /> Find Community Members
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="eco-input pl-10"
            placeholder="Search by username or bio..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {(searchQuery ? searchResults : allUsers.slice(0, 10)).map((u, i) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="eco-card p-4 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-emerald-50 border-2 border-emerald-100 flex-shrink-0 flex items-center justify-center">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-black text-emerald-500">
                  {(u.username || u.full_name || "U")[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm">{u.username || u.full_name || "Unknown"}</p>
              {u.bio && <p className="text-xs text-slate-400 truncate mt-0.5">{u.bio}</p>}
              <div className="flex items-center gap-3 mt-1">
                {u.city && <span className="text-xs text-slate-400">📍 {u.city}</span>}
                {u.eco_level && <span className="text-xs text-emerald-600 font-medium">Lv. {u.eco_level}</span>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold text-amber-500">{u.treecoins || 0} TC</div>
              <div className="text-xs text-slate-400">Treecoins</div>
            </div>
          </motion.div>
        ))}
        {searchQuery && searchResults.length === 0 && (
          <div className="eco-card p-10 text-center">
            <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No users match "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AccountTab ───────────────────────────────────────────────────────────────
function AccountTab({ user, deleteStep, setDeleteStep, deleteConfirm, setDeleteConfirm, handleDeleteAccount }) {
  return (
    <div className="space-y-5">
      {/* Ambassador */}
      <div
        className="p-5 rounded-2xl transition-colors"
        style={{ border: "2px solid #60a5fa", background: "linear-gradient(to right, #3b82f6, #4f46e5)", color: "white" }}
      >
        <h3 className="font-bold mb-4 flex items-center gap-2 text-white">
          <Award className="w-5 h-5 text-white" /> Ambassador Program
        </h3>
        <p className="text-sm text-blue-100 mb-4">
          Apply to become a verified Ecoisland Ambassador for your area.
          Ambassadors help moderate content, organize local environmental
          initiatives, and gain exclusive benefits.
        </p>
        <ul className="text-sm text-blue-100 space-y-1 list-disc list-inside mb-4">
          <li>Earn official volunteer hours</li>
          <li>Receive personalized letters of recommendation</li>
          <li>Enhance your resume and college applications</li>
          <li>Access paid rewards and a professional network</li>
        </ul>
        <button
          onClick={() => window.open("https://forms.gle/fkfvLHnQunb993kP7", "_blank")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors bg-white text-blue-700 hover:bg-blue-50"
          style={{ border: "2px solid var(--text-faint)" }}
        >
          <Award className="w-4 h-4" /> Apply for Ambassador Status
        </button>
      </div>

      {/* Sign out */}
      <div className="eco-card p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <LogOut className="w-5 h-5 text-slate-600" /> Session
        </h3>
        <button
          onClick={() => User.logout().then(() => (window.location.href = "/"))}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
          style={{ border: "2px solid var(--border-card)", color: "var(--text-secondary)", background: "var(--bg-subtle)" }}
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Delete account */}
      <div className="rounded-2xl p-5 border-2 border-red-200 bg-red-50 delete-account-panel">
        <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Delete Account
        </h3>
        <p className="text-red-600 text-sm mb-4">This is permanent. All your data, island, and progress will be deleted.</p>
        {deleteStep === 0 ? (
          <button
            onClick={() => setDeleteStep(1)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-red-700 border-2 border-red-200 bg-white hover:bg-red-50 transition-colors delete-account-panel"
          >
            Delete My Account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-red-700 text-sm font-semibold">
              Type <strong>DELETE {user?.username || "USER"}</strong> to confirm:
            </p>
            <input
              className="eco-input border-red-300 focus:border-red-500 text-red-700"
              placeholder={`DELETE ${user?.username || "USER"}`}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== `DELETE ${user?.username || "USER"}`}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all"
                style={{
                  background: deleteConfirm !== `DELETE ${user?.username || "USER"}` ? "#94a3b8" : "#ef4444",
                  cursor: deleteConfirm !== `DELETE ${user?.username || "USER"}` ? "not-allowed" : "pointer"
                }}
              >
                Proceed with Deletion
              </button>
              <button
                onClick={() => { setDeleteStep(0); setDeleteConfirm(""); }}
                className="px-5 py-2.5 rounded-xl font-bold text-sm transition-colors"
                style={{ border: "2px solid var(--border-card)", color: "var(--text-muted)", background: "var(--bg-subtle)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings (main) ──────────────────────────────────────────────────────────
export default function Settings() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState({ username: "", bio: "", city: "", zip_code: "", country: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    User.me().then(u => {
      setUser(u);
      setFormData({
        username: u.username || "",
        bio: u.bio || "",
        city: u.city || "",
        zip_code: u.zip_code || "",
        country: u.country || "United States",
      });
      setAvatarPreview(u.avatar_url || null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "discover") {
      getDocs(collection(db, "users")).then(snap => {
        setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }).catch(() => {});
    }
  }, [activeTab]);

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const lower = q.toLowerCase();
    setSearchResults(
      allUsers.filter(u =>
        u.username?.toLowerCase().includes(lower) ||
        u.full_name?.toLowerCase().includes(lower) ||
        u.bio?.toLowerCase().includes(lower)
      ).slice(0, 20)
    );
  };

  const handleAvatarChange = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setAvatarFile(f);
    const r = new FileReader(); r.onload = ev => setAvatarPreview(ev.target.result); r.readAsDataURL(f);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let avatarUrl = user?.avatar_url || "";
      if (avatarFile) {
        const { file_url } = await UploadFile({ file: avatarFile });
        avatarUrl = file_url;
      }
      await User.updateMyUserData({ ...formData, avatar_url: avatarUrl });
      setUser(prev => ({ ...prev, ...formData, avatar_url: avatarUrl }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) { alert("Failed to save. Please try again."); }
    finally { setIsSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== `DELETE ${user?.username || "USER"}`) {
      alert("Please type your username to confirm.");
      return;
    }
    try {
      await User.updateMyUserData({ deleted: true });
      await deleteUser(auth.currentUser);
      window.location.href = "/";
    } catch (e) { alert("Could not delete account. Please re-login and try again."); }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-7 h-7 text-slate-600" />
          <div>
            <h1 className="text-3xl font-black text-slate-900" style={{ letterSpacing: "-0.03em" }}>Settings</h1>
            <p className="text-slate-500 text-sm">Manage your profile and account</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "var(--bg-card)", border: "2px solid var(--border-card)" }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={activeTab === tab.key
                ? { background: "linear-gradient(135deg, #00c896, #06b6d4)", color: "white" }
                : { color: "#64748b" }}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === "profile" && (
              <ProfileTab
                user={user}
                formData={formData}
                setFormData={setFormData}
                avatarPreview={avatarPreview}
                handleAvatarChange={handleAvatarChange}
                handleSave={handleSave}
                isSaving={isSaving}
                saveSuccess={saveSuccess}
              />
            )}
            {activeTab === "discover" && (
              <DiscoverTab
                searchQuery={searchQuery}
                handleSearch={handleSearch}
                searchResults={searchResults}
                allUsers={allUsers}
              />
            )}
            {activeTab === "account" && (
              <AccountTab
                user={user}
                deleteStep={deleteStep}
                setDeleteStep={setDeleteStep}
                deleteConfirm={deleteConfirm}
                setDeleteConfirm={setDeleteConfirm}
                handleDeleteAccount={handleDeleteAccount}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}