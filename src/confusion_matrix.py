
import pandas as pd
import joblib
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix

# Load dataset
df = pd.read_csv("data/news_dataset.csv")

X = df["text"]
y = df["label"]

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

# Load model
model = joblib.load("models/news_model.pkl")
vectorizer = joblib.load("models/tfidf_vectorizer.pkl")

# Transform test data
X_test_tfidf = vectorizer.transform(X_test)

# Predict
y_pred = model.predict(X_test_tfidf)

# Confusion matrix
cm = confusion_matrix(y_test, y_pred)

# Plot
plt.figure(figsize=(8, 6))

sns.heatmap(
    cm,
    annot=True,
    fmt="d",
    cmap="Blues",
    xticklabels=["Fake News", "Real News"],
    yticklabels=["Fake News", "Real News"]
)

plt.xlabel("Predicted Label")
plt.ylabel("Actual Label")
plt.title("NewsGuard AI - Confusion Matrix")

plt.tight_layout()

# Save graph
plt.savefig("data/confusion_matrix.png", dpi=300)

plt.show()

print("Confusion matrix saved successfully!")
print(cm)
