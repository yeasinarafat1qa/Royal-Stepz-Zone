import {
  auth,
  db,
  ADMIN_UID,
  WHATSAPP_NUMBER,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  ref,
  get,
  set,
  push,
  update,
  query,
  orderByChild,
  equalTo
} from "./firebase.js";


// ===============================
// ROYALE STEPZ ZONE
// Customer App JavaScript
// ===============================


let products = [];
let cart = JSON.parse(localStorage.getItem("royaleCart") || "[]");
let currentUser = null;


// ===============================
// HELPER
// ===============================

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value) {
  return `QAR ${Number(value || 0).toFixed(2)}`;
}

function saveCart() {
  localStorage.setItem("royaleCart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  document.querySelectorAll(".cart-count").forEach(el => {
    el.textContent = count;
  });
}


// ===============================
// LOAD PRODUCTS
// ===============================

async function loadProducts() {
  try {
    const snapshot = await get(ref(db, "products"));

    products = [];

    if (snapshot.exists()) {
      const data = snapshot.val();

      Object.entries(data).forEach(([id, product]) => {
        products.push({
          id,
          ...product
        });
      });
    }

    products.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

    renderProducts(products);
    renderFeaturedProducts();
    populateCategories();

  } catch (error) {
    console.error("Product loading error:", error);

    const container = document.getElementById("productGrid");

    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Products could not be loaded</h3>
          <p>Please check your Firebase settings.</p>
        </div>
      `;
    }
  }
}


// ===============================
// PRODUCT CARD
// ===============================

function productCard(product) {

  const image =
    product.image ||
    (product.images && product.images[0]?.url) ||
    "https://via.placeholder.com/600x600?text=Royale+Stepz";

  const oldPrice = Number(product.oldPrice || 0);
  const price = Number(product.price || 0);

  let discount = "";

  if (oldPrice > price && oldPrice > 0) {
    const percent = Math.round(((oldPrice - price) / oldPrice) * 100);

    discount = `<span class="discount-badge">${percent}% OFF</span>`;
  }

  return `
    <div class="product-card">

      <div class="product-image-wrap" onclick="openProduct('${product.id}')">

        ${discount}

        <img
          src="${esc(image)}"
          alt="${esc(product.name)}"
          class="product-image"
          loading="lazy"
        >

      </div>

      <div class="product-info">

        <div class="product-category">
          ${esc(product.category || "Footwear")}
        </div>

        <h3 class="product-name">
          ${esc(product.name)}
        </h3>

        <div class="price-row">

          <strong class="product-price">
            ${money(price)}
          </strong>

          ${
            oldPrice > price
              ? `<del>${money(oldPrice)}</del>`
              : ""
          }

        </div>

        <button
          class="btn btn-primary add-cart-btn"
          onclick="openProduct('${product.id}')"
        >
          View Product
        </button>

      </div>

    </div>
  `;
}


// ===============================
// RENDER PRODUCTS
// ===============================

function renderProducts(list = products) {

  const grid = document.getElementById("productGrid");

  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No products found</h3>
        <p>Try another category or search.</p>
      </div>
    `;

    return;
  }

  grid.innerHTML = list.map(productCard).join("");
}


// ===============================
// FEATURED PRODUCTS
// ===============================

function renderFeaturedProducts() {

  const grid = document.getElementById("featuredGrid");

  if (!grid) return;

  const featured = products
    .filter(product => product.featured === true)
    .slice(0, 8);

  const list = featured.length
    ? featured
    : products.slice(0, 8);

  grid.innerHTML = list.length
    ? list.map(productCard).join("")
    : `
      <div class="empty-state">
        <h3>No featured products yet</h3>
      </div>
    `;
}


// ===============================
// CATEGORIES
// ===============================

function populateCategories() {

  const select = document.getElementById("categoryFilter");

  if (!select) return;

  const categories = [
    ...new Set(
      products
        .map(product => product.category)
        .filter(Boolean)
    )
  ];

  select.innerHTML = `
    <option value="">All Categories</option>
    ${categories.map(category =>
      `<option value="${esc(category)}">${esc(category)}</option>`
    ).join("")}
  `;
}


// ===============================
// SEARCH
// ===============================

function searchProducts() {

  const searchInput = document.getElementById("searchInput");

  if (!searchInput) return;

  const keyword = searchInput.value.trim().toLowerCase();

  const filtered = products.filter(product => {

    const name = String(product.name || "").toLowerCase();
    const category = String(product.category || "").toLowerCase();
    const description = String(product.description || "").toLowerCase();

    return (
      name.includes(keyword) ||
      category.includes(keyword) ||
      description.includes(keyword)
    );
  });

  renderProducts(filtered);
}


// ===============================
// CATEGORY FILTER
// ===============================

