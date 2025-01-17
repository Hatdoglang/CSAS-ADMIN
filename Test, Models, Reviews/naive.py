from flask import Flask, render_template, jsonify, request
import pandas as pd
import joblib
from collections import Counter

app = Flask(__name__)

# Load the trained Naive Bayes model and the vectorizer
nb_model = joblib.load('sentiment_analysis_model.pkl')  # Assuming you've saved the Naive Bayes model with joblib
vectorizer = joblib.load('tokenizer.pkl')  # Vectorizer (e.g., CountVectorizer or TfidfVectorizer)

# Global variables to hold sentiment analysis results
sentiment_distribution = {
    'Positive': 0,
    'Neutral': 0,
    'Negative': 0
}

top_positive_keywords = []
top_negative_keywords = []
keyword_counts = {
    'awesome': 0,
    'loved': 0,
    'fantastic': 0,
    'great': 0,
    'amazing': 0,
    'excellent': 0,
    'terrible': 0,
    'hated': 0,
    'awful': 0,
    'bad': 0,
    'worst': 0,
    'horrible': 0,
    'nindot': 0,       
    'maganda': 0,      
    'masaya': 0,       
    'masarap': 0,     
    'magandang': 0,   
    'masigla': 0,      
    'pangit': 0,       
    'maot': 0,        
    'masama': 0,      
    'masakit': 0,     
    'sama': 0          
}

# Route for the main page
@app.route('/')
def home():
    return render_template('index.html')

# Route for the Sentiment Analysis page
@app.route('/sentimentanalysis')
def sentimentanalysis():
    return render_template('sentimentanalysis.html')

# Route for the Result tab
@app.route('/result')
def result():
    return render_template('result.html')

# Route for Dashboard page
@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

# Route for About Us page
@app.route('/aboutus')
def aboutus():
    return render_template('aboutus.html')

# Analyze sentiment from the uploaded file
@app.route('/analyze-sentiment', methods=['POST'])
def analyze_sentiment():
    global sentiment_distribution, top_positive_keywords, top_negative_keywords, keyword_counts  # Use global variables

    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # Read the uploaded CSV/XLSX file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif file.filename.endswith('.xlsx'):
            df = pd.read_excel(file)
        else:
            return jsonify({'error': 'Invalid file format. Only CSV and XLSX are accepted.'}), 400
        
        # Reset previous data
        sentiment_distribution = {
            'Positive': 0,
            'Neutral': 0,
            'Negative': 0
        }
        top_positive_keywords = []
        top_negative_keywords = []
        keyword_counts = {key: 0 for key in keyword_counts}  # Reset counts for specific keywords

        # Vectorize the comments using the loaded vectorizer
        comments = df['Comments'].astype(str)
        comments_vect = vectorizer.transform(comments)

        # Predict sentiment using the Naive Bayes model
        predicted_sentiments = nb_model.predict(comments_vect)
        
        # Assuming the model outputs 0 for Negative, 1 for Neutral, and 2 for Positive
        for prediction in predicted_sentiments:
            if prediction == 0:
                sentiment_distribution['Negative'] += 1
            elif prediction == 1:
                sentiment_distribution['Neutral'] += 1
            elif prediction == 2:
                sentiment_distribution['Positive'] += 1

        # Extract keywords from comments
        all_comments = ' '.join(df['Comments'].astype(str))  # Combine all comments
        all_words = all_comments.split()  # Split into words

        # Count keywords
        keyword_counts_total = Counter(all_words)

        # Determine the top positive and negative keywords
        top_positive_keywords = [
            word for word, count in keyword_counts_total.items() 
            if count > 1 and word.lower() in [
                "awesome", "loved", "fantastic", "great", "amazing", "excellent",
                "nindot", "maganda", "masaya", "masarap", "magandang", "masigla"
            ]
        ]
        top_negative_keywords = [
            word for word, count in keyword_counts_total.items() 
            if count > 1 and word.lower() in [
                "terrible", "hated", "awful", "bad", "worst", "horrible",
                "pangit", "maot", "masama", "masakit", "sama"
            ]
        ]

        # Count occurrences of specific keywords
        for word in keyword_counts:
            keyword_counts[word] = keyword_counts_total.get(word, 0)

        total_count = len(predicted_sentiments)

        return jsonify({
            'positivePercentage': (sentiment_distribution['Positive'] / total_count) * 100 if total_count > 0 else 0,
            'neutralPercentage': (sentiment_distribution['Neutral'] / total_count) * 100 if total_count > 0 else 0,
            'negativePercentage': (sentiment_distribution['Negative'] / total_count) * 100 if total_count > 0 else 0,
            'keywordCounts': keyword_counts  # Send the counts for each keyword
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route to send dashboard data
@app.route('/dashboard-data', methods=['GET'])
def dashboard_data():
    # Return dynamic sentiment distribution and keywords
    return jsonify({
        'sentimentDistribution': sentiment_distribution,
        'topPositiveKeywords': top_positive_keywords,
        'topNegativeKeywords': top_negative_keywords,
        'keywordCounts': keyword_counts  # Send keyword counts
    })

if __name__ == '__main__':
    app.run(debug=True)
