import React from "react";



const Footer = ({ currentTheme }) => {

    return (

        <footer className={`py-3 text-center border-top mt-auto ${currentTheme === "dark" ? "bg-dark text-secondary border-secondary" : "bg-light text-muted"}`} style={{ fontFamily: 'inherit' }}>

            <div className="container">

                <p className="m-0 small fw-medium" style={{ opacity: 0.8 }}>

                    © 2025 <span className="text-primary">Aaryans File Management System</span>  • Departmental Management Console

                </p>

            </div>

        </footer>

    );

};

export default Footer;