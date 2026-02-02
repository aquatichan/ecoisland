// @ts-nocheck
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subDays } from "date-fns";
import { Plus, Leaf, Car, Zap, Utensils, CheckCircle, X, Calendar } from "lucide-react";

import { collection, query, orderBy, getDocs, doc, addDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";

// Units: transport = kg CO2 per passenger-km
//        energy    = kg CO2 per kWh
//        diet      = kg CO2 per kg of food (assumes 2000 kcal per 1 kg food)
const EMISSION_FACTORS = {
  transport: {
    walking: 0.0,                 // negligible direct CO2
    cycling: 0.0,
    electric_scooter: 0.05,       // mid-range life-cycle (30–124 g/km reported -> 0.03–0.12)
    bus: 0.06,                    // per passenger-km (depends on occupancy; ~0.04–0.10 range)
    train: 0.04,                  // passenger-km average for rail (electric rail is low)
    car_gasoline: 0.17,           // typical petrol car, kg CO2 per km (central estimate)
    car_electric: 0.085,          // blended BEV estimate (depends on grid; see note)
    motorcycle: 0.11,
    flight_domestic: 0.246,       // short-haul passenger km (approx. central reported)
    flight_international: 0.10,   // long-haul per-km often lower per km due to efficiency (varies)
  },

  energy: 0.37,                   // kg CO2 per kWh (US average ~0.37 kg/kWh)

  // Diet: converted from kg CO2 per 1000 kcal to per kg of food assuming 2000 kcal/kg.
  // source table from ** https://pmc.ncbi.nlm.nih.gov/articles/PMC10131583 **
  // per_kg = per_1000kcal * (2000 / 1000) = per_1000kcal * 2

  diet: {
    vegan: 0.69 * 2.0,        // = 1.38 kg CO2 per kg food
    vegetarian: 1.16 * 2.0,   // = 2.32
    pescatarian: 1.66 * 2.0,  // = 3.32
    omnivore: 2.23 * 2.0,     // = 4.46
    carnivore: 2.23 * 2.0,    // treat carnivore ~ omnivore for now
    keto: 2.91 * 2.0,         // = 5.82
    paleo: 2.62 * 2.0,        // = 5.24
    gluten_free: 4.70,        // ≈ omnivore × 1.05
    intermittent: 3.57,       // ≈ omnivore × 0.8
    raw: 1.25,                // ≈ vegan × 0.9
    custom: NaN,              // NaN for now
  },
};

const DAILY_LIMIT = 5;
const COINS_PER_LOG = 10;
const MAX_DAILY_COINS = 50;

export default function CarbonFootprint() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    User.me()
      .then(setUser)
      .finally(() => setLoadingUser(false));
  }, []);
  
  const [entries, setEntries] = useState([]);
  
  useEffect(() => {
    if (!user) return;

    const loadEntries = async () => {
      const q = query(
        collection(db, "users", user.id, "carbon_entries"),
        orderBy("date", "desc")
      );

      const snap = await getDocs(q);
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    loadEntries();
  }, [user]);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [todaysLogs, setTodaysLogs] = useState(0);
  const [transportItems, setTransportItems] = useState([]);
  const [energyUsage, setEnergyUsage] = useState([20]);
  const [dietType, setDietType] = useState("omnivore");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setTodaysLogs(entries.filter(e => e.date === today).length);
  }, [entries]);

  const addTransportItem = () => {
    setTransportItems([...transportItems, { type: "walking", distance: 0 }]);
  };

  const updateTransportItem = (index, field, value) => {
    const updated = [...transportItems];
    updated[index] = { ...updated[index], [field]: value };
    setTransportItems(updated);
  };

  const removeTransportItem = (index) => {
    setTransportItems(transportItems.filter((_, i) => i !== index));
  };

  const calculateEmissions = () => {
    const distanceMultiplier = user?.preferences?.distance_unit === "mi" ? 1.60934 : 1;

    const transport_emissions = transportItems.reduce(
      (sum, item) =>
        sum + item.distance * distanceMultiplier * EMISSION_FACTORS.transport[item.type],
      0
    );
    const energy_emissions = energyUsage[0] * EMISSION_FACTORS.energy;
    const diet_emissions = EMISSION_FACTORS.diet[dietType];

    return {
      transport_emissions: parseFloat(transport_emissions.toFixed(2)),
      energy_emissions: parseFloat(energy_emissions.toFixed(2)),
      diet_emissions: parseFloat(diet_emissions.toFixed(2)),
      total_emissions: parseFloat((transport_emissions + energy_emissions + diet_emissions).toFixed(2)),
    };
  };

  const handleLogEmissions = async () => {
    if (!user) return;

    const emissions = calculateEmissions();
    const now = new Date().toISOString();
    const existing = entries.find(e => e.date === selectedDate);

    if (existing) {
      // Update entry
      await updateDoc(
        doc(db, "users", user.id, "carbon_entries", existing.id),
        {
          ...emissions,
          notes: `Transport: ${transportItems.length} items, Energy: ${energyUsage[0]} kWh, Diet: ${dietType}`,
          updated_date: now
        }
      );
    } else {
      // Create entry
      await addDoc(
        collection(db, "users", user.id, "carbon_entries"),
        {
          date: selectedDate,
          ...emissions,
          notes: `Transport: ${transportItems.length} items, Energy: ${energyUsage[0]} kWh, Diet: ${dietType}`,
          created_date: now
        }
      );

      // Award coins using your User entity
      await User.updateMyUserData({
        treecoins: (user.treecoins || 0) + COINS_PER_LOG
      });
    }

    // Reload entries
    const q = query(
      collection(db, "users", user.id, "carbon_entries"),
      orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));

    setTransportItems([]);
    setEnergyUsage([20]);
    setDietType("omnivore");
  };

  const chartData = Array.from({ length: 30 }).map((_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const entry = entries.find((e) => e.date === dateStr);
    
    return {
      date: format(date, "MMM d"),
      yourEmissions: entry ? entry.total_emissions : null,
      averageHuman: 16.4,
      target: 4.8,
    };
  });

  const validEntries = entries.filter(e => e.total_emissions != null);
  const avgEmissions = validEntries.length > 0 
    ? validEntries.reduce((sum, e) => sum + e.total_emissions, 0) / validEntries.length 
    : 0;
    
  const weightUnit = user?.preferences?.weight_unit || "kg";
  const weightMultiplier = weightUnit === "lbs" ? 2.20462 : 1;

  const getEmissionEvaluation = () => {
    if (avgEmissions === 0)
      return {
        status: "neutral",
        text: "Log your first entry to see your impact evaluation.",
        color: "text-gray-600",
      };
    if (avgEmissions < 4.8)
      return {
        status: "excellent",
        text: "Excellent! You're meeting Paris Agreement targets!",
        color: "text-green-600",
      };
    if (avgEmissions < 7)
      return {
        status: "good",
        text: "Good progress! You're below the sustainable threshold.",
        color: "text-blue-600",
      };
    if (avgEmissions < 12)
      return {
        status: "moderate",
        text: "Room for improvement. Consider more sustainable choices.",
        color: "text-yellow-600",
      };
    return {
      status: "high",
      text: "High concern. Focus on reducing transportation and energy use.",
      color: "text-red-600",
    };
  };

  const evaluation = getEmissionEvaluation();

  if (loadingUser) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;
  
  return (
    <div className="p-4 md:p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Your Carbon Footprint</h1>
          <p className="text-gray-600 mt-2">Track your daily habits and see your impact on the planet</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Leaf className="w-6 h-6 text-teal-600" />
                Log Daily Impact
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Car className="w-4 h-4" /> Transportation
                  </Label>
                  <Button size="sm" variant="outline" onClick={addTransportItem}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                {transportItems.map((item, index) => (
                  <div key={index} className="rounded-lg p-3 space-y-2 bg-gray-50">
                    <div className="flex justify-between items-center gap-2">
                      <Select value={item.type} onValueChange={(value) => updateTransportItem(index, "type", value)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white shadow-lg rounded-md">
                          <SelectItem value="walking">Walking</SelectItem>
                          <SelectItem value="cycling">Cycling</SelectItem>
                          <SelectItem value="electric_scooter">Electric Scooter</SelectItem>
                          <SelectItem value="bus">Bus</SelectItem>
                          <SelectItem value="train">Train</SelectItem>
                          <SelectItem value="car_gasoline">Car (Gasoline)</SelectItem>
                          <SelectItem value="car_electric">Car (Electric)</SelectItem>
                          <SelectItem value="motorcycle">Motorcycle</SelectItem>
                          <SelectItem value="flight_domestic">Flight (Domestic)</SelectItem>
                          <SelectItem value="flight_international">Flight (International)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => removeTransportItem(index)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder={`Distance (${user?.preferences?.distance_unit || 'km'})`}
                        value={item.distance}
                        onChange={(e) => updateTransportItem(index, "distance", parseFloat(e.target.value) || 0)}
                        className="flex-1"
                      />
                      <Card className="text-sm w-9 h-7 flex justify-center items-center">
                        {user?.preferences?.distance_unit || "km"}
                      </Card>
                    </div>

                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Label htmlFor="energy" className="flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Energy Use (kWh)
                </Label>
                <Slider
                  id="energy"
                  max={100}
                  step={0.5}
                  value={energyUsage}
                  onValueChange={setEnergyUsage}
                  className="bg-gray-200 border border-gray-400 h-3 rounded-full"
                />
                <span className="text-sm font-medium text-gray-600">{energyUsage[0]} kWh</span>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Utensils className="w-4 h-4" /> Today's Diet
                </Label>
                <Select value={dietType} onValueChange={setDietType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white shadow-lg rounded-md">
                    <SelectItem value="vegan">Vegan</SelectItem>
                    <SelectItem value="vegetarian">Vegetarian</SelectItem>
                    <SelectItem value="pescatarian">Pescatarian</SelectItem>
                    <SelectItem value="omnivore">Omnivore</SelectItem>
                    <SelectItem value="carnivore">Carnivore</SelectItem>
                    <SelectItem value="keto">Keto</SelectItem>
                    <SelectItem value="paleo">Paleo</SelectItem>
                    <SelectItem value="gluten_free">Gluten-Free</SelectItem>
                    <SelectItem value="intermittent">Intermittent Fasting</SelectItem>
                    <SelectItem value="raw">Raw</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg p-4 bg-teal-50">
                <h4 className="font-semibold text-teal-700">Today's Total</h4>
                <p className="text-2xl font-bold text-teal-600">
                  {(calculateEmissions().total_emissions * weightMultiplier).toFixed(2)} {weightUnit} CO₂
                </p>
              </div>

              {message && (
                <Alert
                  className={
                    message.type === "success"
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }
                >
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleLogEmissions}
                className="w-full bg-gradient-to-r from-teal-500 to-green-500"
              >
                {entries.find(e => e.date === selectedDate) 
                  ? 'Update Entry' 
                  : `Log & Earn ${Math.min(COINS_PER_LOG, MAX_DAILY_COINS - todaysLogs * COINS_PER_LOG)} Treecoins`
                }
              </Button>
              <p className="text-xs text-center text-gray-500">
                {todaysLogs}/{DAILY_LIMIT} logs today
              </p>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            {/* Evaluation Panel */}
            <Card className="bg-gradient-to-br from-blue-50 to-teal-50 border-0">
              <CardHeader>
                <CardTitle className={evaluation.color}>Impact Evaluation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-lg font-medium ${evaluation.color}`}>{evaluation.text}</p>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-teal-600">{(avgEmissions * weightMultiplier).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Your Average ({weightUnit} CO₂)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">{(16.4 * weightMultiplier).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Global Average ({weightUnit} CO₂)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{(4.8 * weightMultiplier).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Paris Target ({weightUnit} CO₂)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Your Emissions vs. Global Targets</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {entries.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Plus className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 font-medium">No data yet</p>
                      <p className="text-sm text-gray-500 mt-2">Start logging your daily emissions to see your progress!</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: "black" }} />
                      <YAxis unit={` ${weightUnit}`} tick={{ fontSize: 12, fill: "black" }} domain={[0, (dataMax) => Math.round(dataMax + 11.4)]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "white", border: "1px solid #e0e0e0", color: "black" }}
                        formatter={(value) =>
                          value ? `${(value * weightMultiplier).toFixed(2)} ${weightUnit}` : "No data"
                        }
                      />
                      <Legend wrapperStyle={{ color: "black" }} />
                      <Line 
                        type="monotone" 
                        dataKey="yourEmissions" 
                        name="Your Emissions" 
                        stroke="#14B8A6" 
                        strokeWidth={3} 
                        dot={{ r: 5, fill: "#14B8A6" }} 
                        connectNulls={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="averageHuman" 
                        name="Global Average" 
                        stroke="#EF4444" 
                        strokeWidth={2} 
                        strokeDasharray="5 5" 
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="target" 
                        name="Paris Agreement Target" 
                        stroke="#10B981" 
                        strokeWidth={2} 
                        strokeDasharray="10 5"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}