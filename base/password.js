/*
Password-related form fields and validation requirements.

This file contains:
- PasswordRequirement: Base class for password validation rules
- SimplePasswordRequirement: Basic length and complexity validation
- PasswordFormField: Password input with visibility toggle and optional confirmation matching
*/

import { randomID } from './widget.js';
import { BaseFormField } from './formfield.js';

class PasswordRequirement { /*//DOC
    Base class for password validation requirements.

    Subclasses implement specific password policies (length, complexity, entropy, etc.)
    */
    check(password) { /*//DOC
        Validates a password against this requirement.

        Arguments:
        password - The password string to validate

        Returns:
        {valid: boolean, error: string|null}
        - valid: true if password meets requirement, false otherwise
        - error: null if valid, error message string if invalid

        Subclasses must implement this method.
        */
        throw new Error("check() must be implemented by subclass");
    }
}

class SimplePasswordRequirement extends PasswordRequirement { /*//DOC
    Basic password requirement: minimum length of 8 characters.

    Future enhancements could add complexity checks (uppercase, lowercase, numbers, symbols).
    */
    constructor(minLength = 8) {
        super();
        this.minLength = minLength;
    }

    check(password) { /*//DOC
        Validates that password meets minimum length requirement.

        Returns:
        {valid: true, error: null} if password is long enough
        {valid: false, error: "message"} if password is too short
        */
        const str = String(password);

        if (str.length < this.minLength) {
            return {
                valid: false,
                error: `Password must be at least ${this.minLength} characters`
            };
        }

        return { valid: true, error: null };
    }
}

class PasswordFormField extends BaseFormField { /*//DOC
    A form field for password input with a visibility toggle button.

    Features:
    - Eye icon button to show/hide password
    - Optional friend parameter for password confirmation matching
    - Optional setRequirement() for password complexity requirements

    Example:
    const passwordField = new PasswordFormField("Password", "Enter your password")
        .setRequirement(new SimplePasswordRequirement());
    const confirmField = new PasswordFormField("Confirm Password", "Re-enter password", {friend: passwordField});
    */
    constructor(label, help = undefined, options = {}) {
        super(label, help);
        this.friend = options.friend || null;  // optional friend field for matching
        this.requirement = null;  // optional PasswordRequirement instance
        this.toggleButton = null;
        this.isVisible = false;
    }

    setRequirement(requirement) { /*//DOC
        Sets a password requirement for validation.

        Arguments:
        requirement - A PasswordRequirement instance (e.g., SimplePasswordRequirement)

        Returns:
        this (for method chaining)

        Example:
        passwordField.setRequirement(new SimplePasswordRequirement(10))
        */
        this.requirement = requirement;
        return this;  // Enable method chaining
    }

    createElement(unique_name) { /*//DOC
        Creates an HTML password input field with a visibility toggle button.
        */
        let uniquename = unique_name + "-" + randomID();
        let buttonId = randomID();
        this.element = document.createElement("div");
        this.element.classList.add("mb-3");

        var line = `
        <label for="${uniquename}" class="form-label">${this.label}</label>
        <div class="input-group has-validation">
            <input type="password" class="form-control" id="${uniquename}">
            <button class="btn btn-outline-secondary" type="button" id="${buttonId}">
                <i class="bi bi-eye-slash"></i>
            </button>
            <div class="valid-feedback">ok!</div>
            <div class="invalid-feedback"></div>
        </div>
        `;

        if (this.help != undefined) {
            line += `
            <div class="form-text">${this.help}</div>
            `;
        }

        this.element.innerHTML = line;

        this.input = this.element.getElementsByTagName("input").item(0);
        this.valid_msg = this.element.getElementsByClassName("valid-feedback").item(0);
        this.toggleButton = this.element.querySelector(`#${buttonId}`);

        // Setup toggle button click handler
        this.toggleButton.onclick = () => {
            this.isVisible = !this.isVisible;
            if (this.isVisible) {
                // Password is now visible - show open eye
                this.input.type = "text";
                this.toggleButton.innerHTML = '<i class="bi bi-eye"></i>';
            } else {
                // Password is now hidden - show closed/slashed eye
                this.input.type = "password";
                this.toggleButton.innerHTML = '<i class="bi bi-eye-slash"></i>';
            }
        };

        // Clear validation warnings when user starts typing
        this.input.addEventListener("input", () => {
            this.clearWarnings();
        });
    }

    check(value) { /*//DOC
        Validates the password field.

        Validation steps:
        1. Check if password is empty
        2. If requirement is set, check against it
        3. If friend field exists, check that passwords match

        Returns:
        {value: string, error: null} if valid
        {value: null, error: "error message"} if invalid
        */
        const str = String(value);

        // Check if empty
        if (str.length < 1) {
            return { value: null, error: "Password cannot be empty" };
        }

        // Check against requirement if set
        if (this.requirement != null) {
            const reqResult = this.requirement.check(str);
            if (!reqResult.valid) {
                return { value: null, error: reqResult.error };
            }
        }

        // If this field has a friend, check that they match
        if (this.friend != null) {
            const friendValue = this.friend.input.value;
            if (str !== friendValue) {
                return { value: null, error: "Passwords do not match" };
            }
        }

        return { value: str, error: null };
    }
}

export { PasswordRequirement, SimplePasswordRequirement, PasswordFormField };
