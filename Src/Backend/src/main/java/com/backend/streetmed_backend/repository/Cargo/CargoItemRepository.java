package com.backend.streetmed_backend.repository.Cargo;

import com.backend.streetmed_backend.entity.CargoItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CargoItemRepository extends JpaRepository<CargoItem, Integer> {
    List<CargoItem> findByCategory(String category);

    List<CargoItem> findByIsAvailableTrue();

    List<CargoItem> findByQuantityLessThanEqual(Integer quantity);

    @Query("SELECT c FROM CargoItem c WHERE c.quantity <= c.minQuantity AND c.isAvailable = true")
    List<CargoItem> findLowStockItems();

    @Query("SELECT c FROM CargoItem c WHERE :size IN (SELECT key(s) FROM c.sizeQuantities s)")
    List<CargoItem> findItemsBySize(@Param("size") String size);

    List<CargoItem> findByNameContainingIgnoreCase(String name);

    List<CargoItem> findByCategoryAndIsAvailableTrue(String category);

    boolean existsByNameIgnoreCase(String name);

    List<CargoItem> findAllByOrderByCategoryAscNameAsc();
}