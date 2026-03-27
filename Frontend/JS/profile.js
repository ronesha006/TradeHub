// Load user details when page loads
document.addEventListener('DOMContentLoaded', function() {
    const userId = localStorage.getItem("user_id");
    
    console.log("User ID from localStorage:", userId);
    
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
        console.log("Fetching user details for ID:", userId);
        const url = `http://127.0.0.1:5000/user/${userId}`;
        console.log("Request URL:", url);
        
        const response = await fetch(url);
        console.log("Response status:", response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const userData = await response.json();
        console.log("User details loaded:", userData);
        
        // Display user details
        document.getElementById("userName").textContent = userData.Name || "Not available";
        document.getElementById("userEmail").textContent = userData.Email || "Not available";
        document.getElementById("userPhone").textContent = userData.Phone || "Not available";
        
        // Display user type
        const userTypeElement = document.getElementById("userType");
        if (userTypeElement) {
            userTypeElement.textContent = userData.User_Type === 'C' ? 'Customer' : 'Seller';
        }
        
    } catch (error) {
        console.error("Error loading user details:", error);
        document.getElementById("userName").textContent = "Failed to load";
        document.getElementById("userEmail").textContent = "Please try again later";
        document.getElementById("userPhone").textContent = "Error loading data";
    }
}

// Load user orders from database
// Load user orders from database
async function loadUserOrders(userId) {
    try {
        console.log("Fetching orders for user ID:", userId);
        const url = `http://127.0.0.1:5000/user-orders/${userId}`;
        console.log("Request URL:", url);
        
        const response = await fetch(url);
        console.log("Response status:", response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const orders = await response.json();
        console.log("Orders received:", orders);
        console.log("Number of orders:", orders.length);
        
        const ordersList = document.getElementById("orders-list");
        
        if (!ordersList) {
            console.error("orders-list element not found");
            return;
        }
        
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
            const itemCount = order.items ? order.items.length : 0;
            const itemText = itemCount === 1 ? 'item' : 'items';
            
            orderCard.innerHTML = `
                <div class="order-header">
                    <div>
                        <h3>Order #${order.Order_ID}</h3>
                        <span class="order-date">${orderDate || 'Date not available'}</span>
                    </div>
                    <span class="order-status ${order.Order_Status ? order.Order_Status.toLowerCase().replace(' ', '-') : 'unknown'}">
                        ${order.Order_Status || 'Status unknown'}
                    </span>
                </div>
                
                <div class="order-items">
                    <div class="items-header">
                        <h4>Items (${itemCount} ${itemText})</h4>
                    </div>
                    ${order.items && order.items.length > 0 ? 
                        order.items.map(item => {
                            const imagePath = item.Product_Image ? 
                                `Images/${item.Product_Image}` : 
                                'Images/default-product.jpg';
                            
                            // Check return status
                            const returnStatus = item.Return_Status;
                            const hasReturn = returnStatus && returnStatus !== '';
                            const canReturn = order.Order_Status === 'Delivered' && !hasReturn;
                            
                            // Determine what to show for return
                            let returnButtonHtml = '';
                            if (hasReturn) {
                                // Show return status badge
                                const statusClass = returnStatus.toLowerCase();
                                let statusText = '';
                                switch(returnStatus) {
                                    case 'Requested':
                                        statusText = 'Return Requested - Pending';
                                        break;
                                    case 'Approved':
                                        statusText = 'Return Approved - Processing';
                                        break;
                                    case 'Rejected':
                                        statusText = 'Return Rejected';
                                        break;
                                    case 'Received':
                                        statusText = 'Return Received - Refund Initiated';
                                        break;
                                    default:
                                        statusText = `Return ${returnStatus}`;
                                }
                                returnButtonHtml = `<span class="return-status-badge ${statusClass}">${statusText}</span>`;
                            } else if (canReturn) {
                                returnButtonHtml = `<button class="return-item-btn" onclick="showReturnOptions(${order.Order_ID})">Return</button>`;
                            } else if (order.Order_Status !== 'Delivered') {
                                returnButtonHtml = `<span class="return-status-badge not-eligible">Return available after delivery</span>`;
                            }
                            
                            return `
                                <div class="order-item">
                                    <div class="order-item-image">
                                        <img src="${imagePath}" 
                                             alt="${item.Product_Name}"
                                             onerror="this.src='Images/default-product.jpg'"
                                             style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
                                    </div>
                                    <div class="item-info">
                                        <span class="item-name">${item.Product_Name || 'Unknown product'}</span>
                                        <span class="item-category">${item.Category_Name || 'Fashion'}</span>
                                    </div>
                                    <div class="item-details">
                                        <span class="item-quantity">Qty: ${item.Quantity || 0}</span>
                                        <span class="item-price">₹${item.Price_At_Purchase ? parseFloat(item.Price_At_Purchase).toLocaleString('en-IN') : '0'}</span>
                                    </div>
                                    <div class="item-actions">
                                        ${returnButtonHtml}
                                    </div>
                                </div>
                            `;
                        }).join('') : 
                        '<p class="no-items">No items found for this order</p>'
                    }
                </div>
                
                <div class="order-footer">
                    <div class="order-total">
                        <strong>Total Amount:</strong>
                        <span>₹${order.Total_Amount ? parseFloat(order.Total_Amount).toLocaleString('en-IN') : '0'}</span>
                    </div>
                </div>
            `;
            ordersList.appendChild(orderCard);
        });
        
    } catch (error) {
        console.error("Error loading orders:", error);
        const ordersList = document.getElementById("orders-list");
        if (ordersList) {
            ordersList.innerHTML = `
                <div class="error">
                    <p>Failed to load orders. Please make sure the backend server is running.</p>
                    <p class="error-detail">Error: ${error.message}</p>
                    <button onclick="location.reload()" class="retry-btn">Retry</button>
                </div>
            `;
        }
    }
}

