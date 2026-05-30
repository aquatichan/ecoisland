// @ts-nocheck
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, AlertCircle, Search, ExternalLink, Loader2, MapPin, Zap, RefreshCw } from "lucide-react";
import { User } from "@/entities/User";
import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "@/config/ai";

// Fix leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// JSON schema for AI response
const REGIONAL_SCHEMA = {
  type: "object",
  properties: {
    coordinates: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" } }, required: ["lat", "lng"] },
    displayName: { type: "string" },
    ecoScore: {
      type: "object",
      properties: {
        overall: { type: "number" },
        recycling: { type: "number" },
        airQuality: { type: "number" },
        greenSpace: { type: "number" },
        policy: { type: "number" },
      },
      required: ["overall", "recycling", "airQuality", "greenSpace", "policy"],
    },
    sources: { type: "array", items: { type: "string" } },
    initiatives: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
  required: ["coordinates", "displayName", "ecoScore", "sources", "initiatives", "summary"],
};

async function fetchRegionalData(city, zipCode, country) {
  const locationQuery = [city, zipCode, country].filter(Boolean).join(", ");

  const systemPrompt = `You are an environmental data analyst. Return ONLY valid JSON matching this schema — no markdown, no text outside JSON:
${JSON.stringify(REGIONAL_SCHEMA, null, 2)}

Rules:
- coordinates must be accurate latitude and longitude for the given location
- ecoScore values are integers 0-100 based on real publicly-known environmental data; don't natively select round numbers like 60 and 75, figure out what numbers measure categories objectively best
- sources should be real, credible environmental databases/organizations for that region
- initiatives should be 8-12 specific, actionable local sustainability programs that are still currently active
- summary is 1-2 sentences about this region's environmental profile

- if you are absolutely uncertain about the location the user wishes to find, return Antarctica and default all values to 0`;

  const userPrompt = `Generate environmental data for: "${locationQuery}"`;

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
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "";

  // Strip markdown fences if present
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// Also geocode via Nominatim as fallback for coordinates
async function geocodeLocation(query) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
    headers: { "User-Agent": "Ecoisland/2026" }
  });
  const data = await res.json();
  if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  return null;
}

const ScoreBar = ({ label, value, color }) => (
  <div className="mb-3">
    <div className="flex justify-between text-sm mb-1">
      <span className="text-slate-300">{label}</span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </div>
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
    </div>
  </div>
);

