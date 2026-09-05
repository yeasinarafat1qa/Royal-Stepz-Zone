```javascript
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
  query,
  orderByChild,
  equalTo
} from "./firebase.js";


// =====================================================
// ROYALE STEPZ ZONE - APP.JS
// =====================================================

let products = [];
let cart = JSON.parse(localStorage.getItem("royaleCart") || "[]");
let currentUser = null;


// =====================================================
// GLOBAL VARIABLES
// =====================================================

function syncGlobals() {
  window.products = products;
  window.cart = cart;
  window.currentUser = currentUser;
}


// =====================================================
// HELPERS
// =====================================================

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function money(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "QAR",
    minimumFractionDigits: 2
  }).format(number);
}


function saveCart() {
  localStorage.setItem(
    "royaleCart",
    JSON.stringify(cart)
  );

  syncGlobals();
  updateCartCount();
}


function updateCartCount() {
  const count = cart.reduce(
    (total, item) =>
      total + Number(item.quantity || 1),
    0
  );

  document
    .querySelectorAll("[data-cart-count]")
    .forEach(element => {
      element.textContent = count;
    });
}


// =====================================================
// TOAST
// =====================================================

function showToast(message, type = "success") {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = "toast " + type;
  toast.classList.add("show");

  clearTimeout(window.__royaleToastTimer);

  window.__royaleToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}


// =====================================================
// PRODUCT IMAGE
// =====================================================

function getProductImage(product) {
  if (product?.image) {
    return product.image;
  }

  if (
    Array.isArray(product?.images) &&
    product.images.length > 0
  ) {
    const first = product.images[0];

    if (typeof first === "string") {
      return first;
    }

    return first?.url || "";
  }

  return "";
}


// =====================================================
// LOAD PRODUCTS
// =====================================================

async function loadProducts() {
  const productGrid =
    document.getElementById("productGrid");

  const featuredGrid =
    document.getElementById("featuredGrid");

  try {
    console.log("Loading products from Firebase...");

    if (productGrid) {
      productGrid.innerHTML = `
        <div class="empty-state">
          <p>Products loading...</p>
        </div>
      `;
    }

    if (featuredGrid) {
      featuredGrid.innerHTML = `
        <div class="empty-state">
          <p>Products loading...</p>
        </div>
      `;
    }

    const productsRef = ref(db, "products");

    const snapshot = await get(productsRef);

    console.log(
      "Firebase products snapshot:",
      snapshot.exists()
    );

    if (!snapshot.exists()) {
      products = [];

      syncGlobals();

      renderProducts([]);
      renderFeaturedProducts([]);
      populateCategories([]);

      console.log("No products found in Firebase.");

      return;
    }

    const data = snapshot.val();

    products = Object.entries(data).map(
      ([id, product]) => ({
        id,
        ...(product || {})
      })
    );

    products.sort(
      (a, b) =>
        Number(b.createdAt || 0) -
        Number(a.createdAt || 0)
    );

    syncGlobals();

    renderProducts(products);
    renderFeaturedProducts(products);
    populateCategories(products);

    console.log(
      "Products loaded successfully:",
      products.length
    );

  } catch (error) {
    console.error(
      "PRODUCT LOADING ERROR:",
      error
    );

    products = [];
    syncGlobals();

    if (productGrid) {
      productGrid.innerHTML = `
        <div class="empty-state">
          <h3>Products load হয়নি</h3>
          <p>Firebase Database থেকে product আনা যাচ্ছে না।</p>
          <small>
            Console খুলে Firebase error দেখুন।
          </small>
        </div>
      `;
    }

    if (featuredGrid) {
      featuredGrid.innerHTML = `
        <div class="empty-state">
          <p>Featured products load হয়নি।</p>
        </div>
      `;
    }

    let message =
      "Product load করতে সমস্যা হয়েছে।";

    if (
      error?.code ===
      "PERMISSION_DENIED"
    ) {
      message =
        "Firebase Database permission denied।";
    }

    showToast(message, "error");
  }
}


// =====================================================
// PRODUCT CARD
// =====================================================

function productCard(product) {
  const image =
    getProductImage(product);

  const price =
    Number(product.price || 0);

  const oldPrice =
    Number(
      product.oldPrice ||
      product.comparePrice ||
      0
    );

  const category =
    product.category ||
    product.categoryName ||
    "Footwear";

  const name =
    product.name ||
    product.title ||
    "Product";

  return `
    <article class="product-card">

      <div
        class="product-image"
        onclick="window.openProduct('${esc(product.id)}')"
      >

        ${
          image
            ? `
              <img
                src="${esc(image)}"
                alt="${esc(name)}"
                loading="lazy"
                onerror="this.style.display='none'"
              >
            `
            : `
              <div class="no-image">
                No Image
              </div>
            `
        }

        ${
          product.badge
            ? `
              <span class="product-badge">
                ${esc(product.badge)}
              </span>
            `
            : ""
        }

      </div>

      <div class="product-info">

        <div class="product-category">
          ${esc(category)}
        </div>

        <h3 class="product-title">
          ${esc(name)}
        </h3>

        <div class="product-price">

          <strong>
            ${money(price)}
          </strong>

          ${
            oldPrice > price
              ? `
                <del>
                  ${money(oldPrice)}
                </del>
              `
              : ""
          }

        </div>

        <button
          type="button"
          class="btn btn-primary product-btn"
          onclick="window.openProduct('${esc(product.id)}')"
        >
          View Product
        </button>

      </div>

    </article>
  `;
}


// =====================================================
// RENDER PRODUCTS
// =====================================================

function renderProducts(list) {
  const grid =
    document.getElementById("productGrid");

  if (!grid) return;

  if (!list || list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No products found</h3>
        <p>এই মুহূর্তে কোনো product পাওয়া যায়নি।</p>
      </div>
    `;

    return;
  }

  grid.innerHTML =
    list.map(productCard).join("");
}


