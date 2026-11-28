CREATE TYPE "GroupCardColor" AS ENUM (
  'Default',
  'Stone',
  'BlueGray',
  'Sage',
  'Sand',
  'Lavender',
  'Teal'
);

ALTER TABLE "groups"
ADD COLUMN "cardColor" "GroupCardColor" NOT NULL DEFAULT 'Default';
