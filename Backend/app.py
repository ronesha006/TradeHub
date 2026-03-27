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
            Category.Category_Name
        FROM Product
        JOIN Category
        ON Product.Category_ID = Category.Category_ID
    """

    cursor.execute(query)

    products = cursor.fetchall()

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
                (Seller_ID, User_ID, Business_Name)
                VALUES (%s, %s, %s)
            """, (seller_id, user_id, business_name))

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
            "user_type": user['User_Type']
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
                DATE_FORMAT(o.Order_Date, '%%Y-%%m-%%d') as Order_Date_Formatted
            FROM Orders o
            WHERE o.Customer_ID = %s
            ORDER BY o.Order_ID DESC
        """
        
        cursor.execute(query, (customer_id,))
        orders = cursor.fetchall()
        
        print(f"Found {len(orders)} orders")
        
        # Get items for each order
        for order in orders:
            items_query = """
                SELECT 
                    oi.Order_Item_ID,
                    oi.Quantity,
                    oi.Price_At_Purchase,
                    p.Product_ID,
                    p.Product_Name,
                    c.Category_Name
                FROM Order_Item oi
                JOIN Product p ON oi.Product_ID = p.Product_ID
                JOIN Category c ON p.Category_ID = c.Category_ID
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
# RUN SERVER
# ------------------------------

if __name__ == '__main__':
    app.run(debug=True)