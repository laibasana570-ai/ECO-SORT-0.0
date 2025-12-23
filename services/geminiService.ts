import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, WasteCategory } from "../types";

const SYSTEM_INSTRUCTION = `
You are ECO SORT, a highly accurate waste triage expert. 
Your goal is to classify waste items from images into strictly defined categories to help users dispose of them correctly.

The Categories and Rules are:
1. RECYCLE (Green): Includes clean plastic bottles, cans, and clean cardboard/paper. If an item is recyclable material but dirty (e.g., greasy pizza box), it is NOT Recycle.
2. COMPOST (Yellow): Includes cardboard or paper that has food stains, grease, or is wet (e.g., pizza boxes, dirty napkins). Also includes food scraps and organic waste.
3. HAZARD (Red): Includes chemicals (cleaning agents, solvents), electronics (e-waste, phones, cables), batteries, light bulbs, and other dangerous materials. THIS IS CRITICAL.
4. TRASH (Grey): Includes soft plastics (wrappers, bags), unrecognizable objects, composite materials that cannot be separated, or items that don't fit the other categories.

Instructions:
- Analyze the image provided carefully.
- Determine the primary object.
- Check against the rules above. Priority: Hazard > Compost > Recycle > Trash.
- Provide a short, clear reasoning for the classification.
- Provide specific disposal instructions (e.g., "Rinse before binning" or "Take to e-waste facility").
- Provide a "sustainabilityTip": A short, fun, or interesting fact about this type of waste or its environmental impact (1 sentence).
- IMPORTANT: Waste management rules vary by location. Always imply that this is general advice and the user should check local municipal guidelines if unsure.
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: [
        WasteCategory.RECYCLE,
        WasteCategory.COMPOST,
        WasteCategory.HAZARD,
        WasteCategory.TRASH,
      ],
      description: "The classification category of the waste item.",
    },
    itemName: {
      type: Type.STRING,
      description: "A short name for the detected object (e.g., 'Soda Can', 'Greasy Pizza Box').",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence score between 0 and 1.",
    },
    reasoning: {
      type: Type.STRING,
      description: "Why it belongs to this category based on the visual evidence.",
    },
    disposalAction: {
      type: Type.STRING,
      description: "Actionable advice for the user.",
    },
    sustainabilityTip: {
      type: Type.STRING,
      description: "A fun fact or eco-tip related to the item.",
    },
  },
  required: ["category", "itemName", "confidence", "reasoning", "disposalAction", "sustainabilityTip"],
};

export const analyzeImage = async (base64Image: string): Promise<AnalysisResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Remove header if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", 
              data: cleanBase64,
            },
          },
          {
            text: "Analyze this image and classify the waste item according to the Eco Sort rules.",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini.");
    }

    const data = JSON.parse(text) as AnalysisResult;
    return data;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze the image. Please try again.");
  }
};