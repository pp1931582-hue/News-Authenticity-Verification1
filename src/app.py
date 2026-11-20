
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import joblib

from src.database import SessionLocal, PredictionHistory

app = FastAPI(
    title="NewsGuard AI",
    description="AI-powered News Authenticity Verification System",
    version="1.0"
)

# CORS CONFIGURATION
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# LOAD ML MODEL
model = joblib.load("models/news_model.pkl")
vectorizer = joblib.load("models/tfidf_vectorizer.pkl")


# DATABASE CONNECTION
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# REQUEST MODEL
class NewsRequest(BaseModel):
    text: str


# HOME
@app.get("/")
def home():
    return {
        "message": "NewsGuard AI Backend Running"
    }


# PREDICT NEWS
@app.post("/predict")
def predict_news(
    request: NewsRequest,
    db: Session = Depends(get_db)
):

    news_text = request.text.strip()

    if not news_text:
        raise HTTPException(
            status_code=400,
            detail="News text cannot be empty"
        )

    try:

        transformed_text = vectorizer.transform([news_text])

        prediction = model.predict(transformed_text)[0]

        probabilities = model.predict_proba(transformed_text)[0]

        confidence = float(max(probabilities) * 100)

        if prediction == 0:
            result = "Likely Fake News"
        else:
            result = "Likely Real News"

        # SAVE HISTORY
        history = PredictionHistory(
            news_text=news_text,
            prediction=result,
            confidence=round(confidence, 2)
        )

        db.add(history)
        db.commit()

        return {
            "prediction": result,
            "confidence": round(confidence, 2),
            "warning": "AI prediction is not proof of authenticity."
        }

    except Exception as e:

        db.rollback()

        print("Prediction Error:", str(e))

        raise HTTPException(
            status_code=500,
            detail="News prediction failed."
        )


# GET HISTORY
@app.get("/history")
def get_history(db: Session = Depends(get_db)):

    records = (
        db.query(PredictionHistory)
        .order_by(PredictionHistory.id.desc())
        .limit(100)
        .all()
    )

    return [
        {
            "id": item.id,
            "news_text": item.news_text,
            "prediction": item.prediction,
            "confidence": item.confidence
        }
        for item in records
    ]


# CLEAR HISTORY
@app.delete("/history")
def clear_history(db: Session = Depends(get_db)):

    db.query(PredictionHistory).delete()

    db.commit()

    return {
        "message": "Prediction history cleared successfully"
    }
