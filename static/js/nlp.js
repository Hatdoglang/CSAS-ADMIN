// Firebase initialization (ensure this is included in your HTML)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, set, push } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// Firebase configuration (replace this with your Firebase config)
const firebaseConfig = {
    apiKey: "AIzaSyDbNXaBjr2FVNN3nC4W8CUa9DlQwR2D87s",
    authDomain: "csas-158fc.firebaseapp.com",
    databaseURL: "https://csas-158fc-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "csas-158fc",
    storageBucket: "csas-158fc.firebasestorage.app",
    messagingSenderId: "763041820862",
    appId: "1:763041820862:web:c11981b07960e91ece6eef",
    measurementId: "G-26BMZST2LE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// File upload handling
document.getElementById('file-upload').addEventListener('change', (event) => {
    const fileName = event.target.files[0]?.name || "No file selected";
    document.querySelector('.file-name').textContent = fileName;

    // Initialize and simulate file upload progress
    let progress = 0;
    const progressBar = document.getElementById('file-upload-progress');
    const progressPercentage = document.getElementById('file-upload-percentage');

    const interval = setInterval(() => {
        if (progress >= 100) {
            clearInterval(interval); // Stop interval when upload completes
        } else {
            progress += 10;
            progressBar.value = progress;
            progressPercentage.textContent = `${progress}%`;
        }
    }, 200);
});

// Handle file submission
document.getElementById('nextBtn2').addEventListener('click', () => {
    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];

    // Validate file selection
    if (!file) {
        alert('Please select a file before submitting.');
        return;
    }

    // Validate file type (CSV or XLSX)
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
    ];
    if (!validTypes.includes(file.type)) {
        alert('Invalid file type. Please upload a CSV or XLSX file.');
        return;
    }

    // Prepare and send file to server
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/analyze-sentiment', true);

    // Update progress bar during upload
    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            document.getElementById('file-upload-progress').value = percentComplete;
            document.getElementById('file-upload-percentage').textContent = `${percentComplete}%`;
        }
    };

    // Handle server response
    xhr.onload = () => {
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            displaySentimentResults(response); // Display sentiment results
        } else {
            console.error('Error details:', xhr.responseText);
            alert(`Error uploading file: ${xhr.responseText}`);
        }
    };

    xhr.send(formData); // Send file
});

// Display sentiment results
function displaySentimentResults(data) {
    document.getElementById('positivePercentage').textContent = `${data.positivePercentage}%`;
    document.getElementById('neutralPercentage').textContent = `${data.neutralPercentage}%`;
    document.getElementById('negativePercentage').textContent = `${data.negativePercentage}%`;

    const precision = isNaN(data.precision) ? 'N/A' : data.precision.toFixed(2);
    const recall = isNaN(data.recall) ? 'N/A' : data.recall.toFixed(2);
    const f1Score = isNaN(data.f1Score) ? 'N/A' : data.f1Score.toFixed(2);

    document.getElementById('precision').textContent = precision;
    document.getElementById('recall').textContent = recall;
    document.getElementById('f1Score').textContent = f1Score;

    const conclusion = determineConclusion(data);
    document.getElementById('sentimentConclusion').textContent = conclusion;

    renderSentimentChart(data); // Render chart
    saveSentimentAnalysisData(data); // Save data to Firebase
}

// Determine conclusion based on sentiment percentages
function determineConclusion(data) {
    const { positivePercentage, neutralPercentage, negativePercentage } = data;

    if (Math.abs(positivePercentage - negativePercentage) <= 5 && positivePercentage > neutralPercentage) {
        return "Sentiment is tied between Positive and Negative, with Positive being dominant.";
    }
    if (Math.abs(positivePercentage - neutralPercentage) <= 5 && positivePercentage > negativePercentage) {
        return "Sentiment is tied between Positive and Neutral, with Positive being dominant.";
    }
    if (Math.abs(neutralPercentage - negativePercentage) <= 5 && neutralPercentage > positivePercentage) {
        return "Sentiment is tied between Neutral and Negative, with Neutral being dominant.";
    }
    if (positivePercentage > negativePercentage && positivePercentage > neutralPercentage) {
        return "Overall sentiment is positive.";
    }
    if (negativePercentage > positivePercentage && negativePercentage > neutralPercentage) {
        return "Overall sentiment is negative.";
    }
    if (neutralPercentage > positivePercentage && neutralPercentage > negativePercentage) {
        return "Overall sentiment is neutral.";
    }
    return "Sentiment is mixed.";
}

// Save sentiment analysis data to Firebase
function saveSentimentAnalysisData(data) {
    const sentimentData = {
        positivePercentage: data.positivePercentage || 0,
        neutralPercentage: data.neutralPercentage || 0,
        negativePercentage: data.negativePercentage || 0,
        precision: data.precision || null,
        recall: data.recall || null,
        f1Score: data.f1Score || null,
        conclusion: determineConclusion(data),
        timestamp: new Date().toISOString(),
    };

    const sentimentRef = push(ref(db, 'sentiment_analysis'));
    set(sentimentRef, sentimentData)
        .then(() => console.log('Sentiment analysis data saved successfully'))
        .catch((error) => console.error('Error saving sentiment data to Firebase:', error));
}

// Render sentiment chart using Chart.js
function renderSentimentChart(data) {
    const ctx = document.getElementById('sentimentChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [data.positivePercentage, data.neutralPercentage, data.negativePercentage],
                backgroundColor: ['#00FF00', '#FFFF00', '#FF0000'],
            }],
        },
    });
}
