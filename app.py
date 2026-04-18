import os
import tempfile
import re
import json
import random
from flask import Flask, render_template, jsonify, request, send_file, session
from flask_cors import CORS
from mutagen import File
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.mp4 import MP4
from mutagen.oggvorbis import OggVorbis
import mimetypes
import threading
import time
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'your-secret-key-here-change-this'
CORS(app)

# ========== LINKED LIST ADT IMPLEMENTATION ==========
class SongNode:
    """Node for linked list - represents a single song"""
    def __init__(self, song_data):
        self.song = song_data
        self.next = None
        self.prev = None

class PlaylistADT:
    """Doubly Linked List implementation for playlist management"""
    def __init__(self, name="My Playlist"):
        self.name = name
        self.head = None
        self.tail = None
        self.size = 0
        self.current = None
    
    def add_song(self, song_data):
        """Add a song to the end of the playlist - prevents duplicates by path"""
        if self.song_exists(song_data.get('path')):
            return False
        
        new_node = SongNode(song_data)
        
        if self.head is None:
            self.head = new_node
            self.tail = new_node
        else:
            self.tail.next = new_node
            new_node.prev = self.tail
            self.tail = new_node
        
        self.size += 1
        return True
    
    def add_song_at_position(self, song_data, position):
        """Add a song at a specific position (1-based) - prevents duplicates"""
        if self.song_exists(song_data.get('path')):
            return False
        
        if position < 1 or position > self.size + 1:
            return False
        
        new_node = SongNode(song_data)
        
        if position == 1:
            # Insert at beginning
            new_node.next = self.head
            if self.head:
                self.head.prev = new_node
            self.head = new_node
            if self.tail is None:
                self.tail = new_node
        elif position == self.size + 1:
            # Insert at end
            new_node.prev = self.tail
            if self.tail:
                self.tail.next = new_node
            self.tail = new_node
            if self.head is None:
                self.head = new_node
        else:
            # Insert in middle
            current = self.head
            for i in range(1, position - 1):
                current = current.next
            
            new_node.next = current.next
            new_node.prev = current
            if current.next:
                current.next.prev = new_node
            current.next = new_node
        
        self.size += 1
        return True
    
    def song_exists(self, song_path):
        """Check if a song already exists in the playlist by path"""
        current = self.head
        while current:
            if current.song.get('path') == song_path:
                return True
            current = current.next
        return False
    
    def remove_song(self, position):
        """Remove a song by position (1-based)"""
        if position < 1 or position > self.size or self.head is None:
            return None
        
        removed_node = None
        
        if position == 1:
            # Remove first
            removed_node = self.head
            self.head = self.head.next
            if self.head:
                self.head.prev = None
            else:
                self.tail = None
        elif position == self.size:
            # Remove last
            removed_node = self.tail
            self.tail = self.tail.prev
            if self.tail:
                self.tail.next = None
            else:
                self.head = None
        else:
            # Remove middle
            current = self.head
            for i in range(1, position):
                current = current.next
            removed_node = current
            current.prev.next = current.next
            current.next.prev = current.prev
        
        self.size -= 1
        
        if self.current == removed_node:
            self.current = self.head
        
        return removed_node.song
    
    def move_song(self, from_position, to_position):
        if from_position < 1 or from_position > self.size or to_position < 1 or to_position > self.size:
            return False
        
        if from_position == to_position:
            return True
        
        # Remove the song first
        removed_song = self.remove_song(from_position)
        
        # Directly insert at target position
        return self.add_song_at_position(removed_song, to_position)
    
    def get_song(self, position):
        """Get song at specific position"""
        if position < 1 or position > self.size:
            return None
        
        current = self.head
        for i in range(1, position):
            current = current.next
        return current.song
    
    def get_all_songs(self):
        """Return all songs as a list"""
        songs = []
        current = self.head
        while current:
            songs.append(current.song)
            current = current.next
        return songs
    
    def play_sequential(self):
        """Return songs in original order"""
        return self.get_all_songs()
    
    def play_shuffled(self):
        """Return songs in random order"""
        songs = self.get_all_songs()
        shuffled = songs.copy()
        random.shuffle(shuffled)
        return shuffled
    
    def clear(self):
        """Clear all songs from playlist"""
        self.head = None
        self.tail = None
        self.size = 0
        self.current = None


