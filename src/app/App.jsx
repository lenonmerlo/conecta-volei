import { RefreshCw } from "lucide-react";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import escudoConecta from "../assets/conecta-logo.png";
import BottomNav from "../components/BottomNav/BottomNav";
import { isAdmin } from "../domain/admins";
import "./App.css";
import { AuthProvider, useAuth } from "./AuthContext";

const Admin = lazy(() => import("../pages/Admin/Admin"));
const AthleteProfile = lazy(
  () => import("../pages/AthleteProfile/AthleteProfile"),
);
const Athletes = lazy(() => import("../pages/Athletes/Athletes"));
const Awards = lazy(() => import("../pages/Awards/Awards"));
const GameDetail = lazy(() => import("../pages/GameDetail/GameDetail"));
const Home = lazy(() => import("../pages/Home/Home"));
const IconLab = lazy(() => import("../pages/IconLab/IconLab"));
const Login = lazy(() => import("../pages/Login/Login"));
const Profile = lazy(() => import("../pages/Profile/Profile"));
const Rules = lazy(() => import("../pages/Rules/Rules"));
const Teams = lazy(() => import("../pages/Teams/Teams"));
const Voting = lazy(() => import("../pages/Voting/Voting"));

function RoutesFallback() {
  return <div className="app__loading">Carregando pagina...</div>;
}

function AppShell() {
  const {
    user,
    checkingSession,
    sessionError,
    needsRulesAcceptance,
    retrySessionCheck,
    logout,
  } = useAuth();

  if (checkingSession) {
    return <RoutesFallback />;
  }

  if (sessionError) {
    return (
      <div className="app">
        <main className="app__main">
          <p className="app__loading">
            Não foi possível conferir sua sessão. Verifique a conexão.
          </p>
          <button type="button" onClick={retrySessionCheck}>
            Tentar novamente
          </button>
          <button type="button" onClick={logout}>
            Sair
          </button>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-public">
        <Suspense fallback={<RoutesFallback />}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/athletes" element={<Athletes />} />
            <Route path="/athlete/:id" element={<AthleteProfile />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  if (needsRulesAcceptance) {
    return (
      <div className="app">
        <main className="app__main">
          <Suspense fallback={<RoutesFallback />}>
            <Routes>
              <Route path="/rules" element={<Rules />} />
              <Route path="*" element={<Navigate to="/rules" replace />} />
            </Routes>
          </Suspense>
        </main>
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
        <Suspense fallback={<RoutesFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/athletes" element={<Athletes />} />
            <Route path="/athlete/:id" element={<AthleteProfile />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/game/:id" element={<GameDetail />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/voting/:gameId" element={<Voting />} />
            <Route path="/awards" element={<Awards />} />
            <Route path="/icon-lab" element={<IconLab />} />
            <Route
              path="/admin"
              element={isAdmin(user) ? <Admin /> : <Navigate to="/" replace />}
            />
          </Routes>
        </Suspense>
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