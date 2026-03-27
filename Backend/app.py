from flask import Flask, jsonify
from flask_cors import CORS
from db import get_db_connection
from flask import request

app = Flask(__name__)
CORS(app)

# ------------------------------
# GET ALL PRODUCTS
# ------------------------------

@app.route('/products', methods=['GET'])
def get_products():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            Product.Product_ID,
            Product.Product_Name,
            Product.Current_Price,
            Product.Product_Image,  -- MAKE SURE THIS LINE IS HERE
            Category.Category_Name
        FROM Product
        JOIN Category
        ON Product.Category_ID = Category.Category_ID
    """

    cursor.execute(query)
    products = cursor.fetchall()
    
    # Debug: Print what's being sent
    print("=== SENDING PRODUCTS ===")
    for product in products[:5]:  # Print first 5
        print(f"ID: {product['Product_ID']}, Name: {product['Product_Name']}, Image: {product.get('Product_Image', 'NO IMAGE')}")
    
    cursor.close()
    conn.close()
    
    return jsonify(products)

# ------------------------------
# CREATE ORDER
# ------------------------------

# ------------------------------
# CREATE ORDER
# ------------------------------

@app.route('/create-order', methods=['POST'])
def create_order():
    try:
        data = request.json
        cart_items = data["cart"]
        
        # Get user_id from the request or from localStorage (sent from frontend)
        user_id = data.get("user_id")
        
        if not user_id:
            return jsonify({"message": "User not logged in"}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get customer_id from user_id
        cursor.execute("""
            SELECT Customer_ID 
            FROM Customer 
            WHERE User_ID = %s
        """, (user_id,))
        
        customer = cursor.fetchone()
        
        if not customer:
            cursor.close()
            conn.close()
            return jsonify({"message": "Customer not found"}), 404
        
        customer_id = customer['Customer_ID']
        
        # Generate new Order_ID
        cursor.execute("SELECT MAX(Order_ID) FROM Orders")
        result = cursor.fetchone()
        
        if result['MAX(Order_ID)'] is None:
            order_id = 1
        else:
            order_id = result['MAX(Order_ID)'] + 1
        
        # Calculate total amount
        total_amount = 0
        for item in cart_items:
            price = float(item["Current_Price"])
            quantity = item["quantity"]
            total_amount += price * quantity
        
        # Insert into Orders table
        order_query = """
            INSERT INTO Orders
            (Order_ID, Customer_ID, Order_Date, Order_Status, Total_Amount, Delivery_Address)
            VALUES (%s, %s, CURDATE(), 'Shipped', %s, %s)
        """
        
        cursor.execute(order_query, (order_id, customer_id, total_amount, "Home"))
        
        # Generate Order_Item_ID
        cursor.execute("SELECT MAX(Order_Item_ID) FROM Order_Item")
        result = cursor.fetchone()
        
        if result['MAX(Order_Item_ID)'] is None:
            order_item_id = 1
        else:
            order_item_id = result['MAX(Order_Item_ID)'] + 1
        
        # Insert order items
        item_query = """
            INSERT INTO Order_Item
            (Order_Item_ID, Order_ID, Product_ID, Quantity, Price_At_Purchase)
            VALUES (%s, %s, %s, %s, %s)
        """
        
        for item in cart_items:
            cursor.execute(item_query, (
                order_item_id,
                order_id,
                item["Product_ID"],
                item["quantity"],
                item["Current_Price"]
            ))
            order_item_id += 1
        
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "message": "Order created successfully",
            "order_id": order_id,
            "customer_id": customer_id
        })
        
    except Exception as e:
        print("Error creating order:", e)
        return jsonify({"message": "Order creation failed", "error": str(e)}), 500
    
# ------------------------------
# GET ORDERS WITH ITEMS
# ------------------------------

# ------------------------------
# GET ORDERS WITH ITEMS
# ------------------------------

@app.route('/orders', methods=['GET'])
def get_orders():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT
                o.Order_ID,
                o.Order_Date,
                o.Order_Status,
                o.Total_Amount,
                oi.Quantity,
                oi.Price_At_Purchase,
                p.Product_Name
            FROM Orders o
            JOIN Order_Item oi ON o.Order_ID = oi.Order_ID
            JOIN Product p ON oi.Product_ID = p.Product_ID
            ORDER BY o.Order_ID DESC
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(results)
        
    except Exception as e:
        print("Error fetching orders:", e)
        return jsonify({"error": str(e)}), 500

# ------------------------------
# REGISTER USER
# ------------------------------

@app.route('/register', methods=['POST'])
def register_user():
    try:
        data = request.json
        print("Received:", data)

        name = data["name"]
        email = data["email"]
        password = data["password"]
        phone = data["phone"]
        user_type = data["userType"]
        business_name = data.get("businessName")
        gst_no = data.get("gstNo")  # Get GST number

        conn = get_db_connection()
        cursor = conn.cursor()

        # Generate User_ID
        cursor.execute("SELECT MAX(User_ID) FROM Users")
        result = cursor.fetchone()
        
        if result[0] is None:
            user_id = 1
        else:
            user_id = result[0] + 1

        # Insert into Users
        cursor.execute("""
            INSERT INTO Users
            (User_ID, Name, Email, Password, Phone, User_Type)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (user_id, name, email, password, phone, user_type))

        # Customer
        if user_type == "C":
            cursor.execute("SELECT MAX(Customer_ID) FROM Customer")
            result = cursor.fetchone()
            
            if result[0] is None:
                customer_id = 1
            else:
                customer_id = result[0] + 1

            cursor.execute("""
                INSERT INTO Customer
                (Customer_ID, User_ID)
                VALUES (%s, %s)
            """, (customer_id, user_id))

        # Seller
        elif user_type == "S":
            cursor.execute("SELECT MAX(Seller_ID) FROM Seller")
            result = cursor.fetchone()
            
            if result[0] is None:
                seller_id = 1
            else:
                seller_id = result[0] + 1

            cursor.execute("""
                INSERT INTO Seller
                (Seller_ID, User_ID, Business_Name, GST_NO)
                VALUES (%s, %s, %s, %s)
            """, (seller_id, user_id, business_name, gst_no))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "User registered successfully", "user_id": user_id})

    except Exception as e:
        print("ERROR in registration:", e)
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Registration failed", "error": str(e)}), 500


