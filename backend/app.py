from flask import Flask, redirect, url_for, session, jsonify, request
from authlib.integrations.flask_client import OAuth
from authlib.common.security import generate_token
import os
import requests
from pymongo import MongoClient
from bson.objectid import ObjectId

app = Flask(__name__)
app.secret_key = os.urandom(24)
client = MongoClient('mongodb://root:rootpassword@localhost:27017/mydatabase?authSource=admin')
db = client["mydatabase"]
articles_collection = db["articles"]
comments_collection = db["comments"]

oauth = OAuth(app)

nonce = generate_token()


oauth.register(
    name=os.getenv('OIDC_CLIENT_NAME'),
    client_id=os.getenv('OIDC_CLIENT_ID'),
    client_secret=os.getenv('OIDC_CLIENT_SECRET'),
    #server_metadata_url='http://dex:5556/.well-known/openid-configuration',
    authorization_endpoint="http://localhost:5556/auth",
    token_endpoint="http://dex:5556/token",
    jwks_uri="http://dex:5556/keys",
    userinfo_endpoint="http://dex:5556/userinfo",
    device_authorization_endpoint="http://dex:5556/device/code",
    client_kwargs={'scope': 'openid email profile'}
)

@app.route('/')
def home():
    user = session.get('user')
    if user:
        return f"<h2>Logged in as {user['email']}</h2><a href='/logout'>Logout</a>"
    return '<a href="/login">Login with Dex</a>'

@app.route('/login')
def login():
    session['nonce'] = nonce
    redirect_uri = 'http://localhost:8000/authorize'
    return oauth.flask_app.authorize_redirect(redirect_uri, nonce=nonce)

@app.route('/authorize')
def authorize():
    token = oauth.flask_app.authorize_access_token()
    nonce = session.get('nonce')

    user_info = oauth.flask_app.parse_id_token(token, nonce=nonce)  # or use .get('userinfo').json()
    session['user'] = user_info
    return redirect('/')

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

@app.route('/api/key')
def get_key():
    return jsonify({'apiKey': os.getenv('NYT_API_KEY')})

# get articles from NYT API and store them in MongoDB
@app.route('/api/articles')
def get_articles():
    query = request.args.get('q', 'davis/sacramento')
    page = request.args.get('page', 0)
    api_key = os.getenv('NYT_API_KEY')

    print(f"Query: {query}, Page: {page}")

    nyt_url = "https://api.nytimes.com/svc/search/v2/articlesearch.json"
    params = { "q": query, "page": page, "api-key": api_key }

    nyt_response = requests.get(nyt_url, params=params)
    # print("NYT Response Status:", nyt_response.status_code)
    # print("NYT Response Content:", nyt_response.text)
    if nyt_response.status_code != 200:
        return jsonify({'error': 'Failed to fetch NYT articles'}), 502

    data = nyt_response.json()
    docs = data.get('response', {}).get('docs', [])
    articles = []

    for doc in docs:
        article = {
            'headline': doc.get('headline', {}).get('main', ''),
            'snippet': doc.get('snippet', ''),
            'pub_date': doc.get('pub_date', ''),
            'web_url': doc.get('web_url', ''),
            'image': None,
        }
        # handle images safely
        for media in doc.get('multimedia', []):
            # check if media is a dictionary before using get()
            if isinstance(media, dict) and media.get('subtype') == 'default':
                article['image'] = 'https://www.nytimes.com/' + media.get('url', '')
                break
        articles.append(article)

        articles.append(article)

    # save articles to MongoDB
    if articles:
        articles_collection.insert_many(articles)
        print(f"Inserting {len(articles)} articles into MongoDB")
        for art in articles[:3]:
            print(art)
    return jsonify(articles)

# create a new comment
@app.route('/comments', methods=['POST'])
def create_comment():
    result = comments_collection.insert_one(request.json)
    comment = {
        "article_id": ObjectId(data["article_id"]),
        "parent_id": ObjectId(data["parent_id"]) if data.get("parent_id") else None,
        "text": request.json("text"),
        "user": session.get("user"),
        "created_at": datetime.utcnow(),
    }
    return jsonify({"inserted_id": str(result.inserted_id)}), 201

# get all comments for a specific article
@app.route('/articles/<article_id>/comments', methods=['GET'])
def get_replies():
    comments = list(comments_collection.find({"article_id": ObjectId(article_id)}, {"parent_id": None}))
    for comment in comments:
        comment['_id'] = str(comment['_id'])
        comment["article_id"] = str(comment["article_id"])
        if comment.get("parent_id"):
            comment["parent_id"] = str(comment["parent_id"])
    return jsonify(comments)

# get all replies for a specific comment
@app.route('/comments/<comment_id>/replies', methods=['GET'])
def get_comments():
    comments = list(comments_collection.find({"parent_id": ObjectId(comment_id)}))
    for comment in comments:
        comment['_id'] = str(comment['_id'])
    return jsonify(comments)

# edit a comment
@app.route('/comments/<comment_id>', methods=['PUT'])
def update_comment():
    result = comments_collection.update_one({"_id": ObjectId(comment_id)}, {"$set": request.json})
    return jsonify({"modified_count": result.modified_count})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
