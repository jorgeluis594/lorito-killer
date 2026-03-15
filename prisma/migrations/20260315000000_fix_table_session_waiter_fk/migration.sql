-- FixForeignKey: waiterId was NOT NULL but FK had ON DELETE SET NULL (contradiction)
-- Change to ON DELETE RESTRICT to prevent deleting users with active sessions
ALTER TABLE "TableSession" DROP CONSTRAINT "TableSession_waiterId_fkey";

ALTER TABLE "TableSession" ADD CONSTRAINT "TableSession_waiterId_fkey"
  FOREIGN KEY ("waiterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