# ========== MAIN MUSIC PLAYER CLASS ==========
class MusicPlayer:
    def __init__(self):
        self.reset_all_data()
        
    def reset_all_data(self):
        """Reset all data - clear library and all playlists"""
        self.current_folder = None
        self.library = []
        self.current_index = 0
        self.temp_files = {}
        self.upload_dir = None
        self.cleanup_thread = None
        
        # Playlist management using ADT
        self.playlists = {}
        self.current_playlist_id = None
        
        # Favorites
        self.favorites = PlaylistADT("Favorites")
        
        # Playback mode
        self.playback_mode = "sequential"
        
        # Playlist playback tracking
        self.current_playing_playlist_id = None
        self.current_playlist_song_index = 0
        
        # Create default empty playlist
        self.create_playlist("My Playlist")
        
        return True
        
    def get_upload_dir(self):
        if self.upload_dir is None:
            self.upload_dir = os.path.join(tempfile.gettempdir(), 'music_player_uploads')
            os.makedirs(self.upload_dir, exist_ok=True)
        return self.upload_dir
    
    def cleanup_old_files(self):
        while True:
            time.sleep(3600)
            try:
                current_time = time.time()
                for filename, filepath in list(self.temp_files.items()):
                    if os.path.exists(filepath):
                        file_age = current_time - os.path.getctime(filepath)
                        if file_age > 3600:
                            try:
                                os.remove(filepath)
                                del self.temp_files[filename]
                            except:
                                pass
            except:
                pass
    
    def parse_filename(self, filename):
        name_without_ext = os.path.splitext(filename)[0]
        name_without_ext = re.sub(r'\[.*?\]|\(.*?\)|\{.*?\}', '', name_without_ext)
        name_without_ext = re.sub(r'^\d+\s*[-._]?\s*', '', name_without_ext)
        
        artist = 'Unknown Artist'
        title = name_without_ext.strip()
        
        separators = [' - ', ' _ ', ' – ', ' — ', ' | ']
        for sep in separators:
            if sep in name_without_ext:
                parts = name_without_ext.split(sep, 1)
                if len(parts) == 2:
                    artist = parts[0].strip()
                    title = parts[1].strip()
                    break
        
        if artist == 'Unknown Artist' and '-' in title:
            parts = title.rsplit('-', 1)
            if len(parts) == 2:
                artist = parts[0].strip()
                title = parts[1].strip()
        
        artist = self.clean_name(artist)
        title = self.clean_name(title)
        
        if len(artist) > 50:
            artist = 'Unknown Artist'
        
        return artist, title
    
    def clean_name(self, name):
        name = name.replace('_', ' ').replace('-', ' ')
        name = ' '.join(name.split())
        words = []
        for word in name.split():
            if word.isupper() and len(word) > 1:
                words.append(word)
            else:
                words.append(word.capitalize())
        return ' '.join(words)
    
    def process_uploaded_files(self, files, folder_name):
        music_files = []
        upload_dir = self.get_upload_dir()
        
        if self.cleanup_thread is None or not self.cleanup_thread.is_alive():
            self.cleanup_thread = threading.Thread(target=self.cleanup_old_files, daemon=True)
            self.cleanup_thread.start()
        
        for file in files:
            try:
                filename = file.filename
                safe_filename = re.sub(r'[<>:"/\\|?*]', '_', os.path.basename(filename))
                
                temp_path = os.path.join(upload_dir, safe_filename)
                counter = 1
                while os.path.exists(temp_path):
                    name, ext = os.path.splitext(safe_filename)
                    temp_path = os.path.join(upload_dir, f"{name}_{counter}{ext}")
                    counter += 1
                
                file.save(temp_path)
                self.temp_files[os.path.basename(temp_path)] = temp_path
                
                metadata = self.get_metadata(temp_path)
                
                if not metadata.get('title') or metadata.get('title') == '':
                    artist, title = self.parse_filename(safe_filename)
                    metadata['artist'] = artist
                    metadata['title'] = title
                
                song_data = {
                    'path': temp_path,
                    'filename': os.path.basename(temp_path),
                    'title': metadata.get('title', os.path.splitext(safe_filename)[0]) or 'Unknown Title',
                    'artist': metadata.get('artist', 'Unknown Artist') or 'Unknown Artist',
                    'album': metadata.get('album', 'Unknown Album') or 'Unknown Album',
                    'duration': metadata.get('duration', 0),
                    'id': str(int(time.time() * 1000)) + str(counter)
                }
                music_files.append(song_data)
                
            except Exception as e:
                print(f"Error processing file {file.filename}: {e}")
                continue
        
        # APPEND new files to existing library instead of replacing
        self.library.extend(music_files)
        self.current_folder = folder_name
        
        # Add to default playlist (My Playlist) - append without duplicates
        for playlist_id, playlist in self.playlists.items():
            if playlist.name == "My Playlist":
                for song in music_files:
                    playlist.add_song(song)
                break
        
        return {
            'success': True,
            'files': music_files,
            'count': len(music_files),
            'total_library_size': len(self.library)
        }
    
    def get_metadata(self, file_path):
        metadata = {'title': None, 'artist': None, 'album': None, 'duration': 0}
        
        try:
            audio = File(file_path)
            if audio:
                if hasattr(audio.info, 'length'):
                    metadata['duration'] = int(audio.info.length)
                
                if hasattr(audio, 'get'):
                    if audio.get('TIT2'):
                        metadata['title'] = str(audio['TIT2'])
                    elif audio.get('title'):
                        metadata['title'] = audio['title'][0] if isinstance(audio['title'], list) else str(audio['title'])
                    
                    if audio.get('TPE1'):
                        metadata['artist'] = str(audio['TPE1'])
                    elif audio.get('artist'):
                        metadata['artist'] = audio['artist'][0] if isinstance(audio['artist'], list) else str(audio['artist'])
                    
                    if audio.get('TALB'):
                        metadata['album'] = str(audio['TALB'])
                    elif audio.get('album'):
                        metadata['album'] = audio['album'][0] if isinstance(audio['album'], list) else str(audio['album'])
                
                if isinstance(audio, MP3):
                    if audio.get('TIT2'):
                        metadata['title'] = str(audio['TIT2'])
                    if audio.get('TPE1'):
                        metadata['artist'] = str(audio['TPE1'])
                    if audio.get('TALB'):
                        metadata['album'] = str(audio['TALB'])
                elif isinstance(audio, FLAC):
                    if audio.get('title'):
                        metadata['title'] = audio['title'][0]
                    if audio.get('artist'):
                        metadata['artist'] = audio['artist'][0]
                    if audio.get('album'):
                        metadata['album'] = audio['album'][0]
                elif isinstance(audio, MP4):
                    if '\xa9nam' in audio:
                        metadata['title'] = audio['\xa9nam'][0]
                    if '\xa9ART' in audio:
                        metadata['artist'] = audio['\xa9ART'][0]
                    if '\xa9alb' in audio:
                        metadata['album'] = audio['\xa9alb'][0]
                elif isinstance(audio, OggVorbis):
                    if 'title' in audio:
                        metadata['title'] = audio['title'][0]
                    if 'artist' in audio:
                        metadata['artist'] = audio['artist'][0]
                    if 'album' in audio:
                        metadata['album'] = audio['album'][0]
        except Exception as e:
            print(f"Error reading metadata from {file_path}: {e}")
        
        for key in ['title', 'artist', 'album']:
            if metadata[key] and isinstance(metadata[key], list):
                metadata[key] = metadata[key][0]
            if metadata[key]:
                metadata[key] = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', str(metadata[key])).strip()
        
        return metadata
    
    # ========== PLAYLIST MANAGEMENT ==========
    
    def create_playlist(self, name):
        playlist_id = str(int(time.time() * 1000))
        playlist = PlaylistADT(name)
        self.playlists[playlist_id] = playlist
        return {'id': playlist_id, 'name': name, 'size': 0}
    
    def delete_playlist(self, playlist_id):
        if playlist_id in self.playlists:
            del self.playlists[playlist_id]
            if self.current_playlist_id == playlist_id:
                self.current_playlist_id = None
            if self.current_playing_playlist_id == playlist_id:
                self.current_playing_playlist_id = None
                self.current_playlist_song_index = 0
            return True
        return False
    
    def get_all_playlists(self):
        playlists = []
        for pid, playlist in self.playlists.items():
            playlists.append({
                'id': pid,
                'name': playlist.name,
                'size': playlist.size,
                'songs': playlist.get_all_songs()
            })
        return playlists
    
    def add_to_playlist(self, playlist_id, song_data, position=None):
        """Add song to playlist - prevents duplicates"""
        if playlist_id not in self.playlists:
            return False
        
        playlist = self.playlists[playlist_id]
        
        if playlist.song_exists(song_data.get('path')):
            return False
        
        if position is not None:
            return playlist.add_song_at_position(song_data, position)
        else:
            return playlist.add_song(song_data)
    
    def remove_from_playlist(self, playlist_id, position):
        if playlist_id not in self.playlists:
            return None
        
        playlist = self.playlists[playlist_id]
        return playlist.remove_song(position)
    
    def move_in_playlist(self, playlist_id, from_pos, to_pos):
        if playlist_id not in self.playlists:
            return False
        
        playlist = self.playlists[playlist_id]
        return playlist.move_song(from_pos, to_pos)
    
    def get_playlist_songs(self, playlist_id):
        if playlist_id not in self.playlists:
            return []
        
        playlist = self.playlists[playlist_id]
        
        if self.playback_mode == "shuffled":
            return playlist.play_shuffled()
        else:
            return playlist.play_sequential()
    
    def set_playback_mode(self, mode):
        if mode in ["sequential", "shuffled"]:
            self.playback_mode = mode
            return True
        return False
    
    def add_to_favorites(self, song_data):
        """Add song to favorites - prevents duplicates"""
        if self.favorites.song_exists(song_data.get('path')):
            return False
        return self.favorites.add_song(song_data)
    
    def remove_from_favorites(self, position):
        return self.favorites.remove_song(position)
    
    def get_favorites(self):
        return self.favorites.get_all_songs()
    
    def is_favorite(self, song_path):
        return self.favorites.song_exists(song_path)
    
    # ========== PLAYLIST PLAYBACK METHODS ==========
    
    def set_current_playing_playlist(self, playlist_id):
        if playlist_id in self.playlists:
            self.current_playing_playlist_id = playlist_id
            self.current_playlist_song_index = 0
            return True
        return False
    
    def get_current_playlist_song(self):
        if self.current_playing_playlist_id and self.current_playing_playlist_id in self.playlists:
            playlist = self.playlists[self.current_playing_playlist_id]
            songs = playlist.get_all_songs()
            if 0 <= self.current_playlist_song_index < len(songs):
                return songs[self.current_playlist_song_index]
        return None
    
    def play_next_in_playlist(self):
        if self.current_playing_playlist_id and self.current_playing_playlist_id in self.playlists:
            playlist = self.playlists[self.current_playing_playlist_id]
            songs = playlist.get_all_songs()
            if songs:
                self.current_playlist_song_index = (self.current_playlist_song_index + 1) % len(songs)
                return songs[self.current_playlist_song_index]
        return None
    
    def play_previous_in_playlist(self):
        if self.current_playing_playlist_id and self.current_playing_playlist_id in self.playlists:
            playlist = self.playlists[self.current_playing_playlist_id]
            songs = playlist.get_all_songs()
            if songs:
                self.current_playlist_song_index = (self.current_playlist_song_index - 1 + len(songs)) % len(songs)
                return songs[self.current_playlist_song_index]
        return None
    
    def play_song_from_playlist(self, playlist_id, position):
        if playlist_id in self.playlists:
            playlist = self.playlists[playlist_id]
            songs = playlist.get_all_songs()
            if 1 <= position <= len(songs):
                self.current_playing_playlist_id = playlist_id
                self.current_playlist_song_index = position - 1
                return songs[position - 1]
        return None
    
    def get_current_playlist_info(self):
        if self.current_playing_playlist_id and self.current_playing_playlist_id in self.playlists:
            playlist = self.playlists[self.current_playing_playlist_id]
            return {
                'id': self.current_playing_playlist_id,
                'name': playlist.name,
                'index': self.current_playlist_song_index,
                'size': playlist.size
            }
        return None


