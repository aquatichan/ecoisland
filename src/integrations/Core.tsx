// Dysfunctional as of October 25, 2025
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const OPENAI_API_KEY = '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';

export const UploadFile = async ({ file }) => {
  const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const file_url = await getDownloadURL(storageRef);
  return { file_url };
};

export const InvokeLLM = async (imageFile) => {
  try {
    // 1. Upload image to Firebase Storage
    const timestamp = Date.now();
    const storageRef = ref(storage, `danger_scans/${timestamp}_${imageFile.name}`);
    const snapshot = await uploadBytes(storageRef, imageFile);
    const imageUrl = await getDownloadURL(snapshot.ref);
    
    console.log('Image uploaded to:', imageUrl);

    // 2. Convert image to base64 for OpenAI
    const base64Image = await fileToBase64(imageFile);
    
    // 3. Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image for environmental issues. Identify the specific issue type (e.g., Littering, Illegal Dumping, Water Pollution, Air Pollution, Deforestation, etc.). 
                
                Provide a concise title and a specific, actionable civic step that a regular citizen can take to address or report this issue. 

                Return your response in this exact JSON format:
                {
                  "issue_type": "string",
                  "title": "string", 
                  "suggested_action": "string"
                }

                Be specific and helpful. If no clear environmental issue is visible, indicate that in the issue_type.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API failed: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    return {
      ...result,
      file_url: imageUrl,
      analysis_timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
};

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};