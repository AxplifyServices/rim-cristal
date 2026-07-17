from __future__ import annotations

import base64
import json
import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from openai import (
    APIConnectionError,
    APITimeoutError,
    OpenAI,
    RateLimitError,
)


BASE_DIRECTORY = Path(__file__).resolve().parent

load_dotenv(BASE_DIRECTORY / ".env")

API_KEY = os.getenv("OPENAI_API_KEY")
IMAGE_MODEL = os.getenv("IMAGE_MODEL", "gpt-image-2")

RENAMED_DIRECTORY = BASE_DIRECTORY / os.getenv(
    "RENAMED_DIRECTORY",
    "renamed_originals",
)

MANIFEST_DIRECTORY = BASE_DIRECTORY / os.getenv(
    "MANIFEST_DIRECTORY",
    "manifests",
)

CLEANED_DIRECTORY = BASE_DIRECTORY / os.getenv(
    "CLEANED_DIRECTORY",
    "cleaned_images",
)

ERROR_DIRECTORY = BASE_DIRECTORY / os.getenv(
    "CLEANING_ERROR_DIRECTORY",
    "cleaning_errors",
)

PROMPT_FILE = BASE_DIRECTORY / os.getenv(
    "CLEANING_PROMPT_FILE",
    "prompt_cleaning.txt",
)

IMAGE_QUALITY = os.getenv("IMAGE_QUALITY", "high")
IMAGE_SIZE = os.getenv("IMAGE_SIZE", "auto")
IMAGE_OUTPUT_FORMAT = os.getenv(
    "IMAGE_OUTPUT_FORMAT",
    "png",
).lower()

SKIP_EXISTING = (
    os.getenv(
        "SKIP_CLEANED_EXISTING",
        "true",
    ).lower()
    == "true"
)

MAX_RETRIES = int(
    os.getenv("MAX_IMAGE_RETRIES", "3")
)

SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def ensure_directories() -> None:
    CLEANED_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    ERROR_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )


def load_cleaning_prompt() -> str:
    if not PROMPT_FILE.exists():
        raise FileNotFoundError(
            f"Prompt introuvable : {PROMPT_FILE}"
        )

    prompt = PROMPT_FILE.read_text(
        encoding="utf-8",
    ).strip()

    if not prompt:
        raise ValueError(
            "Le fichier de prompt de nettoyage est vide."
        )

    return prompt


def list_manifests() -> list[Path]:
    if not MANIFEST_DIRECTORY.exists():
        raise FileNotFoundError(
            f"Dossier des manifestes introuvable : "
            f"{MANIFEST_DIRECTORY}"
        )

    return sorted(
        MANIFEST_DIRECTORY.glob("*.json"),
        key=lambda path: path.name.casefold(),
    )


def read_manifest(
    manifest_path: Path,
) -> dict:
    with manifest_path.open(
        "r",
        encoding="utf-8-sig",
    ) as file:
        manifest = json.load(file)

    if not isinstance(manifest, dict):
        raise ValueError(
            "La racine du manifeste doit être un objet."
        )

    images = manifest.get("images")

    if not isinstance(images, list) or len(images) != 1:
        raise ValueError(
            "Le manifeste doit contenir exactement "
            "un objet dans images."
        )

    image_data = images[0]

    if not isinstance(image_data, dict):
        raise ValueError(
            "L'objet image du manifeste est invalide."
        )

    return image_data


def get_source_image(
    image_data: dict,
) -> Path:
    cleaned_file = str(
        image_data.get("cleaned_file") or ""
    ).strip()

    if not cleaned_file:
        raise ValueError(
            "cleaned_file est absent du manifeste."
        )

    filename = Path(
        cleaned_file.replace("\\", "/")
    ).name

    image_path = RENAMED_DIRECTORY / filename

    if not image_path.exists():
        raise FileNotFoundError(
            f"Image renommée introuvable : {image_path}"
        )

    if image_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Format non pris en charge : "
            f"{image_path.suffix}"
        )

    return image_path


def build_output_path(source_image: Path) -> Path:
    return CLEANED_DIRECTORY / source_image.name

def get_output_format(source_image: Path) -> str:
    extension = source_image.suffix.lower()

    if extension in {".jpg", ".jpeg"}:
        return "jpeg"

    if extension == ".png":
        return "png"

    if extension == ".webp":
        return "webp"

    raise ValueError(
        f"Format de sortie non pris en charge : {extension}"
    )

