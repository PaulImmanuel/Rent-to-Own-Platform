function validateSignupForm() {
    const name = document.forms["signupForm"]["name"].value;
    const email = document.forms["signupForm"]["email"].value;
    const phone = document.forms["signupForm"]["phone"].value;
    const password = document.forms["signupForm"]["password"].value;

    if (name === "" || email === "" || phone === "" || password === "") {
        alert("All fields must be filled out");
        return false;
    }

    if (phone.length < 10) {
        alert("Phone number must be at least 10 digits");
        return false;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters long");
        return false;
    }

    return true;
}
