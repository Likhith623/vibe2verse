import {
  createSongAndStartGeneration,
  getSongStatus,
  listSongs,
  deleteSong,
} from "../lib/services/songService";

describe("Song Service pipeline", () => {
  it("creates a song and tracks its generation", async () => {
    const song = await createSongAndStartGeneration(
      {
        personality_input: "Crazy coder who drinks 5 cups of espresso and codes through the night.",
        character_name: "Dev",
        language: "english",
        rap_style: "trap",
        mood: "energetic",
        roast_level: "mild",
        requested_duration_seconds: 45,
      },
      null
    );

    expect(song).toBeDefined();
    expect(song.id).toBeDefined();
    expect(song.title).toContain("Dev");
    expect(song.status).toBe("pending");

    // Check status immediately
    const status = await getSongStatus(song.id);
    expect(status).toBeDefined();
    expect(status?.id).toBe(song.id);

    // List songs includes the created song
    const list = await listSongs(null);
    expect(list.some((s) => s.id === song.id)).toBe(true);

    // Delete song
    const deleted = await deleteSong(song.id);
    expect(deleted).toBe(true);

    const deletedStatus = await getSongStatus(song.id);
    expect(deletedStatus).toBeNull();
  });
});
