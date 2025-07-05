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
let currentNpc = null;
let lastDirection = 'right';


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
let npcHistories = {};


function preload() {
  // this.load.image('player', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
  this.load.spritesheet('player', 'assets/Adam.png', {
    frameWidth: 32,
    frameHeight: 32
  });

  this.load.image('npc1', 'https://labs.phaser.io/assets/sprites/mushroom2.png');
  this.load.image('npc2', 'https://labs.phaser.io/assets/sprites/slime.png');
  this.load.image('npc3', 'https://labs.phaser.io/assets/sprites/mashroom3.png');
}

function create() {
  player = this.physics.add.sprite(100, 100, 'player');
  
  this.anims.create({
    key: 'walkRight',
    frames: this.anims.generateFrameNumbers('player', { start: 0, end: 8 }),
    frameRate: 10,
    repeat: -1
  });

  this.anims.create({
    key: 'walkLeft',
    frames: this.anims.generateFrameNumbers('player', { start: 9, end: 17 }),
    frameRate: 10,
    repeat: -1
  });


  npcGroup = this.physics.add.staticGroup();


  npcData.forEach(data => {
    const npc = npcGroup.create(data.x, data.y, data.sprite);

    npc.name = data.name;
    npc.message = data.message;
  });

  this.physics.add.collider(player, npcGroup);

  cursors = this.input.keyboard.createCursorKeys();
  interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);


  chatPanel = document.getElementById('chatPanel');
  chatInput = document.getElementById('chatInput');
  chatHistory = document.getElementById('chatHistory');
  closeBtn = document.getElementById('closeBtn');
  npcName = document.getElementById('npcName');

  chatInput.addEventListener('keydown', onChatSubmit);
  closeBtn.addEventListener('click', closeChat);


  chatInput.addEventListener('focus', () => {

    game.input.keyboard.enabled = false;
  });

  chatInput.addEventListener('blur', () => {

    game.input.keyboard.enabled = true;
  });
}

function update() {

  if (!talking) {
    player.setVelocity(0);

    if (cursors.left.isDown) {
      player.setVelocityX(-160);
      player.anims.play('walkLeft', true);
      lastDirection = 'left';
    } else if (cursors.right.isDown) {
      player.setVelocityX(160);
      player.anims.play('walkRight', true);
      lastDirection = 'right';
    } else {
      player.anims.stop();
      if (lastDirection === 'right') player.setFrame(0);
      else if (lastDirection === 'left') player.setFrame(9);
    }

    if (cursors.up.isDown) player.setVelocityY(-160);
    else if (cursors.down.isDown) player.setVelocityY(160);
  }


  if (game.input.keyboard.enabled && Phaser.Input.Keyboard.JustDown(interactKey)) {
    if (!talking) {

      for (const npc of npcGroup.getChildren()) {
        if (Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) < 60) {
          openChat(npc);
          break;
        }
      }
    }
  }
}

function openChat(npc) {
  talking = true;
  currentNpc = npc;
  
  player.setVelocity(0);
  
  npcName.textContent = npc.name;
  chatPanel.style.display = 'flex';
  chatHistory.innerHTML = '';
  addChatMessage(npc.name, npc.message, false);
  chatInput.value = '';
  chatInput.focus();
}

function closeChat() {
  chatPanel.style.display = 'none';
  talking = false;
  currentNpc = null;

  game.input.keyboard.enabled = true;
}

async function onChatSubmit(e) {
  if (e.key === 'Enter') {
    const input = chatInput.value.trim();
    if (input === '' || !currentNpc) return;

    addChatMessage('You', input, false);
    chatInput.value = '';

    const replyContainer = document.createElement('div');
    replyContainer.className = 'chat-message';
    replyContainer.innerHTML = `<b>${currentNpc.name}:</b> `;
    chatHistory.appendChild(replyContainer);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    if (!npcHistories[currentNpc.name]) npcHistories[currentNpc.name] = [];
    npcHistories[currentNpc.name].push({ sender: 'user', text: input });

    try {
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          npc: currentNpc.name,
          history: npcHistories[currentNpc.name]
        })
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        console.error('Server error:', response.status, errorText);
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';
      let lastRenderedLength = 0;

      // Create a content span for the streaming text
      const contentSpan = document.createElement('span');
      replyContainer.appendChild(contentSpan);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        reply += chunk;
        
        // Try to render markdown incrementally
        try {
          const renderedMarkdown = renderMarkdown(reply);
          contentSpan.innerHTML = renderedMarkdown;
        } catch (error) {
          // If markdown parsing fails (incomplete markdown), show raw text
          contentSpan.textContent = reply;
        }
        
        chatHistory.scrollTop = chatHistory.scrollHeight;
      }

      // Final render to ensure everything is properly formatted
      try {
        const finalRendered = renderMarkdown(reply);
        contentSpan.innerHTML = finalRendered;
      } catch (error) {
        contentSpan.textContent = reply;
      }

      npcHistories[currentNpc.name].push({ sender: 'model', text: reply });

    } catch (error) {
      console.error('Error fetching from proxy server:', error);
      replyContainer.innerHTML = `<b>${currentNpc.name}:</b> Sorry, I'm having trouble thinking right now.`;
    } finally {
      chatInput.focus();
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }
}

function renderMarkdown(text) {
  try {
    return marked.parse(text);
  } catch (error) {
    console.error('Markdown parsing error:', error);
    return text; // Fallback to plain text
  }
}

// Utility function to add chat message with markdown support
function addChatMessage(sender, message, isMarkdown = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';
  
  if (isMarkdown) {
    messageDiv.innerHTML = `<b>${sender}:</b> ${renderMarkdown(message)}`;
  } else {
    messageDiv.innerHTML = `<b>${sender}:</b> ${message}`;
  }
  
  chatHistory.appendChild(messageDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return messageDiv;
}
