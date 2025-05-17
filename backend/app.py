from flask import Flask, redirect, url_for, session, jsonify, request
from authlib.integrations.flask_client import OAuth
from authlib.common.security import generate_token
import os
import requests

app = Flask(__name__)
app.secret_key = os.urandom(24)


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

@app.route('/api/articles')
def get_articles():
    query = request.args.get('q')
    page = request.args.get('page', 0)
    api_key = os.getenv('NYT_API_KEY')

    if not query:
        return jsonify({'error': 'Missing query parameter'}), 400
    
    nyt_url = 'https://api.nytimes.com/svc/search/v2/articlesearch.json'
    params = {
        'q': query,
        'page': page,
        'api-key': api_key
    }
    
    try:
        response = requests.get(nyt_url, params=params)
        response.raise_for_status()
        data = response.json()

        articles = []
        for doc in data['response']['docs']:
            articles.append({
                'headline': doc['headline']['main'],
                'url': doc['web_url'],
                'snippet': doc['snippet'],
                'published_date': doc['pub_date'],
                'image': doc['multimedia']['default']['url']
            })

        return jsonify(articles)
    except Exception as e:
        return jsonify({'error': 'Failed to fetch articles', 'details': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
