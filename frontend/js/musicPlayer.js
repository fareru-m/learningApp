// YouTube IFrame API
let player;
let isPlayerReady = false;

// DOM Elements
const youtubeSearch = document.getElementById('youtube-search');
const searchBtn = document.getElementById('search-btn');
const youtubePlayer = document.querySelector('.youtube-player');
const playlistItems = document.querySelectorAll('.playlist li');

// Initialize YouTube Player
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-iframe', {
        height: '100%',
        width: '100%',
        playerVars: {
            'playsinline': 1,
            'controls': 1,
            'rel': 0,
            'modestbranding': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// Called when YouTube player is ready
function onPlayerReady(event) {
    isPlayerReady = true;
    console.log('YouTube player is ready');
    
    // Load the first playlist item by default
    if (playlistItems.length > 0) {
        const firstItem = playlistItems[0];
        searchYouTube(firstItem.dataset.query);
    }
}

// Called when player state changes
function onPlayerStateChange(event) {
    // You can add more event handling here if needed
    console.log('Player state changed:', event.data);
}

// Search for a video on YouTube
function searchYouTube(query) {
    if (!query) return;
    
    // In a real app, you would use the YouTube Data API to search for videos
    // For this example, we'll use a simple search URL
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    // Show loading state
    youtubePlayer.innerHTML = `
        <div class="loading">
            <p>「${query}」を検索中...</p>
        </div>
    `;
    
    // In a real app, you would make an API call to search for videos
    // For this example, we'll simulate a search with a delay
    setTimeout(() => {
        // This is a simplified example - in a real app, you would get the video ID from the API response
        // For now, we'll just show a message with the search query
        youtubePlayer.innerHTML = `
            <div class="search-results">
                <p>「${query}」の検索結果が表示されます</p>
                <p class="note">注: 実際のアプリではYouTube Data APIを使用して動画を検索します</p>
            </div>
        `;
    }, 1000);
}

// Initialize the music player
document.addEventListener('DOMContentLoaded', () => {
    // Load the YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    
    // Create the YouTube player container
    const playerContainer = document.createElement('div');
    playerContainer.id = 'youtube-iframe';
    youtubePlayer.innerHTML = '';
    youtubePlayer.appendChild(playerContainer);
    
    // Set up event listeners
    searchBtn.addEventListener('click', () => {
        const query = youtubeSearch.value.trim();
        if (query) {
            searchYouTube(query);
        }
    });
    
    youtubeSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = youtubeSearch.value.trim();
            if (query) {
                searchYouTube(query);
            }
        }
    });
    
    // Set up playlist item clicks
    playlistItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update active state
            playlistItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Search for the selected item
            searchYouTube(item.dataset.query);
        });
    });
});

// Make functions available globally
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
