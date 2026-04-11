/**
 * Harmony Music Player 
 */
class MusicPlayer {
    constructor() {
        // Audio elements
        this.audioPlayer = document.getElementById('audioPlayer');
        
        // Data storage
        this.playlist = [];
        this.originalPlaylist = [];
        this.currentIndex = 0;
        this.searchTerm = '';
        this.favoritePaths = new Set();
        
        // Track current playing song by path 
        this.currentPlayingSongPath = null;
        
        // Playback state
        this.isPlaying = false;
        this.isShuffle = false;  // For library
        this.isPlaylistShuffle = false;  // For playlists (ADDED)
        this.isRepeat = false;
        this.currentSortType = null;
        
        // Shuffled playlist for library
        this.shuffledPlaylist = [];
        
        // Playlist playback state
        this.isPlayingFromPlaylist = false;
        this.currentPlaylistId = null;
        this.currentPlaylistSongIndex = 0;
        this.currentPlaylistSongs = [];
        this.currentPlaylistSongsShuffled = null;
        
        // Drag and drop state
        this.draggedItem = null;
        
        // Volume
        this.lastVolume = 0.7;
        
        // Animation
        this.animationFrame = null;
        this.waveformBars = null;
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.waveformVisible = false;
        
        // UI State
        this.currentView = 'library';
        this.playlists = [];
        
        // Initialize
        this.initElements();
        this.initEventListeners();
        this.loadPlaylists();
        this.loadFavorites();
        
        if (this.audioPlayer) {
            this.audioPlayer.volume = 0.7;
            if (this.volumeFill) this.volumeFill.style.width = '70%';
        }
    }
    
    initElements() {
        this.selectFolderBtn = document.getElementById('selectFolderBtn');
        this.selectFilesBtn = document.getElementById('selectFilesBtn');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.repeatBtn = document.getElementById('repeatBtn');
        
        this.navLibrary = document.getElementById('navLibrary');
        this.navArtists = document.getElementById('navArtists');
        this.navAlbums = document.getElementById('navAlbums');
        this.navPlaylists = document.getElementById('navPlaylists');
        this.navFavorites = document.getElementById('navFavorites');
        
        this.content = document.getElementById('content');
        this.viewTitle = document.getElementById('viewTitle');
        this.songCount = document.getElementById('songCount');
        
        this.folderInput = document.getElementById('folderInput');
        this.filesInput = document.getElementById('filesInput');
        
        const selectedFolderDiv = document.getElementById('selectedFolder');
        if (selectedFolderDiv) {
            this.selectedFolder = selectedFolderDiv.querySelector('span');
        }
        
        this.nowPlayingTitle = document.getElementById('nowPlayingTitle');
        this.nowPlayingArtist = document.getElementById('nowPlayingArtist');
        this.currentTime = document.getElementById('currentTime');
        this.totalTime = document.getElementById('totalTime');
        
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.volumeBar = document.getElementById('volumeBar');
        this.volumeFill = document.getElementById('volumeFill');
        this.volumeIcon = document.getElementById('volumeIcon');
        
        this.searchInput = document.getElementById('searchInput');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        
        this.playlistsList = document.getElementById('playlistsList');
        this.createPlaylistBtn = document.getElementById('createPlaylistBtn');
        this.favoriteCurrentBtn = document.getElementById('favoriteCurrentBtn');
        
        this.createPlaylistModal = document.getElementById('createPlaylistModal');
        this.addToPlaylistModal = document.getElementById('addToPlaylistModal');
        this.playlistNameInput = document.getElementById('playlistNameInput');
        this.playlistDescInput = document.getElementById('playlistDescInput');
        this.savePlaylistBtn = document.getElementById('savePlaylistBtn');
        this.cancelPlaylistBtn = document.getElementById('cancelPlaylistBtn');
        this.playlistOptions = document.getElementById('playlistOptions');
        
        this.waveformContainer = document.getElementById('waveformContainer');
    }
    
