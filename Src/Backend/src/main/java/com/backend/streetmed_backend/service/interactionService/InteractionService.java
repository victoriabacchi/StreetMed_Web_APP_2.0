package com.backend.streetmed_backend.service.interactionService;

import com.backend.streetmed_backend.entity.interaction_entity.Interaction;
import com.backend.streetmed_backend.repository.Interaction.InteractionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class InteractionService {

    private final InteractionRepository interactionRepository;

    @Autowired
    public InteractionService(InteractionRepository interactionRepository) {
        this.interactionRepository = interactionRepository;
    }

    /**
     * Save a new interaction
     */
    public Interaction logInteraction(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            throw new RuntimeException("Latitude and longitude are required");
        }

        Interaction interaction = new Interaction();
        interaction.setLatitude(latitude);
        interaction.setLongitude(longitude);
        interaction.setCreatedAt(LocalDateTime.now());

        return interactionRepository.save(interaction);
    }

    /**
     * Get all interactions for heatmap
     */
    @Transactional(readOnly = true)
    public List<Interaction> getAllInteractions() {
        return interactionRepository.findAll();
    }

    /**
     * Get total number of interactions
     */
    @Transactional(readOnly = true)
    public long getTotalInteractions() {
        return interactionRepository.count();
    }
}