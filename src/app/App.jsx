import './App.css'
import Home from '../pages/Home/Home'

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__logo">Conecta Vôlei</h1>
      </header>
      <main className="app__main">
        <Home />
      </main>
    </div>
  )
}

export default App