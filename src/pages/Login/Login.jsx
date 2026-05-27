// Tela de entrada — login e cadastro antes de acessar o app

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import escudoConecta from "../../assets/escudo-conecta-prata.png";
import Button from "../../components/Button/Button";
import { register } from "../../data/authStorage";
import { PLAYER_STATUS, PLAYER_TYPE } from "../../domain/constants";
import "./Login.css";

function LoginForm() {
  const { login } = useAuth();
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");

  function handleLogin() {
    if (!whatsapp.trim()) {
      setError("Informe seu WhatsApp.");
      return;
    }
    const result = login(whatsapp.trim());
    if (!result.success) setError(result.error);
  }

  return (
    <div className="login__form">
      <h2 className="login__subtitle">Entrar</h2>
      <div className="login__field">
        <label>WhatsApp</label>
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="Ex: 27999999999"
        />
        {error && <span className="login__error">{error}</span>}
      </div>
      <Button onClick={handleLogin} fullWidth>
        Entrar
      </Button>
    </div>
  );
}

function RegisterForm({ onRegister }) {
  const hasOpenedRules = sessionStorage.getItem("cv_rules_opened") === "true";
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
    if (!hasOpenedRules)
      newErrors.acceptedRules = "Abra e leia as regras antes de aceitar";
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
    <div className="login__form">
      <h2 className="login__subtitle">Cadastro</h2>

      <div className="login__field">
        <label>Nome completo *</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Ex: João da Silva"
        />
        {errors.name && <span className="login__error">{errors.name}</span>}
      </div>

      <div className="login__field">
        <label>Apelido</label>
        <input
          name="nickname"
          value={form.nickname}
          onChange={handleChange}
          placeholder="Ex: Joãozinho (opcional)"
        />
      </div>

      <div className="login__field">
        <label>WhatsApp *</label>
        <input
          name="whatsapp"
          value={form.whatsapp}
          onChange={handleChange}
          placeholder="Ex: 27999999999"
        />
        {errors.whatsapp && (
          <span className="login__error">{errors.whatsapp}</span>
        )}
      </div>

      <div className="login__field">
        <label>Gênero</label>
        <select name="gender" value={form.gender} onChange={handleChange}>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </select>
      </div>

      <div className="login__field login__field--checkbox">
        <input
          type="checkbox"
          name="acceptedRules"
          checked={form.acceptedRules}
          onChange={handleChange}
          id="acceptedRules"
          disabled={!hasOpenedRules}
        />
        <label htmlFor="acceptedRules">Li e aceito as regras do grupo</label>
        {!hasOpenedRules && (
          <span className="login__hint">
            Leia as regras para liberar o aceite.
          </span>
        )}
        {errors.acceptedRules && (
          <span className="login__error">{errors.acceptedRules}</span>
        )}
      </div>

      <Link className="login__rules-link" to="/rules">
        {hasOpenedRules
          ? "Regras abertas. Se quiser, revisar novamente"
          : "Abrir regras para liberar o aceite"}
      </Link>

      <Button onClick={handleSubmit} fullWidth>
        Cadastrar
      </Button>
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState("login");
  const [registered, setRegistered] = useState(false);

  if (registered) {
    return (
      <div className="login">
        <div className="login__shell">
          <div className="login__crest">
            <img
              className="login__shield"
              src={escudoConecta}
              alt="Escudo Conecta Vôlei"
            />
          </div>
          <div className="login__hero">
            <h1 className="login__title">Conecta Vôlei</h1>
          </div>
          <div className="login__success">
            <h2>Cadastro realizado! 🏐</h2>
            <p>Agora faça login com seu WhatsApp.</p>
            <Button
              onClick={() => {
                setRegistered(false);
                setMode("login");
              }}
              fullWidth
            >
              Fazer login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <div className="login__shell">
        <div className="login__crest">
          <img
            className="login__shield"
            src={escudoConecta}
            alt="Escudo Conecta Vôlei"
          />
        </div>
        <div className="login__hero">
          <h1 className="login__title">Conecta Vôlei</h1>
          <p className="login__tagline">Grupo de Vôlei de Quadra</p>
        </div>

        <div className="login__panel">
          <div className="login__toggle">
            <button
              className={`login__toggle-btn ${mode === "login" ? "login__toggle-btn--active" : ""}`}
              onClick={() => setMode("login")}
            >
              Entrar
            </button>
            <button
              className={`login__toggle-btn ${mode === "register" ? "login__toggle-btn--active" : ""}`}
              onClick={() => setMode("register")}
            >
              Cadastrar
            </button>
          </div>

          {mode === "login" ? (
            <LoginForm />
          ) : (
            <RegisterForm onRegister={() => setRegistered(true)} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
