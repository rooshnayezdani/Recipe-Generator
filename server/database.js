const mongoose = require('mongoose');
const { OpenAI } = require("openai");

const recipeSchema = new mongoose.Schema({
  recipeText: { type: String, required: true },
});

const Recipe = mongoose.model('Recipe', recipeSchema);

mongoose.connect('mongodb://localhost:27017/recipes', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

module.exports = { Recipe };
