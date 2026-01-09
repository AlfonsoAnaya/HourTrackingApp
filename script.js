let entries = [];
let hourlyRate = 15;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Load hourly rate from localStorage
    const savedRate = localStorage.getItem('hourlyRate');
    if (savedRate) {
        hourlyRate = parseFloat(savedRate);
        document.getElementById('hourlyRate').value = hourlyRate;
    }
    
    // Event listeners
    document.getElementById('addBtn').addEventListener('click', addEntry);
    document.getElementById('hourlyRate').addEventListener('change', updateHourlyRate);
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
        if (!response.ok) throw new Error('Failed to fetch entries');
        
        entries = await response.json();
        renderEntries();
        updateSummary();
    } catch (error) {
        console.error('Error fetching entries:', error);
        document.getElementById('entriesList').innerHTML = 
            '<div class="empty-state">Error loading entries. Please refresh the page.</div>';
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

// Update hourly rate
function updateHourlyRate(e) {
    hourlyRate = parseFloat(e.target.value) || 0;
    localStorage.setItem('hourlyRate', hourlyRate);
    updateSummary();
    renderEntries();
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
                <div class="entry-pay">$${(entry.hours * hourlyRate).toFixed(2)}</div>
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
    const weeklyHours = getWeeklyHours();
    const totalHours = getTotalHours();
    const weeklyPay = weeklyHours * hourlyRate;
    
    document.getElementById('weeklyHours').textContent = `${weeklyHours.toFixed(1)}h`;
    document.getElementById('weeklyPay').textContent = `$${weeklyPay.toFixed(2)}`;
    document.getElementById('totalHours').textContent = `${totalHours.toFixed(1)}h`;
}

// Calculate weekly hours (last 7 days)
function getWeeklyHours() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return entries
        .filter(entry => new Date(entry.date) >= oneWeekAgo)
        .reduce((sum, entry) => sum + entry.hours, 0);
}

// Calculate total hours
function getTotalHours() {
    return entries.reduce((sum, entry) => sum + entry.hours, 0);
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}