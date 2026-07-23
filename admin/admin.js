const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");

const form = document.getElementById("productForm");
const list = document.getElementById("productList");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");

const editIdInput = document.getElementById("editId");
const currentImageInput = document.getElementById("currentImage");
const nameInput = document.getElementById("productName");
const categoryInput = document.getElementById("productCategory");
const priceInput = document.getElementById("productPrice");
const imageFileInput = document.getElementById("productImageFile");
const previewBox = document.getElementById("previewBox");

const ADMIN_USER = "admin";
const ADMIN_PASS = "123456";

if (localStorage.getItem("adminLoggedIn") === "true") {
  showAdminPanel();
}

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const user = document.getElementById("adminUser").value.trim();
  const pass = document.getElementById("adminPass").value.trim();

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    localStorage.setItem("adminLoggedIn", "true");
    showAdminPanel();
  } else {
    alert("Kullanıcı adı veya şifre hatalı.");
  }
});

logoutBtn.addEventListener("click", function () {
  localStorage.removeItem("adminLoggedIn");
  loginScreen.style.display = "block";
  adminPanel.style.display = "none";
});

function showAdminPanel() {
  loginScreen.style.display = "none";
  adminPanel.style.display = "block";
  loadProducts();
}

imageFileInput.addEventListener("change", function () {
  const file = imageFileInput.files[0];

  if (!file) return;

  const imageUrl = URL.createObjectURL(file);

  previewBox.innerHTML = `
    <img src="${imageUrl}" alt="Önizleme">
  `;
});

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const id = editIdInput.value;
  const name = nameInput.value.trim();
  const category = categoryInput.value;
  const price = priceInput.value.trim();
  const file = imageFileInput.files[0];

  if (!name || !category || !price) {
    alert("Lütfen ürün adı, kategori ve fiyat alanlarını doldur.");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerText = id ? "Güncelleniyor..." : "Kaydediliyor...";

  try {
    let imageUrl = currentImageInput.value || "";

    if (file) {
      imageUrl = await uploadImage(file);
    }

    if (!imageUrl) {
      imageUrl = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800";
    }

    const productData = {
      name: name,
      category: category,
      price: Number(price),
      image: imageUrl
    };

    if (id) {
      const { error } = await supabaseClient
        .from("products")
        .update(productData)
        .eq("id", id);

      if (error) throw error;

      alert("Ürün güncellendi.");
    } else {
      const { error } = await supabaseClient
        .from("products")
        .insert([productData]);

      if (error) throw error;

      alert("Ürün eklendi.");
    }

    resetForm();
    await loadProducts();

  } catch (error) {
    console.error(error);
    alert("Hata: " + error.message);
  }

  saveBtn.disabled = false;
  saveBtn.innerText = "Kaydet";
});

async function uploadImage(file) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `menu/${fileName}`;

  const { error } = await supabaseClient.storage
    .from("products")
    .upload(filePath, file);

  if (error) throw error;

  const { data } = supabaseClient.storage
    .from("products")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

async function loadProducts() {
  list.innerHTML = "Ürünler yükleniyor...";

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = "Ürünler yüklenemedi.";
    alert("Listeleme hatası: " + error.message);
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "Henüz ürün eklenmedi.";
    return;
  }

  list.innerHTML = "";

  data.forEach(function (product) {
    list.innerHTML += `
      <div class="admin-product">
        <img 
          src="${product.image}" 
          alt="${product.name}"
          onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800';"
        >

        <div class="admin-product-content">
          <div class="admin-product-info">
            <h3>${product.name}</h3>
            <p>${getCategoryName(product.category)}</p>
            <p>${product.price} ₺</p>
          </div>

          <div class="admin-actions">
            <div class="edit-btn" data-id="${product.id}">
              Düzenle
            </div>

            <div class="delete-btn" data-id="${product.id}">
              Sil
            </div>
          </div>
        </div>
      </div>
    `;
  });

  document.querySelectorAll(".edit-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      editProduct(btn.dataset.id);
    });
  });

  document.querySelectorAll(".delete-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      deleteProduct(btn.dataset.id);
    });
  });
}

async function editProduct(id) {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("Düzenleme hatası: " + error.message);
    return;
  }

  editIdInput.value = data.id;
  currentImageInput.value = data.image;
  nameInput.value = data.name;
  categoryInput.value = data.category;
  priceInput.value = data.price;

  previewBox.innerHTML = `
    <img src="${data.image}" alt="${data.name}">
  `;

  saveBtn.innerText = "Güncelle";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

async function deleteProduct(id) {
  if (!confirm("Bu ürünü silmek istediğine emin misin?")) return;

  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Silme hatası: " + error.message);
    return;
  }

  alert("Ürün silindi.");
  await loadProducts();
}

cancelBtn.addEventListener("click", resetForm);

function resetForm() {
  form.reset();
  editIdInput.value = "";
  currentImageInput.value = "";
  saveBtn.innerText = "Kaydet";
  saveBtn.disabled = false;
  previewBox.innerHTML = "Fotoğraf önizleme burada görünecek";
}

function getCategoryName(category) {
  const categories = {
    sicak: "Sıcak İçecekler",
    soguk: "Soğuk İçecekler",
    tatli: "Tatlılar",
    yiyecek: "Yiyecekler"
  };

  return categories[category] || category;
}
