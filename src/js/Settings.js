const { ipcRenderer } = require('electron');
const tabItems = document.querySelectorAll('.tab-item');
const tabContents = document.querySelectorAll('.tab-content');
const disableFrameCheckbox = document.getElementById('disable-frame');
const saveButton = document.querySelector('.save-button');
const colorModeSelect = document.getElementById('color-mode');

let initialColorMode = 'dark';
let initialIsFrameDisabled = false; 
let shortcuts = ipcRenderer.sendSync('get-shortcuts');
let tempShortcuts = { ...shortcuts };

// Event listener for color mode selection
colorModeSelect.addEventListener('change', function() {
  const selectedMode = this.options[this.selectedIndex].dataset.mode;
  const isDarkMode = selectedMode === 'dark';
  document.body.classList.toggle('dark-mode', isDarkMode);
  document.body.classList.toggle('light-mode', !isDarkMode);
});

// Event listener for save button click
saveButton.addEventListener('click', function() {
  const activeTab = document.querySelector('.tab-content.active');
  
  if (activeTab.id === 'appearance') {
    const isFrameDisabled = disableFrameCheckbox.checked;
    if (isFrameDisabled !== initialIsFrameDisabled) { 
      ipcRenderer.send('set-frame-disabled', isFrameDisabled); 
    }
    
    const selectedColorMode = colorModeSelect.options[colorModeSelect.selectedIndex].dataset.mode;
    if (selectedColorMode !== initialColorMode) {
      ipcRenderer.send('set-color-mode', selectedColorMode);
    }
    
    ipcRenderer.send('save-settings');
  } else if (activeTab.id === 'shortcuts') {
    const updatedShortcuts = {};
    document.querySelectorAll('.shortcut-table td[id^="shortcut-"]').forEach((td) => {
      const action = td.id.replace('shortcut-', '');
      updatedShortcuts[action] = td.textContent;
    });
    ipcRenderer.send('update-shortcuts', updatedShortcuts);
    shortcuts = { ...updatedShortcuts };
    tempShortcuts = { ...updatedShortcuts };
  }
  
  window.history.back();
});

// Send IPC messages to get initial values
ipcRenderer.send('get-frame-disabled');
ipcRenderer.send('get-color-mode');

// Handle IPC response for frame disabled state
ipcRenderer.on('frame-disabled', (event, isFrameDisabled) => {
  disableFrameCheckbox.checked = isFrameDisabled;
  initialIsFrameDisabled = isFrameDisabled; 
});


// Handle IPC response for color mode
ipcRenderer.on('color-mode', (event, colorMode) => {
  initialColorMode = colorMode;
  colorModeSelect.value = colorMode;
  document.body.classList.toggle('dark-mode', colorMode === 'dark');
});

// Event listeners for tab item clicks
tabItems.forEach(item => {
  item.addEventListener('click', function() {
    const tabId = this.getAttribute('data-tab');
    
    tabItems.forEach(item => item.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    this.classList.add('active');
    document.getElementById(tabId).classList.add('active');
  });
});

// Initialize shortcut elements with current shortcut values
Object.entries(shortcuts).forEach(([action, shortcut]) => {
  const shortcutElement = document.getElementById(`shortcut-${action}`);
  if (shortcutElement) {
    shortcutElement.textContent = shortcut;
  }
});

// Function to open shortcut dialog and handle shortcut editing
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
      } else if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === '+') {
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

// Function to generate a new unique shortcut
function generateNewShortcut() {
  const availableKeys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let newKey;
  do {
    const randomIndex = Math.floor(Math.random() * availableKeys.length);
    newKey = `Control+Shift+${availableKeys[randomIndex]}`;
  } while (Object.values(tempShortcuts).includes(newKey)); 
  return newKey;
}

// Event listeners for edit buttons
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