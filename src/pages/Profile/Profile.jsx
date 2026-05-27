// Pagina de perfil - cadastro e login do membro

import { useState } from "react";
import { useAuth } from "../../app/AuthContext";
import Button from "../../components/Button/Button";
import { register } from "../../data/authStorage";
import { PLAYER_STATUS, PLAYER_TYPE } from "../../domain/constants";
import "./Profile.css";

function LoginForm({ onLogin }) {
  const { login } = useAuth();
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");

  function handleLogin() {
    if (!whatsapp.trim()) {
      setError("Informe seu WhatsApp.");
      return;
    }
    const result = login(whatsapp.trim());
    if (!result.success) {
      setError(result.error);
    } else {
      onLogin();
    }
  }

  return (
    <div className="profile__form">
      <h2 className="profile__title">Entrar</h2>
      <div className="profile__field">
        <label>WhatsApp</label>
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="Ex: 27999999999"
        />
        {error && <span className="profile__error">{error}</span>}
      </div>
      <Button onClick={handleLogin}>Entrar</Button>
    </div>
  );
}

function RegisterForm({ onRegister }) {
  const [form, setForm] = useState({
    name: "",
    nickname: "",
    whatsapp: "",
    gender: "M",
    acceptedRules: false,
  });
  const [errors, setErrors] = useState({});

  function validate() {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Nome é obrigatório";
    if (!form.whatsapp.trim()) newErrors.whatsapp = "WhatsApp é obrigatório";
    if (!form.acceptedRules)
      newErrors.acceptedRules = "Você precisa aceitar as regras";
    return newErrors;
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleSubmit() {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const player = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      nickname: form.nickname.trim() || null,
      whatsapp: form.whatsapp.trim(),
      type: PLAYER_TYPE.MEMBER,
      gender: form.gender,
      status: PLAYER_STATUS.ACTIVE,
      acceptedRules: true,
      createdAt: new Date().toISOString(),
    };

    const result = register(player);
    if (!result.success) {
      setErrors({ whatsapp: result.error });
      return;
    }

    onRegister();
  }

  return (
    <div className="profile__form">
      <h2 className="profile__title">Cadastro</h2>

      <div className="profile__field">
        <label>Nome completo *</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Ex: João da Silva"
        />
        {errors.name && <span className="profile__error">{errors.name}</span>}
      </div>

      <div className="profile__field">
        <label>Apelido</label>
        <input
          name="nickname"
          value={form.nickname}
          onChange={handleChange}
          placeholder="Ex: Joãozinho (opcional)"
        />
      </div>

      <div className="profile__field">
        <label>WhatsApp *</label>
        <input
          name="whatsapp"
          value={form.whatsapp}
          onChange={handleChange}
          placeholder="Ex: 27999999999"
        />
        {errors.whatsapp && (
          <span className="profile__error">{errors.whatsapp}</span>
        )}
      </div>

      <div className="profile__field">
        <label>Gênero</label>
        <select name="gender" value={form.gender} onChange={handleChange}>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </select>
      </div>

      <div className="profile__field profile__field--checkbox">
        <input
          type="checkbox"
          name="acceptedRules"
          checked={form.acceptedRules}
          onChange={handleChange}
          id="acceptedRules"
        />
        <label htmlFor="acceptedRules">Li e aceito as regras do grupo</label>
        {errors.acceptedRules && (
          <span className="profile__error">{errors.acceptedRules}</span>
        )}
      </div>

      <Button onClick={handleSubmit}>Cadastrar</Button>
    </div>
  );
}

function LoggedIn({ user, onLogout }) {
  return (
    <div className="profile__logged">
      <div className="profile__avatar">{user.name.charAt(0).toUpperCase()}</div>
      <h2 className="profile__logged-name">{user.name}</h2>
      {user.nickname && (
        <p className="profile__logged-nickname">({user.nickname})</p>
      )}
      <p className="profile__logged-info">{user.whatsapp}</p>
      <p className="profile__logged-type">Membro</p>
      <Button variant="secondary" onClick={onLogout}>
        Sair
      </Button>
    </div>
  );
}

function Profile() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState("login");
  const [registered, setRegistered] = useState(false);

  if (user) {
    return (
      <div className="profile">
        <LoggedIn user={user} onLogout={logout} />
      </div>
    );
  }

  if (registered) {
    return (
      <div className="profile">
        <div className="profile__success">
          <h2>Cadastro realizado!</h2>
          <p>Agora faça login com seu WhatsApp.</p>
          <Button
            onClick={() => {
              setRegistered(false);
              setMode("login");
            }}
          >
            Fazer login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile">
      <div className="profile__mode-toggle">
        <button
          className={`profile__mode-btn ${mode === "login" ? "profile__mode-btn--active" : ""}`}
          onClick={() => setMode("login")}
        >
          Entrar
        </button>
        <button
          className={`profile__mode-btn ${mode === "register" ? "profile__mode-btn--active" : ""}`}
          onClick={() => setMode("register")}
        >
          Cadastrar
        </button>
      </div>

      {mode === "login" ? (
        <LoginForm onLogin={() => {}} />
      ) : (
        <RegisterForm onRegister={() => setRegistered(true)} />
      )}
    </div>
  );
}

export default Profile;
