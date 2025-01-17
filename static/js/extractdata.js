// Import necessary Firebase functions
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js"; // Add this line to import getDatabase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-analytics.js";

// Your Firebase configuration
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
const analytics = getAnalytics(app); // Optional: Initialize Firebase Analytics

let autocomplete;
let service;
let allReviews = [];
let currentBeachData = {};
const START_DATE = new Date('2019-01-01').getTime(); // Start date for reviews in milliseconds
const END_DATE = new Date('2024-12-31').getTime(); // End date for reviews in milliseconds

// Make sure initMap is available globally
window.initMap = function() {
    const input = document.getElementById('searchInput');
    autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'PH' }
    });
    autocomplete.setFields(['place_id', 'name', 'formatted_address', 'user_ratings_total', 'geometry']);
    autocomplete.addListener('place_changed', onPlaceChanged);
};

// Function to handle place change event
function onPlaceChanged() {
    const place = autocomplete.getPlace();
    if (!place.place_id) {
        return;
    }
    displayResortDetails(place);
    currentBeachData = { place_id: place.place_id, name: place.name };
}

// Function to display resort details
function displayResortDetails(place) {
    document.getElementById('resortName').textContent = place.name;
    document.getElementById('resortLocation').textContent = place.formatted_address;
    document.getElementById('reviewCount').textContent = place.user_ratings_total || 0;
}

// Event listener for the extract button
document.getElementById('extractBtn').addEventListener('click', async () => {
    const searchInput = document.getElementById('searchInput').value;
    if (searchInput) {
        try {
            const response = await fetch(`/extract_reviews?placeId=${currentBeachData.place_id}`);
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const contentType = response.headers.get('Content-Type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Expected JSON, but got ${contentType}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error || 'Failed to fetch reviews.');
            }

            allReviews = data.reviews || [];
            updateReviewsUI();
            
            // After reviews are extracted, store them in Firebase
            storeReviewsInFirebase(allReviews);

        } catch (error) {
            console.error('Error fetching reviews:', error);
            alert('Failed to fetch reviews. Please try again.');
        }
    } else {
        alert('Please enter a beach resort name.');
    }
});

// Function to update the UI with reviews
function updateReviewsUI() {
    const reviewsContainer = document.getElementById('reviewsTable');
    reviewsContainer.innerHTML = ''; // Clear previous reviews

    const filteredReviews = allReviews.filter(review => {
        let reviewTime = new Date(review.time * 1000); // Convert Unix timestamp to milliseconds
        return reviewTime.getTime() >= START_DATE && reviewTime.getTime() <= END_DATE;
    });

    document.getElementById('totalReviews').textContent = filteredReviews.length;

    filteredReviews.forEach(review => {
        let reviewTime = new Date(review.time * 1000); // Convert Unix timestamp to milliseconds

        // Check for invalid date and display appropriate message
        const dateStr = isNaN(reviewTime) ? 'Invalid Date' : reviewTime.toLocaleDateString();

        const row = document.createElement('div');
        row.classList.add('review-row');
        row.innerHTML = `
            <p><strong>${review.user_name || 'Unknown'}</strong></p>
            <p class="rating">Rating: ${review.rating}</p>
            <p>${review.comments || 'No comments available'}</p>
            <p class="date">Time: ${dateStr}</p>
        `;
        reviewsContainer.appendChild(row);
    });
}

function storeReviewsInFirebase(reviews) {
    const db = getDatabase(app); // Get a reference to Firebase Realtime Database

    // Storing the details for the resort
    const reviewsRef = ref(db, 'reviews/' + currentBeachData.place_id); // Path where reviews will be stored

    // Storing the details for the resort like location, name, and review count
    set(ref(db, 'reviews/' + currentBeachData.place_id + '/details'), {
        location: currentBeachData.location || 'Not Provided', // Make sure to update with actual location if available
        name: currentBeachData.name || 'Unknown Resort',
        review_count: reviews.length // Store the count of reviews
    }).then(() => {
        console.log('Resort details stored in Firebase!');
    }).catch((error) => {
        console.error('Error storing resort details:', error);
    });

    // Storing the individual reviews
    reviews.forEach((review, index) => {
        const reviewRef = ref(db, `reviews/${currentBeachData.place_id}/review_${index}`);
        set(reviewRef, {
            comments: review.comments || 'No comment provided', // Default message if no comment
            rating: review.rating || 0, // Default 0 if no rating
            time: review.time, // Unix timestamp
            user_name: review.user_name || 'Anonymous' // Default to 'Anonymous' if no username
        }).then(() => {
            console.log(`Review ${index} stored in Firebase!`);
        }).catch((error) => {
            console.error(`Error storing review ${index}:`, error);
        });
    });

    // Prepare CSV-like data
    const csvData = reviews.map(review => {
        const rating = review.rating;
        const comment = review.comments || 'No comment provided';

        // Predicted Sentiment based on rating
        const sentimentPredicted = rating >= 4 ? "Positive" : rating === 3 ? "Neutral" : "Negative";
        const sentimentTrue = sentimentPredicted; // Assuming true sentiment matches predicted sentiment

        return {
            "True Sentiment": sentimentTrue,
            "Predicted Sentiment": sentimentPredicted,
            Comments: comment
        };
    });

    // Store CSV-like data in Firebase
    set(ref(db, `reviews/${currentBeachData.place_id}/csvData`), csvData)
        .then(() => {
            console.log('CSV-like data stored in Firebase!');
        })
        .catch((error) => {
            console.error('Error storing CSV-like data:', error);
        });
}



// Event listener for the download button
document.getElementById('downloadBtn').addEventListener('click', function () {
    if (allReviews.length > 0) {
        const commentsData = allReviews.map(review => {
            const rating = review.rating;
            const comment = review.comments || 'No comment provided'; // Ensure correct comment property
            
            // Predicted Sentiment based on rating
            let sentimentPredicted = rating >= 4 ? "Positive" : rating === 3 ? "Neutral" : "Negative";
            let sentimentTrue = sentimentPredicted; // Assuming sentiment_true is the same as sentiment_predicted

            return {
                sentimentPredicted, 
                sentimentTrue, 
                comment
            };
        });

        // Create CSV content in F1-score format: Sentiment (Predicted), Sentiment (True), Comments
        const csvContent = "data:text/csv;charset=utf-8," +
            "True Sentiment,Predicted Sentiment,Comments\n" +
            commentsData.map(data => `"${data.sentimentTrue}","${data.sentimentPredicted}","${data.comment.replace(/"/g, '""')}"`).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${currentBeachData.name || 'Beach'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        alert('No comments to download.');
    }
});
