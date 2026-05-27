// Navegação inferior mobile

import { NavLink } from 'react-router-dom'
import { Home, BookOpen, User, Shield } from 'lucide-react'
import './BottomNav.css'

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
        <Home size={22} />
        <span>Início</span>
      </NavLink>
      <NavLink to="/rules" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
        <BookOpen size={22} />
        <span>Regras</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
        <User size={22} />
        <span>Perfil</span>
      </NavLink>
      <NavLink to="/admin" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
        <Shield size={22} />
        <span>Admin</span>
      </NavLink>
    </nav>
  )
}

export default BottomNav