// Página do painel administrativo

import { useState } from 'react'
import './Admin.css'
import AdminPlayers from './tabs/AdminPlayers'
import AdminPresence from './tabs/AdminPresence'
import AdminLevels from './tabs/AdminLevels'

const TABS = [
  { key: 'players', label: 'Jogadores' },
  { key: 'presence', label: 'Presenças' },
  { key: 'levels', label: 'Níveis' },
]

function Admin() {
  const [activeTab, setActiveTab] = useState('players')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  return (
    <div className="admin">
      <div className="admin__header">
        <h2 className="admin__title">Painel Admin</h2>
        <div className="admin__super-toggle">
          <label htmlFor="superAdmin">Super Admin</label>
          <input
            type="checkbox"
            id="superAdmin"
            checked={isSuperAdmin}
            onChange={(e) => setIsSuperAdmin(e.target.checked)}
          />
        </div>
      </div>

      <div className="admin__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`admin__tab ${activeTab === tab.key ? 'admin__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin__content">
        {activeTab === 'players' && <AdminPlayers />}
        {activeTab === 'presence' && <AdminPresence />}
        {activeTab === 'levels' && <AdminLevels isSuperAdmin={isSuperAdmin} />}
      </div>
    </div>
  )
}

export default Admin