import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { precargarPagina } from './paginasPublicas';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

const raiz = document.getElementById('root')!;
const arrancar = () => createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Si la página llegó ya dibujada (páginas públicas), se espera a tener su
// código para que React la reemplace sin mostrar la pantalla de carga.
if (raiz.hasChildNodes()) precargarPagina(location.pathname).then(arrancar);
else arrancar();
