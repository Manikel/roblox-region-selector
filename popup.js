// popup.js - Simple credits page functionality

document.addEventListener('DOMContentLoaded', function() {
  // Handle link clicks
  const githubLink = document.getElementById('github-link');
  const rateLink = document.getElementById('rate-link');

  // Open GitHub repository
  if (githubLink) {
    githubLink.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com' });
    });
  }

  // Open Chrome Web Store page
  if (rateLink) {
    rateLink.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://chrome.google.com/webstore' });
    });
  }

  // Add fade-in animation on load
  document.body.style.opacity = '0';
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.3s ease';
    document.body.style.opacity = '1';
  }, 50);
});
