// --- 1. CONFIGURACIÓN Y DATOS ---
const TOTAL_POKEMON = 1025; // Hasta la 9na Generación

const typeColors = {
    normal: { color: '#A8A77A', name: 'Normal' },
    fire: { color: '#EE8130', name: 'Fuego' },
    water: { color: '#6390F0', name: 'Agua' },
    electric: { color: '#F7D02C', name: 'Eléctrico' },
    grass: { color: '#7AC74C', name: 'Planta' },
    ice: { color: '#96D9D6', name: 'Hielo' },
    fighting: { color: '#C22E28', name: 'Lucha' },
    poison: { color: '#A33EA1', name: 'Veneno' },
    ground: { color: '#E2BF65', name: 'Tierra' },
    flying: { color: '#A98FF3', name: 'Volador' },
    psychic: { color: '#F95587', name: 'Psíquico' },
    bug: { color: '#A6B91A', name: 'Bicho' },
    rock: { color: '#B6A136', name: 'Roca' },
    ghost: { color: '#735797', name: 'Fantasma' },
    dragon: { color: '#6F35FC', name: 'Dragón' },
    dark: { color: '#705746', name: 'Siniestro' },
    steel: { color: '#B7B7CE', name: 'Acero' },
    fairy: { color: '#D685AD', name: 'Hada' }
};

let allPokemonData = []; 

// Elementos DOM
const gridContainer = document.getElementById('pokedex-grid');
const loadingElement = document.getElementById('loading');
const searchInput = document.getElementById('search-input');
const typeFilter = document.getElementById('type-filter');
const modal = document.getElementById('pokemon-modal');
const closeModalBtn = document.getElementById('close-modal');

// --- 2. MOTOR DE CARGA OPTIMIZADO (1025 POKÉMON RÁPIDO) ---
async function initPokedex() {
    setupTypeFilter();
    
    try {
        // Paso A: Descargar mapeo de todos los tipos (19 requests muy rápidos en lugar de 1025)
        const typeRes = await fetch('https://pokeapi.co/api/v2/type');
        const typeData = await typeRes.json();
        
        const pokemonTypesMap = {}; // Guardará { "bulbasaur": ["grass", "poison"] }
        
        const typePromises = typeData.results.map(async (typeObj) => {
            const res = await fetch(typeObj.url);
            const data = await res.json();
            data.pokemon.forEach(p => {
                const pName = p.pokemon.name;
                if (!pokemonTypesMap[pName]) pokemonTypesMap[pName] = [];
                // Solo guardamos los tipos principales (no los forms con nombres largos)
                pokemonTypesMap[pName].push(typeObj.name); 
            });
        });
        
        await Promise.all(typePromises);

        // Paso B: Obtener la lista base de los 1025 Pokémon (1 request)
        const pokeRes = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${TOTAL_POKEMON}`);
        const pokeList = await pokeRes.json();

        // Paso C: Ensamblar datos sin consultar la API 1025 veces
        allPokemonData = pokeList.results.map((p, index) => {
            const id = index + 1; // El ID coincide con el índice + 1 hasta el 1025
            return {
                id: id,
                name: p.name,
                types: pokemonTypesMap[p.name] || ['normal'], // Fallback por seguridad
                image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
            };
        });

        // Ocultar pantalla de carga y renderizar
        loadingElement.classList.add('hidden');
        gridContainer.classList.remove('hidden');
        renderPokemonList(allPokemonData);

    } catch (error) {
        console.error(error);
        loadingElement.innerHTML = "Error de conexión.<br>Reinicie la terminal.";
    }
}

function setupTypeFilter() {
    for (const [key, val] of Object.entries(typeColors)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = val.name;
        typeFilter.appendChild(option);
    }
}

// --- 3. RENDERIZADO VISUAL ---
function renderPokemonList(pokemonArray) {
    gridContainer.innerHTML = '';
    
    if(pokemonArray.length === 0){
        gridContainer.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:20px; font-weight:bold;">No se encontraron resultados en la base de datos.</p>';
        return;
    }

    // Usar DocumentFragment para mejor rendimiento al renderizar 1000+ items
    const fragment = document.createDocumentFragment();

    pokemonArray.forEach(pokemon => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.onclick = () => openModal(pokemon);

        const idFormatted = `#${pokemon.id.toString().padStart(4, '0')}`;
        
        let typesHtml = '';
        pokemon.types.forEach(type => {
            const typeInfo = typeColors[type] || { color: '#777', name: type };
            typesHtml += `<span class="type-badge" style="background-color: ${typeInfo.color}">${typeInfo.name}</span>`;
        });

        card.innerHTML = `
            <span class="number">${idFormatted}</span>
            <img src="${pokemon.image}" alt="${pokemon.name}" loading="lazy" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png'">
            <h3>${pokemon.name.replace(/-/g, ' ')}</h3>
            <div class="types-container">${typesHtml}</div>
        `;
        fragment.appendChild(card);
    });

    gridContainer.appendChild(fragment);
}