function filterCategory() {

  const select = document.getElementById("categoryFilter");

  if (!select) return;

  const category = select.value;

  if (!category) {
    renderProducts(products);
    return;
  }

  renderProducts(
    products.filter(
      product => product.category === category
    )
  );
}


// ===============================
// PRODUCT DETAILS
// ===============================

function openProduct(productId) {

  const product = products.find(
    item => item.id === productId
  );

  if (!product) return;

  const modal = document.getElementById("productModal");

  if (!modal) return;

  const mainImage =
    product.image ||
    (product.images && product.images[0]?.url) ||
    "https://via.placeholder.com/600x600?text=Royale+Stepz";

  const images =
    product.images?.length
      ? product.images
      : [{ url: mainImage }];

  const sizes = Array.isArray(product.sizes)
    ? product.sizes
    : String(product.sizes || "")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

  const colors = Array.isArray(product.colors)
    ? product.colors
    : String(product.colors || "")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

  modal.innerHTML = `

    <div class="modal-overlay" onclick="closeProduct(event)">

      <div class="product-modal" onclick="event.stopPropagation()">

        <button
          class="modal-close"
          onclick="closeProduct()"
        >
          ×
        </button>

        <div class="product-detail">

          <div class="gallery">

            <img
              id="mainProductImage"
              src="${esc(mainImage)}"
              alt="${esc(product.name)}"
              class="detail-main-image"
            >

            <div class="thumbnail-row">

              ${images.map((img, index) => `
                <img
                  src="${esc(img.url)}"
                  class="thumbnail ${index === 0 ? "active" : ""}"
                  onclick="changeMainImage('${esc(img.url)}', this)"
                >
              `).join("")}

            </div>

          </div>

          <div class="detail-content">

            <div class="product-category">
              ${esc(product.category || "Footwear")}
            </div>

            <h2>${esc(product.name)}</h2>

            <div class="detail-price">

              <strong>${money(product.price)}</strong>

              ${
                Number(product.oldPrice || 0) > Number(product.price || 0)
                  ? `<del>${money(product.oldPrice)}</del>`
                  : ""
              }

            </div>

            <p class="detail-description">
              ${esc(product.description || "Premium quality footwear from Royale Stepz Zone.")}
            </p>

            ${
              sizes.length
                ? `
                  <div class="option-group">

                    <label>Size</label>

                    <div class="option-buttons">

                      ${sizes.map((size, index) => `
                        <button
                          class="option-btn ${index === 0 ? "selected" : ""}"
                          data-size="${esc(size)}"
                          onclick="selectOption(this, 'size')"
                        >
                          ${esc(size)}
                        </button>
                      `).join("")}

                    </div>

                  </div>
                `
                : ""
            }

            ${
              colors.length
                ? `
                  <div class="option-group">

                    <label>Color</label>

                    <div class="option-buttons">

                      ${colors.map((color, index) => `
                        <button
                          class="option-btn ${index === 0 ? "selected" : ""}"
                          data-color="${esc(color)}"
                          onclick="selectOption(this, 'color')"
                        >
                          ${esc(color)}
                        </button>
                      `).join("")}

                    </div>

                  </div>
                `
                : ""
            }

            <div class="quantity-box">

              <button onclick="changeQuantity(-1)">−</button>

              <span id="productQuantity">1</span>

              <button onclick="changeQuantity(1)">+</button>

            </div>

            <button
              class="btn btn-primary btn-large"
              onclick="addToCart('${product.id}')"
            >
              Add to Cart
            </button>

          </div>

        </div>

      </div>

    </div>
  `;

  modal.classList.add("show");

  window.currentProduct = product;
  window.currentProductQuantity = 1;
}


function closeProduct(event) {

  if (event && event.target !== event.currentTarget) {
    return;
  }

  const modal = document.getElementById("productModal");

  if (modal) {
    modal.classList.remove("show");
    modal.innerHTML = "";
  }
}


function changeMainImage(url, element) {

  const image = document.getElementById("mainProductImage");

  if (image) {
    image.src = url;
  }

  document.querySelectorAll(".thumbnail").forEach(item => {
    item.classList.remove("active");
  });

  if (element) {
    element.classList.add("active");
  }
}


function selectOption(button, type) {

  const parent = button.parentElement;

  parent.querySelectorAll(".option-btn").forEach(btn => {
    btn.classList.remove("selected");
  });

  button.classList.add("selected");
}


function changeQuantity(amount) {

  window.currentProductQuantity =
    Math.max(
      1,
      Number(window.currentProductQuantity || 1) + amount
    );

  const element = document.getElementById("productQuantity");

  if (element) {
    element.textContent = window.currentProductQuantity;
  }
}


// ===============================
// CART
// ===============================

