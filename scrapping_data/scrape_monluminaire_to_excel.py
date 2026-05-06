import json
import re
import time
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import pandas as pd
import requests
from bs4 import BeautifulSoup
from slugify import slugify
from tqdm import tqdm


# ============================================================
# CONFIGURATION
# ============================================================

BASE_URL = "https://www.monluminaire.ma"

# Change uniquement cette variable pour changer de catégorie cible.
START_CATEGORY_URL = "https://www.monluminaire.ma/42-ampoule-led-luminaire-eclairage-maroc"

OUTPUT_FILE = "monluminaire_ampoule.xlsx"

MAX_PAGES = 120
REQUEST_DELAY_SECONDS = 0.5
REQUEST_TIMEOUT_SECONDS = 30

DEFAULT_STOCK_IF_NOT_FOUND = 0

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}


TARGET_COLUMNS = [
    "name",
    "slug",
    "reference",
    "marque",
    "rubrique",
    "categorie",
    "famille",
    "description",
    "features",
    "specs",
    "url_image1",
    "url_image2",
    "url_image3",
    "url_image4",
    "url_image5",
    "price",
    "sale_price",
    "discount_percent",
    "colors",
    "sizes",
    "stock",
    "weight",
    "badge",
    "is_active",
    "is_featured",
    "is_new",
    "is_bestseller",
    "rating",
    "reviews_count",
    "source_url",
    "source_section",
    "import_status",
]


# ============================================================
# OUTILS GÉNÉRAUX
# ============================================================

def fetch(url: str, session: requests.Session) -> Optional[str]:
    try:
        response = session.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT_SECONDS)

        if response.status_code >= 400:
            print(f"[WARN] HTTP {response.status_code} -> {url}")
            return None

        time.sleep(REQUEST_DELAY_SECONDS)
        return response.text

    except requests.RequestException as exc:
        print(f"[ERROR] {url} -> {exc}")
        return None