export default function RegionalData() {
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("United States");
  const [regionData, setRegionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    User.me().then(u => {
      setUser(u);
      // Auto-populate from user profile if available
      if (u?.city) setCity(u.city);
      if (u?.zip_code) setZipCode(u.zip_code);
      if (u?.country) setCountry(u.country);
    }).catch(() => {});
  }, []);

  const handleSearch = async () => {
    setRegionData(null);
    if (!city.trim() && !zipCode.trim()) { setError("Please enter a city or ZIP code."); return; }
    setIsLoading(true);
    setError(null);
    try {
      let data = await fetchRegionalData(city, zipCode, country);

      // Verify/fix coordinates via Nominatim
      const query = [city, zipCode, country].filter(Boolean).join(", ");
      const geo = await geocodeLocation(query).catch(() => null);
      if (geo) { data.coordinates.lat = geo.lat; data.coordinates.lng = geo.lng; }

      setRegionData(data);
    } catch (e) {
      console.error(e);
      setError("Could not load environmental data. Please check your API key in src/config/ai.ts or try another location.");
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    if (score >= 40) return "#f97316";
    return "#ef4444";
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-7 h-7 text-cyan-600" />
            <h1 className="text-3xl md:text-4xl font-black text-slate-900" style={{ letterSpacing: "-0.03em" }}>Regional Sustainability</h1>
          </div>
          <p className="text-slate-500">AI-powered environmental intelligence for any location in the world.</p>
        </div>

        {/* Search card */}
        <div className="eco-card p-6 mb-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-600" /> Search Location
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">City</label>
              <input
                className="eco-input"
                placeholder="e.g. Houston"
                value={city}
                onChange={e => setCity(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">ZIP Code</label>
            <input
              className="eco-input"
              placeholder="e.g. 77077"
              value={zipCode}
              onChange={e => setZipCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Country</label>
              <input
                className="eco-input"
                placeholder="e.g. United States"
                value={country}
                onChange={e => setCountry(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all"
                style={{ background: isLoading ? "#64748b" : "linear-gradient(135deg, #06b6d4, #0ea5e9)", boxShadow: isLoading ? "none" : "0 4px 15px rgba(6,182,212,0.3)" }}
              >
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Search className="w-4 h-4" /> Search</>}
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
        </div>

        {/* Results */}
        {regionData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Map */}
            <div className="lg:col-span-2 eco-card overflow-hidden" style={{ height: 520, position: "relative", zIndex: 0, padding: 0 }}>
              <MapContainer
                key={`${regionData.coordinates.lat},${regionData.coordinates.lng}`}
                center={[regionData.coordinates.lat, regionData.coordinates.lng]}
                zoom={11}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[regionData.coordinates.lat, regionData.coordinates.lng]}>
                  <Popup>
                    <strong>{regionData.displayName}</strong><br />
                    EcoScore: {regionData.ecoScore.overall}/100
                  </Popup>
                </Marker>
              </MapContainer>
            </div>

            {/* Scores */}
            <div className="space-y-5">
              {/* Overall score */}
              <div className="rounded-2xl overflow-hidden p-6" style={{ background: "linear-gradient(135deg, #020c08, #051a10)", border: "1.5px solid rgba(0,200,150,0.25)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-sm">{regionData.displayName}</h3>
                </div>
                <div className="text-center mb-4">
                  <div className="text-7xl font-black mb-1" style={{ color: getScoreColor(regionData.ecoScore.overall), textShadow: `0 0 20px ${getScoreColor(regionData.ecoScore.overall)}50` }}>
                    {regionData.ecoScore.overall}
                  </div>
                  <p className="text-slate-400 text-sm">EcoScore / 100</p>
                </div>
                {regionData.summary && <p className="text-slate-400 text-xs italic text-center border-t border-white/10 pt-3">{regionData.summary}</p>}
              </div>

              {/* Category scores */}
              <div className="eco-card-dark p-5">
                <ScoreBar label="♻️ Recycling" value={regionData.ecoScore.recycling} color="#10b981" />
                <ScoreBar label="💨 Air Quality" value={regionData.ecoScore.airQuality} color="#06b6d4" />
                <ScoreBar label="🌿 Green Space" value={regionData.ecoScore.greenSpace} color="#00c896" />
                <ScoreBar label="📋 Policy" value={regionData.ecoScore.policy} color="#f59e0b" />
              </div>

              {/* Data sources */}
              <div className="eco-card p-4">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm"><ExternalLink className="w-4 h-4 text-blue-500" /> Data Sources</h4>
                <div className="space-y-1.5">
                  {regionData.sources.map((src, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-blue-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      {src}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">AI-synthesized from regional environmental agencies.</p>
              </div>
            </div>
          </div>
        )}

        {/* Initiatives */}
        {regionData?.initiatives?.length > 0 && (
          <div className="eco-card p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-emerald-600" /> Reach Out & Take Action in {regionData.displayName}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {regionData.initiatives.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "var(--bg-success)", border: "1px solid var(--border-success)" }}>
                  <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!regionData && !isLoading && (
          <div className="eco-card p-16 text-center">
            <Globe className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">Search any location</h3>
            <p className="text-slate-400 text-sm">Enter a city, ZIP code, and country to get AI-powered environmental scores and local sustainability opportunities.</p>
          </div>
        )}
      </div>
    </div>
  );
}
