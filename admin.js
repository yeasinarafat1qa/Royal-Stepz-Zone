/* =========================================================
   ROYALE STEPZ ZONE
   ADMIN PANEL JAVASCRIPT
   Firebase Storage ছাড়া Version
   ========================================================= */

import {
  auth,
  db,
  ADMIN_UID,
  onAuthStateChanged,
  signOut,
  ref,
  get,
  set,
  push,
  remove,
  update
} from "../firebase.js";


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let currentAdmin = null;

let products = {};
let orders = {};
let users = [];
let coupons = [];

let editingProductId = null;
let currentOrderId = null;

let storeSettings = {
  storeName: "Royale Stepz Zone",
  whatsappNumber: "",
  currency: "QAR",
  storePhone: "",
  storeEmail: "",
  deliveryCharge: 0
};


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupEvents();
});


/* =========================================================
   AUTHENTICATION
   ========================================================= */

onAuthStateChanged(auth, async (user) => {

  const loading = document.getElementById("accessLoading");
  const adminApp = document.getElementById("adminApp");

  if (!user) {

    if (loading) {
      loading.innerHTML = `
        <div style="font-size:45px;">🔒</div>
        <h2>Login Required</h2>
        <p>Admin Panel ব্যবহার করতে আগে Login করুন।</p>

        <button
          class="primary-btn"
          onclick="goToLogin()">
          Login
        </button>
      `;
    }

    return;
  }


  /* =====================================================
     ADMIN UID CHECK
     ===================================================== */

  if (!ADMIN_UID || user.uid !== ADMIN_UID) {

    console.error("ADMIN UID mismatch");
    console.log("Logged User UID:", user.uid);
    console.log("Configured ADMIN UID:", ADMIN_UID);

    if (loading) {
      loading.innerHTML = `
        <div style="font-size:45px;">🚫</div>

        <h2>Access Denied</h2>

        <p>
          আপনার এই Admin Panel ব্যবহার করার
          অনুমতি নেই।
        </p>

        <button
          class="secondary-btn"
          onclick="logoutAndHome()">
          Back to Website
        </button>
      `;
    }

    return;
  }


  /* =====================================================
     ADMIN VERIFIED
     ===================================================== */

  currentAdmin = user;


  const adminName =
    document.getElementById("adminName");

  const adminEmail =
    document.getElementById("adminEmail");

  const settingsAdminName =
    document.getElementById("settingsAdminName");

  const settingsAdminEmail =
    document.getElementById("settingsAdminEmail");


  if (adminName) {
    adminName.textContent =
      user.displayName || "Super Admin";
  }


  if (adminEmail) {
    adminEmail.textContent =
      user.email || "";
  }


  if (settingsAdminName) {
    settingsAdminName.textContent =
      user.displayName || "Super Admin";
  }


  if (settingsAdminEmail) {
    settingsAdminEmail.textContent =
      user.email || "";
  }


  if (loading) {
    loading.classList.add("hidden");
  }


  if (adminApp) {
    adminApp.classList.remove("hidden");
  }


  await initializeAdminPanel();

});


/* =========================================================
   LOGIN / LOGOUT
   ========================================================= */

function goToLogin() {
  window.location.href = "../login.html";
}

window.goToLogin = goToLogin;


async function logoutAndHome() {

  try {

    await signOut(auth);

    window.location.href = "../index.html";

  } catch (error) {

    console.error(error);

    showToast(
      "Logout করা যায়নি",
      "error"
    );

  }

}

window.logoutAndHome = logoutAndHome;


async function logoutAdmin() {

  try {

    await signOut(auth);

    window.location.href = "../login.html";

  } catch (error) {

    console.error(error);

    showToast(
      "Logout করা যায়নি",
      "error"
    );

  }

}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeAdminPanel() {

  try {

    await Promise.all([
      loadProducts(),
      loadOrders(),
      loadUsers(),
      loadCoupons(),
      loadSettings()
    ]);

    updateDashboard();

    showSection("dashboard");

  } catch (error) {

    console.error(
      "Initialization error:",
      error
    );

    showToast(
      "Admin Panel data load করতে সমস্যা হয়েছে",
      "error"
    );

  }

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

  const navItems =
    document.querySelectorAll(".nav-item");


  navItems.forEach(item => {

    item.addEventListener("click", () => {

      const section =
        item.dataset.section;

      if (section) {
        showSection(section);
      }

    });

  });


  const mobileMenuBtn =
    document.getElementById("mobileMenuBtn");


  if (mobileMenuBtn) {

    mobileMenuBtn.addEventListener(
      "click",
      () => {

        const sidebar =
          document.querySelector(".sidebar");

        if (sidebar) {

          sidebar.classList.toggle(
            "mobile-open"
          );

        }

      }
    );

  }

}


/* =========================================================
   SHOW SECTION
   ========================================================= */

function showSection(sectionName) {

  const sections =
    document.querySelectorAll(".admin-section");


  sections.forEach(section => {

    section.classList.remove(
      "active-section"
    );

  });


  const selected =
    document.getElementById(
      sectionName + "Section"
    );


  if (selected) {

    selected.classList.add(
      "active-section"
    );

  }


  const navItems =
    document.querySelectorAll(".nav-item");


  navItems.forEach(item => {

    item.classList.toggle(
      "active",
      item.dataset.section === sectionName
    );

  });


  const titles = {

    dashboard: [
      "Dashboard",
      "Royale Stepz Zone management panel"
    ],

    products: [
      "Products",
      "Manage your products"
    ],

    orders: [
      "Orders",
      "Manage customer orders"
    ],

    users: [
      "Users",
      "Manage website users"
    ],

    coupons: [
      "Coupons",
      "Manage discount coupons"
    ],

    settings: [
      "Settings",
      "Manage store settings"
    ]

  };


  if (titles[sectionName]) {

    const title =
      document.getElementById("pageTitle");

    const subtitle =
      document.getElementById("pageSubtitle");


    if (title) {
      title.textContent =
        titles[sectionName][0];
    }


    if (subtitle) {
      subtitle.textContent =
        titles[sectionName][1];
    }

  }


  const sidebar =
    document.querySelector(".sidebar");


  if (
    sidebar &&
    window.innerWidth <= 700
  ) {

    sidebar.classList.remove(
      "mobile-open"
    );

  }


  if (sectionName === "dashboard") {
    updateDashboard();
  }

  if (sectionName === "products") {
    renderProducts();
  }

  if (sectionName === "orders") {
    renderOrders();
  }

  if (sectionName === "users") {
    renderUsers();
  }

  if (sectionName === "coupons") {
    renderCoupons();
  }

}


