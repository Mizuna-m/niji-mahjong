"use client";

import { useEffect, useState } from "react";

type Game = {
  uuid: string;
  startTime?: number;
  players?: { seat: number; nickname: string }[];
  endScores?: number[];
};

export default function Page() {
  const [games, setGames] = useState<Game[]>([]);
  const api = process.env.NEXT_PUBLIC_API_BASE;

  useEffect(() => {
    if (!api) return;

    fetch(`${api}/api/games`)
      .then((r) => r.json())
      .then((j) => setGames(j.games ?? []))
      .catch((e) => console.error(e));
  }, [api]);

  return (
    <main style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h1>niji-mahjong web</h1>
      <p>API: {api ?? "(not set)"}</p>

      <h2>Games</h2>
      <ul>
        {games.map((g) => (
          <li key={g.uuid} style={{ marginBottom: 12 }}>
            <div><b>{g.uuid}</b></div>
            <div>
              players:{" "}
              {(g.players ?? [])
                .sort((a, b) => a.seat - b.seat)
                .map((p) => p.nickname)
                .join(" / ")}
            </div>
            <div>endScores: {g.endScores ? g.endScores.join(", ") : "(not found)"}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
