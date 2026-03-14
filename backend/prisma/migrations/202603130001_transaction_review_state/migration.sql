ALTER TABLE "transactions"
ADD COLUMN "reviewState" TEXT NOT NULL DEFAULT 'UNREVIEWED';

UPDATE "transactions"
SET "reviewState" = CASE
    WHEN "isPersonal" IS FALSE THEN 'SPLIT'
    ELSE 'PERSONAL'
END
WHERE "reviewState" = 'UNREVIEWED';

CREATE INDEX "transactions_authorId_reviewState_idx"
ON "transactions"("authorId", "reviewState");