// =====================================================
// FEATURED PRODUCTS
// =====================================================

function renderFeaturedProducts(list) {
  const grid =
    document.getElementById("featuredGrid");

  if (!grid) return;

  const featured =
    list
      .filter(product =>
        product.featured === true ||
        product.featured === "true" ||
        product.isFeatured === true ||
        product.isFeatured === "true"
      )
      .slice(0, 8);

  const finalList =
    featured.length > 0
      ? featured
      : list.slice(0, 8);

  if (finalList.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>No featured products available.</p>
      </div>
    `;

    return;
  }

  grid.innerHTML =
    finalList.map(productCard).join("");
}


// =====================================================
// CATEGORY
// =====================================================

function populateCategories(list = products) {
  const select =
    document.getElementById("categoryFilter");

  if (!select) return;

  const categories = [
    ...new Set(
      list
        .map(product =>
          product.category ||
          product.categoryName ||
          ""
        )
        .filter(Boolean)
    )
  ];

  select.innerHTML = `
    <option value="all">
      All Categories
    </option>

    ${
      categories
        .sort()
        .map(category => `
          <option value="${esc(category)}">
            ${esc(category)}
          </option>
        `)
        .join("")
    }
  `;
}


function filterCategory(category = "all") {
  const value =
    category || "all";

  const searchInput =
    document.getElementById(
      "shopSearchInput"
    );

  const search =
    searchInput?.value
      ?.toLowerCase()
      .trim() || "";

  let result = [...products];

  if (value !== "all") {
    result =
      result.filter(product =>
        String(
          product.category ||
          product.categoryName ||
          ""
        )
        .toLowerCase() ===
        value.toLowerCase()
      );
  }

  if (search) {
    result =
      result.filter(product => {

        const text = `
          ${product.name || ""}
          ${product.title || ""}
          ${product.category || ""}
          ${product.description || ""}
          ${product.brand || ""}
        `.toLowerCase();

        return text.includes(search);
      });
  }

  renderProducts(result);
}


function setCategory(category) {
  const select =
    document.getElementById(
      "categoryFilter"
    );

  if (select) {
    select.value = category;
  }

  filterCategory(category);

  const shop =
    document.getElementById("shop");

  if (shop) {
    shop.scrollIntoView({
      behavior: "smooth"
    });
  }
}


// =====================================================
// SEARCH
// =====================================================

function searchProducts(value = "") {
  const search =
    String(value)
      .toLowerCase()
      .trim();

  const category =
    document.getElementById(
      "categoryFilter"
    )?.value || "all";

  let result = [...products];

  if (category !== "all") {
    result =
      result.filter(product =>
        String(
          product.category ||
          product.categoryName ||
          ""
        )
        .toLowerCase() ===
        category.toLowerCase()
      );
  }

  if (search) {
    result =
      result.filter(product => {

        const text = `
          ${product.name || ""}
          ${product.title || ""}
          ${product.category || ""}
          ${product.description || ""}
          ${product.brand || ""}
        `.toLowerCase();

        return text.includes(search);
      });
  }

  renderProducts(result);
}


// =====================================================
// PRODUCT DETAILS
// =====================================================

function openProduct(id) {
  const product =
    products.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!product) {
    showToast(
      "Product পাওয়া যায়নি।",
      "error"
    );

    return;
  }

  const modal =
    document.getElementById(
      "productModal"
    );

  if (!modal) return;

  const image =
    getProductImage(product);

  const name =
    product.name ||
    product.title ||
    "Product";

  const price =
    Number(product.price || 0);

  const description =
    product.description ||
    "Premium quality footwear.";

  const modalName =
    document.getElementById(
      "modalProductName"
    );

  const modalPrice =
    document.getElementById(
      "modalProductPrice"
    );

  const modalDescription =
    document.getElementById(
      "modalProductDescription"
    );

  const modalImage =
    document.getElementById(
      "modalMainImage"
    );

  const modalQuantity =
    document.getElementById(
      "productQuantity"
    );

  if (modalName) {
    modalName.textContent = name;
  }

  if (modalPrice) {
    modalPrice.textContent =
      money(price);
  }

  if (modalDescription) {
    modalDescription.textContent =
      description;
  }

  if (modalImage) {
    modalImage.src =
      image ||
      "https://via.placeholder.com/600x600?text=No+Image";

    modalImage.alt = name;
  }

  if (modalQuantity) {
    modalQuantity.value = 1;
  }

  modal.dataset.productId =
    product.id;


  // -----------------------------
  // SIZES
  // -----------------------------

  const sizeContainer =
    document.getElementById(
      "sizeOptions"
    );

  if (sizeContainer) {

    const sizes =
      Array.isArray(product.sizes)
        ? product.sizes
        : typeof product.sizes === "string"
          ? product.sizes
              .split(",")
              .map(item => item.trim())
              .filter(Boolean)
          : [];

    sizeContainer.innerHTML =
      sizes.length
        ? sizes
            .map(
              (size, index) => `
                <button
                  type="button"
                  class="option-btn ${
                    index === 0
                      ? "active"
                      : ""
                  }"
                  onclick="window.selectOption(this,'size')"
                  data-value="${esc(size)}"
                >
                  ${esc(size)}
                </button>
              `
            )
            .join("")
        : `
          <span class="option-empty">
            Size not specified
          </span>
        `;
  }


  // -----------------------------
  // COLORS
  // -----------------------------

  const colorContainer =
    document.getElementById(
      "colorOptions"
    );

  if (colorContainer) {

    const colors =
      Array.isArray(product.colors)
        ? product.colors
        : typeof product.colors === "string"
          ? product.colors
              .split(",")
              .map(item => item.trim())
              .filter(Boolean)
          : [];

    colorContainer.innerHTML =
      colors.length
        ? colors
            .map(
              (color, index) => `
                <button
                  type="button"
                  class="option-btn ${
                    index === 0
                      ? "active"
                      : ""
                  }"
                  onclick="window.selectOption(this,'color')"
                  data-value="${esc(color)}"
                >
                  ${esc(color)}
                </button>
              `
            )
            .join("")
        : `
          <span class="option-empty">
            Color not specified
          </span>
        `;
  }


  // -----------------------------
  // THUMBNAILS
  // -----------------------------

  const thumbnails =
    document.getElementById(
      "productThumbnails"
    );

  if (thumbnails) {

    let images = [];

    if (
      Array.isArray(product.images) &&
      product.images.length
    ) {
      images =
        product.images
          .map(item =>
            typeof item === "string"
              ? item
              : item?.url || ""
          )
          .filter(Boolean);
    }

    if (
      images.length === 0 &&
      image
    ) {
      images = [image];
    }

    thumbnails.innerHTML =
      images
        .map(
          (url, index) => `
            <button
              type="button"
              class="thumbnail-btn ${
                index === 0
                  ? "active"
                  : ""
              }"
              onclick="window.changeMainImage('${esc(url)}',this)"
            >
              <img
                src="${esc(url)}"
                alt=""
              >
            </button>
          `
        )
        .join("");
  }

  modal.classList.add("active");

  document.body.classList.add(
    "modal-open"
  );
}


function closeProduct() {
  const modal =
    document.getElementById(
      "productModal"
    );

  if (modal) {
    modal.classList.remove("active");
  }

  document.body.classList.remove(
    "modal-open"
  );
}


function changeMainImage(
  url,
  button
) {
  const image =
    document.getElementById(
      "modalMainImage"
    );

  if (image) {
    image.src = url;
  }

  document
    .querySelectorAll(
      ".thumbnail-btn"
    )
    .forEach(btn =>
      btn.classList.remove(
        "active"
      )
    );

  if (button) {
    button.classList.add(
      "active"
    );
  }
}


function selectOption(
  button,
  type
) {
  const container =
    type === "size"
      ? document.getElementById(
          "sizeOptions"
        )
      : document.getElementById(
          "colorOptions"
        );

  if (!container) return;

  container
    .querySelectorAll(
      ".option-btn"
    )
    .forEach(btn =>
      btn.classList.remove(
        "active"
      )
    );

  button.classList.add("active");
}


function changeQuantity(amount) {
  const input =
    document.getElementById(
      "productQuantity"
    );

  if (!input) return;

  let value =
    Number(input.value || 1) +
    Number(amount || 0);

  if (value < 1) {
    value = 1;
  }

  input.value = value;
}


// =====================================================
// CART
// =====================================================

function addToCart(
  productId,
  quantity = null
) {
  const product =
    products.find(
      item =>
        String(item.id) ===
        String(productId)
    );

  if (!product) {
    showToast(
      "Product পাওয়া যায়নি।",
      "error"
    );

    return;
  }

  let qty =
    quantity !== null
      ? Number(quantity)
      : Number(
          document.getElementById(
            "productQuantity"
          )?.value || 1
        );

  qty = Math.max(
    1,
    Number(qty)
  );

  const size =
    document.querySelector(
      "#sizeOptions .option-btn.active"
    )?.dataset.value || "";

  const color =
    document.querySelector(
      "#colorOptions .option-btn.active"
    )?.dataset.value || "";

  const existing =
    cart.find(
      item =>
        String(item.productId) ===
          String(productId) &&
        String(item.size || "") ===
          String(size || "") &&
        String(item.color || "") ===
          String(color || "")
    );

  if (existing) {
    existing.quantity =
      Number(existing.quantity || 0) +
      qty;
  } else {
    cart.push({
      productId: product.id,
      name:
        product.name ||
        product.title ||
        "Product",
      price:
        Number(product.price || 0),
      image:
        getProductImage(product),
      size,
      color,
      quantity: qty
    });
  }

  saveCart();
  renderCart();

  showToast(
    "Product cart-এ যোগ হয়েছে।",
    "success"
  );

  closeProduct();
}


function renderCart() {
  const container =
    document.getElementById(
      "cartItems"
    );

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <h3>Your cart is empty</h3>
        <p>
          আপনার cart-এ এখনো কোনো product নেই।
        </p>
      </div>
    `;

    updateCartTotals();

    return;
  }

  container.innerHTML =
    cart
      .map(
        (item, index) => {

          const image =
            item.image ||
            "https://via.placeholder.com/120x120?text=No+Image";

          return `
            <div class="cart-item">

              <img
                src="${esc(image)}"
                alt="${esc(item.name)}"
              >

              <div class="cart-item-info">

                <h4>
                  ${esc(item.name)}
                </h4>

                ${
                  item.size
                    ? `
                      <small>
                        Size: ${esc(item.size)}
                      </small>
                    `
                    : ""
                }

                ${
                  item.color
                    ? `
                      <small>
                        Color: ${esc(item.color)}
                      </small>
                    `
                    : ""
                }

                <strong>
                  ${money(item.price)}
                </strong>

                <div class="cart-controls">

                  <button
                    type="button"
                    onclick="window.updateCartQuantity(${index},-1)"
                  >
                    −
                  </button>

                  <span>
                    ${Number(item.quantity || 1)}
                  </span>

                  <button
                    type="button"
                    onclick="window.updateCartQuantity(${index},1)"
                  >
                    +
                  </button>

                  <button
                    type="button"
                    onclick="window.removeCartItem(${index})"
                  >
                    Remove
                  </button>

                </div>

              </div>

            </div>
          `;
        }
      )
      .join("");

  updateCartTotals();
}


