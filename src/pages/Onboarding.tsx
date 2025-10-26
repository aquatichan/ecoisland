// @ts-nocheck
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trees, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  Sparkles, 
  CheckCircle,
  Leaf,
  Globe,
  Users,
  TrendingUp,
  Trophy
} from "lucide-react";
import ElectricBorder from "@/components/ElectricBorder";

// First 10 countries that came to mind
const countries = [
  "United States", 
  "Canada", 
  "United Kingdom", 
  "China", 
  "India", 
  "Japan", 
  "Australia", 
  "Brazil", 
  "Germany", 
  "France",
];

const slideTransitions = {
  enter: (direction) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0
  })
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [authMode, setAuthMode] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    zip_code: "",
    city: "",
    country: ""
  });
  const [idFile, setIdFile] = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);

        if (user.onboarding_complete) {
          setAuthMode('signup');
          setFormData(prev => ({
            ...prev,
            username: user.username || user.full_name || '',
          }));
          navigate(createPageUrl("Dashboard"), { replace: true });
        } else if (user && user.username) {
          // User is logged in but hasn't finished onboarding
          setAuthMode('signup');
          setCurrentSlide(0);
          setFormData(prev => ({
            ...prev,
            username: user.username || user.full_name || '',
          }));
        } else {
          setAuthMode(null);
          setCurrentSlide(0);
        }
      } catch (e) {
        // Not authenticated -> stay on onboarding
        setAuthMode(null);
        setCurrentSlide(0);
      }
    };
    checkUser();
  }, [navigate]);

  const nextSlide = () => {
    setDirection(1);
    setCurrentSlide(prev => prev + 1);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  };

  // call User.login() then re-fetch Firestore user with User.me()
  const handleAuthChoice = async (mode) => {
    setAuthMode(mode);
    setIsLoading(true);

    try {
      await User.login();
      const userData = await User.me();
      setCurrentUser(userData);

      if (userData.onboarding_complete) {
        navigate(createPageUrl("Dashboard"), { replace: true });
      } else {
        nextSlide();
      }
    } catch (error) {
      console.error("Auth error:", error);
      alert("Login/signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIdFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setIdPreview(ev.target.result);
      reader.readAsDataURL(file);
      setErrors(prev => ({ ...prev, id: '' }));
    }
  };

  const validateSlide2 = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = "Username required";
    if (formData.username.length < 3) newErrors.username = "Username must be 3+ characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSlide3 = () => {
    const newErrors = {};
    if (!formData.zip_code || !formData.zip_code.trim()) newErrors.zip_code = "ZIP code required";
    if (!formData.city || !formData.city.trim()) newErrors.city = "City required";
    if (!formData.country) newErrors.country = "Country required";
    if (!idFile) newErrors.id = "Valid ID required for verification";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSlide2Next = async () => {
    if (!validateSlide2()) return;
    nextSlide();
  };

  const handleFinalSubmit = async () => {
    if (!validateSlide3()) return;

    setIsLoading(true);
    try {
      const updates = {
        full_name: formData.username || "Anonymous User",
        username: formData.username || "Anonymous User",
        bio: formData.bio || "",
        zip_code: formData.zip_code || "",
        city: formData.city || "",
        country: formData.country || "",
        onboarding_complete: true,
        verification_status: "pending",
      };

      const updatedUser = await User.updateMyUserData(updates);

      setCurrentUser(updatedUser);
      if (updatedUser && updatedUser.onboarding_complete) {
        navigate(createPageUrl("Dashboard"), { replace: true });
      } else {
        const fresh = await User.me();
        setCurrentUser(fresh);
        if (fresh.onboarding_complete) {
          navigate(createPageUrl("Dashboard"), { replace: true });
        } else {
          console.warn("Onboarding flag not set after update.");
          alert("We couldn't confirm your onboarding — try again in a moment.");
        }
      }
    } catch (error) {
      console.error("Final submit failed:", error);
      alert("Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const slides = [
    // Slide 0: Welcome Overview
    <motion.div
      key="welcome"
      className="flex flex-col items-center justify-center text-center space-y-8 min-h-[600px]"
      variants={slideTransitions}
      initial="enter"
      animate="center"
      exit="exit"
      custom={direction}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="relative flex items-center justify-center"
      >
        
        <div className="w-36 h-36 bg-gradient-to-br from-purple-300 via-white-200 to-white-200 rounded-full flex items-center justify-center shadow-2xl relative z-10">
          <ElectricBorder className="absolute inset-0 w-36 h-36 rounded-full pointer-events-none">
            <img
              src="/ecoisland.png"
              alt="Ecoisland Logo"
              className="w-28 h-28 object-contain z-10 translate-y-4"
              style={{ display: "inline" }}
            />
          </ElectricBorder>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white-600 via-emerald-600 to-white-600 bg-clip-text text-white-600">
          Welcome to Ecoisland
        </h1>
        <p className="text-xl text-gray-600 mt-4 max-w-2xl">
          We're thrilled that you're taking the first step towards building a cleaner, more sustainable future.
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-gradient-to-br from-green-100 to-emerald-100 border-4 border-green-300">
          <CardContent className="p-6 text-center">
            <Trees className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <h3 className="font-semibold text-gray-900">1. Track Impact</h3>
            <p className="text-sm text-gray-600 mt-2">Track your carbon footprint and explore sustainability options</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-4 border-orange-200">
          <CardContent className="p-6 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-orange-400" />
            <h3 className="font-semibold text-gray-900">2. Earn Rewards</h3>
            <p className="text-sm text-gray-600 mt-2">Get Treecoins for sustainable actions and level up</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-purple-200">
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-purple-500" />
            <h3 className="font-semibold text-gray-900">3. Join a Community</h3>
            <p className="text-sm text-gray-600 mt-2">Connect with numerous environmental activists worldwide</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        className="flex flex-col sm:flex-row gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Button
          onClick={() => handleAuthChoice('signup')}
          disabled={isLoading}
          className="bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 border-2 border-black border-dotted text-white px-8 py-6 text-lg shadow-lg"
        >
          {isLoading && authMode === 'signup' ? 'Loading...' : 'Create Account'}
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
        <Button
          onClick={() => handleAuthChoice('login')}
          disabled={isLoading}
          variant="outline"
          className="border-2 border-teal-500 text-teal-600 hover:bg-teal-50 px-8 py-6 text-lg"
        >
          {isLoading && authMode === 'login' ? 'Loading...' : 'I have an Account'}
        </Button>
      </motion.div>
    </motion.div>,

    // Slide 1: Profile Setup
    <motion.div
      key="profile"
      className="max-w-2xl mx-auto space-y-6"
      variants={slideTransitions}
      initial="enter"
      animate="center"
      exit="exit"
      custom={direction}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-gray-900 mb-2">Create Your Profile</h2>
        <p className="text-gray-600">Tell us about yourself</p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="w-3 h-3 rounded-full bg-teal-500"></div>
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
        </div>
      </div>

      <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-400/20 to-green-500/20">
        <Card className="backdrop-blur-md bg-white/20 border border-white/30 shadow-xl transition-all duration-300">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username <span className="text-red-500 text-sm">*</span> </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className={errors.username ? "border-red-300" : ""}
                placeholder="3+ characters..."
              />
              {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio (Optional)</Label>
              <Input
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about your eco journey..."
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={prevSlide}>
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleSlide2Next}
                disabled={isLoading}
                className="bg-gradient-to-r from-teal-500 to-green-500"
              >
                {isLoading ? 'Processing...' : 'Next'}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>,

    // Slide 2: Location & ID
    <motion.div
      key="location"
      className="max-w-2xl mx-auto space-y-6"
      variants={slideTransitions}
      initial="enter"
      animate="center"
      exit="exit"
      custom={direction}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-gray-900 mb-2">Where Are You?</h2>
        <p className="text-gray-600">Help us personalize your experience</p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
          <div className="w-3 h-3 rounded-full bg-teal-500"></div>
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
        </div>
      </div>

      <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-400/20 to-green-500/20">
        <Card className="backdrop-blur-md bg-white/20 border border-white/30 shadow-xl transition-all duration-300">
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zip_code">ZIP Code <span className="text-red-500 text-sm">*</span> </Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                  className={errors.zip_code ? "border-red-300" : ""}
                  placeholder="12345"
                />
                {errors.zip_code && <p className="text-red-500 text-sm">{errors.zip_code}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City <span className="text-red-500 text-sm">*</span> </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className={errors.city ? "border-red-300" : ""}
                  placeholder="Houston"
                />
                {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country <span className="text-red-500 text-sm">*</span> </Label>
                <Select value={formData.country} onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}>
                  <SelectTrigger className={errors.country ? "border-red-300" : ""}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-black border border-gray-200 shadow-md rounded-md">
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && <p className="text-red-500 text-sm">{errors.country}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <Label>Upload Valid ID <span className="text-red-500 text-sm">*</span> <span className="text-sm text-gray-500">(Admin verification only)</span></Label>
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${errors.id ? 'border-red-300 bg-red-50' : 'border-teal-300 bg-teal-50/30 hover:bg-teal-50'}`}>
                <input type="file" accept="image/*" onChange={handleIdUpload} className="hidden" id="id-upload" />
                <label htmlFor="id-upload" className="cursor-pointer block">
                  {idPreview ? (
                    <div className="space-y-2">
                      <img src={idPreview} alt="ID Preview" className="w-32 h-32 object-cover mx-auto rounded-lg shadow-md" />
                      <p className="text-sm text-teal-600 font-medium">ID uploaded ✓ - Click to change</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-teal-500" />
                      <p className="text-gray-700 font-medium">Click to upload your valid ID</p>
                      <p className="text-sm text-gray-500">Driver's license, passport, or government ID</p>
                    </div>
                  )}
                </label>
              </div>
              {errors.id && <p className="text-red-500 text-sm">{errors.id}</p>}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={prevSlide}>
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleFinalSubmit}
                disabled={isLoading}
                className="bg-gradient-to-r from-teal-500 to-green-500"
              >
                {isLoading ? (
                  <>Processing...</>
                ) : (
                  <>
                    Complete Setup
                    <CheckCircle className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-teal-400 to-green-400 p-4 flex items-center justify-center relative overflow-hidden">
      <div className="w-full max-w-6xl relative z-10">
        <AnimatePresence mode="wait" custom={direction}>
          {slides[currentSlide]}
        </AnimatePresence>
      </div>
    </div>
  );
}
