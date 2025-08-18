from transformers import pipeline
from typing import BinaryIO
from dotenv import load_dotenv
from os import getenv
import io
from scipy.io import wavfile

# Load the pipeline for deepfake audio detection
load_dotenv()
MODEL_NAME = getenv("MODEL_NAME")
detector = pipeline("audio-classification", model=MODEL_NAME)

def is_audio_deepfake(audio_file: BinaryIO):
    """
    Determines whether the given audio file is a deepfake.

    Args:
        audio_file (BinaryIO): A binary stream representing the audio file to be analyzed.

    Returns:
        A list of dictionaries with 'label' and 'score' keys, e.g.
            [
                {"label": "real", "score": 0.85},
                {"label": "fake", "score": 0.15}
            ]
    """
    audio_bytes = audio_file.read()
    sample_rate, audio_array = wavfile.read(io.BytesIO(audio_bytes))
    result = detector(audio_array)
    return result
