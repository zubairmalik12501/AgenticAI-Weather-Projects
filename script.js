const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Open-Meteo API Endpoints
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

// Helper: Add message to chat
function addMessage(content, isBot = true, isHTML = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isBot ? 'bot-message' : 'user-message'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (isHTML) {
        contentDiv.innerHTML = content;
    } else {
        contentDiv.textContent = content;
    }
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Helper: Show typing indicator
function showTyping() {
    const id = 'typing-' + Date.now();
    const html = `
        <div class="typing-indicator" id="${id}">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;
    addMessage(html, true, true);
    return id;
}

// Helper: Remove typing indicator
function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) {
        el.closest('.message').remove();
    }
}

// Helper: Extract city from text (simple heuristic)
function extractCity(text) {
    // Remove common words to try and isolate the city
    const ignoreWords = ['weather', 'in', 'at', 'for', 'temperature', 'how', 'is', 'the', 'like', 'show', 'me', 'please', 'tell', 'forecast'];
    const words = text.toLowerCase().replace(/[^\w\s]/gi, '').split(' ');
    
    // Return the last relevant word that probably signifies the location, or the whole query if short
    const potentialCities = words.filter(w => !ignoreWords.includes(w) && w.length > 2);
    return potentialCities.length > 0 ? potentialCities.join(' ') : text;
}

// Logic: Fetch Weather
async function getWeather(city) {
    const typingId = showTyping();
    
    try {
        // 1. Get Coordinates
        const geoRes = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            removeTyping(typingId);
            addMessage(`I couldn't find a city named "${city}". Could you check the spelling? 🤔`);
            return;
        }
        
        const { name, latitude, longitude, country } = geoData.results[0];
        
        // 2. Get Weather
        const weatherRes = await fetch(`${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code&wind_speed_10m`);
        const weatherData = await weatherRes.json();
        
        const current = weatherData.current;
        const temp = Math.round(current.temperature_2m);
        const feelsLike = Math.round(current.apparent_temperature);
        const humidity = current.relative_humidity_2m;
        const wind = current.wind_speed_10m;
        const code = current.weather_code;
        
        // Map WMO codes to text/icons
        let condition = 'Clear';
        let icon = '☀️';
        
        if (code >= 1 && code <= 3) { condition = 'Partly Cloudy'; icon = 'b⛅'; }
        else if (code >= 45 && code <= 48) { condition = 'Foggy'; icon = '🌫️'; }
        else if (code >= 51 && code <= 67) { condition = 'Rainy'; icon = '🌧️'; }
        else if (code >= 71 && code <= 77) { condition = 'Snowy'; icon = '❄️'; }
        else if (code >= 95) { condition = 'Thunderstorm'; icon = '⚡'; }

        const weatherHTML = `
            <div class="weather-card">
                <div class="weather-header">
                    <span>${icon}</span>
                    <span>${name}, ${country}</span>
                </div>
                <div class="weather-temp">${temp}°C</div>
                <div>${condition} • Feels like ${feelsLike}°C</div>
                <div class="weather-details">
                    <div>💧 Humidity: ${humidity}%</div>
                    <div>💨 Wind: ${wind} km/h</div>
                </div>
            </div>
        `;
        
        removeTyping(typingId);
        addMessage(weatherHTML, true, true);
        
    } catch (error) {
        console.error(error);
        removeTyping(typingId);
        addMessage(`Oops! Something went wrong while fetching the weather. Please try again. 😓`);
    }
}

// Logic: Handle User Input
async function handleInput() {
    const text = userInput.value.trim();
    if (!text) return;
    
    // 1. Add User Message
    addMessage(text, false);
    userInput.value = '';
    
    // 2. Process
    const city = extractCity(text);
    
    if (city.length < 2) {
        setTimeout(() => {
            addMessage("Please tell me which city you'd like to check! 🌍");
        }, 500);
        return;
    }
    
    // 3. Fetch Weather
    await getWeather(city);
}

// Event Listeners
sendBtn.addEventListener('click', handleInput);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleInput();
});
