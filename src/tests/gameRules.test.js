import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GAME_DAYS } from "../domain/constants";
import {
  getNextGameDate,
  isGuestAllowedInMainList,
  isListOpen,
  isMemberPriorityWindow,
} from "../domain/gameRules";

describe("gameRules", () => {
  describe("isListOpen", () => {
    it("abre para quarta na segunda a noite", () => {
      const monday20h = new Date(2026, 4, 25, 20, 0, 0);
      expect(isListOpen(GAME_DAYS.WEDNESDAY, monday20h)).toBe(true);
    });

    it("nao abre para quarta na segunda antes das 19h", () => {
      const monday18h = new Date(2026, 4, 25, 18, 0, 0);
      expect(isListOpen(GAME_DAYS.WEDNESDAY, monday18h)).toBe(false);
    });

    it("abre para domingo na quinta a noite", () => {
      const thursday20h = new Date(2026, 4, 28, 20, 0, 0);
      expect(isListOpen(GAME_DAYS.SUNDAY, thursday20h)).toBe(true);
    });

    it("nao abre para domingo na quarta", () => {
      const wednesday20h = new Date(2026, 4, 27, 20, 0, 0);
      expect(isListOpen(GAME_DAYS.SUNDAY, wednesday20h)).toBe(false);
    });

    it("retorna false para jogo extra", () => {
      const saturday = new Date(2026, 4, 30, 12, 0, 0);
      expect(isListOpen("extra", saturday)).toBe(false);
    });
  });

  describe("isMemberPriorityWindow", () => {
    it("retorna true dentro da janela (quinta 19h)", () => {
      const thursday19h = {
        getDay: () => 4,
        getHour: () => 19,
        getMinutes: () => 0,
      };

      expect(isMemberPriorityWindow(thursday19h)).toBe(true);
    });

    it("retorna false fora da janela (quinta 18h)", () => {
      const thursday18h = {
        getDay: () => 4,
        getHour: () => 18,
        getMinutes: () => 0,
      };

      expect(isMemberPriorityWindow(thursday18h)).toBe(false);
    });

    it("retorna true na sexta durante a janela", () => {
      const friday22h = {
        getDay: () => 5,
        getHour: () => 22,
        getMinutes: () => 10,
      };

      expect(isMemberPriorityWindow(friday22h)).toBe(true);
    });

    it("retorna false fora da janela (sabado)", () => {
      const saturday = {
        getDay: () => 6,
        getHour: () => 0,
        getMinutes: () => 0,
      };

      expect(isMemberPriorityWindow(saturday)).toBe(false);
    });
  });

  describe("isGuestAllowedInMainList", () => {
    it("retorna true no sabado", () => {
      const saturday = new Date(2026, 4, 30, 10, 0, 0);
      expect(isGuestAllowedInMainList(saturday)).toBe(true);
    });

    it("retorna false na quinta", () => {
      const thursday = new Date(2026, 4, 28, 10, 0, 0);
      expect(isGuestAllowedInMainList(thursday)).toBe(false);
    });
  });

  describe("getNextGameDate", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 25, 10, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("retorna a proxima quarta corretamente", () => {
      expect(getNextGameDate("wednesday")).toBe("2026-05-27");
    });

    it("retorna o proximo domingo corretamente", () => {
      expect(getNextGameDate("sunday")).toBe("2026-05-31");
    });
  });
});
