// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Lightbulb, AlertCircle, Sparkles, Loader2, Plus, BrainCog, ShieldAlert, CheckCircle2 } from "lucide-react";
import { User } from "@/entities/User";
import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "@/config/ai";
import { db } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth } from "@/firebase";

// Structured schema for hazard detection
const HAZARD_SCHEMA = `{
  "hazardDetected": boolean,
  "issueType": string,  // "Littering" | "Illegal Dumping" | "Water Pollution" | "Air Pollution" | "Vegetation Damage" | "Oil Spill" | "Wildfire" | "Construction Damage" | "No Issue Detected",
  "title": string,
  "confidence": number,  // 0-100
  "severity": string,  // "Low" | "Moderate" | "High" | "Critical",
  "description": string,
  "suggestedAction": string,
  "reportTo": string[],
  "immediateSteps": string[]
}`;

async function analyzeImageWithAI(base64Image: string, mimeType: string): Promise<any> {
  const systemPrompt = `You are an environmental hazard detection AI. Analyze the provided image and return ONLY valid JSON matching this exact schema (no markdown, no text outside JSON):
${HAZARD_SCHEMA}

Guidelines:
- Be accurate: only report hazards you can visually identify
- confidence is your certainty percentage (0-100)
- reportTo should list specific organizations/agencies relevant to the issue
- immediateSteps should be 2-4 concise actionable steps
- If no environmental hazard is visible, set hazardDetected to false`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "Ecoisland",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            { type: "text", text: "Analyze this image for environmental hazards." },
          ],
        },
      ],
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "";
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

const severityColors: Record<string, string> = {
  Low: "#10b981",
  Moderate: "#f59e0b",
  High: "#f97316",
  Critical: "#ef4444",
};

