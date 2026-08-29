import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button/Button";
import PlayerStats from "../../components/PlayerStats/PlayerStats";
import { getPlayerById } from "../../data/supabaseService";
import "./AthleteProfile.css";

function AthleteProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    const playerData = await getPlayerById(id);

    if (!playerData) {
      setAthlete(null);
      setLoading(false);
      return;
    }

    setAthlete(playerData);
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
    </div>
  );
}

export default AthleteProfile;