function addToCart(productId) {

  const product = products.find(
    item => item.id === productId
  );

  if (!product) return;

  const sizeButton =
    document.querySelector(".option-btn.selected[data-size]");

  const colorButton =
    document.querySelector(".option-btn.selected[data-color]");

  const size = sizeButton
    ? sizeButton.dataset.size
    : "";

  const color = colorButton
    ? colorButton.dataset.color
    : "";

  const quantity =
    Number(window.currentProductQuantity || 1);

  const existing = cart.find(item =>
    item.productId === productId &&
    item.size === size &&
    item.color === color
  );

  if (existing) {

    existing.quantity += quantity;

  } else {

    cart.push({
      productId,
      name: product.name,
      price: Number(product.price || 0),
      image:
        product.image ||
        product.images?.[0]?.url ||
        "",
      quantity,
      size,
      color
    });
  }

  saveCart();

  closeProduct();

  showToast("Product added to cart");

  renderCart();
}


// ===============================
// CART DISPLAY
// ===============================

function renderCart() {

  const container = document.getElementById("cartItems");

  if (!container) return;

  if (!cart.length) {

    container.innerHTML = `
      <div class="empty-state">
        <h3>Your cart is empty</h3>
        <p>Add some products to continue.</p>
      </div>
    `;

    updateCartTotals();

    return;
  }

  container.innerHTML = cart.map((item, index) => `

    <div class="cart-item">

      <img
        src="${esc(item.image || "https://via.placeholder.com/150")}"
        alt="${esc(item.name)}"
      >

      <div class="cart-item-info">

        <h4>${esc(item.name)}</h4>

        ${
          item.size
            ? `<p>Size: ${esc(item.size)}</p>`
            : ""
        }

        ${
          item.color
            ? `<p>Color: ${esc(item.color)}</p>`
            : ""
        }

        <strong>${money(item.price)}</strong>

        <div class="cart-quantity">

          <button onclick="updateCartQuantity(${index}, -1)">−</button>

          <span>${item.quantity}</span>

          <button onclick="updateCartQuantity(${index}, 1)">+</button>

        </div>

      </div>

      <button
        class="remove-cart"
        onclick="removeCartItem(${index})"
      >
        Remove
      </button>

    </div>

  `).join("");

  updateCartTotals();
}


function updateCartQuantity(index, amount) {

  if (!cart[index]) return;

  cart[index].quantity += amount;

  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }

  saveCart();
  renderCart();
}


function removeCartItem(index) {

  cart.splice(index, 1);

  saveCart();
  renderCart();
}


function updateCartTotals() {

  const subtotal = cart.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  const element = document.getElementById("cartSubtotal");

  if (element) {
    element.textContent = money(subtotal);
  }
}


// ===============================
// AUTH
// ===============================

async function registerUser(name, phone, email, password) {

  try {

    const result =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    await set(
      ref(db, `users/${result.user.uid}`),
      {
        name,
        phone,
        email,
        role: "user",
        createdAt: Date.now()
      }
    );

    showToast("Account created successfully");

    return true;

  } catch (error) {

    console.error(error);

    showToast(
      error.message || "Registration failed"
    );

    return false;
  }
}


async function loginUser(email, password) {

  try {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    showToast("Login successful");

    return true;

  } catch (error) {

    console.error(error);

    showToast(
      error.message || "Login failed"
    );

    return false;
  }
}


async function logoutUser() {

  try {

    await signOut(auth);

    showToast("Logged out");

  } catch (error) {

    console.error(error);
  }
}


// ===============================
// AUTH STATE
// ===============================

onAuthStateChanged(auth, async user => {

  currentUser = user;

  updateAuthUI();

  if (user) {

    console.log(
      "Logged in:",
      user.email
    );

    if (user.uid === ADMIN_UID) {
      console.log("Admin account detected");
    }
  }
});


function updateAuthUI() {

  document.querySelectorAll("[data-auth-user]").forEach(el => {

    el.textContent =
      currentUser?.email || "Guest";
  });

  document.querySelectorAll(".login-only").forEach(el => {

    el.style.display =
      currentUser ? "" : "none";
  });

  document.querySelectorAll(".logout-only").forEach(el => {

    el.style.display =
      currentUser ? "" : "none";
  });
  const adminButton = document.getElementById("adminPanelBtn");

  if (adminButton) {
    adminButton.style.display =
      currentUser && currentUser.uid === ADMIN_UID
        ? "inline-block"
        : "none";
  }


// ===============================
// CHECKOUT
// ===============================

async function createOrder(orderData) {

  if (!currentUser) {

    showToast("Please login first");

    return null;
  }

  if (!cart.length) {

    showToast("Your cart is empty");

    return null;
  }

  try {

    const orderRef = push(ref(db, "orders"));

    const order = {

      ...orderData,

      userId: currentUser.uid,

      items: cart.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size || "",
        color: item.color || ""
      })),

      subtotal: cart.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
        0
      ),

      status: "Pending",

      createdAt: Date.now()
    };

    await set(orderRef, order);

    cart = [];

    saveCart();

    showToast("Order placed successfully");

    sendWhatsAppOrder(order);

    return orderRef.key;

  } catch (error) {

    console.error("Order error:", error);

    showToast(
      error.message || "Order could not be placed"
    );

    return null;
  }
}


