// /srv/my-imagen-app/app/server.js
const express = require('express');
const fetch = require('node-fetch');
const { GoogleAuth } = require('google-auth-library');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// --- IMPORTANT CONFIGURATION ---
// !!! 请将 YOUR_ACTUAL_GOOGLE_CLOUD_PROJECT_ID 替换为您的真实 Google Cloud 项目 ID !!!
const PROJECT_ID = "nifty-might-456504-d2";
const LOCATION_ID = "us-central1"; // The location of the model (e.g., us-central1)
const DEFAULT_MODEL_ID = "imagen-4.0-generate-preview-05-20"; // Or "imagen-4.0-ultra-generate-exp-05-20"
// --- END IMPORTANT CONFIGURATION ---

const AI_PLATFORM_ENDPOINT = `https://${LOCATION_ID}-aiplatform.googleapis.com`;

const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
});

app.post('/api/generate-image', async (req, res) => {
    const requestTimestamp = new Date().toISOString();
    console.log(`[${requestTimestamp}] Received request to /api/generate-image`);
    console.log(`[${requestTimestamp}] Request body:`, req.body);

    if (PROJECT_ID === "YOUR_ACTUAL_GOOGLE_CLOUD_PROJECT_ID") {
        console.error(`[${requestTimestamp}] CRITICAL ERROR: PROJECT_ID is not configured in server.js.`);
        return res.status(500).json({ error: 'Server configuration error: PROJECT_ID not set.' });
    }

    const {
        prompt,
        negativePrompt = "",
        aspectRatio = "1:1",
        modelId
    } = req.body;

    if (!prompt) {
        console.log(`[${requestTimestamp}] Error: Prompt is missing`);
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const selectedModelId = modelId || DEFAULT_MODEL_ID;
    console.log(`[${requestTimestamp}] Using model ID: ${selectedModelId}`);

    const MODEL_ENDPOINT_URL = `${AI_PLATFORM_ENDPOINT}/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/google/models/${selectedModelId}:predict`;
    console.log(`[${requestTimestamp}] Targeting Vertex AI Endpoint: ${MODEL_ENDPOINT_URL}`);

    try {
        const client = await auth.getClient();
        const accessToken = (await client.getAccessToken()).token;

        const payload = {
            instances: [{ "prompt": prompt }],
            parameters: {
                "aspectRatio": aspectRatio,
                //"enhancePrompt": false,
                "sampleCount": 1,
                "negativePrompt": negativePrompt,
                "safetySetting": "block_none",
                "personGeneration": "allow_all",
                "addWatermark": true,
                "language": "auto"
            }
        };

        const vertexAIResponse = await fetch(MODEL_ENDPOINT_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseBodyText = await vertexAIResponse.text();

        if (!vertexAIResponse.ok) {
            console.error(`[${requestTimestamp}] Vertex AI API error! Status: ${vertexAIResponse.status} for model ${selectedModelId}`);
            console.error(`[${requestTimestamp}] Response body:`, responseBodyText);
            let errorDetails = { message: "Failed to parse error from Vertex AI." };
            try {
                const parsedError = JSON.parse(responseBodyText);
                errorDetails = parsedError.error || parsedError;
            } catch (e) {
                errorDetails.rawResponse = responseBodyText;
            }
            return res.status(vertexAIResponse.status).json({
                error: `Failed to generate image from Vertex AI using model ${selectedModelId}.`,
                details: errorDetails
            });
        }

        const result = JSON.parse(responseBodyText);

        if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
            console.log(`[${requestTimestamp}] Image generated successfully with model ${selectedModelId}.`);
            res.json({ imageData: result.predictions[0].bytesBase64Encoded });
        } else {
            console.error(`[${requestTimestamp}] Invalid response structure from Vertex AI for model ${selectedModelId}:`, result);
            res.status(500).json({ error: 'Failed to parse image data from Vertex AI response.' });
        }

    } catch (error) {
        console.error(`[${requestTimestamp}] Error in /api/generate-image with model ${selectedModelId}:`, error.message);
        console.error(error.stack);
        res.status(500).json({ error: 'Internal server error while generating image.', details: error.message });
    }
});

app.listen(port, () => {
    const startupTimestamp = new Date().toISOString();
    console.log(`[${startupTimestamp}] Backend server listening at http://localhost:${port}`);
    if (PROJECT_ID === "YOUR_ACTUAL_GOOGLE_CLOUD_PROJECT_ID") {
        console.error(`[${startupTimestamp}] CRITICAL WARNING: PROJECT_ID is not configured in server.js. The application will not work correctly.`);
    } else {
        console.log(`[${startupTimestamp}] Configured for Project ID: ${PROJECT_ID}, Location: ${LOCATION_ID}`);
    }
    console.log(`[${startupTimestamp}] Default Model ID if not specified by client: ${DEFAULT_MODEL_ID}`);
    console.log(`[${startupTimestamp}] Ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly for authentication.`);
});
