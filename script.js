const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// You would typically use environment variables for your API keys.
// For this example, we'll keep them here.


const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const OPENWEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

// Middleware
app.use(cors());
app.use(express.json());

// API endpoint for farmer registration
app.post('/api/register', (req, res) => {
    const registrationData = req.body;
    console.log('Received registration data:', registrationData);
    res.json({ message: 'Registration successful!' });
});

// API endpoint for getting market data
const marketData = [
    { name: "Tomato", price: 25.00 },
    { name: "Potato", price: 30.50 },
    { name: "Onion", price: 20.00 },
    { name: "Brinjal", price: 35.75 },
    { name: "Cabbage", price: 18.25 },
    { name: "Banana", price: 40.00 },
    { name: "Mango", price: 80.00 },
    { name: "Grapes", price: 65.00 }
];

app.get('/api/market-data', (req, res) => {
    console.log('GET request received for /api/market-data');
    res.json(marketData);
});

// API endpoint for getting land price data
const landPriceData = [
    { location: "Guntur", price: 3500, unit: "per square feet" },
    { location: "Vijayawada", price: 4200, unit: "per square feet" },
    { location: "Amaravati", price: 5000, unit: "per square feet" }
];

app.get('/api/land-price', (req, res) => {
    console.log('GET request received for /api/land-price');
    res.json(landPriceData);
});

// API endpoint for agriculture department numbers
const departmentNumbers = [
    { name: "Indian Council of Agricultural Research (ICAR)", phone: "+91-11-25841760" },
    { name: "Department of Agriculture, Cooperation & Farmers Welfare", phone: "+91-11-23383087" },
    { name: "National Bank for Agriculture and Rural Development (NABARD)", phone: "+91-22-26539895" }
];

app.get('/api/department-numbers', (req, res) => {
    console.log('GET request received for /api/department-numbers');
    res.json(departmentNumbers);
});


// New API endpoint for dynamic weather advice
app.post('/api/weather-advice', async (req, res) => {
    const place = req.body.place;
    if (!place) {
        return res.status(400).json({ 
            message: { 
                summary: "Please provide a location to get weather advice." 
            }
        });
    }

    try {
        console.log(`Fetching weather data for: ${place}`);
        
        // Fetch weather data from OpenWeatherMap API
        const weatherResponse = await axios.get(OPENWEATHER_API_URL, {
            params: {
                q: place,
                appid: OPENWEATHER_API_KEY,
                units: 'metric' // Get temperature in Celsius
            }
        });

        const weatherData = weatherResponse.data;
        const weatherDescription = weatherData.weather[0].description;
        const temperature = weatherData.main.temp;
        const humidity = weatherData.main.humidity;
        const windSpeed = weatherData.wind.speed;

        console.log('Weather data fetched successfully. Now generating advice with LLM.');

        // Prompt for the LLM to generate structured agricultural advice
        const prompt = `Act as an expert agricultural advisor for an Indian farmer. Based on the following weather data, provide specific, practical advice for farming activities.
        
        Location: ${place}
        Weather Conditions: ${weatherDescription}
        Temperature: ${temperature}°C
        Humidity: ${humidity}%
        Wind Speed: ${windSpeed} m/s

        Your response should be a JSON object with the following structure:
        {
          "title": "A concise, engaging title for the weather advice.",
          "summary": "A brief, friendly summary of the current weather situation and its general impact on farming.",
          "details": [
            "An actionable bullet point about the current weather conditions, including emojis and temperature in Celsius. For example, '☀️ Today is mostly sunny with a high of ${temperature}°C, so remember to hydrate and protect your crops from the heat.'",
            "An actionable bullet point about timing, specifically mentioning if it's a good time for rain or sun. For example, '🌧️ Expect light rain in the afternoon. This is good for planting new seedlings.'",
            "An actionable bullet point about crops, suggesting what to do and what crops are best to plant or harvest now based on the weather.",
            "An actionable bullet point about irrigation (e.g., 'Increase irrigation').",
            "An actionable bullet point about other farming tasks (e.g., 'Focus on weeding')."
          ]
        }
        
        Ensure the advice is relevant to the provided weather metrics. The content should be clear, helpful, and use simple language. Use emojis in the bullet points to make them visually appealing.`;

        // Use the Gemini API to generate the structured advice
        const geminiResponse = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        });
        
        const generatedText = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!generatedText) {
            throw new Error("Failed to generate advice from the LLM.");
        }

        const adviceObject = JSON.parse(generatedText);
        res.json({ message: adviceObject });

    } catch (error) {
        console.error('Error fetching or generating weather advice:', error.response?.data || error.message);
        
        let errorMessage = "Failed to get weather advice. Please try again with a valid location.";
        if (error.response && error.response.status === 404) {
            errorMessage = `Could not find weather data for the location. Please check the spelling and try again.`;
        }

        res.status(500).json({ 
            message: { 
                title: "Error ⚠️",
                summary: errorMessage,
                details: []
            }
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Backend ready to handle API calls on http://localhost:${port}`);
});