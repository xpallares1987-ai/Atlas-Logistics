UPDATE `carbon_certificates`
SET `issued_at` = replace(replace(`issued_at`, 'T', ' '), 'Z', '')
WHERE `issued_at` LIKE '%T%';
