// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json({ limit: "10mb" }));

app.post("/classify", async (req, res) => {
  const imageBase64 = req.body.image;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Classify this waste image into RECYCLE, COMPOST, HAZARD, or TRASH." },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
          ]
        }]
      })
    }
  );

  const data = await response.json();
  res.json(data);
});

app.listen(5000, () => console.log("Server running on port 5000"));
