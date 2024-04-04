import { useEffect, useState } from 'react';

interface Shortcuts {
  'increase-opacity': string;
  'decrease-opacity': string;
  'increase-window-size': string;
  'decrease-window-size': string;
  'set-min-opacity': string;
  'set-max-opacity': string;
  'quit-app': string;
  'toggle-window': string;
  'toggle-controls': string;
  'snipping-tool': string;
  'toggle-frame': string;
}

const useShortcuts = () => {
  const [shortcuts, setShortcuts] = useState<Shortcuts>({
    'increase-opacity': 'Control+Shift+Right',
    'decrease-opacity': 'Control+Shift+Left',
    'increase-window-size': 'Control+Shift+Up',
    'decrease-window-size': 'Control+Shift+Down',
    'set-min-opacity': 'Control+Shift+Z',
    'set-max-opacity': 'Control+Shift+X',
    'quit-app': 'Control+Shift+Q',
    'toggle-window': 'Control+Shift+W',
    'toggle-controls': 'Control+Shift+H',
    'snipping-tool': 'Control+Shift+S',
    'toggle-frame': 'Control+Shift+F',
  });

  useEffect(() => {
    const fetchShortcuts = async () => {
      const loadedShortcuts = await window.ipcRenderer.invoke('get-shortcuts');
      setShortcuts(loadedShortcuts);
    };
    fetchShortcuts();
  }, []);

  useEffect(() => {
    const handleIncreaseOpacity = () => {
      const brightnessSlider = document.getElementById('brightness-slider') as HTMLInputElement;
      if (brightnessSlider) {
        brightnessSlider.value = Math.min(1, parseFloat(brightnessSlider.value) + 0.01).toString();
        window.ipcRenderer.send('set-opacity', parseFloat(brightnessSlider.value));
      }
    };

    const handleDecreaseOpacity = () => {
      const brightnessSlider = document.getElementById('brightness-slider') as HTMLInputElement;
      if (brightnessSlider) {
        brightnessSlider.value = Math.max(0.0001, parseFloat(brightnessSlider.value) - 0.01).toString();
        window.ipcRenderer.send('set-opacity', parseFloat(brightnessSlider.value));
      }
    };

    const handleSetMinOpacity = () => {
      const brightnessSlider = document.getElementById('brightness-slider') as HTMLInputElement;
      if (brightnessSlider) {
        brightnessSlider.value = brightnessSlider.min;
        window.ipcRenderer.send('set-opacity', parseFloat(brightnessSlider.value));
      }
    };

    const handleSetMaxOpacity = () => {
      const brightnessSlider = document.getElementById('brightness-slider') as HTMLInputElement;
      if (brightnessSlider) {
        brightnessSlider.value = brightnessSlider.max;
        window.ipcRenderer.send('set-opacity', parseFloat(brightnessSlider.value));
      }
    };

    const handleToggleControls = () => {
      const controls = document.getElementById('controls');
      if (controls) {
        controls.style.display = controls.style.display === 'none' ? 'flex' : 'none';
      }
    };

    window.ipcRenderer.on('increase-opacity', handleIncreaseOpacity);
    window.ipcRenderer.on('decrease-opacity', handleDecreaseOpacity);
    window.ipcRenderer.on('set-min-opacity', handleSetMinOpacity);
    window.ipcRenderer.on('set-max-opacity', handleSetMaxOpacity);
    window.ipcRenderer.on('toggle-controls', handleToggleControls);

    Object.entries(shortcuts).forEach(([action, shortcut]) => {
      if (
        action !== 'increase-opacity' &&
        action !== 'decrease-opacity' &&
        action !== 'set-min-opacity' &&
        action !== 'set-max-opacity' &&
        action !== 'toggle-controls'
      ) {
        const handleShortcut = () => {
          window.ipcRenderer.send(action);
        };
        window.ipcRenderer.on(action, handleShortcut);
      }
    });

    return () => {
      window.ipcRenderer.removeAllListeners('increase-opacity');
      window.ipcRenderer.removeAllListeners('decrease-opacity');
      window.ipcRenderer.removeAllListeners('set-min-opacity');
      window.ipcRenderer.removeAllListeners('set-max-opacity');
      window.ipcRenderer.removeAllListeners('toggle-controls');

      Object.keys(shortcuts).forEach((action) => {
        if (
          action !== 'increase-opacity' &&
          action !== 'decrease-opacity' &&
          action !== 'set-min-opacity' &&
          action !== 'set-max-opacity' &&
          action !== 'toggle-controls'
        ) {
          window.ipcRenderer.removeAllListeners(action);
        }
      });
    };
  }, [shortcuts]);

  return shortcuts;
};

export default useShortcuts;