document.getElementById("registerForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const phone = document.getElementById("phone").value;
    const businessName = document.getElementById("businessName").value;
    const gstNo = document.getElementById("gstNo").value;

    // Validate Password
    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:5000/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password,
                phone,
                userType,
                businessName,
                gstNo  // Add GST number to request
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert("Registered Successfully!");
            window.location.href = "login.html";
        } else {
            alert(result.message || "Registration failed");
        }
    } catch (error) {
        console.error(error);
        alert("Registration failed!");
    }
});