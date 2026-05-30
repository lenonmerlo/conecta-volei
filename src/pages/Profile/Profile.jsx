// Pagina de perfil do membro autenticado

import { useRef, useState } from "react";
import { useAuth } from "../../app/AuthContext";
import Button from "../../components/Button/Button";
import PlayerStats from "../../components/PlayerStats/PlayerStats";
import {
  updatePlayerAvatar,
  updatePlayerProfile,
  uploadAvatar,
} from "../../data/supabaseService";
import { isAdmin, isSuperAdmin } from "../../domain/admins";
import "./Profile.css";

function LoggedIn({ user, onLogout, onUpdateUser }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nickname, setNickname] = useState(user.nickname || "");
  const [whatsapp, setWhatsapp] = useState(user.whatsapp || "");
  const [successMessage, setSuccessMessage] = useState("");
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

  function handleStartEditing() {
    setNickname(user.nickname || "");
    setWhatsapp(user.whatsapp || "");
    setError("");
    setSuccessMessage("");
    setEditing(true);
  }

  function handleCancelEditing() {
    setEditing(false);
    setNickname(user.nickname || "");
    setWhatsapp(user.whatsapp || "");
    setError("");
  }

  async function handleSaveProfile() {
    const cleanedWhatsapp = whatsapp.trim();
    const cleanedNickname = nickname.trim();

    if (!cleanedWhatsapp) {
      setError("Informe um WhatsApp valido.");
      return;
    }

    setSaving(true);
    setError("");

    const result = await updatePlayerProfile(user.id, {
      nickname: cleanedNickname,
      whatsapp: cleanedWhatsapp,
    });

    setSaving(false);

    if (!result.success) {
      setError(result.error || "Nao foi possivel atualizar o perfil.");
      return;
    }

    onUpdateUser({
      ...user,
      nickname: cleanedNickname || null,
      whatsapp: cleanedWhatsapp,
    });

    setSuccessMessage("Perfil atualizado com sucesso.");
    setEditing(false);
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
      <div className="profile__logged-actions">
        <Button variant="danger" size="sm" onClick={onLogout}>
          Sair
        </Button>
        <Button variant="secondary" size="sm" onClick={handleStartEditing}>
          Editar perfil
        </Button>
      </div>

      {editing && (
        <div className="profile__edit-form">
          <div className="profile__field">
            <label htmlFor="profile-nickname">Apelido</label>
            <input
              id="profile-nickname"
              type="text"
              placeholder="Opcional"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
          </div>

          <div className="profile__field">
            <label htmlFor="profile-whatsapp">WhatsApp</label>
            <input
              id="profile-whatsapp"
              type="text"
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
            />
            <p className="profile__warning">
              Atencao: ao alterar o WhatsApp, voce precisara usar o novo numero
              para fazer login.
            </p>
          </div>

          <div className="profile__actions">
            <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
              Salvar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancelEditing}
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="profile__stats">
        <PlayerStats playerId={user.id} />
      </div>

      {successMessage && (
        <p className="profile__success-text">{successMessage}</p>
      )}
      {error && <p className="profile__error">{error}</p>}
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
