import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Login from './login.tsx'
import Registro from './registro.tsx';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Login />
    <Registro />
  </StrictMode>,
)
