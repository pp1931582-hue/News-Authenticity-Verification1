
const API_URL = "http://127.0.0.1:8000";

// ==========================================
// RESTORE SAVED ARTICLE AND RESULT
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    const savedArticle = sessionStorage.getItem("savedNewsArticle");
    const savedPrediction = sessionStorage.getItem("savedPrediction");
    const savedResultClass = sessionStorage.getItem("savedResultClass");

    if (savedArticle) {
        document.getElementById("newsText").value = savedArticle;
    }

    if (savedPrediction) {
        const resultDiv = document.getElementById("result");

        resultDiv.innerHTML = savedPrediction;
        resultDiv.className = savedResultClass || "";
    }

    console.log("NewsGuard AI Started.");

    loadHistory();
});


// ==========================================
// VERIFY NEWS
// ==========================================

async function verifyNews() {

    const newsInput = document.getElementById("newsText");
    const resultDiv = document.getElementById("result");
    const button = document.getElementById("verifyBtn");

    const newsText = newsInput.value.trim();

    if (!newsText) {
        resultDiv.className = "";
        resultDiv.textContent = "Please enter a news article.";
        return;
    }

    // SAVE ARTICLE BEFORE ANALYSIS
    sessionStorage.setItem("savedNewsArticle", newsText);

    button.disabled = true;
    button.textContent = "Analyzing...";

    resultDiv.className = "";
    resultDiv.textContent = "Analyzing news using AI...";

    try {

        // SEND NEWS TO FASTAPI
        const response = await fetch(`${API_URL}/predict`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                text: newsText
            })

        });

        const data = await response.json();

        console.log("Prediction API Response:", data);

        if (!response.ok) {
            throw new Error(
                data.detail || "Prediction failed."
            );
        }

        // GET PREDICTION
        const prediction =
            data.prediction ??
            data.result ??
            data.label;

        if (!prediction) {
            throw new Error("Prediction not received from backend.");
        }

        // GET CONFIDENCE
        const confidence = Number(data.confidence);

        if (!Number.isFinite(confidence)) {
            throw new Error("Invalid confidence value from backend.");
        }

        const safeConfidence = Math.max(
            0,
            Math.min(100, confidence)
        );

        const predictionText = String(prediction);

        // CHECK REAL OR FAKE
        const predictionLower = predictionText.toLowerCase();

        const isReal =
            predictionLower.includes("real") &&
            !predictionLower.includes("fake");

        // CLEAR PREVIOUS RESULT
        resultDiv.replaceChildren();

        resultDiv.className = isReal
            ? "result-real"
            : "result-fake";

        // PREDICTION HEADING
        const heading = document.createElement("h2");

        heading.textContent =
            "Analysis Result: " + predictionText;

        // CONFIDENCE
        const confidenceText = document.createElement("h3");

        confidenceText.textContent =
            `Model Confidence: ${safeConfidence}%`;

        // CONFIDENCE BAR
        const bar = document.createElement("div");

        bar.className = "confidence-bar";

        const fill = document.createElement("div");

        fill.className = "confidence-fill";

        fill.style.width = safeConfidence + "%";

        bar.appendChild(fill);

        // WARNING
        const warning = document.createElement("p");

        warning.textContent =
            data.warning ||
            "AI prediction is not proof of authenticity.";

        // DISPLAY RESULT
        resultDiv.append(
            heading,
            confidenceText,
            bar,
            warning
        );

        // SAVE RESULT FOR PAGE RELOAD
        sessionStorage.setItem(
            "savedPrediction",
            resultDiv.innerHTML
        );

        sessionStorage.setItem(
            "savedResultClass",
            resultDiv.className
        );

        console.log("Analysis Result displayed successfully.");

        // UPDATE DASHBOARD WITHOUT REMOVING RESULT
        loadHistory();

    }

    catch (error) {

        console.error("Prediction Error:", error);

        resultDiv.className = "result-error";

        resultDiv.textContent =
            "Analysis Error: " + error.message;

    }

    finally {

        button.disabled = false;

        button.textContent = "Verify News";

    }

}


// ==========================================
// LOAD HISTORY AND DASHBOARD
// ==========================================

async function loadHistory() {

    const historyList =
        document.getElementById("historyList");

    try {

        const response = await fetch(`${API_URL}/history`);

        if (!response.ok) {
            throw new Error("Unable to load prediction history.");
        }

        const history = await response.json();

        if (!Array.isArray(history)) {
            throw new Error("Invalid history response.");
        }

        historyList.replaceChildren();

        // CALCULATE TOTAL
        const total = history.length;

        // CALCULATE FAKE NEWS
        const fake = history.filter(item => {

            const prediction =
                String(item.prediction || "").toLowerCase();

            return prediction.includes("fake");

        }).length;

        // CALCULATE REAL NEWS
        const real = history.filter(item => {

            const prediction =
                String(item.prediction || "").toLowerCase();

            return prediction.includes("real") &&
                !prediction.includes("fake");

        }).length;

        // UPDATE DASHBOARD
        document.getElementById("totalCount").textContent = total;

        document.getElementById("fakeCount").textContent = fake;

        document.getElementById("realCount").textContent = real;

        // DISPLAY HISTORY
        history.forEach((item, index) => {

            const li = document.createElement("li");

            const prediction =
                item.prediction || "Unknown";

            const confidence =
                item.confidence ?? "N/A";

            const newsText =
                item.news_text || "No news text available";

            li.textContent =
                `${index + 1}. ${prediction} | ` +
                `Confidence: ${confidence}% | ` +
                `${newsText}`;

            historyList.appendChild(li);

        });

        console.log("Dashboard and history updated.");

    }

    catch (error) {

        console.error("History Error:", error);

        // IMPORTANT:
        // Do not clear or modify the Analysis Result here.

    }

}


// ==========================================
// CLEAR HISTORY
// ==========================================

async function clearHistory() {

    const confirmClear = confirm(
        "Are you sure you want to clear all prediction history?"
    );

    if (!confirmClear) {
        return;
    }

    try {

        const response = await fetch(`${API_URL}/history`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Unable to clear history.");
        }

        // REFRESH DASHBOARD
        await loadHistory();

        // CLEAR SAVED ARTICLE AND RESULT
        sessionStorage.removeItem("savedNewsArticle");
        sessionStorage.removeItem("savedPrediction");
        sessionStorage.removeItem("savedResultClass");

        document.getElementById("newsText").value = "";

        const resultDiv = document.getElementById("result");

        resultDiv.className = "";

        resultDiv.textContent =
            "History cleared successfully.";

        alert("Prediction history cleared successfully!");

    }

    catch (error) {

        console.error("Clear History Error:", error);

        alert("Unable to clear history: " + error.message);

    }

}
