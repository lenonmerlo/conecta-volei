// Pagina de perfil do membro autenticado

import { useRef, useState } from "react";
import { useAuth } from "../../app/AuthContext";
import Button from "../../components/Button/Button";
import { updatePlayerAvatar, uploadAvatar } from "../../data/supabaseService";
import { isAdmin, isSuperAdmin } from "../../domain/admins";
import "./Profile.css";

function LoggedIn({ user, onLogout, onUpdateUser }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const uploadResult = await uploadAvatar(user.id, file);
    if (!uploadResult.success) {
      setError("Erro ao fazer upload da foto.");
      setUploading(false);
      return;
    }

    const saved = await updatePlayerAvatar(user.id, uploadResult.url);
    if (!saved) {
      setError("Erro ao salvar a foto.");
      setUploading(false);
      return;
    }

    onUpdateUser({ ...user, avatar_url: uploadResult.url });
    setUploading(false);
  }

  return (
    <div className="profile__logged">
      <div
        className="profile__avatar"
        onClick={() => fileInputRef.current?.click()}
        title="Clique para alterar a foto"
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            fileInputRef.current?.click();
          }
        }}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="profile__avatar-img"
          />
        ) : (
          <span>{user.name.charAt(0).toUpperCase()}</span>
        )}
        <div className="profile__avatar-overlay">
          <span>CAM</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleAvatarChange}
      />

      {uploading && <p className="profile__uploading">Enviando foto...</p>}
      {error && <p className="profile__error">{error}</p>}

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
  const { user, logout, updateUser } = useAuth();

  if (user) {
    return (
      <div className="profile">
        <LoggedIn user={user} onLogout={logout} onUpdateUser={updateUser} />
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
