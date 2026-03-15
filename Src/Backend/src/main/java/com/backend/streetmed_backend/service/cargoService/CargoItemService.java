package com.backend.streetmed_backend.service.cargoService;

import com.backend.streetmed_backend.entity.CargoImage;
import com.backend.streetmed_backend.entity.CargoItem;
import com.backend.streetmed_backend.repository.Cargo.CargoItemRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class CargoItemService {
    private final CargoItemRepository cargoItemRepository;
    private final CargoImageService cargoImageService;
    private final Logger logger = LoggerFactory.getLogger(CargoItemService.class);

    @Autowired
    public CargoItemService(CargoItemRepository cargoItemRepository,
                            CargoImageService cargoImageService) {
        this.cargoItemRepository = cargoItemRepository;
        this.cargoImageService = cargoImageService;
    }

    public CargoItem createItem(CargoItem item, MultipartFile image) throws IOException {
        //require category validation
        if(item.getCategory() == null || item.getCategory().trim().isEmpty()) {
            throw new IllegalArgumentException("Category is required");
        }
        // Validate item name uniqueness
        if (cargoItemRepository.existsByNameIgnoreCase(item.getName())) {
            throw new RuntimeException("An item with this name already exists");
        }

        // Handle image if provided
        if (image != null && !image.isEmpty()) {
            CargoImage savedImage = cargoImageService.storeImage(image, null);
            item.setImageId(savedImage.getId());
        }

        item.setCreatedAt(LocalDateTime.now());
        item.setUpdatedAt(LocalDateTime.now());
        return cargoItemRepository.save(item);
    }

    public CargoItem updateItem(Integer id, CargoItem updatedItem, MultipartFile image) throws IOException {
        CargoItem existingItem = cargoItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        // Validate the updated item
        if (updatedItem.getQuantity() != null && updatedItem.getQuantity() < 0) {
            throw new IllegalArgumentException("Quantity cannot be negative");
        }

        if (updatedItem.getMinQuantity() != null && updatedItem.getMinQuantity() < 0) {
            throw new IllegalArgumentException("Minimum quantity cannot be negative");
        }

        // Validate size quantities if provided
        if (updatedItem.getSizeQuantities() != null) {
            for (Map.Entry<String, Integer> entry : updatedItem.getSizeQuantities().entrySet()) {
                if (entry.getValue() < 0) {
                    throw new IllegalArgumentException(
                            String.format("Size '%s' cannot have negative quantity: %d",
                                    entry.getKey(), entry.getValue())
                    );
                }
            }
        }

        // Update only non-null fields
        if (updatedItem.getName() != null && !updatedItem.getName().trim().isEmpty()) {
            existingItem.setName(updatedItem.getName());
        }
        if (updatedItem.getDescription() != null) {
            existingItem.setDescription(updatedItem.getDescription());
        }
        if (updatedItem.getCategory() != null) {
            if(updatedItem.getCategory().trim().isEmpty()) {
                throw new IllegalArgumentException("Category is required");
            }
            existingItem.setCategory(updatedItem.getCategory());
        }
        if (updatedItem.getQuantity() != null && updatedItem.getQuantity() >= 0) {
            existingItem.setQuantity(updatedItem.getQuantity());
        }
        if (updatedItem.getMinQuantity() != null && updatedItem.getMinQuantity() >= 0) {
            existingItem.setMinQuantity(updatedItem.getMinQuantity());
        }
        if (updatedItem.getIsAvailable() != null) {
            existingItem.setIsAvailable(updatedItem.getIsAvailable());
        }
        if (updatedItem.getNeedsPrescription() != null) {
            existingItem.setNeedsPrescription(updatedItem.getNeedsPrescription());
        }

        if (updatedItem.getSizeQuantities() != null) {
            existingItem.setSizeQuantities(updatedItem.getSizeQuantities());

            // Only recalculate total from sizes if there ARE sizes
            if (!updatedItem.getSizeQuantities().isEmpty()) {
                int totalFromSizes = updatedItem.getSizeQuantities().values().stream()
                        .mapToInt(Integer::intValue).sum();
                existingItem.setQuantity(totalFromSizes);
            }
        }

        // Handle image update
        if (image != null && !image.isEmpty()) {
            Integer oldImageId = existingItem.getImageId();
            if (oldImageId != null) {
                try {
                    cargoImageService.deleteImage(oldImageId);
                } catch (Exception e) {
                    logger.warn("Failed to delete old image: " + e.getMessage());
                }
            }
            CargoImage newImage = cargoImageService.storeImage(image, id);
            existingItem.setImageId(newImage.getId());
        }

        existingItem.setUpdatedAt(LocalDateTime.now());
        return cargoItemRepository.save(existingItem);
    }

    /**
     * Update the quantity of a cargo item
     *
     * @param id The ID of the cargo item
     * @param quantity The new quantity
     * @return The updated cargo item
     */
    @Transactional
    public CargoItem updateQuantity(Integer id, Integer quantity) {
        if (quantity == null || quantity < 0) {
            throw new IllegalArgumentException("Quantity cannot be negative");
        }

        CargoItem item = cargoItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        item.setQuantity(quantity);
        item.setUpdatedAt(LocalDateTime.now());

        // Check low stock threshold
        if (item.getMinQuantity() != null && quantity <= item.getMinQuantity()) {
            logger.warn("Item {} has reached low stock threshold: {}", item.getName(), quantity);
        }

        return cargoItemRepository.save(item);
    }

    public void updateSizeQuantity(Integer id, String size, Integer quantity) {
        if (quantity < 0) {
            throw new IllegalArgumentException(
                    String.format("Cannot set negative quantity for size '%s'", size)
            );
        }

        CargoItem item = cargoItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        item.updateSizeQuantity(size, quantity);

        // Recalculate total quantity
        if (item.getSizeQuantities() != null && !item.getSizeQuantities().isEmpty()) {
            int total = item.getSizeQuantities().values().stream()
                    .mapToInt(Integer::intValue).sum();
            item.setQuantity(total);
        }

        cargoItemRepository.save(item);
    }

    /**
     * Checks if an item is available in the requested quantity
     *
     * @param id The ID of the cargo item
     * @param requestedQuantity The quantity needed
     * @return true if the item is available in the requested quantity
     */
    @Transactional(readOnly = true)
    public boolean checkAvailability(Integer id, Integer requestedQuantity) {
        CargoItem item = cargoItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        return item.getIsAvailable() && item.isAvailableInQuantity(requestedQuantity);
    }

    public boolean checkSizeAvailability(Integer id, String size, Integer requestedQuantity) {
        CargoItem item = cargoItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        return item.getIsAvailable() && item.isAvailableInSize(size, requestedQuantity);
    }

    // Fix this method in your CargoItemService class
    public void deleteItem(Integer id) {
        CargoItem item = cargoItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        // Delete associated image if exists
        Integer imageId = item.getImageId();
        if (imageId != null) {
            cargoImageService.deleteImage(imageId);
        }

        cargoItemRepository.delete(item);
    }

    // Query methods
    public List<CargoItem> getAllItems() {
        return cargoItemRepository.findAllByOrderByCategoryAscNameAsc();
    }

    public List<CargoItem> getAvailableItems() {
        return cargoItemRepository.findByIsAvailableTrue();
    }

    public List<CargoItem> getItemsByCategory(String category) {
        return cargoItemRepository.findByCategoryAndIsAvailableTrue(category);
    }

    public List<CargoItem> getLowStockItems() {
        return cargoItemRepository.findLowStockItems();
    }

    public List<CargoItem> searchItems(String name) {
        return cargoItemRepository.findByNameContainingIgnoreCase(name);
    }

    public List<CargoItem> getItemsBySize(String size) {
        return cargoItemRepository.findItemsBySize(size);
    }

    // Batch operations
    @Transactional
    public void batchUpdateQuantities(List<Map<String, Object>> updates) {
        for (Map<String, Object> update : updates) {
            Integer itemId = (Integer) update.get("itemId");
            Integer quantity = (Integer) update.get("quantity");
            String size = (String) update.get("size");

            try {
                if (size != null) {
                    updateSizeQuantity(itemId, size, quantity);
                } else {
                    updateQuantity(itemId, quantity);
                }
            } catch (Exception e) {
                logger.error("Failed to update item {}: {}", itemId, e.getMessage());
            }
        }
    }

    // Inventory management methods
    /**
     * Temporarily reserve items from inventory for an order
     * Called when an order is created.
     *
     * @param id The ID of the cargo item
     * @param quantity The quantity to reserve
     */
    @Transactional
    public void reserveItems(Integer id, Integer quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Reserve quantity must be positive");
        }

        CargoItem item = cargoItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        if (!checkAvailability(id, quantity)) {
            throw new RuntimeException("Insufficient quantity available for item ID: " + id);
        }

        // Reduce the available quantity
        int newQuantity = item.getQuantity() - quantity;
        if (newQuantity < 0) {
            throw new RuntimeException("Cannot reserve more items than available");
        }

        item.setQuantity(newQuantity);
        item.setUpdatedAt(LocalDateTime.now());

        // Check low stock threshold
        if (item.getMinQuantity() != null && item.getQuantity() <= item.getMinQuantity()) {
            logger.warn("Item {} has reached low stock threshold: {}", item.getName(), item.getQuantity());
        }

        cargoItemRepository.save(item);
    }

    @Transactional
    public void reserveSizedItem(Integer id, String size, Integer quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Reserve quantity must be positive");
        }

        CargoItem item = cargoItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        if (!checkSizeAvailability(id, size, quantity)) {
            throw new RuntimeException("Insufficient quantity available for size: " + size);
        }

        Map<String, Integer> sizes = item.getSizeQuantities();
        int currentQty = sizes.getOrDefault(size, 0);
        int newQty = currentQty - quantity;

        if (newQty < 0) {
            throw new RuntimeException("Cannot reserve more items than available for size: " + size);
        }

        sizes.put(size, newQty);
        item.setSizeQuantities(sizes);

        // Update total quantity
        int total = sizes.values().stream().mapToInt(Integer::intValue).sum();
        item.setQuantity(total);

        cargoItemRepository.save(item);
    }
}