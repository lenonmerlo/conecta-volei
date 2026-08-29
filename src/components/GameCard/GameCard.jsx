// Componente de card de jogo — exibido na Home

import { useNavigate } from "react-router-dom";
import { isListOpen } from "../../domain/gameRules";
import "./GameCard.css";

function getDayLabel(dateStr) {
  const days = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];

  const date = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return days[date.getUTCDay()];
}

function getGameDateTime(game) {
  if (!game?.date || !game?.time) return null;
  const dateTime = new Date(`${game.date}T${game.time}:00`);
  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatIcsDate(date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function buildIcsContent(game, dayLabel, startDateTime) {
  const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
  const location = (game.location || "").replace(/[,;]/g, " ");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Conecta Volei//PT-BR",
    "BEGIN:VEVENT",
    `UID:conecta-volei-${game.id}@conectavolei.app`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startDateTime)}`,
    `DTEND:${formatIcsDate(endDateTime)}`,
    `SUMMARY:Conecta Vôlei - ${dayLabel}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function GameCard({ game, registeredCount = 0 }) {
  const navigate = useNavigate();
  const dayLabel = getDayLabel(game.date);
  const spotsLeft = 21 - registeredCount;
  const isFull = spotsLeft <= 0;
  const isCancelled = game.status === "cancelled";
  const isFixedGame = game.day === "wednesday" || game.day === "sunday";
  const listOpen = isFixedGame ? isListOpen(game) : true;
  const isInteractive = listOpen && !isCancelled;

  function openGame() {
    if (!isInteractive) return;
    navigate(`/game/${game.id}`);
  }

  function handleKeyDown(e) {
    if (!isInteractive) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openGame();
    }
  }

  function handleAddToCalendar(e) {
    e.stopPropagation();

    const startDateTime = getGameDateTime(game);
    if (!startDateTime) return;

    const content = buildIcsContent(game, dayLabel, startDateTime);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `conecta-volei-${game.date}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className={`game-card ${isFull ? "game-card--full" : ""} ${
        !listOpen ? "game-card--list-closed" : ""
      } ${
        isCancelled ? "game-card--cancelled" : ""
      } ${isInteractive ? "game-card--interactive" : "game-card--disabled"}`}
      onClick={isInteractive ? openGame : undefined}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isInteractive ? 0 : -1}
      aria-disabled={!isInteractive}
    >
      <div className="game-card__header">
        <span className="game-card__day">{dayLabel}</span>
        <span className="game-card__time">{game.time}</span>
      </div>
      <div className="game-card__body">
        <p className="game-card__location">{game.location}</p>
        {game.notes && <p className="game-card__notes">{game.notes}</p>}
        <p className="game-card__date">{game.date}</p>
        {game.mapUrl && (
          <a
            className="game-card__map-link"
            href={game.mapUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Ver mapa
          </a>
        )}
        {!isCancelled && (
          <button
            type="button"
            className="game-card__calendar-btn"
            onClick={handleAddToCalendar}
          >
            Adicionar à agenda
          </button>
        )}
      </div>
      <div className="game-card__footer">
        <span className="game-card__spots">{registeredCount}/21 inscritos</span>
        {isCancelled ? (
          <span className="game-card__badge game-card__badge--cancelled">
            Cancelado
          </span>
        ) : (
          <>
            <span
              className={`game-card__list-pill ${
                listOpen
                  ? "game-card__list-pill--open"
                  : "game-card__list-pill--closed"
              }`}
            >
              {listOpen ? "Lista aberta" : "Lista fechada"}
            </span>
            {!isFull ? (
              <span className="game-card__badge game-card__badge--open">
                {spotsLeft} vagas
              </span>
            ) : (
              <span className="game-card__badge game-card__badge--full">
                Lista cheia
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default GameCard;
