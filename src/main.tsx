import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { startRouter } from './app/router';
import '@fontsource-variable/manrope';
import '@fontsource-variable/unbounded';
import './styles/tokens.css';
import './styles/global.css';

// URL’dagi ekranni birinchi renderdan oldin tiklaymiz (yangilanganda bosh menyu «lip» etib ko‘rinmasin)
startRouter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
