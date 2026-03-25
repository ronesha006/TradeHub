// Simple interaction for the search button
document.querySelector('.search-btn').addEventListener('click', function() {
    const query = document.querySelector('.search-container input').value;
    if(query) {
        alert('Searching for: ' + query);
        // In a real app, you'd redirect to a search results page
    } else {
        alert('Please enter a search term.');
    }
});

// Optional: Subtle hover effect for the logo
const logo = document.querySelector('.logo');
logo.style.cursor = 'pointer';
logo.addEventListener('mouseover', () => {
    logo.style.color = '#f38d16';
});
logo.addEventListener('mouseout', () => {
    logo.style.color = 'white';
});