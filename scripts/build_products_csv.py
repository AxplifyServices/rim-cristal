from pathlib import Path
import json
import math
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
IMPORT_DIR = ROOT / "database" / "import"

INPUT_FILES = [
    IMPORT_DIR / "monluminaire_ampoule.xlsx",
    IMPORT_DIR / "monluminaire_eclairage_exterieur.xlsx",
    IMPORT_DIR / "monluminaire_eclairage_interieur.xlsx",
]

OUTPUT_FILE = IMPORT_DIR / "products_import_ready.csv"

PRODUCT_COLUMNS = [
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
]

IMAGE_COLUMNS = [
    "url_image1",
    "url_image2",
    "url_image3",
    "url_image4",
    "url_image5",
]


def is_empty(value):
    if value is None:
        return True

    if isinstance(value, float) and math.isnan(value):
        return True

    if isinstance(value, str) and value.strip() == "":
        return True

    return False


def clean_text(value):
    if is_empty(value):
        return ""

    return str(value).strip()


def clean_nullable_text(value):
    value = clean_text(value)
    return value if value else None


def clean_price(value, default=0):
    if is_empty(value):
        return default

    try:
        return round(float(value), 2)
    except Exception:
        return default


def clean_int(value, default=0):
    if is_empty(value):
        return default

    try:
        return int(float(value))
    except Exception:
        return default


def clean_bool(value, default=False):
    if is_empty(value):
        return default

    if isinstance(value, bool):
        return value

    value = str(value).strip().lower()

    return value in ["true", "1", "yes", "y", "oui"]


def clean_json_array(value):
    if is_empty(value):
        return "[]"

    if isinstance(value, list):
        return json.dumps(value, ensure_ascii=False)

    text = str(value).strip()

    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return json.dumps(parsed, ensure_ascii=False)
    except Exception:
        pass

    return "[]"


def clean_json_object(value):
    if is_empty(value):
        return "{}"

    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False)

    text = str(value).strip()

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return json.dumps(parsed, ensure_ascii=False)
    except Exception:
        pass

    return "{}"


def clean_image_url(value):
    value = clean_text(value)

    if not value:
        return None

    if not value.startswith("http"):
        return None

    lowered = value.lower()

    invalid_parts = [
        "/img/eglo.png",
        "/img/m/",
        "/img/p/",
        "fr-default",
        "default-large_default",
        "default-home_default",
    ]

    if any(part in lowered for part in invalid_parts):
        return None

    valid_extensions = (".jpg", ".jpeg", ".png", ".webp")

    if not lowered.endswith(valid_extensions):
        return None

    # On garde uniquement les vraies images produit Prestashop.
    # Exemple valide :
    # https://www.monluminaire.ma/12345-large_default/nom-produit.jpg
    if "-large_default/" not in lowered and "-home_default/" not in lowered:
        return None

    return value


def collect_valid_images(row):
    urls = []

    for col in IMAGE_COLUMNS:
        url = clean_image_url(row.get(col))

        if url and url not in urls:
            urls.append(url)

    while len(urls) < len(IMAGE_COLUMNS):
        urls.append(None)

    return urls[: len(IMAGE_COLUMNS)]


def main():
    frames = []

    for file in INPUT_FILES:
        if not file.exists():
            raise FileNotFoundError(f"Fichier introuvable : {file}")

        df_file = pd.read_excel(file)
        frames.append(df_file)

    df = pd.concat(frames, ignore_index=True)

    print(f"Lignes Excel avant nettoyage : {len(df)}")

    if "import_status" in df.columns:
        df = df[df["import_status"].fillna("ready").astype(str).str.lower().eq("ready")].copy()

    df["slug"] = df["slug"].apply(clean_text)
    df["reference"] = df["reference"].apply(clean_text)
    df["name"] = df["name"].apply(clean_text)

    df = df[(df["slug"] != "") & (df["reference"] != "") & (df["name"] != "")].copy()

    before_dedup = len(df)

    df = df.drop_duplicates(subset=["reference"], keep="first")
    df = df.drop_duplicates(subset=["slug"], keep="first")

    print(f"Doublons supprimés : {before_dedup - len(df)}")

    output = pd.DataFrame()

    output["name"] = df["name"].apply(clean_text)
    output["slug"] = df["slug"].apply(clean_text)
    output["reference"] = df["reference"].apply(clean_text)

    output["marque"] = df["marque"].apply(clean_nullable_text)
    output["rubrique"] = df["rubrique"].apply(clean_nullable_text)
    output["categorie"] = df["categorie"].apply(clean_nullable_text)
    output["famille"] = df["famille"].apply(clean_nullable_text)
    output["description"] = df["description"].apply(clean_nullable_text)

    output["features"] = df["features"].apply(clean_json_array)
    output["specs"] = df["specs"].apply(clean_json_object)

    cleaned_images = []

    for _, row in df.iterrows():
        cleaned_images.append(collect_valid_images(row))

    for i, col in enumerate(IMAGE_COLUMNS):
        output[col] = [images[i] for images in cleaned_images]

    before_image_filter = len(output)

    output = output[
        output[IMAGE_COLUMNS].notna().any(axis=1)
    ].copy()

    print(f"Produits sans image supprimés : {before_image_filter - len(output)}")

    output["price"] = df.loc[output.index, "price"].apply(lambda x: clean_price(x, 0))

    output["sale_price"] = df.loc[output.index, "sale_price"].apply(
        lambda x: None if is_empty(x) else clean_price(x, 0)
    )

    output["discount_percent"] = df.loc[output.index, "discount_percent"].apply(
        lambda x: clean_int(x, 0)
    )

    output["colors"] = df.loc[output.index, "colors"].apply(clean_json_array)
    output["sizes"] = df.loc[output.index, "sizes"].apply(clean_json_array)

    output["stock"] = df.loc[output.index, "stock"].apply(lambda x: clean_int(x, 0))
    output["weight"] = df.loc[output.index, "weight"].apply(
        lambda x: None if is_empty(x) else clean_price(x, 0)
    )

    output["badge"] = df.loc[output.index, "badge"].apply(clean_nullable_text)

    output["is_active"] = df.loc[output.index, "is_active"].apply(lambda x: clean_bool(x, True))
    output["is_featured"] = df.loc[output.index, "is_featured"].apply(lambda x: clean_bool(x, False))
    output["is_new"] = df.loc[output.index, "is_new"].apply(lambda x: clean_bool(x, False))
    output["is_bestseller"] = df.loc[output.index, "is_bestseller"].apply(lambda x: clean_bool(x, False))

    output["rating"] = df.loc[output.index, "rating"].apply(lambda x: clean_price(x, 0))
    output["reviews_count"] = df.loc[output.index, "reviews_count"].apply(lambda x: clean_int(x, 0))

    output = output[PRODUCT_COLUMNS]

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    output.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")

    print(f"Lignes finales à importer : {len(output)}")
    print(f"CSV généré : {OUTPUT_FILE}")


if __name__ == "__main__":
    main()