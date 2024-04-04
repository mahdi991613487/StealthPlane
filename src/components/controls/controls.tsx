import React, { useState, useEffect, useRef } from 'react';
import './controls.css';
import backButtonImage from '../../assets/favicon.png';
import forwardButtonImage from '../../assets/right.png';
import snipButtonImage from '../../assets/scissors.png';
import settingsButtonImage from '../../assets/settings.png';

interface ControlsProps {
  onNavigate: (url: string) => void;
  url: string;
  onBackButtonClick: () => void;
  onForwardButtonClick: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  onNavigate,
  url,
  onBackButtonClick,
  onForwardButtonClick,
  canGoBack,
  canGoForward,
}) => {
  const [inputUrl, setInputUrl] = useState(url);
  const [displayUrl, setDisplayUrl] = useState(url);
  const [isFocused, setIsFocused] = useState(false);
  const urlBarRef = useRef<HTMLInputElement>(null);
  const isFirstFocus = useRef(true);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputUrl(e.target.value);
    setDisplayUrl(e.target.value);
  };

  const handleUrlSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onNavigate(inputUrl);
    }
  };

  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = parseFloat(e.target.value);
    window.ipcRenderer.send('set-opacity', opacity);
  };

  const handleSettingsButtonClick = () => {
    window.location.href = '#/settings';
  };

  const handleSnipButtonClick = () => {
    window.ipcRenderer.send('start-snipping');
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (isFirstFocus.current) {
      urlBarRef.current?.select();
      isFirstFocus.current = false;
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  useEffect(() => {
    const cleanedUrl = url.replace(/\/$/, '');
    setInputUrl(cleanedUrl);
    setDisplayUrl(cleanedUrl.replace(/^https?:\/\/www\./, ''));
  }, [url]);

  useEffect(() => {
    const handleToggleControls = () => {
      window.ipcRenderer.send('toggle-controls');
    };

    window.ipcRenderer.on('toggle-controls', handleToggleControls);

    return () => {
      window.ipcRenderer.removeAllListeners('toggle-controls');
    };
  }, []);

  return (
    <div id="controls">
      <img
        id="back-button"
        src={backButtonImage}
        alt="Go Back"
        title="Go Back"
        onClick={onBackButtonClick}
        className={!canGoBack ? 'disabled-icon' : ''}
      />
      <img
        id="forward-button"
        src={forwardButtonImage}
        alt="Go Forward"
        title="Go Forward"
        onClick={onForwardButtonClick}
        className={!canGoForward ? 'disabled-icon' : ''}
      />
      <form id="url-bar-container" onSubmit={handleUrlSubmit}>
        <input
          type="text"
          id="url-bar"
          placeholder="Enter URL..."
          value={isFocused ? inputUrl : displayUrl}
          onChange={handleUrlChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          ref={urlBarRef}
        />
      </form>
      <input
        type="range"
        min="0.0001"
        max="1"
        step="0.0001"
        defaultValue="1"
        id="brightness-slider"
        title="Adjust Brightness"
        onChange={handleBrightnessChange}
      />
      <img
        id="snip-button"
        src={snipButtonImage}
        alt="Snip"
        title="Snip"
        onClick={handleSnipButtonClick}
      />
      <img
        id="settings-button"
        src={settingsButtonImage}
        alt="Settings"
        title="Settings"
        onClick={handleSettingsButtonClick}
      />
    </div>
  );
};

export default Controls;