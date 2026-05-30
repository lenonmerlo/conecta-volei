import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BottomNav from "../components/BottomNav/BottomNav";

const mockUseAuth = vi.fn();
let mockPathname = "/";

vi.mock("../app/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("react-router-dom", () => ({
  NavLink: ({ to, className, children }) => {
    const isActive = to === mockPathname;
    const computedClassName =
      typeof className === "function" ? className({ isActive }) : className;

    return (
      <a href={to} className={computedClassName}>
        {children}
      </a>
    );
  },
  useLocation: () => ({ pathname: mockPathname }),
}));

describe("BottomNav", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockPathname = "/";
  });

  it("exibe abas para membros comuns", () => {
    mockUseAuth.mockReturnValue({ user: { whatsapp: "27900000000" } });

    render(<BottomNav />);

    expect(screen.getByText("Início")).toBeInTheDocument();
    expect(screen.getByText("Regras")).toBeInTheDocument();
    expect(screen.getByText("Scrapbook")).toBeInTheDocument();
    expect(screen.getByText("Atletas")).toBeInTheDocument();
    expect(screen.getByText("Perfil")).toBeInTheDocument();
  });

  it("exibe aba Admin para admins", () => {
    mockUseAuth.mockReturnValue({ user: { whatsapp: "27999519575" } });

    render(<BottomNav />);

    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("nao exibe aba Admin para membros comuns", () => {
    mockUseAuth.mockReturnValue({ user: { whatsapp: "27900000000" } });

    render(<BottomNav />);

    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("marca link ativo com classe correta", () => {
    mockUseAuth.mockReturnValue({ user: { whatsapp: "27900000000" } });
    mockPathname = "/scrapbook";

    const { container } = render(<BottomNav />);

    const active = container.querySelector(
      "a[href='/scrapbook'].bottom-nav__item--active",
    );

    expect(active).toBeInTheDocument();
  });
});