    initEventListeners() {
        if (this.selectFolderBtn) {
            this.selectFolderBtn.addEventListener('click', () => this.folderInput.click());
        }
        if (this.selectFilesBtn) {
            this.selectFilesBtn.addEventListener('click', () => this.filesInput.click());
        }
        if (this.folderInput) {
            this.folderInput.addEventListener('change', (e) => this.handleFolderSelected(e));
        }
        if (this.filesInput) {
            this.filesInput.addEventListener('change', (e) => this.handleFilesSelected(e));
        }
        
        if (this.playPauseBtn) this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.playPrevious());
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.playNext());
        if (this.shuffleBtn) this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        if (this.repeatBtn) this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        
        if (this.audioPlayer) {
            this.audioPlayer.addEventListener('play', () => this.updatePlayPauseIcon());
            this.audioPlayer.addEventListener('pause', () => this.updatePlayPauseIcon());
            this.audioPlayer.addEventListener('ended', () => this.handleSongEnd());
            this.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
            this.audioPlayer.addEventListener('loadedmetadata', () => this.updateTotalTime());
            this.audioPlayer.addEventListener('canplay', () => {
                this.setupAudioContext();
            });
        }
        
        if (this.progressBar) {
            this.progressBar.addEventListener('click', (e) => this.seek(e));
        }
        
        if (this.volumeBar) {
            this.volumeBar.addEventListener('click', (e) => this.adjustVolume(e));
        }
        
        if (this.volumeIcon) {
            this.volumeIcon.addEventListener('click', () => this.toggleMute());
        }
        
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.handleSearch());
        }
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => this.clearSearch());
        }
        
        if (this.navLibrary) this.navLibrary.addEventListener('click', () => this.switchView('library'));
        if (this.navArtists) this.navArtists.addEventListener('click', () => this.switchView('artists'));
        if (this.navAlbums) this.navAlbums.addEventListener('click', () => this.switchView('albums'));
        if (this.navPlaylists) this.navPlaylists.addEventListener('click', () => this.switchView('playlists'));
        if (this.navFavorites) this.navFavorites.addEventListener('click', () => this.switchView('favorites'));
        
        if (this.createPlaylistBtn) {
            this.createPlaylistBtn.addEventListener('click', () => this.showCreatePlaylistModal());
        }
        if (this.savePlaylistBtn) {
            this.savePlaylistBtn.addEventListener('click', () => this.createPlaylist());
        }
        if (this.cancelPlaylistBtn) {
            this.cancelPlaylistBtn.addEventListener('click', () => this.hideCreatePlaylistModal());
        }
        
        if (this.favoriteCurrentBtn) {
            this.favoriteCurrentBtn.addEventListener('click', () => this.toggleFavoriteCurrent());
        }
        
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.createPlaylistModal) this.createPlaylistModal.classList.remove('active');
                if (this.addToPlaylistModal) this.addToPlaylistModal.classList.remove('active');
            });
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === this.createPlaylistModal) {
                this.createPlaylistModal.classList.remove('active');
            }
            if (e.target === this.addToPlaylistModal) {
                this.addToPlaylistModal.classList.remove('active');
            }
        });
    }
    
    toggleMute() {
        if (!this.audioPlayer) return;
        if (this.audioPlayer.volume > 0) {
            this.lastVolume = this.audioPlayer.volume;
            this.audioPlayer.volume = 0;
            if (this.volumeFill) this.volumeFill.style.width = '0%';
            if (this.volumeIcon) this.volumeIcon.className = 'fas fa-volume-mute';
        } else {
            this.audioPlayer.volume = this.lastVolume || 0.7;
            if (this.volumeFill) this.volumeFill.style.width = (this.audioPlayer.volume * 100) + '%';
            if (this.volumeIcon) {
                if (this.audioPlayer.volume < 0.3) {
                    this.volumeIcon.className = 'fas fa-volume-down';
                } else {
                    this.volumeIcon.className = 'fas fa-volume-up';
                }
            }
        }
    }
    
    // ========== GET CURRENT PLAYING SONG  ==========
    
    getCurrentPlayingSong() {
        // First try to find by stored path
        if (this.currentPlayingSongPath) {
            let songsToUse = this.playlist;
            if (this.isPlayingFromPlaylist && this.currentPlaylistId) {
                if (this.isPlaylistShuffle && this.currentPlaylistSongsShuffled) {
                    const song = this.currentPlaylistSongsShuffled.find(s => s.path === this.currentPlayingSongPath);
                    if (song) return song;
                } else if (this.currentPlaylistSongs) {
                    const song = this.currentPlaylistSongs.find(s => s.path === this.currentPlayingSongPath);
                    if (song) return song;
                }
            } else {
                if (this.isShuffle && this.shuffledPlaylist.length) {
                    const song = this.shuffledPlaylist.find(s => s.path === this.currentPlayingSongPath);
                    if (song) return song;
                } else {
                    const song = this.playlist.find(s => s.path === this.currentPlayingSongPath);
                    if (song) return song;
                }
            }
        }
        
        // Fallback to index-based lookup
        if (this.isPlayingFromPlaylist && this.currentPlaylistId) {
            if (this.isPlaylistShuffle && this.currentPlaylistSongsShuffled) {
                return this.currentPlaylistSongsShuffled[this.currentPlaylistSongIndex];
            } else if (this.currentPlaylistSongs) {
                return this.currentPlaylistSongs[this.currentPlaylistSongIndex];
            }
            return null;
        }
        
        let songsToUse = this.playlist;
        if (this.isShuffle && this.shuffledPlaylist.length) {
            songsToUse = this.shuffledPlaylist;
        }
        
        if (this.currentIndex >= 0 && this.currentIndex < songsToUse.length) {
            return songsToUse[this.currentIndex];
        }
        return null;
    }
    
    createShuffledPlaylist() {
        if (!this.playlist.length) return;
        this.shuffledPlaylist = [...this.playlist];
        for (let i = this.shuffledPlaylist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffledPlaylist[i], this.shuffledPlaylist[j]] = [this.shuffledPlaylist[j], this.shuffledPlaylist[i]];
        }
    }
    
    getCurrentPlaylistForPlayback() {
        if (this.isPlayingFromPlaylist && this.currentPlaylistId) {
            return null;
        }
        if (this.isShuffle && this.shuffledPlaylist.length) {
            return this.shuffledPlaylist;
        }
        return this.playlist;
    }
    
    // ========== SHUFFLE ==========
    
    toggleShuffle() {
        // Check if we're currently viewing/playing a playlist
        if (this.currentView === 'playlists' && this.currentPlaylistId) {
            this.togglePlaylistShuffle();
        } else {
            this.toggleLibraryShuffle();
        }
    }
    
    toggleLibraryShuffle() {
        this.isShuffle = !this.isShuffle;
        if (this.shuffleBtn) this.shuffleBtn.classList.toggle('active', this.isShuffle);
        
        const currentSongPath = this.currentPlayingSongPath;
        
        if (this.isShuffle) {
            this.createShuffledPlaylist();
            if (currentSongPath) {
                const newIndex = this.shuffledPlaylist.findIndex(s => s.path === currentSongPath);
                if (newIndex !== -1) {
                    this.currentIndex = newIndex;
                }
            }
            this.showNotification('Library Shuffle ON', 'success');
        } else {
            if (currentSongPath) {
                const newIndex = this.playlist.findIndex(s => s.path === currentSongPath);
                if (newIndex !== -1) {
                    this.currentIndex = newIndex;
                }
            }
            this.showNotification('Library Shuffle OFF', 'success');
        }
        
        this.renderLibrary();
    }
    
    async togglePlaylistShuffle() {
        if (!this.currentPlaylistId) {
            this.showNotification('No playlist selected', 'error');
            return;
        }
        
        this.isPlaylistShuffle = !this.isPlaylistShuffle;
        if (this.shuffleBtn) this.shuffleBtn.classList.toggle('active', this.isPlaylistShuffle);
        
        const songs = await this.getPlaylistSongs(this.currentPlaylistId);
        
        if (this.isPlaylistShuffle) {
            // Create shuffled version of playlist songs
            this.currentPlaylistSongsShuffled = [...songs];
            for (let i = this.currentPlaylistSongsShuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.currentPlaylistSongsShuffled[i], this.currentPlaylistSongsShuffled[j]] = 
                [this.currentPlaylistSongsShuffled[j], this.currentPlaylistSongsShuffled[i]];
            }
            
            // Find current song in shuffled playlist
            const currentSongPath = this.currentPlayingSongPath;
            if (currentSongPath) {
                const newIndex = this.currentPlaylistSongsShuffled.findIndex(s => s.path === currentSongPath);
                if (newIndex !== -1) {
                    this.currentPlaylistSongIndex = newIndex;
                }
            }
            
            this.showNotification('Playlist Shuffle ON', 'success');
        } else {
            // Restore original order
            this.currentPlaylistSongsShuffled = null;
            
            // Find current song in original playlist
            const currentSongPath = this.currentPlayingSongPath;
            if (currentSongPath) {
                const newIndex = songs.findIndex(s => s.path === currentSongPath);
                if (newIndex !== -1) {
                    this.currentPlaylistSongIndex = newIndex;
                }
            }
            
            this.showNotification('Playlist Shuffle OFF', 'success');
        }
        
        // Re-render the playlist view to show the new order
        await this.renderPlaylistSongs(this.currentPlaylistId);
    }
    
    // ========== SORTING  ==========
    
    async sortLibraryAZ() {
        if (this.originalPlaylist.length === 0) {
            this.originalPlaylist = [...this.playlist];
        }
        
        const currentSongPath = this.currentPlayingSongPath;
        
        this.playlist.sort((a, b) => (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase()));
        if (this.isShuffle) this.createShuffledPlaylist();
        this.currentSortType = 'az';
        
        if (currentSongPath) {
            let songsToUse = this.playlist;
            if (this.isShuffle && this.shuffledPlaylist.length) {
                songsToUse = this.shuffledPlaylist;
            }
            const newIndex = songsToUse.findIndex(s => s.path === currentSongPath);
            if (newIndex !== -1) {
                this.currentIndex = newIndex;
            }
        }
        
        this.renderLibrary();
        this.showNotification('Sorted A-Z ✓', 'success');
    }
    
    async sortLibraryZA() {
        if (this.originalPlaylist.length === 0) {
            this.originalPlaylist = [...this.playlist];
        }
        
        const currentSongPath = this.currentPlayingSongPath;
        
        this.playlist.sort((a, b) => (b.title || '').toLowerCase().localeCompare((a.title || '').toLowerCase()));
        if (this.isShuffle) this.createShuffledPlaylist();
        this.currentSortType = 'za';
        
        if (currentSongPath) {
            let songsToUse = this.playlist;
            if (this.isShuffle && this.shuffledPlaylist.length) {
                songsToUse = this.shuffledPlaylist;
            }
            const newIndex = songsToUse.findIndex(s => s.path === currentSongPath);
            if (newIndex !== -1) {
                this.currentIndex = newIndex;
            }
        }
        
        this.renderLibrary();
        this.showNotification('Sorted Z-A ✓', 'success');
    }
    
    async restoreOriginalOrder() {
        if (this.originalPlaylist.length > 0) {
            const currentSongPath = this.currentPlayingSongPath;
            
            this.playlist = [...this.originalPlaylist];
            if (this.isShuffle) this.createShuffledPlaylist();
            this.currentSortType = null;
            
            if (currentSongPath) {
                let songsToUse = this.playlist;
                if (this.isShuffle && this.shuffledPlaylist.length) {
                    songsToUse = this.shuffledPlaylist;
                }
                const newIndex = songsToUse.findIndex(s => s.path === currentSongPath);
                if (newIndex !== -1) {
                    this.currentIndex = newIndex;
                }
            }
            
            this.renderLibrary();
            this.showNotification('Original order restored', 'success');
        } else {
            this.showNotification('No original order to restore', 'error');
        }
    }
    
    // ========== DRAG AND DROP ==========
    
    async moveInPlaylist(playlistId, fromPosition, toPosition) {
        if (fromPosition === toPosition) return;
        try {
            const response = await fetch(`/api/playlists/${playlistId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from_position: fromPosition, to_position: toPosition })
            });
            const data = await response.json();
            if (data.success) {
                await this.renderPlaylistSongs(playlistId);
                await this.loadPlaylists();
                this.showNotification('Song moved successfully', 'success');
            }
        } catch (error) {
            console.error('Error moving song:', error);
        }
    }
    
    setupDragAndDropForLibrary() {
        const dragItems = document.querySelectorAll('.drag-item');
        dragItems.forEach(item => {
            item.setAttribute('draggable', 'true');
            item.removeEventListener('dragstart', this.handleDragStart);
            item.removeEventListener('dragend', this.handleDragEnd);
            item.removeEventListener('dragover', this.handleDragOver);
            item.removeEventListener('dragleave', this.handleDragLeave);
            item.removeEventListener('drop', this.handleDrop);
            
            this.handleDragStart = (e) => {
                this.draggedItem = item;
                item.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
                const dragIcon = document.createElement('div');
                dragIcon.textContent = '🎵';
                e.dataTransfer.setDragImage(dragIcon, 0, 0);
            };
            this.handleDragEnd = () => {
                if (this.draggedItem) this.draggedItem.style.opacity = '';
                this.draggedItem = null;
                document.querySelectorAll('.drag-item').forEach(i => i.classList.remove('drag-over-top', 'drag-over-bottom'));
            };
            this.handleDragOver = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (!this.draggedItem || this.draggedItem === item) return;
                const rect = item.getBoundingClientRect();
                const mouseY = e.clientY;
                const threshold = rect.top + rect.height / 2;
                item.classList.remove('drag-over-top', 'drag-over-bottom');
                if (mouseY < threshold) item.classList.add('drag-over-top');
                else item.classList.add('drag-over-bottom');
            };
            this.handleDragLeave = () => item.classList.remove('drag-over-top', 'drag-over-bottom');
            this.handleDrop = async (e) => {
                e.preventDefault();
                item.classList.remove('drag-over-top', 'drag-over-bottom');
                if (!this.draggedItem || this.draggedItem === item) return;
                
                const fromPosition = parseInt(this.draggedItem.dataset.position) - 1;  // Convert to 0-based index
                let toPosition = parseInt(item.dataset.position) - 1;  // Convert to 0-based index
                
                const rect = item.getBoundingClientRect();
                if (e.clientY > rect.top + rect.height / 2) {
                    toPosition++;  // Drop below the target item
                }
                
                if (fromPosition === toPosition) return;
                
                // Adjust toPosition if dragging downwards
                if (fromPosition < toPosition) {
                    toPosition--;
                }
                
                // Perform the move
                const movedSong = this.playlist[fromPosition];
                this.playlist.splice(fromPosition, 1);
                this.playlist.splice(toPosition, 0, movedSong);
                
                // Also update originalPlaylist if it exists
                if (this.originalPlaylist.length > 0) {
                    const originalMovedSong = this.originalPlaylist[fromPosition];
                    this.originalPlaylist.splice(fromPosition, 1);
                    this.originalPlaylist.splice(toPosition, 0, originalMovedSong);
                }
                
                this.currentSortType = null;
                this.renderLibrary();
                this.showNotification('Library reordered', 'success');
                
                if (this.draggedItem) this.draggedItem.style.opacity = '';
                this.draggedItem = null;
            };
            item.addEventListener('dragstart', this.handleDragStart);
            item.addEventListener('dragend', this.handleDragEnd);
            item.addEventListener('dragover', this.handleDragOver);
            item.addEventListener('dragleave', this.handleDragLeave);
            item.addEventListener('drop', this.handleDrop);
        });
    }
    
    setupDragAndDropForPlaylist() {
        const dragItems = document.querySelectorAll('.drag-item');
        dragItems.forEach(item => {
            item.setAttribute('draggable', 'true');
            item.removeEventListener('dragstart', this.handlePlaylistDragStart);
            item.removeEventListener('dragend', this.handlePlaylistDragEnd);
            item.removeEventListener('dragover', this.handlePlaylistDragOver);
            item.removeEventListener('dragleave', this.handlePlaylistDragLeave);
            item.removeEventListener('drop', this.handlePlaylistDrop);
            
            this.handlePlaylistDragStart = (e) => {
                this.draggedItem = item;
                item.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
                const dragIcon = document.createElement('div');
                dragIcon.textContent = '🎵';
                e.dataTransfer.setDragImage(dragIcon, 0, 0);
            };
            this.handlePlaylistDragEnd = () => {
                if (this.draggedItem) this.draggedItem.style.opacity = '';
                this.draggedItem = null;
                document.querySelectorAll('.drag-item').forEach(i => i.classList.remove('drag-over-top', 'drag-over-bottom'));
            };
            this.handlePlaylistDragOver = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (!this.draggedItem || this.draggedItem === item) return;
                const rect = item.getBoundingClientRect();
                const mouseY = e.clientY;
                const threshold = rect.top + rect.height / 2;
                item.classList.remove('drag-over-top', 'drag-over-bottom');
                if (mouseY < threshold) item.classList.add('drag-over-top');
                else item.classList.add('drag-over-bottom');
            };
            this.handlePlaylistDragLeave = () => item.classList.remove('drag-over-top', 'drag-over-bottom');
            this.handlePlaylistDrop = async (e) => {
                e.preventDefault();
                item.classList.remove('drag-over-top', 'drag-over-bottom');
                if (!this.draggedItem || this.draggedItem === item) return;
                
                const fromPosition = parseInt(this.draggedItem.dataset.position);
                let toPosition = parseInt(item.dataset.position);
                
                const rect = item.getBoundingClientRect();
                const isDraggingDown = fromPosition < toPosition;
                
                // Determine if dropping above or below the target
                if (e.clientY > rect.top + rect.height / 2) {
                    toPosition++; // Drop below
                }
                
                if (fromPosition === toPosition) return;
                
                // Adjust for drag direction
                let finalToPosition = toPosition;
                if (isDraggingDown && toPosition > fromPosition) {
                    finalToPosition = toPosition - 1;
                }
                
                // Call moveInPlaylist with 1-based positions
                await this.moveInPlaylist(this.currentPlaylistId, fromPosition, finalToPosition);
                
                if (this.draggedItem) this.draggedItem.style.opacity = '';
                this.draggedItem = null;
            };
            item.addEventListener('dragstart', this.handlePlaylistDragStart);
            item.addEventListener('dragend', this.handlePlaylistDragEnd);
            item.addEventListener('dragover', this.handlePlaylistDragOver);
            item.addEventListener('dragleave', this.handlePlaylistDragLeave);
            item.addEventListener('drop', this.handlePlaylistDrop);
        });
    }
    
    // ========== API CALLS ==========
    
    async loadPlaylists() {
        try {
            const response = await fetch('/api/playlists');
            const data = await response.json();
            if (data.success) {
                this.playlists = data.playlists;
                this.renderPlaylists();
            }
        } catch (error) {
            console.error('Error loading playlists:', error);
        }
    }
    
    async loadFavorites() {
        try {
            const response = await fetch('/api/favorites');
            const data = await response.json();
            if (data.success) {
                this.favoritePaths.clear();
                (data.favorites || []).forEach(song => {
                    if (song.path) this.favoritePaths.add(song.path);
                });
                this.updateAllFavoriteButtons();
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }
    
    async createPlaylist() {
        const name = this.playlistNameInput ? this.playlistNameInput.value.trim() : '';
        if (!name) {
            this.showNotification('Please enter a playlist name', 'error');
            return;
        }
        try {
            const response = await fetch('/api/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name })
            });
            const data = await response.json();
            if (data.success) {
                await this.loadPlaylists();
                this.hideCreatePlaylistModal();
                this.showNotification(`Playlist "${name}" created!`);
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
        }
    }
    
    async addSongToPlaylist(playlistId, song) {
        try {
            const response = await fetch(`/api/playlists/${playlistId}/songs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ song: song })
            });
            const data = await response.json();
            if (data.success) {
                this.showNotification('Added to playlist!');
                await this.loadPlaylists();
            } else {
                this.showNotification('Song already in playlist', 'error');
            }
        } catch (error) {
            console.error('Error adding to playlist:', error);
        }
    }
    
    async removeFromPlaylist(playlistId, position) {
        try {
            const response = await fetch(`/api/playlists/${playlistId}/songs/${position}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                this.showNotification('Removed from playlist');
                await this.loadPlaylists();
                if (this.currentView === 'playlists') {
                    await this.renderPlaylistSongs(playlistId);
                }
            }
        } catch (error) {
            console.error('Error removing from playlist:', error);
        }
    }
    
    async addToFavorites(song) {
        if (this.favoritePaths.has(song.path)) {
            this.showNotification('Song already in favorites', 'error');
            return;
        }
        try {
            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ song: song })
            });
            const data = await response.json();
            if (data.success) {
                this.favoritePaths.add(song.path);
                this.updateAllFavoriteButtons();
                this.showNotification('❤️ Added to favorites');
            }
        } catch (error) {
            console.error('Error adding to favorites:', error);
        }
    }
    
    async removeFromFavorites(position) {
        try {
            const response = await fetch(`/api/favorites/${position}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                await this.loadFavorites();
                this.showNotification('Removed from favorites');
                if (this.currentView === 'favorites') {
                    await this.renderFavoritesView();
                } else {
                    this.updateAllFavoriteButtons();
                }
            }
        } catch (error) {
            console.error('Error removing from favorites:', error);
        }
    }
    
    async getFavorites() {
        try {
            const response = await fetch('/api/favorites');
            const data = await response.json();
            return data.favorites || [];
        } catch (error) {
            console.error('Error getting favorites:', error);
            return [];
        }
    }
    
    async getPlaylistSongs(playlistId) {
        try {
            const response = await fetch(`/api/playlists/${playlistId}/songs`);
            const data = await response.json();
            return data.songs || [];
        } catch (error) {
            console.error('Error getting playlist songs:', error);
            return [];
        }
    }
    
    isSongFavorite(songPath) {
        return this.favoritePaths.has(songPath);
    }
    
    updateAllFavoriteButtons() {
        document.querySelectorAll('.song-favorite').forEach(btn => {
            const songPath = btn.dataset.path;
            if (songPath && this.favoritePaths.has(songPath)) {
                btn.classList.add('active');
                btn.style.color = '#ef4444';
                btn.innerHTML = '<i class="fas fa-heart"></i>';
                btn.title = 'Remove from favorites';
            } else if (songPath) {
                btn.classList.remove('active');
                btn.style.color = '';
                btn.innerHTML = '<i class="far fa-heart"></i>';
                btn.title = 'Add to favorites';
            }
        });
        
        const currentSong = this.getCurrentPlayingSong();
        if (this.favoriteCurrentBtn && currentSong) {
            const isFav = this.favoritePaths.has(currentSong.path);
            const icon = this.favoriteCurrentBtn.querySelector('i');
            if (icon) {
                if (isFav) {
                    icon.className = 'fas fa-heart';
                    this.favoriteCurrentBtn.classList.add('active');
                } else {
                    icon.className = 'far fa-heart';
                    this.favoriteCurrentBtn.classList.remove('active');
                }
            }
        }
    }
    
    // ========== TOGGLE FAVORITE CURRENT ==========
    
    toggleFavoriteCurrent() {
        const currentSong = this.getCurrentPlayingSong();
        
        if (!currentSong) {
            this.showNotification('No song is currently playing', 'error');
            return;
        }
        
        const isFav = this.isSongFavorite(currentSong.path);
        
        if (isFav) {
            this.getFavorites().then(favorites => {
                const favIndex = favorites.findIndex(f => f.path === currentSong.path);
                if (favIndex !== -1) {
                    this.removeFromFavorites(favIndex + 1);
                }
            });
        } else {
            this.addToFavorites(currentSong);
        }
    }
    
    // ========== UI RENDERING ==========
    
    switchView(view) {
        this.currentView = view;
        this.navLibrary?.classList.toggle('active', view === 'library');
        this.navArtists?.classList.toggle('active', view === 'artists');
        this.navAlbums?.classList.toggle('active', view === 'albums');
        this.navPlaylists?.classList.toggle('active', view === 'playlists');
        this.navFavorites?.classList.toggle('active', view === 'favorites');
        
        this.searchTerm = '';
        if (this.searchInput) this.searchInput.value = '';
        if (this.clearSearchBtn) this.clearSearchBtn.style.display = 'none';
        
        if (view === 'library') {
            if (this.viewTitle) this.viewTitle.textContent = 'All Songs';
            if (this.songCount) this.songCount.textContent = `${this.playlist.length} songs`;
            this.renderLibrary();
        } else if (view === 'artists') {
            if (this.viewTitle) this.viewTitle.textContent = 'Artists';
            this.renderArtists();
        } else if (view === 'albums') {
            if (this.viewTitle) this.viewTitle.textContent = 'Albums';
            this.renderAlbums();
        } else if (view === 'playlists') {
            if (this.viewTitle) this.viewTitle.textContent = 'Playlists';
            this.renderPlaylistsView();
        } else if (view === 'favorites') {
            if (this.viewTitle) this.viewTitle.textContent = 'Favorites';
            this.renderFavoritesView();
        }
    }
    
    renderLibrary() {
        if (!this.content) return;
        
        let songsToRender = this.playlist;
        if (this.searchTerm) {
            songsToRender = this.playlist.filter(song => 
                (song.title && song.title.toLowerCase().includes(this.searchTerm)) ||
                (song.artist && song.artist.toLowerCase().includes(this.searchTerm))
            );
        }
        
        if (songsToRender.length === 0) {
            this.content.innerHTML = `<div class="empty-state"><i class="fas fa-music"></i><p>No songs found</p><small>Click folder button to add music</small></div>`;
            return;
        }
        
        this.content.innerHTML = `
            <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                <div class="drag-instruction"><i class="fas fa-grip-vertical"></i> Drag to reorder library</div>
                <div class="sort-buttons">
                    <button id="sortAZBtn" class="sort-btn" style="padding: 8px 16px; background: ${this.currentSortType === 'az' ? '#7c3aed' : '#1a1a1a'}; border: none; border-radius: 20px; color: white; cursor: pointer;"><i class="fas fa-sort-alpha-down"></i> A-Z</button>
                    <button id="sortZABtn" class="sort-btn" style="padding: 8px 16px; background: ${this.currentSortType === 'za' ? '#7c3aed' : '#1a1a1a'}; border: none; border-radius: 20px; color: white; cursor: pointer;"><i class="fas fa-sort-alpha-up-alt"></i> Z-A</button>
                    <button id="restoreOrderBtn" class="sort-btn" style="padding: 8px 16px; background: ${this.currentSortType === null && this.originalPlaylist.length > 0 ? '#7c3aed' : '#1a1a1a'}; border: none; border-radius: 20px; color: white; cursor: pointer;" ${this.originalPlaylist.length === 0 ? 'disabled' : ''}><i class="fas fa-undo-alt"></i> Restore</button>
                </div>
            </div>
            <div class="song-list drag-container">
                ${songsToRender.map((song, idx) => {
                    let isActive = false;
                    if (!this.isPlayingFromPlaylist) {
                        const currentPlaylistForPlayback = this.getCurrentPlaylistForPlayback();
                        if (currentPlaylistForPlayback && currentPlaylistForPlayback[this.currentIndex]) {
                            isActive = currentPlaylistForPlayback[this.currentIndex].path === song.path;
                        }
                    }
                    const isFav = this.isSongFavorite(song.path);
                    return `
                        <div class="song-item drag-item ${isActive ? 'active' : ''}" data-path="${song.path}" data-position="${idx + 1}" data-song='${JSON.stringify(song).replace(/'/g, "&apos;")}'>
                            <div class="drag-handle"><i class="fas fa-grip-vertical"></i></div>
                            <div class="song-number">${idx + 1}</div>
                            <div class="song-icon-small"><i class="fas ${isActive ? 'fa-play' : 'fa-music'}"></i></div>
                            <div class="song-details">
                                <div class="song-title">${this.escapeHtml(song.title || 'Unknown Title')}</div>
                                <div class="song-artist">${this.escapeHtml(song.artist || 'Unknown Artist')}</div>
                            </div>
                            <div class="song-duration">${this.formatDuration(song.duration)}</div>
                            <div class="song-actions add-to-playlist" data-song='${JSON.stringify(song).replace(/'/g, "&apos;")}' title="Add to playlist"><i class="fas fa-plus-circle"></i></div>
                            <div class="song-favorite" data-path="${song.path}" data-song='${JSON.stringify(song).replace(/'/g, "&apos;")}' style="${isFav ? 'color: #ef4444;' : ''}"><i class="fas ${isFav ? 'fa-heart' : 'fa-heart'}"></i></div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        this.setupDragAndDropForLibrary();
        
        document.querySelectorAll('.song-item').forEach(item => {
            const path = item.dataset.path;
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.add-to-playlist') && !e.target.closest('.song-favorite') && !e.target.closest('.drag-handle')) {
                    this.isPlayingFromPlaylist = false;
                    this.currentPlaylistId = null;
                    const currentPlaylistForPlayback = this.getCurrentPlaylistForPlayback();
                    const mainIndex = currentPlaylistForPlayback.findIndex(s => s.path === path);
                    if (mainIndex !== -1) {
                        this.currentIndex = mainIndex;
                        this.loadSong(mainIndex);
                    }
                }
            });
        });
        
        document.querySelectorAll('.add-to-playlist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showAddToPlaylistModal(JSON.parse(btn.dataset.song));
            });
        });
        
        document.querySelectorAll('.song-favorite').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const song = JSON.parse(btn.dataset.song);
                if (this.isSongFavorite(song.path)) {
                    const favorites = await this.getFavorites();
                    const favIndex = favorites.findIndex(f => f.path === song.path);
                    if (favIndex !== -1) await this.removeFromFavorites(favIndex + 1);
                } else {
                    await this.addToFavorites(song);
                }
                this.updateAllFavoriteButtons();
            });
        });
        
        document.getElementById('sortAZBtn')?.addEventListener('click', () => this.sortLibraryAZ());
        document.getElementById('sortZABtn')?.addEventListener('click', () => this.sortLibraryZA());
        document.getElementById('restoreOrderBtn')?.addEventListener('click', () => this.restoreOriginalOrder());
    }
    
    renderArtists() {
        if (!this.content) return;
        const artistMap = new Map();
        this.playlist.forEach(song => {
            const artist = song.artist || 'Unknown Artist';
            if (!artistMap.has(artist)) artistMap.set(artist, { name: artist, count: 0, songs: [] });
            artistMap.get(artist).count++;
            artistMap.get(artist).songs.push(song);
        });
        const artists = Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        
        if (artists.length === 0) {
            this.content.innerHTML = `<div class="empty-state"><i class="fas fa-user"></i><p>No artists found</p></div>`;
            return;
        }
        
        this.content.innerHTML = `
            <div class="grid-view">
                ${artists.map(artist => `
                    <div class="grid-card" data-artist="${this.escapeHtml(artist.name)}" data-songs='${JSON.stringify(artist.songs).replace(/'/g, "&apos;")}'>
                        <div class="grid-icon"><i class="fas fa-user"></i></div>
                        <div class="grid-title">${this.escapeHtml(artist.name)}</div>
                        <div class="grid-subtitle">${artist.count} songs</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.querySelectorAll('.grid-card').forEach(card => {
            card.addEventListener('click', () => {
                this.showArtistSongs(card.dataset.artist, JSON.parse(card.dataset.songs));
            });
        });
    }
    
    showArtistSongs(artistName, songs) {
        if (this.viewTitle) this.viewTitle.textContent = artistName;
        this.content.innerHTML = `
            <div class="artist-header">
                <div class="artist-header-icon"><i class="fas fa-user-musician"></i></div>
                <div class="artist-header-info">
                    <div class="artist-header-name">${this.escapeHtml(artistName)}</div>
                    <div class="artist-header-count">${songs.length} songs</div>
                </div>
            </div>
            <div class="song-list">
                ${songs.map((song, idx) => `
                    <div class="song-item" data-path="${song.path}">
                        <div class="song-number">${idx + 1}</div>
                        <div class="song-icon-small"><i class="fas fa-music"></i></div>
                        <div class="song-details">
                            <div class="song-title">${this.escapeHtml(song.title || 'Unknown Title')}</div>
                            <div class="song-artist">${this.escapeHtml(song.artist)}</div>
                        </div>
                        <div class="song-duration">${this.formatDuration(song.duration)}</div>
                        <div class="song-favorite" data-path="${song.path}" data-song='${JSON.stringify(song).replace(/'/g, "&apos;")}' style="${this.isSongFavorite(song.path) ? 'color: #ef4444;' : ''}"><i class="fas ${this.isSongFavorite(song.path) ? 'fa-heart' : 'fa-heart'}"></i></div>
                    </div>
                `).join('')}
            </div>
            <div class="back-button-container"><button class="back-button" id="backToArtistsBtn"><i class="fas fa-arrow-left"></i> Back to Artists</button></div>
        `;
        
        document.querySelectorAll('.song-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.song-favorite')) {
                    this.isPlayingFromPlaylist = false;
                    this.currentPlaylistId = null;
                    const currentPlaylistForPlayback = this.getCurrentPlaylistForPlayback();
                    const mainIndex = currentPlaylistForPlayback.findIndex(s => s.path === item.dataset.path);
                    if (mainIndex !== -1) this.loadSong(mainIndex);
                }
            });
        });
        
        document.querySelectorAll('.song-favorite').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const song = JSON.parse(btn.dataset.song);
                if (this.isSongFavorite(song.path)) {
                    const favorites = await this.getFavorites();
                    const favIndex = favorites.findIndex(f => f.path === song.path);
                    if (favIndex !== -1) await this.removeFromFavorites(favIndex + 1);
                } else {
                    await this.addToFavorites(song);
                }
            });
        });
        
        document.getElementById('backToArtistsBtn')?.addEventListener('click', () => this.renderArtists());
    }
    
    renderAlbums() {
        if (!this.content) return;
        const albumMap = new Map();
        this.playlist.forEach(song => {
            const album = song.album || 'Unknown Album';
            const artist = song.artist || 'Unknown Artist';
            const key = `${album}|${artist}`;
            if (!albumMap.has(key)) albumMap.set(key, { name: album, artist: artist, count: 0, songs: [] });
            albumMap.get(key).count++;
            albumMap.get(key).songs.push(song);
        });
        const albums = Array.from(albumMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        
        if (albums.length === 0) {
            this.content.innerHTML = `<div class="empty-state"><i class="fas fa-album"></i><p>No albums found</p></div>`;
            return;
        }
        
        this.content.innerHTML = `
            <div class="grid-view">
                ${albums.map(album => `
                    <div class="grid-card album-card" data-album="${this.escapeHtml(album.name)}" data-artist="${this.escapeHtml(album.artist)}" data-songs='${JSON.stringify(album.songs).replace(/'/g, "&apos;")}'>
                        <div class="grid-icon"><i class="fas fa-album-collection"></i></div>
                        <div class="grid-title">${this.escapeHtml(album.name)}</div>
                        <div class="grid-subtitle">${this.escapeHtml(album.artist)}</div>
                        <div class="album-song-count">${album.count} songs</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.querySelectorAll('.grid-card').forEach(card => {
            card.addEventListener('click', () => {
                this.showAlbumSongs(card.dataset.album, card.dataset.artist, JSON.parse(card.dataset.songs));
            });
        });
    }
    
    showAlbumSongs(albumName, artistName, songs) {
        if (this.viewTitle) this.viewTitle.textContent = albumName;
        this.content.innerHTML = `
            <div class="album-header">
                <div class="album-header-icon"><i class="fas fa-album-collection"></i></div>
                <div class="album-header-info">
                    <div class="album-header-name">${this.escapeHtml(albumName)}</div>
                    <div class="album-header-artist">${this.escapeHtml(artistName)}</div>
                    <div class="album-header-count">${songs.length} songs</div>
                </div>
            </div>
            <div class="song-list">
                ${songs.map((song, idx) => `
                    <div class="song-item" data-path="${song.path}">
                        <div class="song-number">${idx + 1}</div>
                        <div class="song-icon-small"><i class="fas fa-music"></i></div>
                        <div class="song-details">
                            <div class="song-title">${this.escapeHtml(song.title || 'Unknown Title')}</div>
                            <div class="song-artist">${this.escapeHtml(song.artist)}</div>
                        </div>
                        <div class="song-duration">${this.formatDuration(song.duration)}</div>
                        <div class="song-favorite" data-path="${song.path}" data-song='${JSON.stringify(song).replace(/'/g, "&apos;")}' style="${this.isSongFavorite(song.path) ? 'color: #ef4444;' : ''}"><i class="fas ${this.isSongFavorite(song.path) ? 'fa-heart' : 'fa-heart'}"></i></div>
                    </div>
                `).join('')}
            </div>
            <div class="back-button-container"><button class="back-button" id="backToAlbumsBtn"><i class="fas fa-arrow-left"></i> Back to Albums</button></div>
        `;
        
        document.querySelectorAll('.song-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.song-favorite')) {
                    this.isPlayingFromPlaylist = false;
                    this.currentPlaylistId = null;
                    const currentPlaylistForPlayback = this.getCurrentPlaylistForPlayback();
                    const mainIndex = currentPlaylistForPlayback.findIndex(s => s.path === item.dataset.path);
                    if (mainIndex !== -1) this.loadSong(mainIndex);
                }
            });
        });
        
        document.querySelectorAll('.song-favorite').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const song = JSON.parse(btn.dataset.song);
                if (this.isSongFavorite(song.path)) {
                    const favorites = await this.getFavorites();
                    const favIndex = favorites.findIndex(f => f.path === song.path);
                    if (favIndex !== -1) await this.removeFromFavorites(favIndex + 1);
                } else {
                    await this.addToFavorites(song);
                }
            });
        });
        
        document.getElementById('backToAlbumsBtn')?.addEventListener('click', () => this.renderAlbums());
    }
    
    renderPlaylistsView() {
        if (!this.content) return;
        if (this.playlists.length === 0) {
            this.content.innerHTML = `<div class="empty-state"><i class="fas fa-list"></i><p>No playlists yet</p><small>Click + to create one</small></div>`;
            return;
        }
        this.content.innerHTML = `
            <div class="grid-view">
                ${this.playlists.map(playlist => `
                    <div class="grid-card" data-playlist-id="${playlist.id}">
                        <div class="grid-icon"><i class="fas fa-list"></i></div>
                        <div class="grid-title">${this.escapeHtml(playlist.name)}</div>
                        <div class="grid-subtitle">${playlist.size} songs</div>
                    </div>
                `).join('')}
            </div>
        `;
        document.querySelectorAll('.grid-card').forEach(card => {
            card.addEventListener('click', async () => {
                const playlistId = card.dataset.playlistId;
                const playlist = this.playlists.find(p => p.id === playlistId);
                if (playlist && this.viewTitle) this.viewTitle.textContent = playlist.name;
                this.currentPlaylistId = playlistId;
                // Reset playlist shuffle state when opening a new playlist
                this.isPlaylistShuffle = false;
                if (this.shuffleBtn) this.shuffleBtn.classList.remove('active');
                await this.renderPlaylistSongs(playlistId);
            });
        });
    }
    
    async renderPlaylistSongs(playlistId) {
        let songs;
        if (this.isPlaylistShuffle && this.currentPlaylistSongsShuffled) {
            songs = this.currentPlaylistSongsShuffled;
        } else {
            songs = await this.getPlaylistSongs(playlistId);
            this.currentPlaylistSongs = songs;
        }
        
        if (songs.length === 0) {
            this.content.innerHTML = `<div class="empty-state"><i class="fas fa-music"></i><p>No songs in this playlist</p><small>Click + on songs to add them to this playlist</small></div>`;
            return;
        }
        
        this.content.innerHTML = `
            <div class="playlist-header">
                <div class="playlist-header-icon"><i class="fas fa-list"></i></div>
                <div class="playlist-header-info">
                    <div class="playlist-header-name">${this.escapeHtml(this.viewTitle?.textContent || 'Playlist')}</div>
                    <div class="playlist-header-count">${songs.length} songs</div>
                </div>
            </div>
            <div style="margin-bottom: 16px; display: flex; gap: 12px; justify-content: space-between;">
                <div style="display: flex; gap: 12px;">
                    <button id="playPlaylistBtn" style="padding: 10px 20px; background: linear-gradient(135deg, #7c3aed, #a855f7); border: none; border-radius: 30px; color: white; cursor: pointer;"><i class="fas fa-play"></i> Play All</button>
                    <button id="shufflePlaylistBtn" style="padding: 10px 20px; background: ${this.isPlaylistShuffle ? '#7c3aed' : '#1a1a1a'}; border: 1px solid ${this.isPlaylistShuffle ? '#7c3aed' : '#2a2a2a'}; border-radius: 30px; color: white; cursor: pointer;"><i class="fas fa-random"></i> Shuffle Playlist</button>
                </div>
                <div class="drag-instruction"><i class="fas fa-grip-vertical"></i> Drag to reorder playlist</div>
            </div>
            <div class="song-list drag-container">
                ${songs.map((song, idx) => {
                    const isActive = this.isPlayingFromPlaylist && this.currentPlaylistId === playlistId && this.currentPlaylistSongIndex === idx;
                    return `
                        <div class="song-item drag-item ${isActive ? 'active' : ''}" data-path="${song.path}" data-position="${idx + 1}" data-song='${JSON.stringify(song).replace(/'/g, "&apos;")}'>
                            <div class="drag-handle"><i class="fas fa-grip-vertical"></i></div>
                            <div class="song-number">${idx + 1}</div>
                            <div class="song-icon-small"><i class="fas ${isActive ? 'fa-play' : 'fa-music'}"></i></div>
                            <div class="song-details">
                                <div class="song-title">${this.escapeHtml(song.title || 'Unknown Title')}</div>
                                <div class="song-artist">${this.escapeHtml(song.artist || 'Unknown Artist')}</div>
                            </div>
                            <div class="song-duration">${this.formatDuration(song.duration)}</div>
                            <div class="song-actions remove" data-position="${idx + 1}" title="Remove from playlist"><i class="fas fa-trash"></i></div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="back-button-container"><button class="back-button" id="backToPlaylistsBtn"><i class="fas fa-arrow-left"></i> Back to Playlists</button></div>
        `;
        
        document.getElementById('playPlaylistBtn')?.addEventListener('click', async () => {
            await this.playPlaylist(playlistId, false);
            this.showNotification(`Playing playlist: ${this.viewTitle?.textContent || 'Playlist'}`);
        });
        
        document.getElementById('shufflePlaylistBtn')?.addEventListener('click', async () => {
            await this.togglePlaylistShuffle();
        });
        
        this.setupDragAndDropForPlaylist();
        
        document.querySelectorAll('.song-item').forEach(item => {
            const position = parseInt(item.dataset.position);
            const song = JSON.parse(item.dataset.song);
            item.addEventListener('click', async (e) => {
                if (!e.target.closest('.remove') && !e.target.closest('.drag-handle')) {
                    await this.playPlaylistSong(playlistId, position, song);
                }
            });
        });
        
        document.querySelectorAll('.remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const position = parseInt(btn.dataset.position);
                await this.removeFromPlaylist(playlistId, position);
                // Refresh playlist songs after removal
                this.currentPlaylistSongs = await this.getPlaylistSongs(playlistId);
                if (this.isPlaylistShuffle) {
                    this.currentPlaylistSongsShuffled = [...this.currentPlaylistSongs];
                    for (let i = this.currentPlaylistSongsShuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [this.currentPlaylistSongsShuffled[i], this.currentPlaylistSongsShuffled[j]] = 
                        [this.currentPlaylistSongsShuffled[j], this.currentPlaylistSongsShuffled[i]];
                    }
                }
                await this.renderPlaylistSongs(playlistId);
                await this.loadPlaylists();
            });
        });
        
        document.getElementById('backToPlaylistsBtn')?.addEventListener('click', () => this.renderPlaylistsView());
    }
    
    async renderFavoritesView() {
        const favorites = await this.getFavorites();
        this.favoritePaths.clear();
        favorites.forEach(song => { if (song.path) this.favoritePaths.add(song.path); });
        
        if (favorites.length === 0) {
            this.content.innerHTML = `<div class="empty-state"><i class="fas fa-heart"></i><p>No favorite songs yet</p><small>Click the heart icon on any song to add to favorites</small></div>`;
            return;
        }
        
        this.content.innerHTML = `
            <div class="song-list">
                ${favorites.map((song, idx) => {
                    const isActive = this.playlist[this.currentIndex]?.path === song.path && !this.isPlayingFromPlaylist;
                    return `
                        <div class="song-item ${isActive ? 'active' : ''}" data-path="${song.path}" data-position="${idx + 1}">
                            <div class="song-number">${idx + 1}</div>
                            <div class="song-icon-small"><i class="fas ${isActive ? 'fa-play' : 'fa-heart'}"></i></div>
                            <div class="song-details">
                                <div class="song-title">${this.escapeHtml(song.title || 'Unknown Title')}</div>
                                <div class="song-artist">${this.escapeHtml(song.artist)}</div>
                            </div>
                            <div class="song-duration">${this.formatDuration(song.duration)}</div>
                            <div class="song-favorite active" data-position="${idx + 1}" style="color: #ef4444;"><i class="fas fa-heart"></i></div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        document.querySelectorAll('.song-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.song-favorite')) {
                    this.isPlayingFromPlaylist = false;
                    this.currentPlaylistId = null;
                    const currentPlaylistForPlayback = this.getCurrentPlaylistForPlayback();
                    const mainIndex = currentPlaylistForPlayback.findIndex(s => s.path === item.dataset.path);
                    if (mainIndex !== -1) this.loadSong(mainIndex);
                }
            });
        });
        
        document.querySelectorAll('.song-favorite').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.removeFromFavorites(parseInt(btn.dataset.position));
                await this.renderFavoritesView();
                if (this.currentView === 'library') this.renderLibrary();
                this.updateAllFavoriteButtons();
            });
        });
    }
    
    renderPlaylists() {
        if (!this.playlistsList) return;
        this.playlistsList.innerHTML = '';
        if (this.playlists.length === 0) {
            this.playlistsList.innerHTML = `<div class="empty-state" style="padding: 20px;"><i class="fas fa-list"></i><p>No playlists yet</p><small>Click + to create one</small></div>`;
            return;
        }
        this.playlists.forEach(playlist => {
            const div = document.createElement('div');
            div.className = `playlist-item ${this.currentPlaylistId === playlist.id ? 'active' : ''}`;
            div.innerHTML = `
                <div class="playlist-icon"><i class="fas fa-list"></i></div>
                <div class="playlist-info">
                    <div class="playlist-name">${this.escapeHtml(playlist.name)}</div>
                    <div class="playlist-count">${playlist.size} songs</div>
                </div>
                <button class="playlist-delete" data-playlist-id="${playlist.id}" data-playlist-name="${this.escapeHtml(playlist.name)}" title="Delete Playlist">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            // Add click event for playlist (to open it)
            const playlistInfo = div.querySelector('.playlist-info');
            playlistInfo.addEventListener('click', async () => {
                this.currentPlaylistId = playlist.id;
                if (this.viewTitle) this.viewTitle.textContent = playlist.name;
                this.isPlaylistShuffle = false;
                if (this.shuffleBtn) this.shuffleBtn.classList.remove('active');
                await this.renderPlaylistSongs(playlist.id);
                this.renderPlaylists();
            });
            
            // Add click event for delete button
            const deleteBtn = div.querySelector('.playlist-delete');
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                this.deletePlaylist(playlist.id, playlist.name);
            });
            
            this.playlistsList.appendChild(div);
        });
    }

    async deletePlaylist(playlistId, playlistName) {
        const confirmed = confirm(`Are you sure you want to delete the playlist "${playlistName}"?`);
        if (!confirmed) return;
        
        try {
            const response = await fetch(`/api/playlists/${playlistId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`Playlist "${playlistName}" deleted!`, 'success');
                
                if (this.currentPlaylistId === playlistId) {
                    this.currentPlaylistId = null;
                    this.isPlayingFromPlaylist = false;
                    this.currentPlaylistSongs = [];
                    this.currentPlaylistSongsShuffled = null;
                    this.isPlaylistShuffle = false;
                    if (this.shuffleBtn) this.shuffleBtn.classList.remove('active');
                    this.switchView('playlists');
                }
                
                await this.loadPlaylists();
            } else {
                this.showNotification('Failed to delete playlist', 'error');
            }
        } catch (error) {
            console.error('Error deleting playlist:', error);
            this.showNotification('Error deleting playlist', 'error');
        }
    }
    
    showAddToPlaylistModal(song) {
        if (!this.playlistOptions) return;
        this.playlistOptions.innerHTML = '';
        if (this.playlists.length === 0) {
            this.playlistOptions.innerHTML = `<div class="empty-state"><p>No playlists yet</p><small>Create one first</small></div>`;
        } else {
            this.playlists.forEach(playlist => {
                const div = document.createElement('div');
                div.className = 'playlist-option';
                div.innerHTML = `
                    <div class="playlist-option-icon"><i class="fas fa-list"></i></div>
                    <div class="playlist-option-name">${this.escapeHtml(playlist.name)}</div>
                    <div class="playlist-option-count">${playlist.size} songs</div>
                `;
                div.addEventListener('click', () => {
                    this.addSongToPlaylist(playlist.id, song);
                    if (this.addToPlaylistModal) this.addToPlaylistModal.classList.remove('active');
                });
                this.playlistOptions.appendChild(div);
            });
        }
        if (this.addToPlaylistModal) this.addToPlaylistModal.classList.add('active');
    }
    
    showCreatePlaylistModal() {
        if (this.playlistNameInput) this.playlistNameInput.value = '';
        if (this.playlistDescInput) this.playlistDescInput.value = '';
        if (this.createPlaylistModal) this.createPlaylistModal.classList.add('active');
    }
    
    hideCreatePlaylistModal() {
        if (this.createPlaylistModal) this.createPlaylistModal.classList.remove('active');
    }
    
    // ========== FILE UPLOAD ==========
    
    async handleFolderSelected(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        const firstFile = files[0];
        const folderPath = firstFile.webkitRelativePath.split('/')[0];
        if (this.selectedFolder) this.selectedFolder.textContent = folderPath;
        
        const audioFiles = files.filter(file => ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac', 'opus'].includes(file.name.split('.').pop().toLowerCase()));
        if (audioFiles.length === 0) { alert('No audio files found'); return; }
        
        this.showLoading();
        const formData = new FormData();
        audioFiles.forEach(file => formData.append('files[]', file, file.webkitRelativePath));
        formData.append('folder_path', folderPath);
        
        try {
            const response = await fetch('/api/upload_files', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) {
                this.playlist = data.files;
                this.originalPlaylist = [...this.playlist];
                this.currentSortType = null;
                this.isShuffle = false;
                if (this.shuffleBtn) this.shuffleBtn.classList.remove('active');
                this.shuffledPlaylist = [];
                if (this.songCount) this.songCount.textContent = `${this.playlist.length} songs`;
                await this.loadFavorites();
                await this.loadPlaylists();
                this.switchView('library');
                if (this.playlist.length > 0) {
                    this.currentIndex = 0;
                    this.loadSong(0);
                    this.showNotification(`Loaded ${this.playlist.length} songs!`);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Error loading files', 'error');
        } finally {
            this.hideLoading();
            event.target.value = '';
        }
    }
    
    async handleFilesSelected(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        if (this.selectedFolder) this.selectedFolder.textContent = 'Multiple files selected';
        
        this.showLoading();
        const formData = new FormData();
        files.forEach(file => formData.append('files[]', file));
        formData.append('folder_path', 'selected_files');
        
        try {
            const response = await fetch('/api/upload_files', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) {
                this.playlist = data.files;
                this.originalPlaylist = [...this.playlist];
                this.currentSortType = null;
                this.isShuffle = false;
                if (this.shuffleBtn) this.shuffleBtn.classList.remove('active');
                this.shuffledPlaylist = [];
                if (this.songCount) this.songCount.textContent = `${this.playlist.length} songs`;
                await this.loadFavorites();
                await this.loadPlaylists();
                this.switchView('library');
                if (this.playlist.length > 0) {
                    this.currentIndex = 0;
                    this.loadSong(0);
                    this.showNotification(`Loaded ${this.playlist.length} songs!`);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Error loading files', 'error');
        } finally {
            this.hideLoading();
            event.target.value = '';
        }
    }
    
    // ========== PLAYLIST PLAYBACK ==========
    
    async playPlaylist(playlistId, shuffle = false) {
        try {
            const songs = await this.getPlaylistSongs(playlistId);
            if (!songs.length) { this.showNotification('Playlist is empty', 'error'); return false; }
            
            this.isPlayingFromPlaylist = true;
            this.currentPlaylistId = playlistId;
            this.currentPlaylistSongs = songs;
            
            if (shuffle || this.isPlaylistShuffle) {
                this.isPlaylistShuffle = true;
                if (this.shuffleBtn) this.shuffleBtn.classList.add('active');
                this.currentPlaylistSongsShuffled = [...songs];
                for (let i = this.currentPlaylistSongsShuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [this.currentPlaylistSongsShuffled[i], this.currentPlaylistSongsShuffled[j]] = 
                    [this.currentPlaylistSongsShuffled[j], this.currentPlaylistSongsShuffled[i]];
                }
                this.currentPlaylistSongIndex = 0;
                await this.loadSongFromPlaylist(this.currentPlaylistSongsShuffled[0]);
            } else {
                this.currentPlaylistSongsShuffled = null;
                this.currentPlaylistSongIndex = 0;
                await this.loadSongFromPlaylist(songs[0]);
            }
            return true;
        } catch (error) { console.error('Error playing playlist:', error); return false; }
    }
    
    async playPlaylistSong(playlistId, position, song) {
        try {
            const songs = await this.getPlaylistSongs(playlistId);
            if (!songs.length) return false;
            this.isPlayingFromPlaylist = true;
            this.currentPlaylistId = playlistId;
            this.currentPlaylistSongs = songs;
            this.currentPlaylistSongsShuffled = null;
            this.currentPlaylistSongIndex = position - 1;
            await this.loadSongFromPlaylist(song);
            return true;
        } catch (error) { console.error('Error playing playlist song:', error); return false; }
    }
    
    // ========== LOAD SONG  ==========
    
    async loadSongFromPlaylist(song) {
        if (!song) return;
        
        // Store the actual song path for tracking
        this.currentPlayingSongPath = song.path;
        
        if (this.nowPlayingTitle) this.nowPlayingTitle.innerHTML = this.escapeHtml(song.title || 'Unknown Title');
        if (this.nowPlayingArtist) this.nowPlayingArtist.textContent = song.artist || 'Unknown Artist';
        if (this.waveformContainer) this.createWaveform();
        
        const filename = encodeURIComponent(song.filename);
        const audioPath = `/api/audio/${filename}`;
        this.audioPlayer.pause();
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.audioPlayer.src = audioPath;
        this.audioPlayer.load();
        setTimeout(() => this.setupAudioContext(), 100);
        const playPromise = this.audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isPlaying = true;
                this.updatePlayPauseIcon();
                this.animateWaveform();
                this.updateAllFavoriteButtons();
            }).catch(e => { console.log('Playback error:', e); this.showNotification('Error playing file', 'error'); });
        }
        this.updateAllFavoriteButtons();
    }
    
    createWaveform() {
        if (!this.waveformContainer) return;
        this.waveformContainer.innerHTML = '';
        this.waveformContainer.style.display = 'flex';
        this.waveformContainer.style.alignItems = 'center';
        this.waveformContainer.style.justifyContent = 'center';
        this.waveformContainer.style.gap = '3px';
        this.waveformContainer.style.height = '40px';
        this.waveformContainer.style.padding = '8px 20px';
        for (let i = 0; i < 50; i++) {
            const bar = document.createElement('div');
            bar.className = 'waveform-bar';
            bar.style.width = '3px';
            bar.style.backgroundColor = '#a855f7';
            bar.style.borderRadius = '2px';
            bar.style.transition = 'height 0.05s ease';
            bar.style.height = '4px';
            this.waveformContainer.appendChild(bar);
        }
        this.waveformBars = document.querySelectorAll('.waveform-bar');
        this.waveformVisible = true;
        this.animateWaveform();
    }
    
    setupAudioContext() {
        try {
            if (this.audioContext && this.audioContext.state !== 'closed') this.audioContext.close();
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            if (this.audioContext.state === 'suspended') this.audioContext.resume();
            if (this.source) try { this.source.disconnect(); } catch(e) {}
            this.source = this.audioContext.createMediaElementSource(this.audioPlayer);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
        } catch(e) { console.log('Web Audio API not supported:', e); }
    }
    
    animateWaveform() {
        if (!this.waveformVisible || !this.waveformBars || this.waveformBars.length === 0) {
            if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
            return;
        }
        if (!this.isPlaying) {
            const time = Date.now() / 500;
            this.waveformBars.forEach((bar, i) => {
                const height = 4 + Math.sin(time + i * 0.15) * 3;
                bar.style.height = Math.max(2, Math.min(20, height)) + 'px';
                bar.style.opacity = '0.5';
            });
            this.animationFrame = requestAnimationFrame(() => this.animateWaveform());
            return;
        }
        try {
            if (this.audioContext && this.analyser && this.audioContext.state === 'running') {
                const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                this.analyser.getByteFrequencyData(dataArray);
                let hasAudio = false;
                for (let i = 0; i < 10; i++) if (dataArray[i] > 5) { hasAudio = true; break; }
                if (hasAudio) {
                    this.waveformBars.forEach((bar, i) => {
                        const index = Math.floor(i * (dataArray.length / this.waveformBars.length));
                        const value = dataArray[index] / 255;
                        const height = 4 + (value * 45);
                        bar.style.height = Math.max(4, Math.min(50, height)) + 'px';
                        bar.style.opacity = 0.7 + (value * 0.3);
                    });
                } else {
                    const time = Date.now() / 200;
                    this.waveformBars.forEach((bar, i) => {
                        const height = 6 + Math.sin(time + i * 0.2) * 10;
                        bar.style.height = Math.abs(height) + 'px';
                        bar.style.opacity = '0.7';
                    });
                }
            } else if (this.waveformBars) {
                const time = Date.now() / 250;
                this.waveformBars.forEach((bar, i) => {
                    const height = 6 + Math.sin(time + i * 0.2) * 8;
                    bar.style.height = Math.abs(height) + 'px';
                    bar.style.opacity = '0.6';
                });
            }
        } catch(e) { console.log('Waveform error:', e); }
        this.animationFrame = requestAnimationFrame(() => this.animateWaveform());
    }
    
    // ========== LOAD SONG ==========
    
    loadSong(index) {
        let songsToUse = this.playlist;
        if (this.isShuffle && this.shuffledPlaylist.length) songsToUse = this.shuffledPlaylist;
        if (index < 0 || index >= songsToUse.length) return;
        
        this.currentIndex = index;
        const song = songsToUse[index];
        
        // Store the actual song path for tracking
        this.currentPlayingSongPath = song.path;
        
        if (this.nowPlayingTitle) this.nowPlayingTitle.innerHTML = this.escapeHtml(song.title || 'Unknown Title');
        if (this.nowPlayingArtist) this.nowPlayingArtist.textContent = song.artist || 'Unknown Artist';
        if (this.waveformContainer) this.createWaveform();
        this.renderLibrary();
        
        const filename = encodeURIComponent(song.filename);
        const audioPath = `/api/audio/${filename}`;
        this.audioPlayer.pause();
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.audioPlayer.src = audioPath;
        this.audioPlayer.load();
        setTimeout(() => this.setupAudioContext(), 100);
        const playPromise = this.audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isPlaying = true;
                this.updatePlayPauseIcon();
                this.animateWaveform();
                this.updateAllFavoriteButtons();
            }).catch(e => { console.log('Playback error:', e); this.showNotification('Error playing file', 'error'); });
        }
        this.updateAllFavoriteButtons();
    }
    
    togglePlayPause() {
        if (!this.audioPlayer) return;
        if (this.audioPlayer.paused) {
            const playPromise = this.audioPlayer.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.isPlaying = true;
                    if (!this.waveformBars) this.createWaveform();
                    this.animateWaveform();
                }).catch(e => { console.log('Play error:', e); this.showNotification('Cannot play this audio format', 'error'); });
            }
        } else {
            this.audioPlayer.pause();
            this.isPlaying = false;
        }
        this.updatePlayPauseIcon();
    }
    
    updatePlayPauseIcon() {
        const icon = this.playPauseBtn?.querySelector('i');
        if (icon) icon.className = this.audioPlayer?.paused ? 'fas fa-play' : 'fas fa-pause';
    }
    
    // ========== PLAY NEXT/PREVIOUS (FOR PLAYLIST SHUFFLE) ==========
    
    playNext() {
        if (this.isPlayingFromPlaylist && this.currentPlaylistId) {
            if (this.isPlaylistShuffle && this.currentPlaylistSongsShuffled) {
                const nextIndex = (this.currentPlaylistSongIndex + 1) % this.currentPlaylistSongsShuffled.length;
                this.currentPlaylistSongIndex = nextIndex;
                const nextSong = this.currentPlaylistSongsShuffled[nextIndex];
                this.currentPlayingSongPath = nextSong.path;
                this.loadSongFromPlaylist(nextSong);
            } else if (this.currentPlaylistSongs) {
                const nextIndex = (this.currentPlaylistSongIndex + 1) % this.currentPlaylistSongs.length;
                this.currentPlaylistSongIndex = nextIndex;
                const nextSong = this.currentPlaylistSongs[nextIndex];
                this.currentPlayingSongPath = nextSong.path;
                this.loadSongFromPlaylist(nextSong);
            }
            return;
        }
        
        let songsToUse = this.playlist;
        if (this.isShuffle && this.shuffledPlaylist.length) songsToUse = this.shuffledPlaylist;
        if (songsToUse.length === 0) return;
        const newIndex = (this.currentIndex + 1) % songsToUse.length;
        this.currentIndex = newIndex;
        this.currentPlayingSongPath = songsToUse[newIndex].path;
        this.loadSong(newIndex);
    }
    
    playPrevious() {
        if (this.isPlayingFromPlaylist && this.currentPlaylistId) {
            if (this.isPlaylistShuffle && this.currentPlaylistSongsShuffled) {
                const prevIndex = (this.currentPlaylistSongIndex - 1 + this.currentPlaylistSongsShuffled.length) % this.currentPlaylistSongsShuffled.length;
                this.currentPlaylistSongIndex = prevIndex;
                const prevSong = this.currentPlaylistSongsShuffled[prevIndex];
                this.currentPlayingSongPath = prevSong.path;
                this.loadSongFromPlaylist(prevSong);
            } else if (this.currentPlaylistSongs) {
                const prevIndex = (this.currentPlaylistSongIndex - 1 + this.currentPlaylistSongs.length) % this.currentPlaylistSongs.length;
                this.currentPlaylistSongIndex = prevIndex;
                const prevSong = this.currentPlaylistSongs[prevIndex];
                this.currentPlayingSongPath = prevSong.path;
                this.loadSongFromPlaylist(prevSong);
            }
            return;
        }
        
        let songsToUse = this.playlist;
        if (this.isShuffle && this.shuffledPlaylist.length) songsToUse = this.shuffledPlaylist;
        if (songsToUse.length === 0) return;
        const newIndex = (this.currentIndex - 1 + songsToUse.length) % songsToUse.length;
        this.currentIndex = newIndex;
        this.currentPlayingSongPath = songsToUse[newIndex].path;
        this.loadSong(newIndex);
    }
    
    handleSongEnd() {
        if (this.isRepeat) {
            this.audioPlayer.currentTime = 0;
            this.audioPlayer.play();
        } else {
            this.playNext();
        }
    }
    
    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        if (this.repeatBtn) this.repeatBtn.classList.toggle('active', this.isRepeat);
    }
    
    updateProgress() {
        if (this.audioPlayer?.duration && this.progressFill && this.currentTime) {
            this.progressFill.style.width = (this.audioPlayer.currentTime / this.audioPlayer.duration * 100) + '%';
            this.currentTime.textContent = this.formatTime(this.audioPlayer.currentTime);
        }
    }
    
    updateTotalTime() {
        if (this.audioPlayer?.duration && this.totalTime) this.totalTime.textContent = this.formatTime(this.audioPlayer.duration);
    }
    
    seek(e) {
        if (!this.progressBar || !this.audioPlayer) return;
        const rect = this.progressBar.getBoundingClientRect();
        this.audioPlayer.currentTime = ((e.clientX - rect.left) / rect.width) * this.audioPlayer.duration;
    }
    
    adjustVolume(e) {
        if (!this.volumeBar || !this.audioPlayer) return;
        const rect = this.volumeBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.audioPlayer.volume = percent;
        if (this.volumeFill) this.volumeFill.style.width = percent * 100 + '%';
        if (this.volumeIcon) {
            if (percent === 0) this.volumeIcon.className = 'fas fa-volume-mute';
            else if (percent < 0.3) this.volumeIcon.className = 'fas fa-volume-down';
            else this.volumeIcon.className = 'fas fa-volume-up';
        }
        if (percent > 0) this.lastVolume = percent;
    }
    
    handleSearch() {
        if (!this.searchInput) return;
        this.searchTerm = this.searchInput.value.toLowerCase().trim();
        if (this.clearSearchBtn) this.clearSearchBtn.style.display = this.searchTerm ? 'block' : 'none';
        if (this.currentView === 'library') this.renderLibrary();
    }
    
    clearSearch() {
        if (this.searchInput) this.searchInput.value = '';
        this.searchTerm = '';
        if (this.clearSearchBtn) this.clearSearchBtn.style.display = 'none';
        if (this.currentView === 'library') this.renderLibrary();
    }
    
    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    showLoading() {
        if (this.selectFolderBtn) {
            this.selectFolderBtn.disabled = true;
            this.selectFilesBtn.disabled = true;
            this.selectFolderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        }
    }
    
    hideLoading() {
        if (this.selectFolderBtn) {
            this.selectFolderBtn.disabled = false;
            this.selectFilesBtn.disabled = false;
            this.selectFolderBtn.innerHTML = '<i class="fas fa-folder-open"></i> Choose Folder';
        }
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayer();
});