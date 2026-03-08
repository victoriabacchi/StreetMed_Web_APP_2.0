import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import '../../index.css'; 

const Guest = ({ onLogout }) => {
  const baseURL = import.meta.env.VITE_BASE_URL;
  const navigate = useNavigate();

  // ========== General State ==========
  const [cargoItems, setCargoItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // ========== Filter State ==========
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showItemGrid, setShowItemGrid] = useState(false); // Toggle to show/hide items

  // ========== Cart & Order State ==========
  const [showCart, setShowCart] = useState(false);
  const [cart, setCart] = useState([]); 
  
  // Guest Information Inputs
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guestNotes, setGuestNotes] = useState("");

  const [cartError, setCartError] = useState("");
  const [cartMessage, setCartMessage] = useState("");

  // ========== Modals State ==========
  const [showCurrentOrderModal, setShowCurrentOrderModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedItemDescription, setSelectedItemDescription] = useState("");
  
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemQuantity, setCustomItemQuantity] = useState(1);
  const [customItemDescription, setCustomItemDescription] = useState("");

  const itemsSectionRef = useRef(null);

  // ========== Fetch Data ==========
  useEffect(() => {
    const fetchCargoItems = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${baseURL}/api/cargo/items`);
        setCargoItems(response.data || []);
      } catch (error) {
        console.error("Failed to fetch cargo items:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCargoItems();
  }, [baseURL]);

  // ========== Filter Logic ==========
  // 1. Get unique categories
  const uniqueCategories = [
    "All", 
    ...new Set(cargoItems.map(item => item.category).filter(Boolean))
  ];

  // 2. Filter items based on selection
  const filteredItems = selectedCategory === "All" 
    ? cargoItems 
    : cargoItems.filter(item => item.category === selectedCategory);

  // ========== Handlers ==========

  const handleLogout = () => {
    onLogout();
    navigate("/"); 
  };

  const handleToggleNewOrder = () => {
    setShowItemGrid(!showItemGrid);
    if (!showItemGrid && itemsSectionRef.current) {
      setTimeout(() => {
        itemsSectionRef.current.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Item Selection
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setShowItemDetailModal(true);
    const sizes = item.sizeQuantities ? Object.keys(item.sizeQuantities) : [];
    setSelectedSize(sizes.length > 0 ? sizes[0] : "");
    setSelectedQuantity(1);
  };

  const closeItemDetailModal = () => {
    setSelectedItem(null);
    setShowItemDetailModal(false);
    setSelectedSize("");
    setSelectedQuantity(1);
  };

  // Add Standard Item to Cart
  const handleAddSelectedItemToCart = () => {
    if (!selectedItem) return;
    if (selectedQuantity <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    const displayName = selectedSize
      ? `${selectedItem.name} (${selectedSize})`
      : selectedItem.name;

    const newCart = [...cart];
    const existingIndex = newCart.findIndex((c) => c.displayName === displayName && c.requestDescription === selectedItemDescription);

    if (existingIndex >= 0) {
      newCart[existingIndex].quantity += selectedQuantity;
    } else {
      newCart.push({
        name: selectedItem.name,
        displayName: displayName,
        quantity: selectedQuantity,
        imageId: selectedItem.imageId,
        description: selectedItem.description,
        category: selectedItem.category,
        size: selectedSize,
        requestDescription: selectedItemDescription
      });
    }
    setCart(newCart);
    setSelectedItemDescription("");
    closeItemDetailModal();
  };

  // Custom Item Logic
  const handleAddCustomItemToCart = () => {
    if (!customItemName.trim()) {
      alert("Please enter an item name.");
      return;
    }
    const quantity = parseInt(customItemQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    const itemName = customItemName.trim();
    const newCart = [...cart];
    const existingIndex = newCart.findIndex(
      (c) => c.name === itemName || c.displayName === itemName
    );

    if (existingIndex >= 0) {
      newCart[existingIndex].quantity += quantity;
    } else {
      newCart.push({
        name: itemName,
        displayName: itemName,
        quantity: quantity,
        isCustom: true,
        requestDescription: customItemDescription
      });
    }
    setCart(newCart);
    setShowCustomItemModal(false);
    setCustomItemName("");
    setCustomItemQuantity(1);
    setCustomItemDescription("");
  };

  // Cart Management
  const toggleCart = () => {
    setShowCart(!showCart);
    setCartError("");
    setCartMessage("");
  };

  const handleCartQuantityChange = (index, newQuantity) => {
    const updated = [...cart];
    updated[index].quantity = parseInt(newQuantity, 10) || 0;
    setCart(updated);
  };

  const handleRemoveCartItem = (index) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  // Place Order Logic
  const handlePlaceOrder = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          placeOrderWithLocation(
            position.coords.latitude,
            position.coords.longitude
          );
        },
        () => {
          placeOrderWithLocation(null, null);
        }
      );
    } else {
      placeOrderWithLocation(null, null);
    }
  };

  const placeOrderWithLocation = async (latitude, longitude) => {
    if (cart.length === 0) {
      setCartError("Your cart is empty.");
      return;
    }
    if (!guestFirstName.trim() || !guestLastName.trim()) {
      setCartError("Please fill in first name and last name");
      return;
    }
    setCartError("");
    setCartMessage("");

    try {
      let combinedUserNotes = `FirstName: ${guestFirstName}; LastName: ${guestLastName}`;
      if (guestNotes.trim()) combinedUserNotes += `; ${guestNotes}`;
      if (email.trim()) combinedUserNotes += `; Email: ${email}`;

      const payload = {
        deliveryAddress: deliveryAddress.trim(),
        phoneNumber: phone.trim(),
        notes: combinedUserNotes,
        items: cart.map((c) => ({
          itemName: c.name,
          quantity: c.quantity,
          size: c.size || null,
          isCustom: c.isCustom || false,
          description: c.requestDescription || null
        })),
        authenticated: false,
        userId: -1
      };

      if (latitude !== null && longitude !== null) {
        payload.latitude = latitude;
        payload.longitude = longitude;
      }

      const response = await axios.post(`${baseURL}/api/orders/create`, payload);

      if (response.data.status === "success") {
        setCartMessage("Order placed successfully!");
        
        const newOrder = {
          orderId: response.data.orderId,
          orderStatus: response.data.status || "PENDING",
          firstName: guestFirstName,
          lastName: guestLastName,
          address: deliveryAddress,
          notes: combinedUserNotes,
          items: cart,
        };
        
        setCurrentOrder(newOrder);
        setShowCurrentOrderModal(true);
        
        // Reset
        setCart([]);
        setDeliveryAddress("");
        setGuestFirstName("");
        setGuestLastName("");
        setEmail("");
        setPhone("");
        setGuestNotes("");
        setShowCart(false);
      } else {
        setCartError(response.data.message || "Order creation failed.");
      }
    } catch (error) {
      console.error("Order creation error:", error.response?.data);
      setCartError(error.response?.data?.message || "Order creation failed.");
    }
  };

  return (
    <div className="page-container guest-page">
      {/* ---------- HEADER ---------- */}
      <header className="guest-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="/Untitled.png" alt="Logo" className="logo" />
            <span className="welcome-text">Welcome, Guest!</span>
        </div>

        <div>
            <button className="cartButton" onClick={toggleCart}>
               Cart {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
            </button>
            <button className="logoutButton" onClick={handleLogout}>
              Log Out
            </button>
        </div>
      </header>

      {/* ---------- MAIN CONTENT ---------- */}
      <main className="guest-content">
        <h2 className="dashboard-greeting">Hello, Guest</h2>

        {/* Action Buttons using drawer-btn style from CSS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '500px' }}>
            
            <button 
                className="drawer-btn" 
                onClick={handleToggleNewOrder}
            >
                <span>&#128722;</span> {/* Shopping Cart Icon */}
                <span>{showItemGrid ? "Hide Items" : "Make a New Order"}</span>
                <span style={{ marginLeft: 'auto' }}>{showItemGrid ? "^" : "v"}</span>
            </button>

            <button 
                className="drawer-btn" 
                onClick={toggleCart}
            >
                <span>&#128179;</span> {/* Card/Cart Icon */}
                <span>View Cart ({cart.length})</span>
                <span style={{ marginLeft: 'auto' }}>&gt;</span>
            </button>

        </div>

        {/* ---------- ITEM GRID SECTION ---------- */}
        {showItemGrid && (
            <div ref={itemsSectionRef} style={{ marginTop: 30, width: "100%" }}>
              {/* Updated Header Layout - removed justify-content: space-between */}
              <div className="items-header">
                <h3 className="section-title">Available Items</h3>
                <span
                  className="custom-order-link items-miss-link"
                  onClick={() => setShowCustomItemModal(true)}
                >
                  Can't find what you need? Add Custom Item
                </span>
              </div>

              {/* === CATEGORY FILTER BUTTONS - Using CSS Classes === */}
              <div className="category-filter-container">
                  {uniqueCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`category-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                    >
                      {cat}
                    </button>
                  ))}
              </div>

              {/* === ITEMS GRID === */}
              <div className="items-grid">
                {isLoading ? (
                   <p style={{color: '#fff'}}>Loading inventory...</p>
                ) : filteredItems.length === 0 ? (
                  <p style={{color: '#fff'}}>No items found in this category.</p>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="item-card"
                      onClick={() => handleSelectItem(item)}
                    >
                      <div className="image-container">
                          {item.imageId ? (
                            <img
                              src={`${baseURL}/api/cargo/images/${item.imageId}`}
                              alt={item.name}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML += '<div class="no-image-placeholder">No Image</div>';
                              }}
                            />
                          ) : (
                            <div className="no-image-placeholder">No Image</div>
                          )}
                      </div>
                      <h4>{item.name}</h4>
                      <p className="category">{item.category}</p>
                      <p className="stock">
                        {item.quantity == 0
                        ? <span className="status-badge status-out">Out of Stock</span>
                        : item.quantity <= 5
                        ? <span className="status-badge status-limited">Limited</span>
                        : <span className="status-badge status-available">Available</span>
                        }
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
        )}
      </main>

      {/* ---------- ITEM DETAIL MODAL ---------- */}
      {showItemDetailModal && selectedItem && (
        <div className="modal-overlay">
          <div className="modal-content feedback-card"> {/* Reusing feedback styling for consistency */}
             <h2 style={{color: '#fff', textAlign: 'center'}}>{selectedItem.name}</h2>
             
             {selectedItem.imageId && (
                <div style={{textAlign: 'center', marginBottom: '15px'}}>
                   <img 
                     src={`${baseURL}/api/cargo/images/${selectedItem.imageId}`} 
                     alt={selectedItem.name}
                     style={{maxHeight: '150px', objectFit: 'contain', borderRadius: '8px', background: '#fff', padding: '10px'}} 
                   />
                </div>
             )}

             <p style={{color: '#ccc', textAlign: 'center', marginBottom: '20px'}}>{selectedItem.description}</p>
             
             {selectedItem.sizeQuantities && Object.keys(selectedItem.sizeQuantities).length > 0 && (
                <div style={{marginBottom: '15px'}}>
                    <label style={{color: '#fff', display: 'block', marginBottom: '5px'}}>Select Size:</label>
                    <select 
                        style={{width: '100%', padding: '10px', borderRadius: '8px'}}
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                    >
                        {Object.entries(selectedItem.sizeQuantities).map(([s, q]) => (
                            <option key={s} value={s}>
                              {s} — {q === 0 ? 'Out of Stock' : q <= 5 ? 'Limited' : 'Available'}
                              </option>
                        ))}
                    </select>
                </div>
             )}

             <div style={{marginBottom: '20px'}}>
                <label style={{color: '#fff', display: 'block', marginBottom: '5px'}}>Quantity:</label>
                <input
                    type="number"
                    min="1"
                    style={{width: '100%', padding: '10px', borderRadius: '8px'}}
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                />
             </div>
             <div style={{marginBottom: '20px'}}>
                <label style={{color: '#fff', display: 'block', marginBottom: '5px'}}>Notes (optional):</label>
                <textarea
                    value={selectedItemDescription}
                    onChange={e => setSelectedItemDescription(e.target.value)}
                    style={{width: '100%', padding: '10px', borderRadius: '8px', minHeight: '60px'}}
                />
             </div>

             <button className="feedback-submit-btn" onClick={handleAddSelectedItemToCart}>Add to Cart</button>
             <button className="feedback-cancel-btn" onClick={closeItemDetailModal}>Cancel</button>
          </div>
        </div>
      )}

      {/* ---------- CUSTOM ITEM MODAL ---------- */}
      {showCustomItemModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{
            backgroundColor: '#1a2332',
            padding: '30px',
            borderRadius: '16px',
            maxWidth: '450px',
            width: '90%'
          }}>
            <h2 style={{color: '#fff', marginTop: 0, marginBottom: '20px', textAlign: 'center'}}>Request Custom Item</h2>
            
            <div style={{marginBottom: '15px'}}>
                <label style={{color: '#fff', display: 'block', marginBottom: '8px', fontWeight: '600'}}>Item Name:</label>
                <input 
                    type="text" 
                    value={customItemName} 
                    onChange={e => setCustomItemName(e.target.value)}
                    placeholder="E.g. Extra thick blanket"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #3a5070',
                      backgroundColor: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                />
            </div>
            <div style={{marginBottom: '20px'}}>
                <label style={{color: '#fff', display: 'block', marginBottom: '8px', fontWeight: '600'}}>Quantity:</label>
                <input 
                    type="number" 
                    min="1"
                    value={customItemQuantity}
                    onChange={e => setCustomItemQuantity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #3a5070',
                      backgroundColor: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                />
            </div>
            <div style={{marginBottom: '20px'}}>
                <label style={{color: '#fff', display: 'block', marginBottom: '8px', fontWeight: '600'}}>Notes (optional):</label>
                <textarea
                    value={customItemDescription}
                    onChange={e => setCustomItemDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #3a5070',
                      backgroundColor: '#fff',
                      fontSize: '14px',
                      minHeight: '60px',
                      boxSizing: 'border-box'
                    }}
                />
            </div>
            
            {/* Action Buttons */}
            <div style={{display: 'flex', gap: '15px', marginTop: '25px', justifyContent: 'center'}}>
              <button 
                onClick={handleAddCustomItemToCart}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#f6b800',
                  color: '#0f1c38',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Add to Cart
              </button>
              <button 
                onClick={() => setShowCustomItemModal(false)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#ccc',
                  border: '2px solid #3a5070',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- CART MODAL (GUEST SPECIFIC) ---------- */}
      {showCart && (
        <div className="modal-overlay">
          <div className="modal-content feedback-card" style={{maxWidth: '800px', width: '90%'}}>
             {/* Header */}
             <h2 style={{margin: '0 0 20px 0', color: '#fff'}}>Your Cart</h2>

             <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                {/* Items Section */}
                <div style={{background: '#0f1c38', padding: '15px', borderRadius: '10px'}}>
                    <h3 style={{color: '#f6b800', marginTop:0}}>Items</h3>
                    {cart.length === 0 ? <p style={{color: '#ccc'}}>Cart is empty</p> : (
                        cart.map((c, i) => (
                            <div key={i} style={{borderBottom: '1px solid #333', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div>
                                    <strong style={{color: '#fff'}}>{c.displayName || c.name}</strong>
                                    {c.isCustom && <span style={{color: '#ff9800', fontSize: '12px', marginLeft: '5px'}}>(Custom)</span>}
                                    <div style={{color: '#ccc', fontSize: '13px'}}>{c.category}</div>
                                    {c.requestDescription && (
                                      <div style={{color: '#aaa', fontSize: '12px', marginTop: '4px'}}>
                                        Notes: {c.requestDescription}
                                      </div>
                                    )}
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        value={c.quantity} 
                                        onChange={(e) => handleCartQuantityChange(i, e.target.value)}
                                        style={{width: '60px', padding: '5px', borderRadius: '4px'}}
                                    />
                                    <button onClick={() => handleRemoveCartItem(i)} style={{color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600'}}>Remove</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Delivery Details Form */}
                <div style={{background: '#0f1c38', padding: '15px', borderRadius: '10px'}}>
                    <h3 style={{color: '#f6b800', marginTop:0}}>Delivery Details</h3>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                        <div>
                            <label>First Name*</label>
                            <input type="text" value={guestFirstName} onChange={e => setGuestFirstName(e.target.value)} />
                        </div>
                        <div>
                            <label>Last Name*</label>
                            <input type="text" value={guestLastName} onChange={e => setGuestLastName(e.target.value)} />
                        </div>
                    </div>
                    
                    <label>Phone Number (Optional)</label>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} />

                    <label>Delivery Address (Optional)</label>
                    <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} />

                    <label>Email (Optional)</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} />

                    <label>Notes (Optional)</label>
                    <textarea value={guestNotes} onChange={e => setGuestNotes(e.target.value)} style={{minHeight: '80px'}} />
                </div>
             </div>

             {/* Error/Success Messages */}
             {cartError && <div style={{background: 'rgba(231,76,60,0.2)', color: '#ff6b6b', padding: '10px', marginTop: '15px', borderRadius: '5px', border: '1px solid #e74c3c'}}>{cartError}</div>}
             {cartMessage && <div style={{background: 'rgba(39,174,96,0.2)', color: '#4ade80', padding: '10px', marginTop: '15px', borderRadius: '5px', border: '1px solid #27ae60'}}>{cartMessage}</div>}

             {/* Action Buttons - Place Order and Close together at bottom */}
             <div style={{display: 'flex', gap: '15px', marginTop: '25px', justifyContent: 'center'}}>
                <button 
                    onClick={handlePlaceOrder} 
                    style={{
                        flex: 1,
                        maxWidth: '200px',
                        padding: '14px 28px',
                        backgroundColor: '#f6b800',
                        color: '#0f1c38',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#e5a800'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#f6b800'}
                >
                    Place Order
                </button>
                <button 
                    onClick={toggleCart} 
                    style={{
                        flex: 1,
                        maxWidth: '200px',
                        padding: '14px 28px',
                        backgroundColor: 'transparent',
                        color: '#ccc',
                        border: '2px solid #3a5070',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {e.target.style.borderColor = '#ff6b6b'; e.target.style.color = '#ff6b6b';}}
                    onMouseOut={(e) => {e.target.style.borderColor = '#3a5070'; e.target.style.color = '#ccc';}}
                >
                    Close
                </button>
             </div>
          </div>
        </div>
      )}

      {/* ---------- ORDER SUCCESS MODAL ---------- */}
      {showCurrentOrderModal && currentOrder && (
        <div className="modal-overlay">
           <div className="modal-content feedback-card">
              <h2 style={{color: '#4ade80'}}>Order Placed Successfully!</h2>
              <p style={{color: '#fff'}}><strong>Order ID:</strong> {currentOrder.orderId}</p>
              <p style={{color: '#fff'}}><strong>Name:</strong> {currentOrder.firstName} {currentOrder.lastName}</p>
              <div style={{background: '#0f1c38', padding: '10px', borderRadius: '8px', margin: '15px 0'}}>
                  <p style={{color: '#f6b800', margin: '0 0 5px 0'}}>Items:</p>
                  {currentOrder.items.map((it, idx) => (
                      <div key={idx} style={{color: '#ccc', fontSize: '14px', marginBottom: it.requestDescription ? '4px' : '0'}}>
                         - {it.displayName || it.name} x {it.quantity}
                         {it.requestDescription && (
                           <div style={{fontSize: '12px', color: '#aaa', marginLeft: '12px'}}>Notes: {it.requestDescription}</div>
                         )}
                      </div>
                  ))}
              </div>
              <p style={{color: '#ff6b6b', fontStyle: 'italic', fontSize: '13px'}}>Please save this Order ID for your records.</p>
              <button className="feedback-submit-btn" onClick={() => setShowCurrentOrderModal(false)}>Close</button>
           </div>
        </div>
      )}

    </div>
  );
};

export default Guest;