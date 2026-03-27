package com.backend.streetmed_backend.service.interactionService;

import com.backend.streetmed_backend.entity.event_entity.Interaction;
import com.backend.streetmed_backend.dto.interaction.LogInteractionRequest;
import com.backend.streetmed_backend.repository.Event.InteractionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class InteractionService {
    
    private static final Logger logger = LoggerFactory.getLogger(InteractionService.class);
    
    private final InteractionRepository interactionRepository;
    
    @Autowired
    public InteractionService(InteractionRepository interactionRepository) {
        this.interactionRepository = interactionRepository;
    }
    
    /**
     * Log a new interaction with GPS coordinates and timestamp
     */
    public Interaction logInteraction(Integer userId, String userRole, Double latitude, Double longitude) {
        return logInteraction(userId, userRole, latitude, longitude, null, null);
    }
    
    /**
     * Log a new interaction with GPS coordinates, accuracy, and optional notes
     */
    public Interaction logInteraction(Integer userId, String userRole, Double latitude, Double longitude, 
                                     Double accuracy, String notes) {
        try {
            Interaction interaction = new Interaction(userId, userRole, latitude, longitude, accuracy, notes);
            Interaction savedInteraction = interactionRepository.save(interaction);
            logger.info("Interaction logged successfully - User: {}, Role: {}, Lat: {}, Lon: {}, Time: {}", 
                       userId, userRole, latitude, longitude, savedInteraction.getTimestamp());
            return savedInteraction;
        } catch (Exception e) {
            logger.error("Error logging interaction - User: {}, Role: {}", userId, userRole, e);
            throw new RuntimeException("Failed to log interaction", e);
        }
    }
    
    /**
     * Get all interactions for a specific user
     */
    public List<Interaction> getInteractionsByUserId(Integer userId) {
        try {
            return interactionRepository.findByUserId(userId);
        } catch (Exception e) {
            logger.error("Error retrieving interactions for user: {}", userId, e);
            throw new RuntimeException("Failed to retrieve interactions", e);
        }
    }
    
    /**
     * Get interactions for a user within a specific date range
     */
    public List<Interaction> getInteractionsByUserIdAndDateRange(Integer userId, LocalDateTime startTime, LocalDateTime endTime) {
        try {
            return interactionRepository.findByUserIdAndTimestampBetween(userId, startTime, endTime);
        } catch (Exception e) {
            logger.error("Error retrieving interactions for user: {} within date range", userId, e);
            throw new RuntimeException("Failed to retrieve interactions", e);
        }
    }
    
    /**
     * Get all interactions by user role
     */
    public List<Interaction> getInteractionsByUserRole(String userRole) {
        try {
            return interactionRepository.findByUserRole(userRole);
        } catch (Exception e) {
            logger.error("Error retrieving interactions for role: {}", userRole, e);
            throw new RuntimeException("Failed to retrieve interactions", e);
        }
    }
    
    /**
     * Get interactions within a geographic area
     */
    public List<Interaction> getInteractionsInArea(Double minLat, Double maxLat, Double minLon, Double maxLon) {
        try {
            return interactionRepository.findByLatitudeBetweenAndLongitudeBetween(minLat, maxLat, minLon, maxLon);
        } catch (Exception e) {
            logger.error("Error retrieving interactions in area", e);
            throw new RuntimeException("Failed to retrieve interactions", e);
        }
    }
    
    /**
     * Get a specific interaction by ID
     */
    public Optional<Interaction> getInteractionById(Integer interactionId) {
        try {
            return interactionRepository.findById(interactionId);
        } catch (Exception e) {
            logger.error("Error retrieving interaction: {}", interactionId, e);
            throw new RuntimeException("Failed to retrieve interaction", e);
        }
    }
}
