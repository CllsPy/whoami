import { StrictMode, type JSX } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { CaracolGame } from './CaracolGame';
import { LobbyApp } from './LobbyApp';
import './styles.css';

type ClientService = 'all' | 'lobby' | 'whoami' | 'impostor' | 'caracol';

function readClientService(): ClientService {
  const value = import.meta.env.VITE_GAME_SERVICE;
  return value === 'lobby' || value === 'whoami' || value === 'impostor' || value === 'caracol' || value === 'all'
    ? value
    : 'all';
}

function DedicatedEntry(): JSX.Element {
  const service = readClientService();
  if (service === 'lobby') return <LobbyApp />;
  if (service === 'caracol') {
    return <CaracolGame onExit={() => { window.location.href = import.meta.env.VITE_LOBBY_URL || '/'; }} />;
  }
  if (service === 'whoami') return <App allowedGame="whoami" />;
  if (service === 'impostor') return <App allowedGame="draw-impostor" />;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DedicatedEntry />
  </StrictMode>,
);
