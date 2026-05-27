// Página inicial — exibe os jogos da semana

import './Home.css'
import GameCard from '../../components/GameCard/GameCard'
import { mockGames } from '../../data/mockGames'

function Home() {
  return (
    <div className="home">
      <h2 className="home__title">Jogos da Semana</h2>
      <div className="home__list">
        {mockGames.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  )
}

export default Home