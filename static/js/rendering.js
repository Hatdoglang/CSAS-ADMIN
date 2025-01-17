let sentimentChart = null;  // Declare the chart instance globally

function renderSentimentChart(data) {
    const ctx = document.getElementById('sentimentChart').getContext('2d');

    // Destroy the existing chart if it exists
    if (sentimentChart) {
        sentimentChart.destroy();
    }

    // Create a new chart with the updated data
    sentimentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [data.positivePercentage, data.neutralPercentage, data.negativePercentage],
                backgroundColor: ['#4CAF50', '#FFEB3B', '#F44336'], // Green, Yellow, Red
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Sentiment Distribution'
                }
            }
        }
    });
}
