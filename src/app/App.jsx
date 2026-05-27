import { BrowserRouter, Route, Routes } from "react-router-dom";
import escudoConecta from "../assets/escudo-conecta-prata.png";
import BottomNav from "../components/BottomNav/BottomNav";
import Admin from "../pages/Admin/Admin";
import GameDetail from "../pages/GameDetail/GameDetail";
import Home from "../pages/Home/Home";
import Profile from "../pages/Profile/Profile";
import Rules from "../pages/Rules/Rules";
import Teams from "../pages/Teams/Teams";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
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
          </div>
        </header>
        <main className="app__main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/game/:id" element={<GameDetail />} />
            <Route path="/teams" element={<Teams />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
