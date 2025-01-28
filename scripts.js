// GLOBAL ARRAYS
let cartItems = [];       // For cart: { id, name, price, quantity, originalPrice? }

// SETTINGS
const TAX_RATE = 0.1;     // 10% tax
const DISCOUNT_CODES = {
  "POKETEN": 0.10,
  "POKE20": 0.20,
  "RARE5": 0.05
};
let discountUsed = false; // track if discount code has been used

document.addEventListener("DOMContentLoaded", () => {
  /***********************************
   * 1. LOAD CART
   **********************************/
  const savedCart = JSON.parse(localStorage.getItem("cartData"));
  if (savedCart) {
    cartItems = savedCart;
  }
  updateCartLinkCount();

  /***********************************
   * 2. STOCK INIT (Mark out-of-stock, etc.)
   **********************************/
  document.querySelectorAll(".product-card").forEach(card => {
    const stock = parseInt(card.getAttribute("data-stock"), 10) || 0;
    const stockCountEl = card.querySelector(".stock-count");
    const addToCartBtn = card.querySelector(".add-to-cart");
    if (stockCountEl) {
      stockCountEl.textContent = `Stock: ${stock}`;
    }
    if (stock <= 0) {
      card.classList.add("out-of-stock");
      if (addToCartBtn) addToCartBtn.disabled = true;
    }
  });

  /***********************************
   * 3. COMBINED "ADD TO CART"
   **********************************/
  document.querySelectorAll(".add-to-cart, .add-to-cart-featured").forEach(btn => {
    btn.addEventListener("click", () => {
      const container = btn.closest(".product-card, .featured-card");
      if (!container) return;

      const productId = container.getAttribute("data-product-id") || "unknown-id";
      const productName = container.querySelector("h3")?.textContent || "Unknown Product";
      const priceEl = container.querySelector(".price");
      const productPrice = priceEl ? parseFloat(priceEl.textContent.replace("$","")) : 0;

      addItemToCart(productId, productName, productPrice);
      alert(`Item added to cart: ${productName}`);
    });
  });

  /***********************************
   * 4. RENDER CART IF ON CART PAGE
   **********************************/
  const cartItemsContainer = document.getElementById("cart-items");
  const cartSubtotalEl = document.getElementById("cart-subtotal");
  const cartTaxEl = document.getElementById("cart-tax");
  const cartTotalEl = document.getElementById("cart-total");
  const checkoutButton = document.getElementById("checkout-btn");
  const checkoutSection = document.getElementById("checkout-section");
  const discountInput = document.getElementById("discount-code-input");
  const discountApplyBtn = document.getElementById("discount-apply-btn");

  if (cartItemsContainer && cartSubtotalEl && cartTaxEl && cartTotalEl) {
    renderCartItems(cartItemsContainer, cartSubtotalEl, cartTaxEl, cartTotalEl);
  }

  // Discount code logic
  if (discountInput && discountApplyBtn) {
    discountApplyBtn.addEventListener("click", () => {
      const code = discountInput.value.trim().toUpperCase();
      if (DISCOUNT_CODES[code]) {
        applyDiscount(DISCOUNT_CODES[code]);
        renderCartItems(cartItemsContainer, cartSubtotalEl, cartTaxEl, cartTotalEl);
      } else {
        alert("Invalid or unknown discount code.");
      }
    });
  }

  // Checkout
  if (checkoutButton) {
    checkoutButton.addEventListener("click", () => {
      if (cartItems.length === 0) {
        alert("Your cart is empty!");
      } else {
        alert("Checkout successful!");
        showOrderSummary(cartItems);

        cartItems = [];
        saveCartData();
        updateCartLinkCount();
        renderCartItems(cartItemsContainer, cartSubtotalEl, cartTaxEl, cartTotalEl);

        if (checkoutSection) {
          document.querySelector(".cart-section").style.display = "none";
          checkoutSection.style.display = "block";
        }
      }
    });
  }

  /***********************************
   * 5. FILTERING (Games & Sets)
   **********************************/
  document.querySelectorAll(".set-filter").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const category = link.getAttribute("data-category");
      const game = link.getAttribute("data-game") || "pokemon";
      filterProducts(game, category);
    });
  });
  document.querySelectorAll(".game-category-filter").forEach(gameLink => {
    gameLink.addEventListener("click", e => {
      e.preventDefault();
      const game = gameLink.getAttribute("data-game");
      filterProductsByGame(game);
    });
  });

  /***********************************
   * 6. LOGIN PAGE
   **********************************/
  const loginForm = document.querySelector(".login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      console.log("User attempted login with:", email, password);
      alert("Login functionality not implemented yet!");
    });
  }

