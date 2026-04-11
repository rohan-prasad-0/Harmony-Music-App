import pytest
import json
from app import app, PlaylistADT, MusicPlayer

# ========== FIXTURES ==========

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def sample_song():
    return {
        'path': 'song1.mp3',
        'filename': 'song1.mp3',
        'title': 'Song One',
        'artist': 'Artist One',
        'album': 'Album One',
        'duration': 100,
        'id': '1'
    }

# ========== ADT TESTS ==========

def test_add_song(sample_song):
    playlist = PlaylistADT()
    assert playlist.add_song(sample_song) == True
    assert playlist.size == 1

def test_duplicate_song(sample_song):
    playlist = PlaylistADT()
    playlist.add_song(sample_song)
    
    assert playlist.add_song(sample_song) == False
    assert playlist.size == 1

def test_add_song_at_position(sample_song):
    playlist = PlaylistADT()
    playlist.add_song(sample_song)
    
    new_song = sample_song.copy()
    new_song['path'] = 'song2.mp3'
    
    result = playlist.add_song_at_position(new_song, 1)
    
    assert result == True
    assert playlist.size == 2
    assert playlist.get_song(1)['path'] == 'song2.mp3'

def test_remove_song(sample_song):
    playlist = PlaylistADT()
    playlist.add_song(sample_song)
    
    removed = playlist.remove_song(1)
    
    assert removed['title'] == 'Song One'
    assert playlist.size == 0

def test_move_song(sample_song):
    playlist = PlaylistADT()
    
    song2 = sample_song.copy()
    song2['path'] = 'song2.mp3'
    
    playlist.add_song(sample_song)
    playlist.add_song(song2)
    
    result = playlist.move_song(1, 2)
    
    assert result == True
    assert playlist.get_song(2)['path'] == 'song1.mp3'

def test_get_all_songs(sample_song):
    playlist = PlaylistADT()
    
    for i in range(3):
        s = sample_song.copy()
        s['path'] = f"{i}.mp3"
        playlist.add_song(s)
    
    songs = playlist.get_all_songs()
    
    assert len(songs) == 3

def test_shuffle(sample_song):
    playlist = PlaylistADT()
    
    for i in range(5):
        s = sample_song.copy()
        s['path'] = f"{i}.mp3"
        playlist.add_song(s)
    
    shuffled = playlist.play_shuffled()
    
    assert len(shuffled) == 5

# ========== MUSIC PLAYER TESTS ==========

def test_create_playlist():
    player = MusicPlayer()
    result = player.create_playlist("Test Playlist")
    
    assert result['name'] == "Test Playlist"

def test_add_to_playlist(sample_song):
    player = MusicPlayer()
    playlist = player.create_playlist("Test")
    
    result = player.add_to_playlist(playlist['id'], sample_song)
    
    assert result == True

def test_prevent_duplicate_in_playlist(sample_song):
    player = MusicPlayer()
    playlist = player.create_playlist("Test")
    
    player.add_to_playlist(playlist['id'], sample_song)
    result = player.add_to_playlist(playlist['id'], sample_song)
    
    assert result == False

def test_favorites(sample_song):
    player = MusicPlayer()
    
    assert player.add_to_favorites(sample_song) == True
    assert len(player.get_favorites()) == 1

# ========== API TESTS ==========

def test_home_route(client):
    response = client.get('/')
    assert response.status_code == 200

def test_reset_api(client):
    response = client.post('/api/reset')
    data = response.get_json()
    
    assert data['success'] == True

def test_create_playlist_api(client):
    response = client.post(
        '/api/playlists',
        data=json.dumps({'name': 'API Playlist'}),
        content_type='application/json'
    )
    
    data = response.get_json()
    
    assert data['success'] == True
    assert data['playlist']['name'] == 'API Playlist'

def test_get_playlists(client):
    response = client.get('/api/playlists')
    data = response.get_json()
    
    assert data['success'] == True

def test_add_to_playlist_api(client, sample_song):
    # Create playlist first
    res = client.post(
        '/api/playlists',
        data=json.dumps({'name': 'Test'}),
        content_type='application/json'
    )
    playlist_id = res.get_json()['playlist']['id']
    
    # Add song
    response = client.post(
        f'/api/playlists/{playlist_id}/songs',
        data=json.dumps({'song': sample_song}),
        content_type='application/json'
    )
    
    data = response.get_json()
    assert data['success'] == True

def test_favorites_api(client, sample_song):
    response = client.post(
        '/api/favorites',
        data=json.dumps({'song': sample_song}),
        content_type='application/json'
    )
    
    data = response.get_json()
    assert data['success'] == True

def test_get_library(client):
    response = client.get('/api/library')
    data = response.get_json()
    
    assert data['success'] == True

def test_sort_az(client):
    response = client.post('/api/sort_az')
    data = response.get_json()
    
    assert data['success'] == True

def test_sort_za(client):
    response = client.post('/api/sort_za')
    data = response.get_json()
    
    assert data['success'] == True

def test_playback_mode(client):
    response = client.post(
        '/api/playback/mode',
        data=json.dumps({'mode': 'shuffled'}),
        content_type='application/json'
    )
    
    data = response.get_json()
    
    assert data['success'] == True
    assert data['playback_mode'] == 'shuffled'