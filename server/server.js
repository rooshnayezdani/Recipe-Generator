const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Recipe } = require('./database');
const { OpenAI } = require("openai");


const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello World!')
});

// SSE Endpoint
app.get("/recipeStream", (req, res) => {
    const ingredients = req.query.ingredients;
    const mealType = req.query.mealType;
    const cuisine = req.query.cuisine;
    const cookingTime = req.query.cookingTime;
    const complexity = req.query.complexity;

    console.log(req.query)

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Function to send messages
    const sendEvent = (chunk) => {
        let chunkResponse;
        if (chunk.choices[0].finish_reason === "stop") {
            res.write(`data: ${JSON.stringify({ action: "close" })}\n\n`);
        } else {
            if (
                chunk.choices[0].delta.role &&
                chunk.choices[0].delta.role === "assistant"
            ) {
                chunkResponse = {
                    action: "start",
                };
            } else {
                chunkResponse = {
                    action: "chunk",
                    chunk: chunk.choices[0].delta.content,
                };
            }
            res.write(`data: ${JSON.stringify(chunkResponse)}\n\n`);
        }
    };

    const prompt = [];
    prompt.push("Generate a recipe that incorporates the following details:");
    prompt.push(`[Ingredients: ${ingredients}]`);
    prompt.push(`[Meal Type: ${mealType}]`);
    prompt.push(`[Cuisine Preference: ${cuisine}]`);
    prompt.push(`[Cooking Time: ${cookingTime}]`);
    prompt.push(`[Complexity: ${complexity}]`);
    prompt.push(
        "Please provide a detailed recipe, including steps for preparation and cooking. Only use the ingredients provided."
    );
    prompt.push(
        "The recipe should highlight the fresh and vibrant flavors of the ingredients."
    );
    prompt.push(
        "Also give the recipe a suiable name in its local languagebased on cuisine preference."
    );

    // Save recipe
    app.post('/saveRecipe', async (req, res) => {
        try {
          const { recipeText } = req.body;
          const recipe = new Recipe({ recipeText });
          await recipe.save();
          res.status(201).json(recipe);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

    const messages = [
        {
            role: "system",
            content: prompt.join(" "),
        },
    ];
    fetchOpenAICompletionsStream(messages, sendEvent);

    // Clear interval and close connection on client disconnect
    req.on("close", () => {
        res.end();
    });
});

async function fetchOpenAICompletionsStream(messages, callback) {
    const OPENAI_API_KEY = "OPENAI_API_KEY";
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const aiModel = "gpt-4-1106-preview";
    try {
        const completion = await openai.chat.completions.create({
            model: aiModel,
            messages: messages,
            temperature: 1,
            stream: true,
        });

        for await (const chunk of completion) {
            callback(chunk);
        }
    } catch (error) {
        console.error("Error fetching data from OpenAI API:", error);
        throw new Error("Error fetching data from OpenAI API.");
    }
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
