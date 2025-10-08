// js/auth.js

// This script runs on teacher-only pages to check for a valid login.
// If not logged in, it redirects to the faculty login page.

const loggedInFaculty = JSON.parse(sessionStorage.getItem('loggedInFaculty'));

if (!loggedInFaculty || !loggedInFaculty.id) {
    // No valid login found, redirect to the login page.
    window.location.href = 'faculty.html';
}