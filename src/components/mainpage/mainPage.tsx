import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Controls from '../controls/controls.tsx';
import './mainPage.css';
import { WebviewTag } from 'electron';
import useShortcuts from '../shortcuts/shortcuts.tsx';

function isValidURL(str: string): boolean {
  const pattern = new RegExp('^(https?:\\/\\/)?' +
   '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
   '((\\d{1,3}\\.){3}\\d{1,3}))' +
   '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
   '(\\?[;&a-z\\d%_.~+=-]*)?' +
   '(\\#[-a-z\\d_]*)?$', 'i');
  
  return !!pattern.test(str);
}
const MainPage: React.FC = () => {
  const webviewRef = useRef<WebviewTag>(null);
  const [url, setUrl] = useState('');
  const [displayUrl, setDisplayUrl] = useState(''); 
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const location = useLocation();
  const shortcuts = useShortcuts();

  useEffect(() => {
    const urlOrQuery = location.state?.urlOrQuery;
    if (typeof urlOrQuery === 'string') {
      handleNavigate(urlOrQuery);
    }
  }, [location.state]);

  const handleNavigate = (input: string) => {
    let navigateUrl: string;
    if (isValidURL(input)) {
      navigateUrl = input.startsWith('http://') || input.startsWith('https://') ? input : `http://${input}`;
    } else {
      navigateUrl = `https://www.google.com/search?q=${encodeURIComponent(input)}`;
    }
    setUrl(navigateUrl);
    setDisplayUrl(navigateUrl);
  };

  useEffect(() => {
    const updateNavigationState = () => {
      if (webviewRef.current) {
        setCanGoBack(webviewRef.current.canGoBack());
        setCanGoForward(webviewRef.current.canGoForward());
        setDisplayUrl(webviewRef.current.getURL());
      }
    };

    webviewRef.current?.addEventListener('did-navigate', updateNavigationState);
    webviewRef.current?.addEventListener('did-navigate-in-page', updateNavigationState);

    return () => {
      webviewRef.current?.removeEventListener('did-navigate', updateNavigationState);
      webviewRef.current?.removeEventListener('did-navigate-in-page', updateNavigationState);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Controls
        onNavigate={handleNavigate}
        url={displayUrl} 
        onBackButtonClick={() => webviewRef.current?.goBack()}
        onForwardButtonClick={() => webviewRef.current?.goForward()}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
      />
      <webview
        ref={webviewRef}
        src={url}
        style={{ flex: 1 }}
      ></webview>
    </div>
  );
};

export default MainPage;
