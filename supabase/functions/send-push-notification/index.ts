import { createClient } from "npm:@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "npm:jose@6";

type NotificationType =
  | "test"
  | "list_open"
  | "announcement"
  | "promotion"
  | "reminder";

type NotificationRequest = {
  title: string;
  body: string;
  url?: string;
  type?: NotificationType;
  playerId?: string;
};

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri: string;
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function readServiceAccount(): FirebaseServiceAccount {
  const encoded = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_BASE64");

  if (!encoded) {
    throw new Error("Credencial do Firebase não configurada.");
  }

  const bytes = Uint8Array.from(atob(encoded), (character) =>
    character.charCodeAt(0),
  );

  const decoded = new TextDecoder().decode(bytes);
  return JSON.parse(decoded);
}

async function getFirebaseAccessToken(
  serviceAccount: FirebaseServiceAccount,
) {
  const privateKey = await importPKCS8(
    serviceAccount.private_key,
    "RS256",
  );

  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({
      alg: "RS256",
      typ: "JWT",
    })
    .setIssuer(serviceAccount.client_email)
    .setAudience(serviceAccount.token_uri)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);

  const response = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.access_token) {
    console.error("[Push] Falha ao autenticar no Firebase:", result);
    throw new Error("Não foi possível autenticar no Firebase.");
  }

  return result.access_token as string;
}

function getPreferenceColumn(type: NotificationType) {
  const columns: Partial<Record<NotificationType, string>> = {
    list_open: "notify_list_open",
    announcement: "notify_announcements",
    promotion: "notify_promotions",
    reminder: "notify_reminders",
  };

  return columns[type] || null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  const expectedSecret = Deno.env.get("PUSH_INTERNAL_SECRET");
  const receivedSecret = request.headers.get("x-push-secret");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return jsonResponse({ error: "Não autorizado." }, 401);
  }

  try {
    const payload = (await request.json()) as NotificationRequest;

    const title = payload.title?.trim();
    const body = payload.body?.trim();
    const url = payload.url?.trim() || "/";
    const type = payload.type || "test";

    if (!title || !body) {
      return jsonResponse(
        { error: "Título e mensagem são obrigatórios." },
        400,
      );
    }

    const validTypes: NotificationType[] = [
      "test",
      "list_open",
      "announcement",
      "promotion",
      "reminder",
    ];

    if (!validTypes.includes(type)) {
      return jsonResponse({ error: "Tipo de notificação inválido." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Configuração interna do Supabase ausente.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let subscriptionsQuery = supabase
      .from("push_subscriptions")
      .select("id, token")
      .eq("enabled", true);

    if (payload.playerId) {
      subscriptionsQuery = subscriptionsQuery.eq(
        "player_id",
        payload.playerId,
      );
    }

    const preferenceColumn = getPreferenceColumn(type);

    if (preferenceColumn) {
      subscriptionsQuery = subscriptionsQuery.eq(preferenceColumn, true);
    }

    const { data: subscriptions, error: subscriptionsError } =
      await subscriptionsQuery;

    if (subscriptionsError) {
      console.error(
        "[Push] Falha ao buscar inscrições:",
        subscriptionsError,
      );
      throw new Error("Não foi possível carregar os destinatários.");
    }

    if (!subscriptions?.length) {
      return jsonResponse({
        success: true,
        sent: 0,
        failed: 0,
        message: "Nenhum dispositivo habilitado.",
      });
    }

    const serviceAccount = readServiceAccount();
    const accessToken = await getFirebaseAccessToken(serviceAccount);

    const endpoint =
      `https://fcm.googleapis.com/v1/projects/` +
      `${serviceAccount.project_id}/messages:send`;

    const results = await Promise.all(
      subscriptions.map(async (subscription) => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: subscription.token,
              notification: {
                title,
                body,
              },
              data: {
                type,
                url,
                tag: `conecta-volei-${type}`,
              },
            },
          }),
        });

        const responseBody = await response.json();

        return {
          subscriptionId: subscription.id,
          success: response.ok,
          status: response.status,
          responseBody,
        };
      }),
    );

    const invalidSubscriptionIds = results
      .filter(({ success, status, responseBody }) => {
        if (success) return false;

        const responseText = JSON.stringify(responseBody);
        return (
          status === 404 ||
          responseText.includes("UNREGISTERED") ||
          responseText.includes("registration-token-not-registered")
        );
      })
      .map(({ subscriptionId }) => subscriptionId);

    if (invalidSubscriptionIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .update({
          enabled: false,
          updated_at: new Date().toISOString(),
        })
        .in("id", invalidSubscriptionIds);
    }

    const sent = results.filter((result) => result.success).length;
    const failed = results.length - sent;

    if (failed > 0) {
      console.error(
        "[Push] Alguns envios falharam:",
        results.filter((result) => !result.success),
      );
    }

    return jsonResponse({
      success: failed === 0,
      sent,
      failed,
    });
  } catch (error) {
    console.error("[Push] Erro inesperado:", error);

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao enviar notificações.",
      },
      500,
    );
  }
});