# ========== GLOBAL MUSIC PLAYER INSTANCE ==========
music_player = MusicPlayer()

@app.route('/')
def index():
    music_player.reset_all_data()
    return render_template('index.html')

@app.route('/api/reset', methods=['POST'])
def reset_all():
    music_player.reset_all_data()
    return jsonify({
        'success': True,
        'message': 'All data reset',
        'library': music_player.library,
        'playlists': music_player.get_all_playlists(),
        'favorites': music_player.get_favorites()
    })

@app.route('/api/upload_files', methods=['POST'])
def upload_files():
    try:
        files = request.files.getlist('files[]')
        folder_name = request.form.get('folder_path', 'uploaded_files')
        
        if not files or len(files) == 0:
            return jsonify({'success': False, 'error': 'No files uploaded'})
        
        result = music_player.process_uploaded_files(files, folder_name)
        return jsonify(result)
    
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/audio/<path:filepath>')
def serve_audio(filepath):
    try:
        import urllib.parse
        filepath = urllib.parse.unquote(filepath)
        
        filename = os.path.basename(filepath)
        
        if filename in music_player.temp_files:
            filepath = music_player.temp_files[filename]
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404
        
        size = os.path.getsize(filepath)
        mime_type = mimetypes.guess_type(filepath)[0] or 'audio/mpeg'
        
        range_header = request.headers.get('Range', None)
        
        if not range_header:
            return send_file(filepath, mimetype=mime_type)
        
        range_match = range_header.strip().split('=')[1]
        range_parts = range_match.split('-')
        byte1 = int(range_parts[0]) if range_parts[0] else 0
        byte2 = int(range_parts[1]) if len(range_parts) > 1 and range_parts[1] else size - 1
        
        if byte1 >= size or byte2 >= size:
            return send_file(filepath, mimetype=mime_type)
        
        length = byte2 - byte1 + 1
        
        with open(filepath, 'rb') as f:
            f.seek(byte1)
            data = f.read(length)
        
        response = app.response_class(data, 206, mimetype=mime_type, direct_passthrough=True)
        response.headers.add('Content-Range', f'bytes {byte1}-{byte2}/{size}')
        response.headers.add('Accept-Ranges', 'bytes')
        response.headers.add('Content-Length', str(length))
        
        return response
    
    except Exception as e:
        print(f"Audio serving error: {e}")
        return jsonify({'error': str(e)}), 500

