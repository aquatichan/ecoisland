// @ts-nocheck
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User.tsx";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon, Settings as SettingsIcon, Shield, Upload, AlertTriangle, Award, Loader2 } from "lucide-react";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ bio: "" });
  const [prefs, setPrefs] = useState({
    weight_unit: "kg",
    temperature_unit: "celsius",
    distance_unit: "km",
    theme: "light",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newAvatar, setNewAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
      setProfile({ bio: userData.bio || "" });
      setPrefs(
        userData.preferences || {
          weight_unit: "kg",
          temperature_unit: "celsius",
          distance_unit: "km",
          theme: "light",
        }
      );
    } catch {
      // pass
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewAvatar(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData = { bio: profile.bio, preferences: prefs };

      if (newAvatar) {
        const { file_url } = await UploadFile({ file: newAvatar });
        updateData.avatar_url = file_url;
      }

      await User.updateMyUserData(updateData);
      alert("Settings saved successfully!");
      setNewAvatar(null);
      setAvatarPreview(null);

      if (user?.preferences?.theme !== prefs.theme) {
        window.location.reload();
      } else {
        loadData();
      }
    } catch {
      alert("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    alert("This is a demo. Technically, your account would be scheduled for deletion.");
    await User.logout();
    window.location.href = "/";
    setIsDeleting(false);
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your profile, preferences, and account.</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <UserIcon className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="account">
              <Shield className="w-4 h-4 mr-2" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* PROFILE */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Public Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={avatarPreview || user.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-teal-500 to-green-500 text-white text-2xl">
                        {user.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    <label htmlFor="avatar-upload" className="absolute -bottom-2 -right-2 bg-teal-500 text-white rounded-full p-2 cursor-pointer hover:bg-teal-600 transition-colors">
                      <Upload className="w-3 h-3" />
                    </label>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">{user.username}</h3>
                    <p className="text-gray-500">{user.email}</p>
                    <Badge className="mt-1">VERIFIED ✓</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Your Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="Tell the community about your eco-journey..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PREFERENCES */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>App Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select value={prefs.theme} onValueChange={(v) => setPrefs((p) => ({ ...p, theme: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white shadow-lg rounded-md">
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Distance Unit</Label>
                    <Select value={prefs.distance_unit} onValueChange={(v) => setPrefs((p) => ({ ...p, distance_unit: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white shadow-lg rounded-md">
                        <SelectItem value="km">Kilometers (km)</SelectItem>
                        <SelectItem value="miles">Miles (mi)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Weight Unit</Label>
                    <Select value={prefs.weight_unit} onValueChange={(v) => setPrefs((p) => ({ ...p, weight_unit: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white shadow-lg rounded-md">
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Temperature Unit</Label>
                    <Select value={prefs.temperature_unit} onValueChange={(v) => setPrefs((p) => ({ ...p, temperature_unit: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="celsius">Celsius (°C)</SelectItem>
                        <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-lg border border-blue-400 text-white">
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Ambassador Program
                  </h4>
                  <p className="text-sm text-blue-100 mb-4">
                    Apply to become a verified Ecoisland Ambassador for your area. Ambassadors help moderate content, organize local environmental initiatives, and gain exclusive benefits.
                  </p>
                  <ul className="text-sm text-blue-100 space-y-1 list-disc list-inside mb-4">
                    <li>Earn official volunteer hours</li>
                    <li>Receive personalized letters of recommendation</li>
                    <li>Enhance your resume and college applications</li>
                    <li>Access paid rewards and a professional network</li>
                  </ul>
                  <Button 
                    variant="outline" 
                    className="border-blue-400">
                    Apply for Ambassador Status
                  </Button>
                </div>

                <Card className="border-orange-500/50 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="text-orange-500 flex items-center gap-2">Sign Out</CardTitle>
                    <CardDescription className="text-orange-600">Sign out of your account and return to the login page.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="border-orange-500 text-orange-600"
                      onClick={async () => {
                        await User.logout();
                        window.location.href = "/";
                      }}
                    >
                      Sign Out
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-red-500/50 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-red-500 flex items-center gap-2">
                      <AlertTriangle />
                      Delete Account
                    </CardTitle>
                    <CardDescription className="text-red-400">This action is permanent and cannot be undone.</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="border-red-500/50 bg-red-50">
                          Proceed with Deletion
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="bg-gray-100 shadow-lg">
                        <DialogHeader>
                          <DialogTitle>Are you absolutely sure?</DialogTitle>
                          <DialogDescription>
                            This will permanently delete your account, island, Treecoins, and all your data. To confirm, please type your username: <span className="font-bold text-red-500">{user.username}</span>
                          </DialogDescription>
                        </DialogHeader>

                        <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Type your username to confirm" />

                        <DialogFooter>
                          <Button
                            variant="destructive"
                            disabled={deleteConfirmText !== user.username || isDeleting}
                            onClick={handleDeleteAccount}
                          >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "I understand, delete my account"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-teal-500 to-green-500">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
