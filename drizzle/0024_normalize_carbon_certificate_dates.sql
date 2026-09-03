UPDATE `carbon_certificates`
SET `issued_at` = CASE
	WHEN length(`issued_at`) = 19 AND substr(`issued_at`, 11, 1) = ' '
		THEN substr(`issued_at`, 1, 10) || 'T' || substr(`issued_at`, 12) || '.000Z'
	WHEN length(`issued_at`) = 23 AND substr(`issued_at`, 11, 1) = ' '
		THEN substr(`issued_at`, 1, 10) || 'T' || substr(`issued_at`, 12) || 'Z'
	WHEN length(`issued_at`) = 20 AND substr(`issued_at`, 11, 1) = 'T' AND substr(`issued_at`, -1) = 'Z'
		THEN substr(`issued_at`, 1, 19) || '.000Z'
	ELSE `issued_at`
END
WHERE (length(`issued_at`) IN (19, 23) AND substr(`issued_at`, 11, 1) = ' ')
	OR (length(`issued_at`) = 20 AND substr(`issued_at`, 11, 1) = 'T' AND substr(`issued_at`, -1) = 'Z');
