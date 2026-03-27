package com.backend.streetmed_backend.repository.Event;

import com.backend.streetmed_backend.entity.event_entity.Interaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InteractionRepository extends JpaRepository<Interaction, Integer> {
    
    // Find all interactions for a specific user
    List<Interaction> findByUserId(Integer userId);
    
    // Find all interactions for a specific user within a date range
    List<Interaction> findByUserIdAndTimestampBetween(Integer userId, LocalDateTime startTime, LocalDateTime endTime);
    
    // Find interactions by user role
    List<Interaction> findByUserRole(String userRole);
    
    // Find interactions within a geographic area (simple bounding box)
    List<Interaction> findByLatitudeBetweenAndLongitudeBetween(Double minLat, Double maxLat, Double minLon, Double maxLon);
}
