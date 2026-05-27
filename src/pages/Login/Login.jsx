// Tela de entrada — login e cadastro antes de acessar o app

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import escudoConecta from "../../assets/escudo-conecta-prata.png";
import Button from "../../components/Button/Button";
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

function RegisterForm() {
  const navigate = useNavigate();
  const { pendingRegister, savePendingRegister } = useAuth();
  const [form, setForm] = useState(
    pendingRegister || {
      name: "",
      nickname: "",
      whatsapp: "",
      gender: "M",
    },
  );
  const [errors, setErrors] = useState({});

  function validate() {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Nome é obrigatório";
    if (!form.whatsapp.trim()) newErrors.whatsapp = "WhatsApp é obrigatório";
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

    savePendingRegister(form);
    setErrors({});
    navigate("/rules");
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

      <p className="login__hint">
        Depois de preencher, você vai para as regras e conclui o cadastro com o
        aceite.
      </p>

      <Button onClick={handleSubmit} fullWidth>
        Continuar para regras
      </Button>
    </div>
  );
}

function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const registeredFromQuery = query.get("registered") === "1";
  const [mode, setMode] = useState("login");
  const [registered, setRegistered] = useState(false);

  if (registered || registeredFromQuery) {
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
                if (registeredFromQuery) {
                  navigate("/", { replace: true });
                }
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

          {mode === "login" ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </div>
  );
}

export default Login;
