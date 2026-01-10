// app/src/routes/tournamentMeta.cjs

function mountTournamentMetaRoutes(app) {
  // 大会メタ（フロントがUIを組むための固定情報）
  app.get("/api/tournament/meta", async (_req, res) => {
    res.json({
      season: "にじさんじ麻雀杯2026", // 適当に。必要なら env や yaml に寄せてもOK
      qualifier: {
        mode: "tonpuu",
        groups: 24,         // 24グループ
        playersPerGroup: 4, // 1グループ4人
        gamesPerPlayer: 1,  // 1人1回のみ
        startPoints: 30000, // 30000点持ちスタート
        useRawPoints: true, // 素点そのまま（原点を引かない）
        tieBreak: "seat_order", // 同点は席順が先(=seatが小さい)が上
        wildcardSlots: 4,   // ワイルドカード4名
      },
      finals: [
        // あとで確定したら埋める。無ければ空配列でOK
        // { name: "決勝T1回戦", mode: "tonpuu", players: 32, advance: 16 },
      ],
    });
  });
}

module.exports = { mountTournamentMetaRoutes };
