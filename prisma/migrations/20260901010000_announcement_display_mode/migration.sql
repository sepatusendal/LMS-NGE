-- Lets an announcement render as either the inline dashboard banner
-- (default, low-friction) or a blocking modal popup (for something the
-- admin wants every user to actively acknowledge before continuing).

CREATE TYPE "AnnouncementDisplayMode" AS ENUM ('BANNER', 'POPUP');

ALTER TABLE public.announcements
  ADD COLUMN "displayMode" "AnnouncementDisplayMode" NOT NULL DEFAULT 'BANNER';