function updateCartQuantity(
  index,
  change
) {
  if (!cart[index]) return;

  cart[index].quantity =
    Number(cart[index].quantity || 1) +
    Number(change || 0);

  if (
    cart[index].quantity <= 0
  ) {
    cart.splice(index, 1);
  }

  saveCart();
  renderCart();
}


function removeCartItem(index) {
  if (!cart[index]) return;

  cart.splice(index, 1);

  saveCart();
  renderCart();

  showToast(
    "Product cart থেকে remove হয়েছে।",
    "success"
  );
}


function getCartSubtotal() {
  return cart.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
      Number(item.quantity || 1),
    0
  );
}


function updateCartTotals() {
  const subtotal =
    getCartSubtotal();

  const subtotalElement =
    document.getElementById(
      "cartSubtotal"
    );

  const totalElement =
    document.getElementById(
      "cartTotal"
    );

  if (subtotalElement) {
    subtotalElement.textContent =
      money(subtotal);
  }

  if (totalElement) {
    totalElement.textContent =
      money(subtotal);
  }
}


// =====================================================
// DELIVERY
// =====================================================

async function getDeliveryCharge() {
  try {
    const snapshot =
      await get(
        ref(
          db,
          "settings/deliveryCharge"
        )
      );

    if (snapshot.exists()) {
      return Number(
        snapshot.val() || 0
      );
    }

  } catch (error) {
    console.warn(
      "Delivery charge error:",
      error
    );
  }

  return 0;
}


