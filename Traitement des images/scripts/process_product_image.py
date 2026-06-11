import argparse
import csv
import re
from pathlib import Path

import cv2
import numpy as np
import pytesseract


# ---------------------------------------------------------
# CONFIG TESSERACT WINDOWS
# ---------------------------------------------------------
# Si tu es sur Windows et que Tesseract n'est pas reconnu,
# décommente cette ligne et vérifie le chemin.
#
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def normalize_text(text: str) -> str:
    text = text.replace("\n", " ")
    text = text.replace("\r", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_product_info(text: str) -> tuple[str, str]:
    """
    Essaie d'extraire un ID produit et un prix depuis le texte OCR.

    Exemple OCR attendu :
    rim002
    1480 dh

    Retour :
    product_id, price
    """
    clean_text = normalize_text(text).lower()

    product_id = ""
    price = ""

    # ID produit : lettres + chiffres, ex: rim002, abc123, lum45
    id_matches = re.findall(r"\b[a-z]{2,}[a-z0-9_-]*\d+[a-z0-9_-]*\b", clean_text)
    if id_matches:
        product_id = id_matches[0].strip()

    # Prix : nombre suivi ou non de dh / mad
    price_matches = re.findall(r"\b(\d{2,7})\s*(?:dh|dhs|mad)?\b", clean_text)
    if price_matches:
        # On évite de prendre les chiffres de l'ID si possible
        numeric_parts_from_id = re.findall(r"\d+", product_id)

        for candidate in price_matches:
            if candidate not in numeric_parts_from_id:
                price = candidate
                break

        if not price:
            price = price_matches[-1]

    return product_id, price


def detect_colored_boxes(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    """
    Détecte les boxes colorées très saturées dans l'image.

    Retourne une liste de rectangles :
    x, y, w, h
    """
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # Masque des couleurs très saturées :
    # rose, jaune, vert, bleu, orange, etc.
    # On cible les zones très colorées qui ne ressemblent pas au fond naturel.
    lower = np.array([0, 70, 80])
    upper = np.array([179, 255, 255])
    mask = cv2.inRange(hsv, lower, upper)

    # Nettoyage du masque
    kernel = np.ones((7, 7), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    image_h, image_w = image.shape[:2]
    image_area = image_w * image_h

    boxes = []

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h

        # Filtres pour éviter les petits reflets / détails du produit
        if area < image_area * 0.002:
            continue

        if area > image_area * 0.25:
            continue

        # Une box texte est généralement rectangulaire
        ratio = w / max(h, 1)

        if ratio < 0.4 or ratio > 6:
            continue

        # Dimensions minimum
        if w < 40 or h < 25:
            continue

        boxes.append((x, y, w, h))

    boxes = merge_overlapping_boxes(boxes)

    # Tri de haut en bas puis gauche à droite
    boxes.sort(key=lambda b: (b[1], b[0]))

    return boxes


def merge_overlapping_boxes(boxes: list[tuple[int, int, int, int]]) -> list[tuple[int, int, int, int]]:
    """
    Fusionne les boxes qui se touchent ou se chevauchent.
    Utile quand la box ID et la box prix sont détectées séparément.
    """
    if not boxes:
        return []

    rectangles = []

    for x, y, w, h in boxes:
        rectangles.append([x, y, x + w, y + h])

    merged = True

    while merged:
        merged = False
        new_rectangles = []
        used = [False] * len(rectangles)

        for i in range(len(rectangles)):
            if used[i]:
                continue

            x1, y1, x2, y2 = rectangles[i]
            used[i] = True

            for j in range(i + 1, len(rectangles)):
                if used[j]:
                    continue

                a1, b1, a2, b2 = rectangles[j]

                # Marge pour fusionner des rectangles proches
                margin = 20

                overlap = not (
                    x2 + margin < a1
                    or a2 + margin < x1
                    or y2 + margin < b1
                    or b2 + margin < y1
                )

                if overlap:
                    x1 = min(x1, a1)
                    y1 = min(y1, b1)
                    x2 = max(x2, a2)
                    y2 = max(y2, b2)
                    used[j] = True
                    merged = True

            new_rectangles.append([x1, y1, x2, y2])

        rectangles = new_rectangles

    final_boxes = []

    for x1, y1, x2, y2 in rectangles:
        final_boxes.append((x1, y1, x2 - x1, y2 - y1))

    return final_boxes


def crop_with_padding(
    image: np.ndarray,
    box: tuple[int, int, int, int],
    padding: int = 5,
) -> np.ndarray:
    x, y, w, h = box

    image_h, image_w = image.shape[:2]

    x1 = max(0, x - padding)
    y1 = max(0, y - padding)
    x2 = min(image_w, x + w + padding)
    y2 = min(image_h, y + h + padding)

    return image[y1:y2, x1:x2]


def read_text_from_crop(crop: np.ndarray) -> tuple[str, float]:
    """
    OCR sur la zone box.
    Retourne :
    texte détecté, confiance moyenne approximative
    """
    if crop.size == 0:
        return "", 0.0

    # Agrandissement pour améliorer OCR
    scale = 2
    crop = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

    # Amélioration du contraste
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

    config = "--psm 6"

    data = pytesseract.image_to_data(
        gray,
        config=config,
        output_type=pytesseract.Output.DICT,
    )

    words = []
    confidences = []

    for text, conf in zip(data.get("text", []), data.get("conf", [])):
        text = text.strip()

        if not text:
            continue

        try:
            conf_float = float(conf)
        except ValueError:
            conf_float = -1

        if conf_float >= 0:
            confidences.append(conf_float)

        words.append(text)

    detected_text = normalize_text(" ".join(words))

    if confidences:
        confidence = sum(confidences) / len(confidences)
    else:
        confidence = 0.0

    return detected_text, confidence


def remove_boxes_from_image(
    image: np.ndarray,
    boxes: list[tuple[int, int, int, int]],
    padding: int = 8,
) -> np.ndarray:
    """
    Supprime les boxes détectées avec inpainting OpenCV.
    """
    mask = np.zeros(image.shape[:2], dtype=np.uint8)

    image_h, image_w = image.shape[:2]

    for x, y, w, h in boxes:
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(image_w, x + w + padding)
        y2 = min(image_h, y + h + padding)

        cv2.rectangle(mask, (x1, y1), (x2, y2), 255, thickness=-1)

    cleaned = cv2.inpaint(image, mask, inpaintRadius=5, flags=cv2.INPAINT_TELEA)

    return cleaned


def process_images(input_dir: Path) -> None:
    if not input_dir.exists():
        raise FileNotFoundError(f"Dossier introuvable : {input_dir}")

    if not input_dir.is_dir():
        raise NotADirectoryError(f"Le chemin n'est pas un dossier : {input_dir}")

    # Dossier parent du dossier source
    parent_dir = input_dir.parent

    output_dir = parent_dir / f"{input_dir.name}_processed"
    cleaned_dir = output_dir / "cleaned_images"
    boxes_dir = output_dir / "detected_boxes"

    ensure_dir(output_dir)
    ensure_dir(cleaned_dir)
    ensure_dir(boxes_dir)

    csv_path = output_dir / "products_extracted.csv"

    image_files = [
        path for path in input_dir.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    ]

    rows = []

    for index, image_path in enumerate(image_files, start=1):
        print(f"[{index}/{len(image_files)}] Traitement : {image_path.name}")

        image = cv2.imread(str(image_path))

        if image is None:
            print(f"  [WARN] Impossible de lire l'image : {image_path}")
            continue

        boxes = detect_colored_boxes(image)

        cleaned_image = remove_boxes_from_image(image, boxes)

        generic_image_name = f"image_{index:05d}"
        cleaned_filename = f"{generic_image_name}_cleaned{image_path.suffix.lower()}"
        cleaned_path = cleaned_dir / cleaned_filename

        cv2.imwrite(str(cleaned_path), cleaned_image)

        if not boxes:
            rows.append({
                "generic_image_name": generic_image_name,
                "original_filename": image_path.name,
                "original_path": str(image_path),
                "cleaned_filename": cleaned_filename,
                "cleaned_path": str(cleaned_path),
                "box_number": "",
                "box_crop_filename": "",
                "box_crop_path": "",
                "detected_text": "",
                "product_id": "",
                "price": "",
                "currency": "",
                "ocr_confidence": "",
                "box_x": "",
                "box_y": "",
                "box_width": "",
                "box_height": "",
                "needs_review": "true",
                "review_reason": "Aucune box détectée",
            })
            continue

        for box_number, box in enumerate(boxes, start=1):
            x, y, w, h = box

            crop = crop_with_padding(image, box, padding=5)

            box_crop_filename = f"{generic_image_name}_box_{box_number:02d}.jpg"
            box_crop_path = boxes_dir / box_crop_filename
            cv2.imwrite(str(box_crop_path), crop)

            detected_text, confidence = read_text_from_crop(crop)
            product_id, price = extract_product_info(detected_text)

            needs_review = False
            review_reasons = []

            if not product_id:
                needs_review = True
                review_reasons.append("ID non détecté")

            if not price:
                needs_review = True
                review_reasons.append("Prix non détecté")

            if confidence < 60:
                needs_review = True
                review_reasons.append("Confiance OCR faible")

            rows.append({
                "generic_image_name": generic_image_name,
                "original_filename": image_path.name,
                "original_path": str(image_path),
                "cleaned_filename": cleaned_filename,
                "cleaned_path": str(cleaned_path),
                "box_number": box_number,
                "box_crop_filename": box_crop_filename,
                "box_crop_path": str(box_crop_path),
                "detected_text": detected_text,
                "product_id": product_id,
                "price": price,
                "currency": "MAD" if price else "",
                "ocr_confidence": round(confidence, 2),
                "box_x": x,
                "box_y": y,
                "box_width": w,
                "box_height": h,
                "needs_review": str(needs_review).lower(),
                "review_reason": " | ".join(review_reasons),
            })

    fieldnames = [
        "generic_image_name",
        "original_filename",
        "original_path",
        "cleaned_filename",
        "cleaned_path",
        "box_number",
        "box_crop_filename",
        "box_crop_path",
        "detected_text",
        "product_id",
        "price",
        "currency",
        "ocr_confidence",
        "box_x",
        "box_y",
        "box_width",
        "box_height",
        "needs_review",
        "review_reason",
    ]

    with open(csv_path, "w", newline="", encoding="utf-8-sig") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print("")
    print("Traitement terminé.")
    print(f"Dossier résultat : {output_dir}")
    print(f"Images nettoyées : {cleaned_dir}")
    print(f"Boxes extraites : {boxes_dir}")
    print(f"CSV : {csv_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Détection des boxes produit/prix, OCR et nettoyage des images."
    )

    parser.add_argument(
        "input_dir",
        type=str,
        help="Chemin du dossier contenant les photos à traiter.",
    )

    args = parser.parse_args()

    input_dir = Path(args.input_dir).resolve()

    process_images(input_dir)


if __name__ == "__main__":
    main()