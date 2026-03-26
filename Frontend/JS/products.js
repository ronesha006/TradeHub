let products = [];  // All products from database
let filteredProducts = []; // Products after filtering
let categories = []; // Available categories
let priceRanges = []; // Dynamic price ranges

// Load products and categories from Flask API
async function loadProducts() {
    try {
        const response = await fetch("http://127.0.0.1:5000/products");
        products = await response.json();
        filteredProducts = [...products];
        
        // Extract unique categories
        extractCategories();
        
        // Generate dynamic price ranges
        generatePriceRanges();
        
        // Display products
        displayProducts();
        
        // Update product count
        updateProductCount();
        
    } catch (error) {
        console.error("Error loading products:", error);
        const productGrid = document.getElementById("product-grid");
        if (productGrid) {
            productGrid.innerHTML = '<p style="text-align:center; padding: 50px;">Failed to load products. Please make sure the backend server is running.</p>';
        }
    }
}

// Extract unique categories from products
function extractCategories() {
    const categorySet = new Set();
    products.forEach(product => {
        if (product.Category_Name) {
            categorySet.add(product.Category_Name);
        }
    });
    categories = Array.from(categorySet).sort();
    
    // Populate category filters
    const categoryFiltersDiv = document.getElementById("category-filters");
    if (categoryFiltersDiv) {
        let html = '<label><input type="checkbox" class="category-filter" value="all" checked onchange="filterProducts()"> All</label>';
        categories.forEach(category => {
            html += `
                <label>
                    <input type="checkbox" class="category-filter" value="${category}" onchange="filterProducts()">
                    ${category}
                </label>
            `;
        });
        categoryFiltersDiv.innerHTML = html;
    }
}

// Generate dynamic price ranges based on actual product prices
function generatePriceRanges() {
    if (products.length === 0) return;
    
    // Find min and max prices
    const prices = products.map(p => parseFloat(p.Current_Price));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Create dynamic price ranges
    priceRanges = [];
    
    // If price range is small, create smaller intervals
    const priceDiff = maxPrice - minPrice;
    
    if (priceDiff <= 100) {
        // Small range: create 4 equal intervals
        const interval = Math.ceil(priceDiff / 4);
        let start = Math.floor(minPrice);
        for (let i = 0; i < 4; i++) {
            let end = start + interval;
            if (i === 3) end = maxPrice;
            priceRanges.push({
                min: start,
                max: end,
                label: `₹${start} - ₹${end}`
            });
            start = end;
        }
    } else {
        // Create standard ranges based on actual data
        const ranges = [
            { min: 0, max: 500, label: "Under ₹500" },
            { min: 500, max: 1000, label: "₹500 - ₹1,000" },
            { min: 1000, max: 2000, label: "₹1,000 - ₹2,000" },
            { min: 2000, max: 5000, label: "₹2,000 - ₹5,000" },
            { min: 5000, max: 10000, label: "₹5,000 - ₹10,000" },
            { min: 10000, max: Infinity, label: "₹10,000+" }
        ];
        
        // Only include ranges that have products
        ranges.forEach(range => {
            const hasProducts = products.some(p => {
                const price = parseFloat(p.Current_Price);
                return price >= range.min && price < range.max;
            });
            
            if (hasProducts || range.min === 0) {
                priceRanges.push(range);
            }
        });
    }
    
    // Populate price filters
    const priceFiltersDiv = document.getElementById("price-filters");
    if (priceFiltersDiv) {
        let html = '';
        priceRanges.forEach((range, index) => {
            html += `
                <label>
                    <input type="radio" name="price-range" value="${index}" onchange="filterProducts()">
                    ${range.label}
                </label>
            `;
        });
        // Add "All" option
        html = `
            <label>
                <input type="radio" name="price-range" value="-1" checked onchange="filterProducts()">
                All Prices
            </label>
        ` + html;
        priceFiltersDiv.innerHTML = html;
    }
}

// Filter products based on selected categories and price range
function filterProducts() {
    // Get selected categories
    const selectedCategories = [];
    const categoryCheckboxes = document.querySelectorAll('.category-filter');
    
    categoryCheckboxes.forEach(checkbox => {
        if (checkbox.checked && checkbox.value !== 'all') {
            selectedCategories.push(checkbox.value);
        }
    });
    
    // Check if "All" is selected
    const allCheckbox = document.querySelector('.category-filter[value="all"]');
    const selectAllCategories = allCheckbox ? allCheckbox.checked : true;
    
    // Get selected price range
    const selectedPriceRadio = document.querySelector('input[name="price-range"]:checked');
    let selectedPriceRange = null;
    if (selectedPriceRadio && selectedPriceRadio.value !== '-1') {
        selectedPriceRange = priceRanges[parseInt(selectedPriceRadio.value)];
    }
    
    // Filter products
    filteredProducts = products.filter(product => {
        // Category filter
        let categoryMatch = selectAllCategories;
        if (!selectAllCategories && selectedCategories.length > 0) {
            categoryMatch = selectedCategories.includes(product.Category_Name);
        }
        
        // Price filter
        let priceMatch = true;
        if (selectedPriceRange) {
            const price = parseFloat(product.Current_Price);
            priceMatch = price >= selectedPriceRange.min && price < selectedPriceRange.max;
        }
        
        return categoryMatch && priceMatch;
    });
    
    // Sort products
    sortProducts();
}