window.showSection = showSection;


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

  /* Logout */

  const logoutBtn =
    document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener(
      "click",
      logoutAdmin
    );
  }


  /* Product Form */

  const productForm =
    document.getElementById("productForm");

  if (productForm) {
    productForm.addEventListener(
      "submit",
      handleProductSubmit
    );
  }


  /* Close Product Modal */

  const closeProductBtn =
    document.getElementById(
      "closeProductModal"
    );

  if (closeProductBtn) {

    closeProductBtn.addEventListener(
      "click",
      closeProductModal
    );

  }


  /* Product Image URL */

  const imageInput =
    document.getElementById(
      "productImageUrls"
    );

  if (imageInput) {

    imageInput.addEventListener(
      "input",
      updateImagePreview
    );

  }


  /* Product Search */

  const productSearch =
    document.getElementById(
      "productSearch"
    );

  if (productSearch) {

    productSearch.addEventListener(
      "input",
      renderProducts
    );

  }


  /* Category */

  const categoryFilter =
    document.getElementById(
      "productCategoryFilter"
    );

  if (categoryFilter) {

    categoryFilter.addEventListener(
      "change",
      renderProducts
    );

  }


  /* Order Search */

  const orderSearch =
    document.getElementById(
      "orderSearch"
    );

  if (orderSearch) {

    orderSearch.addEventListener(
      "input",
      renderOrders
    );

  }


  /* Order Status */

  const orderStatus =
    document.getElementById(
      "orderStatusFilter"
    );

  if (orderStatus) {

    orderStatus.addEventListener(
      "change",
      renderOrders
    );

  }


  /* Coupon Form */

  const couponForm =
    document.getElementById(
      "couponForm"
    );

  if (couponForm) {

    couponForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        await addCoupon();

      }
    );

  }


  /* Delivery Settings */

  const deliveryForm =
    document.getElementById(
      "deliverySettingsForm"
    );

  if (deliveryForm) {

    deliveryForm.addEventListener(
      "submit",
      handleDeliverySettings
    );

  }

}


/* =========================================================
   DASHBOARD LOAD
   ========================================================= */

async function loadDashboard() {

  try {

    await Promise.all([
      loadProducts(),
      loadOrders(),
      loadUsers(),
      loadCoupons()
    ]);

    updateDashboard();

    showToast(
      "Dashboard refreshed",
      "success"
    );

  } catch (error) {

    console.error(error);

    showToast(
      "Dashboard refresh failed",
      "error"
    );

  }

}

window.loadDashboard = loadDashboard;


/* =========================================================
   PRODUCTS LOAD
   ========================================================= */

async function loadProducts() {

  try {

    const snapshot =
      await get(
        ref(db, "products")
      );


    products =
      snapshot.exists()
        ? snapshot.val()
        : {};


    renderProducts();

  } catch (error) {

    console.error(
      "Products error:",
      error
    );

    showToast(
      "Products load করা যায়নি",
      "error"
    );

  }

}


/* =========================================================
   PRODUCTS RENDER
   ========================================================= */

function renderProducts() {

  const grid =
    document.getElementById(
      "adminProductsGrid"
    );


  if (!grid) return;


  const search =
    (
      document.getElementById(
        "productSearch"
      )?.value || ""
    )
      .toLowerCase()
      .trim();


  const category =
    document.getElementById(
      "productCategoryFilter"
    )?.value || "all";


  let list =
    Object.entries(products);


  list =
    list.filter(([id, product]) => {

      const name =
        String(
          product.name || ""
        ).toLowerCase();


      const productCategory =
        String(
          product.category || ""
        );


      const matchesSearch =
        !search ||
        name.includes(search) ||
        productCategory
          .toLowerCase()
          .includes(search);


      const matchesCategory =
        category === "all" ||
        productCategory === category;


      return (
        matchesSearch &&
        matchesCategory
      );

    });


  if (!list.length) {

    grid.innerHTML = `
      <div class="loading-card">
        কোনো Product পাওয়া যায়নি।
      </div>
    `;

    return;

  }


  grid.innerHTML =
    list.map(([id, product]) => {

      const image =
        product.image ||
        product.images?.[0]?.url ||
        "";


      const price =
        Number(
          product.price || 0
        );


      const oldPrice =
        Number(
          product.oldPrice || 0
        );


      return `

        <div class="admin-product-card">

          <div class="admin-product-image">

            ${
              image
                ? `
                  <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(
                      product.name ||
                      "Product"
                    )}"
                    onerror="this.style.display='none'">
                `
                : `
                  <div style="
                    height:100%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:45px;">
                    👟
                  </div>
                `
            }

            ${
              product.featured
                ? `
                  <span class="product-featured">
                    ⭐ Featured
                  </span>
                `
                : ""
            }

          </div>


          <div class="admin-product-info">

            <h3>
              ${escapeHTML(
                product.name ||
                "Unnamed Product"
              )}
            </h3>


            <div class="product-category">
              ${escapeHTML(
                product.category ||
                "Uncategorized"
              )}
            </div>


            <div class="product-price">

              <strong>
                ${escapeHTML(
                  storeSettings.currency
                )}
                ${price.toFixed(2)}
              </strong>


              ${
                oldPrice > price
                  ? `
                    <span class="product-old-price">
                      ${escapeHTML(
                        storeSettings.currency
                      )}
                      ${oldPrice.toFixed(2)}
                    </span>
                  `
                  : ""
              }

            </div>


            <div class="product-stock">
              Stock:
              ${Number(
                product.stock || 0
              )}
            </div>


            <div class="product-actions">

              <button
                type="button"
                onclick="editProduct('${id}')">
                ✏️ Edit
              </button>


              <button
                type="button"
                class="delete-btn"
                onclick="deleteProduct('${id}')">
                🗑️ Delete
              </button>

            </div>

          </div>

        </div>

      `;

    }).join("");

}


