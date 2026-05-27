// Navegação inferior mobile

import { BookOpen, Home, Shield, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import { isAdmin } from "../../domain/admins";
import "./BottomNav.css";

function BottomNav() {
  const { user } = useAuth();
  const userIsAdmin = isAdmin(user);

  return (
    <nav className="bottom-nav">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`
        }
      >
        <Home size={22} />
        <span>Início</span>
      </NavLink>
      <NavLink
        to="/rules"
        className={({ isActive }) =>
          `bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`
        }
      >
        <BookOpen size={22} />
        <span>Regras</span>
      </NavLink>
      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`
        }
      >
        <User size={22} />
        <span>Perfil</span>
      </NavLink>
      {userIsAdmin && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`
          }
        >
          <Shield size={22} />
          <span>Admin</span>
        </NavLink>
      )}
    </nav>
  );
}

export default BottomNav;
