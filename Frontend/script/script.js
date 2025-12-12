document.addEventListener("DOMContentLoaded", () => {
    const usernameInput = document.getElementById("username");

    const employeeIcon = document.querySelector(".employee-icon");
    const hodIcon = document.querySelector(".hod-icon");
    const adminIcon = document.querySelector(".admin-icon");
    const superAdminIcon = document.querySelector(".superadmin-icon");

    function hideAllIcons() {
        employeeIcon.classList.remove("show");
        hodIcon.classList.remove("show");
        adminIcon.classList.remove("show");
        superAdminIcon.classList.remove("show");
    }

    hideAllIcons();

    usernameInput.addEventListener("input", () => {
        const value = usernameInput.value.trim().toLowerCase();
        hideAllIcons(); // hide everything first

        if (value.startsWith("e-")) {
            employeeIcon.classList.add("show");
        } 
        else if (value.startsWith("h-")) {
            hodIcon.classList.add("show");
        } 
        else if (value.startsWith("a-")) {
            adminIcon.classList.add("show");
        } 
        else if (value.startsWith("s-")) {
            superAdminIcon.classList.add("show");
        }
    });
});
