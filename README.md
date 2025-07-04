# LLM Game MVP

A 2D educational game built with **Phaser** where students can interact with NPCs powered by large language models. Each NPC asks domain-specific questions and responds to player answers using LLM-based logic.

---

## 🧠 Features

- 🕹️ 2D interactive game using Phaser.js
- 💬 NPCs with unique personalities and questions
- 🔄 Real-time chat with streaming LLM responses
- 🔌 Express.js backend with OpenRouter proxy support

---

## 📁 Project Structure

```
llm-game/
├── game.js           # Phaser game logic
├── index.html        # Game HTML
├── style.css         # Chat UI styles
├── server/
│   ├── server.js     # Express backend with streaming LLM integration
│   ├── prompts.js    # NPC behavior and prompts
│   └── .env          # API keys and config
```

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/llm-game.git
cd llm-game
```

### 2. Install server dependencies

```bash
cd server
npm install
```

### 3. Set up `.env`

Create `server/.env`:

```
PORT=3000
OPENROUTER_API_KEY=your_key_here
```

Set up your proxy at `http://127.0.0.1:2081` (e.g., with Clash or similar).

### 4. Run the backend

```bash
node server.js
```

### 5. Open `index.html` in your browser

Use a local server (e.g. Live Server extension or `python3 -m http.server`) for local files to load properly.

---

## 🧙 NPCs

| Name     | Role                      | Question                                        |
| -------- | ------------------------- | ----------------------------------------------- |
| Mushroom | Enthusiastic math teacher | What is 5 × (3 + 2)?                            |
| Slime    | Curious historian         | What is the name of the valley we live in?      |
| Gem      | Wise geologist            | What element is most abundant in Earth’s crust? |

---

## 🛠️ Technologies

* [Phaser 3](https://phaser.io/)
* [Node.js](https://nodejs.org/)
* [Express.js](https://expressjs.com/)
* [OpenRouter](https://openrouter.ai/)

---

## 📜 License

MIT – do whatever you want responsibly.
