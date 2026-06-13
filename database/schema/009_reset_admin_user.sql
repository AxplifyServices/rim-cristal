BEGIN;

-- Nettoyage des profils existants
DELETE FROM users;

-- Remise à zéro de la séquence des IDs utilisateurs
ALTER SEQUENCE users_id_seq RESTART WITH 1;

-- Création du compte admin principal
INSERT INTO users (
    email,
    hashed_password,
    first_name,
    last_name,
    phone,
    is_active,
    is_admin,
    role,
    point_of_sale_id,
    last_login_at,
    created_at,
    updated_at
)
VALUES (
    'admin@rim-cristal.com',
    '$2b$10$60wt7YFk5V1s9ydfn2RMautnitEp9q9yZYgDEuAiO/5cn3KiLsO8W',
    'Admin',
    'Rim Cristal',
    NULL,
    TRUE,
    TRUE,
    'admin',
    NULL,
    NULL,
    NOW(),
    NOW()
);

COMMIT;

-- Vérification
SELECT id, email, first_name, last_name, is_admin, role, is_active
FROM users
ORDER BY id;