import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // Socket.io logic for real-time collaboration
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join_trip', (tripId) => {
      socket.join(tripId);
      console.log(`Socket ${socket.id} joined trip ${tripId}`);
    });

    socket.on('update_trip', (data) => {
      // Broadcast to others in the room
      socket.to(data.tripId).emit('trip_updated', data);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // API endpoint to generate itinerary with Gemini
  app.post('/api/generate-trip', async (req, res) => {
    try {
      const { prompt, currentTrip } = req.body;
      
      const systemInstruction = `You are TravelGPT, an advanced AI-powered Travel Planner.
Your goal is to act as a professional travel consultant, trip organizer, and guide.
You must return the trip plan strictly as a JSON object, adhering to the structure provided.

Requirements:
- Destination recommendations
- Complete day-wise itinerary
- Budget estimation (in the currency of the destination)
- Budget breakdown showing total in the traveler's home currency (homeCurrency and totalInHomeCurrency)
- Money exchange plan in the traveler's country near their location
- Packing checklist
- Transportation planning
- Accommodation suggestions
- Food recommendations
- Weather forecast
- Safety information
- Emergency contacts
- Local travel tips
- Hidden gems
- Expense tracker
- Sustainability tips
- Travel documents checklist

Always optimize the trip for minimum travel time, maximum enjoyment, safety, and budget efficiency.
Make sure to include latitude and longitude coordinates for destinations, hotels, and attractions so they can be plotted on a map.

Respond ONLY with valid JSON. Do not include markdown blocks like \\\`\\\`\\\`json around the response.
JSON Format:
{
  "summary": {
    "title": "String",
    "description": "String",
    "startingCity": "String",
    "destination": "String",
    "coordinates": {"lat": Number, "lng": Number},
    "startDate": "String",
    "endDate": "String",
    "budget": "Economy | Standard | Luxury",
    "currency": "String"
  },
  "weather": {
    "season": "String",
    "temperature": "String",
    "clothing": ["String"]
  },
  "transportation": [
    {"type": "String", "details": "String", "cost": "String"}
  ],
  "accommodations": [
    {
      "name": "String",
      "type": "Hotel | Hostel | Resort | Airbnb",
      "rating": "String",
      "price": "String",
      "location": "String",
      "coordinates": {"lat": Number, "lng": Number},
      "description": "String"
    }
  ],
  "itinerary": [
    {
      "day": Number,
      "date": "String",
      "dailyCost": "String",
      "activities": [
        {
          "time": "Morning | Afternoon | Evening | Night",
          "title": "String",
          "description": "String",
          "locationName": "String",
          "coordinates": {"lat": Number, "lng": Number},
          "cost": "String"
        }
      ]
    }
  ],
  "food": [
    {"meal": "String", "recommendation": "String", "cost": "String"}
  ],
  "budgetBreakdown": {
    "flights": "Number",
    "accommodation": "Number",
    "food": "Number",
    "activities": "Number",
    "total": "Number",
    "currency": "String",
    "homeCurrency": "String",
    "totalInHomeCurrency": "Number"
  },
  "moneyExchangePlan": {
    "recommendation": "String",
    "nearbyExchanges": [
      {
        "name": "String",
        "address": "String",
        "description": "String"
      }
    ]
  },
  "checklists": {
    "packing": ["String"],
    "documents": ["String"]
  },
  "safety": ["String"],
  "emergency": {"police": "String", "hospital": "String", "embassy": "String"},
  "tips": ["String"],
  "hiddenGems": [
    {
      "name": "String",
      "description": "String",
      "coordinates": {"lat": Number, "lng": Number}
    }
  ],
  "ecoFriendly": ["String"]
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      let jsonText = response.text;
      // Clean up markdown block if the model included it despite instructions
      if (jsonText && jsonText.startsWith('\`\`\`json')) {
        jsonText = jsonText.replace(/\`\`\`json\n/g, '').replace(/\`\`\`/g, '');
      } else if (jsonText && jsonText.startsWith('\`\`\`')) {
        jsonText = jsonText.replace(/\`\`\`\n/g, '').replace(/\`\`\`/g, '');
      }

      res.json({ success: true, trip: JSON.parse(jsonText) });
    } catch (error: any) {
      console.error('Error generating trip:', error);
      if (error.status === 429 || error.status === 'RESOURCE_EXHAUSTED' || (error.message && error.message.includes('429'))) {
        return res.status(429).json({ success: false, error: "You've exceeded the Gemini API free tier quota. Please wait a minute and try again." });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
        const { messages, tripContext } = req.body;
        const systemInstruction = `You are TravelGPT, an AI travel assistant. Help the user plan their trip or answer questions about their current trip plan. Here is their current trip plan context (if any): ${JSON.stringify(tripContext)}. 
        
Important: If the user has not yet provided their current location/country of origin, you MUST politely ask for it before generating a full itinerary. Knowing their origin is required to provide accurate flights, budget in their home currency, and a nearby money exchange plan in their country. Also ask for their destination, budget, dates of the trip, if they are traveling solo or with a group, and their preferred vibes or interests if not provided.`;
        
        // Format messages for the API
        const formattedContents = messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: formattedContents,
            config: {
                systemInstruction,
            }
        });

        res.json({ success: true, text: response.text });
    } catch (error: any) {
        console.error('Error in chat:', error);
        if (error.status === 429 || error.status === 'RESOURCE_EXHAUSTED' || (error.message && error.message.includes('429'))) {
          return res.status(429).json({ success: false, error: "You've exceeded the Gemini API free tier quota. Please wait a minute and try again." });
        }
        res.status(500).json({ success: false, error: error.message });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
