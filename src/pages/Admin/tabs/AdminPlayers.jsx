// Aba de jogadores do painel admin

import { useState } from 'react'
import { mockPlayers } from '../../../data/mockGames'
import { PLAYER_STATUS, PLAYER_TYPE } from '../../../domain/constants'
import './AdminTabs.css'

function statusLabel(status) {
  const map = {
    active: 'Ativo',
    inactive: 'Inativo',
    penalized: 'Penalizado',
    blocked: 'Bloqueado',
  }
  return map[status] || status
}

function AdminPlayers() {
  const [players, setPlayers] = useState(mockPlayers)

  function togglePenalized(id) {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: p.status === PLAYER_STATUS.PENALIZED ? PLAYER_STATUS.ACTIVE : PLAYER_STATUS.PENALIZED }
          : p
      )
    )
  }

  function toggleBlocked(id) {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: p.status === PLAYER_STATUS.BLOCKED ? PLAYER_STATUS.ACTIVE : PLAYER_STATUS.BLOCKED }
          : p
      )
    )
  }

  return (
    <div className="admin-tab">
      <ul className="admin-tab__list">
        {players.map((p) => (
          <li key={p.id} className="admin-tab__item">
            <div className="admin-tab__info">
              <span className="admin-tab__name">
                {p.name}{p.nickname ? ` (${p.nickname})` : ''}
              </span>
              <span className={`admin-tab__status admin-tab__status--${p.status}`}>
                {statusLabel(p.status)}
              </span>
              <span className="admin-tab__type">
                {p.type === PLAYER_TYPE.MEMBER ? 'Membro' : 'Convidado'}
              </span>
            </div>
            <div className="admin-tab__actions">
              <button
                className="admin-tab__btn admin-tab__btn--warn"
                onClick={() => togglePenalized(p.id)}
              >
                {p.status === PLAYER_STATUS.PENALIZED ? 'Remover penalidade' : 'Penalizar'}
              </button>
              <button
                className="admin-tab__btn admin-tab__btn--danger"
                onClick={() => toggleBlocked(p.id)}
              >
                {p.status === PLAYER_STATUS.BLOCKED ? 'Desbloquear' : 'Bloquear'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default AdminPlayers