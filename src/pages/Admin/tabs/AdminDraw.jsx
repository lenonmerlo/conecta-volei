// Aba de sorteio de times do painel admin

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockPlayers } from '../../../data/mockGames'
import { drawTeams, swapPlayers } from '../../../domain/teamDraw'
import './AdminTabs.css'
import './AdminDraw.css'

function AdminDraw() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState(null)
  const [swap, setSwap] = useState(null) // { teamIndex, playerId }

  function handleDraw() {
    const eligible = mockPlayers.slice(0, 21)
    setTeams(drawTeams(eligible))
    setSwap(null)
  }

  function handleSelectForSwap(teamIndex, playerId) {
    if (!swap) {
      setSwap({ teamIndex, playerId })
      return
    }

    if (swap.teamIndex === teamIndex && swap.playerId === playerId) {
      setSwap(null)
      return
    }

    setTeams((prev) => swapPlayers(prev, swap.teamIndex, swap.playerId, teamIndex, playerId))
    setSwap(null)
  }

  function handleConfirm() {
    navigate('/teams', { state: { teams } })
  }

  return (
    <div className="admin-draw">
      {!teams ? (
        <div className="admin-draw__start">
          <p className="admin-draw__hint">
            Clique em sortear para montar os 3 times equilibrados.
          </p>
          <button className="admin-draw__btn-draw" onClick={handleDraw}>
            Sortear times
          </button>
        </div>
      ) : (
        <>
          {swap && (
            <p className="admin-draw__swap-hint">
              Selecione o jogador do outro time para trocar com{' '}
              <strong>
                {teams[swap.teamIndex].players.find((p) => p.id === swap.playerId)?.name}
              </strong>
            </p>
          )}

          <div className="admin-draw__teams">
            {teams.map((team, teamIndex) => (
              <div key={team.name} className="admin-draw__team">
                <div className="admin-draw__team-header">
                  <span className="admin-draw__team-name">{team.name}</span>
                  <span className="admin-draw__team-level">
                    Nível: {team.totalLevel.toFixed(1)}
                  </span>
                </div>
                <ul className="admin-draw__player-list">
                  {team.players.map((player) => {
                    const isSelected =
                      swap?.teamIndex === teamIndex && swap?.playerId === player.id
                    return (
                      <li
                        key={player.id}
                        className={`admin-draw__player ${isSelected ? 'admin-draw__player--selected' : ''}`}
                        onClick={() => handleSelectForSwap(teamIndex, player.id)}
                      >
                        <span className="admin-draw__player-name">
                          {player.name}
                          {player.nickname ? ` (${player.nickname})` : ''}
                        </span>
                        <span className="admin-draw__player-gender">
                          {player.gender === 'F' ? '♀' : '♂'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="admin-draw__actions">
            <button className="admin-draw__btn-reset" onClick={handleDraw}>
              Novo sorteio
            </button>
            <button className="admin-draw__btn-confirm" onClick={handleConfirm}>
              Confirmar times
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminDraw