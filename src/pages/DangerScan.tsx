import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Camera, Lightbulb, AlertCircle, Sparkles, Loader2, Plus, BrainCog } from "lucide-react";

const placeholder_analyses = [
  {
    issue_type: "Littering",
    title: "Plastic Waste & Trash Detected",
    suggested_action: "Report this location to your local sanitation department and consider organizing a community cleanup event."
  },
  {
    issue_type: "Illegal Dumping",
    title: "Large Unknown Debris Pile Found",
    suggested_action: "Document with photos and GPS coordinates, then report to your city's environmental services and public health departments."
  },
  {
    issue_type: "Water Pollution",
    title: "Contaminated Water Source",
    suggested_action: "Contact the EPA Office of Water immediately and avoid contact with the water. DO NOT DRINK and warn nearby residents."
  },
  {
    issue_type: "Air Pollution",
    title: "Smoke Emissions or Unknown Smog Detected",
    suggested_action: "Report to local air quality control board with time and location details. Document industrial activity and wind speed/direction."
  },
  {
    issue_type: "Vegetation Damage",
    title: "Damaged Plant or Ecosystem Life",
    suggested_action: "Contact your city's parks department or local environmental conservation group for assistance. Consider organizing a replanting event."
  },
  {
    issue_type: "Natural Disaster",
    title: "Extreme Weather: Hazardous Conditions",
    suggested_action: "Seek shelter immediately and stay safe. Once the storm has concluded, help others find their footing and host a cleanup initiative."
  },
  {
    issue_type: "Oil Spill",
    title: "Liquid Spill Detected",
    suggested_action: "Monitor the area, identify the source of the leak, and contact appropriate personnel. Do not engage or contaminate further."
  },
  {
    issue_type: "Wildfire",
    title: "Wildfire Nearby",
    suggested_action: "Evacuate immediately; stay indoors and close vents or windows. Notify authorities and limit any physical activity."
  },
  {
    issue_type: "N/A",
    title: "No Issue Detected",
    suggested_action: "No issue was detected in this image. Please try again with a different image or take a different angle."
  },
];

export default function DangerScan() {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAnalysisResult(null);
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalysis = async () => {
    if (!imageFile) {
      alert("Please upload an image first.");
      return;
    }
    
    setIsProcessing(true);
    setAnalysisResult(null);

    // simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 3500));

    // return random fake analysis
    const randomAnalysis = placeholder_analyses[Math.floor(Math.random() * placeholder_analyses.length)];
    setAnalysisResult(randomAnalysis);
    setIsProcessing(false);
  };
  
  const postToActionFeed = () => {
    alert('Successfully posted to Action Feed and earned 15 Treecoins!');
    setAnalysisResult(null);
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Danger Scan</h1>
          <p className="text-gray-600 mt-2">Use AI to identify environmental issues and find out how to take action</p>
          <p className="text-xs text-gray-300 mt-1">(Demo version: could not implement real AI)</p>
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-xl p-6 text-center border-red-300 bg-red-50/50">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="danger-upload" />
                <label htmlFor="danger-upload" className="cursor-pointer">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Issue Preview" className="w-full h-64 object-cover mx-auto rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64">
                      <Camera className="w-16 h-16 mx-auto text-red-400 mb-2" />
                      <p className="text-gray-600 font-medium">Click to upload a photo</p>
                      <p className="text-sm text-gray-500">Snap a picture of litter, pollution, etc.</p>
                    </div>
                  )}
                </label>
              </div>
              <Button onClick={handleAnalysis} disabled={isProcessing || !imageFile} className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600">
                {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : 'Analyze!'}
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800">Analysis Results</h3>
              
              {isProcessing && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <BrainCog className="w-16 h-16 text-teal-500 animate-pulse mb-4" />
                  <p className="mt-4 text-gray-600 font-medium">Examining your image...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take a moment.</p>
                </div>
              )}

              {analysisResult && (
                <Card className="bg-gradient-to-br from-blue-50 to-teal-50">
                  <CardHeader>
                    <CardTitle>{analysisResult.title}</CardTitle>
                    <Badge variant="secondary">{analysisResult.issue_type}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold mb-1">Suggested Action</h4>
                        <p className="text-sm text-gray-700">{analysisResult.suggested_action}</p>
                      </div>
                    </div>
                    <Button onClick={postToActionFeed} className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600">
                      <Plus className="w-4 h-4 mr-2" /> Post to Action Feed (+15 🌱)
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!isProcessing && !analysisResult && (
                <div className="flex items-center justify-center h-full text-center py-12 text-gray-500">
                  <p>Upload an image and click "Analyze" to see results here.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}