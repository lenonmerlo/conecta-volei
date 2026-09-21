import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import Button from "../../components/Button/Button";
import "./Rules.css";
import { RULE_SECTIONS } from "./rulesContent";

const READING_WORDS_PER_MINUTE = 200;
const MINIMUM_READING_SECONDS = 360;

const ruleWordCount = RULE_SECTIONS.flatMap((section) => section.items)
  .join(" ")
  .trim()
  .split(/\s+/).length;

const requiredReadingSeconds = Math.max(
  MINIMUM_READING_SECONDS,
  Math.ceil((ruleWordCount / READING_WORDS_PER_MINUTE) * 60),
);
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${seconds} s`;
}

function Rules() {
  const navigate = useNavigate();
  const {
    user,
    needsRulesAcceptance,
    pendingRegister,
    commitRegister,
    acceptCurrentRules,
  } = useAuth();

  const [secondsRead, setSecondsRead] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const mustAccept = Boolean(
    (user && needsRulesAcceptance) || (!user && pendingRegister),
  );

  useEffect(() => {
    if (!mustAccept) return undefined;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;

      setSecondsRead((current) =>
        Math.min(requiredReadingSeconds, current + 1),
      );
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [mustAccept]);

  const remainingSeconds = Math.max(0, requiredReadingSeconds - secondsRead);

  async function handleAccept() {
    if (!agreed || saving) return;

    if (remainingSeconds > 0) {
      setError(
        "Nem uma máquina conseguiria ler tudo tão rápido! 😄 Volte ao regulamento e leia as regras de verdade antes de confirmar.",
      );
      return;
    }

    setSaving(true);
    setError("");

    const result = user ? await acceptCurrentRules() : await commitRegister();

    setSaving(false);

    if (!result.success) {
      setError(result.error || "Não foi possível salvar o aceite.");
      return;
    }

    navigate(user ? "/" : "/?registered=1", { replace: true });
  }

  return (
    <div className="rules">
      <div className="rules__hero">
        <h2 className="rules__title">Regulamento Oficial</h2>
        <p className="rules__subtitle">Grupo de Vôlei — Conecta Vôlei</p>

        {mustAccept && (
          <p className="rules__reading">
            Tempo mínimo de leitura: {formatTime(requiredReadingSeconds)}
            <br />
            {remainingSeconds > 0
              ? `Tempo restante: ${formatTime(remainingSeconds)}`
              : "Tempo mínimo concluído. Leia até o fim e confirme o aceite."}
          </p>
        )}
      </div>

      <div className="rules__sections">
        {RULE_SECTIONS.map((section, index) => (
          <section
            key={section.id}
            className="rules__section"
            aria-labelledby={`rules-${section.id}`}
          >
            <h3 id={`rules-${section.id}`} className="rules__section-title">
              {index + 1}. {section.title}
            </h3>

            <ul className="rules__list">
              {section.items.map((item) => {
                const isExample = /^8\.2\.\d+\./.test(item);
                const isExampleHeading = item.startsWith("8.2. ");

                return (
                  <li
                    key={item}
                    className={[
                      "rules__item",
                      isExample && "rules__item--example",
                      isExampleHeading && "rules__item--example-heading",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {item}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="rules__footer">CONECTA VÔLEI</p>

      {mustAccept && (
        <div className="rules__actions">
          <p className="rules__pending">
            {user
              ? "As regras foram atualizadas. Leia o regulamento com atenção para continuar usando o aplicativo."
              : `Cadastro pendente para ${pendingRegister.name}. Leia o regulamento para concluir o cadastro.`}
          </p>

          <label className="rules__accept-label">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              disabled={saving}
            />
            <span>Li o regulamento completo e concordo com as regras.</span>
          </label>

          {error && <p className="rules__error">{error}</p>}

          <div className="rules__buttons">
            <Button onClick={handleAccept} disabled={!agreed || saving}>
              {saving
                ? "Salvando..."
                : user
                  ? "Aceitar e continuar"
                  : "Aceitar e concluir cadastro"}
            </Button>

            {!user && (
              <Button variant="secondary" onClick={() => navigate("/")}>
                Voltar ao cadastro
              </Button>
            )}
          </div>
        </div>
      )}

      {!user && !pendingRegister && (
        <div className="rules__actions">
          <div className="rules__buttons">
            <Button variant="secondary" onClick={() => navigate("/")}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rules;
