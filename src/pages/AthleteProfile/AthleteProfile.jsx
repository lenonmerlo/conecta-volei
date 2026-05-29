import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import Button from "../../components/Button/Button";
import PlayerStats from "../../components/PlayerStats/PlayerStats";
import {
  createScrap,
  deleteScrap,
  getPlayerById,
  getScraps,
} from "../../data/supabaseService";
import { isAdmin } from "../../domain/admins";
import "./AthleteProfile.css";

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Agora";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AthleteProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [athlete, setAthlete] = useState(null);
  const [scraps, setScraps] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [playerData, scrapsData] = await Promise.all([
      getPlayerById(id),
      getScraps(id),
    ]);

    if (!playerData) {
      setError("Atleta não encontrado.");
      setAthlete(null);
      setScraps([]);
      setLoading(false);
      return;
    }

    setAthlete(playerData);
    setScraps(scrapsData || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loadData]);

  const canLeaveScrap = useMemo(
    () => Boolean(user?.id && athlete?.id && user.id !== athlete.id),
    [user, athlete],
  );

  function canDeleteScrap(scrap) {
    if (!user || !athlete) return false;
    return (
      user.id === scrap.from_player_id ||
      user.id === athlete.id ||
      isAdmin(user)
    );
  }

  async function handleCreateScrap() {
    const text = message.trim();
    if (!user?.id || !athlete?.id || !text) return;

    setSending(true);
    const result = await createScrap(user.id, athlete.id, text);
    setSending(false);

    if (!result.success) {
      setError(result.error || "Não foi possível enviar o scrap.");
      return;
    }

    setMessage("");
    setError("");
    await loadData();
  }

  async function handleDeleteScrap(scrapId) {
    const success = await deleteScrap(scrapId);
    if (!success) {
      setError("Não foi possível apagar o scrap.");
      return;
    }

    setError("");
    setScraps((prev) => prev.filter((scrap) => scrap.id !== scrapId));
  }

  function handleGoBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/athletes");
  }

  if (loading) {
    return (
      <div className="athlete-profile">
        <p className="athlete-profile__state">Carregando perfil...</p>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="athlete-profile">
        <p className="athlete-profile__state">Atleta não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="athlete-profile">
      <div className="athlete-profile__top-actions">
        <Button size="sm" variant="secondary" onClick={handleGoBack}>
          Voltar
        </Button>
      </div>

      <header className="athlete-profile__header">
        <div className="athlete-profile__avatar">
          {athlete.avatar_url ? (
            <img src={athlete.avatar_url} alt={athlete.name} />
          ) : (
            <span>{athlete.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="athlete-profile__headline">
          <h2>{athlete.name}</h2>
          {athlete.nickname && <p>({athlete.nickname})</p>}
        </div>
      </header>

      <PlayerStats playerId={athlete.id} />

      <section className="athlete-profile__scrapbook">
        <h3>Scrapbook</h3>
        {error && <p className="athlete-profile__error">{error}</p>}

        {canLeaveScrap && (
          <div className="athlete-profile__composer">
            <textarea
              placeholder="Deixe um scrap para este atleta"
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <Button
              onClick={handleCreateScrap}
              disabled={sending || !message.trim()}
            >
              Deixar scrap
            </Button>
          </div>
        )}

        <ul className="athlete-profile__scraps">
          {scraps.length === 0 && (
            <li className="athlete-profile__empty">
              Ainda não há scraps aqui.
            </li>
          )}

          {scraps.map((scrap) => {
            const author = scrap.from_player || {};

            return (
              <li key={scrap.id} className="athlete-profile__scrap-item">
                <div className="athlete-profile__scrap-head">
                  <div className="athlete-profile__scrap-author">
                    <div className="athlete-profile__scrap-avatar">
                      {author.avatar_url ? (
                        <img
                          src={author.avatar_url}
                          alt={author.name || "Atleta"}
                        />
                      ) : (
                        <span>
                          {(author.name || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="athlete-profile__scrap-name">
                        {author.name || "Atleta"}
                        {author.nickname ? ` (${author.nickname})` : ""}
                      </p>
                      <p className="athlete-profile__scrap-date">
                        {formatDateTime(scrap.created_at)}
                      </p>
                    </div>
                  </div>

                  {canDeleteScrap(scrap) && (
                    <button
                      className="athlete-profile__delete"
                      onClick={() => handleDeleteScrap(scrap.id)}
                    >
                      Apagar
                    </button>
                  )}
                </div>

                <p className="athlete-profile__scrap-message">
                  {scrap.message}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export default AthleteProfile;
