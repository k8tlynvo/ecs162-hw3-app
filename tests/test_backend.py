import sys
import os

# Add backend to the import path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from app import app
import pytest

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

# Test that the request returns a valid API key
def test_get_api_key(client):
    # Set the environment variable for testing
    os.environ['NYT_API_KEY'] = 'test-api-key'

    # Make a request to the /api/key endpoint
    response = client.get('/api/key')

    # Verify the response
    assert response.status_code == 200
    data = response.get_json()
    assert 'apiKey' in data
    assert data['apiKey'] == 'test-api-key'

def test_user_logged_out_returns_null_email(client):
    with client.session_transaction() as sess:
        sess.clear()
    response = client.get('/api/user')
    assert response.status_code == 200
    assert response.get_json() == {'email': None}

def test_user_logged_in_returns_email(client):
    with client.session_transaction() as sess:
        sess['user'] = {'email': 'test@example.com'}
    response = client.get('/api/user')
    assert response.status_code == 200
    assert response.get_json()['email'] == 'test@example.com'

@patch('app.requests.get')
@patch('app.articles_collection')
def test_get_articles_success(mock_articles_collection, mock_requests_get, client):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        'response': {
            'docs': [
                {
                    'headline': {'main': 'Test Headline'},
                    'web_url': 'http://example.com',
                    'snippet': 'Test Snippet',
                    'pub_date': '2024-01-01T00:00:00Z',
                    'multimedia': {'default': {'url': 'http://image.com'}}
                }
            ]
        }
    }
    mock_requests_get.return_value = mock_response

    os.environ['NYT_API_KEY'] = 'test-api-key'
    response = client.get('/api/articles?q=test&page=1')

    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert data[0]['headline'] == 'Test Headline'

@patch('app.comments_collection.insert_one')
def test_create_comment(mock_insert_one, client):
    fake_id = ObjectId()
    mock_insert_one.return_value.inserted_id = fake_id

    with client.session_transaction() as sess:
        sess['user'] = {'email': 'test@example.com'}

    payload = {
        "article_id": str(ObjectId()),
        "text": "Sample comment",
        "parent_id": None
    }

    response = client.post('/api/comments', json=payload)
    assert response.status_code == 201
    assert response.get_json()['inserted_id'] == str(fake_id)

@patch('app.comments_collection.find')
def test_get_comments_with_replies(mock_find, client):
    article_id = str(ObjectId())
    comment_id = ObjectId()
    mock_find.return_value = [
        {
            "_id": comment_id,
            "article_id": ObjectId(article_id),
            "parent_id": None,
            "text": "Parent comment",
            "user": {"email": "test@example.com"},
            "created_at": datetime.utcnow()
        }
    ]
    response = client.get(f'/api/articles/{article_id}/comments')
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]['text'] == "Parent comment"

@patch('app.comments_collection.delete_many')
def test_delete_comment_authorized(mock_delete_many, client):
    comment_id = str(ObjectId())
    mock_delete_many.return_value.deleted_count = 2

    with client.session_transaction() as sess:
        sess['user'] = {"name": "admin"}

    response = client.delete(f'/api/comments/{comment_id}')
    assert response.status_code == 200
    assert response.get_json()['deleted_count'] == 2

def test_delete_comment_unauthorized(client):
    comment_id = str(ObjectId())
    with client.session_transaction() as sess:
        sess['user'] = {"name": "regular_user"}

    response = client.delete(f'/api/comments/{comment_id}')
    assert response.status_code == 403
    assert response.get_json()['error'] == "Unauthorized"