// Show return options for items in the order
async function showReturnOptions(orderId) {
    try {
        // First, check return status for items in this order
        const returnStatusResponse = await fetch(`http://127.0.0.1:5000/return-status/${orderId}`);
        const existingReturns = await returnStatusResponse.json();
        
        const response = await fetch(`http://127.0.0.1:5000/order-details/${orderId}`);
        const order = await response.json();
        
        if (!order.items || order.items.length === 0) {
            alert("No items found in this order");
            return;
        }
        
        // Create a map of existing returns
        const returnMap = {};
        existingReturns.forEach(ret => {
            returnMap[ret.Order_Item_ID] = ret;
        });
        
        // Create modal to select which item to return
        let itemSelectionHTML = `
            <div id="itemSelectModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Return Items</h3>
                        <span class="close-modal" onclick="closeItemSelectModal()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <p><strong>Order #${orderId}</strong></p>
                        <div class="items-list">
        `;
        
        order.items.forEach(item => {
            const imagePath = item.Product_Image ? 
                `Images/${item.Product_Image}` : 
                'Images/default-product.jpg';
            
            const existingReturn = returnMap[item.Order_Item_ID];
            const isReturnable = order.Order_Status === 'Delivered' && !existingReturn;
            
            if (existingReturn) {
                // Item already has a return request
                const statusClass = existingReturn.Return_Status === 'Requested' ? 'pending' : 
                                   existingReturn.Return_Status === 'Approved' ? 'approved' : 
                                   existingReturn.Return_Status === 'Rejected' ? 'rejected' : 'completed';
                
                itemSelectionHTML += `
                    <div class="select-item-card disabled">
                        <img src="${imagePath}" alt="${item.Product_Name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
                        <div class="item-details">
                            <strong>${item.Product_Name}</strong>
                            <p>Quantity: ${item.Quantity} | Price: ₹${item.Price_At_Purchase}</p>
                            <span class="return-status-badge ${statusClass}">
                                Return ${existingReturn.Return_Status}
                            </span>
                            <p class="return-info">
                                Requested on: ${existingReturn.Request_Date}<br>
                                Reason: ${existingReturn.Return_reason}
                            </p>
                        </div>
                    </div>
                `;
            } else if (isReturnable) {
                // Item can be returned
                itemSelectionHTML += `
                    <div class="select-item-card" onclick="openReturnModal(${orderId}, ${item.Order_Item_ID}, '${item.Product_Name.replace(/'/g, "\\'")}')">
                        <img src="${imagePath}" alt="${item.Product_Name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
                        <div class="item-details">
                            <strong>${item.Product_Name}</strong>
                            <p>Quantity: ${item.Quantity} | Price: ₹${item.Price_At_Purchase}</p>
                            <button class="return-btn-small">Request Return</button>
                        </div>
                    </div>
                `;
            } else {
                // Item cannot be returned (order not delivered or other reason)
                itemSelectionHTML += `
                    <div class="select-item-card disabled">
                        <img src="${imagePath}" alt="${item.Product_Name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
                        <div class="item-details">
                            <strong>${item.Product_Name}</strong>
                            <p>Quantity: ${item.Quantity} | Price: ₹${item.Price_At_Purchase}</p>
                            <span class="return-status-badge not-eligible">
                                Not Eligible for Return
                            </span>
                        </div>
                    </div>
                `;
            }
        });
        
        itemSelectionHTML += `
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', itemSelectionHTML);
        
    } catch (error) {
        console.error("Error fetching order details:", error);
        alert("Could not load order details");
    }
}

function closeItemSelectModal() {
    const modal = document.getElementById('itemSelectModal');
    if (modal) {
        modal.remove();
    }
}

// Open return modal for specific item
function openReturnModal(orderId, orderItemId, productName) {
    // Close the item selection modal first
    closeItemSelectModal();
    
    // Show the return request modal
    showReturnModal(orderId, orderItemId, productName);
}

// Show return request modal
function showReturnModal(orderId, orderItemId, productName) {
    // Check if modal already exists
    let modal = document.getElementById('returnModal');
    if (modal) {
        modal.remove();
    }
    
    // Create modal HTML
    const modalHTML = `
        <div id="returnModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Request Return</h3>
                    <span class="close-modal" onclick="closeReturnModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <p><strong>Product:</strong> ${productName}</p>
                    <p><strong>Order ID:</strong> #${orderId}</p>
                    
                    <form id="returnForm">
                        <div class="form-group">
                            <label>Reason for Return <span class="required">*</span></label>
                            <select id="returnReason" required>
                                <option value="">Select a reason</option>
                                <option value="Damaged">Damaged Product</option>
                                <option value="Wrong Item">Wrong Item Received</option>
                                <option value="Size Issue">Size Issue</option>
                                <option value="Quality Issue">Quality Issue</option>
                                <option value="Not as described">Not as described</option>
                                <option value="Late Delivery">Late Delivery</option>
                                <option value="Change of Mind">Change of Mind</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Return Type <span class="required">*</span></label>
                            <select id="returnType" required>
                                <option value="full_refund">Full Refund</option>
                                <option value="exchange">Exchange</option>
                                <option value="store_credit">Store Credit</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Additional Details</label>
                            <textarea id="returnDetail" rows="3" placeholder="Please provide more details about the issue..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Upload Image (Optional)</label>
                            <input type="file" id="returnImage" accept="image/*">
                            <small>Upload a photo of the product to help us process your return faster</small>
                        </div>
                        
                        <div class="form-checkbox">
                            <input type="checkbox" id="termsCheckbox" required>
                            <label for="termsCheckbox">I confirm that the product is in original condition with tags attached</label>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="cancel-btn" onclick="closeReturnModal()">Cancel</button>
                            <button type="submit" class="submit-btn">Submit Return Request</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add form submit handler
    document.getElementById('returnForm').addEventListener('submit', function(e) {
        e.preventDefault();
        submitReturnRequest(orderId, orderItemId);
    });
}

// Close return modal
function closeReturnModal() {
    const modal = document.getElementById('returnModal');
    if (modal) {
        modal.remove();
    }
}

// Submit return request
async function submitReturnRequest(orderId, orderItemId) {
    const returnReason = document.getElementById('returnReason').value;
    const returnType = document.getElementById('returnType').value;
    const returnDetail = document.getElementById('returnDetail').value;
    const userId = localStorage.getItem("user_id");
    
    if (!returnReason) {
        alert("Please select a reason for return");
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch("http://127.0.0.1:5000/submit-return", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                order_item_id: orderItemId,
                user_id: parseInt(userId),
                return_reason: returnReason,
                return_reason_detail: returnDetail,
                return_type: returnType
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(`Return request submitted successfully!\nRefund Amount: ₹${result.refund_amount}\nReturn ID: ${result.return_id}`);
            closeReturnModal();
            // Refresh orders list to show updated status
            loadUserOrders(userId);
        } else {
            alert(result.message || "Failed to submit return request");
        }
    } catch (error) {
        console.error("Error submitting return:", error);
        alert("Failed to submit return request. Please try again.");
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
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