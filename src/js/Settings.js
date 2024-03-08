const { ipcRenderer } = require('electron');
let shortcuts = ipcRenderer.sendSync('get-shortcuts');
let tempShortcuts = { ...shortcuts };

Object.entries(shortcuts).forEach(([action, shortcut]) => {
  const shortcutElement = document.getElementById(`shortcut-${action}`);
  if (shortcutElement) {
    shortcutElement.textContent = shortcut;
  }
});

async function openShortcutDialog(action) {
  return new Promise((resolve) => {
    const modal = document.getElementById('shortcut-modal');
    const modalMessage = document.querySelector('#shortcut-modal p');
    modalMessage.textContent = 'Please press any key to edit the shortcut or press escape to cancel';
    modal.style.display = 'block';

    const handleKeyDown = (event) => {
      event.preventDefault();
      const key = event.key;
      if (key === 'Escape') {
        resolve(null);
        modal.style.display = 'none';
      } else if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === '+' ) {
        resolve(null);
        modal.style.display = 'none';
      } else if (key) {
        let newShortcut = key.toUpperCase();
        
        switch (key) {
          case 'ArrowUp':
            newShortcut = 'Up';
            break;
          case 'ArrowDown':
            newShortcut = 'Down';
            break;
          case 'ArrowLeft':
            newShortcut = 'Left';
            break;
          case 'ArrowRight':
            newShortcut = 'Right';
            break;
        }

        const newShortcutString = `Control+Shift+${newShortcut}`;
        
        const existingAction = Object.entries(tempShortcuts).find(([_, shortcut]) => shortcut === newShortcutString)?.[0];
        if (existingAction && existingAction !== action) {
          const newKey = generateNewShortcut();
          tempShortcuts[existingAction] = newKey; 
          document.getElementById(`shortcut-${existingAction}`).textContent = newKey;
        }
        
        resolve(newShortcutString);
        modal.style.display = 'none';
      }
    };

    window.addEventListener('keydown', handleKeyDown, { once: true });
  });
}

function generateNewShortcut() {
  const availableKeys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let newKey;
  do {
    const randomIndex = Math.floor(Math.random() * availableKeys.length);
    newKey = `Control+Shift+${availableKeys[randomIndex]}`;
  } while (Object.values(tempShortcuts).includes(newKey)); 
  return newKey;
}

document.querySelectorAll('.edit-btn').forEach(button => {
  button.addEventListener('click', async function() {
    const action = this.dataset.action;
    const newShortcut = await openShortcutDialog(action);
    if (newShortcut) {
      document.getElementById(`shortcut-${action}`).textContent = newShortcut;
      tempShortcuts[action] = newShortcut; 
    }
  });
});

document.querySelector('.save-button').addEventListener('click', function() {
  const updatedShortcuts = {};
  document.querySelectorAll('.shortcut-table td[id^="shortcut-"]').forEach((td) => {
    const action = td.id.replace('shortcut-', '');
    updatedShortcuts[action] = td.textContent;
  });
  ipcRenderer.send('update-shortcuts', updatedShortcuts);
  shortcuts = { ...updatedShortcuts };
  tempShortcuts = { ...updatedShortcuts };
  window.history.back();
});
