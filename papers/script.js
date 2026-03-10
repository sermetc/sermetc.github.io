document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('intro-overlay');
    const mainContent = document.getElementById('main-content');
    
    // Splash screen animation
    setTimeout(() => {
        overlay.style.transform = 'translateY(-100%)';
        mainContent.style.opacity = '1';
        
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 800);
    }, 2800); // Slightly longer to show both text and icon

    // Screenshot carousel
    const screenshots = document.querySelectorAll('.app-screenshot');
    let currentIndex = 0;

    function nextScreenshot() {
        const current = screenshots[currentIndex];
        currentIndex = (currentIndex + 1) % screenshots.length;
        const next = screenshots[currentIndex];

        // Prepare next
        next.classList.remove('previous');
        next.classList.add('active');

        // Mark current as previous
        current.classList.remove('active');
        current.classList.add('previous');

        // Clean up previous after animation
        setTimeout(() => {
            current.classList.remove('previous');
        }, 800);
    }

    // Change screenshot every 4 seconds
    setInterval(nextScreenshot, 4000);
});
