pip install -r requirements.txt

model and test folder is a temporary folder pwede ra e delete 





Go to View > Command Palette or press Ctrl+Shift+P.

Type and select Python: Select Interpreter.
From the list, select the interpreter path for your virtual environment:
makefile

D:\Capstone\CSAS_GOOGLE API\CSAS_GOOGLE API\venv\Scripts\python.exe

If you don’t see it listed, you can manually add it by selecting Enter interpreter path… and then navigating to 
D:\Capstone\CSAS_GOOGLE API\CSAS_GOOGLE API\venv\Scripts\python.exe.









SERAPI:
from flask import Flask, render_template, jsonify, request, redirect, url_for, session
import pandas as pd
import joblib
import logging
import requests
from langdetect import detect
from serpapi import GoogleSearch
from datetime import datetime
from googletrans import Translator
from sklearn.metrics import f1_score, precision_score, recall_score
import re
import firebase_admin
from firebase_admin import credentials, auth
from firebase_admin import exceptions


app = Flask(__name__)


# Initialize Firebase Admin SDK
cred = credentials.Certificate("firebase-key.json")
firebase_admin.initialize_app(cred)

app.secret_key = b'\x82\x94\x08\x87\x8c\xbd\xc4%hf \x85\x9d\xf0sj\xba\xe7U\xd7\x01\xf1\xf3\xa7'

# Load Naive Bayes model and CountVectorizer
try:
    nb_model = joblib.load('naive_bayes_model_glove.pkl')  # Load the Naive Bayes model
    vectorizer = joblib.load('count_vectorizer.pkl')  # Load the CountVectorizer
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
    return render_template('index.html')


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
    global sentiment_distribution, keyword_counts

    # Reset keyword counts and sentiment distribution
    keyword_counts = {key: 0 for key in keyword_counts}
    sentiment_distribution = {'Positive': 0, 'Neutral': 0, 'Negative': 0}

    # Validate uploaded file
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400

    try:
        # Read the uploaded file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif file.filename.endswith('.xlsx'):
            df = pd.read_excel(file)
        else:
            return jsonify({'error': 'Invalid file format. Only CSV and XLSX are accepted.'}), 400

        # Ensure the required column exists
        if 'Comments' not in df.columns:
            return jsonify({'error': 'Uploaded file must contain a "Comments" column.'}), 400

        # Extract and preprocess comments
        comments = df['Comments'].astype(str).tolist()
        processed_comments = vectorizer.transform(comments)

        # Predict sentiment using the Naive Bayes model
        predicted_sentiments_numeric = nb_model.predict(processed_comments)
        sentiment_labels = ['Negative', 'Neutral', 'Positive']
        predicted_sentiments = [sentiment_labels[label] for label in predicted_sentiments_numeric]

        # Update sentiment distribution
        for prediction in predicted_sentiments:
            sentiment_distribution[prediction] += 1

        # Calculate percentages
        total_count = len(comments)
        if total_count > 0:
            positivePercentage = round((sentiment_distribution['Positive'] / total_count) * 100, 2)
            neutralPercentage = round((sentiment_distribution['Neutral'] / total_count) * 100, 2)
            negativePercentage = round((sentiment_distribution['Negative'] / total_count) * 100, 2)
        else:
            positivePercentage = neutralPercentage = negativePercentage = 0

        # Determine overall sentiment
        conclusion = determine_conclusion(positivePercentage, neutralPercentage, negativePercentage)

        # Count keywords in comments
        for comment in comments:
            count_keywords_in_review(comment)

        return jsonify({
            'positivePercentage': positivePercentage,
            'neutralPercentage': neutralPercentage,
            'negativePercentage': negativePercentage,
            'conclusion': conclusion,
            'keywordCounts': keyword_counts,
            'predictedSentiments': predicted_sentiments
        })

    except Exception as e:
        logging.error(f"Error during sentiment analysis: {e}")
        return jsonify({'error': str(e)}), 500


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



# SerpApi API Key
SERP_API_KEY = "e12b8368fc27768c738c953e60f946068ce7b6e99061ce5e74e0b1cae7c6e7d0"  # Replace with your SerpApi key

@app.route('/extract_reviews', methods=['GET'])
def extract_reviews():
    place_id = request.args.get('placeId')
    if not place_id:
        return jsonify({'error': 'Missing placeId parameter.'}), 400

    # Log the place_id to verify it is being passed
    print(f"Received place_id: {place_id}")

    # SerpApi params for fetching reviews
    params = {
        "engine": "google_maps_reviews",  # Specify the search engine
        "place_id": place_id,  # Google Maps Place ID
        "api_key": SERP_API_KEY,  # SerpApi API key
    }

    try:
        # Make the API request using SerpApi
        search = GoogleSearch(params)
        results = search.get_dict()

        # Log the API response to check if it's successful
        print(f"SerpApi Response: {results}")

        # Check if the reviews exist in the response
        if "reviews" in results:
            reviews = results["reviews"]
            review_list = []

            for review in reviews:
                review_data = {
                    'user_name': review.get('author_name', 'Unknown'),
                    'rating': review.get('rating', 0),
                    'comments': review.get('snippet', '')
                }
                review_list.append(review_data)

            return jsonify({'reviews': review_list})
        else:
            return jsonify({'error': 'No reviews found for this place.'}), 404

    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True)
