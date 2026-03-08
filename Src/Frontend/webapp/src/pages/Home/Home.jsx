import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { secureAxios, publicAxios } from "../../config/axiosConfig";
import '../../index.css'; 

const Home = ({ username, email, phone, userId, onLogout }) => {

  const baseURL = import.meta.env.VITE_SECURE_BASE_URL || import.meta.env.VITE_BASE_URL;

  console.log("Home component initialized", { username, email, phone, userId });

  // ============== Cart States ==============
  const [showCart, setShowCart] = useState(false);
  const [cart, setCart] = useState([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cartError, setCartError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  console.log("Cart States initialized");

  // ============== "Make a New Order" - Cargo Items ==============
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [cargoItems, setCargoItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedItemDescription, setSelectedItemDescription] = useState("");
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  
  // ============== Category Filter State ==============
  const [selectedCategory, setSelectedCategory] = useState("All");
  console.log("New Order and Cargo Items States initialized");

  // ============== Customize Item Related State ==============
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemQuantity, setCustomItemQuantity] = useState(1);
  const [customItemDescription, setCustomItemDescription] = useState("");

  // Initialize navigate hook for page navigation (Profile, Feedback, Order History)
  const navigate = useNavigate();

  // ============== Derived: Unique Categories & Filtered Items ==============
  const uniqueCategories = [
    "All",
    ...new Set(cargoItems.map(item => item.category).filter(Boolean))
  ];
  
  const filteredItems = selectedCategory === "All"
    ? cargoItems
    : cargoItems.filter(item => item.category === selectedCategory);

  // Get auth token from storage
  const getAuthToken = () => {
    const storedUser = sessionStorage.getItem("auth_user") || localStorage.getItem("auth_user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      return userData.authToken;
    }
    return null;
  };

  // ================= Other functions (Cart, New Order, etc.) =================

  const fetchCargoItems = async () => {
    console.log("fetchCargoItems: Fetching cargo items");
    setIsLoadingItems(true);
    try {
      // Cargo items can be fetched with publicAxios as they're not sensitive
      const response = await publicAxios.get('/api/cargo/items');
      console.log("fetchCargoItems: Received response", response);
      setCargoItems(response.data);
      // Reset category filter when fetching new items
      setSelectedCategory("All");
    } catch (error) {
      console.error("Failed to fetch cargo items:", error);
      
      // Handle certificate errors
      if (error.code === 'ERR_CERT_AUTHORITY_INVALID') {
        console.warn("Certificate error while fetching items. Using fallback...");
        // Try with regular axios as cargo items are public
        try {
          const response = await fetch(`${baseURL}/api/cargo/items`);
          const data = await response.json();
          setCargoItems(data);
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
          setCartError("Failed to load items. Please check your connection.");
        }
      } else {
        setCartError("Failed to load items: " + error.message);
      }
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleOpenNewOrder = () => {
    console.log("handleOpenNewOrder: Opening new order");
    setShowNewOrder(true);
    fetchCargoItems();
  };

  const handleSelectItem = (item) => {
    console.log("handleSelectItem: Selected item", item);
    setSelectedItem(item);
    setShowItemDetailModal(true);
    const sizes = item.sizeQuantities ? Object.keys(item.sizeQuantities) : [];
    setSelectedSize(sizes.length > 0 ? sizes[0] : "");
    setSelectedQuantity(1);
    setSelectedItemDescription("");
    console.log("handleSelectItem: Set selectedSize and selectedQuantity");
  };

  const closeItemDetailModal = () => {
    console.log("closeItemDetailModal: Closing item detail modal");
    setShowItemDetailModal(false);
    setSelectedItem(null);
    setSelectedSize("");
    setSelectedQuantity(1);
    setSelectedItemDescription("");
  };

  const handleAddSelectedItemToCart = () => {
    console.log("handleAddSelectedItemToCart: called");
    if (!selectedItem) return;
    if (selectedQuantity <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }
    
    // Store both base name and display name
    const baseItemName = selectedItem.name;
    const displayName = selectedSize ? `${selectedItem.name} (${selectedSize})` : selectedItem.name;
    
    const newCart = [...cart];
    const existingIndex = newCart.findIndex((c) => c.displayName === displayName && c.requestDescription === selectedItemDescription);
    
    if (existingIndex >= 0) {
      newCart[existingIndex].quantity += selectedQuantity;
      console.log("handleAddSelectedItemToCart: Updated quantity for existing cart item");
    } else {
      newCart.push({ 
        name: baseItemName,          // Base name for backend
        displayName: displayName,    // Display name for UI
        size: selectedSize || null,  // Store size separately
        quantity: selectedQuantity,
        imageId: selectedItem.imageId, 
        description: selectedItem.description,
        category: selectedItem.category,
        requestDescription: selectedItemDescription
      });
      console.log("handleAddSelectedItemToCart: Added new item to cart with base name:", baseItemName);
    }
    setCart(newCart);
    setSelectedItemDescription("");
    closeItemDetailModal();
  };

  // === Opens the custom item popup window ===
  const handleOpenCustomItemModal = () => {
    setShowCustomItemModal(true);
  };

  // === Add custom items to cart ===
  const handleAddCustomItemToCart = () => {
    if (!customItemName.trim()) {
      alert("Please enter an item name.");
      return;
    }
    const quantity = parseInt(customItemQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      alert("Please enter a valid quantity (positive integer).");
      return;
    }
    
    const itemName = customItemName.trim();
    const newCart = [...cart];
    const existingIndex = newCart.findIndex((c) => c.name === itemName && !c.size);
    
    if (existingIndex >= 0) {
      newCart[existingIndex].quantity += quantity;
    } else {
      newCart.push({ 
        name: itemName,
        displayName: itemName,  // For custom items, display name is same as base name
        size: null,
        quantity: quantity,
        requestDescription: customItemDescription
      });
    }
    setCart(newCart);
    setShowCustomItemModal(false);
    setCustomItemName("");
    setCustomItemQuantity(1);
    setCustomItemDescription("");
  };

  const toggleCart = () => {
    console.log("toggleCart: toggling cart visibility");
    setShowCart(!showCart);
    setCartError("");
    setCartMessage("");
  };

  const handleCartQuantityChange = (index, newQuantity) => {
    console.log("handleCartQuantityChange: index", index, "newQuantity", newQuantity);
    const updated = [...cart];
    updated[index].quantity = parseInt(newQuantity, 10) || 0;
    setCart(updated);
  };

  const handleRemoveCartItem = (index) => {
    console.log("handleRemoveCartItem: Removing cart item at index", index);
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const handlePlaceOrder = () => {
    console.log("handlePlaceOrder: called");
    if (navigator.geolocation) {
      console.log("handlePlaceOrder: Geolocation supported, fetching location");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("handlePlaceOrder: Received geolocation", position.coords);
          placeOrderWithLocation(position.coords.latitude, position.coords.longitude);
        },
        () => {
          console.log("handlePlaceOrder: Geolocation error, proceeding without location");
          placeOrderWithLocation(null, null);
        }
      );
    } else {
      console.log("handlePlaceOrder: Geolocation not supported, proceeding without location");
      placeOrderWithLocation(null, null);
    }
  };

  const placeOrderWithLocation = async (latitude, longitude) => {
    console.log("placeOrderWithLocation: called with", { latitude, longitude });
    if (cart.length === 0) {
      console.log("placeOrderWithLocation: Cart is empty");
      setCartError("Your cart is empty.");
      return;
    }
    if (!deliveryAddress.trim() || !notes.trim() || !phoneNumber.trim()) {
      console.log("placeOrderWithLocation: Missing delivery address, notes or phone number");
      setCartError("Please fill in delivery address, phone number, and notes.");
      return;
    }
    
    setCartError("");
    setCartMessage("");
    setIsPlacingOrder(true);
    
    try {
      // Debug log to check cart structure
      console.log("Cart items before sending:", cart);
      
      const payload = {
        authenticated: true,
        userId,
        deliveryAddress,
        notes,  // Keep original notes without size info appended
        phoneNumber,
        items: cart.map((item) => {
          // Send size information as part of each item
          console.log("Mapping item:", {
            original: item,
            sending: { 
              itemName: item.name, 
              quantity: item.quantity,
              size: item.size || null,
              isCustom: item.isCustom || false,
              description: item.requestDescription || null
            }
          });
          return {
            itemName: item.name,  // Use 'name' field (base name), NOT 'displayName'
            quantity: item.quantity,
            size: item.size || null,  // Include size if present
            description: item.requestDescription || null
          };
        }),
      };
      
      if (latitude !== null && longitude !== null) {
        payload.latitude = latitude;
        payload.longitude = longitude;
      }
      
      console.log("placeOrderWithLocation: Sending order payload", payload);
      
      // Use secureAxios for authenticated order creation
      const response = await secureAxios.post('/api/orders/create', payload, {
        headers: {
          'X-Auth-Token': getAuthToken() || ''
        }
      });
      
      console.log("placeOrderWithLocation: Received response", response);
      
      if (response.data.status !== "success") {
        setCartError(response.data.message || "Order creation failed");
        return;
      }
      
      setCartMessage("Order placed successfully!");
      setCart([]);
      setDeliveryAddress("");
      setNotes("");
      setPhoneNumber("");
      
      // Show success for a moment then close cart
      setTimeout(() => {
        setShowCart(false);
        setCartMessage("");
      }, 2000);
      
    } catch (error) {
      console.error("placeOrderWithLocation: Error occurred", error);
      
      // Handle certificate errors
      if (error.code === 'ERR_CERT_AUTHORITY_INVALID') {
        setCartError("Certificate error. Please accept the certificate and try again.");
        window.dispatchEvent(new CustomEvent('certificate-error', { 
          detail: { url: baseURL }
        }));
      } else if (error.response?.status === 403 && error.response?.data?.httpsRequired) {
        setCartError("Secure connection required for placing orders.");
        // Redirect to HTTPS if not already
        if (window.location.protocol !== 'https:') {
          setTimeout(() => {
            window.location.href = window.location.href.replace('http:', 'https:');
          }, 1500);
        }
      } else if (error.response?.status === 401) {
        setCartError("Authentication failed. Please login again.");
        setTimeout(() => {
          onLogout();
          navigate('/login');
        }, 1500);
      } else {
        setCartError(error.response?.data?.message || "Order creation failed.");
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Modified: Remove orders history logic from Home.
  // Instead, when "View Orders History" is clicked, navigate to the separate Order History page.
  const handleOrderHistoryNavigation = () => {
    navigate("/orderhistory");
  };

  // ================================== Rendering Section =================
  console.log("Home: Rendering component");
  return (
    <div className="page-container">
      {/* ---------------- NAVBAR ---------------- */}
      <header className="site-header">
        <div className="header-content">
          <div className="header-left">
            <img src="/Untitled.png" alt="Logo" className="logo" />
            <span className="welcome-text">Hello, {username} !</span>
            <button
              className="profileButton"
              onClick={() => navigate("/profile")}
            >
              Profile
            </button>
          </div>

          <div className="header-right">
            {/* Security indicator */}
            {window.location.protocol === 'https:' && (
              <span style={{ fontSize: '12px', color: '#27ae60', marginRight: '10px' }}>
                🔒 Secure
              </span>
            )}
            <button className="cartButton" onClick={toggleCart}>
              Cart ({cart.length})
            </button>
            <button
              className="feedbackButton"
              onClick={() => navigate("/feedback")}
            >
              Feedback
            </button>
            <button className="logoutButton" onClick={onLogout}>
              Log&nbsp;Out
            </button>
          </div>
        </div>
      </header>

      <main className="user-dashboard">
        <h2 className="dashboard-greeting">Hello, {username}</h2>

        <div className="dashboard-cards">
          <button
            className="dashboard-card light-blue"
            onClick={handleOrderHistoryNavigation}
          >
            <span className="card-icon">&#9660;</span>
            View Orders
          </button>

          <button
            className="dashboard-card light-yellow"
            onClick={handleOpenNewOrder}
            disabled={isLoadingItems}
          >
            <span className="card-icon">&#128722;</span>
            {isLoadingItems ? "Loading..." : "Make a New Order"}
          </button>
        </div>

        {showNewOrder && (
          <div style={{ marginTop: 30, width: "100%" }}>
            {/* Updated Header Layout - removed justify-content: space-between */}
            <div className="items-header">
              <h3 className="items-title">Available Items</h3>
              <span
                className="items-miss-link"
                onClick={handleOpenCustomItemModal}
              >
                Didn't find items you want? Click here.
              </span>
            </div>

            {/* === CATEGORY FILTER BUTTONS === */}
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
            <div className="itemGrid">
              {isLoadingItems ? (
                <p>Loading items...</p>
              ) : filteredItems.length === 0 ? (
                <p>No items found in this category.</p>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="itemCard"
                    onClick={() => handleSelectItem(item)}
                  >
                    {item.imageId ? (
                      <img
                        src={`${baseURL}/api/cargo/images/${item.imageId}`}
                        alt={item.name}
                        className="itemImage"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML += '<div class="itemImagePlaceholder">No Image</div>';
                        }}
                      />
                    ) : (
                      <div className="itemImagePlaceholder">No Image</div>
                    )}
                    <h4>{item.name}</h4>
                    <p style={{ fontSize: 14, color: "#999" }}>
                      {item.category}
                    </p>
                    <p style={{ fontSize: 14 }}>
                      Total Stock: {item.quantity}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {showItemDetailModal && selectedItem && (
        <div className="modalOverlay">
          <div style={{
            backgroundColor: '#1a2332',
            padding: '30px',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center'
          }}>
            {/* Item Name - Large centered title */}
            <h2 style={{
              color: '#fff',
              fontSize: '28px',
              fontWeight: '600',
              margin: '0 0 20px 0'
            }}>{selectedItem.name}</h2>

            {/* Item Image */}
            {selectedItem.imageId ? (
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '15px',
                display: 'inline-block'
              }}>
                <img
                  src={`${baseURL}/api/cargo/images/${selectedItem.imageId}`}
                  alt={selectedItem.name}
                  style={{
                    maxWidth: '250px',
                    maxHeight: '200px',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '40px',
                marginBottom: '15px',
                display: 'inline-block',
                color: '#666'
              }}>
                No Image
              </div>
            )}

            {/* Description */}
            <p style={{
              color: '#9ca3af',
              fontSize: '16px',
              margin: '0 0 20px 0'
            }}>{selectedItem.description}</p>

            {/* Size Selector (if applicable) */}
            {selectedItem.sizeQuantities &&
              Object.keys(selectedItem.sizeQuantities).length > 0 && (
                <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                  <label style={{
                    color: '#fff',
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    fontSize: '16px'
                  }}>Size:</label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#fff',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  >
                    {Object.entries(selectedItem.sizeQuantities).map(([s, q]) => (
                      <option key={s} value={s}>
                        {s} (stock: {q})
                      </option>
                    ))}
                  </select>
                </div>
              )}

            {/* Quantity Input */}
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label style={{
                color: '#fff',
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '16px'
              }}>Quantity:</label>
              <input
                type="number"
                min="1"
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#fff',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label style={{
                color: '#fff',
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '16px'
              }}>Notes (optional):</label>
              <textarea
                value={selectedItemDescription}
                onChange={e => setSelectedItemDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#fff',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  minHeight: '60px'
                }}
              />
            </div>

            {/* Add to Cart Button - Blue full width */}
            <button 
              onClick={handleAddSelectedItemToCart}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#1e5aa8',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '15px',
                transition: 'background-color 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#1a4f94'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#1e5aa8'}
            >
              Add to Cart
            </button>

            {/* Cancel - Gray text button */}
            <button 
              onClick={closeItemDetailModal}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '10px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showCustomItemModal && (
        <div className="modalOverlay">
          <div className="modalContent" style={{
            backgroundColor: '#1a2332',
            padding: '30px',
            borderRadius: '16px',
            maxWidth: '450px',
            width: '90%'
          }}>
            <h3 style={{color: '#fff', marginTop: 0, marginBottom: '20px', textAlign: 'center'}}>Add a custom item</h3>

            <div className="formGroup" style={{marginBottom: '15px'}}>
              <label style={{color: '#fff', display: 'block', marginBottom: '8px', fontWeight: '600'}}>Item Name:</label>
              <input
                type="text"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
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

            <div className="formGroup" style={{marginBottom: '20px'}}>
              <label style={{color: '#fff', display: 'block', marginBottom: '8px', fontWeight: '600'}}>Quantity:</label>
              <input
                type="number"
                min="1"
                value={customItemQuantity}
                onChange={(e) => setCustomItemQuantity(e.target.value)}
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
            <div className="formGroup" style={{marginBottom: '20px'}}>
              <label style={{color: '#fff', display: 'block', marginBottom: '8px', fontWeight: '600'}}>Notes (optional):</label>
              <textarea
                value={customItemDescription}
                onChange={(e) => setCustomItemDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #3a5070',
                  backgroundColor: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  minHeight: '60px'
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

      {showCart && (
        <div className="modalOverlay">
          <div className="cartContent" style={{
            backgroundColor: '#1a2332',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '900px',
            width: '90%',
            maxHeight: '85vh',
            overflow: 'auto'
          }}>
            {/* Header */}
            <h2 style={{color: '#fff', margin: '0 0 20px 0'}}>Your Cart</h2>
            
            <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
              {/* Left Side: Cart Items */}
              <div style={{flex: '2', minWidth: '300px', background: '#0f1c38', padding: '20px', borderRadius: '12px'}}>
                <h3 style={{color: '#f6b800', marginTop: 0}}>Items</h3>
                {cart.length === 0 ? (
                  <p style={{color: '#ccc'}}>No items in cart.</p>
                ) : (
                  cart.map((c, i) => (
                    <div key={i} style={{
                      borderBottom: '1px solid #333',
                      padding: '15px 0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '15px'
                    }}>
                      {c.imageId ? (
                        <img
                          src={`${baseURL}/api/cargo/images/${c.imageId}`}
                          alt={c.name}
                          style={{width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', background: '#fff'}}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div style={{width: '60px', height: '60px', borderRadius: '8px', background: '#333'}} />
                      )}
                      <div style={{flex: 1}}>
                        <h4 style={{color: '#fff', margin: '0 0 5px 0', fontSize: '16px'}}>{c.displayName || c.name}</h4>
                        {c.category && (
                          <p style={{fontSize: '12px', color: '#999', margin: 0}}>{c.category}</p>
                        )}
                        {c.requestDescription && (
                          <p style={{fontSize: '12px', color: '#aaa', margin: '4px 0 0 0'}}>Notes: {c.requestDescription}</p>
                        )}
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <input
                          type="number"
                          min="0"
                          value={c.quantity}
                          onChange={(e) => handleCartQuantityChange(i, e.target.value)}
                          disabled={isPlacingOrder}
                          style={{width: '60px', padding: '8px', borderRadius: '6px', border: '1px solid #3a5070', textAlign: 'center'}}
                        />
                        <button
                          onClick={() => handleRemoveCartItem(i)}
                          disabled={isPlacingOrder}
                          style={{color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600'}}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Right Side: Order Details */}
              <div style={{flex: '1', minWidth: '280px', background: '#0f1c38', padding: '20px', borderRadius: '12px'}}>
                <h3 style={{color: '#f6b800', marginTop: 0}}>Order Details</h3>
                
                {/* Overview List */}
                {cart.length > 0 && (
                  <div style={{marginBottom: '20px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px'}}>
                    <p style={{color: '#aaa', fontSize: '13px', margin: '0 0 8px 0'}}>Summary:</p>
                    <ul style={{listStyle: 'disc', paddingLeft: '20px', margin: 0}}>
                      {cart.map((c, idx) => (
                        <li key={idx} style={{color: '#fff', fontSize: '14px', marginBottom: '4px'}}>
                          {c.displayName || c.name} × {c.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{marginBottom: '15px'}}>
                  <label style={{color: '#fff', display: 'block', marginBottom: '6px', fontWeight: '600'}}>Delivery Address*</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    disabled={isPlacingOrder}
                    style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #3a5070', boxSizing: 'border-box'}}
                  />
                </div>

                <div style={{marginBottom: '15px'}}>
                  <label style={{color: '#fff', display: 'block', marginBottom: '6px', fontWeight: '600'}}>Phone Number*</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={isPlacingOrder}
                    style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #3a5070', boxSizing: 'border-box'}}
                  />
                </div>

                <div style={{marginBottom: '15px'}}>
                  <label style={{color: '#fff', display: 'block', marginBottom: '6px', fontWeight: '600'}}>Notes*</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isPlacingOrder}
                    style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #3a5070', boxSizing: 'border-box'}}
                  />
                </div>

                {/* Error/Success Messages */}
                {cartError && (
                  <div style={{background: 'rgba(231,76,60,0.2)', color: '#ff6b6b', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #e74c3c', fontSize: '14px'}}>
                    {cartError}
                  </div>
                )}
                {cartMessage && (
                  <div style={{background: 'rgba(39,174,96,0.2)', color: '#4ade80', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #27ae60', fontSize: '14px'}}>
                    {cartMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons - Place Order and Close together at bottom */}
            <div style={{display: 'flex', gap: '15px', marginTop: '25px', justifyContent: 'center'}}>
              <button 
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                style={{
                  flex: 1,
                  maxWidth: '200px',
                  padding: '14px 28px',
                  backgroundColor: isPlacingOrder ? '#8a7a00' : '#f6b800',
                  color: '#0f1c38',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: isPlacingOrder ? 'not-allowed' : 'pointer',
                  opacity: isPlacingOrder ? 0.7 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                {isPlacingOrder ? "Placing Order..." : "Place Order"}
              </button>
              <button 
                onClick={toggleCart}
                disabled={isPlacingOrder}
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
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;