const products = [
    {
        id: 1,
        name: "Cashmere Blend Sweater",
        price: 129.99,
        image: "https://via.placeholder.com/300x400"
    },
    {
        id: 2,
        name: "Flowing Midi Dress",
        price: 189.99,
        image: "https://via.placeholder.com/300x400"
    }
];

let cart = JSON.parse(localStorage.getItem("cart")) || [];

function addToCart(productId) {
    const product = products.find(p => p.id === productId);

    const existing = cart.find(item => item.id === productId);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    alert("Added to cart!");
}