ALTER TABLE `carbon_calculations` ADD `search_text_normalized` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE `carbon_calculations`
SET `search_text_normalized` = lower(
  `reference_code` || ' ' || `origin_city` || ' ' || `destination_city`
);
--> statement-breakpoint
UPDATE `carbon_calculations`
SET `search_text_normalized` =
  replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
  replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
  `search_text_normalized`,
  'À', 'a'), 'Á', 'a'), 'Â', 'a'), 'Ã', 'a'), 'Ä', 'a'),
  'Å', 'a'), 'à', 'a'), 'á', 'a'), 'â', 'a'), 'ã', 'a'),
  'ä', 'a'), 'å', 'a'), 'È', 'e'), 'É', 'e'), 'Ê', 'e'),
  'Ë', 'e'), 'è', 'e'), 'é', 'e'), 'ê', 'e'), 'ë', 'e');
--> statement-breakpoint
UPDATE `carbon_calculations`
SET `search_text_normalized` =
  replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
  replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
  replace(replace(replace(replace(replace(replace(replace(replace(
  `search_text_normalized`,
  'Ì', 'i'), 'Í', 'i'), 'Î', 'i'), 'Ï', 'i'), 'ì', 'i'),
  'í', 'i'), 'î', 'i'), 'ï', 'i'), 'Ò', 'o'), 'Ó', 'o'),
  'Ô', 'o'), 'Õ', 'o'), 'Ö', 'o'), 'Ø', 'o'), 'ò', 'o'),
  'ó', 'o'), 'ô', 'o'), 'õ', 'o'), 'ö', 'o'), 'ø', 'o'),
  'Ù', 'u'), 'Ú', 'u'), 'Û', 'u'), 'Ü', 'u'), 'ù', 'u'),
  'ú', 'u'), 'û', 'u'), 'ü', 'u');
--> statement-breakpoint
UPDATE `carbon_calculations`
SET `search_text_normalized` =
  replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
  replace(replace(replace(replace(replace(replace(replace(replace(
  `search_text_normalized`,
  'Ñ', 'n'), 'ñ', 'n'), 'Ç', 'c'), 'ç', 'c'), 'Ý', 'y'),
  'Ÿ', 'y'), 'ý', 'y'), 'ÿ', 'y'), 'Ž', 'z'), 'ž', 'z'),
  'Æ', 'ae'), 'æ', 'ae'), 'Œ', 'oe'), 'œ', 'oe'), 'ß', 'ss'),
  'Ł', 'l'), 'ł', 'l'), 'Ð', 'd');
--> statement-breakpoint
UPDATE `carbon_calculations`
SET `search_text_normalized` =
  replace(replace(replace(replace(replace(replace(replace(replace(
  `search_text_normalized`,
  'İ', 'i'), 'ı', 'i'), 'Č', 'c'), 'č', 'c'),
  'Ć', 'c'), 'ć', 'c'), 'Đ', 'd'), 'đ', 'd');