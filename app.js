
const APP_NAME = "LuxeCart";
const KEY = {
  cart: "luxecart_cart",
  users: "luxecart_users",
  currentUser: "luxecart_current_user",
  orders: "luxecart_orders",
  products: "luxecart_products"
};

function money(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", {minimumFractionDigits:2, maximumFractionDigits:2});
}
function getJSON(k, fallback) {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
}
function setJSON(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function products() {
  const saved = getJSON(KEY.products, null);
  if (Array.isArray(saved) && saved.length) return saved;
  return window.LUXECART_PRODUCTS.map(p => ({...p}));
}
function saveProducts(list) { setJSON(KEY.products, list); }
function categories() { return window.LUXECART_CATEGORIES; }

function cart() { return getJSON(KEY.cart, {}); }
function saveCart(c) { setJSON(KEY.cart, c); updateHeader(); }
function cartCount() { return Object.values(cart()).reduce((a,b) => a + Number(b), 0); }
function findProduct(id) { return products().find(p => Number(p.id) === Number(id)); }
function cartItems() {
  const c = cart();
  return Object.entries(c).map(([id, qty]) => {
    const p = findProduct(id);
    if (!p || p.status !== "active") return null;
    const q = Math.max(1, Math.min(Number(qty), Math.max(1, Number(p.stock))));
    return {...p, qty:q, subtotal:q * Number(p.price)};
  }).filter(Boolean);
}
function cartTotal() { return cartItems().reduce((s,p) => s + p.subtotal, 0); }

function currentUser() { return getJSON(KEY.currentUser, null); }
function setCurrentUser(u) { if (u) setJSON(KEY.currentUser, u); else localStorage.removeItem(KEY.currentUser); updateHeader(); }
function users() {
  const u = getJSON(KEY.users, null);
  if (Array.isArray(u)) return u;
  const defaults = [{name:"Administrator", email:"admin@example.com", password:"admin12345", role:"admin"}];
  setJSON(KEY.users, defaults);
  return defaults;
}

function updateHeader() {
  const count = document.querySelector("[data-cart-count]");
  if (count) count.textContent = cartCount();
  const account = document.querySelector("[data-account-link]");
  if (account) {
    const u = currentUser();
    account.href = u ? "account.html" : "login.html";
    account.textContent = u ? u.name : "Login";
  }
}
function headerHTML(root="../") {
  const u = currentUser();
  return `<header><div class="wrap nav">
    <a class="brand" href="${root}index.html"><b>L</b>${APP_NAME}</a>
    <nav><a href="${root}shop.html">Shop</a><a href="${root}shop.html?featured=1">Featured</a></nav>
    <div><a href="${root}cart.html">Cart <em data-cart-count>0</em></a> · <a data-account-link href="${root}${u ? "account.html" : "login.html"}">${esc(u ? u.name : "Login")}</a></div>
  </div></header>`;
}
function footerHTML(root="../") {
  const year = new Date().getFullYear();
  return `<footer><div class="wrap foot"><div><div class="brand"><b>L</b>${APP_NAME}</div><p>Premium essentials. Thoughtfully curated.</p></div>
    <div><strong>Explore</strong><a href="${root}shop.html">Shop</a><a href="${root}cart.html">Cart</a></div>
    <div><strong>Account</strong><a href="${root}account.html">Account</a><a href="${root}orders.html">Orders</a></div></div>
    <div class="wrap copy">© ${year} ${APP_NAME}</div></footer>`;
}
function shell({title, content, root="../", footer=true}) {
  document.title = `${title} · ${APP_NAME}`;
  document.body.innerHTML = headerHTML(root) + content + (footer ? footerHTML(root) : "");
  updateHeader();
}

function productCard(p, root="") {
  const image = p.image || "assets/images/product-1.jpg";
  return `<article class="card">
    <a class="pic" href="${root}product.html?id=${p.id}">
      <img src="${root}${image}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${root}assets/images/product-1.jpg'"><span>${p.featured ? "FEATURED" : esc(p.category || "PRODUCT")}</span>
    </a>
    <h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><strong>${money(p.price)}</strong>
    <button data-add="${p.id}">Add to cart +</button>
  </article>`;
}
function bindAddButtons() {
  document.querySelectorAll("[data-add]").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.add, p = findProduct(id), c = cart();
    if (!p || p.stock < 1) return alert("This product is out of stock.");
    c[id] = Math.min((Number(c[id]) || 0) + 1, Number(p.stock));
    saveCart(c);
    btn.textContent = "Added ✓";
    setTimeout(() => btn.textContent = "Add to cart +", 900);
  }));
}
function requireLogin() {
  if (!currentUser()) { location.href = "login.html"; return false; }
  return true;
}

