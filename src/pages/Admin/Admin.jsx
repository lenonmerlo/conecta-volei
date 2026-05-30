// Página do painel administrativo

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../app/AuthContext";
import { getPendingPlayers } from "../../data/supabaseService";
import { isSuperAdmin } from "../../domain/admins";
import "./Admin.css";
import AdminDraw from "./tabs/AdminDraw";
import AdminGames from "./tabs/AdminGames";
import AdminLevels from "./tabs/AdminLevels";
import AdminPending from "./tabs/AdminPending";
import AdminPlayers from "./tabs/AdminPlayers";
import AdminPresence from "./tabs/AdminPresence";

function Admin() {
  const { user } = useAuth();
  const userIsSuperAdmin = isSuperAdmin(user);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    const pendingPlayers = await getPendingPlayers();
    setPendingCount(pendingPlayers.length);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshPendingCount();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [refreshPendingCount]);

  const TABS = [
    { key: "pending", label: `Pendentes (${pendingCount})` },
    { key: "players", label: "Jogadores" },
    { key: "games", label: "Jogos" },
    { key: "presence", label: "Presenças" },
    ...(userIsSuperAdmin ? [{ key: "levels", label: "Níveis" }] : []),
    { key: "draw", label: "Sorteio" },
  ];

  const [activeTab, setActiveTab] = useState("pending");

  return (
    <div className="admin">
      <div className="admin__header">
        <h2 className="admin__title">Painel Admin</h2>
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
          <AdminPending onUpdatePendingCount={refreshPendingCount} />
        )}
        {activeTab === "players" && <AdminPlayers />}
        {activeTab === "games" && <AdminGames />}
        {activeTab === "presence" && <AdminPresence />}
        {activeTab === "levels" && userIsSuperAdmin && <AdminLevels />}
        {activeTab === "draw" && <AdminDraw />}
      </div>
    </div>
  );
}

export default Admin;
