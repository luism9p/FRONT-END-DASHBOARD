/**
 * api.js — Centralized API service layer
 * All fetch calls go through here with JWT headers and error handling.
 */

const API = (function () {
    'use strict';

    const BASE_URL = 'http://localhost:3000/api';

    function getToken() {
        return localStorage.getItem('token');
    }

    function authHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        };
    }

    function handleAuthError() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.replace('login.html');
    }

    /**
     * Generic request wrapper
     */
    async function request(method, endpoint, body = null) {
        const options = {
            method,
            headers: authHeaders(),
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, options);

            if (response.status === 401 || response.status === 403) {
                handleAuthError();
                return null;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('No se pudo conectar al servidor.');
            }
            throw error;
        }
    }

    return {
        get: (endpoint) => request('GET', endpoint),
        post: (endpoint, body) => request('POST', endpoint, body),
        put: (endpoint, body) => request('PUT', endpoint, body),
        patch: (endpoint, body) => request('PATCH', endpoint, body),
        delete: (endpoint) => request('DELETE', endpoint),
    };
})();