function renderHome() {
  const ps = products().filter(p => p.status === "active").sort((a,b) => Number(b.featured)-Number(a.featured) || b.id-a.id).slice(0,8);
  shell({title:"Premium shopping, beautifully simple", root:"", content:`
  <section class="hero"><div class="wrap hero-grid"><div>
    <small>CURATED · MODERN · ESSENTIAL</small>
    <h1>Everything you love.<br><span>One beautiful cart.</span></h1>
    <p>Discover thoughtfully selected products with a premium shopping experience designed for speed, clarity and confidence.</p>
    <a class="btn" href="shop.html">Shop collection →</a>
  </div><div class="hero-art"><div><b>L</b><span>EDITOR'S PICK<br><strong>Designed for<br>your everyday.</strong></span></div></div></div></section>
  <section class="wrap section"><div class="section-title"><div><small>FEATURED</small><h2>Shop the edit</h2></div><a href="shop.html">View all →</a></div>
    <div class="grid">${ps.map(p=>productCard(p)).join("")}</div>
  </section>`});
  bindAddButtons();
}

function renderShop() {
  const params = new URLSearchParams(location.search);
  const q = (params.get("q") || "").trim().toLowerCase();
  const cat = Number(params.get("category") || 0);
  const featured = params.has("featured");
  let ps = products().filter(p => p.status === "active");
  if (q) ps = ps.filter(p => `${p.name} ${p.description}`.toLowerCase().includes(q));
  if (cat) ps = ps.filter(p => Number(p.category_id) === cat);
  if (featured) ps = ps.filter(p => Number(p.featured) === 1);
  ps.sort((a,b) => b.id-a.id);
  shell({title:"Shop", root:"", content:`
  <main class="wrap page"><small>COLLECTION</small><h1>Shop all products</h1>
    <form class="search" id="searchForm"><input name="q" value="${esc(params.get("q")||"")}" placeholder="Search products…"><button>Search</button></form>
    <div class="chips"><a href="shop.html">All</a>${categories().map(c=>`<a href="shop.html?category=${c.id}">${esc(c.name)}</a>`).join("")}</div>
    <div class="grid">${ps.length ? ps.map(p=>productCard(p)).join("") : `<div class="empty"><h2>No products found</h2><a class="btn" href="shop.html">View all products</a></div>`}</div>
  </main>`});
  document.getElementById("searchForm").addEventListener("submit", e => {
    e.preventDefault(); const q = new FormData(e.target).get("q"); location.href = `shop.html${q ? `?q=${encodeURIComponent(q)}` : ""}`;
  });
  bindAddButtons();
}

function renderProduct() {
  const id = Number(new URLSearchParams(location.search).get("id") || 0);
  const p = findProduct(id);
  if (!p || p.status !== "active") { location.href = "shop.html"; return; }
  shell({title:p.name, root:"", content:`
  <main class="wrap detail"><div class="detail-pic"><img src="${p.image || "assets/images/product-1.jpg"}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src='assets/images/product-1.jpg'"></div>
    <div><small>PRODUCT</small><h1>${esc(p.name)}</h1><div class="big-price">${money(p.price)}</div>
    <p>${esc(p.description)}</p><p class="stock">${p.stock ? "● In stock" : "○ Out of stock"}</p>
    <div class="buy"><input id="qty" type="number" min="1" max="${Math.max(1,p.stock)}" value="1"><button class="btn" id="addProduct" ${p.stock ? "" : "disabled"}>Add to cart</button></div></div>
  </main>`});
  document.getElementById("addProduct")?.addEventListener("click", () => {
    const q = Math.max(1, Math.min(Number(document.getElementById("qty").value)||1, Number(p.stock)));
    const c = cart(); c[id] = Math.min((Number(c[id])||0)+q, Number(p.stock)); saveCart(c);
    document.getElementById("addProduct").textContent = "Added ✓";
  });
}

