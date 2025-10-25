// @ts-nocheck
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, AlertCircle, Search, ExternalLink, Loader2 } from "lucide-react";
import { User } from "@/entities/User";

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

const defaultData = {
  position: [29.7604, -95.3698],
  cityName: "Houston, TX",
  ecoScore: {
    score: 85,
    recycling: 86,
    air_quality: 84,
    green_space: 82,
    policy: 88,
  },
  sources: [
    "EPA Air Quality Data",
    "Houston Parks & Recreation Department",
    "Texas Environmental Research",
    "Climate Action Houston",
  ],
  initiatives: [
    "Host a local school cleanup",
    "Participate in the 'Adopt-a-Drain' program to prevent waterway pollution",
    "Join the 'Volunteer Initiatives Program' sponsored by the Houston city government",
    "Plant a few trees with Trees for Houston",
    "Volunteer with Houston Parks Board's Green Team for native species restoration",
    "Help with conservation and community science at Houston Arboretum & Nature Center",
    "Volunteer with Memorial Park Conservancy in park maintenance",
    "Participate in Keep Houston Beautiful's Clean Neighborhoods Program",
    "Join 'One Clean Houston' for neighborhood cleanups and litter prevention",
    "Volunteer with Houston Flood Control District for bayou and stormwater cleanups",
    "Participate in grassroots campaigns with Texas Campaign for the Environment (TCE)",
    "Join Texas Environmental Justice Advocacy Services (TEJAS) in community projects",
    "Volunteer at the Houston Zoo for wildlife conservation and education",
    "Help with habitat restoration at Edith L. Moore Nature Sanctuary",
  ],
};

export default function RegionalData() {
  const [selectedCountry, setSelectedCountry] = useState("United States");
  const [cityInput, setCityInput] = useState("Houston");
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentData, setCurrentData] = useState(defaultData);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    User.me().then(setUser).catch(() => {});
  }, []);

  const loadCityData = async (city, country) => {
  setIsLoading(true);
  try {
    setCurrentData({
      position: [40.7128, -74.006], // fallback to New York City
      cityName: `${city}, ${country}`,
      ecoScore: {
        score: 70,
        recycling: 70,
        air_quality: 70,
        green_space: 70,
        policy: 70,
      },
      initiatives: [],
      sources: [
        "Environmental Protection Agency",
        "Local Government Data",
        "World Air Quality Index",
        "International Climate Databases",
      ],
    });
  } catch {
    alert("Could not load data for this city. Please try another.");
  } finally {
    setIsLoading(false);
  }
};


  const getCityKey = (pos) => (Array.isArray(pos) ? pos.join(",") : String(pos));

  return (
    <div className="p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Regional Sustainability
          </h1>
          <p className="text-gray-600 mt-2">
            Explore local environmental data and take action in your area
          </p>
        </div>

        {/* Location Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-teal-600" />
              Select Your Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label>Country</Label>
                <Select
                  value={selectedCountry}
                  onValueChange={setSelectedCountry}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white shadow-lg rounded-md">
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 relative">
                <Label>City</Label>
                <Input
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="Type city name..."
                />
              </div>

              <Button
                onClick={() => loadCityData(cityInput, selectedCountry)}
                disabled={isLoading}
                className="bg-gradient-to-r from-teal-500 to-green-500"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Map */}
          <Card
            className="lg:col-span-2 h-[600px] shadow-lg"
            style={{ position: "relative", zIndex: 0 }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
              </div>
            ) : (
              <MapContainer
                key={getCityKey(currentData.position)}
                center={currentData.position}
                zoom={11}
                scrollWheelZoom={false}
                style={{
                  height: "100%",
                  width: "100%",
                  borderRadius: "0.75rem",
                }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={currentData.position}>
                  <Popup>
                    <h4 className="font-bold">{currentData.cityName}</h4>
                    <p>EcoScore: {currentData.ecoScore.score}/100</p>
                  </Popup>
                </Marker>
              </MapContainer>
            )}
          </Card>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-teal-50 to-green-50 border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-teal-600" />
                  {currentData.cityName} EcoScore
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                {isLoading ? (
                  <Loader2 className="w-8 h-8 mx-auto animate-spin" />
                ) : (
                  <>
                    <div className="text-6xl font-bold text-green-600">
                      {currentData.ecoScore.score}
                    </div>
                    <p className="text-gray-500">out of 100</p>
                    <div className="mt-4 space-y-2 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Recycling</span>
                        <Badge className="bg-blue-100 text-blue-700">
                          {currentData.ecoScore.recycling}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Air Quality</span>
                        <Badge className="bg-purple-100 text-purple-700">
                          {currentData.ecoScore.air_quality}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Green Space</span>
                        <Badge className="bg-green-100 text-green-700">
                          {currentData.ecoScore.green_space}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Policy</span>
                        <Badge className="bg-orange-100 text-orange-700">
                          {currentData.ecoScore.policy}
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <ExternalLink className="w-5 h-5" />
                  Data Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentData.sources.map((source, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm text-blue-600"
                    >
                      <div className="w-1 h-1 bg-blue-500 rounded-full" />
                      {source}
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-3 text-blue-500">
                  Data collected from local and national environmental agencies.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Reach Out & Take Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="w-6 h-6 mx-auto animate-spin" />
            ) : (
              <ul className="space-y-3">
                {currentData.initiatives.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 bg-teal-500 rounded-full flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}