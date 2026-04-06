let currentPage = 1;
const totalPages = 4;

function updateDisplay() {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

    // Siempre mostrar la página actual
    document.getElementById(`page${currentPage}`).classList.add('active');

    // En landscape, mostrar también la siguiente si existe
    if (window.innerWidth > window.innerHeight && currentPage < totalPages) {
        document.getElementById(`page${currentPage + 1}`).classList.add('active');
    }
}

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        updateDisplay();
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        updateDisplay();
    }
});

// Inicializar
updateDisplay();

// Escuchar cambios de orientación
window.addEventListener('resize', updateDisplay);