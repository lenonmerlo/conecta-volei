import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JoinList from "../components/JoinList/JoinList";

const mockUseAuth = vi.fn();
const mockGetAllPlayers = vi.fn();
const mockGetGameRegistrations = vi.fn();
const mockGetGuestsByInviterFromTable = vi.fn();
const mockIsPlayerRegistered = vi.fn();
const mockJoinGame = vi.fn();
const mockLeaveGame = vi.fn();
const mockRegisterGuest = vi.fn();
const mockRemoveGuest = vi.fn();

vi.mock("../app/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../data/supabaseService", () => ({
  getAllPlayers: (...args) => mockGetAllPlayers(...args),
  getGameRegistrations: (...args) => mockGetGameRegistrations(...args),
  getGuestsByInviterFromTable: (...args) =>
    mockGetGuestsByInviterFromTable(...args),
  isPlayerRegistered: (...args) => mockIsPlayerRegistered(...args),
  joinGame: (...args) => mockJoinGame(...args),
  leaveGame: (...args) => mockLeaveGame(...args),
  registerGuest: (...args) => mockRegisterGuest(...args),
  removeGuest: (...args) => mockRemoveGuest(...args),
}));

function makeGame(overrides = {}) {
  return {
    id: "sun-2026-06-01",
    day: "sunday",
    date: "2026-06-01",
    ...overrides,
  };
}

describe("JoinList", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockGetAllPlayers.mockReset();
    mockGetGameRegistrations.mockReset();
    mockGetGuestsByInviterFromTable.mockReset();
    mockIsPlayerRegistered.mockReset();
    mockJoinGame.mockReset();
    mockLeaveGame.mockReset();
    mockRegisterGuest.mockReset();
    mockRemoveGuest.mockReset();

    mockUseAuth.mockReturnValue({ user: { id: "p1" } });
    mockGetAllPlayers.mockResolvedValue([]);
    mockGetGuestsByInviterFromTable.mockResolvedValue([]);
    mockLeaveGame.mockResolvedValue(true);
  });

  it("nao abre modal de penalizacao ao sair da waitlist", async () => {
    mockGetGameRegistrations.mockResolvedValue([
      {
        id: "r1",
        player_id: "p1",
        slot: "waitlist",
      },
    ]);

    render(<JoinList game={makeGame()} onUpdate={vi.fn()} />);

    await screen.findByText("Voce esta inscrito neste jogo.");

    fireEvent.click(screen.getByRole("button", { name: "Sair da lista" }));

    await waitFor(() => {
      expect(mockLeaveGame).toHaveBeenCalledWith("sun-2026-06-01", "p1");
    });

    expect(
      screen.queryByText(/Atencao: ao sair da lista agora/i),
    ).not.toBeInTheDocument();
  });

  it("abre modal de penalizacao ao sair da lista principal apos cutoff", async () => {
    mockGetGameRegistrations.mockResolvedValue([
      {
        id: "r1",
        player_id: "p1",
        slot: "main",
      },
    ]);

    render(<JoinList game={makeGame()} onUpdate={vi.fn()} />);

    await screen.findByText("Voce esta inscrito neste jogo.");

    fireEvent.click(screen.getByRole("button", { name: "Sair da lista" }));

    expect(
      screen.getByText(/Atencao: ao sair da lista agora/i),
    ).toBeInTheDocument();
    expect(mockLeaveGame).not.toHaveBeenCalled();
  });

  it("mostra aviso para penalizado e segue para join", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "p1", status: "penalized" } });
    mockGetGameRegistrations.mockResolvedValue([]);
    mockIsPlayerRegistered.mockResolvedValue(false);
    mockJoinGame.mockResolvedValue(true);

    render(<JoinList game={makeGame()} onUpdate={vi.fn()} />);

    await screen.findByRole("button", { name: "Entrar na lista" });
    fireEvent.click(screen.getByRole("button", { name: "Entrar na lista" }));

    expect(
      await screen.findByText(
        "Você está penalizado e entrará na lista de espera",
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(mockJoinGame).toHaveBeenCalledWith("sun-2026-06-01", "p1", "main");
    });
  });

  it("bloqueia entrada de usuario blocked antes de chamar joinGame", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "p1", status: "blocked" } });
    mockGetGameRegistrations.mockResolvedValue([]);

    render(<JoinList game={makeGame()} onUpdate={vi.fn()} />);

    await screen.findByRole("button", { name: "Entrar na lista" });
    fireEvent.click(screen.getByRole("button", { name: "Entrar na lista" }));

    expect(
      await screen.findByText("Você está bloqueado e não pode entrar na lista"),
    ).toBeInTheDocument();
    expect(mockJoinGame).not.toHaveBeenCalled();
  });
});
