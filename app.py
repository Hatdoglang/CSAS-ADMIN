import os
import json
from flask import Flask, render_template, jsonify, request, redirect, url_for, session
import pandas as pd
import joblib
import logging
import requests
from langdetect import detect
from googletrans import Translator
from sklearn.metrics import f1_score, precision_score, recall_score
import re
import firebase_admin
from firebase_admin import credentials, auth, exceptions, firestore

# Logging Configuration
logging.basicConfig(level=logging.INFO)

# Get Firebase credentials from environment variables
firebase_service_account = os.getenv('FIREBASE_SERVICE_ACCOUNT')
firebase_database_url = os.getenv('FIREBASE_DATABASE_URL')

if not firebase_service_account or not firebase_database_url:
    raise EnvironmentError("Environment variables for Firebase are not set correctly.")

# Initialize Firebase
cred = credentials.Certificate(json.loads(firebase_service_account))
firebase_admin.initialize_app(cred, {
    'databaseURL': firebase_database_url
})
# App Configuration
app = Flask(__name__)

app.secret_key = b'\x82\x94\x08\x87\x8c\xbd\xc4%hf \x85\x9d\xf0sj\xba\xe7U\xd7\x01\xf1\xf3\xa7'

# Load Naive Bayes model and CountVectorizer
try:
    nb_model = joblib.load('naive_bayes.pkl')  # Load the Naive Bayes model
    vectorizer = joblib.load('tfidf_vectorizer.pkl')  # Load the CountVectorizer
    print("Naive Bayes model and CountVectorizer loaded successfully.")
except Exception as e:
    logging.error(f"Error loading Naive Bayes model or CountVectorizer: {e}")

# Initialize the Google Translator to translate comments to English if needed
translator = Translator()

# Global variables to store sentiment analysis results
sentiment_distribution = {
    'Positive': 0,
    'Neutral': 0,
    'Negative': 0
}

# Dictionary to store counts of specific keywords in reviews
keyword_counts = {
    'awesome': 0, 'loved': 0, 'fantastic': 0, 'great': 0, 'amazing': 0, 'excellent': 0,
    'terrible': 0, 'hated': 0, 'awful': 0, 'bad': 0, 'worst': 0, 'horrible': 0,
    # Adding Tagalog and Bisaya positive words
    'nindot': 0, 'maganda': 0, 'masaya': 0, 'masarap': 0, 'magandang': 0, 'masigla': 0,
    # Adding Tagalog and Bisaya negative words
    'pangit': 0, 'maot': 0, 'masama': 0, 'masakit': 0, 'sama': 0
}

# Function to count keyword occurrences in a single review
def count_keywords_in_review(review):
    for keyword in keyword_counts.keys():
        count = len(re.findall(r'\b' + re.escape(keyword) + r'\b', review, re.IGNORECASE))
        keyword_counts[keyword] += count

@app.route('/')
def home():
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/index')
def index():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template('sentimentanalysis.html')


@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('home'))

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template('dashboard.html')

@app.route('/sentimentanalysis')
def sentimentanalysis():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template('sentimentanalysis.html')

@app.route('/result')
def result():
    return render_template('result.html')

@app.route('/sign-up')
def sign_up():
    return render_template('sign-up.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/aboutus')
def aboutus():
    return render_template('aboutus.html')

@app.route('/set-session', methods=['POST'])
def set_session():
    try:
        data = request.get_json()
        user_id = data.get('user_id')

        if user_id:
            session['user_id'] = user_id
            return jsonify({'status': 'success'}), 200
        else:
            return jsonify({'status': 'error', 'message': 'Missing user_id'}), 400

    except Exception as e:
        # Return a JSON error response if something goes wrong
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('index'))

    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        try:
            # Authenticate the user with Firebase using email and password
            user = auth.get_user_by_email(email)

            # Set the session for the user
            session['user_id'] = user.uid

            # Redirect to index page after successful login
            return redirect(url_for('index'))

        except exceptions.FirebaseError as e:
            return jsonify({"error": str(e)}), 400

    return render_template('login.html')


