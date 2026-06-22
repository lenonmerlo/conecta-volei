import { describe, expect, it } from "vitest";
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
        getHours: () => 19,
        getMinutes: () => 0,
      };

      expect(isMemberPriorityWindow(thursday19h)).toBe(true);
    });

    it("retorna false fora da janela (quinta 18h)", () => {
      const thursday18h = {
        getDay: () => 4,
        getHours: () => 18,
        getMinutes: () => 0,
      };

      expect(isMemberPriorityWindow(thursday18h)).toBe(false);
    });

    it("retorna true na sexta durante a janela", () => {
      const friday22h = {
        getDay: () => 5,
        getHours: () => 22,
        getMinutes: () => 10,
      };

      expect(isMemberPriorityWindow(friday22h)).toBe(true);
    });

    it("retorna false fora da janela (sabado)", () => {
      const saturday = {
        getDay: () => 6,
        getHours: () => 0,
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
    it("mantem a quarta atual quando hoje e quarta", () => {
      const wednesday = new Date(2026, 5, 3, 10, 0, 0);
      expect(getNextGameDate("wednesday", wednesday)).toBe("2026-06-03");
    });

    it("avanca para a proxima quarta apos virar para quinta", () => {
      const thursday = new Date(2026, 5, 4, 0, 0, 1);
      expect(getNextGameDate("wednesday", thursday)).toBe("2026-06-10");
    });

    it("mantem o domingo atual quando hoje e domingo", () => {
      const sunday = new Date(2026, 5, 7, 10, 0, 0);
      expect(getNextGameDate("sunday", sunday)).toBe("2026-06-07");
    });

    it("avanca para o proximo domingo apos virar para segunda", () => {
      const monday = new Date(2026, 5, 8, 0, 0, 1);
      expect(getNextGameDate("sunday", monday)).toBe("2026-06-14");
    });
  });
});
