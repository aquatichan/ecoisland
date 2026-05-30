// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Plus, Upload, Clock, Sparkles,
  Loader2, Trash2, MoreHorizontal, ArrowUp, ArrowDown, Bookmark,
  Filter, TrendingUp, Flame, Star, Send, X, ImageIcon, Hash
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { db, auth } from "@/firebase";
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc,
  query, orderBy, limit, onSnapshot, arrayUnion, arrayRemove,
  serverTimestamp, getDoc, increment
} from "firebase/firestore";
import { User } from "@/entities/User";

type SortMode = "newest" | "top" | "hot" | "rising";

const SORT_OPTIONS: { key: SortMode; label: string; icon: any }[] = [
  { key: "newest", label: "New", icon: Clock },
  { key: "top", label: "Top", icon: ArrowUp },
  { key: "hot", label: "Hot", icon: Flame },
  { key: "rising", label: "Rising", icon: TrendingUp },
];

async function fetchPosts(sortMode: SortMode) {
  const postsRef = collection(db, "posts");
  let q;
  if (sortMode === "newest") q = query(postsRef, orderBy("createdAt", "desc"), limit(50));
  else if (sortMode === "top") q = query(postsRef, orderBy("likesCount", "desc"), limit(50));
  else if (sortMode === "hot") q = query(postsRef, orderBy("commentsCount", "desc"), limit(50));
  else q = query(postsRef, orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fetchComments(postId: string) {
  const ref = collection(db, "posts", postId, "comments");
  const snap = await getDocs(query(ref, orderBy("createdAt", "asc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function PostCard({ post, currentUser, onLike, onDelete, onOpenComments }) {
  const isLiked = post.likedBy?.includes(currentUser?.id);
  const isOwn = post.userId === currentUser?.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const timeAgo = post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : "recently";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="eco-card p-0 overflow-hidden"
    >
      {/* Post header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3" >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
          {post.avatarUrl ? <img src={post.avatarUrl} alt="" className="w-full h-full object-cover" /> : (post.username?.[0] || "U").toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-sm" style={{ color: "var(--text-secondary)" }}>{post.username || "Anonymous"}</span>
          <span className="text-slate-400 text-xs ml-2">{timeAgo}</span>
        </div>
        {/* Tags */}
        <div className="flex gap-1 flex-wrap">
          {post.tags?.slice(0, 2).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100">
              #{tag}
            </span>
          ))}
        </div>
        {/* Menu */}
        {isOwn && (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-faint)" }}>
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -6 }}
                  className="absolute right-0 top-8 z-30 w-36 rounded-xl overflow-hidden shadow-xl"
                  style={{ background: "rgba(6,20,14,0.95)", border: "1px solid rgba(0,200,150,0.2)", backdropFilter: "blur(16px)" }}
                >
                  <button
                    onClick={() => { onDelete(post.id); setMenuOpen(false); }}
                    className="w-full px-3 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Post
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Post title */}
      <div className="px-5 pb-2">
        <h3 className="font-bold text-base leading-tight" style={{ color: "var(--text-primary)" }}>{post.title}</h3>
      </div>

      {/* Description */}
      {post.description && (
        <div className="px-5 pb-3">
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{post.description}</p>
        </div>
      )}

      {/* Media */}
      {(() => {
        const media = post.mediaUrls || (post.mediaUrl ? [post.mediaUrl] : []);
        if (!media || media.length === 0) return null;
        if (media.length === 1) {
          return (
            <div className="mx-5 mb-3 rounded-xl overflow-hidden bg-slate-100" style={{ maxHeight: 360 }}>
              <img src={media[0]} alt="" className="w-full object-cover" style={{ maxHeight: 360 }} />
            </div>
          );
        }
        return (
          <div className="mx-5 mb-3 grid grid-cols-2 gap-2 rounded-xl overflow-hidden bg-slate-100">
            {media.slice(0, 4).map((m, i) => (
              <div key={i} className="overflow-hidden" style={{ maxHeight: 220 }}>
                <img src={m} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        );
      })()}

      {/* Actions */}
      <div className="flex items-center gap-1 px-4 pb-4 pt-3" style={{ borderTop: "1px solid var(--border-card)" }}>
        <button
          onClick={() => onLike(post.id, isLiked)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isLiked ? "bg-red-50 text-red-500" : "text-slate-500 hover:bg-slate-100 hover:text-red-400"}`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
          <span>{post.likesCount || 0}</span>
        </button>
        <button
          onClick={() => onOpenComments(post)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-blue-500 transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.commentsCount || 0}</span>
        </button>
        <button
          onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-emerald-500 transition-all"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>
    </motion.div>
  );
}

export default function ActionFeed() {
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", description: "", tags: "" });
  const [newPostImages, setNewPostImages] = useState<File[]>([]);
  const [newPostPreviews, setNewPostPreviews] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [commentPost, setCommentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    User.me().then(setCurrentUser).catch(() => {});
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchPosts(sortMode).then(p => { setPosts(p); setIsLoading(false); }).catch(() => setIsLoading(false));
  }, [sortMode]);

  const handleLike = async (postId, alreadyLiked) => {
    if (!currentUser) return;
    const postRef = doc(db, "posts", postId);
    if (alreadyLiked) {
      await updateDoc(postRef, { likedBy: arrayRemove(currentUser.id), likesCount: increment(-1) });
    } else {
      await updateDoc(postRef, { likedBy: arrayUnion(currentUser.id), likesCount: increment(1) });
    }
    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      likedBy: alreadyLiked ? p.likedBy.filter(id => id !== currentUser.id) : [...(p.likedBy || []), currentUser.id],
      likesCount: (p.likesCount || 0) + (alreadyLiked ? -1 : 1),
    } : p));
  };

  const handleDelete = async (postId) => {
    if (!confirm("Delete this post?")) return;
    await deleteDoc(doc(db, "posts", postId));
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  // 750 KB per image — base64 inflates by ~33% so this keeps each
  // Firestore document safely under the 1 MB document size limit.
  const MAX_IMAGE_BYTES = 750 * 1024;

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleNewPost = async () => {
    if (!newPost.title.trim()) { alert("Please add a title."); return; }
    if (!currentUser) { alert("Please log in."); return; }

    // Validate image sizes before doing anything
    for (const file of newPostImages) {
      if (file.size > MAX_IMAGE_BYTES) {
        alert(
          `"${file.name}" is ${(file.size / 1024).toFixed(0)} KB — the limit is 750 KB per image. Please compress and try again.`
        );
        return;
      }
    }

    setIsPosting(true);
    try {
      // Convert images to base64 DataURLs — stored directly in Firestore
      const mediaUrls: string[] = newPostImages.length > 0
        ? await Promise.all(newPostImages.map(fileToBase64))
        : [];
      const tags = newPost.tags.split(",").map(t => t.trim()).filter(Boolean);
      const postData = {
        userId: currentUser.id,
        username: currentUser.username || currentUser.full_name || "Anonymous",
        avatarUrl: currentUser.avatar_url || "",
        title: newPost.title.trim(),
        description: newPost.description.trim(),
        tags,
        mediaUrls: mediaUrls.length ? mediaUrls : [],
        mediaType: mediaUrls.length ? "images" : "text",
        mentions: (newPost.description.match(/@([A-Za-z0-9_\-.]+)/g) || []).map(m => m.replace(/^@/, "")),
        likesCount: 0,
        likedBy: [],
        commentsCount: 0,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "posts"), postData);
      setPosts(prev => [{ id: docRef.id, ...postData, createdAt: { toDate: () => new Date() } }, ...prev]);
      // Award treecoins
      await User.updateMyUserData({ treecoins: (currentUser.treecoins || 0) + 5 });
      setNewPost({ title: "", description: "", tags: "" });
      setNewPostImages([]);
      setNewPostPreviews([]);
      setShowNewPost(false);
    } catch (e) { console.error(e); alert("Could not post. Please try again."); }
    finally { setIsPosting(false); }
  };

  const handleOpenComments = async (post) => {
    setCommentPost(post);
    setLoadingComments(true);
    const c = await fetchComments(post.id).catch(() => []);
    setComments(c);
    setLoadingComments(false);
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !commentPost || !currentUser) return;
    try {
      const commentData = {
        userId: currentUser.id,
        username: currentUser.username || currentUser.full_name || "Anonymous",
        text: commentText.trim(),
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "posts", commentPost.id, "comments"), commentData);
      await updateDoc(doc(db, "posts", commentPost.id), { commentsCount: increment(1) });
      setPosts(prev => prev.map(p => p.id === commentPost.id ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
      setComments(prev => [...prev, { ...commentData, createdAt: { toDate: () => new Date() } }]);
      setCommentText("");
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black" style={{ letterSpacing: "-0.03em", color: "var(--text-primary)" }}>Action Feed</h1>
            <p className="text-slate-500 text-sm mt-0.5">Community eco-actions & sustainability stories</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowNewPost(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm shadow-lg"
            style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)", boxShadow: "0 4px 15px rgba(0,200,150,0.3)" }}
          >
            <Plus className="w-4 h-4" /> New Post
          </motion.button>
        </div>

        {/* Sort tabs */}
        <div className="flex items-center gap-1 mb-5 p-1 rounded-xl" style={{ background: "var(--bg-card)", border: "2px solid var(--border-card)" }}>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortMode(opt.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
              style={sortMode === opt.key ? { background: "linear-gradient(135deg, #00c896, #06b6d4)", color: "white" } : { color: "#64748b" }}
            >
              <opt.icon className="w-3.5 h-3.5" /> {opt.label}
            </button>
          ))}
        </div>

        {/* Posts */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {posts.length === 0 ? (
                <div className="eco-card p-12 text-center">
                  <Sparkles className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">No posts yet — be the first!</p>
                </div>
              ) : (
                posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUser={currentUser}
                    onLike={handleLike}
                    onDelete={handleDelete}
                    onOpenComments={handleOpenComments}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* New post modal */}
      <AnimatePresence>
        {showNewPost && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowNewPost(false)} />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              className="fixed inset-x-4 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full md:max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden eco-modal"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-lg" style={{ color: "var(--text-primary)" }}>Share Your Eco-Action</h2>
                  <button onClick={() => setShowNewPost(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <input
                    className="eco-input font-semibold"
                    placeholder="What did you do for the planet today?"
                    value={newPost.title}
                    onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))}
                  />
                  <textarea
                    className="eco-input resize-none"
                    placeholder="Share the details of your action..."
                    rows={3}
                    value={newPost.description}
                    onChange={e => setNewPost(p => ({ ...p, description: e.target.value }))}
                  />
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <input
                      className="eco-input"
                      placeholder="Tags (comma-separated): recycling, cleanup..."
                      value={newPost.tags}
                      onChange={e => setNewPost(p => ({ ...p, tags: e.target.value }))}
                    />
                  </div>
                  {/* Image upload (multiple) */}
                  <div>
                    <label className="cursor-pointer w-full block">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;
                          setNewPostImages(files);
                          // generate previews
                          const readers = files.map(f => new Promise<string>((res) => {
                            const r = new FileReader(); r.onload = ev => res(ev.target.result as string); r.readAsDataURL(f);
                          }));
                          Promise.all(readers).then(ps => setNewPostPreviews(ps)).catch(() => {});
                        }}
                      />
                      {newPostPreviews.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {newPostPreviews.map((p, idx) => (
                            <div key={idx} className="relative rounded-xl overflow-hidden">
                              <img src={p} className="w-full h-28 object-cover" />
                              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNewPostImages(prev => prev.filter((_, i) => i !== idx)); setNewPostPreviews(prev => prev.filter((_, i) => i !== idx)); }} className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed transition-colors" style={{ borderColor: "var(--border-input)" }}>
                          <ImageIcon className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-400">Add photos (optional) — multiple allowed</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setShowNewPost(false)} className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors" style={{ border: "2px solid var(--border-card)", background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleNewPost}
                    disabled={isPosting}
                    className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)" }}
                  >
                    {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Post (+5 Treecoins)</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Comments drawer */}
      <AnimatePresence>
        {commentPost && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={() => { setCommentPost(null); setComments([]); }} />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col"
              style={{ background: "var(--bg-drawer)", borderLeft: "2px solid var(--border-drawer)", boxShadow: "-8px 0 40px rgba(0,0,0,0.1)" }}
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b-2" style={{ borderColor: "var(--border-card)" }}>
                <button onClick={() => { setCommentPost(null); setComments([]); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
                <h3 className="font-black" style={{ color: "var(--text-primary)" }}>Comments · {commentPost.commentsCount || 0}</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="eco-card p-4 mb-2" style={{ background: "var(--bg-card)", borderColor: "var(--border-card)" }}>
                  <p className="font-bold text-sm" style={{ color: "var(--text-secondary)" }}>{commentPost.title}</p>
                  <p className="text-slate-500 text-xs mt-1">{commentPost.username}</p>
                </div>
                {loadingComments ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-8">No comments yet. Be the first!</p>
                ) : (
                  comments.map((c, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(c.username?.[0] || "U").toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs" style={{ color: "var(--text-secondary)" }}>{c.username}</span>
                          <span className="text-slate-400 text-xs">{c.createdAt?.toDate ? formatDistanceToNow(c.createdAt.toDate(), { addSuffix: true }) : "just now"}</span>
                        </div>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{c.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t-2 flex gap-3" style={{ borderColor: "var(--border-card)" }}>
                <input
                  className="eco-input"
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddComment()}
                />
                <button onClick={handleAddComment} className="p-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #00c896, #06b6d4)" }}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
