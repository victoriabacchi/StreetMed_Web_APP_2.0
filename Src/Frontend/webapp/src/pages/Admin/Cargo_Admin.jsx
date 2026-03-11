import React, { useState, useEffect, useCallback } from 'react';
import { secureAxios } from '../../config/axiosConfig';
import { useNavigate } from 'react-router-dom';
import '../../index.css'; 

// Predefined size options from XXS to XXXL
const SIZE_OPTIONS = [
  { value: 'XXS', label: 'XXS', order: 0 },
  { value: 'XS', label: 'XS', order: 1 },
  { value: 'S', label: 'S', order: 2 },
  { value: 'M', label: 'M', order: 3 },
  { value: 'L', label: 'L', order: 4 },
  { value: 'XL', label: 'XL', order: 5 },
  { value: 'XXL', label: 'XXL', order: 6 },
  { value: 'XXXL', label: 'XXXL', order: 7 }
];

const CATEGORY_OPTIONS = [
  "Clothes",
  "Food",
  "Beverage",
  "FirstAid",
  "Hygiene",
  "Bedding",
  "Electronics",
  "Other"
];

// Helper to get sort order for a size
const getSizeOrder = (size) => {
  const sizeOption = SIZE_OPTIONS.find(opt => opt.value === size);
  return sizeOption ? sizeOption.order : 999;
};

// Helper to sort size entries
const getSortedSizeEntries = (sizeQuantities = {}) => {
  const entries = Object.entries(sizeQuantities);
  if (entries.length === 0) return [];
  
  return entries.sort((a, b) => {
    return getSizeOrder(a[0]) - getSizeOrder(b[0]);
  });
};

