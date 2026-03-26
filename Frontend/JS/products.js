let products = [];  // Will load from database

// Load products from Flask API
async function loadProducts() {

    try {

        const response =
            await fetch("http://127.0.0.1:5000/products");

        products =
            await response.json();

        const productGrid =
            document.querySelector(".product-grid");

        productGrid.innerHTML = "";

        products.forEach(product => {

            const productCard = `
                <div class="product-card">

                    <div class="image-container">

                        <img src="Images/Facebook Logo.png"
                             alt="product">

                        <button class="add-to-cart"
                            onclick="addToCart(${product.Product_ID})">
                            Add to Cart
                        </button>

                    </div>

                    <div class="product-info">

                        <span class="category">
                            ${product.Category_Name}
                        </span>

                        <h4 class="title">
                            ${product.Product_Name}
                        </h4>

                        <span class="price">
                            ₹${product.Current_Price}
                        </span>

                    </div>

                </div>
            `;

            productGrid.innerHTML += productCard;

        });

    }

    catch (error) {

        console.error(
            "Error loading products:",
            error
        );

    }

}


// ------------------------------
// CART SYSTEM
// ------------------------------

let cart =
    JSON.parse(localStorage.getItem("cart")) || [];

function addToCart(productId) {

    const product =
        products.find(
            p => p.Product_ID === productId
        );

    console.log("Adding:", product);

    const existing =
        cart.find(
            item =>
            item.Product_ID === productId
        );

    if (existing) {

        existing.quantity += 1;

    }

    else {

        cart.push({
            ...product,
            quantity: 1
        });

    }

    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );

    console.log("Cart now:", cart);

    alert("Added to cart!");

}


// Load products when page opens
loadProducts();