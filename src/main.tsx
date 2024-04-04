import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import App from './App';
import MainPage from './components/mainpage/mainPage';
import SnippingTool from './components/snip/snippingTool';
import Settings from './components/settings/settings';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <Router>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/main" element={<MainPage />} />
          <Route path="/snipping-tool" element={<SnippingTool />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Router>
  </React.StrictMode>
);

window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message);
});