import mongoose, { Schema, Types, type Model } from "mongoose";
import type { AuthSession, SessionRepository } from "../../domain/session.js";

interface SessionDocument {
  userId: Types.ObjectId;
  tokenHash: string;
  csrfHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

const schema = new Schema<SessionDocument>({
  userId: { type: Schema.Types.ObjectId, required: true },
  tokenHash: { type: String, required: true },
  csrfHash: { type: String, required: true },
  createdAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
}, { collection: "authSessions", autoCreate: false, autoIndex: false });
schema.index({ tokenHash: 1 }, { unique: true, name: "uq_auth_sessions_token" });
schema.index({ userId: 1, revokedAt: 1 }, { name: "ix_auth_sessions_user" });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "ttl_auth_sessions_expiry" });

const SessionModel: Model<SessionDocument> = (mongoose.models.AuthSession as Model<SessionDocument> | undefined)
  ?? mongoose.model<SessionDocument>("AuthSession", schema, "authSessions");

// Tạo collection và index cho phiên đăng nhập
export async function ensureAuthSessionIndexes(): Promise<void> {
  await SessionModel.createCollection();
  await SessionModel.createIndexes();
}

// Ánh xạ document thành AuthSession
function mapSession(doc: SessionDocument & { _id: Types.ObjectId }): AuthSession {
  return {
    id: String(doc._id), userId: String(doc.userId), tokenHash: doc.tokenHash,
    csrfHash: doc.csrfHash, expiresAt: doc.expiresAt, revokedAt: doc.revokedAt,
  };
}

// Repository phiên đăng nhập (cookie session)
export function mongoSessionRepository(): SessionRepository {
  return {
    // Tạo phiên đăng nhập mới
    async create(session) {
      await SessionModel.create({
        userId: new Types.ObjectId(session.userId), tokenHash: session.tokenHash,
        csrfHash: session.csrfHash, createdAt: new Date(), expiresAt: session.expiresAt,
      });
    },
    // Tìm phiên còn hiệu lực theo token hash
    async findActive(tokenHash, now) {
      const doc = await SessionModel.findOne({
        tokenHash, revokedAt: null, expiresAt: { $gt: now },
      }).lean();
      return doc ? mapSession(doc) : null;
    },
    // Thu hồi một phiên theo token hash
    async revoke(tokenHash, now) {
      await SessionModel.updateOne({ tokenHash, revokedAt: null }, { $set: { revokedAt: now } });
    },
    // Thu hồi mọi phiên đang hoạt động của user
    async revokeUser(userId, now) {
      await SessionModel.updateMany(
        { userId: new Types.ObjectId(userId), revokedAt: null },
        { $set: { revokedAt: now } },
      );
    },
  };
}
