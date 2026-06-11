\set ON_ERROR_STOP on

BEGIN;

WITH main_categories(name_fr, name_en, slug, sort_order) AS (
    VALUES
    ('Luminaires', 'Lighting', 'luminaires', 10),
    ('Mobilier', 'Furniture', 'mobilier', 20),
    ('Arts de la table', 'Tableware', 'arts-de-la-table', 30),
    ('Décoration murale', 'Wall decor', 'decoration-murale', 40),
    ('Objets décoratifs', 'Decorative objects', 'objets-decoratifs', 50),
    ('Textile maison', 'Home textile', 'textile-maison', 60),
    ('Rangement', 'Storage', 'rangement', 70),
    ('Miroirs', 'Mirrors', 'miroirs', 80),
    ('Tapis', 'Rugs', 'tapis', 90),
    ('Senteurs maison', 'Home fragrance', 'senteurs-maison', 100),
    ('Plantes et cache-pots', 'Plants and planters', 'plantes-et-cache-pots', 110),
    ('Salle de bain', 'Bathroom accessories', 'salle-de-bain', 120),
    ('Cuisine déco', 'Kitchen decor', 'cuisine-deco', 130),
    ('Enfant et bébé', 'Kids and baby decor', 'enfant-et-bebe', 140),
    ('Extérieur', 'Outdoor decor', 'exterieur', 150),
    ('Accessoires déco', 'Decor accessories', 'accessoires-deco', 160)
)
INSERT INTO product_categories (name_fr, name_en, slug, level, sort_order)
SELECT name_fr, name_en, slug, 1, sort_order
FROM main_categories
ON CONFLICT (slug) DO UPDATE SET
    name_fr = EXCLUDED.name_fr,
    name_en = EXCLUDED.name_en,
    level = EXCLUDED.level,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE,
    updated_at = NOW();