/* =========================================================
   OPEN PRODUCT MODAL
   ========================================================= */

function openProductModal(product = null) {

  const modal =
    document.getElementById(
      "productModal"
    );


  if (!modal) return;


  editingProductId =
    product?.id || null;


  const title =
    document.getElementById(
      "productModalTitle"
    );


  if (title) {

    title.textContent =
      product
        ? "Edit Product"
        : "Add New Product";

  }


  const productId =
    document.getElementById(
      "productId"
    );


  if (productId) {

    productId.value =
      product?.id || "";

  }


  const name =
    document.getElementById(
      "productName"
    );

  const category =
    document.getElementById(
      "productCategory"
    );

  const price =
    document.getElementById(
      "productPrice"
    );

  const oldPrice =
    document.getElementById(
      "productOldPrice"
    );

  const stock =
    document.getElementById(
      "productStock"
    );

  const sizes =
    document.getElementById(
      "productSizes"
    );

  const colors =
    document.getElementById(
      "productColors"
    );

  const description =
    document.getElementById(
      "productDescription"
    );

  const featured =
    document.getElementById(
      "productFeatured"
    );

  const imageUrls =
    document.getElementById(
      "productImageUrls"
    );


  if (name) {
    name.value =
      product?.name || "";
  }


  if (category) {
    category.value =
      product?.category || "";
  }


  if (price) {
    price.value =
      product?.price ?? "";
  }


  if (oldPrice) {
    oldPrice.value =
      product?.oldPrice ?? "";
  }


  if (stock) {
    stock.value =
      product?.stock ?? "";
  }


  if (sizes) {

    sizes.value =
      Array.isArray(product?.sizes)
        ? product.sizes.join(", ")
        : product?.sizes || "";

  }


  if (colors) {

    colors.value =
      Array.isArray(product?.colors)
        ? product.colors.join(", ")
        : product?.colors || "";

  }


  if (description) {

    description.value =
      product?.description || "";

  }


  if (featured) {

    featured.checked =
      Boolean(
        product?.featured
      );

  }


  if (imageUrls) {

    let urls = [];


    if (
      Array.isArray(
        product?.images
      )
    ) {

      urls =
        product.images
          .map(image => {

            if (
              typeof image === "string"
            ) {
              return image;
            }

            return image?.url || "";

          })
          .filter(Boolean);

    }


    if (
      !urls.length &&
      product?.image
    ) {

      urls.push(
        product.image
      );

    }


    imageUrls.value =
      urls.join("\n");

  }


  updateImagePreview();


  modal.classList.remove("hidden");
  modal.classList.add("active");
  modal.style.display = "flex";

}


window.openProductModal =
  openProductModal;


/* =========================================================
   CLOSE PRODUCT MODAL
   ========================================================= */

function closeProductModal() {

  const modal =
    document.getElementById(
      "productModal"
    );


  if (!modal) return;


  modal.classList.remove(
    "active"
  );

  modal.classList.add(
    "hidden"
  );

  modal.style.display =
    "none";


  editingProductId =
    null;


  const form =
    document.getElementById(
      "productForm"
    );


  if (form) {
    form.reset();
  }


  const preview =
    document.getElementById(
      "imagePreview"
    );


  if (preview) {
    preview.innerHTML = "";
  }

}


window.closeProductModal =
  closeProductModal;


/* =========================================================
   SAVE PRODUCT
   ========================================================= */

async function handleProductSubmit(event) {

  event.preventDefault();


  if (!currentAdmin) {

    showToast(
      "Admin login required",
      "error"
    );

    return;

  }


  const saveButton =
    document.getElementById(
      "saveProductBtn"
    );


  if (saveButton) {

    saveButton.disabled = true;
    saveButton.textContent =
      "Saving...";

  }


  try {

    const name =
      document.getElementById(
        "productName"
      )?.value.trim() || "";


    const category =
      document.getElementById(
        "productCategory"
      )?.value || "";


    const price =
      Number(
        document.getElementById(
          "productPrice"
        )?.value || 0
      );


    const oldPrice =
      Number(
        document.getElementById(
          "productOldPrice"
        )?.value || 0
      );


    const stock =
      Number(
        document.getElementById(
          "productStock"
        )?.value || 0
      );


    const sizes =
      (
        document.getElementById(
          "productSizes"
        )?.value || ""
      )
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);


    const colors =
      (
        document.getElementById(
          "productColors"
        )?.value || ""
      )
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);


    const description =
      document.getElementById(
        "productDescription"
      )?.value.trim() || "";


    const featured =
      document.getElementById(
        "productFeatured"
      )?.checked || false;


    if (!name) {

      showToast(
        "Product name দিন",
        "error"
      );

      return;

    }


    if (price <= 0) {

      showToast(
        "Valid product price দিন",
        "error"
      );

      return;

    }


    const imageUrls =
      getImageUrlsFromInput();


    const finalImages =
      imageUrls.map(url => ({
        url: url,
        path: ""
      }));


    const productData = {

      name,
      category,
      price,
      oldPrice,
      stock,
      sizes,
      colors,
      description,
      featured,

      images:
        finalImages,

      image:
        finalImages[0]?.url || "",

      imagePath: "",

      updatedAt:
        Date.now()

    };


    /* =====================================================
       EDIT
       ===================================================== */

    if (editingProductId) {

      await update(
        ref(
          db,
          `products/${editingProductId}`
        ),
        productData
      );


      showToast(
        "Product successfully updated",
        "success"
      );

    }


    /* =====================================================
       ADD
       ===================================================== */

    else {

      productData.createdAt =
        Date.now();


      const productRef =
        push(
          ref(
            db,
            "products"
          )
        );


      await set(
        productRef,
        productData
      );


      showToast(
        "Product successfully added",
        "success"
      );

    }


    await loadProducts();

    updateDashboard();

    closeProductModal();


  } catch (error) {

    console.error(
      "Product save error:",
      error
    );

    showToast(
      error.message ||
      "Product save করা যায়নি",
      "error"
    );

  } finally {

    if (saveButton) {

      saveButton.disabled = false;

      saveButton.textContent =
        "💾 Save Product";

    }

  }

}


