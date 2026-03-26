import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyACAp-gYI8FF6HiklK2x18kmh6itBoJoaY",
    authDomain: "pvcasa-3d536.firebaseapp.com",
    projectId: "pvcasa-3d536",
    storageBucket: "pvcasa-3d536.firebasestorage.app",
    messagingSenderId: "460891501407",
    appId: "1:460891501407:web:1d2b5a3ee8feba8db1bcea",
    measurementId: "G-LE1RWD88V4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const form = document.getElementById('productForm');
const container = document.getElementById('adminProductContainer');
const categorySelect = document.getElementById('category');
const basePriceInput = document.getElementById('basePrice');
const discountInput = document.getElementById('discount');
const pricePreview = document.getElementById('pricePreview');
const previewContainer = document.getElementById('uploadPreviewContainer');
const progressBar = document.getElementById('uploadProgress');
const formTitle = document.querySelector('.form-card h2');

let allProducts = [];
let selectedFiles = [];
let existingImageUrls = [];

function maskMoney(value) {
    let cleanValue = value.replace(/\D/g, "");
    let numberValue = (parseFloat(cleanValue) / 100).toFixed(2);
    if (isNaN(numberValue)) return "0,00";
    return numberValue.replace(".", ",");
}

function maskPercent(value) {
    let cleanValue = value.replace(/\D/g, "");
    let num = parseInt(cleanValue) || 0;
    if (num > 99) num = 99;
    return num.toString();
}

basePriceInput.addEventListener('input', (e) => {
    e.target.value = maskMoney(e.target.value);
    updatePricePreview();
});

discountInput.addEventListener('input', (e) => {
    e.target.value = maskPercent(e.target.value);
    updatePricePreview();
});

function updatePricePreview() {
    const base = parseFloat(basePriceInput.value.replace(",", ".")) || 0;
    const disc = parseFloat(discountInput.value) || 0;
    const final = base - (base * (disc / 100));
    pricePreview.innerHTML = `Preço Final: <strong>R$ ${final.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>`;
}

document.getElementById('imageFiles').addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    selectedFiles = [...selectedFiles, ...files];
    renderUploadPreview();
});

function renderUploadPreview() {
    previewContainer.innerHTML = "";
    if (selectedFiles.length === 0 && existingImageUrls.length === 0) {
        previewContainer.style.display = "none";
        return;
    }
    previewContainer.style.display = "grid";

    existingImageUrls.forEach((url, index) => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `
            <img src="${url}">
            <button type="button" class="btn-remove-preview" onclick="removeExistingImage(${index})">✕</button>
        `;
        previewContainer.appendChild(div);
    });

    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        const div = document.createElement('div');
        div.className = 'preview-item';
        reader.onload = (e) => {
            div.innerHTML = `
                <img src="${e.target.result}">
                <button type="button" class="btn-remove-preview" onclick="removeSelectedFile(${index})">✕</button>
            `;
        };
        reader.readAsDataURL(file);
        previewContainer.appendChild(div);
    });
}

window.removeExistingImage = async (index) => {
    const imageUrl = existingImageUrls[index];
    
    if (confirm("Esta imagem será excluída permanentemente do servidor. Deseja continuar?")) {
        try {
            const imgRef = ref(storage, imageUrl);
            await deleteObject(imgRef);
            
            existingImageUrls.splice(index, 1);
            renderUploadPreview();
        } catch (error) {
            console.error(error);
            alert("Erro ao remover o arquivo do Firebase Storage.");
        }
    }
};

window.removeSelectedFile = (index) => {
    selectedFiles.splice(index, 1);
    renderUploadPreview();
};

async function uploadFiles() {
    const urls = [];
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const sRef = ref(storage, `products/${Date.now()}-${file.name}`);
        await uploadBytes(sRef, file);
        const url = await getDownloadURL(sRef);
        urls.push(url);
        progressBar.style.width = `${((i + 1) / selectedFiles.length) * 100}%`;
    }
    return urls;
}

form.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    
    if (!id && selectedFiles.length === 0) {
        alert("Adicione pelo menos uma imagem.");
        return;
    }

    if (id && selectedFiles.length === 0 && existingImageUrls.length === 0) {
        alert("O produto deve possuir ao menos uma imagem.");
        return;
    }

    const btn = document.getElementById('btnSubmit');
    btn.disabled = true;
    btn.innerText = "Sincronizando...";

    try {
        let newImageUrls = [];
        if (selectedFiles.length > 0) newImageUrls = await uploadFiles();

        const base = parseFloat(basePriceInput.value.replace(",", "."));
        const disc = parseFloat(discountInput.value) || 0;
        const finalImages = [...existingImageUrls, ...newImageUrls];

        const data = {
            name: document.getElementById('name').value,
            category: categorySelect.value,
            basePrice: base,
            discount: disc,
            finalPrice: base - (base * (disc / 100)),
            fabric: document.getElementById('fabric').value,
            images: finalImages,
            updatedAt: Date.now()
        };

        if (id) {
            await updateDoc(doc(db, "products", id), data);
        } else {
            data.createdAt = Date.now();
            await addDoc(collection(db, "products"), data);
        }

        resetFormState();
    } catch (err) {
        alert("Erro no processo: " + err.message);
    } finally {
        btn.disabled = false;
    }
};

