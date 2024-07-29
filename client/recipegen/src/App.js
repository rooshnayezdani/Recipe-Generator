import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const RecipeCard = ({ onSubmit }) => {
  const [ingredients, setIngredients] = useState("");
  const [mealType, setMealType] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [cookingTime, setCookingTime] = useState("");
  const [complexity, setComplexity] = useState("");

  const handleSubmit = () => {
    const recipeData = {
      ingredients,
      mealType,
      cuisine,
      cookingTime,
      complexity,
    };
    onSubmit(recipeData);
  };

  return (
    <div className="recipe-card">
      <div className="card-content">
        <div className="card-title">Recipe Generator</div>
        <div className="input-group">
          <label htmlFor="ingredients">Ingredients</label>
          <input
            id="ingredients"
            type="text"
            placeholder="Enter ingredients"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="mealType">Meal Type</label>
          <select
            id="mealType"
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
          >
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Snack">Snack</option>
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="cuisine">Cuisine Preference</label>
          <input
            id="cuisine"
            type="text"
            placeholder="e.g., Italian, Mexican"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="cookingTime">Cooking Time</label>
          <select
            id="cookingTime"
            value={cookingTime}
            onChange={(e) => setCookingTime(e.target.value)}
          >
            <option value="Less than 30 minutes">Less than 30 minutes</option>
            <option value="30-60 minutes">30-60 minutes</option>
            <option value="More than 1 hour">More than 1 hour</option>
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="complexity">Complexity</label>
          <select
            id="complexity"
            value={complexity}
            onChange={(e) => setComplexity(e.target.value)}
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
        <div className="button-group">
          <button type="button" onClick={handleSubmit}>
            Generate Recipe
          </button>
        </div>
      </div>
    </div>
  );
};

const RecipeApp = () => {
  const [recipeData, setRecipeData] = useState(null);
  const [recipeText, setRecipeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  let eventSourceRef = useRef(null);

  useEffect(() => {
    closeEventStream(); // Close any existing connection

    return () => {
      closeEventStream(); // Clean up when component unmounts
    };
  }, []);

  useEffect(() => {
    if (recipeData) {
      closeEventStream(); // Close any existing connection
      initializeEventStream(); // Open a new connection
    }
  }, [recipeData]);

  // Function to initialize the event stream
  const initializeEventStream = () => {
    setLoading(true);
    setError(null);

    const recipeInputs = { ...recipeData };

    // Construct query parameters
    const queryParams = new URLSearchParams(recipeInputs).toString();
    // Open an SSE connection with these query parameters
    const url = `http://localhost:3001/recipeStream?${queryParams}`;
    eventSourceRef.current = new EventSource(url);

    eventSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data);

      if (data.action === "close") {
        closeEventStream();
        setLoading(false);
      } else if (data.action === "chunk") {
        setRecipeText((prev) => prev + data.chunk);
      }
    };

    eventSourceRef.current.onerror = () => {
      setError("Error occurred while generating recipe. Please try again.");
      setLoading(false);
      closeEventStream();
    };
  };

  // Function to close the event stream
  const closeEventStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const saveRecipeToDatabase = async () => {
    try {
      const response = await fetch("http://localhost:3001/saveRecipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipeText }),
      });

      if (!response.ok) {
        throw new Error("Failed to save the recipe");
      }

      console.log("Recipe saved successfully");
    } catch (error) {
      console.error("Error saving recipe:", error);
      setError("Error saving the recipe. Please try again.");
    }
  };

  async function onSubmit(data) {
    // update state
    setRecipeText("");
    setRecipeData(data);
  }

  return (
    <div className="App">
      <div className="container">
        <RecipeCard onSubmit={onSubmit} />
        <div className="recipe-output">
          {loading ? "Generating recipe..." : recipeText}
          {error && <div className="error">{error}</div>}
          {!loading && recipeText && (
            <button onClick={saveRecipeToDatabase} className="save-button">
              Save Recipe
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeApp;