// =====================================================
// CHECKOUT SUMMARY
// =====================================================

async function updateCheckoutSummary() {
  const subtotal =
    getCartSubtotal();

  const delivery =
    await getDeliveryCharge();

  const total =
    subtotal + delivery;

  const subtotalEl =
    document.getElementById(
      "checkoutSubtotal"
    );

  const deliveryEl =
    document.getElementById(
      "checkoutDelivery"
    );

  const totalEl =
    document.getElementById(
      "checkoutTotal"
    );

  if (subtotalEl) {
    subtotalEl.textContent =
      money(subtotal);
  }

  if (deliveryEl) {
    deliveryEl.textContent =
      money(delivery);
  }

  if (totalEl) {
    totalEl.textContent =
      money(total);
  }

  window.checkoutDelivery =
    delivery;

  window.checkoutTotal =
    total;

  return {
    subtotal,
    delivery,
    total
  };
}


// =====================================================
// REGISTER
// =====================================================

async function registerUser(
  email,
  password
) {
  try {
    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user =
      credential.user;

    await set(
      ref(
        db,
        `users/${user.uid}`
      ),
      {
        uid: user.uid,
        email: user.email,
        role:
          user.uid === ADMIN_UID
            ? "admin"
            : "user",
        createdAt: Date.now()
      }
    );

    showToast(
      "Account successfully created.",
      "success"
    );

    return user;

  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    showToast(
      getAuthErrorMessage(error),
      "error"
    );

    throw error;
  }
}


