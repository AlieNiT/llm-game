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
  this.load.image('player', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');

  this.load.image('npc1', 'https://labs.phaser.io/assets/sprites/mushroom2.png');
  this.load.image('npc2', 'https://labs.phaser.io/assets/sprites/slime.png');
  this.load.image('npc3', 'https://labs.phaser.io/assets/sprites/blue_gem.png');
}

function create() {
  player = this.physics.add.sprite(100, 100, 'player');


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
    if (cursors.left.isDown) player.setVelocityX(-160);
    else if (cursors.right.isDown) player.setVelocityX(160);
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
  chatHistory.innerHTML = `<div><b>${npc.name}:</b> ${npc.message}</div>`;
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


    chatHistory.innerHTML += `<div><b>You:</b> ${input}</div>`;
    chatInput.value = '';
    chatHistory.scrollTop = chatHistory.scrollHeight;


    const thinkingMessage = document.createElement('div');
    thinkingMessage.innerHTML = `<b>${currentNpc.name}:</b> ...`;
    chatHistory.appendChild(thinkingMessage);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {

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
      console.log('Server response:', data);
      

      const reply = data.reply;
      
      if (!reply) {
        console.error('No reply in response:', data);
        throw new Error('No reply received from server');
      }


      if (!npcHistories[currentNpc.name]) npcHistories[currentNpc.name] = [];
      npcHistories[currentNpc.name].push({ sender: 'user', text: input });
      npcHistories[currentNpc.name].push({ sender: 'model', text: reply });


      thinkingMessage.innerHTML = `<div><b>${currentNpc.name}:</b> ${reply}</div>`;

    } catch (error) {
      console.error('Error fetching from proxy server:', error);
      thinkingMessage.innerHTML = `<div><b>${currentNpc.name}:</b> Sorry, I'm having trouble thinking right now.</div>`;
    } finally {
        chatInput.focus();
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }
}
