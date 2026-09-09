# infra/db/

Mongoose implementations of domain repository ports — one `mongo-<entity>-repository.ts`
per port — plus DB utilities (seeding). Nothing outside `infra/` touches Mongoose.
