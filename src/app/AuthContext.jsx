/* eslint-disable react-refresh/only-export-components */

// Contexto de autenticacao - compartilha sessao em todo o app

import { createContext, useContext, useState } from "react";
import { getPlayerByWhatsapp, registerPlayer } from "../data/supabaseService";

const SESSION_KEY = "conecta_volei_session";

const AuthContext = createContext(null);

function normalizePlayer(player) {
  if (!player) return null;

  return {
    id: player.id,
    name: player.name,
    nickname: player.nickname || null,
    whatsapp: player.whatsapp,
    gender: player.gender,
    type: player.type,
    status: player.status,
    acceptedRules:
      typeof player.accepted_rules === "boolean"
        ? player.accepted_rules
        : player.acceptedRules,
    avatarUrl: player.avatar_url ?? player.avatarUrl ?? null,
    skillLevel: player.skill_level ?? player.skillLevel ?? null,
    createdAt: player.created_at ?? player.createdAt ?? null,
  };
}

function getSession() {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSession());
  const [pendingRegister, setPendingRegister] = useState(null);

  async function login(whatsapp) {
    const member = await getPlayerByWhatsapp(whatsapp);

    if (!member) {
      return {
        success: false,
        error: "WhatsApp nao encontrado. Verifique ou cadastre-se.",
      };
    }

    const acceptedRules =
      typeof member.accepted_rules === "boolean"
        ? member.accepted_rules
        : member.acceptedRules;

    if (!acceptedRules) {
      return {
        success: false,
        error: "Voce precisa aceitar as regras para acessar.",
      };
    }

    const normalizedMember = normalizePlayer(member);
    localStorage.setItem(SESSION_KEY, JSON.stringify(normalizedMember));
    setUser(normalizedMember);
    return { success: true, member: normalizedMember };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  function updateUser(nextUser) {
    const normalized = normalizePlayer(nextUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    setUser(normalized);
  }

  function savePendingRegister(formData) {
    setPendingRegister(formData);
  }

  async function commitRegister() {
    if (!pendingRegister) {
      return { success: false, error: "Nenhum cadastro pendente." };
    }

    const player = {
      name: pendingRegister.name.trim(),
      nickname: pendingRegister.nickname.trim() || null,
      whatsapp: pendingRegister.whatsapp.trim(),
      gender: pendingRegister.gender,
    };

    const result = await registerPlayer(player);
    if (result.success) {
      setPendingRegister(null);
    }
    return result;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        pendingRegister,
        savePendingRegister,
        commitRegister,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
