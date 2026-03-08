-- Fix thumbnail_url in product_markets after storage migration.
--
-- Before migration:  thumbnail_url = 'markets/[id]/filename.jpg'
--                    getMarketPublicUrl() → .../markets/markets/[id]/filename.jpg  ← DOUBLE prefix ❌
--
-- After migration:   thumbnail_url = '[id]/filename.jpg'
--                    getMarketPublicUrl() → .../markets/[id]/filename.jpg           ← correct ✅
--
-- NOTE: Records where thumbnail_url does NOT start with 'markets/' are left unchanged
--       (e.g. already-correct paths or NULL values).

UPDATE product_markets
SET thumbnail_url = SUBSTRING(thumbnail_url FROM LENGTH('markets/') + 1)
WHERE thumbnail_url LIKE 'markets/%';
