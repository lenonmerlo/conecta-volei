// Servico de autenticacao local (fake - substituir por Supabase Auth futuramente)

const SESSION_KEY = "conecta_volei_session";
const MEMBERS_KEY = "conecta_volei_members";

export function register(player) {
  const members = getRegisteredMembers();
  const alreadyExists = members.find((m) => m.whatsapp === player.whatsapp);
  if (alreadyExists) {
    return { success: false, error: "Este WhatsApp ja esta cadastrado." };
  }
  members.push(player);
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  return { success: true };
}

export function login(whatsapp) {
  const members = getRegisteredMembers();
  const member = members.find((m) => m.whatsapp === whatsapp);
  if (!member) {
    return {
      success: false,
      error: "WhatsApp nao encontrado. Verifique ou cadastre-se.",
    };
  }
  if (!member.acceptedRules) {
    return {
      success: false,
      error: "Voce precisa aceitar as regras para acessar.",
    };
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(member));
  return { success: true, member };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession() {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

export function getRegisteredMembers() {
  const data = localStorage.getItem(MEMBERS_KEY);
  return data ? JSON.parse(data) : [];
}

export function updateMember(updated) {
  const members = getRegisteredMembers();
  const index = members.findIndex((m) => m.id === updated.id);
  if (index >= 0) {
    members[index] = updated;
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  }
}
