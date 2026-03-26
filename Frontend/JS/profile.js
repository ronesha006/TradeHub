// Load user details when page loads
document.addEventListener('DOMContentLoaded', function() {
    const userId = localStorage.getItem("user_id");
    
    if (!userId) {
        alert("Please login to view your profile");
        window.location.href = "login.html";
        return;
    }
    
    loadUserDetails(userId);
    loadUserOrders(userId);
    updateCartCount();
});

// Load user details from database
async function loadUserDetails(userId) {
    try {
        const response = await fetch(`http://127.0.0.1:5000/user/${userId}`);
        
        if (!response.ok) {
            throw new Error("Failed to fetch user details");
        }
        
        const userData = await response.json();
        
        // Display user details
        document.getElementById("userName").textContent = userData.Name || "Not available";
        document.getElementById("userEmail").textContent = userData.Email || "Not available";
        document.getElementById("userPhone").textContent = userData.Phone || "Not available";
        
        // Display user type
        const userTypeElement = document.getElementById("userType");
        if (userTypeElement) {
            userTypeElement.textContent = userData.User_Type === 'C' ? 'Customer' : 'Seller';
        }
        
        console.log("User details loaded:", userData);
        
    } catch (error) {
        console.error("Error loading user details:", error);
        document.getElementById("userName").textContent = "Failed to load";
        document.getElementById("userEmail").textContent = "Please try again later";
        document.getElementById("userPhone").textContent = "Error loading data";
    }
}

// Load user orders from database
async function loadUserOrders(userId) {
    try {
        const response = await fetch(`http://127.0.0.1:5000/user-orders/${userId}`);
        
        if (!response.ok) {
            throw new Error("Failed to fetch orders");
        }
        
        const orders = await response.json();
        
        const ordersList = document.getElementById("orders-list");
        
        if (!ordersList) return;
        
        if (orders.length === 0) {
            ordersList.innerHTML = `
                <div class="no-orders">
                    <p>No orders found</p>
                    <a href="products.html" class="shop-now-btn">Start Shopping</a>
                </div>
            `;
            return;
        }
        
        ordersList.innerHTML = "";
        
        // Display each order
        orders.forEach(order => {
            const orderCard = document.createElement("div");
            orderCard.className = "order-card";
            
            // Format date
            const orderDate = order.Order_Date_Formatted || order.Order_Date;
            
            // Calculate item count
            const itemCount = order.items.length;
            const itemText = itemCount === 1 ? 'item' : 'items';
            
            orderCard.innerHTML = `
                <div class="order-header">
                    <div>
                        <h3>Order #${order.Order_ID}</h3>
                        <span class="order-date">${orderDate}</span>
                    </div>
                    <span class="order-status ${order.Order_Status.toLowerCase().replace(' ', '-')}">
                        ${order.Order_Status}
                    </span>
                </div>
                
                <div class="order-items">
                    <div class="items-header">
                        <h4>Items (${itemCount} ${itemText})</h4>
                    </div>
                    ${order.items.map(item => `
                        <div class="order-item">
                            <div class="item-info">
                                <span class="item-name">${item.Product_Name}</span>
                                <span class="item-category">${item.Category_Name || 'Fashion'}</span>
                            </div>
                            <div class="item-details">
                                <span class="item-quantity">Qty: ${item.Quantity}</span>
                                <span class="item-price">₹${parseFloat(item.Price_At_Purchase).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="order-footer">
                    <div class="order-total">
                        <strong>Total Amount:</strong>
                        <span>₹${parseFloat(order.Total_Amount).toLocaleString('en-IN')}</span>
                    </div>
                    <div class="order-actions">
                        ${order.Order_Status === 'Delivered' ? 
                            `<button class="return-btn" onclick="requestReturn(${order.Order_ID})">
                                Request Return
                            </button>` : 
                            order.Order_Status === 'Return Requested' ?
                            `<span class="return-status pending">Return Requested - Pending Approval</span>` :
                            order.Order_Status === 'Return Approved' ?
                            `<span class="return-status approved">Return Approved - Refund Initiated</span>` :
                            order.Order_Status === 'Shipped' ?
                            `<span class="return-status shipping-status">Order Shipped - Tracking Available</span>` :
                            `<span class="return-status order-status">Order ${order.Order_Status}</span>`
                        }
                    </div>
                </div>
            `;
            ordersList.appendChild(orderCard);
        });
        
        console.log(`Loaded ${orders.length} orders`);
        
    } catch (error) {
        console.error("Error loading orders:", error);
        document.getElementById("orders-list").innerHTML = `
            <div class="error">
                <p>Failed to load orders. Please make sure the backend server is running.</p>
                <p class="error-detail">Error: ${error.message}</p>
            </div>
        `;
    }
}

// Request return for an order
async function requestReturn(orderId) {
    if (!confirm("Are you sure you want to request a return for this order?")) {
        return;
    }
    
    const userId = localStorage.getItem("user_id");
    
    try {
        const response = await fetch("http://127.0.0.1:5000/request-return", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                order_id: orderId,
                user_id: userId,
                reason: "Customer request"
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert("Return request submitted successfully!");
            // Refresh orders list
            loadUserOrders(userId);
        } else {
            alert(result.message || "Failed to submit return request");
        }
    } catch (error) {
        console.error("Error requesting return:", error);
        alert("Failed to submit return request. Please try again.");
    }
}

// Update cart count
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

// Go to cart
function goToCart() {
    window.location.href = "cart.html";
}

// Logout function
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("user_id");
        localStorage.removeItem("cart");
        window.location.href = "login.html";
    }
}