// --- 4. BÚSQUEDA Y FILTROS ---
function handleSearchAndFilter() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedType = typeFilter.value;

    const filtered = allPokemonData.filter(pokemon => {
        const matchNameOrId = pokemon.name.toLowerCase().includes(searchTerm) || 
                              pokemon.id.toString().includes(searchTerm);
        const matchType = selectedType === 'all' || pokemon.types.includes(selectedType);

        return matchNameOrId && matchType;
    });

    renderPokemonList(filtered);
}

searchInput.addEventListener('input', handleSearchAndFilter);
typeFilter.addEventListener('change', handleSearchAndFilter);

// --- 5. LÓGICA DEL MODAL Y PETICIÓN DE DETALLES ---
async function openModal(pokemonBase) {
    modal.classList.remove('hidden');
    
    // UI Inicial (Datos cacheados)
    document.getElementById('modal-img').src = pokemonBase.image;
    document.getElementById('modal-number').textContent = `Nº ${pokemonBase.id.toString().padStart(4, '0')}`;
    document.getElementById('modal-name').textContent = pokemonBase.name.replace(/-/g, ' ');
    
    // Tipos
    const typesContainer = document.getElementById('modal-types');
    typesContainer.innerHTML = '';
    pokemonBase.types.forEach(type => {
        const typeInfo = typeColors[type] || { color: '#777', name: type };
        const badge = document.createElement('span');
        badge.classList.add('type-badge');
        badge.style.backgroundColor = typeInfo.color;
        badge.textContent = typeInfo.name;
        typesContainer.appendChild(badge);
    });

    // Resetear textos mientras carga la API
    document.getElementById('modal-height').textContent = "Buscando...";
    document.getElementById('modal-weight').textContent = "Buscando...";
    document.getElementById('modal-ability').textContent = "Buscando...";
    const descElement = document.getElementById('modal-description');
    descElement.innerHTML = "<i>Descifrando datos desde el servidor...</i>";

    // Petición de los detalles profundos SOLO al hacer clic (ahorra memoria y red)
    try {
        const [pokeRes, speciesRes] = await Promise.all([
            fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonBase.id}`),
            fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonBase.id}`)
        ]);

        const pokeData = await pokeRes.json();
        const speciesData = await speciesRes.json();

        // Actualizar UI con datos reales
        document.getElementById('modal-height').textContent = `${pokeData.height / 10} m`;
        document.getElementById('modal-weight').textContent = `${pokeData.weight / 10} kg`;
        document.getElementById('modal-ability').textContent = pokeData.abilities[0]?.ability.name.replace(/-/g, ' ') || 'Desconocida';

        // Buscar descripción en español
        const esEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'es');
        if (esEntry) {
            descElement.textContent = esEntry.flavor_text.replace(/\n|\f/g, ' ');
        } else {
            const enEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
            descElement.textContent = enEntry ? enEntry.flavor_text.replace(/\n|\f/g, ' ') : "No hay datos registrados en esta región.";
        }
    } catch (error) {
        descElement.textContent = "Error al conectar con la red de datos del Profesor Oak.";
        document.getElementById('modal-height').textContent = "--";
        document.getElementById('modal-weight').textContent = "--";
        document.getElementById('modal-ability').textContent = "--";
    }
}

// Eventos para cerrar modal
closeModalBtn.addEventListener('click', () => { modal.classList.add('hidden'); });
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
});

// Arrancar Pokédex
initPokedex();