/*********************************************
 * CART FUNCTIONS
 *********************************************/
function addItemToCart(id, name, price) {
  const existingItem = cartItems.find(i => i.id === id);
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cartItems.push({ id, name, price, quantity: 1 });
  }
  saveCartData();
  updateCartLinkCount();
}

function renderCartItems(container, subtotalEl, taxEl, totalEl) {
  container.innerHTML = "";
  if (cartItems.length === 0) {
    container.innerHTML = "<p>Your cart is currently empty.</p>";
    if (subtotalEl) subtotalEl.textContent = "$0.00";
    if (taxEl) taxEl.textContent = "$0.00";
    if (totalEl) totalEl.textContent = "$0.00";
    return;
  }

  let subtotal = 0;
  cartItems.forEach((item, idx) => {
    let priceToShow = `$${item.price.toFixed(2)}`;
    if (item.originalPrice) {
      priceToShow = `
        <span class="old-price">$${item.originalPrice.toFixed(2)}</span>
        <span class="discounted-price">$${item.price.toFixed(2)}</span>
      `;
    }

    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    const cartItemDiv = document.createElement("div");
    cartItemDiv.classList.add("cart-item");
    cartItemDiv.innerHTML = `
      <p><strong>${item.name}</strong> - ${priceToShow} x ${item.quantity}</p>
      <button class="remove-item-btn" data-index="${idx}">Remove</button>
    `;
    container.appendChild(cartItemDiv);
  });

  const taxAmount = subtotal * TAX_RATE;
  const total = subtotal + taxAmount;

  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  if (taxEl) taxEl.textContent = `$${taxAmount.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

  // remove item
  container.querySelectorAll(".remove-item-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = e.target.getAttribute("data-index");
      cartItems.splice(i, 1);
      saveCartData();
      updateCartLinkCount();
      renderCartItems(container, subtotalEl, taxEl, totalEl);
    });
  });
}

function saveCartData() {
  localStorage.setItem("cartData", JSON.stringify(cartItems));
}

function updateCartLinkCount() {
  const cartLink = document.querySelector(".cart-link");
  if (!cartLink) return;
  const totalQty = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  cartLink.textContent = `Cart (${totalQty})`;
}

/*********************************************
 * DISCOUNT
 *********************************************/
function applyDiscount(fraction) {
  if (discountUsed) {
    alert("Discount code has already been used!");
    return;
  }
  cartItems.forEach(item => {
    if (!item.originalPrice) item.originalPrice = item.price;
    item.price = item.price - item.price * fraction;
  });
  saveCartData();
  discountUsed = true;
  alert("Discount applied successfully!");
}

/*********************************************
 * ORDER SUMMARY
 *********************************************/
function showOrderSummary(items) {
  const summaryEl = document.getElementById("final-order-summary");
  if (!summaryEl) return;
  summaryEl.innerHTML = "<h3>Your Order:</h3>";
  const ul = document.createElement("ul");
  items.forEach(i => {
    const li = document.createElement("li");
    li.innerHTML = `${i.name} x ${i.quantity} ($${i.price.toFixed(2)} each)`;
    ul.appendChild(li);
  });
  summaryEl.appendChild(ul);
}

  if (totalEl) totalEl.textContent = `$${totalCost.toFixed(2)}`;

/*********************************************
 * FILTERING
 *********************************************/
function filterProducts(game, category) {
  const allProducts = document.querySelectorAll(".product-card");
  allProducts.forEach(prod => {
    const prodGame = prod.getAttribute("data-game") || "pokemon";
    const prodCategory = prod.getAttribute("data-category") || "";
    if (category === "all" && prodGame === game) {
      prod.style.display = "block";
    } else if (prodGame === game && prodCategory === category) {
      prod.style.display = "block";
    } else {
      prod.style.display = "none";
    }
  });
}

function filterProductsByGame(game) {
  const allProducts = document.querySelectorAll(".product-card");
  allProducts.forEach(prod => {
    const prodGame = prod.getAttribute("data-game") || "pokemon";
    if (prodGame === game) {
      prod.style.display = "block";
    } else {
      prod.style.display = "none";
    }
  });
}})