const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    }
  },
  {
    threshold: 0.18,
    rootMargin: '0px 0px -5% 0px'
  }
);

for (const element of document.querySelectorAll('.reveal')) {
  observer.observe(element);
}
