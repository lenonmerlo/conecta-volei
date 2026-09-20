import { supabase } from "../../lib/supabase";

export async function uploadAvatar(playerId, file) {
    const ext = file.name.split(".").pop();
    const path = `${playerId}.${ext}`;

    const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

        if (error) return {
            success: false, error: error.message
        };

        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        return { success: true, url: data.publicUrl };
}

export async function updatePlayerAvatar(playerId, avatarUrl) {
    const { error } = await supabase
        .from("players")
        .update({ avatar_url: avatarUrl })
        .eq("id", playerId);

    return !error;
}