WITH subcategories(parent_slug, name_fr, name_en, slug, sort_order) AS (
    VALUES

    -- Luminaires
    ('luminaires', 'Suspensions', 'Pendant lights', 'suspensions', 10),
    ('luminaires', 'Appliques murales', 'Wall lights', 'appliques-murales', 20),
    ('luminaires', 'Lampes à poser', 'Table lamps', 'lampes-a-poser', 30),
    ('luminaires', 'Lampadaires', 'Floor lamps', 'lampadaires', 40),
    ('luminaires', 'Plafonniers', 'Ceiling lights', 'plafonniers', 50),
    ('luminaires', 'Spots', 'Spotlights', 'spots', 60),
    ('luminaires', 'Lampes décoratives', 'Decorative lamps', 'lampes-decoratives', 70),
    ('luminaires', 'Ampoules', 'Bulbs', 'ampoules', 80),

    -- Mobilier
    ('mobilier', 'Tables', 'Tables', 'tables', 10),
    ('mobilier', 'Tables basses', 'Coffee tables', 'tables-basses', 20),
    ('mobilier', 'Tables d’appoint', 'Side tables', 'tables-dappoint', 30),
    ('mobilier', 'Chaises', 'Chairs', 'chaises', 40),
    ('mobilier', 'Fauteuils', 'Armchairs', 'fauteuils', 50),
    ('mobilier', 'Canapés', 'Sofas', 'canapes', 60),
    ('mobilier', 'Consoles', 'Consoles', 'consoles', 70),
    ('mobilier', 'Buffets', 'Sideboards', 'buffets', 80),
    ('mobilier', 'Meubles TV', 'TV units', 'meubles-tv', 90),
    ('mobilier', 'Bibliothèques', 'Bookcases', 'bibliotheques', 100),
    ('mobilier', 'Bancs', 'Benches', 'bancs', 110),
    ('mobilier', 'Tabourets', 'Stools', 'tabourets', 120),
    ('mobilier', 'Lits et têtes de lit', 'Beds and headboards', 'lits-et-tetes-de-lit', 130),
    ('mobilier', 'Tables de chevet', 'Bedside tables', 'tables-de-chevet', 140),

    -- Arts de la table
    ('arts-de-la-table', 'Assiettes', 'Plates', 'assiettes', 10),
    ('arts-de-la-table', 'Verres', 'Glasses', 'verres', 20),
    ('arts-de-la-table', 'Tasses et mugs', 'Cups and mugs', 'tasses-et-mugs', 30),
    ('arts-de-la-table', 'Bols', 'Bowls', 'bols', 40),
    ('arts-de-la-table', 'Saladiers', 'Salad bowls', 'saladiers', 50),
    ('arts-de-la-table', 'Couverts', 'Cutlery', 'couverts', 60),
    ('arts-de-la-table', 'Carafes et pichets', 'Carafes and pitchers', 'carafes-et-pichets', 70),
    ('arts-de-la-table', 'Plateaux', 'Trays', 'plateaux', 80),
    ('arts-de-la-table', 'Sets de table', 'Placemats', 'sets-de-table', 90),
    ('arts-de-la-table', 'Nappes', 'Tablecloths', 'nappes', 100),

    -- Décoration murale
    ('decoration-murale', 'Tableaux', 'Wall art', 'tableaux', 10),
    ('decoration-murale', 'Cadres', 'Frames', 'cadres', 20),
    ('decoration-murale', 'Affiches', 'Posters', 'affiches', 30),
    ('decoration-murale', 'Horloges murales', 'Wall clocks', 'horloges-murales', 40),
    ('decoration-murale', 'Décorations murales', 'Wall decorations', 'decorations-murales', 50),

    -- Objets décoratifs
    ('objets-decoratifs', 'Vases', 'Vases', 'vases', 10),
    ('objets-decoratifs', 'Figurines', 'Figurines', 'figurines', 20),
    ('objets-decoratifs', 'Sculptures', 'Sculptures', 'sculptures', 30),
    ('objets-decoratifs', 'Bougeoirs', 'Candle holders', 'bougeoirs', 40),
    ('objets-decoratifs', 'Photophores', 'Lanterns', 'photophores', 50),
    ('objets-decoratifs', 'Coupes décoratives', 'Decorative bowls', 'coupes-decoratives', 60),
    ('objets-decoratifs', 'Objets design', 'Design objects', 'objets-design', 70),
    ('objets-decoratifs', 'Statuettes', 'Statuettes', 'statuettes', 80),

    -- Textile maison
    ('textile-maison', 'Coussins', 'Cushions', 'coussins', 10),
    ('textile-maison', 'Plaids', 'Throws', 'plaids', 20),
    ('textile-maison', 'Rideaux', 'Curtains', 'rideaux', 30),
    ('textile-maison', 'Voilages', 'Sheer curtains', 'voilages', 40),
    ('textile-maison', 'Linge de lit', 'Bed linen', 'linge-de-lit', 50),
    ('textile-maison', 'Linge de bain', 'Bath linen', 'linge-de-bain', 60),
    ('textile-maison', 'Housses', 'Covers', 'housses', 70),

    -- Rangement
    ('rangement', 'Paniers', 'Baskets', 'paniers', 10),
    ('rangement', 'Boîtes décoratives', 'Decorative boxes', 'boites-decoratives', 20),
    ('rangement', 'Étagères', 'Shelves', 'etageres', 30),
    ('rangement', 'Portemanteaux', 'Coat racks', 'portemanteaux', 40),
    ('rangement', 'Porte-revues', 'Magazine racks', 'porte-revues', 50),

    -- Miroirs
    ('miroirs', 'Miroirs muraux', 'Wall mirrors', 'miroirs-muraux', 10),
    ('miroirs', 'Miroirs sur pied', 'Full-length mirrors', 'miroirs-sur-pied', 20),
    ('miroirs', 'Miroirs décoratifs', 'Decorative mirrors', 'miroirs-decoratifs', 30),

    -- Tapis
    ('tapis', 'Tapis salon', 'Living room rugs', 'tapis-salon', 10),
    ('tapis', 'Tapis chambre', 'Bedroom rugs', 'tapis-chambre', 20),
    ('tapis', 'Tapis couloir', 'Runner rugs', 'tapis-couloir', 30),
    ('tapis', 'Tapis extérieur', 'Outdoor rugs', 'tapis-exterieur', 40),

    -- Senteurs maison
    ('senteurs-maison', 'Bougies parfumées', 'Scented candles', 'bougies-parfumees', 10),
    ('senteurs-maison', 'Diffuseurs', 'Diffusers', 'diffuseurs', 20),
    ('senteurs-maison', 'Encens', 'Incense', 'encens', 30),
    ('senteurs-maison', 'Brûle-parfums', 'Oil burners', 'brule-parfums', 40),

    -- Plantes
    ('plantes-et-cache-pots', 'Cache-pots', 'Planters', 'cache-pots', 10),
    ('plantes-et-cache-pots', 'Pots décoratifs', 'Decorative pots', 'pots-decoratifs', 20),
    ('plantes-et-cache-pots', 'Plantes artificielles', 'Artificial plants', 'plantes-artificielles', 30),
    ('plantes-et-cache-pots', 'Vases pour fleurs', 'Flower vases', 'vases-pour-fleurs', 40),

    -- Salle de bain
    ('salle-de-bain', 'Porte-savons', 'Soap dishes', 'porte-savons', 10),
    ('salle-de-bain', 'Distributeurs de savon', 'Soap dispensers', 'distributeurs-de-savon', 20),
    ('salle-de-bain', 'Gobelets salle de bain', 'Bathroom tumblers', 'gobelets-salle-de-bain', 30),
    ('salle-de-bain', 'Paniers salle de bain', 'Bathroom baskets', 'paniers-salle-de-bain', 40),
    ('salle-de-bain', 'Accessoires WC', 'Toilet accessories', 'accessoires-wc', 50),

    -- Cuisine déco
    ('cuisine-deco', 'Bocaux', 'Jars', 'bocaux', 10),
    ('cuisine-deco', 'Corbeilles', 'Baskets', 'corbeilles', 20),
    ('cuisine-deco', 'Dessous de plat', 'Trivets', 'dessous-de-plat', 30),
    ('cuisine-deco', 'Accessoires de cuisine déco', 'Decorative kitchen accessories', 'accessoires-cuisine-deco', 40),

    -- Enfant
    ('enfant-et-bebe', 'Décoration enfant', 'Kids decor', 'decoration-enfant', 10),
    ('enfant-et-bebe', 'Veilleuses', 'Night lights', 'veilleuses', 20),
    ('enfant-et-bebe', 'Rangements enfant', 'Kids storage', 'rangements-enfant', 30),
    ('enfant-et-bebe', 'Textile enfant', 'Kids textile', 'textile-enfant', 40),

    -- Extérieur
    ('exterieur', 'Lanternes extérieur', 'Outdoor lanterns', 'lanternes-exterieur', 10),
    ('exterieur', 'Mobilier extérieur', 'Outdoor furniture', 'mobilier-exterieur', 20),
    ('exterieur', 'Décoration jardin', 'Garden decor', 'decoration-jardin', 30),
    ('exterieur', 'Pots extérieur', 'Outdoor pots', 'pots-exterieur', 40),

    -- Accessoires
    ('accessoires-deco', 'Vide-poches', 'Catchalls', 'vide-poches', 10),
    ('accessoires-deco', 'Porte-bijoux', 'Jewelry holders', 'porte-bijoux', 20),
    ('accessoires-deco', 'Porte-photos', 'Photo holders', 'porte-photos', 30),
    ('accessoires-deco', 'Accessoires saisonniers', 'Seasonal accessories', 'accessoires-saisonniers', 40)
)
INSERT INTO product_categories (parent_id, name_fr, name_en, slug, level, sort_order)
SELECT
    parent.id,
    sub.name_fr,
    sub.name_en,
    sub.slug,
    2,
    sub.sort_order
FROM subcategories sub
JOIN product_categories parent ON parent.slug = sub.parent_slug
ON CONFLICT (slug) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    name_fr = EXCLUDED.name_fr,
    name_en = EXCLUDED.name_en,
    level = EXCLUDED.level,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE,
    updated_at = NOW();

COMMIT;