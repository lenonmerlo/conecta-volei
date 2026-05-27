// Página inicial — exibe os jogos da semana

import GameCard from "../../components/GameCard/GameCard";
import { mockGames } from "../../data/mockGames";
import "./Home.css";

function Home() {
  return (
    <div className="home">
      <div className="home__hero">
        <h2 className="home__title">Jogos da Semana</h2>
        <p className="home__subtitle">
          Quadra pronta, energia no alto e organização em tempo real.
        </p>
      </div>
      <div className="home__list">
        {mockGames.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}

export default Home;
