import { VOTE_CATEGORIES } from "../../domain/constants";
import "./IconLab.css";

function IconLab() {
  return (
    <div className="icon-lab">
      <div className="icon-lab__hero">
        <h2 className="icon-lab__title">Preview de Ícones</h2>
        <p className="icon-lab__subtitle">
          Versão de aprovação visual dos ícones de votação.
        </p>
      </div>

      <div className="icon-lab__grid">
        {VOTE_CATEGORIES.map((category) => (
          <article key={category.key} className="icon-lab__card">
            <header className="icon-lab__card-header">
              <span
                className="icon-lab__emoji icon-lab__emoji-lg"
                aria-hidden="true"
              >
                {category.icon}
              </span>
              <div>
                <h3 className="icon-lab__card-title">{category.label}</h3>
                <p className="icon-lab__card-key">{category.key}</p>
              </div>
            </header>

            <div className="icon-lab__sizes">
              <div className="icon-lab__size-item">
                <span className="icon-lab__size-label">Pequeno</span>
                <span
                  className="icon-lab__emoji icon-lab__emoji-sm"
                  aria-hidden="true"
                >
                  {category.icon}
                </span>
              </div>
              <div className="icon-lab__size-item">
                <span className="icon-lab__size-label">Médio</span>
                <span
                  className="icon-lab__emoji icon-lab__emoji-md"
                  aria-hidden="true"
                >
                  {category.icon}
                </span>
              </div>
              <div className="icon-lab__size-item">
                <span className="icon-lab__size-label">Grande</span>
                <span
                  className="icon-lab__emoji icon-lab__emoji-lg"
                  aria-hidden="true"
                >
                  {category.icon}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default IconLab;