/* =========================================================
   EDIT PRODUCT
   ========================================================= */

function editProduct(productId) {

  const product =
    products[productId];


  if (!product) {

    showToast(
      "Product পাওয়া যায়নি",
      "error"
    );

    return;

  }


  openProductModal({
    id: productId,
    ...product
  });

}

window.editProduct =
  editProduct;


/* =========================================================
   DELETE PRODUCT
   ========================================================= */

async function deleteProduct(productId) {

  const product =
    products[productId];


  if (!product) {

    showToast(
      "Product পাওয়া যায়নি",
      "error"
    );

    return;

  }


  if (
    !confirm(
      `"${product.name}" product টি delete করতে চান?`
    )
  ) {
    return;
  }


  try {

    await remove(
      ref(
        db,
        `products/${productId}`
      )
    );


    showToast(
      "Product deleted successfully",
      "success"
    );


    await loadProducts();

    updateDashboard();


  } catch (error) {

    console.error(error);

    showToast(
      "Product delete করা যায়নি",
      "error"
    );

  }

}

window.deleteProduct =
  deleteProduct;


/* =========================================================
   IMAGE URL
   ========================================================= */

function getImageUrlsFromInput() {

  const input =
    document.getElementById(
      "productImageUrls"
    );


  if (!input) return [];


  return input.value
    .split("\n")
    .map(url => url.trim())
    .filter(Boolean);

}


/* =========================================================
   IMAGE PREVIEW
   ========================================================= */

function updateImagePreview() {

  const input =
    document.getElementById(
      "productImageUrls"
    );

  const preview =
    document.getElementById(
      "imagePreview"
    );


  if (!input || !preview) return;


  const urls =
    input.value
      .split("\n")
      .map(url => url.trim())
      .filter(Boolean);


  preview.innerHTML = "";


  urls.forEach((url, index) => {

    const wrapper =
      document.createElement("div");


    wrapper.className =
      "image-preview-item";


    const img =
      document.createElement("img");


    img.src = url;

    img.alt =
      `Product image ${index + 1}`;


    img.onerror = () => {

      wrapper.innerHTML = `
        <div style="
          padding:12px;
          color:#c00;
          background:#fff0f0;
          border-radius:8px;">
          ❌ Image load failed
        </div>
      `;

    };


    wrapper.appendChild(img);

    preview.appendChild(wrapper);

  });

}


/* =========================================================
   ORDERS LOAD
   ========================================================= */

async function loadOrders() {

  try {

    const snapshot =
      await get(
        ref(db, "orders")
      );


    orders =
      snapshot.exists()
        ? snapshot.val()
        : {};


    renderOrders();
    renderRecentOrders();


  } catch (error) {

    console.error(
      "Orders error:",
      error
    );

    showToast(
      "Orders load করা যায়নি",
      "error"
    );

  }

}

window.loadOrders =
  loadOrders;


/* =========================================================
   RENDER ORDERS
   ========================================================= */

