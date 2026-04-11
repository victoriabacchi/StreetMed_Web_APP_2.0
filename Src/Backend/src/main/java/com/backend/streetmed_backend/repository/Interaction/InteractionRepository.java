package com.backend.streetmed_backend.repository.Interaction;

import com.backend.streetmed_backend.entity.interaction_entity.Interaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InteractionRepository extends JpaRepository<Interaction, Integer> {
}