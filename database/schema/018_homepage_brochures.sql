BEGIN;

CREATE TABLE IF NOT EXISTS homepage_brochures (
    id SERIAL PRIMARY KEY,

    image_url TEXT NOT NULL,
    mobile_image_url TEXT,

    alt_text_fr VARCHAR(255) NOT NULL,
    alt_text_en VARCHAR(255),

    link_url TEXT,
    link_target VARCHAR(20) NOT NULL DEFAULT '_self',

    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    desktop_fit VARCHAR(20) NOT NULL DEFAULT 'cover',
    desktop_position_x NUMERIC(6, 2) NOT NULL DEFAULT 50,
    desktop_position_y NUMERIC(6, 2) NOT NULL DEFAULT 50,
    desktop_zoom NUMERIC(6, 3) NOT NULL DEFAULT 1,

    mobile_fit VARCHAR(20) NOT NULL DEFAULT 'cover',
    mobile_position_x NUMERIC(6, 2) NOT NULL DEFAULT 50,
    mobile_position_y NUMERIC(6, 2) NOT NULL DEFAULT 50,
    mobile_zoom NUMERIC(6, 3) NOT NULL DEFAULT 1,

    created_by_user_id INTEGER,
    created_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_homepage_brochures_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_homepage_brochures_link_target
        CHECK (link_target IN ('_self', '_blank')),

    CONSTRAINT chk_homepage_brochures_desktop_fit
        CHECK (desktop_fit IN ('cover', 'contain')),

    CONSTRAINT chk_homepage_brochures_mobile_fit
        CHECK (mobile_fit IN ('cover', 'contain')),

    CONSTRAINT chk_homepage_brochures_desktop_position_x
        CHECK (
            desktop_position_x >= 0
            AND desktop_position_x <= 100
        ),

    CONSTRAINT chk_homepage_brochures_desktop_position_y
        CHECK (
            desktop_position_y >= 0
            AND desktop_position_y <= 100
        ),

    CONSTRAINT chk_homepage_brochures_mobile_position_x
        CHECK (
            mobile_position_x >= 0
            AND mobile_position_x <= 100
        ),

    CONSTRAINT chk_homepage_brochures_mobile_position_y
        CHECK (
            mobile_position_y >= 0
            AND mobile_position_y <= 100
        ),

    CONSTRAINT chk_homepage_brochures_desktop_zoom
        CHECK (
            desktop_zoom >= 0.25
            AND desktop_zoom <= 4
        ),

    CONSTRAINT chk_homepage_brochures_mobile_zoom
        CHECK (
            mobile_zoom >= 0.25
            AND mobile_zoom <= 4
        )
);

CREATE INDEX IF NOT EXISTS idx_homepage_brochures_public
    ON homepage_brochures (
        is_active,
        sort_order,
        id
    );

CREATE INDEX IF NOT EXISTS idx_homepage_brochures_sort_order
    ON homepage_brochures (
        sort_order,
        id
    );

COMMIT;