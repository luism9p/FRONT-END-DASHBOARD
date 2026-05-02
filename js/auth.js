document.addEventListener('DOMContentLoaded', () => {
    // 1. Seleccionamos los elementos exactos de tu HTML
    const loginForm = document.getElementById('loginForm'); 
    const loginError = document.getElementById('loginError');
    const loginErrorText = document.getElementById('loginErrorText');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginSpinner = document.getElementById('loginSpinner');
    
    // Ocultar el error por defecto al cargar
    if(loginError) loginError.style.display = 'none';

    // 2. Escuchamos el envío del formulario
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            // ¡ESTO ES LO QUE DETIENE LA RECARGA!
            e.preventDefault(); 

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // UI: Cambiamos el botón al estado de "Cargando..."
            if (loginBtnText) loginBtnText.style.display = 'none';
            if (loginSpinner) loginSpinner.style.display = 'inline-block';
            if (loginError) loginError.style.display = 'none';

            try {
                // Llamamos a la API de Elías
                const response = await fetch('http://localhost:3000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // ¡Login exitoso!
                    localStorage.setItem('barberia_token', data.token);
                    window.location.href = 'dashboard.html';
                } else {
                    // Credenciales incorrectas: Mostramos el div de error rojo
                    if (loginError && loginErrorText) {
                        loginErrorText.textContent = data.message || 'Credenciales incorrectas';
                        loginError.style.display = 'flex';
                    }
                }
            } catch (error) {
                console.error("Error de conexión:", error);
                // Error de servidor caído
                if (loginError && loginErrorText) {
                    loginErrorText.textContent = 'Error al conectar con el servidor.';
                    loginError.style.display = 'flex';
                }
            } finally {
                // UI: Devolvemos el botón a la normalidad
                if (loginBtnText) loginBtnText.style.display = 'inline-block';
                if (loginSpinner) loginSpinner.style.display = 'none';
            }
        });
    }

    // 3. Lógica para el botón de mostrar/ocultar contraseña (El ojito)
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            // Alternar el tipo de input entre 'password' y 'text'
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Alternar el ícono de PrimeIcons
            const icon = togglePassword.querySelector('i');
            icon.classList.toggle('pi-eye');
            icon.classList.toggle('pi-eye-slash');
        });
    }
});