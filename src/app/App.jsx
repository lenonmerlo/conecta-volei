import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import BottomNav from "../components/BottomNav/BottomNav";
import Home from "../pages/Home/Home";
import Rules from "../pages/Rules/Rules";
import Profile from "../pages/Profile/Profile";
import Admin from "../pages/Admin/Admin";
import GameDetail from "../pages/GameDetail/GameDetail";
import Teams from "../pages/Teams/Teams";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app__header">
          <h1 className="app__logo">Conecta Vôlei</h1>
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
