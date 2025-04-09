const config = {
    apiUrl: 'https://lsa-calculator.vercel.app'
};

// Make config available globally
if (typeof window !== 'undefined') {
    window.config = config;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
} 