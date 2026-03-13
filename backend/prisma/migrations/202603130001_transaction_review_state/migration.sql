ALTER TABLE "transactions"
ADD COLUMN "reviewState" TEXT NOT NULL DEFAULT 'UNREVIEWED';

UPDATE "transactions"
SET "reviewState" = CASE
    WHEN "isPersonal" = false THEN 'SPLIT'
    ELSE 'PERSONAL'
END;

CREATE INDEX "transactions_authorId_reviewState_idx"
ON "transactions"("authorId", "reviewState");
