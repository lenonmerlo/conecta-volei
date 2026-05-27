// Página do painel administrativo

import { useState } from "react";
import { useAuth } from "../../app/AuthContext";
import { isSuperAdmin } from "../../domain/admins";
import "./Admin.css";
import AdminDraw from "./tabs/AdminDraw";
import AdminLevels from "./tabs/AdminLevels";
import AdminPlayers from "./tabs/AdminPlayers";
import AdminPresence from "./tabs/AdminPresence";

function Admin() {
  const { user } = useAuth();
  const userIsSuperAdmin = isSuperAdmin(user);

  const TABS = [
    { key: "players", label: "Jogadores" },
    { key: "presence", label: "Presenças" },
    ...(userIsSuperAdmin ? [{ key: "levels", label: "Níveis" }] : []),
    { key: "draw", label: "Sorteio" },
  ];

  const [activeTab, setActiveTab] = useState("players");

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
        {activeTab === "players" && <AdminPlayers />}
        {activeTab === "presence" && <AdminPresence />}
        {activeTab === "levels" && userIsSuperAdmin && <AdminLevels />}
        {activeTab === "draw" && <AdminDraw />}
      </div>
    </div>
  );
}

export default Admin;
