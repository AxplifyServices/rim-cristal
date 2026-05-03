DROP TABLE IF EXISTS wishlist_items CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS newsletter_subscribers CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    reference VARCHAR(100) NOT NULL UNIQUE,

    marque VARCHAR(120),
    rubrique VARCHAR(120),
    categorie VARCHAR(120),
    famille VARCHAR(120),

    description TEXT,
    features JSONB NOT NULL DEFAULT '[]',
    specs JSONB NOT NULL DEFAULT '{}',

    url_image1 TEXT,
    url_image2 TEXT,
    url_image3 TEXT,
    url_image4 TEXT,
    url_image5 TEXT,

    price NUMERIC(12,2) NOT NULL,
    sale_price NUMERIC(12,2),
    discount_percent INTEGER NOT NULL DEFAULT 0,

    colors JSONB NOT NULL DEFAULT '[]',
    sizes JSONB NOT NULL DEFAULT '[]',

    stock INTEGER NOT NULL DEFAULT 0,
    weight NUMERIC(12,2),

    badge VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_new BOOLEAN NOT NULL DEFAULT FALSE,
    is_bestseller BOOLEAN NOT NULL DEFAULT FALSE,

    rating NUMERIC(3,2) NOT NULL DEFAULT 0,
    reviews_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percent',
    discount_value NUMERIC(12,2) NOT NULL,
    min_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    max_uses INTEGER,
    uses_count INTEGER NOT NULL DEFAULT 0,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_coupon_discount_type CHECK (discount_type IN ('percent', 'fixed'))
);

CREATE TABLE newsletter_subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(120),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    subscribed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    unsubscribed_at TIMESTAMP
);

CREATE TABLE contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(120),
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL,
    address TEXT NOT NULL,
    apt VARCHAR(120),
    city VARCHAR(120) NOT NULL,
    state VARCHAR(120),
    zip VARCHAR(50) NOT NULL,
    country VARCHAR(120) NOT NULL DEFAULT 'Morocco',
    phone VARCHAR(50),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(80) NOT NULL UNIQUE,

    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    subtotal NUMERIC(12,2) NOT NULL,
    shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    coupon_code VARCHAR(80),
    total NUMERIC(12,2) NOT NULL,

    status VARCHAR(40) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(40) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(80),

    shipping_first_name VARCHAR(120) NOT NULL,
    shipping_last_name VARCHAR(120) NOT NULL,
    shipping_email VARCHAR(255) NOT NULL,
    shipping_phone VARCHAR(50),
    shipping_address TEXT NOT NULL,
    shipping_apt VARCHAR(120),
    shipping_city VARCHAR(120) NOT NULL,
    shipping_state VARCHAR(120),
    shipping_zip VARCHAR(50) NOT NULL,
    shipping_country VARCHAR(120) NOT NULL DEFAULT 'Morocco',

    notes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_order_status CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    CONSTRAINT chk_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'))
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,

    product_name VARCHAR(255) NOT NULL,
    product_reference VARCHAR(100),
    product_image TEXT,
    selected_color VARCHAR(80),
    selected_size VARCHAR(80),

    unit_price NUMERIC(12,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    line_total NUMERIC(12,2) NOT NULL
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    guest_name VARCHAR(160),
    guest_email VARCHAR(255),

    rating INTEGER NOT NULL,
    title VARCHAR(255),
    body TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_review_rating CHECK (rating >= 1 AND rating <= 5)
);

CREATE TABLE wishlist_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_wishlist_user_product UNIQUE (user_id, product_id)
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_categorie ON products(categorie);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);