// Sort products based on selected option
function sortProducts() {
    const sortBy = document.getElementById("sort-by").value;
    
    switch(sortBy) {
        case "price-low":
            filteredProducts.sort((a, b) => parseFloat(a.Current_Price) - parseFloat(b.Current_Price));
            break;
        case "price-high":
            filteredProducts.sort((a, b) => parseFloat(b.Current_Price) - parseFloat(a.Current_Price));
            break;
        case "name-asc":
            filteredProducts.sort((a, b) => a.Product_Name.localeCompare(b.Product_Name));
            break;
        case "name-desc":
            filteredProducts.sort((a, b) => b.Product_Name.localeCompare(a.Product_Name));
            break;
        default:
            // Featured: keep original order
            break;
    }
    
    displayProducts();
    updateProductCount();
}

// Clear all filters
function clearAllFilters() {
    // Clear category filters
    const categoryCheckboxes = document.querySelectorAll('.category-filter');
    categoryCheckboxes.forEach(checkbox => {
        if (checkbox.value === 'all') {
            checkbox.checked = true;
        } else {
            checkbox.checked = false;
        }
    });
    
    // Clear price filters
    const allPriceRadio = document.querySelector('input[name="price-range"][value="-1"]');
    if (allPriceRadio) {
        allPriceRadio.checked = true;
    }
    
    // Reset sorting
    document.getElementById("sort-by").value = "featured";
    
    // Apply filters
    filterProducts();
}

// Update product count display
function updateProductCount() {
    const productCount = document.getElementById("product-count");
    if (productCount) {
        productCount.innerText = filteredProducts.length;
    }
}

// Display products in grid
function displayProducts() {
    const productGrid = document.getElementById("product-grid");
    
    if (!productGrid) return;
    
    if (filteredProducts.length === 0) {
        productGrid.innerHTML = '<p style="text-align:center; padding: 50px;">No products found matching your filters.</p>';
        return;
    }
    
    productGrid.innerHTML = "";
    
    filteredProducts.forEach(product => {
        const productCard = `
            <div class="product-card" data-product-id="${product.Product_ID}">
                <div class="image-container">
                    <img src="https://via.placeholder.com/300x400?text=${encodeURIComponent(product.Product_Name)}"
                         alt="${product.Product_Name}">
                    <button class="add-to-cart" onclick="addToCart(${product.Product_ID})">
                        Add to Cart
                    </button>
                </div>
                <div class="product-info">
                    <span class="category">${product.Category_Name || 'Fashion'}</span>
                    <h4 class="title">${product.Product_Name}</h4>
                    <span class="price">₹${parseFloat(product.Current_Price).toLocaleString('en-IN')}</span>
                </div>
            </div>
        `;
        productGrid.innerHTML += productCard;
    });
}

// ------------------------------
// CART SYSTEM
// ------------------------------

let cart = JSON.parse(localStorage.getItem("cart")) || [];

function addToCart(productId) {
    const product = products.find(p => p.Product_ID === productId);
    
    if (!product) {
        console.error("Product not found:", productId);
        return;
    }
    
    console.log("Adding:", product);
    
    const existing = cart.find(item => item.Product_ID === productId);
    
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    localStorage.setItem("cart", JSON.stringify(cart));
    console.log("Cart now:", cart);
    
    // Show notification
    showNotification(`${product.Product_Name} added to cart!`);
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 2 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Load products when page opens
loadProducts();

// Add these functions to your existing products.js file

// Update cart count badge
function updateCartCount() {
    const cartCountElement = document.getElementById("cart-count");
    if (cartCountElement) {
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountElement.textContent = totalItems;
        
        // Show/hide badge based on count
        if (totalItems > 0) {
            cartCountElement.style.display = "flex";
        } else {
            cartCountElement.style.display = "none";
        }
    }
}

// Go to cart page
function goToCart() {
    window.location.href = "cart.html";
}

// Modify your existing addToCart function to include updateCartCount
// Find your addToCart function and add this line at the end:
// updateCartCount();

// Also call updateCartCount() when page loads
// Add this line at the end of your loadProducts function:
// updateCartCount();