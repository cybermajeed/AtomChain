import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Reset scan and repo state on full page refresh
localStorage.removeItem('cached_repo_url');
localStorage.removeItem('cached_local_path');
localStorage.removeItem('cached_scan_result');
localStorage.removeItem('last_scan_id');


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
