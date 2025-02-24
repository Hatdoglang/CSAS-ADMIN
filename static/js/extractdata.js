// ---- Firebase Imports & Initialization ----
import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-analytics.js";

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

// Prevent duplicate app initialization:
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const analytics = getAnalytics(app); // Optional

// ---- Variables and Constants ----
// Date range: 2019-01-01 to 2024-12-31
const START_DATE = new Date('2019-01-01').getTime();
const END_DATE = new Date('2024-12-31').getTime();

let autocomplete;
let allReviews = [];
let currentBeachData = {};

// ---- Google Places Autocomplete ----
// Expose initMap globally for Google API:
window.initMap = function() {
  const input = document.getElementById('searchInput');
  autocomplete = new google.maps.places.Autocomplete(input, {
    types: ['establishment', 'geocode'],
    componentRestrictions: { country: 'PH' }
  });
  // Set the fields we need from the selected place
  autocomplete.setFields(['place_id', 'name', 'formatted_address', 'user_ratings_total', 'geometry']);
  autocomplete.addListener('place_changed', onPlaceChanged);
};

function onPlaceChanged() {
  const place = autocomplete.getPlace();
  if (!place.place_id) return;
  
  // Update UI elements with selected place details:
  document.getElementById('resortName').textContent = place.name;
  document.getElementById('resortLocation').textContent = place.formatted_address;
  document.getElementById('reviewCount').textContent = place.user_ratings_total || 0;
  
  // Store necessary details globally
  currentBeachData = {
    place_id: place.place_id,
    name: place.name,
    location: place.formatted_address
  };
}

// ---- Extract Button: Fetch Reviews from Multiple Apify Datasets and Filter by Resort & Date ----
document.getElementById('extractBtn').addEventListener('click', async () => {
  try {
    const searchInput = document.getElementById('searchInput').value;
    if (!searchInput || !currentBeachData.place_id) {
      alert('Please select a valid beach resort before extracting.');
      return;
    }
    
    // Array of dataset endpoints
    const endpoints = [
      "https://api.apify.com/v2/datasets/wztL8eMhrIwxDJDYO/items?token=apify_api_MafkCiPUlsrxsWrpKvE27kXEMlaikw18sr9o",
      "https://api.apify.com/v2/datasets/LARFEh5HC8klja5Qs/items?token=apify_api_MafkCiPUlsrxsWrpKvE27kXEMlaikw18sr9o",
      "https://api.apify.com/v2/datasets/Cwum1lvBdW0tdETKW/items?token=apify_api_Qs8F86joUP3qREQSV6y0CIeUE0RuXh1aXZHM",
      "https://api.apify.com/v2/datasets/nZsxJkisKbvqMGTMR/items?token=apify_api_Qs8F86joUP3qREQSV6y0CIeUE0RuXh1aXZHM",
      "https://api.apify.com/v2/datasets/xdL0wAt7EoPiRtKgS/items?token=apify_api_Qs8F86joUP3qREQSV6y0CIeUE0RuXh1aXZHM",
      "https://api.apify.com/v2/datasets/bfJBBfrFJNFX6lVdK/items?token=apify_api_Qs8F86joUP3qREQSV6y0CIeUE0RuXh1aXZHM",
      "https://api.apify.com/v2/datasets/cxkvOXJd6hgvqm5BO/items?token=apify_api_Qs8F86joUP3qREQSV6y0CIeUE0RuXh1aXZHM",
      "https://api.apify.com/v2/datasets/NeucZl1qXKczhEf42/items?token=apify_api_Qs8F86joUP3qREQSV6y0CIeUE0RuXh1aXZHM",
      "https://api.apify.com/v2/datasets/e0QgkKN46WaIpWkt4/items?token=apify_api_Qs8F86joUP3qREQSV6y0CIeUE0RuXh1aXZHM",
      "https://api.apify.com/v2/datasets/QzSnyhJFlp6gOZMkV/items?token=apify_api_Qs8F86joUP3qREQSV6y0CIeUE0RuXh1aXZHM",
      "https://api.apify.com/v2/datasets/K247ElBeJpkQ91yKS/items?token=apify_api_Qs8F86joUP3qREQSV6y0CIeUE0RuXh1aXZHM",
      "https://api.apify.com/v2/datasets/KBaaHmOalTob8HQns/items?token=apify_api_Qs8F86joUP3qREQSV6y0CIeUE0RuXh1aXZHM",
      "https://api.apify.com/v2/datasets/9zTYNcHlsj0uwvseT/items?token=apify_api_Qs8F86joUP3qREQSV6y0CIeUE0RuXh1aXZHM",
      "https://api.apify.com/v2/datasets/fYIFRA8ec9XXWLn13/items?token=apify_api_Qs8F86joUP3qREQSV6y0CIeUE0RuXh1aXZHM"
    ];
    
    // Fetch all datasets concurrently
    const fetchPromises = endpoints.map(url => 
      fetch(url).then(resp => {
        if (!resp.ok) {
          throw new Error(`Error fetching dataset ${url}: ${resp.statusText}`);
        }
        return resp.json();
      })
    );
    
    const datasets = await Promise.all(fetchPromises);
    // Combine all dataset items into one array
    const rawReviews = datasets.flat();
    console.log('Combined raw reviews from Apify:', rawReviews);
    console.log('Selected resort place_id:', currentBeachData.place_id);
    console.log('Selected resort name:', currentBeachData.name);
    
    // Filter reviews for the selected resort.
    // Attempt to match by resort name in review.title (if exists) or review.searchString.
    const reviewsForResort = rawReviews.filter(review => {
      if (review.title && currentBeachData.name) {
        return review.title.toLowerCase().includes(currentBeachData.name.toLowerCase());
      }
      // Fallback: use searchString if available
      return review.searchString && review.searchString.toLowerCase().includes(currentBeachData.name.toLowerCase());
    });
    console.log('Reviews for the selected resort:', reviewsForResort);
    
    // Then filter by date (using publishedAtDate) for reviews between 2019 and 2024
    allReviews = reviewsForResort.filter(review => {
      if (!review.publishedAtDate) return false;
      let reviewDate = new Date(review.publishedAtDate).getTime();
      return reviewDate >= START_DATE && reviewDate <= END_DATE;
    });
    console.log('Filtered reviews (2019–2024) for resort:', allReviews);
    
    // Update UI and store reviews in Firebase
    updateReviewsUI();
    storeReviewsInFirebase(allReviews);
    
  } catch (error) {
    console.error('Error fetching reviews:', error);
    alert('Failed to fetch reviews. Please try again.');
  }
});

