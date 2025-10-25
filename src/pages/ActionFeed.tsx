// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Heart,
  MessageCircle,
  Share2,
  Plus,
  Upload,
  Clock,
  Sparkles,
  Loader2,
  Trash2,
  MoreVertical,
  Aperture,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

const mock_posts = () => [
  {
    id: "post-1",
    user_id: "user-1",
    username: "beachy_loverrr",
    title: "Beach Cleanup Success!",
    description:
      "Just organized a beach cleanup with 30 volunteers and collected over 200 kg of plastic waste. Every action counts towards a cleaner ocean, no matter how small!",
    media_url: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800",
    media_type: "image",
    tags: ["Ocean Cleanup", "Community Action"],
    likes_count: 4,
    liked_by: [],
    comments_count: 3,
    created_date: new Date(Date.now() - 86400000*1).toISOString(),
  },
  {
    id: "post-2",
    user_id: "user-2",
    username: "treeplanter101",
    title: "Native Tree Planting Day!",
    description:
      "Spent the weekend planting 50 native trees in our local park with the community. These will provide habitat for local wildlife and improve air quality for everyone!",
    media_url: "https://files.catbox.moe/wdjh91.avif",
    media_type: "text",
    tags: ["Tree Planting", "Climate Action"],
    likes_count: 3,
    liked_by: [],
    comments_count: 0,
    created_date: new Date(Date.now() - 86400000*3).toISOString(),
  },
  {
    id: "post-3",
    user_id: "user-3",
    username: "i_like_solar_panels",
    title: "Solar Panels Installed!",
    description: "Just installed solar panels on my roof! Excited to reduce my carbon footprint and my electricity bills. If you're considering doing the same, I highly recommend it!",
    media_url: "https://files.catbox.moe/xj3ad8.jpg",
    media_type: "image",
    tags: ["Clean Energy", "Sustainable Living"],
    likes_count: 2,
    liked_by: [],
    comments_count: 1,
    created_date: new Date(Date.now() - 86400000*7).toISOString()
  }
];

const environmentalTags = [
  "Climate Change",
  "Recycling",
  "Clean Energy",
  "Wildlife Protection",
  "Ocean Cleanup",
  "Tree Planting",
  "Sustainable Living",
  "Pollution Reduction",
  "Community Gardening",
  "Green Transportation",
  "Water Conservation",
  "Zero Waste",
];

