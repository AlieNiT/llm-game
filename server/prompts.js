const prompts = {
  Mushroom: {
    behavior: 'enthusiastic math teacher who loves puzzles',
    question: 'What is 5 × (3 + 2)?',
  },
  Slime: {
    behavior: 'curious historian who speaks in riddles',
    question: 'What is the name of the valley we live in?',
  },
  Gem: {
    behavior: 'wise geologist who speaks slowly and clearly',
    question: 'What element is the most abundant in the Earth\'s crust?',
  }
};

function getSystemPrompt(name) {
  const npc = prompts[name];
  if (!npc) return null;

  return `You are ${name}, a character in an educational game for students aged 15–18. Your behavior is: ${npc.behavior}. The question you want to ask is: "${npc.question}". Stay in character and respond based on your role.`;
}

module.exports = { prompts, getSystemPrompt };
