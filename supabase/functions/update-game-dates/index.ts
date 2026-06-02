import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

function getNextGameDate(day: string): string {
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  const targetDay = day === "wednesday" ? 3 : 0;

  let daysUntilTarget = targetDay - dayOfWeek;
  if (daysUntilTarget <= 0) daysUntilTarget += 7;

  const nextDate = new Date(today);
  nextDate.setUTCDate(today.getUTCDate() + daysUntilTarget);

  return nextDate.toISOString().split("T")[0];
}

Deno.serve(async () => {
  const { data: games, error: selectError } = await supabase
    .from("games")
    .select("id, day, date")
    .in("day", ["wednesday", "sunday"]);

  if (selectError) {
    return new Response(
      JSON.stringify({ ok: false, error: selectError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const updates: Array<{ id: string; from: string; to: string }> = [];

  for (const game of games ?? []) {
    const nextDate = getNextGameDate(game.day);
    if (game.date !== nextDate) {
      const { error: updateError } = await supabase
        .from("games")
        .update({ date: nextDate })
        .eq("id", game.id);

      if (updateError) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: updateError.message,
            gameId: game.id,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      updates.push({ id: game.id, from: game.date, to: nextDate });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, updated: updates.length, updates }),
    { headers: { "Content-Type": "application/json" } },
  );
});
