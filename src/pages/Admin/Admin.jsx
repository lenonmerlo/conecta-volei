// Página do painel administrativo

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../app/AuthContext";
import Button from "../../components/Button/Button";
import { getAllPlayers } from "../../data/supabaseService";
import { isSuperAdmin } from "../../domain/admins";
import "./Admin.css";
import AdminAnnouncements from "./tabs/AdminAnnouncements";
import AdminDraw from "./tabs/AdminDraw";
import AdminGames from "./tabs/AdminGames";
import AdminLevels from "./tabs/AdminLevels";
import AdminPending from "./tabs/AdminPending";
import AdminPlayers from "./tabs/AdminPlayers";
import AdminPresence from "./tabs/AdminPresence";

function Admin() {
  const { user } = useAuth();
  const userIsSuperAdmin = isSuperAdmin(user);
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  const refreshPlayers = useCallback(async () => {
    setLoadingPlayers(true);
    const allPlayers = await getAllPlayers();
    setPlayers(allPlayers || []);
    setLoadingPlayers(false);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshPlayers();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [refreshPlayers]);

  const pendingCount = players.filter(
    (player) => player.status === "pending",
  ).length;

  const TABS = [
    { key: "pending", label: `Pendentes (${pendingCount})` },
    { key: "players", label: "Jogadores" },
    { key: "games", label: "Jogos" },
    { key: "announcements", label: "Avisos" },
    { key: "presence", label: "Presenças" },
    ...(userIsSuperAdmin ? [{ key: "levels", label: "Níveis" }] : []),
    { key: "draw", label: "Sorteio" },
  ];

  const [activeTab, setActiveTab] = useState("pending");

  return (
    <div className="admin">
      <div className="admin__header">
        <h2 className="admin__title">Painel Admin</h2>
        <Button
          size="sm"
          variant="secondary"
          className="admin__refresh"
          onClick={refreshPlayers}
          disabled={loadingPlayers}
        >
          {loadingPlayers ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      <div className="admin__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`admin__tab ${activeTab === tab.key ? "admin__tab--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin__content">
        {activeTab === "pending" && (
          <AdminPending
            players={players}
            loadingPlayers={loadingPlayers}
            onRefreshPlayers={refreshPlayers}
          />
        )}
        {activeTab === "players" && (
          <AdminPlayers
            players={players}
            loadingPlayers={loadingPlayers}
            onRefreshPlayers={refreshPlayers}
          />
        )}
        {activeTab === "games" && <AdminGames />}
        {activeTab === "announcements" && <AdminAnnouncements />}
        {activeTab === "presence" && <AdminPresence />}
        {activeTab === "levels" && userIsSuperAdmin && (
          <AdminLevels
            players={players}
            loadingPlayers={loadingPlayers}
            onRefreshPlayers={refreshPlayers}
          />
        )}
        {activeTab === "draw" && <AdminDraw />}
      </div>
    </div>
  );
}

export default Admin;
