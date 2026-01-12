let entries = [];

// Helper function to parse date strings correctly (avoid timezone issues)
function parseLocalDate(dateString) {
    // dateString is in format "YYYY-MM-DD"
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
}

// Helper function to format date as YYYY-MM-DD in local time
function formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    // Event listeners
    document.getElementById('addBtn').addEventListener('click', addEntry);
    document.getElementById('hours').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addEntry();
    });

    // Load entries
    fetchEntries();
});

// Fetch entries from API
async function fetchEntries() {
    try {
        const response = await fetch('/api/hours');
        
        if (!response.ok) {
            const text = await response.text();
            console.error('API Error Response:', text);
            throw new Error(`Failed to fetch entries: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
            entries = data.map(entry => ({
                ...entry,
                hours: Number(entry.hours)
            }));
        } else {
            console.error('Invalid data format:', data);
            entries = [];
        }

        renderEntries();
        updateSummary();
        updateWeeklyDays();
    } catch (error) {
        console.error('Error fetching entries:', error);
        entries = []; // Reset to empty array on error
        document.getElementById('entriesList').innerHTML =
            '<div class="empty-state">Unable to load entries. Check console for details.</div>';
        updateSummary(); // Still update with empty data
        updateWeeklyDays();
    }
}

// Add new entry
async function addEntry() {
    const dateInput = document.getElementById('date');
    const hoursInput = document.getElementById('hours');

    const date = dateInput.value;
    const hours = parseFloat(hoursInput.value);

    if (!date || !hours || hours <= 0) {
        alert('Please enter a valid date and hours');
        return;
    }

    try {
        const response = await fetch('/api/hours', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, hours })
        });

        if (!response.ok) throw new Error('Failed to add entry');

        // Clear input and refresh
        hoursInput.value = '';
        await fetchEntries();
    } catch (error) {
        console.error('Error adding entry:', error);
        alert('Failed to add entry. Please try again.');
    }
}

// Delete entry
async function deleteEntry(id) {
    if (!confirm('Delete this entry?')) return;

    try {
        const response = await fetch('/api/hours', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        if (!response.ok) throw new Error('Failed to delete entry');

        await fetchEntries();
    } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Failed to delete entry. Please try again.');
    }
}

// Update weekly days display
function updateWeeklyDays() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate Monday of current week
    const monday = new Date(today);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
    monday.setDate(today.getDate() + diff);

    const days = ['mon', 'tue', 'wed', 'thu', 'fri'];

    days.forEach((day, index) => {
        const currentDay = new Date(monday);
        currentDay.setDate(monday.getDate() + index);

        const dateStr = formatDateString(currentDay);
        const dayNum = currentDay.getDate();

        // Find hours for this day (sum multiple entries if they exist)
        const hours = entries
            .filter(entry => entry.date === dateStr)
            .reduce((sum, entry) => sum + entry.hours, 0);

        // Update DOM
        const dayCard = document.getElementById(`day-${day}`);
        dayCard.querySelector('.day-date').textContent = dayNum;
        dayCard.querySelector('.day-hours').textContent = hours > 0 ? `${hours}h` : '0h';

        // Add visual indicator if has hours
        if (hours > 0) {
            dayCard.classList.add('has-hours');
        } else {
            dayCard.classList.remove('has-hours');
        }
        
        // Add click handler to select this date in the form
        dayCard.onclick = () => selectDate(dateStr);
    });
}

// Select date in the form and focus hours input
function selectDate(dateStr) {
    document.getElementById('date').value = dateStr;
    document.getElementById('hours').focus();
}

// Render entries list
function renderEntries() {
    const container = document.getElementById('entriesList');

    if (entries.length === 0) {
        container.innerHTML = '<div class="empty-state">No entries yet. Add your first babysitting session above!</div>';
        return;
    }

    container.innerHTML = entries.map(entry => `
        <div class="entry-item">
            <div class="entry-info">
                <div class="entry-date">${formatDate(entry.date)}</div>
                <div class="entry-hours">${entry.hours} ${entry.hours === 1 ? 'hour' : 'hours'}</div>
            </div>
            <button class="btn-delete" onclick="deleteEntry(${entry.id})">
                <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `).join('');
}

// Update summary cards
function updateSummary() {
    const weeklyHours = getWeeklyHours() || 0;
    document.getElementById('weeklyHours').textContent = `${weeklyHours}h`;
}

// Calculate weekly hours (Mon-Fri of current week)
function getWeeklyHours() {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Calculate Monday of current week
    const monday = new Date(today);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(today.getDate() + diff);

    // Calculate Friday of current week
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const mondayStr = formatDateString(monday);
    const fridayStr = formatDateString(friday);

    return entries
        .filter(entry => entry.date >= mondayStr && entry.date <= fridayStr)
        .reduce((sum, entry) => sum + entry.hours, 0);
}

// Format date for display
function formatDate(dateString) {
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}