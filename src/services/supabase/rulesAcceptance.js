import { CURRENT_RULES_VERSION } from "../../domain/rulesVersion";
import { supabase } from "../../lib/supabase";

export async function getPlayerSession(playerId) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle();

  return { player: data || null, error };
}

export async function acceptRulesVersion(playerId) {
  const { data, error } = await supabase
    .from("players")
    .update({
      accepted_rules: true,
      rules_accepted_version: CURRENT_RULES_VERSION,
    })
    .eq("id", playerId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Não foi possível salvar o aceite das regras.",
    };
  }

  return { success: true, player: data };
}