async function loadOrders() {

    try {

        const response =
            await fetch(
                "http://127.0.0.1:5000/orders"
            );

        const data =
            await response.json();

        console.log("Orders:", data);

        displayOrders(data);

    }

    catch (error) {

        console.error(error);

        document.getElementById(
            "orders-container"
        ).innerHTML =
        "Failed to load orders.";

    }

}


function displayOrders(orders) {

    const container =
        document.getElementById(
            "orders-container"
        );

    container.innerHTML = "";

    if (orders.length === 0) {

        container.innerHTML =
            "<p>No orders found.</p>";

        return;

    }

    let currentOrderId = null;
    let orderDiv = null;

    orders.forEach(order => {

        // New order block
        if (currentOrderId !== order.Order_ID) {

            currentOrderId =
                order.Order_ID;

            orderDiv =
                document.createElement("div");

            orderDiv.className =
                "order-box";

            orderDiv.innerHTML = `
                <h3>
                    Order #${order.Order_ID}
                </h3>

                <p>
                    Date:
                    ${order.Order_Date}
                </p>

                <p>
                    Status:
                    ${order.Order_Status}
                </p>

                <div class="items"></div>

                <p>
                    Total:
                    ₹${order.Total_Amount}
                </p>

                <hr>
            `;

            container.appendChild(orderDiv);

        }

        // Add items
        const itemsDiv =
            orderDiv.querySelector(
                ".items"
            );

        itemsDiv.innerHTML += `
            <p>
                ${order.Product_Name}
                × ${order.Quantity}
            </p>
        `;

    });

}


loadOrders();