// =====================================================
// LOGIN
// =====================================================

async function loginUser(
  email,
  password
) {
  try {
    const credential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    showToast(
      "Login successful.",
      "success"
    );

    return credential.user;

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    showToast(
      getAuthErrorMessage(error),
      "error"
    );

    throw error;
  }
}


// =====================================================
// LOGOUT
// =====================================================

async function logoutUser() {
  try {
    await signOut(auth);

    showToast(
      "You have been logged out.",
      "success"
    );

  } catch (error) {
    console.error(
      "Logout error:",
      error
    );

    showToast(
      "Logout করতে সমস্যা হয়েছে।",
      "error"
    );
  }
}


// =====================================================
// AUTH ERROR
// =====================================================

function getAuthErrorMessage(error) {
  const code =
    error?.code || "";

  switch (code) {

    case "auth/email-already-in-use":
      return "এই email দিয়ে আগে থেকেই account আছে।";

    case "auth/invalid-email":
      return "সঠিক email address দিন।";

    case "auth/weak-password":
      return "Password কমপক্ষে 6 characters দিন।";

    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email অথবা password ভুল।";

    case "auth/too-many-requests":
      return "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।";

    default:
      return (
        error?.message ||
        "Authentication error হয়েছে।"
      );
  }
}


// =====================================================
// AUTH UI
// =====================================================

