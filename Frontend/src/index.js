import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import './assets/css/all.min.css';
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./styles/style.css";
import "./styles/login.css";
import "./styles/myfile.css";
import "./styles/UploadFilePage.css";


// ✅ No need to import Sidebar or pages here — they are imported inside App.js
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);