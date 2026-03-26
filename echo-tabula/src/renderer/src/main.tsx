import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { Sandbox } from './Sandbox';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App /> {/* Comentamos o App para focar na bancada de testes */}
    {/*<Sandbox />*/} {/* Renderize a bancada em vez do App */}
  </StrictMode>
)