function renderOrders() {

  const tbody =
    document.getElementById(
      "ordersTable"
    );


  if (!tbody) return;


  const search =
    (
      document.getElementById(
        "orderSearch"
      )?.value || ""
    )
      .toLowerCase()
      .trim();


  const statusFilter =
    document.getElementById(
      "orderStatusFilter"
    )?.value || "all";


  let list =
    Object.entries(orders);


  list.sort((a, b) => {

    return Number(
      b[1].createdAt || 0
    ) -
    Number(
      a[1].createdAt || 0
    );

  });


  list =
    list.filter(([id, order]) => {

      const customer =
        String(
          order.customerName ||
          order.name ||
          ""
        ).toLowerCase();


      const phone =
        String(
          order.phone ||
          order.customerPhone ||
          ""
        ).toLowerCase();


      const orderStatus =
        String(
          order.status ||
          "Pending"
        );


      const matchesSearch =
        !search ||
        id.toLowerCase().includes(search) ||
        customer.includes(search) ||
        phone.includes(search);


      const matchesStatus =
        statusFilter === "all" ||
        orderStatus.toLowerCase() ===
        statusFilter.toLowerCase();


      return (
        matchesSearch &&
        matchesStatus
      );

    });


  if (!list.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="8"
            class="empty-cell">
          কোনো Order পাওয়া যায়নি।
        </td>
      </tr>
    `;

    return;

  }


  tbody.innerHTML =
    list.map(([id, order]) => {

      const items =
        Array.isArray(order.items)
          ? order.items
          : [];


      const itemCount =
        items.reduce(
          (sum, item) =>
            sum +
            Number(
              item.quantity || 1
            ),
          0
        );


      const total =
        Number(
          order.total ||
          order.amount ||
          0
        );


      return `

        <tr>

          <td>
            <strong>
              #${escapeHTML(
                id
                  .slice(-8)
                  .toUpperCase()
              )}
            </strong>
          </td>

          <td>
            ${escapeHTML(
              order.customerName ||
              order.name ||
              "-"
            )}
          </td>

          <td>
            ${escapeHTML(
              order.phone ||
              order.customerPhone ||
              "-"
            )}
          </td>

          <td>
            ${itemCount}
          </td>

          <td>
            <strong>
              ${escapeHTML(
                storeSettings.currency
              )}
              ${total.toFixed(2)}
            </strong>
          </td>

          <td>
            ${statusBadge(
              order.status
            )}
          </td>

          <td>
            ${formatDate(
              order.createdAt
            )}
          </td>

          <td>

            <button
              class="table-action-btn"
              onclick="openOrderModal('${id}')">
              👁️ View
            </button>

          </td>

        </tr>

      `;

    }).join("");

}


/* =========================================================
   RECENT ORDERS
   ========================================================= */

function renderRecentOrders() {

  const tbody =
    document.getElementById(
      "recentOrdersTable"
    );


  if (!tbody) return;


  const list =
    Object.entries(orders)
      .sort((a, b) =>
        Number(
          b[1].createdAt || 0
        ) -
        Number(
          a[1].createdAt || 0
        )
      )
      .slice(0, 5);


  if (!list.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="4"
            class="empty-cell">
          No orders yet.
        </td>
      </tr>
    `;

    return;

  }


  tbody.innerHTML =
    list.map(([id, order]) => {

      return `

        <tr>

          <td>
            #${escapeHTML(
              id
                .slice(-8)
                .toUpperCase()
            )}
          </td>

          <td>
            ${escapeHTML(
              order.customerName ||
              order.name ||
              "-"
            )}
          </td>

          <td>
            ${escapeHTML(
              storeSettings.currency
            )}
            ${Number(
              order.total ||
              order.amount ||
              0
            ).toFixed(2)}
          </td>

          <td>
            ${statusBadge(
              order.status
            )}
          </td>

        </tr>

      `;

    }).join("");

}


/* =========================================================
   ORDER MODAL
   ========================================================= */

function openOrderModal(orderId) {

  currentOrderId =
    orderId;


  const order =
    orders[orderId];


  if (!order) {

    showToast(
      "Order পাওয়া যায়নি",
      "error"
    );

    return;

  }


  const modal =
    document.getElementById(
      "orderModal"
    );


  const content =
    document.getElementById(
      "orderDetailsContent"
    );


  const modalId =
    document.getElementById(
      "orderModalId"
    );


  if (!modal || !content) return;


  const items =
    Array.isArray(order.items)
      ? order.items
      : [];


  const total =
    Number(
      order.total ||
      order.amount ||
      0
    );


  if (modalId) {

    modalId.textContent =
      `#${orderId
        .slice(-8)
        .toUpperCase()}`;

  }


  const itemsHTML =
    items.length
      ? items.map(item => {

          const name =
            escapeHTML(
              item.name ||
              item.productName ||
              "Product"
            );


          const quantity =
            Number(
              item.quantity || 1
            );


          const price =
            Number(
              item.price || 0
            );


          return `
            <div style="
              display:flex;
              justify-content:space-between;
              gap:15px;
              padding:10px 0;
              border-bottom:1px solid #eee;">

              <span>
                ${name} × ${quantity}
              </span>

              <strong>
                ${escapeHTML(
                  storeSettings.currency
                )}
                ${(price * quantity).toFixed(2)}
              </strong>

            </div>
          `;

        }).join("")
      : "<p>No product information</p>";


  content.innerHTML = `

    <div class="order-details">

      <p>
        <strong>Customer:</strong><br>
        ${escapeHTML(
          order.customerName ||
          order.name ||
          "-"
        )}
      </p>


      <p>
        <strong>Phone:</strong><br>
        ${escapeHTML(
          order.phone ||
          order.customerPhone ||
          "-"
        )}
      </p>


      <p>
        <strong>Address:</strong><br>
        ${escapeHTML(
          order.address ||
          "-"
        )}
      </p>


      <p>
        <strong>Date:</strong><br>
        ${formatDate(
          order.createdAt
        )}
      </p>


      <h4>Products</h4>

      <div>
        ${itemsHTML}
      </div>


      <h3 style="margin-top:20px;">
        Total:
        ${escapeHTML(
          storeSettings.currency
        )}
        ${total.toFixed(2)}
      </h3>


      <div style="
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        margin-top:20px;">

        <select
          onchange="updateOrderStatus(
            '${orderId}',
            this.value
          )">

          ${orderStatusOption(
            "Pending",
            order.status
          )}

          ${orderStatusOption(
            "Confirmed",
            order.status
          )}

          ${orderStatusOption(
            "Processing",
            order.status
          )}

          ${orderStatusOption(
            "Shipped",
            order.status
          )}

          ${orderStatusOption(
            "Delivered",
            order.status
          )}

          ${orderStatusOption(
            "Cancelled",
            order.status
          )}

        </select>


        <button
          onclick="sendOrderToWhatsApp('${orderId}')">
          💬 WhatsApp
        </button>


        <button
          class="delete-btn"
          onclick="deleteOrder('${orderId}')">
          🗑️ Delete
        </button>

      </div>

    </div>

  `;


  modal.classList.remove("hidden");
  modal.classList.add("active");
  modal.style.display = "flex";

}

window.openOrderModal =
  openOrderModal;


/* =========================================================
   ORDER STATUS OPTION
   ========================================================= */

function orderStatusOption(
  value,
  current
) {

  const selected =
    String(
      current || "Pending"
    ).toLowerCase() ===
    value.toLowerCase()
      ? "selected"
      : "";


  return `
    <option
      value="${value}"
      ${selected}>
      ${value}
    </option>
  `;

}