def build_context_prompt(
    base_prompt: str,
    image_data: dict,
) -> str:
    """
    Ajoute les coordonnées extraites au prompt.

    Elles servent de repères au modèle, mais l'image reste
    également analysée visuellement.
    """
    price_regions = image_data.get(
        "price_box_regions",
        [],
    )

    logo_regions = image_data.get(
        "logo_regions",
        [],
    )

    regions_context = json.dumps(
        {
            "price_box_regions": price_regions,
            "logo_regions": logo_regions,
        },
        ensure_ascii=False,
        indent=2,
    )

    return f"""
{base_prompt}

REPÈRES VISUELS DÉJÀ DÉTECTÉS

Les coordonnées suivantes sont normalisées entre 0 et 1.
Utilise-les comme indications pour localiser les éléments à
retirer, tout en vérifiant visuellement leurs limites exactes.

{regions_context}

Supprime entièrement les éléments concernés, y compris leurs
contours, ombres, arrière-plans et éventuels pixels résiduels.
""".strip()


def edit_image(
    client: OpenAI,
    source_image: Path,
    prompt: str,
) -> bytes:
    output_format = get_output_format(source_image)

    with source_image.open("rb") as image_file:
        result = client.images.edit(
            model=IMAGE_MODEL,
            image=image_file,
            prompt=prompt,
            size=IMAGE_SIZE,
            quality=IMAGE_QUALITY,
            output_format=output_format,
            background="auto",
        )

    if not result.data:
        raise RuntimeError(
            "L'API n'a retourné aucune image."
        )

    encoded_image = result.data[0].b64_json

    if not encoded_image:
        raise RuntimeError(
            "L'image retournée ne contient pas de données Base64."
        )

    return base64.b64decode(encoded_image)


def edit_with_retries(
    client: OpenAI,
    source_image: Path,
    prompt: str,
) -> bytes:
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return edit_image(
                client,
                source_image,
                prompt,
            )

        except (
            RateLimitError,
            APITimeoutError,
            APIConnectionError,
        ) as error:
            last_error = error

            if attempt >= MAX_RETRIES:
                break

            wait_seconds = 2 ** attempt

            logging.warning(
                "%s : tentative %s/%s échouée. "
                "Nouvel essai dans %s secondes.",
                source_image.name,
                attempt,
                MAX_RETRIES,
                wait_seconds,
            )

            time.sleep(wait_seconds)

    if last_error is not None:
        raise last_error

    raise RuntimeError(
        "Le nettoyage a échoué sans erreur détaillée."
    )


def save_error(
    manifest_path: Path,
    error: Exception,
) -> None:
    error_path = ERROR_DIRECTORY / (
        f"{manifest_path.stem}.error.txt"
    )

    error_path.write_text(
        (
            f"Manifeste : {manifest_path.name}\n"
            f"Type : {type(error).__name__}\n"
            f"Erreur : {error}\n"
        ),
        encoding="utf-8",
    )





def main() -> None:
    configure_logging()
    ensure_directories()

    if not API_KEY:
        raise RuntimeError(
            "OPENAI_API_KEY est absent du fichier .env."
        )

    cleaning_prompt = load_cleaning_prompt()
    manifests = list_manifests()

    if not manifests:
        logging.warning(
            "Aucun manifeste trouvé dans %s",
            MANIFEST_DIRECTORY,
        )
        return

    client = OpenAI(api_key=API_KEY)

    successful = 0
    skipped = 0
    failed = 0

    for index, manifest_path in enumerate(
        manifests,
        start=1,
    ):
        logging.info(
            "[%s/%s] Traitement : %s",
            index,
            len(manifests),
            manifest_path.name,
        )

        try:
            image_data = read_manifest(
                manifest_path,
            )

            source_image = get_source_image(
                image_data,
            )

            output_path = build_output_path(
                source_image,
            )

            if SKIP_EXISTING and output_path.exists():
                logging.info(
                    "Ignorée, sortie existante : %s",
                    output_path.name,
                )
                skipped += 1
                continue

            complete_prompt = build_context_prompt(
                cleaning_prompt,
                image_data,
            )

            cleaned_bytes = edit_with_retries(
                client,
                source_image,
                complete_prompt,
            )

            output_path.write_bytes(
                cleaned_bytes,
            )

            logging.info(
                "OK : %s",
                output_path.name,
            )

            successful += 1

        except Exception as error:
            failed += 1
            save_error(
                manifest_path,
                error,
            )

            logging.exception(
                "Échec pour %s : %s",
                manifest_path.name,
                error,
            )

    logging.info("Nettoyage terminé.")
    logging.info("Réussites : %s", successful)
    logging.info("Ignorées : %s", skipped)
    logging.info("Échecs : %s", failed)
    logging.info(
        "Images nettoyées : %s",
        CLEANED_DIRECTORY.resolve(),
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.warning(
            "Traitement interrompu."
        )
        raise SystemExit(130)
    except Exception as error:
        logging.exception(
            "Erreur fatale : %s",
            error,
        )
        raise SystemExit(1)