function renderCart() {
  const items = cartItems(), total = cartTotal();
  shell({title:"Cart", root:"", content:`<main class="wrap page"><small>YOUR BAG</small><h1>Shopping cart</h1>
    ${!items.length ? `<div class="empty"><h2>Your cart is empty</h2><a class="btn" href="shop.html">Start shopping</a></div>` :
    `<div class="cart-layout"><div id="cartRows">${items.map(p=>`<div class="cart-row">
      <img src="${p.image || "assets/images/product-1.jpg"}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src='assets/images/product-1.jpg'"><div><h3>${esc(p.name)}</h3><p>${money(p.price)}</p></div>
      <input data-qty="${p.id}" type="number" min="0" max="${p.stock}" value="${p.qty}">
      <strong>${money(p.subtotal)}</strong></div>`).join("")}
      <button class="btn ghost" id="updateCart">Update cart</button></div>
      <aside class="summary"><h2>Summary</h2><p>Subtotal <b>${money(total)}</b></p><p>Shipping <b>Free</b></p><hr><h3>Total <b>${money(total)}</b></h3><a class="btn full" href="checkout.html">Checkout →</a></aside>
    </div>`}</main>`});
  document.getElementById("updateCart")?.addEventListener("click", () => {
    const c = {};
    document.querySelectorAll("[data-qty]").forEach(i => { const q=Number(i.value); if(q>0)c[i.dataset.qty]=q; });
    saveCart(c); renderCart();
  });
}

function renderLogin() {
  shell({title:"Sign in", root:"", content:`<main class="auth"><form class="auth-card" id="loginForm">
    <small>ACCOUNT</small><h1>Welcome back</h1><div id="error"></div>
    <label>Email<input id="email" type="email" required></label><label>Password<input id="password" type="password" required></label>
    <button class="btn full">Sign in</button><p>New here? <a href="register.html">Create an account</a></p>
  </form></main>`, footer:false});
  document.getElementById("loginForm").addEventListener("submit", e => {
    e.preventDefault(); const email=document.getElementById("email").value.trim().toLowerCase(), password=document.getElementById("password").value;
    const u=users().find(x=>x.email.toLowerCase()===email && x.password===password);
    if(!u){document.getElementById("error").innerHTML=`<div class="error">Invalid email or password.</div>`;return;}
    setCurrentUser({name:u.name,email:u.email,role:u.role}); location.href=u.role==="admin" ? "admin/index.html" : "account.html";
  });
}

function renderRegister() {
  shell({title:"Create account", root:"", content:`<main class="auth"><form class="auth-card" id="registerForm">
    <small>WELCOME</small><h1>Create account</h1><div id="error"></div>
    <label>Name<input id="name" required></label><label>Email<input id="email" type="email" required></label>
    <label>Password<input id="password" type="password" minlength="8" required></label>
    <button class="btn full">Create account</button><p>Already registered? <a href="login.html">Sign in</a></p>
  </form></main>`, footer:false});
  document.getElementById("registerForm").addEventListener("submit", e => {
    e.preventDefault(); const name=document.getElementById("name").value.trim(), email=document.getElementById("email").value.trim().toLowerCase(), password=document.getElementById("password").value;
    const us=users();
    if(name.length<2 || password.length<8 || !/^\S+@\S+\.\S+$/.test(email)){document.getElementById("error").innerHTML=`<div class="error">Enter valid details. Password must be 8+ characters.</div>`;return;}
    if(us.some(u=>u.email===email)){document.getElementById("error").innerHTML=`<div class="error">Email already registered.</div>`;return;}
    us.push({name,email,password,role:"customer"}); setJSON(KEY.users,us); location.href="login.html";
  });
}

function renderAccount() {
  if(!requireLogin()) return;
  const u=currentUser();
  shell({title:"Account", root:"", content:`<main class="wrap page"><small>ACCOUNT</small><h1>Hello, ${esc(u.name)}.</h1>
    <div class="account"><div><b>Email</b><p>${esc(u.email)}</p></div><a class="btn" href="orders.html">View orders →</a><a href="#" id="logout">Sign out</a></div>
  </main>`});
  document.getElementById("logout").onclick=e=>{e.preventDefault();setCurrentUser(null);location.href="index.html";};
}

