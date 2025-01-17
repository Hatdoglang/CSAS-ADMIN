document.addEventListener('DOMContentLoaded', (event) => {
    // Scroll event listener for the header background change
    window.addEventListener("scroll", function() {
        const header = document.querySelector("header");
        if (window.scrollY > 50) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    });

    // Fetch sentiment data from the backend
    fetch('/dashboard-data')
        .then(response => response.json())
        .then(data => {
            console.log(data); // Log the data to inspect its structure

            // Ensure that we have the required data
            const sentimentDistribution = data.sentimentDistribution || { Positive: 0, Neutral: 0, Negative: 0 };
            const keywordCounts = data.keywordCounts || {};
            let topPositiveKeywords = data.topPositiveKeywords || [];
            let topNegativeKeywords = data.topNegativeKeywords || [];

            // Define a list of positive and negative keywords (adjust the tops keyword if needed)
            const positiveKeywords = ['amazing', 'awesome', 'excellent', 'good', 'great'];
            const negativeKeywords = ['bad', 'awful', 'poor', 'terrible', 'horrible'];

            // If there are no predefined top keywords, calculate them based on counts
            if (topPositiveKeywords.length === 0) {
                topPositiveKeywords = Object.keys(keywordCounts)
                 // Only positive keywords with count ">= 5" adjust the value 5 sa imong gusto na value
                 // use ">= 5" if ang top key words kay nag balik2 og ka 5 or taas pa sa 5 in each review
                 // use "> 0" if gusto mog ma display tanan keywords bisan ka usa ra na kita sa reviews
                    .filter(keyword => positiveKeywords.includes(keyword) && keywordCounts[keyword] > 0)
                    .sort((a, b) => keywordCounts[b] - keywordCounts[a]) 
                    .slice(0, 5); // Limit to top 5 keywords (only 5 words display in the chart)
            }

            if (topNegativeKeywords.length === 0) {
                topNegativeKeywords = Object.keys(keywordCounts)
                // Only negative keywords with count ">= 5 adjust" the value 5 sa imong gusto na value
                // use ">= 5" if ang top key words kay nag balik2 og ka 5 or taas pa sa 5 in each review
                 // use "> 0" if gusto mog ma display tanan keywords bisan ka usa ra na kita sa reviews
                    .filter(keyword => negativeKeywords.includes(keyword) && keywordCounts[keyword] > 0) 
                    .sort((a, b) => keywordCounts[b] - keywordCounts[a]) 
                    .slice(0, 5); // Limit to top 5 keywords (only 5 words display in the chart)
            }

            // Map top positive and negative keywords to their counts
            const topPositiveCounts = topPositiveKeywords.map(keyword => keywordCounts[keyword] || 0);
            const topNegativeCounts = topNegativeKeywords.map(keyword => keywordCounts[keyword] || 0);

            // Sentiment By Category Chart
            var ctx1 = document.getElementById('sentimentByCategoryChart').getContext('2d');
            var sentimentByCategoryChart = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: ['Positive', 'Neutral', 'Negative'],
                    datasets: [
                        {
                            label: 'Counts',
                            data: [
                                sentimentDistribution.Positive || 0,
                                sentimentDistribution.Neutral || 0,
                                sentimentDistribution.Negative || 0
                            ],
                            backgroundColor: [
                                'rgba(0, 255, 0, 0.2)',  // Positive
                                'rgba(255, 255, 0, 0.2)', // Neutral
                                'rgba(255, 0, 0, 0.2)'    // Negative
                            ]
                        }
                    ]
                },
                options: {
                    scales: {
                        x: {
                            stacked: true
                        },
                        y: {
                            stacked: true
                        }
                    }
                }
            });

            // Top Positive Keywords Chart (Only display keywords with count >= 5)
            var ctx2 = document.getElementById('topPositiveKeywordsChart').getContext('2d');
            var topPositiveKeywordsChart = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: topPositiveKeywords,
                    datasets: [
                        {
                            label: 'Counts',
                            data: topPositiveCounts,
                            backgroundColor: 'rgba(0, 255, 0, 0.2)',
                        }
                    ]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: Math.max(...topPositiveCounts) + 1  // Adjust y-axis max dynamically
                        }
                    }
                }
            });

            // Top Negative Keywords Chart (Only display keywords with count >= 5)
            var ctx3 = document.getElementById('topNegativeKeywordsChart').getContext('2d');
            var topNegativeKeywordsChart = new Chart(ctx3, {
                type: 'bar',
                data: {
                    labels: topNegativeKeywords,
                    datasets: [
                        {
                            label: 'Counts',
                            data: topNegativeCounts,
                            backgroundColor: 'rgba(255, 0, 0, 0.2)',
                        }
                    ]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: Math.max(...topNegativeCounts) + 1  // Adjust y-axis max dynamically
                        }
                    }
                }
            });
        })
        .catch(error => console.error('Error fetching data:', error));
});
