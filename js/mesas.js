document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const layoutContainer = document.getElementById('layoutContainer');
    
    // Capturamos los elementos de los contadores de forma segura
    const totalAsientosEl = document.getElementById('totalAsientos') || document.querySelector('.counter-total');
    const confirmadosEl = document.getElementById('confirmados') || document.querySelector('.counter-confirmados');
    const libresEl = document.getElementById('libres') || document.querySelector('.counter-libres');

    let invitados = [];
    let mesas = {};
    const totalMesasEvento = 26;

    // 1. Cargar la base de datos de invitados
    async function cargarDatos() {
        try {
            const respuesta = await fetch('data/invitados.json'); 
            
            if (!respuesta.ok) {
                throw new Error(`Error HTTP: ${respuesta.status}`);
            }
            
            invitados = await respuesta.json();
            
            // Agrupar invitados por mesa y actualizar la interfaz
            agruparPorMesas(invitados);
            actualizarContadores(invitados);
            renderizarMesas();
            
            // Si existía un mensaje de error previo, lo removemos
            const msgErrorAnterior = document.querySelector('.error-alerta-db');
            if (msgErrorAnterior) msgErrorAnterior.remove();

        } catch (error) {
            console.error("Error al cargar invitados:", error);
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-alerta-db';
            errorDiv.style.cssText = "color: #ff4d4d; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.95rem; margin-top: 15px; text-align: left;";
            errorDiv.innerText = "Error al cargar la base de datos de invitados.";
            
            if (layoutContainer) {
                layoutContainer.innerHTML = '';
                layoutContainer.appendChild(errorDiv);
            }
        }
    }

    // 2. Agrupar la lista plana de invitados en un mapa de mesas
    function agruparPorMesas(listaInvitados) {
        mesas = {};
        for (let i = 1; i <= totalMesasEvento; i++) {
            mesas[i] = [];
        }
        
        listaInvitados.forEach(invitado => {
            const numMesa = parseInt(invitado.mesa);
            if (mesas[numMesa]) {
                mesas[numMesa].push(invitado);
            }
        });
    }

    // 3. Actualizar los contadores de la interfaz
    function actualizarContadores(lista) {
        const total = lista.length;
        const confirmados = lista.filter(inv => !inv.nombre.toLowerCase().includes('vacio')).length; 
        const libres = 0; 

        if (totalAsientosEl) totalAsientosEl.textContent = total;
        if (confirmadosEl) confirmadosEl.textContent = confirmados;
        if (libresEl) libresEl.textContent = libres;
    }

    // 4. Dibujar las mesas en el HTML (Filtrando y ocultando las que no coinciden)
    function renderizarMesas(filtroBusqueda = '') {
        if (!layoutContainer) return;
        layoutContainer.innerHTML = ''; 
        
        const busquedaNormalizada = normalizarTexto(filtroBusqueda);
        const estaBuscando = busquedaNormalizada.length > 0;

        for (let numMesa = 1; numMesa <= totalMesasEvento; numMesa++) {
            const integrantes = mesas[numMesa] || [];
            
            // Si la mesa está vacía
            if (integrantes.length === 0) {
                // Si el usuario está buscando algo, no mostramos las mesas vacías
                if (estaBuscando) continue;

                // Si no está buscando, mostramos la mesa vacía de forma estética con opacidad baja
                const mesaVaciaCard = document.createElement('div');
                mesaVaciaCard.className = 'mesa-card mesa-vacia';
                mesaVaciaCard.style.opacity = '0.4';
                mesaVaciaCard.innerHTML = `
                    <div class="mesa-header">
                        <h3>Mesa ${numMesa}</h3>
                    </div>
                    <ul class="lista-invitados">
                        <li class="invitado-item" style="font-style: italic; color: #777;">
                            <span>Mesa vacía</span>
                        </li>
                    </ul>
                `;
                layoutContainer.appendChild(mesaVaciaCard);
                continue;
            }

            // Comprobar si algún integrante de esta mesa coincide con la búsqueda
            const tieneCoincidencia = integrantes.some(inv => 
                normalizarTexto(inv.nombre).includes(busquedaNormalizada)
            );

            // NUEVA LÓGICA: Si el usuario está escribiendo un nombre y esta mesa NO tiene coincidencias, la saltamos (desaparece)
            if (estaBuscando && !tieneCoincidencia) {
                continue; 
            }

            // Si pasa el filtro, creamos la tarjeta de la mesa
            const mesaCard = document.createElement('div');
            mesaCard.className = `mesa-card ${tieneCoincidencia && estaBuscando ? 'mesa-destacada' : ''}`;
            
            mesaCard.innerHTML = `
                <div class="mesa-header">
                    <h3>Mesa ${numMesa}</h3>
                </div>
                <ul class="lista-invitados">
                    ${integrantes.map(inv => {
                        // Resaltamos de forma individual al invitado específico dentro de la lista
                        const coincideEsteInvitado = estaBuscando && normalizarTexto(inv.nombre).includes(busquedaNormalizada);
                        return `
                            <li class="invitado-item ${coincideEsteInvitado ? 'invitado-resaltado' : ''}">
                                <i class="fa-solid fa-circle-user" style="margin-right: 8px; font-size: 0.85rem;"></i>
                                <span>${inv.nombre}</span>
                            </li>
                        `;
                    }).join('')}
                </ul>
            `;
            layoutContainer.appendChild(mesaCard);
        }

        // En caso de que busque algo y ninguna mesa coincida, mostramos un mensaje amigable de "Sin resultados"
        if (estaBuscando && layoutContainer.children.length === 0) {
            const sinResultados = document.createElement('div');
            sinResultados.style.cssText = "color: #888; text-align: center; width: 100%; padding: 3rem; font-family: 'Plus Jakarta Sans', sans-serif;";
            sinResultados.innerHTML = `
                <i class="fa-solid fa-face-frown" style="font-size: 2.5rem; margin-bottom: 1rem; color: #aa8c4a;"></i>
                <p style="font-size: 1.1rem; margin: 0;">No se encontró ningún invitado con ese nombre.</p>
                <small style="color: #666; display: block; margin-top: 0.5rem;">Intenta buscando con otra palabra o apellido.</small>
            `;
            layoutContainer.appendChild(sinResultados);
        }
    }

    function normalizarTexto(texto) {
        return texto ? texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
    }

    // 5. Escuchar la escritura del usuario
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const valorBusqueda = e.target.value;
            renderizarMesas(valorBusqueda);
        });
    }

    // Iniciar la carga
    cargarDatos();
});