// Sistema de badges/conquistas do Conecta Volei

import { createElement } from "react";

const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(type, props = {}, children = []) {
  return createElement(type, props, ...children);
}

function iconFrame(size, children) {
  return svgElement(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 64 64",
      fill: "none",
      xmlns: SVG_NS,
      role: "img",
      "aria-hidden": true,
    },
    children,
  );
}

function iconForBadge(id, size) {
  const commonBg = svgElement("circle", {
    cx: 32,
    cy: 32,
    r: 30,
    fill: "#0F2740",
    stroke: "#2C6A9B",
    strokeWidth: 2,
  });

  const definitions = {
    first_game: iconFrame(size, [
      commonBg,
      svgElement("circle", { cx: 32, cy: 32, r: 16, fill: "#2DB3FF" }),
      svgElement("path", {
        d: "M24 34c3-8 13-8 16 0 0 0-4 4-8 4s-8-4-8-4z",
        fill: "#F2FBFF",
      }),
      svgElement("path", {
        d: "M32 18l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z",
        fill: "#8BD9FF",
      }),
    ]),
    ten_games: iconFrame(size, [
      commonBg,
      svgElement("path", {
        d: "M32 12c8 8 14 14 14 24a14 14 0 1 1-28 0c0-10 6-16 14-24z",
        fill: "#FF8A3C",
      }),
      svgElement("path", {
        d: "M32 24c4 4 6 7 6 12a6 6 0 1 1-12 0c0-5 2-8 6-12z",
        fill: "#FFD4A3",
      }),
    ]),
    twenty_five_games: iconFrame(size, [
      commonBg,
      svgElement("path", {
        d: "M20 16h24v6c0 8-5 14-12 16-7-2-12-8-12-16v-6z",
        fill: "#2A8EEA",
      }),
      svgElement("path", {
        d: "M24 44h16v8H24z",
        fill: "#8CC8FF",
      }),
      svgElement("path", {
        d: "M32 24l2.5 5 5.5.8-4 4 .9 5.7-4.9-2.6-4.9 2.6.9-5.7-4-4 5.5-.8L32 24z",
        fill: "#E6F4FF",
      }),
    ]),
    fifty_games: iconFrame(size, [
      svgElement("path", {
        d: "M32 8l18 7v14c0 13-8 22-18 27-10-5-18-14-18-27V15l18-7z",
        fill: "#D4A54B",
        stroke: "#FFE2A2",
        strokeWidth: 2,
      }),
      svgElement("circle", { cx: 32, cy: 29, r: 8, fill: "#FFF2CE" }),
      svgElement("path", { d: "M24 44h16", stroke: "#FFF2CE", strokeWidth: 3 }),
    ]),
    hundred_games: iconFrame(size, [
      commonBg,
      svgElement("path", {
        d: "M20 46h24v6H20z",
        fill: "#7B5CFF",
      }),
      svgElement("path", {
        d: "M22 24l5 4 5-8 5 8 5-4v12H22V24z",
        fill: "#BFAAFF",
      }),
      svgElement("circle", { cx: 32, cy: 18, r: 4, fill: "#F5EDFF" }),
    ]),
    five_streak: iconFrame(size, [
      commonBg,
      svgElement("path", {
        d: "M34 10L20 34h10l-2 20 16-26H34z",
        fill: "#FFB347",
      }),
      svgElement("path", {
        d: "M36 16L27 33h6l-1 10 9-15h-5z",
        fill: "#FFE0A6",
      }),
    ]),
    ten_streak: iconFrame(size, [
      commonBg,
      svgElement("circle", { cx: 32, cy: 32, r: 14, fill: "#1F8EF1" }),
      svgElement("circle", {
        cx: 32,
        cy: 32,
        r: 9,
        stroke: "#DDF1FF",
        strokeWidth: 3,
      }),
      svgElement("path", {
        d: "M32 22v10l7 4",
        stroke: "#DDF1FF",
        strokeWidth: 3,
      }),
    ]),
    host: iconFrame(size, [
      commonBg,
      svgElement("circle", { cx: 24, cy: 27, r: 7, fill: "#79D7A8" }),
      svgElement("circle", { cx: 40, cy: 27, r: 7, fill: "#79D7A8" }),
      svgElement("path", {
        d: "M16 45c2-6 8-9 16-9s14 3 16 9",
        stroke: "#B8F4D7",
        strokeWidth: 3,
      }),
    ]),
    captain: iconFrame(size, [
      commonBg,
      svgElement("polygon", {
        points: "32,12 37,24 50,24 40,32 44,46 32,38 20,46 24,32 14,24 27,24",
        fill: "#FFD15C",
      }),
      svgElement("circle", { cx: 32, cy: 32, r: 3, fill: "#FFF6DD" }),
    ]),
    setter: iconFrame(size, [
      commonBg,
      svgElement("circle", {
        cx: 32,
        cy: 32,
        r: 14,
        stroke: "#9CDAFF",
        strokeWidth: 3,
      }),
      svgElement("path", {
        d: "M22 32h20M32 22v20",
        stroke: "#9CDAFF",
        strokeWidth: 3,
      }),
      svgElement("circle", { cx: 32, cy: 32, r: 4, fill: "#DDF4FF" }),
    ]),
    monster_block: iconFrame(size, [
      svgElement("defs", {}, [
        svgElement(
          "linearGradient",
          {
            id: "monster-block-bg",
            x1: "8",
            y1: "8",
            x2: "56",
            y2: "56",
            gradientUnits: "userSpaceOnUse",
          },
          [
            svgElement("stop", { offset: "0", stopColor: "#2A5BFF" }),
            svgElement("stop", { offset: "1", stopColor: "#6E39B7" }),
          ],
        ),
      ]),
      svgElement("path", {
        d: "M32 9l17 7v13c0 12-7 20-17 25-10-5-17-13-17-25V16l17-7z",
        fill: "url(#monster-block-bg)",
        stroke: "#BFD5FF",
        strokeWidth: 2,
      }),
      svgElement("path", {
        d: "M24 34v-7c0-2 1-4 4-4 2 0 3 1 4 2l1-1c1-1 3-1 4 0 1 1 1 2 1 3l1-1c1-1 3-1 4 0 1 1 1 3 0 4l-5 6c-1 1-2 2-4 2h-7c-2 0-3-2-3-4z",
        fill: "#E7F0FF",
      }),
      svgElement("path", {
        d: "M23 44h18",
        stroke: "#C8DCFF",
        strokeWidth: 3,
        strokeLinecap: "round",
      }),
    ]),
    super_spike: iconFrame(size, [
      svgElement("defs", {}, [
        svgElement(
          "linearGradient",
          {
            id: "super-spike-bg",
            x1: "10",
            y1: "10",
            x2: "54",
            y2: "54",
            gradientUnits: "userSpaceOnUse",
          },
          [
            svgElement("stop", { offset: "0", stopColor: "#FF5A36" }),
            svgElement("stop", { offset: "1", stopColor: "#FFB248" }),
          ],
        ),
      ]),
      svgElement("circle", {
        cx: 32,
        cy: 32,
        r: 28,
        fill: "#31120B",
        stroke: "#FF9A6C",
        strokeWidth: 2,
      }),
      svgElement("path", {
        d: "M33 14l-8 14h7l-3 10 12-16h-8l4-8z",
        fill: "url(#super-spike-bg)",
      }),
      svgElement("circle", { cx: 44, cy: 20, r: 7, fill: "#FFE4C6" }),
      svgElement("path", {
        d: "M38 20h12M44 14v12",
        stroke: "#FF8E43",
        strokeWidth: 2,
      }),
    ]),
    guardian: iconFrame(size, [
      svgElement("defs", {}, [
        svgElement(
          "linearGradient",
          {
            id: "guardian-shield",
            x1: "12",
            y1: "12",
            x2: "52",
            y2: "52",
            gradientUnits: "userSpaceOnUse",
          },
          [
            svgElement("stop", { offset: "0", stopColor: "#2EA36D" }),
            svgElement("stop", { offset: "1", stopColor: "#B9983D" }),
          ],
        ),
      ]),
      svgElement("path", {
        d: "M32 10l16 6v12c0 13-7 21-16 26-9-5-16-13-16-26V16l16-6z",
        fill: "url(#guardian-shield)",
        stroke: "#F4E5A7",
        strokeWidth: 2,
      }),
      svgElement("path", {
        d: "M32 20l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9L32 20z",
        fill: "#FFF5CD",
      }),
    ]),
  };

  return definitions[id] || iconFrame(size, [commonBg]);
}

