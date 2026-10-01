import { ConversationModel } from "../models/conversation.model";

// Targeted migration: retains every conversation and message. Never sync all indexes.
export async function migrateConversationIndex() {
  const collection = ConversationModel.collection;
  let indexes;
  try {
    indexes = await collection.indexes();
  } catch (error) {
    if ((error as { code?: number }).code !== 26) throw error;
    await ConversationModel.createIndexes();
    return;
  }
  const legacy = indexes.find((index) => index.unique &&
    Object.keys(index.key).length === 1 && index.key.participants === 1);
  if (!legacy) {
    await ConversationModel.createIndexes();
    return;
  }

  for await (const row of collection.find({}, { projection: { participants: 1 } })) {
    const participantKey = row.participants.map(String).sort().join(":");
    await collection.updateOne({ _id: row._id }, { $set: { participantKey } });
  }
  await collection.createIndex({ participantKey: 1 }, { unique: true, sparse: true });
  await collection.dropIndex(legacy.name!);
  await collection.createIndex({ participants: 1 });
  await ConversationModel.createIndexes();
}