// ---- Update the UI with Reviews ----
function updateReviewsUI() {
  const reviewsContainer = document.getElementById('reviewsTable');
  reviewsContainer.innerHTML = '';
  
  document.getElementById('totalReviews').textContent = allReviews.length;
  
  allReviews.forEach(review => {
    // Format the date using publishedAtDate (if available)
    const dateStr = review.publishedAtDate ? new Date(review.publishedAtDate).toLocaleDateString() : 'No date available';
    
    const row = document.createElement('div');
    row.classList.add('review-row');
    row.innerHTML = `
    <p><strong>${review.name || 'Unknown'}</strong></p>
    <p class="rating">Rating: ${review.stars != null ? review.stars : 'N/A'}</p>  <!-- Use stars -->
    <p>${review.text || 'No comment provided'}</p>
    <p class="date">Time: ${dateStr}</p>
  `;
  
    reviewsContainer.appendChild(row);
  });
}

// ---- Store Reviews in Firebase ----
function storeReviewsInFirebase(reviews) {
  const db = getDatabase(app);
  
  // Save resort details.
  set(ref(db, 'reviews/' + currentBeachData.place_id + '/details'), {
    location: currentBeachData.location || 'Not Provided',
    name: currentBeachData.name || 'Unknown Resort',
    review_count: reviews.length
  })
  .then(() => console.log('Resort details stored in Firebase!'))
  .catch((error) => console.error('Error storing resort details:', error));
  
  // Save each individual review.
  reviews.forEach((review, index) => {
    const reviewRef = ref(db, `reviews/${currentBeachData.place_id}/review_${index}`);
    set(reviewRef, {
      comments: review.text || 'No comment provided',
      rating: review.stars != null ? review.stars : 0,  // Use 'stars' instead of 'totalScore'
      time: review.publishedAtDate || 'No date available',
      user_name: review.name || 'Anonymous'
    })
    
    .then(() => console.log(`Review ${index} stored in Firebase!`))
    .catch((error) => console.error(`Error storing review ${index}:`, error));
  });
  
  // Prepare CSV-like data.
  const csvData = reviews.map(review => {
    const rating = review.stars != null ? review.stars : 0;
    const comment = review.text || 'No comment provided';
    const sentimentPredicted = rating >= 4 ? "Positive" : rating === 3 ? "Neutral" : "Negative";
    return {
      "True Sentiment": sentimentPredicted,
      "Predicted Sentiment": sentimentPredicted,
      Comments: comment
    };
  });
  
  set(ref(db, `reviews/${currentBeachData.place_id}/csvData`), csvData)
    .then(() => console.log('CSV-like data stored in Firebase!'))
    .catch((error) => console.error('Error storing CSV-like data:', error));
}

// ---- Download Button: CSV Export ----
document.getElementById('downloadBtn').addEventListener('click', function() {
  if (allReviews.length > 0) {
    const commentsData = allReviews.map(review => {
      const rating = review.totalScore != null ? review.totalScore : 0;
      const comment = review.text || 'No comment provided';
      let sentimentPredicted = rating >= 4 ? "Positive" : rating === 3 ? "Neutral" : "Negative";
      return {
        sentimentPredicted,
        sentimentTrue: sentimentPredicted,
        comment
      };
    });
    
    const csvContent = "data:text/csv;charset=utf-8," +
      "True Sentiment,Predicted Sentiment,Comments\n" +
      commentsData.map(data => 
        `"${data.sentimentTrue}","${data.sentimentPredicted}","${data.comment.replace(/"/g, '""')}"`
      ).join("\n");
    
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

// ---- Optional: Delete Button to Clear Reviews from UI ----
document.getElementById('deleteBtn').addEventListener('click', function() {
  document.getElementById('reviewsTable').innerHTML = '';
  document.getElementById('totalReviews').textContent = '0';
  allReviews = [];
});
