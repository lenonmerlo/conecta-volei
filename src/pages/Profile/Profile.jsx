// Pagina de perfil do membro autenticado

import { useAuth } from "../../app/AuthContext";
import Button from "../../components/Button/Button";
import { isAdmin, isSuperAdmin } from "../../domain/admins";
import "./Profile.css";

function LoggedIn({ user, onLogout }) {
  const role = isSuperAdmin(user)
    ? "Super Admin"
    : isAdmin(user)
      ? "Admin"
      : "Membro";
  const roleClass = isSuperAdmin(user)
    ? "profile__logged-type--super"
    : isAdmin(user)
      ? "profile__logged-type--admin"
      : "";

  return (
    <div className="profile__logged">
      <div className="profile__avatar">{user.name.charAt(0).toUpperCase()}</div>
      <h2 className="profile__logged-name">{user.name}</h2>
      {user.nickname && (
        <p className="profile__logged-nickname">({user.nickname})</p>
      )}
      <p className="profile__logged-info">{user.whatsapp}</p>
      <span className={`profile__logged-type ${roleClass}`}>{role}</span>
      <Button variant="secondary" onClick={onLogout}>
        Sair
      </Button>
    </div>
  );
}

function Profile() {
  const { user, logout } = useAuth();

  if (user) {
    return (
      <div className="profile">
        <LoggedIn user={user} onLogout={logout} />
      </div>
    );
  }

  return (
    <div className="profile">
      <div className="profile__success">
        <h2>Sem sessao ativa</h2>
        <p>Volte para a tela inicial e entre com seu WhatsApp.</p>
        <Button variant="secondary" onClick={logout}>
          Ir para login
        </Button>
      </div>
    </div>
  );
}

export default Profile;