def clean_text(value: Optional[str]) -> str:
    if not value:
        return ""

    value = value.replace("\xa0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def normalize_url(url: str) -> str:
    if not url:
        return ""

    absolute = urljoin(BASE_URL, url.strip())
    parsed = urlparse(absolute)

    return f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")


def json_dumps(value) -> str:
    return json.dumps(value, ensure_ascii=False)


def parse_price(value: Optional[str]) -> Optional[float]:
    if not value:
        return None

    text = clean_text(value)
    text = text.replace("MAD", "")
    text = text.replace("Dhs", "")
    text = text.replace("DH", "")
    text = text.replace("TTC", "")
    text = text.strip()

    match = re.search(r"[\d\s.,]+", text)

    if not match:
        return None

    number = match.group(0)
    number = number.replace(" ", "")

    if "," in number and "." in number:
        number = number.replace(".", "").replace(",", ".")
    elif "," in number:
        number = number.replace(",", ".")
    elif "." in number:
        parts = number.split(".")
        if len(parts[-1]) == 3:
            number = number.replace(".", "")

    try:
        return float(Decimal(number).quantize(Decimal("0.01")))
    except (InvalidOperation, ValueError):
        return None


def first_non_empty(*values: str) -> str:
    for value in values:
        value = clean_text(value)
        if value:
            return value
    return ""


# ============================================================
# DISCOVERY DES PRODUITS DEPUIS UNE CATÉGORIE
# ============================================================

def build_category_page_url(category_url: str, page: int) -> str:
    if page <= 1:
        return category_url

    separator = "&" if "?" in category_url else "?"
    return f"{category_url}{separator}page={page}"


def is_product_url(url: str) -> bool:
    """
    Exemple produit :
    https://www.monluminaire.ma/suspension-luminaire-eclairage-maroc/17166-eglo-43886-suspension-grizedale.html
    """
    url = normalize_url(url)

    if not url.startswith(BASE_URL):
        return False

    if not url.endswith(".html"):
        return False

    return bool(re.search(r"/\d+-[^/]+\.html$", url))


def discover_product_urls_from_category(
    category_url: str,
    session: requests.Session,
    max_pages: int = MAX_PAGES,
) -> List[str]:
    product_urls = set()
    empty_pages_in_a_row = 0

    for page in range(1, max_pages + 1):
        page_url = build_category_page_url(category_url, page)
        html = fetch(page_url, session)

        if not html:
            empty_pages_in_a_row += 1
            if empty_pages_in_a_row >= 3:
                break
            continue

        soup = BeautifulSoup(html, "lxml")

        before = len(product_urls)

        # Les liens produit sont dans les cartes, mais on reste volontairement large.
        for a in soup.select("a[href]"):
            href = a.get("href") or ""
            absolute = normalize_url(href)

            if is_product_url(absolute):
                product_urls.add(absolute)

        after = len(product_urls)
        found = after - before

        print(f"[DISCOVERY] page={page} -> +{found} produits | total={after}")

        page_text = soup.get_text(" ", strip=True).lower()

        if "aucun produit" in page_text:
            break

        # Si on dépasse la dernière page, PrestaShop peut répéter ou retourner vide.
        if found == 0:
            empty_pages_in_a_row += 1
        else:
            empty_pages_in_a_row = 0

        if empty_pages_in_a_row >= 3:
            break

    return sorted(product_urls)


# ============================================================
# EXTRACTION PAGE PRODUIT
# ============================================================

def extract_product_name(soup: BeautifulSoup) -> str:
    selectors = [
        "h1",
        ".h1",
        ".product-title",
        ".product_name",
        "meta[property='og:title']",
    ]

    for selector in selectors:
        tag = soup.select_one(selector)

        if not tag:
            continue

        value = tag.get("content") if tag.name == "meta" else tag.get_text(" ")
        value = clean_text(value)

        if value:
            return value

    return ""


def extract_price(soup: BeautifulSoup) -> Tuple[Optional[float], Optional[float], int]:
    price_values = []

    selectors = [
        ".current-price span",
        ".current-price",
        ".product-price",
        ".price",
        ".regular-price",
        "meta[property='product:price:amount']",
    ]

    for selector in selectors:
        for tag in soup.select(selector):
            value = tag.get("content") if tag.name == "meta" else tag.get_text(" ")
            parsed = parse_price(value)

            if parsed is not None:
                price_values.append(parsed)

    # Déduplication en gardant l'ordre
    unique_prices = []
    for price in price_values:
        if price not in unique_prices:
            unique_prices.append(price)

    if not unique_prices:
        return None, None, 0

    if len(unique_prices) == 1:
        return unique_prices[0], None, 0

    price = max(unique_prices)
    sale_price = min(unique_prices)

    if sale_price >= price:
        return price, None, 0

    discount_percent = int(round((price - sale_price) / price * 100))
    return price, sale_price, discount_percent


def extract_stock(soup: BeautifulSoup) -> int:
    text = soup.get_text(" ", strip=True)

    match = re.search(r"En stock\s+(\d+)\s+Produits?", text, re.IGNORECASE)
    if match:
        return int(match.group(1))

    if re.search(r"En stock", text, re.IGNORECASE):
        return 1

    return DEFAULT_STOCK_IF_NOT_FOUND


def extract_specs_from_product_page(soup: BeautifulSoup) -> Dict[str, str]:
    """
    Sur le site, la zone visible donne :
    Référence 43886
    Marque EGLO
    Rubrique éclairage d'intérieur
    Catégorie suspension
    Nom de famille GRIZEDALE
    Garantie 2 ans
    Réseau C
    """

    specs = {}

    text = soup.get_text("\n", strip=True)
    lines = [clean_text(line) for line in text.split("\n") if clean_text(line)]

    expected_keys = [
        "Référence",
        "Marque",
        "Rubrique",
        "Catégorie",
        "Nom de famille",
        "Garantie",
        "Réseau",
    ]

    for i, line in enumerate(lines):
        for key in expected_keys:
            if line.lower() == key.lower() and i + 1 < len(lines):
                specs[key] = lines[i + 1]
            elif line.lower().startswith(key.lower() + " "):
                specs[key] = clean_text(line[len(key):])

    # Fallback regex, utile car parfois PrestaShop colle la clé et la valeur
    full_text = soup.get_text(" ", strip=True)

    regex_patterns = {
        "Référence": r"Référence\s+([A-Za-z0-9\-_./]+)",
        "Marque": r"Marque\s+([A-Za-zÀ-ÿ0-9 '&\-.]+?)\s+(Rubrique|Catégorie|Nom de famille|Garantie|Réseau|Partager)",
        "Rubrique": r"Rubrique\s+(.+?)\s+(Catégorie|Nom de famille|Garantie|Réseau|Partager)",
        "Catégorie": r"Catégorie\s+(.+?)\s+(Nom de famille|Garantie|Réseau|Partager)",
        "Nom de famille": r"Nom de famille\s+(.+?)\s+(Garantie|Réseau|Partager)",
        "Garantie": r"Garantie\s+(.+?)\s+(Réseau|Partager)",
        "Réseau": r"Réseau\s+(.+?)\s+(Partager|Télécharger|En stock)",
    }

    for key, pattern in regex_patterns.items():
        if key in specs and specs[key]:
            continue

        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            specs[key] = clean_text(match.group(1))

    return specs


def extract_description(soup: BeautifulSoup, specs: Dict[str, str], name: str) -> str:
    candidates = []

    selectors = [
        ".product-description",
        "#description",
        "#product-description-short",
        ".product-information",
        "meta[property='og:description']",
        "meta[name='description']",
    ]

    for selector in selectors:
        tag = soup.select_one(selector)

        if not tag:
            continue

        value = tag.get("content") if tag.name == "meta" else tag.get_text(" ")
        value = clean_text(value)

        if value:
            candidates.append(value)

    # Sur ce site, la description est parfois faible.
    if candidates:
        # On évite de reprendre toute la page.
        candidates = [c for c in candidates if len(c) <= 800]
        if candidates:
            return candidates[0]

    famille = specs.get("Nom de famille", "")
    categorie = specs.get("Catégorie", "")
    marque = specs.get("Marque", "")

    return clean_text(f"{name} - {marque} {categorie} {famille}")


def extract_images(soup: BeautifulSoup) -> List[str]:
    images = []

    image_selectors = [
        ".product-cover img",
        ".images-container img",
        ".product-images img",
        ".js-thumb",
        "meta[property='og:image']",
        "img",
    ]

    for selector in image_selectors:
        for tag in soup.select(selector):
            src = (
                tag.get("data-image-large-src")
                or tag.get("data-full-size-image-url")
                or tag.get("data-src")
                or tag.get("src")
                or tag.get("content")
            )

            if not src:
                continue

            src = normalize_url(src)

            if not src:
                continue

            # On évite logos, icônes et réseaux sociaux.
            lowered = src.lower()
            excluded = [
                "logo",
                "facebook",
                "instagram",
                "linkedin",
                "whatsapp",
                "blank",
                "loader",
                "icon",
            ]

            if any(word in lowered for word in excluded):
                continue

            if src not in images:
                images.append(src)

    return images[:5]


def extract_features(soup: BeautifulSoup, specs: Dict[str, str]) -> List[str]:
    features = []

    garantie = specs.get("Garantie", "")
    reseau = specs.get("Réseau", "")

    if garantie:
        features.append(f"Garantie {garantie}")

    if reseau:
        features.append(f"Réseau {reseau}")

    page_text = soup.get_text(" ", strip=True)

    if "Livraison partout au Maroc" in page_text:
        features.append("Livraison partout au Maroc")

    if "Service après vente" in page_text:
        features.append("Service après vente")

    if "Garantie assurée" in page_text:
        features.append("Garantie assurée")

    if not features:
        features.append("Luminaire décoratif")

    return features


def extract_colors_and_sizes(name: str, specs: Dict[str, str], description: str) -> Tuple[List[str], List[str]]:
    text = f"{name} {description} {' '.join(specs.values())}".lower()

    colors = []

    color_keywords = {
        "black": ["noir", "black"],
        "white": ["blanc", "white"],
        "gold": ["doré", "dore", "gold", "or"],
        "silver": ["argent", "silver", "chrome"],
        "grey": ["gris", "grey", "gray"],
        "brown": ["marron", "brown", "bois"],
        "bronze": ["bronze"],
        "copper": ["cuivre", "copper"],
    }

    for normalized, keywords in color_keywords.items():
        if any(keyword in text for keyword in keywords):
            colors.append(normalized)

    sizes = []

    # Le site ne donne pas toujours les dimensions dans le HTML principal.
    # On garde standard, sauf si des dimensions sont détectées.
    dimension_match = re.search(
        r"(\d+\s*(cm|mm|m)\s*[xX×]\s*\d+\s*(cm|mm|m)(\s*[xX×]\s*\d+\s*(cm|mm|m))?)",
        text,
    )

    if dimension_match:
        sizes.append(clean_text(dimension_match.group(1)))
    else:
        sizes.append("standard")

    return colors, sizes


def make_slug(name: str, reference: str) -> str:
    base = slugify(name)

    if not base:
        base = f"product-{reference}"

    return base[:250]


def get_source_section_from_url(category_url: str) -> str:
    parsed = urlparse(category_url)
    section = parsed.path.strip("/")

    return section or "monluminaire"


def parse_product_page(
    product_url: str,
    html: str,
    source_section: str,
) -> Dict:
    soup = BeautifulSoup(html, "lxml")

    specs = extract_specs_from_product_page(soup)

    name = extract_product_name(soup)
    reference = specs.get("Référence", "")
    marque = specs.get("Marque", "")
    rubrique = specs.get("Rubrique", "")
    categorie = specs.get("Catégorie", "")
    famille = specs.get("Nom de famille", "")

    price, sale_price, discount_percent = extract_price(soup)
    stock = extract_stock(soup)
    description = extract_description(soup, specs, name)
    features = extract_features(soup, specs)
    images = extract_images(soup)
    colors, sizes = extract_colors_and_sizes(name, specs, description)

    slug = make_slug(name, reference)

    notes = []

    if not name:
        notes.append("missing_name")

    if not reference:
        notes.append("missing_reference")

    if not price:
        notes.append("missing_price")

    if not images:
        notes.append("missing_images")

    import_status = "ready" if not notes else "review"

    row = {
        "name": name,
        "slug": slug,
        "reference": reference,
        "marque": marque,
        "rubrique": rubrique,
        "categorie": categorie,
        "famille": famille,
        "description": description,
        "features": json_dumps(features),
        "specs": json_dumps(specs),
        "url_image1": images[0] if len(images) > 0 else "",
        "url_image2": images[1] if len(images) > 1 else "",
        "url_image3": images[2] if len(images) > 2 else "",
        "url_image4": images[3] if len(images) > 3 else "",
        "url_image5": images[4] if len(images) > 4 else "",
        "price": price,
        "sale_price": sale_price,
        "discount_percent": discount_percent,
        "colors": json_dumps(colors),
        "sizes": json_dumps(sizes),
        "stock": stock,
        "weight": None,
        "badge": f"-{discount_percent}%" if discount_percent > 0 else "",
        "is_active": True,
        "is_featured": False,
        "is_new": False,
        "is_bestseller": False,
        "rating": 0,
        "reviews_count": 0,
        "source_url": product_url,
        "source_section": source_section,
        "import_status": import_status,
    }

    return row


# ============================================================
# QUALITÉ / EXCEL
# ============================================================

def make_unique_slugs_and_references(rows: List[Dict]) -> List[Dict]:
    seen_slugs = {}
    seen_refs = {}

    for index, row in enumerate(rows, start=1):
        slug = row.get("slug") or f"product-{index}"
        reference = row.get("reference") or f"ML-{index}"

        if slug in seen_slugs:
            seen_slugs[slug] += 1
            row["slug"] = f"{slug}-{seen_slugs[slug]}"
        else:
            seen_slugs[slug] = 1

        if reference in seen_refs:
            seen_refs[reference] += 1
            row["reference"] = f"{reference}-{seen_refs[reference]}"
        else:
            seen_refs[reference] = 1

    return rows


def autosize_excel_columns(writer: pd.ExcelWriter, sheet_name: str, df: pd.DataFrame):
    worksheet = writer.sheets[sheet_name]

    for idx, column in enumerate(df.columns, start=1):
        sample_values = [str(column)]

        if not df.empty:
            sample_values.extend(df[column].fillna("").astype(str).head(100).tolist())

        width = min(max(len(value) for value in sample_values) + 2, 60)
        col_letter = worksheet.cell(row=1, column=idx).column_letter
        worksheet.column_dimensions[col_letter].width = width

    worksheet.freeze_panes = "A2"
    worksheet.auto_filter.ref = worksheet.dimensions


def write_excel(rows: List[Dict], output_file: str):
    df = pd.DataFrame(rows)

    for col in TARGET_COLUMNS:
        if col not in df.columns:
            df[col] = None

    df = df[TARGET_COLUMNS]

    ready_df = df[df["import_status"] == "ready"].copy()
    review_df = df[df["import_status"] != "ready"].copy()

    summary_df = pd.DataFrame(
        [
            {"metric": "total_products", "value": len(df)},
            {"metric": "ready_products", "value": len(ready_df)},
            {"metric": "review_products", "value": len(review_df)},
            {"metric": "source_category", "value": START_CATEGORY_URL},
        ]
    )

    mapping_df = pd.DataFrame(
        [
            {"column": "name", "mapping": "Titre produit h1"},
            {"column": "slug", "mapping": "Slug généré depuis name"},
            {"column": "reference", "mapping": "Spécification produit > Référence"},
            {"column": "marque", "mapping": "Spécification produit > Marque"},
            {"column": "rubrique", "mapping": "Spécification produit > Rubrique"},
            {"column": "categorie", "mapping": "Spécification produit > Catégorie"},
            {"column": "famille", "mapping": "Spécification produit > Nom de famille"},
            {"column": "description", "mapping": "Description détectée ou fallback généré"},
            {"column": "features", "mapping": "JSON array"},
            {"column": "specs", "mapping": "JSON object des spécifications"},
            {"column": "url_image1..5", "mapping": "Images absolues pointant vers monluminaire.ma"},
            {"column": "price", "mapping": "Prix TTC détecté sur page produit"},
            {"column": "stock", "mapping": "En stock X Produits si disponible"},
            {"column": "source_url", "mapping": "URL page produit"},
            {"column": "source_section", "mapping": "Catégorie source scrapée"},
            {"column": "import_status", "mapping": "ready si champs critiques présents, sinon review"},
        ]
    )

    with pd.ExcelWriter(output_file, engine="openpyxl") as writer:
        ready_df.to_excel(writer, sheet_name="products_import_ready", index=False)
        review_df.to_excel(writer, sheet_name="products_to_review", index=False)
        df.to_excel(writer, sheet_name="all_products", index=False)
        summary_df.to_excel(writer, sheet_name="summary", index=False)
        mapping_df.to_excel(writer, sheet_name="mapping", index=False)

        autosize_excel_columns(writer, "products_import_ready", ready_df)
        autosize_excel_columns(writer, "products_to_review", review_df)
        autosize_excel_columns(writer, "all_products", df)
        autosize_excel_columns(writer, "summary", summary_df)
        autosize_excel_columns(writer, "mapping", mapping_df)

    print("")
    print(f"Excel généré : {output_file}")
    print(f"Total produits : {len(df)}")
    print(f"Prêts import : {len(ready_df)}")
    print(f"À revoir : {len(review_df)}")


# ============================================================
# MAIN
# ============================================================

def main():
    session = requests.Session()

    source_section = get_source_section_from_url(START_CATEGORY_URL)

    print(f"Catégorie cible : {START_CATEGORY_URL}")
    print("Découverte des URLs produits...")

    product_urls = discover_product_urls_from_category(
        category_url=START_CATEGORY_URL,
        session=session,
        max_pages=MAX_PAGES,
    )

    product_urls = sorted(set(product_urls))

    print("")
    print(f"URLs produits trouvées : {len(product_urls)}")

    if not product_urls:
        raise RuntimeError("Aucun produit trouvé dans la catégorie cible.")

    rows = []

    for product_url in tqdm(product_urls, desc="Scraping produits"):
        html = fetch(product_url, session)

        if not html:
            rows.append(
                {
                    "name": "",
                    "slug": "",
                    "reference": "",
                    "marque": "",
                    "rubrique": "",
                    "categorie": "",
                    "famille": "",
                    "description": "",
                    "features": json_dumps([]),
                    "specs": json_dumps({}),
                    "url_image1": "",
                    "url_image2": "",
                    "url_image3": "",
                    "url_image4": "",
                    "url_image5": "",
                    "price": None,
                    "sale_price": None,
                    "discount_percent": 0,
                    "colors": json_dumps([]),
                    "sizes": json_dumps([]),
                    "stock": 0,
                    "weight": None,
                    "badge": "",
                    "is_active": False,
                    "is_featured": False,
                    "is_new": False,
                    "is_bestseller": False,
                    "rating": 0,
                    "reviews_count": 0,
                    "source_url": product_url,
                    "source_section": source_section,
                    "import_status": "review",
                }
            )
            continue

        row = parse_product_page(
            product_url=product_url,
            html=html,
            source_section=source_section,
        )

        rows.append(row)

    rows = make_unique_slugs_and_references(rows)
    write_excel(rows, OUTPUT_FILE)


if __name__ == "__main__":
    main()