import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import App from './App.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import axios from 'axios'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Cấu hình axios để gửi cookie tự động
axios.defaults.withCredentials = true;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="904033054134-s2iuvuljed04bv9c67gerdntv1hiaift.apps.googleusercontent.com">
      <App />
      <ToastContainer limit={1} position="top-right" autoClose={2500} newestOnTop closeOnClick theme="colored" />
    </GoogleOAuthProvider>
  </StrictMode>,
)
