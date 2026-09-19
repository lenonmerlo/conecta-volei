import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import Button from "../../components/Button/Button";
import "./Rules.css";
import { RULE_SECTIONS } from "./rulesContent";

function Rules() {
  const navigate = useNavigate();
  const { user, pendingRegister, commitRegister } = useAuth();
  const [error, setError] = useState("");

  async function handleAcceptAndFinish() {
    const result = await commitRegister();

    if (!result.success) {
      setError(result.error);
      return;
    }

    setError("");
    navigate("/?registered=1", { replace: true });
  }

  return (
    <div className="rules">
      <div className="rules__hero">
        <h2 className="rules__title">Regulamento Oficial</h2>
        <p className="rules__subtitle">Grupo de Vôlei — Conecta Vôlei</p>
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

      {!user && (
        <div className="rules__actions">
          {pendingRegister ? (
            <>
              <p className="rules__pending">
                Cadastro pendente para {pendingRegister.name}. Ao aceitar as
                regras, seu cadastro será concluído.
              </p>

              {error && <p className="rules__error">{error}</p>}

              <div className="rules__buttons">
                <Button onClick={handleAcceptAndFinish}>
                  Aceito as regras e concluir cadastro
                </Button>
                <Button variant="secondary" onClick={() => navigate("/")}>
                  Voltar ao cadastro
                </Button>
              </div>
            </>
          ) : (
            <div className="rules__buttons">
              <Button variant="secondary" onClick={() => navigate("/")}>
                Voltar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Rules;