/* =========================================================
   CLOSE ORDER MODAL
   ========================================================= */

function closeOrderModal() {

  const modal =
    document.getElementById(
      "orderModal"
    );


  if (!modal) return;


  modal.classList.remove(
    "active"
  );

  modal.classList.add(
    "hidden"
  );

  modal.style.display =
    "none";


  currentOrderId =
    null;

}

window.closeOrderModal =
  closeOrderModal;


/* =========================================================
   UPDATE ORDER STATUS
   ========================================================= */

async function updateOrderStatus(
  orderId,
  newStatus
) {

  if (!orderId || !newStatus) {
    return;
  }


  try {

    await update(
      ref(
        db,
        `orders/${orderId}`
      ),
      {
        status: newStatus,
        updatedAt: Date.now()
      }
    );


    showToast(
      "Order status updated",
      "success"
    );


    await loadOrders();

    updateDashboard();


  } catch (error) {

    console.error(error);

    showToast(
      "Order status update করা যায়নি",
      "error"
    );

  }

}

window.updateOrderStatus =
  updateOrderStatus;


/* =========================================================
   DELETE ORDER
   ========================================================= */

async function deleteOrder(orderId) {

  if (
    !confirm(
      "আপনি কি এই order টি delete করতে চান?"
    )
  ) {
    return;
  }


  try {

    await remove(
      ref(
        db,
        `orders/${orderId}`
      )
    );


    showToast(
      "Order deleted successfully",
      "success"
    );


    closeOrderModal();

    await loadOrders();

    updateDashboard();


  } catch (error) {

    console.error(error);

    showToast(
      "Order delete করা যায়নি",
      "error"
    );

  }

}

window.deleteOrder =
  deleteOrder;


/* =========================================================
   WHATSAPP
   ========================================================= */

function sendOrderToWhatsApp(orderId) {

  const order =
    orders[orderId];


  if (!order) {

    showToast(
      "Order পাওয়া যায়নি",
      "error"
    );

    return;

  }


  const number =
    String(
      storeSettings.whatsappNumber || ""
    )
      .replace(/\D/g, "");


  if (!number) {

    showToast(
      "WhatsApp number Settings-এ দিন",
      "error"
    );

    return;

  }


  const customer =
    order.customerName ||
    order.name ||
    "Customer";


  const phone =
    order.phone ||
    order.customerPhone ||
    "";


  const total =
    Number(
      order.total ||
      order.amount ||
      0
    );


  const message =
`Hello Royale Stepz Zone,

Order ID: ${orderId}

Customer: ${customer}

Phone: ${phone}

Total: ${total.toFixed(2)} ${storeSettings.currency}

Please confirm this order.`;


  const url =
    `https://wa.me/${number}?text=${encodeURIComponent(
      message
    )}`;


  window.open(
    url,
    "_blank"
  );

}

window.sendOrderToWhatsApp =
  sendOrderToWhatsApp;


/* =========================================================
   USERS LOAD
   ========================================================= */

async function loadUsers() {

  try {

    const snapshot =
      await get(
        ref(db, "users")
      );


    if (!snapshot.exists()) {

      users = [];

      renderUsers();

      return;

    }


    const data =
      snapshot.val();


    users =
      Object.entries(data)
        .map(([id, user]) => ({
          id,
          ...user
        }));


    renderUsers();


  } catch (error) {

    console.error(
      "Users error:",
      error
    );

    showToast(
      "Users load করা যায়নি",
      "error"
    );

  }

}

window.loadUsers =
  loadUsers;


/* =========================================================
   USERS RENDER
   ========================================================= */

function renderUsers() {

  const table =
    document.getElementById(
      "usersTable"
    );


  if (!table) return;


  if (!users.length) {

    table.innerHTML = `
      <tr>
        <td colspan="5"
            style="
              text-align:center;
              padding:30px;">
          No users found
        </td>
      </tr>
    `;

    return;

  }


  table.innerHTML =
    users.map(user => {

      const role =
        user.role ||
        (
          user.id === ADMIN_UID
            ? "admin"
            : "user"
        );


      return `

        <tr>

          <td>
            ${escapeHTML(
              user.name ||
              user.displayName ||
              "Unknown User"
            )}
          </td>


          <td>
            ${escapeHTML(
              user.email ||
              "No email"
            )}
          </td>


          <td>
            ${escapeHTML(
              user.phone ||
              "N/A"
            )}
          </td>


          <td>
            ${formatDate(
              user.createdAt
            )}
          </td>


          <td>
            ${escapeHTML(
              user.id
            )}
          </td>

        </tr>

      `;

    }).join("");

}

window.renderUsers =
  renderUsers;


/* =========================================================
   DELETE USER
   ========================================================= */

async function deleteUser(userId) {

  if (!currentAdmin) {
    return;
  }


  if (userId === ADMIN_UID) {

    showToast(
      "Main Admin delete করা যাবে না",
      "error"
    );

    return;

  }


  if (
    !confirm(
      "আপনি কি এই user-এর data delete করতে চান?"
    )
  ) {
    return;
  }


  try {

    await remove(
      ref(
        db,
        `users/${userId}`
      )
    );


    showToast(
      "User successfully deleted",
      "success"
    );


    await loadUsers();

    updateDashboard();


  } catch (error) {

    console.error(error);

    showToast(
      "User delete করা যায়নি",
      "error"
    );

  }

}

window.deleteUser =
  deleteUser;


/* =========================================================
   COUPONS LOAD
   ========================================================= */

