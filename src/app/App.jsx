import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useEffect,
  useNavigate,
} from "react-router-dom";
import escudoConecta from "../assets/escudo-conecta-prata.png";
import BottomNav from "../components/BottomNav/BottomNav";
import Button from "../components/Button/Button";
import Admin from "../pages/Admin/Admin";
import GameDetail from "../pages/GameDetail/GameDetail";
import Home from "../pages/Home/Home";
import Login from "../pages/Login/Login";
import Profile from "../pages/Profile/Profile";
import Rules from "../pages/Rules/Rules";
import Teams from "../pages/Teams/Teams";
import "./App.css";
import { AuthProvider, useAuth } from "./AuthContext";

function PublicRulesPage() {
  const navigate = useNavigate();

  useEffect(() => {
    sessionStorage.setItem("cv_rules_opened", "true");
  }, []);

  return (
    <div className="app-public-rules">
      <Rules />
      <div className="app-public-rules__actions">
        <Button variant="secondary" onClick={() => navigate("/")}>
          Li as regras e quero voltar
        </Button>
      </div>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      {user ? (
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      ) : (
        <div className="app-public">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/rules" element={<PublicRulesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      )}
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
