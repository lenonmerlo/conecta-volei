/* eslint-disable react-refresh/only-export-components */

// Contexto de autenticacao - compartilha sessao em todo o app

import { createContext, useContext, useEffect, useState } from "react";
import { CURRENT_RULES_VERSION } from "../domain/rulesVersion";
import {
  acceptRulesVersion,
  getPlayerByWhatsapp,
  getPlayerSession,
  registerPlayer,
} from "../services/supabaseService.js";

const SESSION_KEY = "conecta_volei_session";
const AuthContext = createContext({});

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
    rulesAcceptedVersion:
      player.rules_accepted_version ?? player.rulesAcceptedVersion ?? null,
    avatarUrl: player.avatar_url ?? player.avatarUrl ?? null,
    skillLevel: player.skill_level ?? player.skillLevel ?? null,
    createdAt: player.created_at ?? player.createdAt ?? null,
  };
}

function isBlockedByWarnings(player) {
  return Math.max(0, Number(player?.warnings) || 0) >= 3;
}

function isBlockedByInactivity(player) {
  const reasonText = [
    player?.block_reason,
    player?.blocked_reason,
    player?.status_reason,
    player?.suspension_reason,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (reasonText.includes("inativ")) return true;
  return !isBlockedByWarnings(player);
}

function getSession() {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;

  try {
    const parsed = JSON.parse(data);
    return parsed?.id ? normalizePlayer(parsed) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSession);
  const [checkingSession, setCheckingSession] = useState(
    () => Boolean(getSession()?.id),
  );
  const [sessionError, setSessionError] = useState(false);
  const [sessionCheckAttempt, setSessionCheckAttempt] = useState(0);
  const [pendingRegister, setPendingRegister] = useState(null);

  useEffect(() => {
    const savedUser = getSession();
    if (!savedUser?.id) return undefined;

    let active = true;

    async function validateSession() {
      const { player, error } = await getPlayerSession(savedUser.id);
      if (!active) return;

      if (error) {
        setSessionError(true);
        setCheckingSession(false);
        return;
      }

      if (
        !player ||
        player.status === "pending" ||
        player.status === "blocked"
      ) {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
      } else {
        const normalized = normalizePlayer(player);
        localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
        setUser(normalized);
      }

      setSessionError(false);
      setCheckingSession(false);
    }

    validateSession();

    return () => {
      active = false;
    };
  }, [sessionCheckAttempt]);

  function retrySessionCheck() {
    setSessionError(false);
    setCheckingSession(true);
    setSessionCheckAttempt((attempt) => attempt + 1);
  }

  async function login(whatsapp) {
    const member = await getPlayerByWhatsapp(whatsapp);

    if (!member) {
      return {
        success: false,
        error: "WhatsApp nao encontrado. Verifique ou cadastre-se.",
      };
    }

    if (member.status === "pending") {
      return {
        success: false,
        error: "Seu cadastro está aguardando aprovação de um administrador.",
      };
    }

    if (member.status === "blocked") {
      return {
        success: false,
        error: isBlockedByInactivity(member)
          ? "Seu acesso foi suspenso por inatividade. Entre em contato com um administrador para reativação."
          : "Você está suspenso. Entre em contato com um administrador.",
      };
    }

    // Quem ainda não aceitou esta versão entra apenas na página de regras.
    const normalizedMember = normalizePlayer(member);
    localStorage.setItem(SESSION_KEY, JSON.stringify(normalizedMember));
    setUser(normalizedMember);

    return { success: true, member: normalizedMember };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setSessionError(false);
    setCheckingSession(false);
  }

  function updateUser(nextUser) {
    const normalized = normalizePlayer({ ...user, ...nextUser });
    localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    setUser(normalized);
  }

  async function acceptCurrentRules() {
    if (!user?.id) {
      return { success: false, error: "Sessão não encontrada." };
    }

    const result = await acceptRulesVersion(user.id);
    if (!result.success) return result;

    updateUser(result.player);
    return { success: true };
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

    if (!result.success) {
      const errorText = (result.error || "").toLowerCase();
      const isDuplicateWhatsapp =
        errorText.includes("whatsapp") &&
        (errorText.includes("ja esta cadastrado") ||
          errorText.includes("already") ||
          errorText.includes("duplicate") ||
          errorText.includes("unique"));

      if (isDuplicateWhatsapp) {
        return {
          success: false,
          error:
            "Este WhatsApp já está cadastrado. Faça login com esse número ou use outro WhatsApp para cadastro.",
        };
      }

      return result;
    }

    setPendingRegister(null);
    return result;
  }

  const needsRulesAcceptance = Boolean(
    user &&
      (!user.acceptedRules ||
        user.rulesAcceptedVersion !== CURRENT_RULES_VERSION),
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        checkingSession,
        sessionError,
        needsRulesAcceptance,
        retrySessionCheck,
        login,
        logout,
        updateUser,
        acceptCurrentRules,
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
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}