function renderCheckout() {
  if(!requireLogin()) return;
  const items=cartItems(); if(!items.length){location.href="cart.html";return;}
  const total=cartTotal();
  shell({title:"Checkout", root:"", content:`<main class="wrap checkout"><div><small>CHECKOUT</small><h1>Complete your order</h1><div id="error"></div>
    <form id="checkoutForm"><label>Name<input name="name" value="${esc(currentUser().name)}" required></label>
    <label>Phone<input name="phone" required></label><label>Address<textarea name="address" required></textarea></label>
    <div class="two"><label>City<input name="city" required></label><label>PIN<input name="pincode" required></label></div>
    <label>Payment<select name="payment"><option>COD</option><option>UPI</option></select></label>
    <button class="btn full">Place order · ${money(total)}</button></form></div>
    <aside class="summary"><h2>Total</h2><h2>${money(total)}</h2></aside></main>`});
  document.getElementById("checkoutForm").addEventListener("submit", e=>{
    e.preventDefault(); const f=new FormData(e.target), vals=["name","phone","address","city","pincode"].map(k=>String(f.get(k)||"").trim());
    if(vals.some(v=>!v)){document.getElementById("error").innerHTML=`<div class="error">Complete all delivery fields.</div>`;return;}
    const orders=getJSON(KEY.orders,[]);
    const id=orders.length ? Math.max(...orders.map(o=>Number(o.id)))+1 : 1001;
    orders.push({id,user_email:currentUser().email,customer_name:vals[0],email:currentUser().email,phone:vals[1],address:vals[2],city:vals[3],pincode:vals[4],total,payment_method:f.get("payment"),status:"pending",created_at:new Date().toISOString(),items});
    setJSON(KEY.orders,orders);
    const ps=products(); items.forEach(i=>{const p=ps.find(x=>x.id===i.id);if(p)p.stock=Math.max(0,Number(p.stock)-Number(i.qty));}); saveProducts(ps);
    saveCart({}); location.href=`success.html?id=${id}`;
  });
}

