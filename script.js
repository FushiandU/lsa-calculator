document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('lsa-estimator-form');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const error = document.getElementById('error');
    const budgetRange = document.querySelector('.budget-range');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Hide previous results/errors
        result.style.display = 'none';
        error.style.display = 'none';
        loading.style.display = 'block';
        
        const formData = {
            zipCode: document.getElementById('zip-code').value,
            category: document.getElementById('category').value
        };

        try {
            const response = await fetch(lsaEstimator.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            loading.style.display = 'none';

            if (data.success) {
                budgetRange.textContent = data.budgetRange;
                result.style.display = 'block';
            } else {
                // Use fallback range if available
                if (data.fallbackRange) {
                    budgetRange.textContent = data.fallbackRange;
                    result.style.display = 'block';
                } else {
                    error.style.display = 'block';
                }
            }
        } catch (err) {
            console.error('Error:', err);
            loading.style.display = 'none';
            error.style.display = 'block';
        }
    });
}); 