#set role for registration
@app.route('/set-role', methods=['POST'])
def set_role():
    data = request.get_json()
    uid = data.get('uid')
    role = data.get('role')
    resort = data.get('resort')

    if not uid or not role:
        return jsonify({"error": "Missing UID or role"}), 400

    claims = {"role": role}
    if role == "Resort Owner" and resort:
        claims["resort"] = resort

    try:
        # Set the custom claims in Firebase Authentication
        auth.set_custom_user_claims(uid, claims)
        return jsonify({"message": "User role set successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# analysis
@app.route('/analyze-sentiment', methods=['POST'])
def analyze_sentiment():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']

        if not file.filename.endswith(('.csv', '.xlsx')):
            return jsonify({"error": "Invalid file format. Only CSV and XLSX are allowed."}), 400

        # Read file into DataFrame
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)

        # Normalize column names
        df.columns = df.columns.str.lower()

        if 'predicted sentiment' not in df.columns:
            return jsonify({"error": "Missing 'Predicted Sentiment' column in file."}), 400

        # Drop empty sentiment values
        df = df.dropna(subset=['predicted sentiment'])

        if df.empty:
            return jsonify({"error": "No valid data found for sentiment analysis."}), 400

        # Count occurrences of each sentiment
        sentiment_counts = df['predicted sentiment'].value_counts()

        # Extract counts, default to 0 if not found (converted to Python int)
        positive_count = int(sentiment_counts.get("Positive", 0))
        neutral_count = int(sentiment_counts.get("Neutral", 0))
        negative_count = int(sentiment_counts.get("Negative", 0))

        # Total number of comments
        total = positive_count + neutral_count + negative_count

        if total == 0:
            return jsonify({"error": "No sentiments detected in the file."}), 400

        # Calculate percentages and remove decimal places
        positive_percentage = int((positive_count / total) * 100)
        neutral_percentage = int((neutral_count / total) * 100)
        negative_percentage = int((negative_count / total) * 100)

        return jsonify({
            "positivePercentage": positive_percentage,
            "neutralPercentage": neutral_percentage,
            "negativePercentage": negative_percentage,
            "positiveCount": positive_count,
            "neutralCount": neutral_count,
            "negativeCount": negative_count,
            "totalComments": total
        })

    except Exception as e:
        return jsonify({"error": "An error occurred during sentiment analysis.", "details": str(e)}), 500




def determine_conclusion(positivePercentage, neutralPercentage, negativePercentage):
    """Determine the overall sentiment conclusion based on percentages."""
    if positivePercentage > max(neutralPercentage, negativePercentage):
        return "Overall sentiment is positive."
    elif negativePercentage > max(positivePercentage, neutralPercentage):
        return "Overall sentiment is negative."
    elif neutralPercentage > max(positivePercentage, negativePercentage):
        return "Overall sentiment is neutral."
    elif abs(positivePercentage - negativePercentage) <= 5:
        return "Sentiment is tied between Positive and Negative."
    elif abs(positivePercentage - neutralPercentage) <= 5:
        return "Sentiment is tied between Positive and Neutral."
    elif abs(neutralPercentage - negativePercentage) <= 5:
        return "Sentiment is tied between Neutral and Negative."
    else:
        return "Sentiment is mixed."



# Route to get data for the dashboard (sentiment distribution, keywords, etc.)
@app.route('/dashboard-data', methods=['GET'])
def dashboard_data():
    return jsonify({
        'sentimentDistribution': sentiment_distribution,
        'keywordCounts': keyword_counts
    })

# Route to fetch and filter reviews from Google Places API (2019-2024)
@app.route('/extract_reviews', methods=['GET'])
def extract_reviews():
    place_id = request.args.get('placeId')
    google_api_key = 'AIzaSyA1pk1vqVLx4WbwDNiCqkkT37Ypo6BFVjs'

    url = f'https://maps.googleapis.com/maps/api/place/details/json?placeid={place_id}&key={google_api_key}'
    response = requests.get(url)

    if response.status_code == 200:
        place_data = response.json()

        if 'result' in place_data and 'reviews' in place_data['result']:
            reviews = place_data['result']['reviews']
            review_list = []

            for review in reviews:
                review_time = review.get('time', 0)
                
                review_data = {
                    'user_name': review.get('author_name', 'Unknown'),
                    'rating': review.get('rating', 0),
                    'comments': review.get('text', ''),
                    'time': review_time  
                }
                review_list.append(review_data)

            return jsonify({'reviews': review_list})
        else:
            return jsonify({'error': 'No reviews found for this place.'}), 404
    else:
        return jsonify({'error': 'Failed to retrieve data from Google Places API.'}), 500



if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=3000)
