const DEFAULT_STATUS = {
    isDown: false,
    reason: 'All services are currently healthy.',
    updatedAt: null
};

async function getStatusData() {
    try {
        const response = await window.fetch('status-data.json', {
            cache: 'no-store'
        });

        if (!response.ok) {
            return { ...DEFAULT_STATUS };
        }

        const parsedStatus = await response.json();

        return {
            isDown: Boolean(parsedStatus.isDown),
            reason: typeof parsedStatus.reason === 'string' && parsedStatus.reason.trim()
                ? parsedStatus.reason.trim()
                : DEFAULT_STATUS.reason,
            updatedAt: parsedStatus.updatedAt || null
        };
    } catch (error) {
        return { ...DEFAULT_STATUS };
    }
}

function formatTimestamp(timestamp) {
    if (!timestamp) {
        return 'Not yet updated.';
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return 'Not yet updated.';
    }

    return date.toLocaleString();
}

async function updateStatusPage() {
    const pill = document.querySelector('[data-status-pill]');

    if (!pill) {
        return;
    }

    const status = await getStatusData();
    const title = document.querySelector('[data-status-title]');
    const headline = document.querySelector('[data-status-headline]');
    const copy = document.querySelector('[data-status-copy]');
    const reason = document.querySelector('[data-status-reason]');
    const updated = document.querySelector('[data-status-updated]');
    const detailIcon = document.querySelector('[data-status-detail-icon]');
    const detailTitle = document.querySelector('[data-status-detail-title]');
    const detailCopy = document.querySelector('[data-status-detail-copy]');
    const expectation = document.querySelector('[data-status-expectation]');

    if (status.isDown) {
        document.title = 'papers status - down';
        pill.textContent = 'System outage';
        pill.classList.add('status-pill-down');
        title.textContent = 'Down';
        headline.textContent = 'The Papers app is currently unavailable.';
        copy.textContent = 'We are actively investigating the incident and working to restore service as quickly as possible.';
        reason.textContent = `Reason: ${status.reason}`;
        updated.textContent = `Last updated: ${formatTimestamp(status.updatedAt)}`;
        detailIcon.textContent = '🚨';
        detailTitle.textContent = 'What’s happening';
        detailCopy.textContent = 'An active incident is affecting the availability of the Papers app.';
        expectation.textContent = 'You may have trouble loading feeds, opening papers, or syncing bookmarks until the incident is resolved.';
        return;
    }

    document.title = 'papers status - operational';
    pill.textContent = 'All systems operational';
    pill.classList.remove('status-pill-down');
    title.textContent = 'Operational';
    headline.textContent = 'The Papers app is up and running normally.';
    copy.textContent = 'Core app services are available and operating as expected. You should be able to browse feeds, open papers, and sync normally.';
    reason.textContent = 'Reason: All services are currently healthy.';
    updated.textContent = `Last updated: ${formatTimestamp(status.updatedAt)}`;
    detailIcon.textContent = '🛠️';
    detailTitle.textContent = 'What’s happening';
    detailCopy.textContent = 'The platform is stable and available. No active incident is currently affecting app availability.';
    expectation.textContent = 'Feeds, paper detail pages, and bookmark sync should respond normally while the service remains healthy.';
}

function setupHomePage() {
    const overlay = document.getElementById('intro-overlay');
    const mainContent = document.getElementById('main-content');

    if (!overlay || !mainContent) {
        return;
    }

    setTimeout(() => {
        overlay.style.transform = 'translateY(-100%)';
        mainContent.style.opacity = '1';

        setTimeout(() => {
            overlay.style.display = 'none';
        }, 800);
    }, 2800);

    const screenshots = document.querySelectorAll('.app-screenshot');

    if (!screenshots.length) {
        return;
    }

    let currentIndex = 0;

    function nextScreenshot() {
        const current = screenshots[currentIndex];
        currentIndex = (currentIndex + 1) % screenshots.length;
        const next = screenshots[currentIndex];

        next.classList.remove('previous');
        next.classList.add('active');
        current.classList.remove('active');
        current.classList.add('previous');

        setTimeout(() => {
            current.classList.remove('previous');
        }, 800);
    }

    window.setInterval(nextScreenshot, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    setupHomePage();
    updateStatusPage();
});