export function BadgeIcon({ id, size = 40, dimmed = false }) {
  return createElement(
    "span",
    {
      style: {
        display: "inline-flex",
        width: size,
        height: size,
        opacity: dimmed ? 0.35 : 1,
        filter: dimmed ? "grayscale(1)" : "none",
      },
    },
    iconForBadge(id, size),
  );
}

export const BADGES = [
  {
    id: "first_game",
    label: "Estreante",
    description: "Participou do primeiro jogo",
    condition: (stats) => stats.totalGames >= 1,
  },
  {
    id: "ten_games",
    label: "Frequentador",
    description: "10 jogos participados",
    condition: (stats) => stats.totalGames >= 10,
  },
  {
    id: "twenty_five_games",
    label: "Dedicado",
    description: "25 jogos participados",
    condition: (stats) => stats.totalGames >= 25,
  },
  {
    id: "fifty_games",
    label: "Veterano",
    description: "50 jogos participados",
    condition: (stats) => stats.totalGames >= 50,
  },
  {
    id: "hundred_games",
    label: "Lenda",
    description: "100 jogos participados",
    condition: (stats) => stats.totalGames >= 100,
  },
  {
    id: "five_streak",
    label: "Em Chama",
    description: "5 domingos seguidos sem faltar",
    condition: (stats) => stats.currentStreak >= 5,
  },
  {
    id: "ten_streak",
    label: "Comprometido",
    description: "10 domingos seguidos sem faltar",
    condition: (stats) => stats.currentStreak >= 10,
  },
  {
    id: "host",
    label: "Anfitriao",
    description: "Trouxe 10 convidados",
    condition: (stats) => stats.totalGuests >= 10,
  },
  {
    id: "captain",
    label: "Capitao",
    description: "Capitao do time",
    condition: (stats) => stats.isCaptain,
  },
  {
    id: "setter",
    label: "Levantador",
    description: "Levantador do time",
    condition: (stats) => stats.isSetter,
  },
  {
    id: "monster_block",
    icon: null,
    label: "Monster Block",
    description: "Bloqueador excepcional do grupo",
    condition: (stats) => stats.badgeMonsterBlock,
  },
  {
    id: "super_spike",
    icon: null,
    label: "Super Spike",
    description: "Atacante excepcional do grupo",
    condition: (stats) => stats.badgeSuperSpike,
  },
  {
    id: "guardian",
    icon: null,
    label: "Guardian",
    description: "Defensor excepcional do grupo",
    condition: (stats) => stats.badgeGuardian,
  },
];

export function getEarnedBadges(stats) {
  return BADGES.filter((badge) => badge.condition(stats));
}
