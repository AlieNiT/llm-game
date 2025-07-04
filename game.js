const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: { preload, create, update },
  physics: { default: 'arcade' }
};

const game = new Phaser.Game(config);

let player, npcGroup, cursors, interactKey;
let chatPanel, chatInput, chatHistory, closeBtn, npcName;

let talking = false;
let currentNpc = null; // To track which NPC we are talking to

// Data for all NPCs in the game
const npcData = [
  { 
    name: 'Mushroom', 
    sprite: 'npc1',
    x: 300, y: 100, 
    message: 'I have a math question for you. What is $5 \\times (3+2)$?' 
  },
  { 
    name: 'Slime', 
    sprite: 'npc2',
    x: 500, y: 400, 
    message: 'I know a bit about our world. What is the name of the valley we live in?' 
  },
  { 
    name: 'Gem', 
    sprite: 'npc3',
    x: 150, y: 450, 
    message: 'I hold ancient knowledge. What element is the most abundant in the Earth\'s crust?'
  },
];
let npcHistories = {};  // Store history per NPC


function preload() {
  this.load.image('player', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
  // Load a unique sprite for each NPC
  this.load.image('npc1', 'https://labs.phaser.io/assets/sprites/mushroom2.png');
  this.load.image('npc2', 'https://labs.phaser.io/assets/sprites/slime.png');
  this.load.image('npc3', 'https://labs.phaser.io/assets/sprites/blue_gem.png');
}

function create() {
  player = this.physics.add.sprite(100, 100, 'player');

  // Create a static group for all NPCs
  npcGroup = this.physics.add.staticGroup();

  // Create NPCs from the data array
  npcData.forEach(data => {
    const npc = npcGroup.create(data.x, data.y, data.sprite);
    // Attach custom data to the NPC game object
    npc.name = data.name;
    npc.message = data.message;
  });

  this.physics.add.collider(player, npcGroup);

  cursors = this.input.keyboard.createCursorKeys();
  interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

  // Chat elements
  chatPanel = document.getElementById('chatPanel');
  chatInput = document.getElementById('chatInput');
  chatHistory = document.getElementById('chatHistory');
  closeBtn = document.getElementById('closeBtn');
  npcName = document.getElementById('npcName');

  chatInput.addEventListener('keydown', onChatSubmit);
  closeBtn.addEventListener('click', closeChat);
}

function update() {
  // Player movement logic should not run when chatting
  if (!talking) {
    player.setVelocity(0);
    if (cursors.left.isDown) player.setVelocityX(-160);
    else if (cursors.right.isDown) player.setVelocityX(160);
    if (cursors.up.isDown) player.setVelocityY(-160);
    else if (cursors.down.isDown) player.setVelocityY(160);
  }

  // Check for interaction key press
  if (Phaser.Input.Keyboard.JustDown(interactKey)) {
    if (!talking) {
      // Find the closest NPC in range to interact with
      for (const npc of npcGroup.getChildren()) {
        if (Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) < 60) {
          openChat(npc);
          break; // Interact with the first NPC in range and stop checking
        }
      }
    }
  }
}

function openChat(npc) {
  talking = true;
  currentNpc = npc; // Store reference to the current NPC
  
  player.setVelocity(0); // Stop player movement
  
  npcName.textContent = npc.name; // Update chat header with NPC's name
  chatPanel.style.display = 'flex';
  chatHistory.innerHTML = `<div><b>${npc.name}:</b> ${npc.message}</div>`;
  chatInput.value = '';
  chatInput.focus();
}

function closeChat() {
  chatPanel.style.display = 'none';
  talking = false;
  currentNpc = null; // Clear the current NPC
}

async function onChatSubmit(e) {
  if (e.key === 'Enter') {
    const input = chatInput.value.trim();
    if (input === '' || !currentNpc) return;

    // Display player's message immediately
    chatHistory.innerHTML += `<div><b>You:</b> ${input}</div>`;
    chatInput.value = ''; // Clear input field
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Show a "typing" indicator for the NPC
    const thinkingMessage = document.createElement('div');
    thinkingMessage.innerHTML = `<b>${currentNpc.name}:</b> ...`;
    chatHistory.appendChild(thinkingMessage);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
      // **Fixed: Call the correct port (3000) for your proxy server**
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          npc: currentNpc.name,
          history: npcHistories[currentNpc.name] || []
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', response.status, errorText);
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Server response:', data); // Debug log
      
      // **Fixed: Extract the reply with proper error handling**
      const reply = data.reply;
      
      if (!reply) {
        console.error('No reply in response:', data);
        throw new Error('No reply received from server');
      }

      // Save history
      if (!npcHistories[currentNpc.name]) npcHistories[currentNpc.name] = [];
      npcHistories[currentNpc.name].push({ sender: 'user', text: input });
      npcHistories[currentNpc.name].push({ sender: 'model', text: reply });

      // Update the "typing" message with the actual reply
      thinkingMessage.innerHTML = `<div><b>${currentNpc.name}:</b> ${reply}</div>`;

    } catch (error) {
      console.error('Error fetching from proxy server:', error);
      thinkingMessage.innerHTML = `<div><b>${currentNpc.name}:</b> Sorry, I'm having trouble thinking right now. ${error.message}</div>`;
    } finally {
        chatInput.focus();
        chatHistory.scrollTop = chatHistory.scrollHeight; // Scroll to the latest message
    }
  }
}
