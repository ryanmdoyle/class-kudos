-- Populate existing records with 6-character random strings
UPDATE "Group" 
SET "publicId" = lower(substr(hex(randomblob(3)), 1, 6))
WHERE "publicId" IS NULL;