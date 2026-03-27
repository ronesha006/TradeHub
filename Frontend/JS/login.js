document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("http://127.0.0.1:5000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            alert("Login Successful!");
            localStorage.setItem("user_id", result.user_id);
            localStorage.setItem("user_type", result.user_type);
            
            // Redirect based on user type
            if (result.user_type === 'S') {
                window.location.href = "seller_dashboard.html";
            } else {
                window.location.href = "products.html";
            }
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error(error);
        alert("Login failed");
    }
});