export default function ActionFeed() {
  const [currentUserId] = useState("current-user");
  const [posts, setPosts] = useState(() => {
    const saved = localStorage.getItem("action_posts");
    return saved ? JSON.parse(saved) : mock_posts();
  });
  const [newPost, setNewPost] = useState({
    title: "",
    description: "",
    tags: [],
  });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    localStorage.setItem("action_posts", JSON.stringify(posts));
  }, [posts]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedFile({
        url: e.target.result,
        type: file.type.startsWith("image/") ? "image" : "video",
        name: file.name,
      });
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleTagToggle = (tag) => {
    setNewPost((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handlePostSubmit = () => {
    if (!newPost.title.trim() || !newPost.description.trim()) {
      alert("Title and description are required.");
      return;
    }

    const wordCount = newPost.description.trim().split(/\s+/).length;
    const coinsEarned = wordCount >= 20 ? 5 : 0;

    const post = {
      id: `post-${Date.now()}`,
      user_id: currentUserId,
      username: "You",
      title: newPost.title,
      description: newPost.description,
      media_url: uploadedFile?.url || "",
      media_type: uploadedFile?.type || "text",
      tags: newPost.tags,
      likes_count: 0,
      liked_by: [],
      comments_count: 0,
      created_date: new Date().toISOString(),
    };

    setPosts((prev) => [post, ...prev]);
    setNewPost({ title: "", description: "", tags: [] });
    setUploadedFile(null);
    setShowCreateDialog(false);

    if (coinsEarned > 0)
      alert(`Post shared successfully! Earned ${coinsEarned} Treecoins.`);
  };

  const handleLike = (post) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === post.id) {
          const userLiked = p.liked_by.includes(currentUserId);
          return {
            ...p,
            liked_by: userLiked
              ? p.liked_by.filter((id) => id !== currentUserId)
              : [...p.liked_by, currentUserId],
            likes_count: userLiked ? p.likes_count - 1 : p.likes_count + 1,
          };
        }
        return p;
      })
    );
  };

  const handleDeletePost = (post) => {
    if (post.user_id !== currentUserId) return;
    const confirmed = window.confirm("Are you sure you want to delete this post?");
    if (!confirmed) return;
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Action Feed</h1>
            <p className="text-gray-600">
              Share your environmental impact with the community
            </p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600">
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-140 bg-white shadow-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-teal-600" />
                  Share Your Impact
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Input
                  placeholder="What environmental action did you take?"
                  value={newPost.title}
                  onChange={(e) =>
                    setNewPost((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
                <Textarea
                  placeholder="Tell us more... (minimum 20 words for Treecoins)"
                  value={newPost.description}
                  onChange={(e) =>
                    setNewPost((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={4}
                />
                <div className="text-xs text-gray-500">
                  Word count:{" "}
                  {newPost.description.trim().split(/\s+/).filter(Boolean).length}
                  /20
                </div>

                <div className="border-2 border-dashed border-teal-200 rounded-lg p-4">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="media-upload"
                  />
                  <label
                    htmlFor="media-upload"
                    className="cursor-pointer flex items-center justify-center gap-2"
                  >
                   {uploadedFile ? (
                      <>
                        {uploadedFile.type === "image" ? (
                          <img
                            src={uploadedFile.url}
                            alt={uploadedFile.name}
                            className="max-h-32 max-w-64 rounded-lg object-cover"
                          />
                        ) : (
                          <video
                            src={uploadedFile.url}
                            controls
                            className="max-h-32 max-w-64 rounded-lg"
                          />
                        )}
                        <p className="text-sm text-gray-500 mt-2">Click to change</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-teal-500" />
                        <span className="text-teal-600">Add Photo or Video</span>
                      </>
                    )}
                  </label>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Add Tags:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {environmentalTags.map((tag) => (
                      <Button
                        key={tag}
                        variant="outline"
                        size="sm"
                        onClick={() => handleTagToggle(tag)}
                        className={
                          newPost.tags.includes(tag)
                            ? "bg-teal-100 border-teal-300 text-teal-700"
                            : "hover:bg-teal-50"
                        }
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePostSubmit}
                    className="bg-gradient-to-r from-teal-500 to-green-500"
                  >
                    Share Action (-5 Treecoins)
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Feed */}
        <div className="space-y-6">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar>
                    <AvatarImage src={post.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-teal-500 to-green-500 text-white">
                      {post.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {post.username}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      {format(new Date(post.created_date), "MMM d, yyyy")}
                    </div>
                  </div>

                  {post.user_id === currentUserId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => handleDeletePost(post)}
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Post
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-xl font-bold text-gray-900">{post.title}</h4>
                  <p className="text-gray-700 leading-relaxed">{post.description}</p>

                  {post.media_url && (
                    <div className="rounded-lg overflow-hidden">
                      {post.media_type === "image" ? (
                        <img
                          src={post.media_url}
                          alt="Environmental action"
                          className="w-full h-64 object-cover"
                        />
                      ) : (
                        <video src={post.media_url} controls className="w-full h-64" />
                      )}
                    </div>
                  )}

                  {post.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-teal-600 border-teal-200"
                        >
                          #{tag.replace(/\s+/g, "").toLowerCase()}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post)}
                        className={`text-gray-600 hover:text-red-500 hover:bg-red-50 ${
                          post.liked_by.includes(currentUserId)
                            ? "text-red-500"
                            : ""
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 mr-1 ${
                            post.liked_by.includes(currentUserId)
                              ? "fill-current"
                              : ""
                          }`}
                        />
                        {post.likes_count}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-blue-500 hover:bg-blue-50"
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {post.comments_count}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-green-500 hover:bg-green-50"
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

        {/* Commented out because demo has placeholder comments
          {posts.length === 0 && (
            <div className="text-center py-12">
              <Aperture className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No posts yet
              </h3>
              <p className="text-gray-500 mb-4">
                Be the first to share your environmental impact!
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-teal-500 to-green-500"
              >
                Create Your First Post
              </Button>
            </div>
          )}
        */}

        </div>
      </div>
    </div>
  );
}
