from pathlib import Path
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
IMPORT_DIR = ROOT / "database" / "import"

BAD_PATTERNS = [
    "eglo.png",
    "/img/m/",
    "/img/p/",
    "fr-default",
]

FILES = [
    IMPORT_DIR / "monluminaire_ampoule.xlsx",
    IMPORT_DIR / "monluminaire_eclairage_exterieur.xlsx",
    IMPORT_DIR / "monluminaire_eclairage_interieur.xlsx",
    IMPORT_DIR / "products_import_ready.csv",
]

IMAGE_COLUMNS = [
    "url_image1",
    "url_image2",
    "url_image3",
    "url_image4",
    "url_image5",
]


def check_file(path: Path):
    if not path.exists():
        print(f"[MANQUANT] {path}")
        return

    if path.suffix.lower() == ".csv":
        df = pd.read_csv(path)
    else:
        df = pd.read_excel(path)

    total = 0

    for col in IMAGE_COLUMNS:
        if col not in df.columns:
            continue

        values = df[col].dropna().astype(str)

        for pattern in BAD_PATTERNS:
            matches = values[values.str.contains(pattern, case=False, regex=False)]
            count = len(matches)

            if count:
                total += count
                print(f"[KO] {path.name} | {col} | {pattern} | {count}")

    if total == 0:
        print(f"[OK] {path.name} : aucune mauvaise image trouvée")
    else:
        print(f"[TOTAL KO] {path.name} : {total} mauvaise(s) image(s)")


def main():
    for file in FILES:
        check_file(file)


if __name__ == "__main__":
    main()