import { useEffect, useState } from "react";
import Button from "../Button/Button";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushPermission,
  getStoredPushToken,
  isPushSupported,
} from "../../services/pushNotifications";
import "./NotificationSettings.css";

function NotificationSettings({ playerId }) {
  const [checking, setChecking] = useState(true);
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState(getPushPermission);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSupport() {
      const hasSupport = await isPushSupported();

      if (!active) return;

      setSupported(hasSupport);
      setPermission(getPushPermission());
      setEnabled(
        hasSupport &&
          getPushPermission() === "granted" &&
          Boolean(getStoredPushToken()),
      );
      setChecking(false);
    }

    checkSupport();

    return () => {
      active = false;
    };
  }, []);

  async function handleEnable() {
    setSaving(true);
    setMessage("");
    setError("");

    const result = await enablePushNotifications(playerId);

    setSaving(false);
    setPermission(getPushPermission());

    if (!result.success) {
      setError(result.error);
      return;
    }

    setEnabled(true);
    setMessage("Notificações ativadas neste dispositivo.");
  }

  async function handleDisable() {
    setSaving(true);
    setMessage("");
    setError("");

    const result = await disablePushNotifications(playerId);

    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setEnabled(false);
    setMessage("Notificações desativadas neste dispositivo.");
  }

  if (checking) {
    return (
      <section className="notification-settings">
        <p className="notification-settings__status">
          Verificando notificações...
        </p>
      </section>
    );
  }

  if (!supported) {
    return (
      <section className="notification-settings">
        <h3 className="notification-settings__title">Notificações</h3>
        <p className="notification-settings__description">
          Este navegador ou dispositivo não oferece suporte a notificações.
        </p>
      </section>
    );
  }

  return (
    <section className="notification-settings">
      <div className="notification-settings__header">
        <div>
          <h3 className="notification-settings__title">Notificações</h3>
          <p className="notification-settings__description">
            Receba avisos sobre abertura da lista, comunicados, promoções e
            lembretes.
          </p>
        </div>

        <span
          className={`notification-settings__badge ${
            enabled ? "notification-settings__badge--enabled" : ""
          }`}
        >
          {enabled ? "Ativadas" : "Desativadas"}
        </span>
      </div>

      {permission === "denied" && (
        <p className="notification-settings__warning">
          As notificações estão bloqueadas. Libere a permissão nas configurações
          do navegador ou do aplicativo.
        </p>
      )}

      {enabled ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDisable}
          disabled={saving}
        >
          {saving ? "Desativando..." : "Desativar notificações"}
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={handleEnable}
          disabled={saving || permission === "denied"}
        >
          {saving ? "Ativando..." : "Ativar notificações"}
        </Button>
      )}

      {message && (
        <p className="notification-settings__success">{message}</p>
      )}

      {error && <p className="notification-settings__error">{error}</p>}
    </section>
  );
}

export default NotificationSettings;