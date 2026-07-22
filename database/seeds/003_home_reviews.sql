BEGIN;

-- Supprime uniquement les avis de démonstration de ce seed
-- afin que le script puisse être rejoué sans créer de doublons.
DELETE FROM reviews
WHERE guest_email LIKE '%@seed.casaluxurydecor.local';


INSERT INTO reviews (
    product_id,
    order_id,
    user_id,
    guest_name,
    guest_email,
    rating,
    title,
    body,
    is_verified,
    is_approved,
    moderation_status,
    display_on_home,
    created_at,
    updated_at
)
VALUES
(
    NULL,
    NULL,
    NULL,
    'Salma B.',
    'salma.b@seed.casaluxurydecor.local',
    5,
    'Une très belle expérience',
    'Je suis très satisfaite de ma commande. Les produits sont élégants, conformes aux photos et apportent une vraie touche de raffinement à mon intérieur.',
    FALSE,
    TRUE,
    'approved',
    TRUE,
    NOW() - INTERVAL '2 days',
    NOW()
),
(
    NULL,
    NULL,
    NULL,
    'Yasmine E.',
    'yasmine.e@seed.casaluxurydecor.local',
    5,
    'Produits de grande qualité',
    'La qualité est au rendez-vous et les finitions sont très soignées. La commande a été simple à passer et le résultat dépasse mes attentes.',
    FALSE,
    TRUE,
    'approved',
    TRUE,
    NOW() - INTERVAL '4 days',
    NOW()
),
(
    NULL,
    NULL,
    NULL,
    'Mehdi A.',
    'mehdi.a@seed.casaluxurydecor.local',
    5,
    'Service sérieux et professionnel',
    'Très bonne expérience du début à la fin. Le produit était bien emballé, conforme à la description et parfaitement adapté à notre salon.',
    FALSE,
    TRUE,
    'approved',
    TRUE,
    NOW() - INTERVAL '6 days',
    NOW()
),
(
    NULL,
    NULL,
    NULL,
    'Imane R.',
    'imane.r@seed.casaluxurydecor.local',
    4,
    'Une collection élégante',
    'J’ai beaucoup apprécié le choix proposé et le style des produits. Ma commande est arrivée en bon état et le rendu dans la pièce est vraiment réussi.',
    FALSE,
    TRUE,
    'approved',
    TRUE,
    NOW() - INTERVAL '8 days',
    NOW()
),
(
    NULL,
    NULL,
    NULL,
    'Nadia L.',
    'nadia.l@seed.casaluxurydecor.local',
    5,
    'Je recommande sans hésiter',
    'Les produits sont encore plus beaux en réalité. Le design est raffiné, les matériaux semblent solides et l’ensemble donne un résultat très chaleureux.',
    FALSE,
    TRUE,
    'approved',
    TRUE,
    NOW() - INTERVAL '10 days',
    NOW()
),
(
    NULL,
    NULL,
    NULL,
    'Omar K.',
    'omar.k@seed.casaluxurydecor.local',
    5,
    'Très satisfait de mon achat',
    'Le produit correspond exactement à ce que je recherchais. La finition est propre, le style est moderne et la commande s’est déroulée sans difficulté.',
    FALSE,
    TRUE,
    'approved',
    TRUE,
    NOW() - INTERVAL '12 days',
    NOW()
);

COMMIT;