function updateAuthUI() {
  document
    .querySelectorAll(
      "[data-auth-user]"
    )
    .forEach(element => {
      element.textContent =
        currentUser?.email ||
        "Guest";
    });

  document
    .querySelectorAll(
      ".login-only"
    )
    .forEach(element => {
      element.style.display =
        currentUser
          ? ""
          : "none";
    });

  document
    .querySelectorAll(
      ".logout-only"
    )
    .forEach(element => {
      element.style.display =
        currentUser
          ? ""
          : "none";
    });

  const adminButton =
    document.getElementById(
      "adminPanelBtn"
    );

  if (adminButton) {
    adminButton.style.display =
      currentUser &&
      currentUser.uid === ADMIN_UID
        ? "inline-block"
        : "none";
  }
}


// =====================================================
// AUTH STATE
// =====================================================

onAuthStateChanged(
  auth,
  async user => {

    currentUser =
      user || null;

    syncGlobals();
    updateAuthUI();

    if (user) {
      console.log(
        "Logged in:",
        user.email
      );

      if (
        user.uid === ADMIN_UID
      ) {
        console.log(
          "ADMIN ACCOUNT DETECTED"
        );
      }
    } else {
      console.log(
        "No user logged in."
      );
    }
  }
);


// =====================================================
// CREATE ORDER
// =====================================================

async function createOrder(
  orderData = {}
) {
  if (!currentUser) {
    showToast(
      "Order করতে আগে login করুন।",
      "error"
    );

    throw new Error(
      "User is not logged in"
    );
  }

  if (cart.length === 0) {
    showToast(
      "Cart empty.",
      "error"
    );

    throw new Error(
      "Cart is empty"
    );
  }

  const summary =
    await updateCheckoutSummary();

  const order = {
    userId:
      currentUser.uid,

    userEmail:
      currentUser.email || "",

    customerName:
      orderData.customerName || "",

    phone:
      orderData.phone || "",

    address:
      orderData.address || "",

    note:
      orderData.note || "",

    paymentMethod:
      orderData.paymentMethod ||
      "Cash on Delivery",

    items:
      cart.map(item => ({
        productId:
          item.productId,

        name:
          item.name,

        price:
          Number(item.price || 0),

        quantity:
          Number(item.quantity || 1),

        size:
          item.size || "",

        color:
          item.color || "",

        image:
          item.image || ""
      })),

    subtotal:
      summary.subtotal,

    deliveryCharge:
      summary.delivery,

    total:
      summary.total,

    status:
      "Pending",

    createdAt:
      Date.now()
  };

  try {
    const ordersRef =
      ref(db, "orders");

    const newOrderRef =
      push(ordersRef);

    await set(
      newOrderRef,
      order
    );

    const orderId =
      newOrderRef.key;

    cart = [];

    saveCart();
    renderCart();

    await sendWhatsAppOrder({
      ...order,
      orderId
    });

    showToast(
      "Order successfully placed.",
      "success"
    );

    return orderId;

  } catch (error) {
    console.error(
      "Order creation error:",
      error
    );

    showToast(
      "Order create করতে সমস্যা হয়েছে।",
      "error"
    );

    throw error;
  }
}


// =====================================================
// WHATSAPP
// =====================================================

