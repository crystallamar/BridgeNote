from textblob import TextBlob
from typing import Optional


def analyze_sentiment(text: str) -> dict:
    if not text or not text.strip():
        return {"score": None, "label": None}

    blob = TextBlob(text)
    score = blob.sentiment.polarity  # -1.0 to 1.0

    if score > 0.3:
        label = "positive"
    elif score > 0.05:
        label = "slightly positive"
    elif score > -0.05:
        label = "neutral"
    elif score > -0.3:
        label = "slightly negative"
    else:
        label = "negative"

    return {"score": round(score, 3), "label": label}