// ===============================
// WHATSAPP ORDER
// ===============================

function sendWhatsAppOrder(order) {

  if (
    !WHATSAPP_NUMBER ||
    WHATSAPP_NUMBER.includes("X")
  ) {
    console.log(
      "Please set your WhatsApp number in firebase.js"
    );

    return;
  }

  let message =
    `New Order - Royale Stepz Zone\n\n`;

  message +=
    `Customer: ${order.customerName || ""}\n`;

  message +=
    `Phone: ${order.phone || ""}\n`;

  message +=
    `Address: ${order.address || ""}\n\n`;

  message += "Items:\n";

  order.items.forEach(item => {

    message +=
      `${item.name} x ${item.quantity}`;

    if (item.size) {
      message += ` | Size: ${item.size}`;
    }

    if (item.color) {
      message += ` | Color: ${item.color}`;
    }

    message +=
      ` | ${money(item.price * item.quantity)}\n`;
  });

  message +=
    `\nSubtotal: ${money(order.subtotal)}`;

  message +=
    `\nDelivery: ${money(order.deliveryCharge || 0)}`;

  message +=
    `\nDiscount: ${money(order.discount || 0)}`;

  message +=
    `\nTotal: ${money(order.total || order.subtotal)}`;

  const url =
    `https://wa.me/${WHATSAPP_NUMBER}?text=` +
    encodeURIComponent(message);

  window.open(url, "_blank");
}


// ===============================
// MY ORDERS
// ===============================

async function loadMyOrders() {

  if (!currentUser) return;

  const container =
    document.getElementById("myOrders");

  if (!container) return;

  try {

    const ordersQuery =
      query(
        ref(db, "orders"),
        orderByChild("userId"),
        equalTo(currentUser.uid)
      );

    const snapshot =
      await get(ordersQuery);

    if (!snapshot.exists()) {

      container.innerHTML = `
        <div class="empty-state">
          <h3>No orders yet</h3>
        </div>
      `;

      return;
    }

    const orders = [];

    snapshot.forEach(child => {

      orders.push({
        id: child.key,
        ...child.val()
      });

    });

    orders.sort(
      (a, b) =>
        Number(b.createdAt || 0) -
        Number(a.createdAt || 0)
    );

    container.innerHTML =
      orders.map(order => `

        <div class="order-card">

          <div class="order-header">

            <strong>
              Order #${esc(order.id)}
            </strong>

            <span class="status status-${String(order.status || "Pending").toLowerCase()}">
              ${esc(order.status || "Pending")}
            </span>

          </div>

          <div class="order-items">

            ${
              (order.items || []).map(item => `
                <p>
                  ${esc(item.name)}
                  × ${item.quantity}
                </p>
              `).join("")
            }

          </div>

          <strong>
            Total: ${money(order.total || order.subtotal)}
          </strong>

        </div>

      `).join("");

  } catch (error) {

    console.error(error);

    container.innerHTML = `
      <div class="empty-state">
        Unable to load orders.
      </div>
    `;
  }
}


// ===============================
// TOAST
// ===============================

function showToast(message) {

  let toast =
    document.getElementById("toast");

  if (!toast) {

    toast = document.createElement("div");

    toast.id = "toast";

    toast.className = "toast";

    document.body.appendChild(toast);
  }

  toast.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {

    toast.classList.remove("show");

  }, 3000);
}


// ===============================
// GLOBAL FUNCTIONS
// ===============================

window.openProduct = openProduct;
window.closeProduct = closeProduct;
window.changeMainImage = changeMainImage;
window.selectOption = selectOption;
window.changeQuantity = changeQuantity;

window.addToCart = addToCart;

window.renderCart = renderCart;
window.updateCartQuantity = updateCartQuantity;
window.removeCartItem = removeCartItem;

window.searchProducts = searchProducts;
window.filterCategory = filterCategory;

window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;

window.createOrder = createOrder;
window.loadMyOrders = loadMyOrders;


// ===============================
// INITIALIZE
// ===============================

document.addEventListener("DOMContentLoaded", () => {

  updateCartCount();

  loadProducts();

  renderCart();

  const searchInput =
    document.getElementById("searchInput");

  if (searchInput) {

    searchInput.addEventListener(
      "input",
      searchProducts
    );
  }

  const categoryFilter =
    document.getElementById("categoryFilter");

  if (categoryFilter) {

    categoryFilter.addEventListener(
      "change",
      filterCategory
    );
  }

});
