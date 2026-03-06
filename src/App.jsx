import React from 'react';
import { Routes, Route, HashRouter } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/room/:roomId" element={<Room />} />
            <Route path="/office/:officeId/join" element={<Room isPublicJoin />} />
            <Route path="/office/:officeId/admin" element={<Room isAdmin />} />
          </Routes>
        </div>
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