function renderOrders() {
  if(!requireLogin()) return;
  const os=getJSON(KEY.orders,[]).filter(o=>o.user_email===currentUser().email).sort((a,b)=>b.id-a.id);
  shell({title:"Orders", root:"", content:`<main class="wrap page"><small>ACCOUNT</small><h1>Order history</h1>
    <div class="orders">${os.length ? os.map(o=>`<div><b>#${o.id}</b><span>${new Date(o.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</span><span>${esc(o.status)}</span><strong>${money(o.total)}</strong></div>`).join("") : `<div class="empty"><h2>No orders yet</h2><a class="btn" href="shop.html">Start shopping</a></div>`}</div>
  </main>`});
}

function renderSuccess() {
  if(!requireLogin()) return;
  const id=new URLSearchParams(location.search).get("id")||"";
  shell({title:"Order confirmed", root:"", content:`<main class="success"><div><small>ORDER CONFIRMED</small><h1>Thank you.</h1><p>Your order <b>#${esc(id)}</b> has been placed.</p><a class="btn" href="orders.html">View orders</a> <a href="shop.html">Continue shopping</a></div></main>`});
}

function adminGuard() {
  const u=currentUser();
  if(!u || u.role!=="admin"){location.href="../login.html";return false;}
  return true;
}
function renderAdminHome() {
  if(!adminGuard()) return;
  const ps=products(), os=getJSON(KEY.orders,[]);
  const revenue=os.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+Number(o.total),0);
  shell({title:"Admin", root:"../", content:`<main class="wrap page"><small>CONTROL CENTER</small><h1>Dashboard</h1>
    <div class="stats"><div><small>PRODUCTS</small><b>${ps.length}</b></div><div><small>ORDERS</small><b>${os.length}</b></div><div><small>REVENUE</small><b>${money(revenue)}</b></div></div>
    <p><a class="btn" href="products.html">Manage products</a> <a class="btn ghost" href="orders.html">Manage orders</a></p>
  </main>`});
}
function renderAdminProducts() {
  if(!adminGuard()) return;
  const ps=products();
  shell({title:"Products", root:"../", content:`<main class="wrap page"><small>ADMIN · CATALOG</small><h1>Products</h1>
    <form class="admin-form" id="productForm"><label>Name<input name="name" required></label>
    <label>Category<select name="category_id"><option value="">None</option>${categories().map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
    <label>Description<textarea name="description" required></textarea></label><div class="two">
    <label>Price<input name="price" type="number" step=".01" required></label><label>Compare price<input name="compare_price" type="number" step=".01"></label></div>
    <label>Image path<input name="image" id="imagePath" value="assets/images/product-1.jpg" placeholder="assets/images/product-1.jpg"></label>
    <label>Or upload product image<input name="imageFile" id="imageFile" type="file" accept="image/*"></label>
    <div class="admin-image-preview"><img id="imagePreview" src="../assets/images/product-1.jpg" alt="Product preview"></div>
    <label>Stock<input name="stock" type="number" value="10"></label>
    <label>Status<select name="status"><option>active</option><option>draft</option></select></label><label><input type="checkbox" name="featured"> Featured</label>
    <button class="btn">Add product</button></form>
    <div class="orders">${ps.map(p=>{const img=String(p.image||"assets/images/product-1.jpg"); const src=img.startsWith("data:")?img:`../${img}`; return `<div class="admin-product-row"><img class="admin-thumb" src="${src}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src='../assets/images/product-1.jpg'"><b>${esc(p.name)}</b><span>${money(p.price)}</span><span>Stock ${p.stock}</span><button class="ghost" data-delete-product="${p.id}">Delete</button></div>`}).join("")}</div>
  </main>`});
  const imageFile = document.getElementById("imageFile");
  const imagePath = document.getElementById("imagePath");
  const imagePreview = document.getElementById("imagePreview");
  imageFile?.addEventListener("change", () => {
    const file = imageFile.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { imagePreview.src = reader.result; imagePath.value = reader.result; };
    reader.readAsDataURL(file);
  });
  imagePath?.addEventListener("input", () => { imagePreview.src = imagePath.value || "../assets/images/product-1.jpg"; });
  document.getElementById("productForm").addEventListener("submit",e=>{
    e.preventDefault();const f=new FormData(e.target), name=String(f.get("name")).trim();
    const id=ps.length?Math.max(...ps.map(p=>p.id))+1:1;
    ps.push({id,category_id:Number(f.get("category_id"))||null,category:categories().find(c=>c.id===Number(f.get("category_id")) )?.name||"PRODUCT",name,slug:name.toLowerCase().replace(/[^a-z0-9]+/g,"-"),description:String(f.get("description")).trim(),price:Number(f.get("price")),compare_price:Number(f.get("compare_price"))||null,image:String(f.get("image")).trim() || "assets/images/product-1.jpg",stock:Number(f.get("stock"))||0,status:String(f.get("status")),featured:f.get("featured")?1:0});
    saveProducts(ps);renderAdminProducts();
  });
  document.querySelectorAll("[data-delete-product]").forEach(b=>b.onclick=()=>{const id=Number(b.dataset.deleteProduct);saveProducts(ps.filter(p=>p.id!==id));renderAdminProducts();});
}
function renderAdminOrders() {
  if(!adminGuard()) return;
  const os=getJSON(KEY.orders,[]);
  shell({title:"Orders", root:"../", content:`<main class="wrap page"><small>ADMIN · FULFILMENT</small><h1>Orders</h1>
    <div class="orders">${os.length ? os.sort((a,b)=>b.id-a.id).map(o=>`<div><b>#${o.id} · ${esc(o.customer_name)}</b><span>${money(o.total)}</span>
      <select data-order-status="${o.id}">${["pending","confirmed","shipped","delivered","cancelled"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select></div>`).join("") : `<div class="empty"><h2>No orders yet</h2></div>`}</div>
  </main>`});
  document.querySelectorAll("[data-order-status]").forEach(s=>s.onchange=()=>{const all=getJSON(KEY.orders,[]);const o=all.find(x=>Number(x.id)===Number(s.dataset.orderStatus));if(o)o.status=s.value;setJSON(KEY.orders,all);});
}

function boot() {
  const page = location.pathname.split("/").pop() || "index.html";
  if(location.pathname.includes("/admin/")) {
    if(page==="index.html") renderAdminHome();
    else if(page==="products.html") renderAdminProducts();
    else if(page==="orders.html") renderAdminOrders();
    else location.href="../index.html";
    return;
  }
  if(page==="index.html" || page==="") renderHome();
  else if(page==="shop.html") renderShop();
  else if(page==="product.html") renderProduct();
  else if(page==="cart.html") renderCart();
  else if(page==="login.html") renderLogin();
  else if(page==="register.html") renderRegister();
  else if(page==="account.html") renderAccount();
  else if(page==="checkout.html") renderCheckout();
  else if(page==="orders.html") renderOrders();
  else if(page==="success.html") renderSuccess();
  else if(page==="products.html") renderAdminProducts();
  else if(page==="orders.html" && location.pathname.includes("/admin/")) renderAdminOrders();
}
document.addEventListener("DOMContentLoaded", boot);
