let sellerId = null;

// Load seller dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    const userId = localStorage.getItem("user_id");
    const userType = localStorage.getItem("user_type");
    
    console.log("User ID:", userId);
    console.log("User Type:", userType);
    
    if (!userId) {
        alert("Please login to access seller dashboard");
        window.location.href = "login.html";
        return;
    }
    
    // Check if user is a seller
    if (userType !== 'S') {
        alert("Access denied. This page is for sellers only.");
        window.location.href = "products.html";
        return;
    }
    
    loadSellerDetails(userId);
});

// Load seller details
async function loadSellerDetails(userId) {
    try {
        console.log("Fetching seller details for user ID:", userId);
        const url = `http://127.0.0.1:5000/seller-details/${userId}`;
        console.log("Request URL:", url);
        
        const response = await fetch(url);
        console.log("Response status:", response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error response:", errorData);
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const seller = await response.json();
        console.log("Seller details received:", seller);
        
        sellerId = seller.Seller_ID;
        
        // Display seller info
        document.getElementById("sellerName").textContent = seller.Business_Name;
        document.getElementById("sellerFullName").textContent = seller.Name;
        document.getElementById("sellerEmail").textContent = seller.Email;
        document.getElementById("sellerPhone").textContent = seller.Phone;
        document.getElementById("businessName").textContent = seller.Business_Name;
        document.getElementById("gstNo").textContent = seller.GST_NO || 'Not provided';
        document.getElementById("sellerRating").textContent = seller.Seller_Rating || '0.0';
        
        // Load dashboard data
        await loadSellerProducts();
        await loadSellerOrders();
        await loadReturnRequests();
        await loadCategories();
        
    } catch (error) {
        console.error("Error loading seller details:", error);
        alert(`Failed to load seller details: ${error.message}\n\nPlease make sure you are registered as a seller.`);
        
        // If seller doesn't exist, redirect to register page
        if (error.message.includes("not found") || error.message.includes("not a seller")) {
            if (confirm("You are not registered as a seller. Would you like to register?")) {
                window.location.href = "register.html?type=S";
            } else {
                window.location.href = "login.html";
            }
        } else {
            window.location.href = "login.html";
        }
    }
}

// Load seller's products
async function loadSellerProducts() {
    try {
        if (!sellerId) {
            console.log("No seller ID yet");
            return;
        }
        
        const response = await fetch(`http://127.0.0.1:5000/seller-products/${sellerId}`);
        const products = await response.json();
        
        const productsGrid = document.getElementById("products-grid");
        const totalProductsSpan = document.getElementById("totalProducts");
        
        if (totalProductsSpan) {
            totalProductsSpan.textContent = products.length;
        }
        
        if (products.length === 0) {
            productsGrid.innerHTML = '<p class="no-data">No products added yet. Click "Add Product" to get started.</p>';
            return;
        }
        
        productsGrid.innerHTML = "";
        
        products.forEach(product => {
            const productCard = document.createElement("div");
            productCard.className = "product-card";
            productCard.innerHTML = `
                <div class="product-image">
                    <img src="Images/${product.Product_Image || 'default-product.jpg'}" 
                         alt="${product.Product_Name}"
                         onerror="this.src='Images/default-product.jpg'">
                </div>
                <div class="product-info">
                    <h4>${product.Product_Name}</h4>
                    <p class="category">${product.Category_Name}</p>
                    <p class="price">₹${parseFloat(product.Current_Price).toLocaleString('en-IN')}</p>
                    <p class="stock">Stock: ${product.Stock_Quantity || 0}</p>
                    <button class="edit-btn" onclick="editProduct(${product.Product_ID})">Edit</button>
                </div>
            `;
            productsGrid.appendChild(productCard);
        });
        
    } catch (error) {
        console.error("Error loading products:", error);
        document.getElementById("products-grid").innerHTML = '<p class="error">Failed to load products</p>';
    }
}

// Load seller's orders (separate pending and fulfilled)
async function loadSellerOrders() {
    try {
        if (!sellerId) {
            console.log("No seller ID yet");
            return;
        }
        
        const response = await fetch(`http://127.0.0.1:5000/seller-orders/${sellerId}`);
        const allOrders = await response.json();
        
        // Separate orders
        const pendingOrders = allOrders.filter(order => 
            order.Order_Status === 'Dispatched' || order.Order_Status === 'Shipped'
        );
        const fulfilledOrders = allOrders.filter(order => 
            order.Order_Status === 'Delivered'
        );
        
        // Update stats
        const totalOrdersSpan = document.getElementById("totalOrders");
        const pendingOrdersSpan = document.getElementById("pendingOrders");
        
        if (totalOrdersSpan) {
            totalOrdersSpan.textContent = fulfilledOrders.length;
        }
        if (pendingOrdersSpan) {
            pendingOrdersSpan.textContent = pendingOrders.length;
        }
        
        // Display pending orders
        const pendingList = document.getElementById("pending-orders-list");
        if (pendingOrders.length === 0) {
            pendingList.innerHTML = '<p class="no-data">No pending orders to process.</p>';
        } else {
            pendingList.innerHTML = "";
            pendingOrders.forEach(order => {
                const orderCard = createOrderCard(order, true);
                pendingList.appendChild(orderCard);
            });
        }
        
        // Display fulfilled orders
        const fulfilledList = document.getElementById("fulfilled-orders-list");
        if (fulfilledOrders.length === 0) {
            fulfilledList.innerHTML = '<p class="no-data">No fulfilled orders yet.</p>';
        } else {
            fulfilledList.innerHTML = "";
            fulfilledOrders.forEach(order => {
                const orderCard = createOrderCard(order, false);
                fulfilledList.appendChild(orderCard);
            });
        }
        
    } catch (error) {
        console.error("Error loading orders:", error);
        document.getElementById("pending-orders-list").innerHTML = '<p class="error">Failed to load orders</p>';
        document.getElementById("fulfilled-orders-list").innerHTML = '<p class="error">Failed to load orders</p>';
    }
}

// Create order card HTML
function createOrderCard(order, isPending) {
    const orderCard = document.createElement("div");
    orderCard.className = "order-card";
    
    const statusClass = order.Order_Status.toLowerCase();
    const statusDisplay = order.Order_Status === 'Dispatched' ? 'Ready to Ship' : order.Order_Status;
    
    orderCard.innerHTML = `
        <div class="order-header">
            <div>
                <h4>Order #${order.Order_ID}</h4>
                <p class="order-date">${order.Order_Date}</p>
            </div>
            <div class="order-status-badge ${statusClass}">
                ${statusDisplay}
            </div>
        </div>
        <div class="order-details">
            <p><strong>Customer:</strong> ${order.Customer_Name}</p>
            <p><strong>Product:</strong> ${order.Product_Name}</p>
            <p><strong>Quantity:</strong> ${order.Quantity}</p>
            <p><strong>Price:</strong> ₹${parseFloat(order.Price_At_Purchase).toLocaleString('en-IN')}</p>
            <p><strong>Delivery Address:</strong> ${order.Delivery_Address}</p>
        </div>
        ${isPending ? `
            <div class="order-actions">
                ${order.Order_Status === 'Dispatched' ? 
                    `<button class="status-btn shipped" onclick="updateOrderStatus(${order.Order_ID}, 'Shipped')">Mark as Shipped</button>` : 
                    order.Order_Status === 'Shipped' ?
                    `<button class="status-btn delivered" onclick="updateOrderStatus(${order.Order_ID}, 'Delivered')">Mark as Delivered</button>` :
                    ''
                }
            </div>
        ` : `
            <div class="order-actions">
                <span class="status-completed">✓ Completed</span>
            </div>
        `}
    `;
    
    return orderCard;
}

// Load return requests
async function loadReturnRequests() {
    try {
        if (!sellerId) {
            console.log("No seller ID yet");
            return;
        }
        
        const response = await fetch(`http://127.0.0.1:5000/seller-returns/${sellerId}`);
        const returns = await response.json();
        
        const returnsList = document.getElementById("returns-list");
        
        if (returns.length === 0) {
            returnsList.innerHTML = '<p class="no-data">No active return requests.</p>';
            return;
        }
        
        returnsList.innerHTML = "";
        
        returns.forEach(returnReq => {
            const returnCard = document.createElement("div");
            returnCard.className = "return-card";
            returnCard.innerHTML = `
                <div class="return-header">
                    <h4>Return Request #${returnReq.Return_ID}</h4>
                    <span class="return-status-badge ${returnReq.Return_Status.toLowerCase()}">
                        ${returnReq.Return_Status}
                    </span>
                </div>
                <div class="return-details">
                    <p><strong>Order #${returnReq.Order_ID}</strong> - <strong>Customer:</strong> ${returnReq.Customer_Name}</p>
                    <p><strong>Product:</strong> ${returnReq.Product_Name}</p>
                    <p><strong>Quantity:</strong> ${returnReq.Quantity}</p>
                    <p><strong>Refund Amount:</strong> ₹${parseFloat(returnReq.Refund_Amount).toLocaleString('en-IN')}</p>
                    <p><strong>Reason:</strong> ${returnReq.Return_reason}</p>
                    <p><strong>Requested on:</strong> ${returnReq.Request_Date}</p>
                    ${returnReq.Return_reason_detail ? 
                        `<p><strong>Details:</strong> ${returnReq.Return_reason_detail}</p>` : ''}
                </div>
                <div class="return-actions">
                    ${returnReq.Return_Status === 'Requested' ? 
                        `<button class="approve-btn" onclick="processReturn(${returnReq.Return_ID}, 'Approved')">Approve Return</button>
                         <button class="reject-btn" onclick="processReturn(${returnReq.Return_ID}, 'Rejected')">Reject Return</button>` : 
                        returnReq.Return_Status === 'Approved' ?
                        `<button class="received-btn" onclick="processReturn(${returnReq.Return_ID}, 'Received')">Mark as Received</button>` :
                        `<span class="status-completed">${returnReq.Return_Status}</span>`
                    }
                </div>
            `;
            returnsList.appendChild(returnCard);
        });
        
    } catch (error) {
        console.error("Error loading returns:", error);
        document.getElementById("returns-list").innerHTML = '<p class="error">Failed to load return requests</p>';
    }
}

// Load categories for add product form
async function loadCategories() {
    try {
        const response = await fetch("http://127.0.0.1:5000/categories");
        const categories = await response.json();
        
        const categorySelect = document.getElementById("categoryId");
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Select Category</option>';
            
            categories.forEach(category => {
                categorySelect.innerHTML += `<option value="${category.Category_ID}">${category.Category_Name}</option>`;
            });
        }
        
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

// Add new product
const addProductForm = document.getElementById('addProductForm');
if (addProductForm) {
    addProductForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const productData = {
            seller_id: sellerId,
            product_name: document.getElementById('productName').value,
            category_id: document.getElementById('categoryId').value,
            current_price: document.getElementById('productPrice').value,
            stock_quantity: document.getElementById('stockQuantity').value,
            product_image: document.getElementById('productImage').value || null,
            storage_location: document.getElementById('storageLocation').value || 'Default'
        };
        
        try {
            const response = await fetch("http://127.0.0.1:5000/add-product", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(productData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert("Product added successfully!");
                addProductForm.reset();
                showSection('products');
                loadSellerProducts();
            } else {
                alert(result.message || "Failed to add product");
            }
        } catch (error) {
            console.error("Error adding product:", error);
            alert("Failed to add product");
        }
    });
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch("http://127.0.0.1:5000/update-order-status", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                order_id: orderId,
                status: newStatus
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(`Order #${orderId} marked as ${newStatus}`);
            loadSellerOrders();
            loadReturnRequests();
        } else {
            alert(result.message || "Failed to update order status");
        }
    } catch (error) {
        console.error("Error updating order:", error);
        alert("Failed to update order status");
    }
}