# ========== PLAYLIST API ENDPOINTS ==========

@app.route('/api/playlists', methods=['GET'])
def get_playlists():
    return jsonify({
        'success': True,
        'playlists': music_player.get_all_playlists()
    })

@app.route('/api/playlists', methods=['POST'])
def create_playlist():
    data = request.get_json()
    name = data.get('name', 'New Playlist')
    result = music_player.create_playlist(name)
    return jsonify({
        'success': True,
        'playlist': result
    })

@app.route('/api/playlists/<playlist_id>', methods=['DELETE'])
def delete_playlist(playlist_id):
    success = music_player.delete_playlist(playlist_id)
    return jsonify({'success': success})

@app.route('/api/playlists/<playlist_id>/songs', methods=['GET'])
def get_playlist_songs(playlist_id):
    songs = music_player.get_playlist_songs(playlist_id)
    return jsonify({
        'success': True,
        'songs': songs,
        'playback_mode': music_player.playback_mode
    })

@app.route('/api/playlists/<playlist_id>/songs', methods=['POST'])
def add_to_playlist(playlist_id):
    data = request.get_json()
    song_data = data.get('song')
    position = data.get('position')
    
    success = music_player.add_to_playlist(playlist_id, song_data, position)
    return jsonify({'success': success})

@app.route('/api/playlists/<playlist_id>/songs/<int:position>', methods=['DELETE'])
def remove_from_playlist(playlist_id, position):
    removed_song = music_player.remove_from_playlist(playlist_id, position)
    return jsonify({
        'success': removed_song is not None,
        'removed_song': removed_song
    })

