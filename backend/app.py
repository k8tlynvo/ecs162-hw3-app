from flask import Flask, redirect, url_for, session, jsonify, request
from authlib.integrations.flask_client import OAuth
from authlib.common.security import generate_token
import os
import requests
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
from flask_cors import CORS

app = Flask(__name__)
app.secret_key = os.urandom(24)
frontend_port = os.getenv('FRONTEND_PORT')
origin = f"http://localhost:{frontend_port}"
CORS(app, origins=[origin], supports_credentials=True)

client = MongoClient(os.environ.get("MONGO_URI"))
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
    return redirect(f'http://localhost:{frontend_port}')

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

@app.route('/api/user')
def user():
    user = session.get('user')
    if user:
        return jsonify(user)
    return jsonify({'email': None})

@app.route('/api/key')
def get_key():
    return jsonify({'apiKey': os.getenv('NYT_API_KEY')})

# get articles from NYT API and store them in MongoDB
@app.route('/api/articles')
def get_articles():
    query = request.args.get('q', 'davis/sacramento')
    page = request.args.get('page', 0)
    api_key = os.getenv('NYT_API_KEY')

    nyt_url = "https://api.nytimes.com/svc/search/v2/articlesearch.json"
    params = { "q": query, "page": page, "api-key": api_key }

    nyt_response = requests.get(nyt_url, params=params)
    
    if nyt_response.status_code != 200:
        return jsonify({'error': 'Failed to fetch NYT articles'}), 502

    data = nyt_response.json()
    docs = data.get('response', {}).get('docs', [])
    articles = []

    for doc in docs:
        article = {
            'headline': doc['headline']['main'],
            'url': doc['web_url'],
            'snippet': doc['snippet'],
            'published_date': doc['pub_date'],
            'image': doc['multimedia']['default']['url']
        }

        # Upsert the article into MongoDB
        articles_collection.update_one(
            {'url': article['url']},
            {'$set': article},
            upsert=True
        )

        # Retrieve the inserted or matched article with its _id
        stored_article = articles_collection.find_one({'url': article['url']})
        article['_id'] = str(stored_article['_id'])  # Mongo _id as string

        articles.append(article)
    
    return jsonify(articles)

# create a new comment
@app.route('/api/comments', methods=['POST'])
def create_comment():
    data = request.json
    comment = {
        "article_id": ObjectId(data["article_id"]),
        "parent_id": ObjectId(data["parent_id"]) if data.get("parent_id") else None,
        "text": data['text'],
        "user": session.get("user"),
        "created_at": datetime.utcnow(),
    }
    result = comments_collection.insert_one(comment)
    return jsonify({"inserted_id": str(result.inserted_id)}), 201

# TODO: not tested
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

# TODO: not tested
# get all replies for a specific comment
@app.route('/comments/<comment_id>/replies', methods=['GET'])
def get_comments():
    comments = list(comments_collection.find({"parent_id": ObjectId(comment_id)}))
    for comment in comments:
        comment['_id'] = str(comment['_id'])
    return jsonify(comments)

# This endpoint returns a list of top-level comments for a given article,
# each with its direct replies nested inside a "replies" field.

# The response is a list of dictionaries where each dictionary represents a top-level comment:
# [
#     {
#         "_id": str,                 # Unique string ID of the comment (Mongo ObjectId)
#         "article_id": str,          # The ID of the article this comment belongs to
#         "parent_id": None,          # Always None for top-level comments
#         "text": str,                # The content of the comment
#         "user": {                   # Information about the user who posted the comment
#             "email": str,           # Email of the user (if available from session)
#             ...                     # (other user fields depending on your session)
#         },
#         "created_at": str,          # Timestamp of when the comment was created (in UTC ISO format)
#         "replies": [                # A list of reply comment objects (1 level deep)
#             {
#                 "_id": str,             # Unique ID of the reply comment
#                 "article_id": str,      # Same article ID as the parent
#                 "parent_id": str,       # ID of the parent comment
#                 "text": str,            # Reply content
#                 "user": {...},          # User info for the reply
#                 "created_at": str,      # When the reply was posted
#                 "replies": []           # Empty list (only one level of nesting supported here)
#             },
#             ...
#         ]
#     },
#     ...
# ]
@app.route('/api/articles/<article_id>/comments', methods=['GET'])
def get_comments_with_replies(article_id):
    # Get all comments for the article
    all_comments = list(comments_collection.find({
        "article_id": ObjectId(article_id)
    }))

    # Convert ObjectIds to strings and prepare a lookup
    comment_lookup = {}
    for comment in all_comments:
        comment['_id'] = str(comment['_id'])
        comment['article_id'] = str(comment['article_id'])
        if comment.get('parent_id'):
            comment['parent_id'] = str(comment['parent_id'])
        else:
            comment['parent_id'] = None
        comment['replies'] = []
        comment_lookup[comment['_id']] = comment

    # Build the hierarchy
    top_level_comments = []
    for comment in comment_lookup.values():
        if comment['parent_id']:
            parent = comment_lookup.get(comment['parent_id'])
            if parent:
                parent['replies'].append(comment)
        else:
            top_level_comments.append(comment)

    return jsonify(top_level_comments)

# TODO: not tested, for extra credit 
# edit a comment 
@app.route('/api/comments/<comment_id>', methods=['PUT'])
def update_comment(comment_id):
    result = comments_collection.update_one({"_id": ObjectId(comment_id)}, {"$set": request.json})
    return jsonify({"modified_count": result.modified_count})

# delete comment 
@app.route('/api/comments/<comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    user = session.get('user')

    if not user or user.get("name") not in ["admin", "moderator"]:
        return jsonify({"error": "Unauthorized"}), 403
    
    result = comments_collection.delete_many({
        "$or": [
            {"_id": ObjectId(comment_id)},
            {"parent_id": ObjectId(comment_id)}
        ]
    })

    return jsonify({"deleted_count": result.deleted_count}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
