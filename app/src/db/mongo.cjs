// app/src/db/mongo.cjs
const { MongoClient } = require("mongodb");

const MONGO_URL = process.env.MONGO_URL || "mongodb://mongo:27017/niji";

async function connectMongo() {
  const mongoClient = new MongoClient(MONGO_URL);
  await mongoClient.connect();
  const db = mongoClient.db();

  const colRaw = db.collection("games_raw");
  const colDerived = db.collection("games_derived");

  await colDerived.createIndex({ startTime: 1 });

  return {
    mongoClient,
    db,
    colRaw,
    colDerived,
  };
}

module.exports = { connectMongo };