async function sendWhatsAppOrder(
  order
) {
  const lines = [];

  lines.push(
    "🛍️ *NEW ORDER - ROYALE STEPZ ZONE*"
  );

  lines.push("");

  lines.push(
    `Order ID: ${order.orderId || ""}`
  );

  lines.push(
    `Customer: ${order.customerName || ""}`
  );

  lines.push(
    `Phone: ${order.phone || ""}`
  );

  lines.push(
    `Address: ${order.address || ""}`
  );

  lines.push("");

  lines.push(
    "*Products:*"
  );

  order.items.forEach(
    (item, index) => {

      lines.push(
        `${index + 1}. ${item.name}`
      );

      lines.push(
        `   Qty: ${item.quantity}`
      );

      lines.push(
        `   Price: ${money(item.price)}`
      );

      if (item.size) {
        lines.push(
          `   Size: ${item.size}`
        );
      }

      if (item.color) {
        lines.push(
          `   Color: ${item.color}`
        );
      }
    }
  );

  lines.push("");

  lines.push(
    `Subtotal: ${money(order.subtotal)}`
  );

  lines.push(
    `Delivery: ${money(order.deliveryCharge)}`
  );

  lines.push(
    `*Total: ${money(order.total)}*`
  );

  if (order.note) {
    lines.push("");

    lines.push(
      `Note: ${order.note}`
    );
  }

  const message =
    lines.join("\n");

  const number =
    String(
      WHATSAPP_NUMBER || ""
    ).replace(
      /[^0-9]/g,
      ""
    );

  if (!number) {
    console.warn(
      "WhatsApp number is not configured."
    );

    return;
  }

  const url =
    `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  window.open(
    url,
    "_blank"
  );
}


// =====================================================
// MY ORDERS
// =====================================================

async function loadMyOrders() {
  const container =
    document.getElementById(
      "ordersList"
    );

  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="empty-state">
        <p>
          Orders দেখতে আগে login করুন।
        </p>
      </div>
    `;

    return;
  }

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
          <p>
            আপনি এখনো কোনো order করেননি।
          </p>
        </div>
      `;

      return;
    }

    const orders =
      Object.entries(
        snapshot.val()
      )
      .map(
        ([id, order]) => ({
          id,
          ...order
        })
      )
      .sort(
        (a, b) =>
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
      );

    container.innerHTML =
      orders
        .map(order => {

          const date =
            order.createdAt
              ? new Date(
                  order.createdAt
                ).toLocaleString()
              : "";

          return `
            <div class="order-card">

              <div class="order-header">

                <strong>
                  Order #${esc(order.id)}
                </strong>

                <span>
                  ${esc(
                    order.status ||
                    "Pending"
                  )}
                </span>

              </div>

              <div class="order-date">
                ${esc(date)}
              </div>

              <div class="order-items">

                ${
                  (order.items || [])
                    .map(item => `
                      <div class="order-item">

                        <span>
                          ${esc(item.name)}
                          ×
                          ${Number(
                            item.quantity || 1
                          )}
                        </span>

                        <strong>
                          ${money(
                            Number(item.price || 0) *
                            Number(item.quantity || 1)
                          )}
                        </strong>

                      </div>
                    `)
                    .join("")
                }

              </div>

              <div class="order-total">

                <span>
                  Total
                </span>

                <strong>
                  ${money(order.total)}
                </strong>

              </div>

            </div>
          `;
        })
        .join("");

  } catch (error) {
    console.error(
      "Load orders error:",
      error
    );

    container.innerHTML = `
      <div class="empty-state">
        <p>
          Orders load করতে সমস্যা হয়েছে।
        </p>
      </div>
    `;
  }
}


// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.openProduct =
  openProduct;

window.closeProduct =
  closeProduct;

window.changeMainImage =
  changeMainImage;

window.selectOption =
  selectOption;

window.changeQuantity =
  changeQuantity;

window.addToCart =
  addToCart;

window.renderCart =
  renderCart;

window.updateCartQuantity =
  updateCartQuantity;

window.removeCartItem =
  removeCartItem;

window.searchProducts =
  searchProducts;

window.filterCategory =
  filterCategory;

window.setCategory =
  setCategory;

window.registerUser =
  registerUser;

window.loginUser =
  loginUser;

window.logoutUser =
  logoutUser;

window.createOrder =
  createOrder;

window.loadMyOrders =
  loadMyOrders;

window.updateCheckoutSummary =
  updateCheckoutSummary;

window.showToast =
  showToast;

window.updateCartCount =
  updateCartCount;

window.loadProducts =
  loadProducts;


// =====================================================
// DOM READY
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "Royale Stepz Zone app.js started."
    );

    syncGlobals();

    updateCartCount();

    renderCart();

    loadProducts();


    // Search
    const searchInput =
      document.getElementById(
        "shopSearchInput"
      );

    if (searchInput) {
      searchInput.addEventListener(
        "input",
        event => {
          searchProducts(
            event.target.value
          );
        }
      );
    }


    // Category
    const categoryFilter =
      document.getElementById(
        "categoryFilter"
      );

    if (categoryFilter) {
      categoryFilter.addEventListener(
        "change",
        event => {
          filterCategory(
            event.target.value
          );
        }
      );
    }


    // Product modal outside click
    const productModal =
      document.getElementById(
        "productModal"
      );

    if (productModal) {
      productModal.addEventListener(
        "click",
        event => {

          if (
            event.target ===
            productModal
          ) {
            closeProduct();
          }

        }
      );
    }

  }
);
```