// Process return request
async function processReturn(returnId, action) {
    const status = action === 'Approved' ? 'Approved' : 
                   action === 'Rejected' ? 'Rejected' : 'Received';
    
    if (!confirm(`Are you sure you want to ${action.toLowerCase()} this return request?`)) {
        return;
    }
    
    try {
        const response = await fetch("http://127.0.0.1:5000/process-return", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                return_id: returnId,
                status: status,
                action: action
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(`Return request ${action.toLowerCase()} successfully`);
            loadReturnRequests();
            loadSellerOrders();
        } else {
            alert(result.message || "Failed to process return");
        }
    } catch (error) {
        console.error("Error processing return:", error);
        alert("Failed to process return");
    }
}

// Navigation functions
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
    
    // Update active nav button
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate corresponding nav button
    const navButtons = document.querySelectorAll('.nav-item');
    const sectionMap = {
        'seller-details': 0,
        'products': 1,
        'orders': 2,
        'add-product': 3
    };
    
    if (sectionMap[sectionId] !== undefined && navButtons[sectionMap[sectionId]]) {
        navButtons[sectionMap[sectionId]].classList.add('active');
    }
}

function showTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate clicked tab button
    const buttons = document.querySelectorAll('.tab-btn');
    for (let btn of buttons) {
        if (btn.textContent.toLowerCase().includes(tabId.toLowerCase().replace('-tab', ''))) {
            btn.classList.add('active');
            break;
        }
    }
}

function editProduct(productId) {
    alert(`Edit product functionality coming soon. Product ID: ${productId}`);
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("user_id");
        localStorage.removeItem("user_type");
        localStorage.removeItem("cart");
        window.location.href = "login.html";
    }
}