async function loadCoupons() {

  try {

    const snapshot =
      await get(
        ref(db, "coupons")
      );


    if (!snapshot.exists()) {

      coupons = [];

      renderCoupons();

      return;

    }


    coupons =
      Object.entries(
        snapshot.val()
      ).map(([id, coupon]) => ({
        id,
        ...coupon
      }));


    renderCoupons();


  } catch (error) {

    console.error(error);

    showToast(
      "Coupons load করা যায়নি",
      "error"
    );

  }

}

window.loadCoupons =
  loadCoupons;


/* =========================================================
   COUPONS RENDER
   ========================================================= */

function renderCoupons() {

  const grid =
    document.getElementById(
      "couponsGrid"
    );


  if (!grid) return;


  if (!coupons.length) {

    grid.innerHTML = `
      <div class="loading-card">
        কোনো Coupon পাওয়া যায়নি।
      </div>
    `;

    return;

  }


  grid.innerHTML =
    coupons.map(coupon => {

      const type =
        coupon.type || "percent";


      const value =
        Number(
          coupon.value ??
          coupon.discount ??
          0
        );


      const active =
        coupon.active !== false;


      return `

        <div class="admin-product-card">

          <div class="admin-product-info">

            <h3>
              🎟️ ${escapeHTML(
                coupon.code || ""
              )}
            </h3>


            <p>
              Discount:
              <strong>
                ${value}
                ${
                  type === "percent"
                    ? "%"
                    : " QAR"
                }
              </strong>
            </p>


            <p>
              Minimum Order:
              ${Number(
                coupon.minOrder || 0
              ).toFixed(2)}
              ${escapeHTML(
                storeSettings.currency
              )}
            </p>


            <p>
              Expiry:
              ${
                coupon.expiry
                  ? formatDate(
                      coupon.expiry
                    )
                  : "No expiry"
              }
            </p>


            <p>
              Status:
              <strong>
                ${
                  active
                    ? "Active"
                    : "Inactive"
                }
              </strong>
            </p>


            <div class="product-actions">

              <button
                type="button"
                class="delete-btn"
                onclick="deleteCoupon('${coupon.id}')">
                🗑️ Delete
              </button>

            </div>

          </div>

        </div>

      `;

    }).join("");

}


/* =========================================================
   OPEN COUPON MODAL
   ========================================================= */

function openCouponModal() {

  const modal =
    document.getElementById(
      "couponModal"
    );


  if (!modal) return;


  const form =
    document.getElementById(
      "couponForm"
    );


  if (form) {
    form.reset();
  }


  modal.classList.remove("hidden");
  modal.classList.add("active");
  modal.style.display = "flex";

}

window.openCouponModal =
  openCouponModal;


/* =========================================================
   CLOSE COUPON MODAL
   ========================================================= */

function closeCouponModal() {

  const modal =
    document.getElementById(
      "couponModal"
    );


  if (!modal) return;


  modal.classList.remove(
    "active"
  );

  modal.classList.add(
    "hidden"
  );

  modal.style.display =
    "none";

}

window.closeCouponModal =
  closeCouponModal;


/* =========================================================
   ADD COUPON
   ========================================================= */

async function addCoupon() {

  const code =
    document.getElementById(
      "couponCode"
    )?.value
      .trim()
      .toUpperCase();


  const type =
    document.getElementById(
      "couponType"
    )?.value ||
    "percent";


  const value =
    Number(
      document.getElementById(
        "couponValue"
      )?.value || 0
    );


  const minOrder =
    Number(
      document.getElementById(
        "couponMinOrder"
      )?.value || 0
    );


  const maxDiscount =
    Number(
      document.getElementById(
        "couponMaxDiscount"
      )?.value || 0
    );


  const expiry =
    document.getElementById(
      "couponExpiry"
    )?.value || "";


  const active =
    document.getElementById(
      "couponActive"
    )?.checked !== false;


  if (!code) {

    showToast(
      "Coupon code দিন",
      "error"
    );

    return;

  }


  if (value <= 0) {

    showToast(
      "Valid coupon value দিন",
      "error"
    );

    return;

  }


  if (
    type === "percent" &&
    value > 100
  ) {

    showToast(
      "Percentage 100-এর বেশি হতে পারবে না",
      "error"
    );

    return;

  }


  try {

    const couponRef =
      push(
        ref(
          db,
          "coupons"
        )
      );


    await set(
      couponRef,
      {

        code,

        type,

        value,

        discount:
          value,

        minOrder,

        maxDiscount,

        expiry,

        active,

        usedCount: 0,

        createdAt:
          Date.now(),

        updatedAt:
          Date.now()

      }
    );


    showToast(
      "Coupon successfully added",
      "success"
    );


    closeCouponModal();

    await loadCoupons();


  } catch (error) {

    console.error(error);

    showToast(
      "Coupon add করা যায়নি",
      "error"
    );

  }

}

window.addCoupon =
  addCoupon;


/* =========================================================
   DELETE COUPON
   ========================================================= */

async function deleteCoupon(couponId) {

  if (
    !confirm(
      "আপনি কি এই coupon delete করতে চান?"
    )
  ) {
    return;
  }


  try {

    await remove(
      ref(
        db,
        `coupons/${couponId}`
      )
    );


    showToast(
      "Coupon deleted successfully",
      "success"
    );


    await loadCoupons();


  } catch (error) {

    console.error(error);

    showToast(
      "Coupon delete করা যায়নি",
      "error"
    );

  }

}

window.deleteCoupon =
  deleteCoupon;


/* =========================================================
   SETTINGS LOAD
   ========================================================= */

async function loadSettings() {

  try {

    const snapshot =
      await get(
        ref(db, "settings")
      );


    if (snapshot.exists()) {

      storeSettings = {
        ...storeSettings,
        ...snapshot.val()
      };

    }


    const deliveryCharge =
      document.getElementById(
        "deliveryCharge"
      );


    if (deliveryCharge) {

      deliveryCharge.value =
        storeSettings.deliveryCharge || 0;

    }


  } catch (error) {

    console.error(
      "Settings error:",
      error
    );

  }

}