# ------------------------------
# LOGIN USER
# ------------------------------

@app.route('/login', methods=['POST'])
def login_user():
    try:
        data = request.json
        email = data["email"]
        password = data["password"]
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT User_ID, Name, Email, Password, User_Type
            FROM Users
            WHERE Email = %s
        """
        
        cursor.execute(query, (email,))
        user = cursor.fetchone()
        
        if user is None:
            return jsonify({"message": "User not found"}), 404
        
        # In production, you should use password hashing
        if password != user['Password']:
            return jsonify({"message": "Incorrect password"}), 401
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "message": "Login successful",
            "user_id": user['User_ID'],
            "name": user['Name'],
            "user_type": user['User_Type']  # This is important
        })
        
    except Exception as e:
        print("LOGIN ERROR:", e)
        return jsonify({"message": "Login failed"}), 500

# ------------------------------
# GET CATEGORIES
# ------------------------------

@app.route('/categories', methods=['GET'])
def get_categories():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    query = """
        SELECT Category_ID, Category_Name
        FROM Category
        ORDER BY Category_Name
    """
    
    cursor.execute(query)
    categories = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return jsonify(categories)

# ------------------------------
# GET PRODUCTS WITH FILTERS
# ------------------------------

@app.route('/products/filter', methods=['POST'])
def filter_products():
    try:
        data = request.json
        categories = data.get('categories', [])
        min_price = data.get('min_price')
        max_price = data.get('max_price')
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT 
                Product.Product_ID,
                Product.Product_Name,
                Product.Current_Price,
                Category.Category_Name
            FROM Product
            JOIN Category ON Product.Category_ID = Category.Category_ID
            WHERE 1=1
        """
        
        params = []
        
        if categories and len(categories) > 0:
            placeholders = ','.join(['%s'] * len(categories))
            query += f" AND Category.Category_Name IN ({placeholders})"
            params.extend(categories)
        
        if min_price is not None:
            query += " AND Product.Current_Price >= %s"
            params.append(min_price)
        
        if max_price is not None:
            query += " AND Product.Current_Price <= %s"
            params.append(max_price)
        
        query += " ORDER BY Product.Product_Name"
        
        cursor.execute(query, params)
        products = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(products)
        
    except Exception as e:
        print("Error filtering products:", e)
        return jsonify({"error": str(e)}), 500
    