function resetFormState() {
    form.reset();
    selectedFiles = [];
    existingImageUrls = [];
    renderUploadPreview();
    document.getElementById('productId').value = "";
    document.getElementById('btnCancel').style.display = "none";
    pricePreview.innerHTML = `Preço Final: <strong>R$ 0,00</strong>`;
    progressBar.style.width = "0%";
    btnSubmit.innerText = "Registrar Produto";
    formTitle.innerHTML = `<i class="fa-solid fa-plus-circle"></i> Criar Produto`;
}

function render(products) {
    container.innerHTML = "";
    document.getElementById('productCount').innerText = `${products.length} itens`;
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        let idx = 0;
        const imgs = p.images || [];
        const catClass = `tag-${p.category}`;
        let discClass = 'discount-low';
        if (p.discount >= 16) discClass = 'discount-high';
        else if (p.discount >= 6) discClass = 'discount-mid';

        card.innerHTML = `
            <div class="carousel-container">
                ${imgs.length > 1 ? `<button class="c-nav c-prev"><i class="fa-solid fa-chevron-left"></i></button>` : ''}
                <img src="${imgs[0]}" class="carousel-img">
                ${imgs.length > 1 ? `<button class="c-nav c-next"><i class="fa-solid fa-chevron-right"></i></button>` : ''}
                <div class="carousel-dots">
                    ${imgs.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}"></span>`).join('')}
                </div>
            </div>
            <div class="card-info">
                <div style="display:flex; gap:5px; margin-bottom:8px;">
                    <span class="tag ${catClass}">${p.category}</span>
                    ${p.discount > 0 ? `<span class="tag ${discClass}">${p.discount}% OFF</span>` : ''}
                </div>
                <h4>${p.name}</h4>
                <div class="price-box">
                    ${p.discount > 0 ? `<div class="old-p">R$ ${p.basePrice.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>` : ''}
                    <div class="new-p">R$ ${p.finalPrice.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
                </div>
                <div class="actions">
                    <button class="btn-edit"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button class="btn-delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        if (imgs.length > 1) {
            const img = card.querySelector('.carousel-img');
            const dots = card.querySelectorAll('.dot');
            const updateCarousel = (newIdx) => {
                dots[idx].classList.remove('active');
                idx = newIdx;
                img.src = imgs[idx];
                dots[idx].classList.add('active');
            };
            card.querySelector('.c-prev').onclick = () => updateCarousel((idx - 1 + imgs.length) % imgs.length);
            card.querySelector('.c-next').onclick = () => updateCarousel((idx + 1) % imgs.length);
        }
        card.querySelector('.btn-edit').onclick = () => edit(p.id);
        card.querySelector('.btn-delete').onclick = () => remove(p.id);
        container.appendChild(card);
    });
}

const remove = async (id) => {
    if (confirm("Deseja apagar este produto permanentemente?")) {
        const p = allProducts.find(x => x.id === id);
        if (p.images) {
            for (const url of p.images) {
                try {
                    const imgRef = ref(storage, url);
                    await deleteObject(imgRef);
                } catch (e) { console.warn("Mídia ignorada."); }
            }
        }
        await deleteDoc(doc(db, "products", id));
    }
};

const edit = (id) => {
    const p = allProducts.find(x => x.id === id);
    document.getElementById('productId').value = p.id;
    document.getElementById('name').value = p.name;
    categorySelect.value = p.category;
    document.getElementById('fabric').value = p.fabric || "Nenhum";
    basePriceInput.value = p.basePrice.toFixed(2).replace(".", ",");
    discountInput.value = p.discount.toString();
    
    existingImageUrls = [...(p.images || [])];
    selectedFiles = [];
    renderUploadPreview();
    updatePricePreview();

    formTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Atualizar Produto`;
    document.getElementById('btnCancel').style.display = "block";
    document.getElementById('btnSubmit').innerText = "Atualizar Produto";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.getElementById('btnCancel').onclick = () => resetFormState();

onSnapshot(query(collection(db, "products"), orderBy("updatedAt", "desc")), (snap) => {
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render(allProducts);
});

document.getElementById('dashboardSearch').oninput = (e) => {
    const t = e.target.value.toLowerCase();
    render(allProducts.filter(p => p.name.toLowerCase().includes(t) || p.category.toLowerCase().includes(t)));
};