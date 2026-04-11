# Harmony Music App


`Harmony` is a web-based music player built with Flask and Python. It features a responsive user interface for managing and playing local audio files, with core playlist functionality powered by a custom Doubly Linked List abstract data type (ADT).

## Features

*   **Dynamic Library:** Upload audio files (MP3, FLAC, M4A, etc.) to build your music library.
*   **Playlist Management:** Create, delete, and manage multiple playlists. Songs can be reordered via drag-and-drop.
*   **Playback Controls:** Standard controls including play/pause, next/previous, seek, and volume adjustment.
*   **Playback Modes:** Switch between sequential, repeat, and shuffled playback.
*   **Music Organization:** Automatically browse your library by Artists and Albums.
*   **Favorites:** Mark your favorite songs for quick access.
*   **Metadata Extraction:** Uses `mutagen` to extract and display song metadata like title, artist, and album.
*   **Unit Tested:** Includes a suite of unit tests using `pytest` to ensure application reliability.

## Screenshots

#### Homepage & Library View
The main landing page of the application, displaying all uploaded songs.
<img width="1868" height="947" alt="main" src="https://github.com/user-attachments/assets/265e8b6f-a948-414f-9ed2-a1fa787a2963" />

#### Playlist Interface
View and manage songs within a specific playlist. Users can drag and drop to reorder tracks.
<img width="1867" height="944" alt="playlist" src="https://github.com/user-attachments/assets/aeb9b43d-46a5-4c65-8f6f-8ee9c6378ac7" />

#### Add Song Modal
Add new songs to any playlist by selecting from the main library.
<img width="1867" height="944" alt="add song" src="https://github.com/user-attachments/assets/85f10835-6303-4b73-aa35-7db60dec4872" />

#### Test Results
The application includes a comprehensive test suite to ensure functionality and reliability.
<img width="1566" height="579" alt="test result" src="https://github.com/user-attachments/assets/c27a0d15-190a-480b-90b3-25305b3b13fb" />

## Tech Stack

*   **Backend:** Python, Flask
*   **Frontend:** HTML5, CSS3, Vanilla JavaScript
*   **Audio Metadata:** `mutagen`
*   **Testing:** `pytest`

## Core Data Structure: Playlist ADT

The core of the playlist functionality is the `PlaylistADT` class, a custom implementation of a **Doubly Linked List**. Each node in the list represents a song (`SongNode`). This data structure provides efficient time complexity for playlist operations:
*   **O(1)** for adding/removing songs at the beginning or end.
*   **O(n)** for accessing or modifying songs in the middle.

This approach was chosen to demonstrate a fundamental computer science concept within a practical, real-world application.

## Installation and Usage

Follow these steps to set up and run the project locally.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/rohan-prasad-0/harmony-music-app.git
    cd harmony-music-app
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    # For macOS/Linux
    python3 -m venv venv
    source venv/bin/activate

    # For Windows
    py -m venv venv
    .\venv\Scripts\activate
    ```

3.  **Install the required dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the Flask application:**
    ```bash
    python app.py
    ```

5.  Open your web browser and navigate to `http://127.0.0.1:5000`.

6.  Use the **"Choose Folder"** or **"Select Files"** button in the sidebar to upload your music.

## Running Tests

To run the automated unit tests, execute the following command from the root directory of the project:

```bash
pytest
