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

@app.route('/create-order', methods=['POST'])
def create_order():

    data = request.json
    cart_items = data["cart"]

    conn = get_db_connection()
    cursor = conn.cursor()

    customer_id = 1

    # ------------------------------
    # GENERATE NEW ORDER_ID
    # ------------------------------

    cursor.execute(
        "SELECT MAX(Order_ID) FROM Orders"
    )

    result = cursor.fetchone()

    if result[0] is None:
        order_id = 1
    else:
        order_id = result[0] + 1


    # ------------------------------
    # CALCULATE TOTAL
    # ------------------------------

    total_amount = 0

    for item in cart_items:

        price = float(item["Current_Price"])
        quantity = item["quantity"]

        total_amount += price * quantity


    # ------------------------------
    # INSERT INTO Orders
    # ------------------------------

    order_query = """
        INSERT INTO Orders
        (
            Order_ID,
            Customer_ID,
            Order_Date,
            Order_Status,
            Total_Amount,
            Delivery_Address
        )

        VALUES
        (%s, %s, CURDATE(),
         'Shipped',
         %s,
         %s)
    """

    cursor.execute(
        order_query,
        (
            order_id,
            customer_id,
            total_amount,
            "Home"
        )
    )


    # ------------------------------
    # INSERT ORDER ITEMS
    # ------------------------------

    cursor.execute(
        "SELECT MAX(Order_Item_ID) FROM Order_Item"
    )

    result = cursor.fetchone()

    if result[0] is None:
        order_item_id = 1
    else:
        order_item_id = result[0] + 1


    item_query = """
        INSERT INTO Order_Item
        (
            Order_Item_ID,
            Order_ID,
            Product_ID,
            Quantity,
            Price_At_Purchase
        )

        VALUES (%s, %s, %s, %s, %s)
    """

    for item in cart_items:

        cursor.execute(
            item_query,
            (
                order_item_id,
                order_id,
                item["Product_ID"],
                item["quantity"],
                item["Current_Price"]
            )
        )

        order_item_id += 1


    conn.commit()

    cursor.close()
    conn.close()

    return {
        "message": "Order created successfully",
        "order_id": order_id
    }

# ------------------------------
# GET ORDERS WITH ITEMS
# ------------------------------

@app.route('/orders')
def get_orders():

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

        JOIN Order_Item oi
            ON o.Order_ID = oi.Order_ID

        JOIN Product p
            ON oi.Product_ID = p.Product_ID

        ORDER BY o.Order_ID DESC
    """

    cursor.execute(query)

    orders = cursor.fetchall()

    cursor.close()
    conn.close()

    return orders

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
        """, (
            user_id,
            name,
            email,
            password,
            phone,
            user_type
        ))

        # Customer
        if user_type == "C":

            cursor.execute(
                "SELECT MAX(Customer_ID) FROM Customer"
            )

            result = cursor.fetchone()

            if result[0] is None:
                customer_id = 1
            else:
                customer_id = result[0] + 1

            cursor.execute("""
            INSERT INTO Customer
            (Customer_ID, User_ID)
            VALUES (%s, %s)
            """, (
                customer_id,
                user_id
            ))

        # Seller
        elif user_type == "S":

            cursor.execute(
                "SELECT MAX(Seller_ID) FROM Seller"
            )

            result = cursor.fetchone()

            if result[0] is None:
                seller_id = 1
            else:
                seller_id = result[0] + 1

            cursor.execute("""
            INSERT INTO Seller
            (Seller_ID, User_ID, Business_Name)
            VALUES (%s, %s, %s)
            """, (
                seller_id,
                user_id,
                business_name
            ))

        conn.commit()

        cursor.close()
        conn.close()

        return {
            "message": "User registered"
        }

    except Exception as e:

        print("ERROR:", e)

        return {
            "message": "Registration failed"
        }, 500


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
        cursor = conn.cursor()

        query = """
        SELECT User_ID, Password
        FROM Users
        WHERE Email = %s
        """

        cursor.execute(query, (email,))
        user = cursor.fetchone()

        if user is None:

            return {
                "message":
                "User not found"
            }, 404

        user_id = user[0]
        stored_password = user[1]

        if password != stored_password:

            return {
                "message":
                "Incorrect password"
            }, 401

        cursor.close()
        conn.close()

        return {
            "message":
            "Login successful",
            "user_id":
            user_id
        }

    except Exception as e:

        print("LOGIN ERROR:", e)

        return {
            "message":
            "Login failed"
        }, 500

# ------------------------------
# RUN SERVER
# ------------------------------

if __name__ == '__main__':
    app.run(debug=True)