# ------------------------------
# GET USER DETAILS BY USER_ID
# ------------------------------

# ------------------------------
# GET USER DETAILS BY USER_ID
# ------------------------------

@app.route('/user/<int:user_id>', methods=['GET'])
def get_user_details(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get user details from Users table
        query = """
            SELECT 
                u.User_ID,
                u.Name,
                u.Email,
                u.Phone,
                u.User_Type
            FROM Users u
            WHERE u.User_ID = %s
        """
        
        cursor.execute(query, (user_id,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if user:
            return jsonify(user)
        else:
            return jsonify({"error": "User not found"}), 404
            
    except Exception as e:
        print("Error fetching user details:", e)
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ------------------------------
# GET USER ORDERS WITH ITEMS
# ------------------------------

# ------------------------------
# GET USER ORDERS WITH ITEMS
# ------------------------------

@app.route('/user-orders/<int:user_id>', methods=['GET'])
def get_user_orders(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # First get customer_id from user_id
        cursor.execute("""
            SELECT Customer_ID, User_ID 
            FROM Customer 
            WHERE User_ID = %s
        """, (user_id,))
        
        customer = cursor.fetchone()
        
        if not customer:
            cursor.close()
            conn.close()
            return jsonify([])
        
        customer_id = customer['Customer_ID']
        print(f"Fetching orders for Customer_ID: {customer_id}")
        
        # Get all orders for this customer
        query = """
            SELECT 
                o.Order_ID,
                o.Order_Date,
                o.Order_Status,
                o.Total_Amount,
                o.Delivery_Address,
                DATE_FORMAT(o.Order_Date, '%Y-%m-%d') as Order_Date_Formatted
            FROM Orders o
            WHERE o.Customer_ID = %s
            ORDER BY o.Order_ID DESC
        """
        
        cursor.execute(query, (customer_id,))
        orders = cursor.fetchall()
        
        print(f"Found {len(orders)} orders")
        
        # Get items for each order - INCLUDING return status
        for order in orders:
            items_query = """
                SELECT 
                    oi.Order_Item_ID,
                    oi.Quantity,
                    oi.Price_At_Purchase,
                    p.Product_ID,
                    p.Product_Name,
                    p.Product_Image,
                    c.Category_Name,
                    rr.Return_Status,
                    rr.Return_reason,
                    rr.Request_Date,
                    rr.Decision_Date
                FROM Order_Item oi
                JOIN Product p ON oi.Product_ID = p.Product_ID
                JOIN Category c ON p.Category_ID = c.Category_ID
                LEFT JOIN Return_Request rr ON oi.Order_Item_ID = rr.Order_Item_ID
                WHERE oi.Order_ID = %s
            """
            cursor.execute(items_query, (order['Order_ID'],))
            order['items'] = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(orders)
        
    except Exception as e:
        print("Error fetching user orders:", e)
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ------------------------------
# REQUEST RETURN
# ------------------------------

@app.route('/request-return', methods=['POST'])
def request_return():
    try:
        data = request.json
        order_id = data['order_id']
        user_id = data['user_id']
        reason = data.get('reason', 'Customer request')
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if order exists and belongs to user
        cursor.execute("""
            SELECT o.Order_ID, o.Order_Status
            FROM Orders o
            JOIN Customer c ON o.Customer_ID = c.Customer_ID
            WHERE o.Order_ID = %s AND c.User_ID = %s
        """, (order_id, user_id))
        
        order = cursor.fetchone()
        
        if not order:
            cursor.close()
            conn.close()
            return jsonify({"message": "Order not found"}), 404
        
        if order['Order_Status'] != 'Delivered':
            cursor.close()
            conn.close()
            return jsonify({"message": "Order can only be returned after delivery"}), 400
        
        # Update order status to Return Requested
        cursor.execute("""
            UPDATE Orders
            SET Order_Status = 'Return Requested'
            WHERE Order_ID = %s
        """, (order_id,))
        
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "message": "Return request submitted successfully",
            "order_id": order_id,
            "status": "Return Requested"
        })
        
    except Exception as e:
        print("Error processing return:", e)
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Failed to process return", "error": str(e)}), 500

# ------------------------------
# GET ORDER DETAILS FOR RETURN
# ------------------------------

@app.route('/order-details/<int:order_id>', methods=['GET'])
def get_order_details(order_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get order details
        query = """
            SELECT 
                o.Order_ID,
                o.Order_Date,
                o.Order_Status,
                o.Total_Amount,
                o.Delivery_Address
            FROM Orders o
            WHERE o.Order_ID = %s
        """
        cursor.execute(query, (order_id,))
        order = cursor.fetchone()
        
        if not order:
            return jsonify({"error": "Order not found"}), 404
        
        # Get order items
        items_query = """
            SELECT 
                oi.Order_Item_ID,
                oi.Quantity,
                oi.Price_At_Purchase,
                p.Product_ID,
                p.Product_Name,
                p.Product_Image,
                c.Category_Name
            FROM Order_Item oi
            JOIN Product p ON oi.Product_ID = p.Product_ID
            JOIN Category c ON p.Category_ID = c.Category_ID
            WHERE oi.Order_ID = %s
        """
        cursor.execute(items_query, (order_id,))
        order['items'] = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(order)
        
    except Exception as e:
        print("Error fetching order details:", e)
        return jsonify({"error": str(e)}), 500

# ------------------------------
# SUBMIT RETURN REQUEST
# ------------------------------

@app.route('/submit-return', methods=['POST'])
def submit_return():
    try:
        data = request.json
        order_item_id = data['order_item_id']
        user_id = data['user_id']
        return_reason = data['return_reason']
        return_reason_detail = data.get('return_reason_detail', '')
        return_type = data.get('return_type', 'full_refund')
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verify that the order item belongs to the user
        cursor.execute("""
            SELECT 
                oi.Order_Item_ID,
                oi.Order_ID,
                oi.Quantity,
                oi.Price_At_Purchase,
                p.Product_Name,
                o.Order_Status
            FROM Order_Item oi
            JOIN Orders o ON oi.Order_ID = o.Order_ID
            JOIN Customer c ON o.Customer_ID = c.Customer_ID
            JOIN Product p ON oi.Product_ID = p.Product_ID
            WHERE oi.Order_Item_ID = %s AND c.User_ID = %s
        """, (order_item_id, user_id))
        
        order_item = cursor.fetchone()
        
        if not order_item:
            return jsonify({"message": "Order item not found"}), 404
        
        if order_item['Order_Status'] != 'Delivered':
            return jsonify({"message": "Return can only be requested for delivered orders"}), 400
        
        # Check if return already requested for this order item
        cursor.execute("""
            SELECT Return_ID, Return_Status 
            FROM Return_Request 
            WHERE Order_Item_ID = %s
        """, (order_item_id,))
        
        existing_return = cursor.fetchone()
        
        if existing_return:
            return jsonify({"message": f"Return already requested with status: {existing_return['Return_Status']}"}), 400
        
        # Generate Return_ID
        cursor.execute("SELECT MAX(Return_ID) FROM Return_Request")
        result = cursor.fetchone()
        
        if result['MAX(Return_ID)'] is None:
            return_id = 1
        else:
            return_id = result['MAX(Return_ID)'] + 1
        
        # Calculate refund amount based on return type
        refund_amount = order_item['Price_At_Purchase'] * order_item['Quantity']
        
        # Insert into Return_Request
        cursor.execute("""
            INSERT INTO Return_Request 
            (Return_ID, Order_Item_ID, Return_reason, Return_Status, Request_Date, Decision_Date)
            VALUES (%s, %s, %s, 'Requested', CURDATE(), NULL)
        """, (return_id, order_item_id, return_reason))
        
        # Insert into Refund
        cursor.execute("SELECT MAX(Refund_ID) FROM Refund")
        result = cursor.fetchone()
        
        if result['MAX(Refund_ID)'] is None:
            refund_id = 1
        else:
            refund_id = result['MAX(Refund_ID)'] + 1
        
        cursor.execute("""
            INSERT INTO Refund 
            (Refund_ID, Return_ID, Refund_Amount, Refund_Status)
            VALUES (%s, %s, %s, 'Pending')
        """, (refund_id, return_id, refund_amount))
        
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "message": "Return request submitted successfully",
            "return_id": return_id,
            "refund_amount": refund_amount,
            "status": "Requested"
        })
        
    except Exception as e:
        print("Error submitting return:", e)
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Failed to submit return request", "error": str(e)}), 500

# ------------------------------
# GET RETURN STATUS FOR ORDER
# ------------------------------

@app.route('/return-status/<int:order_id>', methods=['GET'])
def get_return_status(order_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT 
                rr.Return_ID,
                rr.Return_reason,
                rr.Return_Status,
                rr.Request_Date,
                rr.Decision_Date,
                rf.Refund_Amount,
                rf.Refund_Status,
                oi.Order_Item_ID,
                p.Product_Name,
                oi.Quantity,
                oi.Price_At_Purchase
            FROM Return_Request rr
            JOIN Order_Item oi ON rr.Order_Item_ID = oi.Order_Item_ID
            JOIN Product p ON oi.Product_ID = p.Product_ID
            LEFT JOIN Refund rf ON rr.Return_ID = rf.Return_ID
            WHERE oi.Order_ID = %s
        """
        cursor.execute(query, (order_id,))
        returns = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(returns)
        
    except Exception as e:
        print("Error fetching return status:", e)
        return jsonify({"error": str(e)}), 500

# ------------------------------
# SELLER DASHBOARD ENDPOINTS
# ------------------------------

# ------------------------------
# GET SELLER DETAILS
# ------------------------------

@app.route('/seller-details/<int:user_id>', methods=['GET'])
def get_seller_details(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # First, check if the user exists and is a seller
        cursor.execute("SELECT User_ID, User_Type FROM Users WHERE User_ID = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            conn.close()
            return jsonify({"error": "User not found"}), 404
        
        if user['User_Type'] != 'S':
            cursor.close()
            conn.close()
            return jsonify({"error": "User is not a seller"}), 403
        
        # Get seller details
        query = """
            SELECT 
                s.Seller_ID,
                s.GST_NO,
                s.Business_Name,
                s.Seller_Rating,
                u.User_ID,
                u.Name,
                u.Email,
                u.Phone
            FROM Seller s
            JOIN Users u ON s.User_ID = u.User_ID
            WHERE u.User_ID = %s
        """
        cursor.execute(query, (user_id,))
        seller = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if seller:
            print(f"Seller found: {seller}")  # Debug log
            return jsonify(seller)
        else:
            print(f"No seller record found for user_id: {user_id}")  # Debug log
            return jsonify({"error": "Seller record not found"}), 404
            
    except Exception as e:
        print("Error fetching seller details:", e)
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# Get seller's products
@app.route('/seller-products/<int:seller_id>', methods=['GET'])
def get_seller_products(seller_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT 
                p.Product_ID,
                p.Product_Name,
                p.Current_Price,
                p.Product_Image,
                c.Category_Name,
                i.Stock_Quantity
            FROM Product p
            JOIN Category c ON p.Category_ID = c.Category_ID
            LEFT JOIN Inventory i ON p.Inventory_ID = i.Inventory_ID
            WHERE p.Seller_ID = %s
            ORDER BY p.Product_ID DESC
        """
        cursor.execute(query, (seller_id,))
        products = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(products)
        
    except Exception as e:
        print("Error fetching seller products:", e)
        return jsonify({"error": str(e)}), 500

# Get seller's orders
@app.route('/seller-orders/<int:seller_id>', methods=['GET'])
def get_seller_orders(seller_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT 
                o.Order_ID,
                o.Order_Date,
                o.Order_Status,
                o.Total_Amount,
                o.Delivery_Address,
                oi.Quantity,
                oi.Price_At_Purchase,
                p.Product_Name,
                u.Name as Customer_Name
            FROM Orders o
            JOIN Order_Item oi ON o.Order_ID = oi.Order_ID
            JOIN Product p ON oi.Product_ID = p.Product_ID
            JOIN Customer c ON o.Customer_ID = c.Customer_ID
            JOIN Users u ON c.User_ID = u.User_ID
            WHERE p.Seller_ID = %s
            ORDER BY o.Order_ID DESC
        """
        cursor.execute(query, (seller_id,))
        orders = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(orders)
        
    except Exception as e:
        print("Error fetching seller orders:", e)
        return jsonify({"error": str(e)}), 500

# Get return requests for seller
@app.route('/seller-returns/<int:seller_id>', methods=['GET'])
def get_seller_returns(seller_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT 
                rr.Return_ID,
                rr.Order_Item_ID,
                rr.Return_reason,
                rr.Return_reason_detail,
                rr.Return_Status,
                rr.Request_Date,
                rr.Decision_Date,
                rf.Refund_Amount,
                o.Order_ID,
                p.Product_Name,
                oi.Quantity,
                u.Name as Customer_Name
            FROM Return_Request rr
            JOIN Order_Item oi ON rr.Order_Item_ID = oi.Order_Item_ID
            JOIN Orders o ON oi.Order_ID = o.Order_ID
            JOIN Product p ON oi.Product_ID = p.Product_ID
            JOIN Customer c ON o.Customer_ID = c.Customer_ID
            JOIN Users u ON c.User_ID = u.User_ID
            LEFT JOIN Refund rf ON rr.Return_ID = rf.Return_ID
            WHERE p.Seller_ID = %s
            ORDER BY rr.Request_Date DESC
        """
        cursor.execute(query, (seller_id,))
        returns = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(returns)
        
    except Exception as e:
        print("Error fetching seller returns:", e)
        return jsonify({"error": str(e)}), 500

# Add new product
@app.route('/add-product', methods=['POST'])
def add_product():
    try:
        data = request.json
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Generate Product_ID
        cursor.execute("SELECT MAX(Product_ID) FROM Product")
        result = cursor.fetchone()
        
        if result['MAX(Product_ID)'] is None:
            product_id = 1
        else:
            product_id = result['MAX(Product_ID)'] + 1
        
        # Create inventory entry
        cursor.execute("SELECT MAX(Inventory_ID) FROM Inventory")
        result = cursor.fetchone()
        
        if result['MAX(Inventory_ID)'] is None:
            inventory_id = 1
        else:
            inventory_id = result['MAX(Inventory_ID)'] + 1
        
        cursor.execute("""
            INSERT INTO Inventory (Inventory_ID, Stock_Quantity, Last_Updated, Storage_Location)
            VALUES (%s, %s, CURDATE(), %s)
        """, (inventory_id, data['stock_quantity'], data['storage_location']))
        
        # Insert product
        cursor.execute("""
            INSERT INTO Product 
            (Product_ID, Seller_ID, Category_ID, Inventory_ID, Product_Name, Current_Price, Product_Image)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (product_id, data['seller_id'], data['category_id'], inventory_id, 
              data['product_name'], data['current_price'], data['product_image']))
        
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({"message": "Product added successfully", "product_id": product_id})
        
    except Exception as e:
        print("Error adding product:", e)
        return jsonify({"message": "Failed to add product", "error": str(e)}), 500

# Update order status
@app.route('/update-order-status', methods=['POST'])
def update_order_status():
    try:
        data = request.json
        order_id = data['order_id']
        new_status = data['status']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE Orders 
            SET Order_Status = %s 
            WHERE Order_ID = %s
        """, (new_status, order_id))
        
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({"message": f"Order status updated to {new_status}"})
        
    except Exception as e:
        print("Error updating order status:", e)
        return jsonify({"message": "Failed to update order status"}), 500

# Process return request
@app.route('/process-return', methods=['POST'])
def process_return():
    try:
        data = request.json
        return_id = data['return_id']
        status = data['status']
        action = data['action']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update return status
        cursor.execute("""
            UPDATE Return_Request 
            SET Return_Status = %s, Decision_Date = CURDATE()
            WHERE Return_ID = %s
        """, (status, return_id))
        
        # If approved or received, update refund status
        if status in ['Approved', 'Received']:
            cursor.execute("""
                UPDATE Refund 
                SET Refund_Status = 'Refunded'
                WHERE Return_ID = %s
            """, (return_id,))
            
            # If return is approved, update order item status (optional)
            if status == 'Approved':
                cursor.execute("""
                    UPDATE Orders o
                    JOIN Order_Item oi ON o.Order_ID = oi.Order_ID
                    JOIN Return_Request rr ON oi.Order_Item_ID = rr.Order_Item_ID
                    SET o.Order_Status = 'Return Approved'
                    WHERE rr.Return_ID = %s
                """, (return_id,))
        
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({"message": f"Return {action} successfully"})
        
    except Exception as e:
        print("Error processing return:", e)
        return jsonify({"message": "Failed to process return"}), 500

# ------------------------------
# RUN SERVER
# ------------------------------

if __name__ == '__main__':
    app.run(debug=True)