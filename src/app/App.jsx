import { RefreshCw } from "lucide-react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import escudoConecta from "../assets/escudo-conecta-prata.png";
import BottomNav from "../components/BottomNav/BottomNav";
import { isAdmin } from "../domain/admins";
import Admin from "../pages/Admin/Admin";
import Athletes from "../pages/Athletes/Athletes";
import GameDetail from "../pages/GameDetail/GameDetail";
import Home from "../pages/Home/Home";
import Login from "../pages/Login/Login";
import Profile from "../pages/Profile/Profile";
import Rules from "../pages/Rules/Rules";
import Teams from "../pages/Teams/Teams";
import "./App.css";
import { AuthProvider, useAuth } from "./AuthContext";

function AppShell() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="app-public">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/athletes" element={<Athletes />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <img
            className="app__brand-image"
            src={escudoConecta}
            alt="Escudo Conecta Vôlei"
          />
          <div className="app__brand-text">
            <h1 className="app__logo">Conecta Vôlei</h1>
            <p className="app__subtitle">
              Agenda, presença e equilíbrio de times em clima de quadra.
            </p>
          </div>
          <button
            className="app__refresh-btn"
            type="button"
            onClick={() => window.location.reload()}
            title="Atualizar página"
            aria-label="Atualizar página"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>
      <main className="app__main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/athletes" element={<Athletes />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/game/:id" element={<GameDetail />} />
          <Route path="/teams" element={<Teams />} />
          <Route
            path="/admin"
            element={isAdmin(user) ? <Admin /> : <Navigate to="/" replace />}
          />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
