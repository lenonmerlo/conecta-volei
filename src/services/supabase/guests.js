import { supabase } from "../../lib/supabase";

export async function registerGuest(
  name,
  gender,
  invitedById,
  isSetter = false,
) {
  const guestName = (name || "").trim();

  if (!guestName) {
    return { success: false, error: "Nome do convidado é obrigatório." };
  }

  const { data, error } = await supabase
    .from("guests")
    .insert({
      name: guestName,
      gender,
      skill_level: 3,
      invited_by: invitedById,
      is_setter: isSetter,
    })
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, guest: data };
}

export async function updateGuestLevel(guestId, level) {
  const { error } = await supabase
    .from("guests")
    .update({ skill_level: Number(level) })
    .eq("id", guestId);

  return !error;
}