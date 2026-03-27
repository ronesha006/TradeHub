let cart = JSON.parse(localStorage.getItem("cart")) || [];

const cartContainer = document.getElementById("cart-items");
const totalDisplay = document.getElementById("total");

// ------------------------------
// DISPLAY CART ITEMS
// ------------------------------

// Display cart items
function displayCart() {
    if (!cartContainer) return;
    
    cartContainer.innerHTML = "";
    let total = 0;

    cart.forEach((item, index) => {
        let price = parseFloat(item.Current_Price);
        let quantity = item.quantity;
        total += price * quantity;

        // Use the image path from cart item
        const imagePath = item.Product_Image ? 
            `Images/${item.Product_Image}` : 
            'Images/default-product.jpg';

        const cartItem = `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${imagePath}" 
                         alt="${item.Product_Name}"
                         onerror="this.src='Images/default-product.jpg'"
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
                </div>
                <div class="cart-item-details">
                    <h3>${item.Product_Name}</h3>
                    <p>₹${price} x ${quantity}</p>
                </div>
                <div class="cart-actions">
                    <button onclick="increaseQty(${index})">+</button>
                    <button onclick="decreaseQty(${index})">-</button>
                    <button onclick="removeItem(${index})">Remove</button>
                </div>
            </div>
        `;
        cartContainer.innerHTML += cartItem;
    });

    if (totalDisplay) {
        totalDisplay.innerText = total.toFixed(2);
    }
    updateCartCount();
}

// ------------------------------
// INCREASE QUANTITY
// ------------------------------

function increaseQty(index) {
    cart[index].quantity++;
    updateCart();
}

// ------------------------------
// DECREASE QUANTITY
// ------------------------------

function decreaseQty(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity--;
    } else {
        cart.splice(index, 1);
    }
    updateCart();
}

// ------------------------------
// REMOVE ITEM
// ------------------------------

function removeItem(index) {
    cart.splice(index, 1);
    updateCart();
}

// ------------------------------
// UPDATE CART STORAGE
// ------------------------------

function updateCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
    displayCart();
}

// ------------------------------
// UPDATE CART COUNT BADGE
// ------------------------------

function updateCartCount() {
    const cartCountElement = document.getElementById("cart-count");
    if (cartCountElement) {
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountElement.textContent = totalItems;
        
        if (totalItems > 0) {
            cartCountElement.style.display = "flex";
        } else {
            cartCountElement.style.display = "none";
        }
    }
}

// ------------------------------
// GO TO CART
// ------------------------------

function goToCart() {
    window.location.href = "cart.html";
}

// ------------------------------
// CHECKOUT BUTTON - UPDATED to include user_id
// ------------------------------

async function goToCheckout() {
    if (cart.length === 0) {
        alert("Cart is empty!");
        return;
    }
    
    // Get the logged-in user_id from localStorage
    const userId = localStorage.getItem("user_id");
    
    if (!userId) {
        alert("Please login to place an order");
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:5000/create-order", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                cart: cart,
                user_id: parseInt(userId)  // Send user_id to backend
            })
        });

        const result = await response.json();
        
        if (response.ok) {
            alert("Order placed successfully! Order ID: " + result.order_id);
            
            // Clear cart
            cart = [];
            localStorage.removeItem("cart");
            displayCart();
            updateCartCount();
            
            // Ask if user wants to view orders
            if (confirm("Order placed! Would you like to view your orders?")) {
                window.location.href = "profile.html";
            }
        } else {
            alert(result.message || "Order failed!");
        }

    } catch (error) {
        console.error("Error placing order:", error);
        alert("Order failed! Please make sure the backend server is running.");
    }
}

// Load cart on page open
displayCart();