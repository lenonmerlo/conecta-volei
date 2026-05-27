// Página pública de visualização dos times sorteados

import { useLocation, useNavigate } from 'react-router-dom'
import './Teams.css'

function Teams() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const teams = state?.teams

  if (!teams) {
    return (
      <div className="teams">
        <p className="teams__empty">Nenhum time sorteado ainda.</p>
        <button className="teams__back" onClick={() => navigate('/admin')}>
          Ir para o Admin
        </button>
      </div>
    )
  }

  return (
    <div className="teams">
      <h2 className="teams__title">Times de Hoje</h2>

      <div className="teams__list">
        {teams.map((team) => {
          const females = team.players.filter((p) => p.gender === 'F')
          const males = team.players.filter((p) => p.gender === 'M')

          return (
            <div key={team.name} className="teams__team">
              <div className="teams__team-header">
                <span className="teams__team-name">{team.name}</span>
              </div>

              <ul className="teams__player-list">
                {females.map((p) => (
                  <li key={p.id} className="teams__player teams__player--female">
                    <span className="teams__player-name">
                      {p.name}{p.nickname ? ` (${p.nickname})` : ''}
                    </span>
                    <span className="teams__player-gender">♀</span>
                  </li>
                ))}
                {males.map((p) => (
                  <li key={p.id} className="teams__player">
                    <span className="teams__player-name">
                      {p.name}{p.nickname ? ` (${p.nickname})` : ''}
                    </span>
                    <span className="teams__player-gender">♂</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <button className="teams__back" onClick={() => navigate(-1)}>
        Voltar
      </button>
    </div>
  )
}

export default Teams