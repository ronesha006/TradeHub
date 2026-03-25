let cart = JSON.parse(localStorage.getItem("cart")) || [];

const cartContainer = document.getElementById("cart-items");
const totalElement = document.getElementById("total");

function renderCart() {
    cartContainer.innerHTML = "";
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price * item.quantity;

        const div = document.createElement("div");

        div.style = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 10px;
        `;

        div.innerHTML = `
            <div>
                <h3>${item.name}</h3>
                <p>$${item.price} x ${item.quantity}</p>
            </div>

            <div>
                <button onclick="increaseQty(${index})">+</button>
                <button onclick="decreaseQty(${index})">-</button>
                <button onclick="removeItem(${index})">Remove</button>
            </div>
        `;

        cartContainer.appendChild(div);
    });

    totalElement.innerText = total.toFixed(2);
}

function increaseQty(index) {
    cart[index].quantity += 1;
    updateCart();
}

function decreaseQty(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity -= 1;
    } else {
        cart.splice(index, 1);
    }
    updateCart();
}

function removeItem(index) {
    cart.splice(index, 1);
    updateCart();
}

function updateCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
    renderCart();
}

function goToCheckout() {
    window.location.href = "checkout.html";
}

// Initial render
renderCart();