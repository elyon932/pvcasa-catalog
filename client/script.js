const productsData = [
    { name: "Jogo de Cama King 400 Fios Egípcio Cobre", oldPrice: 450.00, price: 299.90, img: "https://via.placeholder.com/300x300/B87333/ffffff?text=Cama+King" },
    { name: "Toalha de Banho Gigante Algodão Premium", oldPrice: 89.90, price: 59.90, img: "https://via.placeholder.com/300x300/FF8C00/ffffff?text=Toalha+Banho" },
    { name: "Kit Colcha Piquet Casal Estampada Floral", oldPrice: 220.00, price: 149.90, img: "https://via.placeholder.com/300x300/FFD700/333333?text=Colcha+Casal" },
    { name: "Travesseiro Plumas de Ganso Sintético", oldPrice: 120.00, price: 79.90, img: "https://via.placeholder.com/300x300/eeeeee/333333?text=Travesseiro" },
    { name: "Toalha de Mesa Retangular 8 Lugares Jacquard", oldPrice: 150.00, price: 99.90, img: "https://via.placeholder.com/300x300/B87333/ffffff?text=Toalha+Mesa" },
    { name: "Edredom Casal Dupla Face Microfibra", oldPrice: 180.00, price: 129.90, img: "https://via.placeholder.com/300x300/FF8C00/ffffff?text=Edredom" },
    { name: "Tapete de Banheiro Antiderrapante Bolinha", oldPrice: 45.00, price: 29.90, img: "https://via.placeholder.com/300x300/FFD700/333333?text=Tapete" },
    { name: "Jogo Americano 4 Peças Bambu Natural", oldPrice: 60.00, price: 39.90, img: "https://via.placeholder.com/300x300/eeeeee/333333?text=Jogo+Americano" },
    { name: "Cobertor Manta Microfibra Casal Aveludada", oldPrice: 99.00, price: 69.90, img: "https://via.placeholder.com/300x300/B87333/ffffff?text=Manta+Casal" },
    { name: "Roupão de Banho Unissex Algodão Aveludado", oldPrice: 160.00, price: 119.90, img: "https://via.placeholder.com/300x300/FF8C00/ffffff?text=Roupao" },
    { name: "Cortina para Sala Blackout Tecido Linho", oldPrice: 250.00, price: 189.90, img: "https://via.placeholder.com/300x300/FFD700/333333?text=Cortina" },
    { name: "Protetor de Colchão Impermeável Queen", oldPrice: 110.00, price: 85.90, img: "https://via.placeholder.com/300x300/eeeeee/333333?text=Protetor" },
    { name: "Almofada Decorativa Nó Escandinavo", oldPrice: 55.00, price: 35.90, img: "https://via.placeholder.com/300x300/B87333/ffffff?text=Almofada" },
    { name: "Saia para Cama Box Queen Ponto Palito", oldPrice: 75.00, price: 49.90, img: "https://via.placeholder.com/300x300/FF8C00/ffffff?text=Saia+Box" },
    { name: "Manta para Sofá Decorativa Algodão Cru", oldPrice: 80.00, price: 59.90, img: "https://via.placeholder.com/300x300/FFD700/333333?text=Manta+Sofa" },
    { name: "Jogo de Toalhas 5 Peças Fio Penteado", oldPrice: 190.00, price: 139.90, img: "https://via.placeholder.com/300x300/eeeeee/333333?text=Jogo+Toalhas" },
    { name: "Cobre Leito Solteiro 2 Peças Matelado", oldPrice: 130.00, price: 89.90, img: "https://via.placeholder.com/300x300/B87333/ffffff?text=Cobre+Leito" },
    { name: "Pano de Copa Kit 7 Peças Semaninha", oldPrice: 35.00, price: 24.90, img: "https://via.placeholder.com/300x300/FF8C00/ffffff?text=Pano+Copa" },
    { name: "Travesseiro de Corpo Gigante Xuxão", oldPrice: 95.00, price: 65.90, img: "https://via.placeholder.com/300x300/FFD700/333333?text=Travesseiro+Corpo" },
    { name: "Tapete Sala Geométrico 2,00m x 2,50m", oldPrice: 350.00, price: 249.90, img: "https://via.placeholder.com/300x300/eeeeee/333333?text=Tapete+Sala" }
];

const container = document.getElementById('productContainer');
const loadMoreBtn = document.getElementById('btnLoadMore');

function calculateDiscount(old, current) {
    const diff = old - current;
    const percentage = (diff / old) * 100;
    return Math.round(percentage);
}

function renderProducts(count) {
    for (let i = 0; i < count; i++) {
        
        const dataIndex = i % productsData.length;
        const product = productsData[dataIndex];
        const discount = calculateDiscount(product.oldPrice, product.price);

        const card = document.createElement('div');
        card.className = 'product-card';
        
        card.innerHTML = `
            <div>
                <div class="card-image">
                    <img src="${product.img}" alt="${product.name}">
                </div>
                <div class="card-info">
                    <span class="discount-tag">-${discount}% OFF</span>
                    <div class="old-price">R$ ${product.oldPrice.toFixed(2).replace('.', ',')}</div>
                    <div class="current-price">R$ ${product.price.toFixed(2).replace('.', ',')}</div>
                    <h4>${product.name}</h4>
                </div>
            </div>
            <a href="https://wa.me/5593992274444?text=Olá, tenho interesse no produto: ${product.name}" target="_blank" class="btn-whatsapp">
                <i class="fa-brands fa-whatsapp"></i> Ver Detalhes
            </a>
        `;

        container.appendChild(card);
    }
}

renderProducts(20);

loadMoreBtn.addEventListener('click', () => {
    renderProducts(20);
});