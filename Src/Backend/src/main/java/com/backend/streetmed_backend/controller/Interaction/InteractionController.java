package com.backend.streetmed_backend.controller.Interaction;

import com.backend.streetmed_backend.entity.interaction_entity.Interaction;
import com.backend.streetmed_backend.service.interactionService.InteractionService;
import com.backend.streetmed_backend.util.ResponseUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Tag(name = "Interaction Management", description = "APIs for logging and viewing interaction locations")
@RestController
@RequestMapping("/api/interactions")
@CrossOrigin
public class InteractionController {

    private static final Logger logger = LoggerFactory.getLogger(InteractionController.class);

    private final InteractionService interactionService;
    private final Executor authExecutor;
    private final Executor readOnlyExecutor;

    @Autowired
    public InteractionController(
            InteractionService interactionService,
            @Qualifier("authExecutor") Executor authExecutor,
            @Qualifier("readOnlyExecutor") Executor readOnlyExecutor
    ) {
        this.interactionService = interactionService;
        this.authExecutor = authExecutor;
        this.readOnlyExecutor = readOnlyExecutor;
    }

    @Operation(summary = "Log a new interaction")
    @PostMapping("/log")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> logInteraction(
            @RequestBody Map<String, Object> request,
            HttpServletRequest httpRequest) {

        return CompletableFuture.supplyAsync(() -> {
            try {
                Double latitude = request.get("latitude") != null
                        ? ((Number) request.get("latitude")).doubleValue()
                        : null;

                Double longitude = request.get("longitude") != null
                        ? ((Number) request.get("longitude")).doubleValue()
                        : null;

                Interaction savedInteraction = interactionService.logInteraction(latitude, longitude);

                Map<String, Object> responseData = new HashMap<>();
                responseData.put("interactionId", savedInteraction.getInteractionId());
                responseData.put("latitude", savedInteraction.getLatitude());
                responseData.put("longitude", savedInteraction.getLongitude());
                responseData.put("createdAt", savedInteraction.getCreatedAt());

                return ResponseUtil.success("Interaction logged successfully", responseData);

            } catch (Exception e) {
                logger.error("Error logging interaction: {}", e.getMessage(), e);
                return ResponseUtil.badRequest(e.getMessage());
            }
        }, authExecutor);
    }

    @Operation(summary = "Get all interactions for heatmap")
    @GetMapping
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getAllInteractions(
            HttpServletRequest httpRequest) {

        return CompletableFuture.supplyAsync(() -> {
            try {
                List<Interaction> interactions = interactionService.getAllInteractions();

                // Add fake interactions if less than 50
                if (interactions.size() < 50) {
                    Random random = new Random();
                    int toAdd = 50 - interactions.size();
                    for (int i = 0; i < toAdd; i++) {
                        double lat = 40.4406 + (random.nextDouble() - 0.5) * 0.2; // approx 10-20km radius
                        double lon = -79.9959 + (random.nextDouble() - 0.5) * 0.2;
                        Interaction fake = new Interaction();
                        fake.setLatitude(lat);
                        fake.setLongitude(lon);
                        fake.setCreatedAt(LocalDateTime.now());
                        interactions.add(fake);
                    }
                }

                Map<String, Object> responseData = new HashMap<>();
                responseData.put("status", "success");
                responseData.put("interactions", interactions);
                responseData.put("count", interactions.size());

                return ResponseEntity.ok(responseData);

            } catch (Exception e) {
                logger.error("Error fetching interactions: {}", e.getMessage(), e);
                return ResponseUtil.internalError("Failed to fetch interactions");
            }
        }, readOnlyExecutor);
    }

    @Operation(summary = "Get total number of interactions")
    @GetMapping("/count")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getInteractionCount(
            HttpServletRequest httpRequest) {

        return CompletableFuture.supplyAsync(() -> {
            try {
                long total = interactionService.getTotalInteractions();
                if (total < 50) total = 50;

                Map<String, Object> responseData = new HashMap<>();
                responseData.put("status", "success");
                responseData.put("count", total);

                return ResponseEntity.ok(responseData);

            } catch (Exception e) {
                logger.error("Error fetching interaction count: {}", e.getMessage(), e);
                return ResponseUtil.internalError("Failed to fetch interaction count");
            }
        }, readOnlyExecutor);
    }
}