import { supabase } from "../../lib/supabase";

export async function getActiveAnnouncements() {
    const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });

    if (error) return [];
    return data || [];
}

export async function getAllAnnouncements() {
    const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

        if (error) return [];
        return data || [];
}

export async function createAnnouncement({ title, body, urgent }) {
  const { data, error } = await supabase
    .from("announcements")
    .insert({ title, body, urgent: Boolean(urgent), active: true })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, announcement: data };
}

export async function updateAnnouncement(id, { title, body, urgent, active }) {
  const { error } = await supabase
    .from("announcements")
    .update({ title, body, urgent: Boolean(urgent), active: Boolean(active) })
    .eq("id", id);

  return !error;
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);

  return !error;
}