const Cargo_Admin = ({ userData }) => {
  const navigate = useNavigate();

  // === Inventory Data ===
  const [allItems, setAllItems] = useState([]);
  const [allItemsError, setAllItemsError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchAllItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setAllItemsError('');

      const res = await secureAxios.get('/api/cargo/items', {
        headers: {
          'Admin-Username': userData.username,
          'Authentication-Status': 'true'
        }
      });

      setAllItems(res.data || []);
    } catch (err) {
      console.error("Error fetching items:", err);
      if (err.response?.data?.httpsRequired) {
        setAllItemsError("Secure HTTPS connection required for admin operations.");
      } else {
        setAllItemsError(err.response?.data?.message || err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userData.username]);

  useEffect(() => {
    fetchAllItems();
  }, [fetchAllItems]);

  // === Add New Item State ===
  const [newItemData, setNewItemData] = useState({
    name: '', description: '', category: '', quantity: 0, minQuantity: 5,
    isAvailable: true, needsPrescription: false
  });
  const [newSizeEntries, setNewSizeEntries] = useState([]);
  const [newItemImage, setNewItemImage] = useState(null);

  // === Update Item State ===
  const [updateItemId, setUpdateItemId] = useState('');
  const [updateItemData, setUpdateItemData] = useState({
    name: '', description: '', category: '', quantity: 0, minQuantity: 5,
    isAvailable: true, needsPrescription: false
  });
  const [updateSizeEntries, setUpdateSizeEntries] = useState([]);
  const [updateItemImage, setUpdateItemImage] = useState(null);

  // === Modal/Drawer toggles ===
  const [showAdd, setShowAdd] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  // === Delete Confirmation Modal ===
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);

  // === Sorting and Filtering Options ===
  const [sortOption, setSortOption] = useState('alphabetical');
  const [filterCategory, setFilterCategory] = useState('All');

  // === Helper Functions ===
  
  // Get available sizes that haven't been added yet
  const getAvailableSizesForAdd = () => {
    const usedSizes = new Set(newSizeEntries.map(e => e.size));
    return SIZE_OPTIONS.filter(size => !usedSizes.has(size.value));
  };

  const getAvailableSizesForUpdate = () => {
    const usedSizes = new Set(updateSizeEntries.map(e => e.size));
    return SIZE_OPTIONS.filter(size => !usedSizes.has(size.value));
  };

  const handleAddSizeEntry = () => {
    const availableSizes = getAvailableSizesForAdd();
    if (availableSizes.length === 0) {
      alert('All sizes have been added');
      return;
    }
    setNewSizeEntries([...newSizeEntries, { size: availableSizes[0].value, quantity: 0 }]);
  };

  const handleSizeEntryChange = (idx, field, val) => {
    const tmp = [...newSizeEntries];
    if (field === 'quantity') {
      tmp[idx] = { ...tmp[idx], quantity: Math.max(0, parseInt(val) || 0) };
    } else {
      tmp[idx] = { ...tmp[idx], [field]: val };
    }
    // Sort entries after change
    tmp.sort((a, b) => getSizeOrder(a.size) - getSizeOrder(b.size));
    setNewSizeEntries(tmp);
  };

  const handleRemoveSizeEntry = idx =>
    setNewSizeEntries(newSizeEntries.filter((_, i) => i !== idx));

  // Update size entries handlers
  const handleUpdateSizeEntryChange = (idx, field, val) => {
    const tmp = [...updateSizeEntries];
    if (field === 'quantity') {
      tmp[idx] = { ...tmp[idx], quantity: Math.max(0, parseInt(val) || 0) };
    } else {
      tmp[idx] = { ...tmp[idx], [field]: val };
    }
    // Sort entries after change
    tmp.sort((a, b) => getSizeOrder(a.size) - getSizeOrder(b.size));
    setUpdateSizeEntries(tmp);
  };

  const handleAddUpdateSizeEntry = () => {
    const availableSizes = getAvailableSizesForUpdate();
    if (availableSizes.length === 0) {
      alert('All sizes have been added');
      return;
    }
    const newEntry = { size: availableSizes[0].value, quantity: 0 };
    const updatedEntries = [...updateSizeEntries, newEntry];
    // Sort entries
    updatedEntries.sort((a, b) => getSizeOrder(a.size) - getSizeOrder(b.size));
    setUpdateSizeEntries(updatedEntries);
  };


  const handleRemoveUpdateSizeEntry = (idx) => {
    const newEntries = updateSizeEntries.filter((_, i) => i !== idx);
    
    // If removing the last size entry, preserve the total quantity
    if (newEntries.length === 0 && updateSizeEntries.length > 0) {
      const previousTotal = updateSizeEntries.reduce((sum, e) => sum + (e.quantity || 0), 0);
      setUpdateItemData(prev => ({ ...prev, quantity: previousTotal }));
    }
    
    setUpdateSizeEntries(newEntries);
  };

  const renderStatus = qty => {
    if (qty === 0) return <span className="status out">Out of Stock</span>;
    if (qty < 5) return <span className="status low">Low Stock</span>;
    return <span className="status fine">In Stock</span>;
  };

  // === Click row to update ===
  const handleRowClick = (item) => {
    setUpdateItemId(item.id.toString());
    setUpdateItemData({
      name: item.name || '',
      description: item.description || '',
      category: item.category || '',
      quantity: item.quantity || 0,
      minQuantity: item.minQuantity || 5,
      isAvailable: item.isAvailable !== false,
      needsPrescription: item.needsPrescription || false
    });
    
    // Convert size quantities to editable array format and sort
    if (item.sizeQuantities && Object.keys(item.sizeQuantities).length > 0) {
      const sizes = Object.entries(item.sizeQuantities)
        .map(([size, qty]) => ({ size, quantity: qty }))
        .sort((a, b) => getSizeOrder(a.size) - getSizeOrder(b.size));
      setUpdateSizeEntries(sizes);
    } else {
      setUpdateSizeEntries([]);
    }
    
    setUpdateItemImage(null);
    setShowUpdate(true);
    setShowAdd(false);
  };

  // Validation function
  const validateItemData = (itemData, sizeEntries) => {
    const errors = [];
    
    if (!itemData.name || itemData.name.trim() === '') {
      errors.push('Item name is required');
    }
    
    if (sizeEntries.length === 0 && itemData.quantity < 0) {
      errors.push('Quantity cannot be negative');
    }
    
    const sizeNames = new Set();
    for (const entry of sizeEntries) {
      if (!entry.size) {
        errors.push('Size selection is required');
      } else {
        if (sizeNames.has(entry.size)) {
          errors.push(`Duplicate size: ${entry.size}`);
        }
        sizeNames.add(entry.size);
      }
      
      if (entry.quantity < 0) {
        errors.push(`Size '${entry.size}' cannot have negative quantity`);
      }
    }
    
    if (itemData.minQuantity < 0) {
      errors.push('Minimum quantity cannot be negative');
    }
    
    return errors;
  };

  const handleAddNewItem = async () => {
    const errors = validateItemData(newItemData, newSizeEntries);
    
    if (errors.length > 0) {
      alert('Validation errors:\n' + errors.join('\n'));
      return;
    }
    
    try {
      const sizeQuantities = {};
      newSizeEntries.forEach(e => {
        if (e.size && e.quantity >= 0) {
          sizeQuantities[e.size] = Math.max(0, e.quantity);
        }
      });

      let finalQuantity = Math.max(0, newItemData.quantity);
      if (Object.keys(sizeQuantities).length > 0) {
        finalQuantity = Object.values(sizeQuantities).reduce((a, b) => a + b, 0);
      }

      const dataToSend = {
        ...newItemData,
        quantity: finalQuantity,
        sizeQuantities,
        minQuantity: Math.max(0, newItemData.minQuantity || 0),
        isAvailable: newItemData.isAvailable !== false,
        needsPrescription: newItemData.needsPrescription || false
      };

      const fd = new FormData();
      fd.append('data', new Blob([JSON.stringify(dataToSend)], { type: 'application/json' }));
      if (newItemImage) {
        fd.append('image', newItemImage);
      }

      const resp = await secureAxios.post('/api/cargo/items', fd, {
        headers: {
          'Content-Type': undefined,
          'Admin-Username': userData.username,
          'Authentication-Status': 'true'
        }
      });

      alert(resp.data.message || 'Item added successfully');
      setNewItemData({ 
        name: '', description: '', category: '', quantity: 0, 
        minQuantity: 5, isAvailable: true, needsPrescription: false 
      });
      setNewSizeEntries([]);
      setNewItemImage(null);
      setShowAdd(false);
      fetchAllItems();
    } catch (err) {
      console.error("Error adding item:", err);
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleUpdateItem = async () => {
    if (!updateItemId) {
      alert('No item selected for update');
      return;
    }

    const errors = validateItemData(updateItemData, updateSizeEntries);
    
    if (errors.length > 0) {
      alert('Validation errors:\n' + errors.join('\n'));
      return;
    }

     try {
        const sizeQuantities = {};
        updateSizeEntries.forEach(e => {
          if (e.size && e.quantity >= 0) {
            sizeQuantities[e.size] = Math.max(0, e.quantity);
          }
        });

        let finalQuantity = Math.max(0, updateItemData.quantity);
        if (Object.keys(sizeQuantities).length > 0) {
          finalQuantity = Object.values(sizeQuantities).reduce((a, b) => a + b, 0);
        }

  
      const dataToSend = {
        ...updateItemData,
        quantity: finalQuantity,
        sizeQuantities,
        minQuantity: Math.max(0, updateItemData.minQuantity || 0),
        isAvailable: updateItemData.isAvailable !== false,
        needsPrescription: updateItemData.needsPrescription || false
      };

      const fd = new FormData();
      fd.append('data', new Blob([JSON.stringify(dataToSend)], { type: 'application/json' }));
      if (updateItemImage) {
        fd.append('image', updateItemImage);
      }

      const resp = await secureAxios.put(
        `/api/cargo/items/${updateItemId}`,
        fd,
        {
          headers: {
            'Content-Type': undefined,
            'Admin-Username': userData.username,
            'Authentication-Status': 'true'
          }
        }
      );

      alert(resp.data.message || 'Item updated successfully');
      setUpdateItemId('');
      setUpdateItemData({ 
        name: '', description: '', category: '', quantity: 0,
        minQuantity: 5, isAvailable: true, needsPrescription: false 
      });
      setUpdateSizeEntries([]);
      setUpdateItemImage(null);
      setShowUpdate(false);
      fetchAllItems();
    } catch (err) {
      console.error("Error updating item:", err);
      alert(err.response?.data?.message || err.message);
    }
  };

  const confirmDelete = (itemId) => {
    setDeleteItemId(itemId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId) return;

    try {
      const resp = await secureAxios.delete(`/api/cargo/items/${deleteItemId}`, {
        headers: {
          'Admin-Username': userData.username,
          'Authentication-Status': 'true'
        }
      });

      alert(resp.data.message || 'Item deleted successfully');
      setShowDeleteConfirm(false);
      setDeleteItemId(null);
      fetchAllItems();
    } catch (err) {
      console.error("Error deleting item:", err);
      alert(err.response?.data?.message || err.message);
    }
  };

  const displayedItems = React.useMemo(() => {
    let items = [...allItems];
    if(filterCategory !== 'All') {
      items = items.filter(item => item.category === filterCategory);
    }
    if(sortOption === 'alphabetical') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'stock') {
      items.sort((a, b) => a.quantity - b.quantity);
    }

    return items;
  }, [allItems, sortOption, filterCategory]);

  return (
    <div className="page-container">
      {/* Header */}
      <header className="site-header">
        <div className="header-content">
          <div className="logo-container">
            <img src="/Untitled.png" alt="Logo" className="logo" />
            <span className="site-title" style={{ color: '#fff' }}>Inventory Management System</span>
          </div>
          <div className="header-right">
            <button className="manage-btn" onClick={() => navigate(-1)}>
              Go Back
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="cargo-container">
          <div className="cargo-header">
            <h2 className="cargo-title">Inventory Status</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="manage-btn"
                onClick={() => { setShowAdd(true); setShowUpdate(false); }}
              >
                Add New Item
              </button>
              <button
                className="manage-btn"
                onClick={fetchAllItems}
                disabled={isLoading}
              >
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {allItemsError && (
            <div style={{
              padding: '10px',
              margin: '10px 0',
              backgroundColor: '#0f1c38',
              color: '#c62828',
              borderRadius: '4px'
            }}>
              Error: {allItemsError}
            </div>
          )}
          
          {/* Sorting and Filtering */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            {/* Sorting Dropdown */}
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
              className="select-btn"
            >
              <option value="alphabetical">Alphabetical (A–Z)</option>
              <option value="stock">Stock level (Low → High)</option>
            </select>

            {/* Category Filter Dropdown */}
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="select-btn"
            >
              <option value="All">All Categories</option>
              {CATEGORY_OPTIONS.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="cargo-card">
            <div className="table-title">
              Inventory Overview 
              <span style={{ fontSize: '14px', marginLeft: '10px', color: '#888' }}>
                (Click any row to update)
              </span>
            </div>
            <div className="table-scroll">
              {isLoading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  Loading inventory...
                </div>
              ) : (
                <table className="cargo-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Total Qty</th>
                      <th>Size Details</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedItems.map(item => {
                      const sizes = item.sizeQuantities || {};
                      const sortedSizeEntries = getSortedSizeEntries(sizes);
                      const sizeQtyDisplay = sortedSizeEntries
                        .map(([sz, qty]) => `${sz}: ${qty}`)
                        .join(', ');

                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => handleRowClick(item)}
                          style={{ cursor: 'pointer' }}
                          className="cargo-row"
                        >
                          <td>{item.id}</td>
                          <td>{item.name}</td>
                          <td>{item.description}</td>
                          <td>{item.category}</td>
                          <td>{item.quantity}</td>
                          <td>{sizeQtyDisplay || '-'}</td>
                          <td>{renderStatus(item.quantity)}</td>
                          <td>
                            <button
                              className="delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(item.id);
                              }}
                              style={{
                                backgroundColor: '#d32f2f',
                                color: 'white',
                                fontSize: '12px',
                                padding: '4px 8px',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Add Form Modal */}
          {showAdd && (
            <div className="modal-overlay">
              <div className="modal-content">
                <button 
                  className="modal-close"
                  onClick={() => setShowAdd(false)}
                >
                  ×
                </button>
                <h3 className="modal-title">Add New Item</h3>
                
                <input
                  className="cargo-input"
                  placeholder="Name"
                  value={newItemData.name}
                  onChange={e => setNewItemData({ ...newItemData, name: e.target.value })}
                />
                <input
                  className="cargo-input"
                  placeholder="Description"
                  value={newItemData.description}
                  onChange={e => setNewItemData({ ...newItemData, description: e.target.value })}
                />
                <select
                  className="cargo-input"
                  value={newItemData.category}
                  onChange={e => setNewItemData({ ...newItemData, category: e.target.value })}
                  style={{ backgroundColor: '#fff', color: '#000' }}
                >
                  <option value="" disabled>Select Category</option>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                      
                {newSizeEntries.length === 0 && (
                  <input
                    className="cargo-input"
                    type="number"
                    min="0"
                    placeholder="Quantity (if no sizes)"
                    value={newItemData.quantity}
                    onChange={e => setNewItemData({ 
                      ...newItemData, 
                      quantity: Math.max(0, parseInt(e.target.value) || 0) 
                    })}
                  />
                )}

                <div className="cargo-sizes">
                  <h4>Size Options:</h4>
                  {newSizeEntries.map((ent, i) => {
                    const availableSizes = getAvailableSizesForAdd();
                    // Include current size in dropdown
                    const sizesForDropdown = [
                      ...SIZE_OPTIONS.filter(s => s.value === ent.size),
                      ...availableSizes
                    ];
                    
                    return (
                      <div key={i} className="cargo-size-entry">
                        <select
                          className="cargo-input size-select"
                          value={ent.size}
                          onChange={e => handleSizeEntryChange(i, 'size', e.target.value)}
                        >
                          {sizesForDropdown.map(size => (
                            <option key={size.value} value={size.value}>
                              {size.label}
                            </option>
                          ))}
                        </select>
                        <input
                          className="cargo-input qty-input"
                          type="number"
                          min="0"
                          placeholder="Qty"
                          value={ent.quantity}
                          onChange={e => handleSizeEntryChange(i, 'quantity', e.target.value)}
                        />
                        <button
                          className="remove-size-btn"
                          onClick={() => handleRemoveSizeEntry(i)}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                  {getAvailableSizesForAdd().length > 0 && (
                    <button className="add-size-btn" onClick={handleAddSizeEntry}>
                      + Add Size Option
                    </button>
                  )}
                </div>

                <div className="image-upload">
                  <label>Item Image (optional):</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setNewItemImage(e.target.files[0])}
                  />
                </div>

                <div className="modal-actions">
                  <button className="cargo-button primary" onClick={handleAddNewItem}>
                    Add Item
                  </button>
                  <button className="cargo-button secondary" onClick={() => setShowAdd(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Update Form Modal */}
          {showUpdate && (
            <div className="modal-overlay">
              <div className="modal-content">
                <button 
                  className="modal-close"
                  onClick={() => setShowUpdate(false)}
                >
                  ×
                </button>
                <h3 className="modal-title">Update Item #{updateItemId}</h3>
                
                <input
                  className="cargo-input"
                  placeholder="Name"
                  value={updateItemData.name}
                  onChange={e => setUpdateItemData({ ...updateItemData, name: e.target.value })}
                />
                <input
                  className="cargo-input"
                  placeholder="Description"
                  value={updateItemData.description}
                  onChange={e => setUpdateItemData({ ...updateItemData, description: e.target.value })}
                />
                <select
                  className="cargo-input"
                  value={updateItemData.category}
                  onChange={e => setUpdateItemData({ ...updateItemData, category: e.target.value })}
                  style={{ backgroundColor: '#fff', color: '#000' }}
                >
                  <option value="">Select Category...</option>
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                
                {updateSizeEntries.length === 0 && (
                  <input
                    className="cargo-input"
                    type="number"
                    min="0"
                    placeholder="Total Quantity"
                    value={updateItemData.quantity}
                    onChange={e => setUpdateItemData({ 
                      ...updateItemData, 
                      quantity: Math.max(0, parseInt(e.target.value) || 0) 
                    })}
                  />
                )}

                <div className="cargo-sizes">
                  <h4>Size Options:</h4>
                  {updateSizeEntries.map((ent, i) => {
                    const availableSizes = getAvailableSizesForUpdate();
                    // Include current size in dropdown
                    const sizesForDropdown = [
                      ...SIZE_OPTIONS.filter(s => s.value === ent.size),
                      ...availableSizes
                    ];
                    
                    return (
                      <div key={i} className="cargo-size-entry">
                        <select
                          className="cargo-input size-select"
                          value={ent.size}
                          onChange={e => handleUpdateSizeEntryChange(i, 'size', e.target.value)}
                        >
                          {sizesForDropdown.map(size => (
                            <option key={size.value} value={size.value}>
                              {size.label}
                            </option>
                          ))}
                        </select>
                        <input
                          className="cargo-input qty-input"
                          type="number"
                          min="0"
                          placeholder="Qty"
                          value={ent.quantity}
                          onChange={e => handleUpdateSizeEntryChange(i, 'quantity', e.target.value)}
                        />
                        <button
                          className="remove-size-btn"
                          onClick={() => handleRemoveUpdateSizeEntry(i)}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                  {getAvailableSizesForUpdate().length > 0 && (
                    <button className="add-size-btn" onClick={handleAddUpdateSizeEntry}>
                      + Add Size Option
                    </button>
                  )}
                </div>

                <div className="image-upload">
                  <div style={{ color: '#333' }}> Update Image (optional):</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setUpdateItemImage(e.target.files[0])}
                  />
                </div>

                <div className="modal-actions">
                  <button className="cargo-button primary" onClick={handleUpdateItem}>
                    Update Item
                  </button>
                  <button className="cargo-button secondary" onClick={() => setShowUpdate(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="modal-overlay">
              <div className="modal-content small">
                <h3>Confirm Delete</h3>
                <p>Are you sure you want to delete item #{deleteItemId}?</p>
                <div className="modal-actions">
                  <button 
                    className="cargo-button danger"
                    onClick={handleDeleteItem}
                  >
                    Yes, Delete
                  </button>
                  <button 
                    className="cargo-button secondary"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteItemId(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Cargo_Admin;