@app.route('/api/playlists/<playlist_id>/move', methods=['POST'])
def move_in_playlist(playlist_id):
    data = request.get_json()
    from_pos = data.get('from_position')
    to_pos = data.get('to_position')
    
    success = music_player.move_in_playlist(playlist_id, from_pos, to_pos)
    return jsonify({'success': success})

# ========== PLAYLIST PLAYBACK API ENDPOINTS ==========

@app.route('/api/playlists/<playlist_id>/play', methods=['POST'])
def play_playlist(playlist_id):
    success = music_player.set_current_playing_playlist(playlist_id)
    song = music_player.get_current_playlist_song()
    return jsonify({
        'success': success,
        'song': song,
        'playlist_id': playlist_id
    })

@app.route('/api/playlists/<playlist_id>/play/<int:position>', methods=['POST'])
def play_playlist_song(playlist_id, position):
    song = music_player.play_song_from_playlist(playlist_id, position)
    return jsonify({
        'success': song is not None,
        'song': song,
        'playlist_id': playlist_id,
        'position': position
    })

@app.route('/api/playlists/next', methods=['GET'])
def play_next_in_playlist():
    song = music_player.play_next_in_playlist()
    return jsonify({
        'success': song is not None,
        'song': song
    })

@app.route('/api/playlists/previous', methods=['GET'])
def play_previous_in_playlist():
    song = music_player.play_previous_in_playlist()
    return jsonify({
        'success': song is not None,
        'song': song
    })

