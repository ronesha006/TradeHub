let cart =
    JSON.parse(localStorage.getItem("cart")) || [];

const cartContainer =
    document.getElementById("cart-items");

const totalDisplay =
    document.getElementById("total");


// ------------------------------
// DISPLAY CART ITEMS
// ------------------------------

function displayCart() {

    cartContainer.innerHTML = "";

    let total = 0;

    cart.forEach((item, index) => {

        // Convert price to number
        let price =
            parseFloat(item.Current_Price);

        let quantity =
            item.quantity;

        total += price * quantity;

        const cartItem = `
            <div class="cart-item">

                <div>

                    <h3>
                        ${item.Product_Name}
                    </h3>

                    <p>
                        ₹${price} x ${quantity}
                    </p>

                </div>

                <div class="cart-actions">

                    <button onclick="increaseQty(${index})">
                        +
                    </button>

                    <button onclick="decreaseQty(${index})">
                        -
                    </button>

                    <button onclick="removeItem(${index})">
                        Remove
                    </button>

                </div>

            </div>
        `;

        cartContainer.innerHTML += cartItem;

    });

    totalDisplay.innerText =
        total.toFixed(2);

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

    }

    else {

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

    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );

    displayCart();

}


// ------------------------------
// CHECKOUT BUTTON
// ------------------------------

async function goToCheckout() {

    if (cart.length === 0) {

        alert("Cart is empty!");
        return;

    }

    try {

        const response =
            await fetch(
                "http://127.0.0.1:5000/create-order",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                        "application/json"
                    },

                    body: JSON.stringify({
                        cart: cart
                    })

                }
            );

        const result =
            await response.json();

        alert(
            "Order placed successfully! Order ID: "
            + result.order_id
        );

        // Clear cart
        cart = [];

        localStorage.removeItem("cart");

        displayCart();

    }

    catch (error) {

        console.error(error);

        alert("Order failed!");

    }

}


// Load cart on page open
displayCart();