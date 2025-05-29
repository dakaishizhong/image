// server.js
const express = require(&#39;express&#39;);
const fetch = require(&#39;node-fetch&#39;); // For making HTTP requests
const { GoogleAuth } = require(&#39;google-auth-library&#39;); // For Google Cloud authentication

const app = express();
const port = process.env.PORT || 3000; // Allow port to be configured by environment

// Middleware to parse JSON bodies
app.use(express.json());

// --- IMPORTANT CONFIGURATION ---
// \!\!\! 请将 YOUR\_ACTUAL\_GOOGLE\_CLOUD\_PROJECT\_ID 替换为您的真实 Google Cloud 项目 ID \!\!\!
const PROJECT\_ID = "YOUR\_ACTUAL\_GOOGLE\_CLOUD\_PROJECT\_ID";
const LOCATION\_ID = "us-central1"; // The location of the model (e.g., us-central1)
// Default model if not specified by client.
const DEFAULT\_MODEL\_ID = "imagen-4.0-generate-preview-05-20"; // Or "imagegeneration@006"
// --- END IMPORTANT CONFIGURATION ---

// The Vertex AI API endpoint base
const AI\_PLATFORM\_ENDPOINT = `https://${LOCATION_ID}-aiplatform.googleapis.com`;

// Initialize GoogleAuth
const auth = new GoogleAuth({
scopes: 'https://www.googleapis.com/auth/cloud-platform' // Scope required for Vertex AI
});

// API endpoint to generate images
app.post('/api/generate-image', async (req, res) =\> {
console.log(`[${new Date().toISOString()}] Received request to /api/generate-image`);
console.log(`[${new Date().toISOString()}] Request body:`, req.body);
