import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GameCard from "../components/GameCard/GameCard";

const mockNavigate = vi.fn();
const mockIsListOpen = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../domain/gameRules", () => ({
  isListOpen: (...args) => mockIsListOpen(...args),
}));

function makeGame(overrides = {}) {
  return {
    id: "wednesday-2026-06-03",
    day: "wednesday",
    date: "2026-06-03",
    time: "19:30",
    location: "Ginásio Conecta",
    status: "active",
    notes: null,
    ...overrides,
  };
}

describe("GameCard", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockIsListOpen.mockReset();
    mockIsListOpen.mockReturnValue(true);
  });

  it("renderiza nome do dia correto para quarta, domingo e segunda", () => {
    const { rerender } = render(
      <GameCard game={makeGame({ date: "2026-06-03" })} registeredCount={3} />,
    );
    expect(screen.getByText("Quarta-feira")).toBeInTheDocument();

    rerender(
      <GameCard
        game={makeGame({ date: "2026-06-07", day: "sunday" })}
        registeredCount={3}
      />,
    );
    expect(screen.getByText("Domingo")).toBeInTheDocument();

    rerender(
      <GameCard
        game={makeGame({ date: "2026-06-01", day: "extra" })}
        registeredCount={3}
      />,
    );
    expect(screen.getByText("Segunda-feira")).toBeInTheDocument();
  });

  it("exibe horario, local e contagem de inscritos", () => {
    render(<GameCard game={makeGame()} registeredCount={8} />);

    expect(screen.getByText("19:30")).toBeInTheDocument();
    expect(screen.getByText("Ginásio Conecta")).toBeInTheDocument();
    expect(screen.getByText("8/21 inscritos")).toBeInTheDocument();
  });

  it("exibe badge de lista aberta quando lista esta aberta", () => {
    mockIsListOpen.mockReturnValue(true);

    render(
      <GameCard game={makeGame({ day: "wednesday" })} registeredCount={5} />,
    );

    expect(screen.getByText("Lista aberta")).toBeInTheDocument();
  });

  it("exibe badge de lista fechada quando lista esta fechada", () => {
    mockIsListOpen.mockReturnValue(false);

    render(
      <GameCard game={makeGame({ day: "wednesday" })} registeredCount={5} />,
    );

    expect(screen.getByText("Lista fechada")).toBeInTheDocument();
  });

  it("exibe badge lista cheia quando ha 21 inscritos", () => {
    render(<GameCard game={makeGame()} registeredCount={21} />);

    expect(screen.getByText("Lista cheia")).toBeInTheDocument();
  });

  it("exibe badge cancelado quando status do jogo e cancelled", () => {
    render(
      <GameCard
        game={makeGame({ status: "cancelled" })}
        registeredCount={10}
      />,
    );

    expect(screen.getByText("Cancelado")).toBeInTheDocument();
  });

  it("nao navega ao clicar quando jogo esta cancelado", () => {
    render(
      <GameCard
        game={makeGame({ status: "cancelled" })}
        registeredCount={10}
      />,
    );

    const card = screen.getByRole("button");
    fireEvent.click(card);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