/* =========================================================
   DELIVERY SETTINGS
   ========================================================= */

async function handleDeliverySettings(event) {

  event.preventDefault();


  const deliveryCharge =
    Number(
      document.getElementById(
        "deliveryCharge"
      )?.value || 0
    );


  if (deliveryCharge < 0) {

    showToast(
      "Delivery charge সঠিকভাবে দিন",
      "error"
    );

    return;

  }


  try {

    storeSettings.deliveryCharge =
      deliveryCharge;


    await update(
      ref(db, "settings"),
      {
        deliveryCharge,
        updatedAt: Date.now()
      }
    );


    showToast(
      "Delivery settings saved",
      "success"
    );


  } catch (error) {

    console.error(error);

    showToast(
      "Delivery settings save করা যায়নি",
      "error"
    );

  }

}


/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {

  const totalProducts =
    document.getElementById(
      "totalProducts"
    );


  const totalOrders =
    document.getElementById(
      "totalOrders"
    );


  const totalUsers =
    document.getElementById(
      "totalUsers"
    );


  /* HTML অনুযায়ী totalSales */

  const totalSales =
    document.getElementById(
      "totalSales"
    );


  if (totalProducts) {

    totalProducts.textContent =
      Object.keys(products).length;

  }


  if (totalOrders) {

    totalOrders.textContent =
      Object.keys(orders).length;

  }


  if (totalUsers) {

    totalUsers.textContent =
      users.length;

  }


  if (totalSales) {

    const sales =
      Object.values(orders)
        .reduce(
          (total, order) => {

            const status =
              String(
                order.status || ""
              ).toLowerCase();


            if (
              status === "cancelled" ||
              status === "canceled"
            ) {

              return total;

            }


            return (
              total +
              Number(
                order.total ||
                order.amount ||
                0
              )
            );

          },
          0
        );


    totalSales.textContent =
      `${storeSettings.currency} ${sales.toFixed(2)}`;

  }


  renderRecentOrders();

}


/* =========================================================
   REFRESH
   ========================================================= */

async function refreshAllData() {

  try {

    await Promise.all([
      loadProducts(),
      loadOrders(),
      loadUsers(),
      loadCoupons(),
      loadSettings()
    ]);


    updateDashboard();


    showToast(
      "All data refreshed",
      "success"
    );


  } catch (error) {

    console.error(error);

    showToast(
      "Data refresh failed",
      "error"
    );

  }

}

window.refreshAllData =
  refreshAllData;


/* =========================================================
   MODAL CLOSE
   ========================================================= */

document.addEventListener(
  "click",
  event => {

    if (
      event.target.classList.contains(
        "modal-overlay"
      )
    ) {

      if (
        event.target.id ===
        "productModal"
      ) {
        closeProductModal();
      }


      if (
        event.target.id ===
        "orderModal"
      ) {
        closeOrderModal();
      }


      if (
        event.target.id ===
        "couponModal"
      ) {
        closeCouponModal();
      }

    }

  }
);


/* =========================================================
   ESC KEY
   ========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (event.key !== "Escape") {
      return;
    }


    closeProductModal();
    closeOrderModal();
    closeCouponModal();

  }
);


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
  message,
  type = "success"
) {

  let toast =
    document.getElementById(
      "adminToast"
    );


  if (!toast) {

    toast =
      document.createElement(
        "div"
      );

    toast.id =
      "adminToast";


    toast.style.position =
      "fixed";

    toast.style.bottom =
      "25px";

    toast.style.right =
      "25px";

    toast.style.zIndex =
      "99999";

    toast.style.padding =
      "14px 20px";

    toast.style.borderRadius =
      "10px";

    toast.style.fontSize =
      "14px";

    toast.style.fontWeight =
      "600";

    toast.style.boxShadow =
      "0 8px 30px rgba(0,0,0,.15)";


    document.body.appendChild(
      toast
    );

  }


  toast.textContent =
    message;


  toast.style.background =
    type === "error"
      ? "#dc3545"
      : type === "warning"
        ? "#f0ad4e"
        : "#198754";


  toast.style.color =
    "#fff";


  toast.style.display =
    "block";


  clearTimeout(
    window.__adminToastTimer
  );


  window.__adminToastTimer =
    setTimeout(() => {

      toast.style.display =
        "none";

    }, 3000);

}

window.showToast =
  showToast;


/* =========================================================
   SEARCH
   ========================================================= */

function searchProducts(keyword) {

  const input =
    document.getElementById(
      "productSearch"
    );


  if (input) {

    input.value =
      keyword || "";

  }


  renderProducts();

}

window.searchProducts =
  searchProducts;


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }


  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(timestamp) {

  if (!timestamp) {
    return "N/A";
  }


  const date =
    new Date(timestamp);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "N/A";
  }


  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );

}


/* =========================================================
   STATUS BADGE
   ========================================================= */

function statusBadge(status) {

  const value =
    String(
      status || "Pending"
    ).toLowerCase();


  let className =
    "pending";


  if (
    value === "confirmed" ||
    value === "delivered" ||
    value === "completed"
  ) {

    className =
      "success";

  }


  if (
    value === "cancelled" ||
    value === "canceled"
  ) {

    className =
      "danger";

  }


  if (
    value === "processing" ||
    value === "shipped"
  ) {

    className =
      "info";

  }


  return `
    <span class="status-badge ${className}">
      ${escapeHTML(value)}
    </span>
  `;

}


/* =========================================================
   FINAL LOG
   ========================================================= */

console.log(
  "========================================"
);

console.log(
  "Royale Stepz Zone Admin Panel Loaded"
);

console.log(
  "Firebase Storage: DISABLED"
);

console.log(
  "Product Images: External URLs"
);

console.log(
  "========================================"
);