@app.route('/api/playlists/current', methods=['GET'])
def get_current_playlist():
    info = music_player.get_current_playlist_info()
    return jsonify({
        'success': True,
        'playlist_info': info
    })

# ========== PLAYBACK MODE API ENDPOINTS ==========

@app.route('/api/playback/mode', methods=['POST'])
def set_playback_mode():
    data = request.get_json()
    mode = data.get('mode', 'sequential')
    success = music_player.set_playback_mode(mode)
    return jsonify({
        'success': success,
        'playback_mode': music_player.playback_mode
    })

# ========== FAVORITES API ENDPOINTS ==========

@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    return jsonify({
        'success': True,
        'favorites': music_player.get_favorites()
    })

@app.route('/api/favorites', methods=['POST'])
def add_to_favorites():
    data = request.get_json()
    song_data = data.get('song')
    success = music_player.add_to_favorites(song_data)
    return jsonify({'success': success})

@app.route('/api/favorites/<int:position>', methods=['DELETE'])
def remove_from_favorites(position):
    removed_song = music_player.remove_from_favorites(position)
    return jsonify({
        'success': removed_song is not None,
        'removed_song': removed_song
    })

# ========== LIBRARY API ENDPOINTS ==========

@app.route('/api/library', methods=['GET'])
def get_library():
    return jsonify({
        'success': True,
        'library': music_player.library
    })

@app.route('/api/sort_az', methods=['POST'])
def sort_az():
    music_player.library.sort(key=lambda x: x.get('title', '').lower())
    return jsonify({
        'success': True,
        'library': music_player.library
    })

@app.route('/api/sort_za', methods=['POST'])
def sort_za():
    music_player.library.sort(key=lambda x: x.get('title', '').lower(), reverse=True)
    return jsonify({
        'success': True,
        'library': music_player.library
    })

@app.route('/api/restore_order', methods=['POST'])
def restore_order():
    return jsonify({
        'success': True,
        'library': music_player.library
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)