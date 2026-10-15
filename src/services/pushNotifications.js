import { deleteToken, getToken } from "firebase/messaging";
import {
  firebaseVapidKey,
  getFirebaseMessaging,
} from "../lib/firebase";
import { supabase } from "../lib/supabase";

const PUSH_TOKEN_KEY = "conecta_volei_push_token";

function waitForServiceWorker() {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error("Service worker não ficou pronto."));
      }, 10000);
    }),
  ]);
}

export function getStoredPushToken() {
  return localStorage.getItem(PUSH_TOKEN_KEY);
}

export function getPushPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function isPushSupported() {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator)
  ) {
    return false;
  }

  return Boolean(await getFirebaseMessaging());
}

export async function enablePushNotifications(playerId) {
  try {
    if (!playerId) {
      return {
        success: false,
        error: "Não foi possível identificar o jogador.",
      };
    }

    if (!firebaseVapidKey) {
      return {
        success: false,
        error: "A chave pública de notificações não foi configurada.",
      };
    }

    const messaging = await getFirebaseMessaging();

    if (!messaging) {
      return {
        success: false,
        error: "Este navegador não oferece suporte a notificações.",
      };
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      return {
        success: false,
        error:
          permission === "denied"
            ? "As notificações foram bloqueadas nas configurações do navegador."
            : "A permissão para notificações não foi concedida.",
      };
    }

    const serviceWorkerRegistration = await waitForServiceWorker();

    const token = await getToken(messaging, {
      vapidKey: firebaseVapidKey,
      serviceWorkerRegistration,
    });

    if (!token) {
      return {
        success: false,
        error: "O celular não forneceu um token de notificação.",
      };
    }

    const { error } = await supabase.rpc("save_push_subscription", {
      p_player_id: playerId,
      p_token: token,
      p_user_agent: navigator.userAgent,
    });

    if (error) {
      console.error("[Push] Falha ao salvar inscrição:", error);
      return {
        success: false,
        error: "Não foi possível salvar a inscrição de notificações.",
      };
    }

    localStorage.setItem(PUSH_TOKEN_KEY, token);

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error("[Push] Falha ao ativar notificações:", error);

    return {
      success: false,
      error:
        "Não foi possível ativar as notificações. Tente novamente pelo aplicativo instalado.",
    };
  }
}

export async function disablePushNotifications(playerId) {
  try {
    const token = getStoredPushToken();

    if (!token) {
      return { success: true };
    }

    const { error } = await supabase.rpc("disable_push_subscription", {
      p_player_id: playerId,
      p_token: token,
    });

    if (error) {
      console.error("[Push] Falha ao desativar inscrição:", error);
      return {
        success: false,
        error: "Não foi possível desativar as notificações.",
      };
    }

    const messaging = await getFirebaseMessaging();

    if (messaging) {
      await deleteToken(messaging);
    }

    localStorage.removeItem(PUSH_TOKEN_KEY);

    return { success: true };
  } catch (error) {
    console.error("[Push] Falha ao desativar notificações:", error);

    return {
      success: false,
      error: "Não foi possível desativar as notificações.",
    };
  }
}