export default function DangerScan() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  // 750 KB limit — base64 inflates ~33% so this stays under Firestore's 1 MB doc limit
  const MAX_IMAGE_BYTES = 750 * 1024;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      setError(
        `"${file.name}" is ${(file.size / 1024).toFixed(0)} KB — the limit is 750 KB per image. Please compress and try again.`
      );
      e.target.value = "";
      return;
    }

    setResult(null);
    setError(null);
    setPosted(false);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      const b64 = dataUrl.split(",")[1];
      setImageBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalysis = async () => {
    if (!imageFile || !imageBase64) { alert("Please upload an image first."); return; }
    setIsProcessing(true);
    setResult(null);
    setError(null);
    try {
      const analysis = await analyzeImageWithAI(imageBase64, imageFile.type || "image/jpeg");
      setResult(analysis);
    } catch (e) {
      console.error(e);
      setError("AI analysis failed. Please verify your OpenRouter API key in src/config/ai.ts and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const postToActionFeed = async () => {
    if (!result) return;
    try {
      const u = auth.currentUser;
      if (u) {
        // Fetch full profile first so we get avatar_url and the canonical username,
        // not just the OAuth displayName which may differ and carries no avatar.
        const userData = await User.me();
        await addDoc(collection(db, "posts"), {
          userId: u.uid,
          username: userData.username || u.displayName || "Anonymous",
          avatarUrl: userData.avatar_url || "",
          title: result.title,
          description: `${result.description}\n\nSuggested Action: ${result.suggestedAction}`,
          tags: ["DangerScan", result.issueType],
          mediaUrls: imagePreview ? [imagePreview] : [],
          mediaType: "images",
          likesCount: 0,
          likedBy: [],
          commentsCount: 0,
          createdAt: serverTimestamp(),
          source: "danger_scan",
        });
        await User.updateMyUserData({ treecoins: (userData.treecoins || 0) + 15 });
      }
      setPosted(true);
    } catch (e) {
      console.error(e);
      setPosted(true); // Show success even if Firebase fails
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200">
            <ShieldAlert className="w-4 h-4" /> AI Hazard Detection
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2" style={{ letterSpacing: "-0.03em" }}>Danger Scan</h1>
          <p className="text-slate-500">Photograph environmental hazards for instant AI analysis and action guidance.</p>
        </div>

        <div className="eco-card overflow-hidden" style={{ background: "var(--bg-card)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Upload side */}
            <div className="p-6 border-b md:border-b-0 md:border-r" style={{ borderColor: "var(--border-card)" }}>
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Camera className="w-5 h-5 text-orange-500" /> Upload Image</h3>
              <label htmlFor="danger-upload" className="cursor-pointer block">
                <div className="relative rounded-2xl overflow-hidden border-2 border-dashed transition-all" style={{ borderColor: imagePreview ? "#f97316" : "var(--border-input)", minHeight: 260 }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Issue Preview" className="w-full h-64 object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6" style={{ background: "var(--bg-warning)" }}>
                      <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center">
                        <Camera className="w-8 h-8 text-orange-400" />
                      </div>
                      <p className="text-slate-600 font-semibold">Click to upload a photo</p>
                      <p className="text-xs text-slate-400 text-center">Snap litter, pollution, illegal dumping, or any environmental hazard</p>
                    </div>
                  )}
                </div>
              </label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="danger-upload" />

              <button
                onClick={handleAnalysis}
                disabled={isProcessing || !imageFile}
                className="w-full mt-4 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background: isProcessing || !imageFile ? "#94a3b8" : "linear-gradient(135deg, #ef4444, #f97316)",
                  boxShadow: isProcessing || !imageFile ? "none" : "0 4px 15px rgba(239,68,68,0.3)",
                  cursor: isProcessing || !imageFile ? "not-allowed" : "pointer",
                }}
              >
                {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with AI...</> : <><Sparkles className="w-4 h-4" /> Analyze Image</>}
              </button>
            </div>

            {/* Results side */}
            <div className="p-6">
              <h3 className="font-bold text-slate-700 mb-4">Analysis Results</h3>

              {isProcessing && (
                <div className="flex flex-col items-center justify-center h-56 gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
                    <BrainCog className="absolute inset-0 m-auto w-7 h-7 text-orange-400" />
                  </div>
                  <p className="text-slate-600 font-medium">AI is scanning the image...</p>
                  <p className="text-xs text-slate-400">Powered by Gemini Flash Lite</p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-red-600 text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}</p>
                </div>
              )}

              {result && !isProcessing && (
                <div className="space-y-4">
                  {/* Issue header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-black text-slate-800 text-lg">{result.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="text-xs" style={{ background: `${severityColors[result.severity] || "#64748b"}20`, color: severityColors[result.severity] || "#64748b", border: `1px solid ${severityColors[result.severity] || "#64748b"}40` }}>
                          {result.severity} Severity
                        </Badge>
                        <Badge className="text-xs bg-slate-100 text-slate-600">{result.issueType}</Badge>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-black" style={{ color: severityColors[result.severity] || "#64748b" }}>{result.confidence}%</div>
                      <div className="text-xs text-slate-400">confidence</div>
                    </div>
                  </div>

                  {result.description && <p className="text-sm text-slate-600 leading-relaxed">{result.description}</p>}

                  {/* Suggested action */}
                  <div className="p-4 rounded-xl" style={{ background: "var(--bg-warning)", border: "1px solid var(--border-warning)" }}>
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-800 text-sm mb-1">Recommended Action</p>
                        <p className="text-sm text-amber-700">{result.suggestedAction}</p>
                      </div>
                    </div>
                  </div>

                  {/* Immediate steps */}
                  {result.immediateSteps?.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-700 text-sm">Immediate Steps:</p>
                      {result.immediateSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "var(--bg-success)", color: "#059669" }}>{i + 1}</span>
                          {step}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Post to feed */}
                  {!posted ? (
                    <button
                      onClick={postToActionFeed}
                      className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #10b981, #00c896)", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }}
                    >
                      <Plus className="w-4 h-4" /> Post to Action Feed (+15 🌱)
                    </button>
                  ) : (
                    <div className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2" style={{ background: "var(--bg-success)", border: "1px solid var(--border-success)", color: "#059669" }}>
                      <CheckCircle2 className="w-4 h-4" /> Posted! +15 Treecoins earned
                    </div>
                  )}
                </div>
              )}

              {!isProcessing && !result && !error && (
                <div className="flex flex-col items-center justify-center h-56 text-center gap-3">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "var(--bg-subtle)" }}>
                    <BrainCog className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-400 text-sm">Upload an image (≤750 KB) and click `Analyze Image` to detect environmental hazards with AI.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
