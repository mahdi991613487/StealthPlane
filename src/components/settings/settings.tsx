import React, { useState, useEffect } from 'react';
import './settings.css';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('shortcuts');
  const [shortcuts, setShortcuts] = useState<Record<string, string>>({});
  const [disableFrame, setDisableFrame] = useState(false);
  const [colorMode, setColorMode] = useState('dark');
  const [initialDisableFrame, setInitialDisableFrame] = useState(false);
  const [initialColorMode, setInitialColorMode] = useState('dark');
  const [initialShortcuts, setInitialShortcuts] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadShortcuts = async () => {
      const loadedShortcuts = await window.ipcRenderer.invoke('get-shortcuts');
      setShortcuts(loadedShortcuts);
      setInitialShortcuts(loadedShortcuts);
    };

    const loadSettings = async () => {
      const frameDisabled = await window.ipcRenderer.invoke('get-frame-disabled');
      const currentColorMode = await window.ipcRenderer.invoke('get-color-mode');
      setDisableFrame(frameDisabled);
      setInitialDisableFrame(frameDisabled);
      setColorMode(currentColorMode);
      setInitialColorMode(currentColorMode);
    };

    loadShortcuts();
    loadSettings();
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleDisableFrameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDisableFrame(event.target.checked);
  };

  const handleColorModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setColorMode(event.target.value);
  };

  const handleSaveSettings = () => {
    if (disableFrame !== initialDisableFrame) {
      window.ipcRenderer.send('set-frame-disabled', disableFrame);
    }
    if (colorMode !== initialColorMode) {
      window.ipcRenderer.send('set-color-mode', colorMode);
    }
    if (JSON.stringify(shortcuts) !== JSON.stringify(initialShortcuts)) {
      window.ipcRenderer.send('update-shortcuts', shortcuts);
    }
    window.history.back();
  };

  const generateNewShortcut = (): string => {
    const availableKeys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newKey;
    do {
      const randomIndex = Math.floor(Math.random() * availableKeys.length);
      newKey = `Control+Shift+${availableKeys[randomIndex]}`;
    } while (Object.values(shortcuts).includes(newKey));
    return newKey;
  };

  const handleShortcutEdit = async (action: string) => {
    const modal = document.getElementById('shortcut-modal');
    if (modal) {
      modal.style.display = 'block';
      const handleKeyDown = (event: KeyboardEvent) => {
        event.preventDefault();
        let newShortcut: string;
        if (event.key === 'Escape') {
          modal.style.display = 'none';
          return;
        } else if (['Control', 'Shift', 'Alt', '+'].includes(event.key)) {
          modal.style.display = 'none';
          return;
        } else {
          switch (event.key) {
            case 'ArrowUp': newShortcut = 'Up'; break;
            case 'ArrowDown': newShortcut = 'Down'; break;
            case 'ArrowLeft': newShortcut = 'Left'; break;
            case 'ArrowRight': newShortcut = 'Right'; break;
            default: newShortcut = event.key.toUpperCase(); break;
          }
          newShortcut = `Control+Shift+${newShortcut}`;
        }

        const existingAction = Object.entries(shortcuts).find(([_, shortcut]) => shortcut === newShortcut)?.[0];
        if (existingAction && existingAction !== action) {
          const generatedShortcut = generateNewShortcut();
          setShortcuts(prevShortcuts => ({
            ...prevShortcuts,
            [existingAction]: generatedShortcut,
          }));
        }

        setShortcuts(prevShortcuts => ({
          ...prevShortcuts,
          [action]: newShortcut,
        }));
        modal.style.display = 'none';
      };
      window.addEventListener('keydown', handleKeyDown, { once: true });
    }
  };

  return (
    <div className={`settings-container ${colorMode === 'dark' ? 'dark-mode' : 'light-mode'}`}>
      <div className="modal" id="shortcut-modal">
        <div className="modal-content">
          <p>Please press any key to edit the shortcut or press escape to cancel</p>
        </div>
      </div>
      <div className="sidebar">
        <ul className="tab-list">
          <li className={`tab-item ${activeTab === 'shortcuts' ? 'active' : ''}`} onClick={() => handleTabChange('shortcuts')}>
            Shortcuts
          </li>
          <li className={`tab-item ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => handleTabChange('appearance')}>
            Appearance
          </li>
        </ul>
      </div>
      <div className="content">
        {activeTab === 'shortcuts' && (
          <div id="shortcuts" className={`tab-content ${activeTab === 'shortcuts' ? 'active' : ''}`}>
            <h2>Customize Shortcuts</h2>
            <table className="shortcut-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Shortcut</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(shortcuts).map(([action, shortcut]) => (
                  <tr key={action}>
                    <td>{action}</td>
                    <td>{shortcut}</td>
                    <td><span className="edit-btn" onClick={() => handleShortcutEdit(action)}>Edit</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'appearance' && (
          <div id="appearance" className={`tab-content ${activeTab === 'appearance' ? 'active' : ''}`}>
            <h2>Appearance Settings</h2>
            <div className="appearance-settings">
              <div className="setting">
                <label htmlFor="disable-frame">Disable Frame</label>
                <input type="checkbox" id="disable-frame" checked={disableFrame} onChange={handleDisableFrameChange} />
              </div>
              <div className="setting">
                <label htmlFor="color-mode">Color Mode</label>
                <select id="color-mode" value={colorMode} onChange={handleColorModeChange}>
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="button-bar">
        <button className="button save-button" onClick={handleSaveSettings}>
          Save
        </button>
        <button className="button back-button" onClick={() => window.history.back()}>
          Go Back
        </button>
      </div>
    </div>
  );
};

export default Settings;
