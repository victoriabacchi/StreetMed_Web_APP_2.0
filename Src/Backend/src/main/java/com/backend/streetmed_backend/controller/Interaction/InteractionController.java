package com.backend.streetmed_backend.controller.Interaction;

import com.backend.streetmed_backend.dto.interaction.LogInteractionRequest;
import com.backend.streetmed_backend.entity.event_entity.Interaction;
import com.backend.streetmed_backend.security.TLSService;
import com.backend.streetmed_backend.service.interactionService.InteractionService;
import com.backend.streetmed_backend.util.ResponseUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Interaction Management", description = "APIs for managing volunteer interactions and GPS logging")
@RestController
@RequestMapping("/api/interactions")
@CrossOrigin
public class InteractionController {
    
    private static final Logger logger = LoggerFactory.getLogger(InteractionController.class);
    private static final DateTimeFormatter dateFormatter = DateTimeFormatter.ISO_DATE_TIME;
    
    private final InteractionService interactionService;
    private final TLSService tlsService;
    
    @Autowired
    public InteractionController(InteractionService interactionService, TLSService tlsService) {
        this.interactionService = interactionService;
        this.tlsService = tlsService;
    }
    
    /**
     * Log a new volunteer interaction with GPS coordinates
     */
    @Operation(summary = "Log volunteer interaction", description = "Log a precise GPS location with timestamp for a volunteer interaction")
    @PostMapping("/log")
    public ResponseEntity<Map<String, Object>> logInteraction(
            @RequestBody LogInteractionRequest request,
            @RequestHeader(value = "X-Auth-Token", required = false) String authToken,
            @RequestHeader(value = "Authentication-Status", required = false) String authStatus,
            @RequestParam(value = "authenticated", required = false) Boolean authenticated,
            @RequestParam(value = "userId", required = false) Integer userId,
            @RequestParam(value = "userRole", required = false) String userRole,
            HttpServletRequest httpRequest) {
        
        try {
            // Validate authentication
            Integer requestUserId = userId != null ? userId : request.getUserId();
            String requestUserRole = userRole != null ? userRole : request.getUserRole();
            
            if (!isValidAuthentication(authToken, authStatus, authenticated, requestUserId, requestUserRole)) {
                logger.warn("Unauthorized interaction log attempt");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ResponseUtil.error("Unauthorized", "Authentication failed"));
            }
            
            // Validate required fields
            if (request.getLatitude() == null || request.getLongitude() == null) {
                logger.warn("Missing required GPS coordinates - User: {}", requestUserId);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ResponseUtil.error("Bad Request", "Latitude and longitude are required"));
            }
            
            if (requestUserId == null || requestUserId <= 0) {
                logger.warn("Invalid user ID: {}", requestUserId);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ResponseUtil.error("Bad Request", "Valid user ID is required"));
            }
            
            if (requestUserRole == null || requestUserRole.trim().isEmpty()) {
                logger.warn("Invalid user role: {}", requestUserRole);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ResponseUtil.error("Bad Request", "Valid user role is required"));
            }
            
            // Validate latitude and longitude ranges
            if (request.getLatitude() < -90 || request.getLatitude() > 90) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ResponseUtil.error("Bad Request", "Latitude must be between -90 and 90"));
            }
            
            if (request.getLongitude() < -180 || request.getLongitude() > 180) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ResponseUtil.error("Bad Request", "Longitude must be between -180 and 180"));
            }
            
            // Log the interaction
            Interaction interaction = interactionService.logInteraction(
                requestUserId,
                requestUserRole,
                request.getLatitude(),
                request.getLongitude(),
                request.getAccuracy(),
                request.getNotes()
            );
            
            logger.info("Interaction logged successfully - ID: {}, User: {}, Lat: {}, Lon: {}", 
                       interaction.getInteractionId(), requestUserId, 
                       request.getLatitude(), request.getLongitude());
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Interaction logged successfully");
            response.put("interactionId", interaction.getInteractionId());
            response.put("timestamp", interaction.getTimestamp().format(dateFormatter));
            response.put("coordinates", new HashMap<String, Double>() {{
                put("latitude", interaction.getLatitude());
                put("longitude", interaction.getLongitude());
            }});
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error logging interaction", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ResponseUtil.error("Server Error", "Failed to log interaction: " + e.getMessage()));
        }
    }
    
    /**
     * Get all interactions for the current user
     */
    @Operation(summary = "Get user interactions", description = "Retrieve all GPS logging interactions for the authenticated user")
    @GetMapping("/my-interactions")
    public ResponseEntity<Map<String, Object>> getMyInteractions(
            @RequestHeader(value = "X-Auth-Token", required = false) String authToken,
            @RequestHeader(value = "Authentication-Status", required = false) String authStatus,
            @RequestHeader(value = "User-Id", required = false) Integer userId,
            @RequestHeader(value = "User-Role", required = false) String userRole,
            @RequestParam(value = "authenticated", required = false) Boolean authenticated,
            HttpServletRequest httpRequest) {
        
        try {
            // Validate authentication
            Integer requestUserId = userId;
            String requestUserRole = userRole;
            
            if (!isValidAuthentication(authToken, authStatus, authenticated, requestUserId, requestUserRole)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ResponseUtil.error("Unauthorized", "Authentication failed"));
            }
            
            if (requestUserId == null || requestUserId <= 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ResponseUtil.error("Bad Request", "Valid user ID is required"));
            }
            
            List<Interaction> interactions = interactionService.getInteractionsByUserId(requestUserId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Interactions retrieved successfully");
            response.put("count", interactions.size());
            response.put("interactions", interactions);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error retrieving interactions", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ResponseUtil.error("Server Error", "Failed to retrieve interactions: " + e.getMessage()));
        }
    }
    
    /**
     * Get interactions by date range
     */
    @Operation(summary = "Get interactions by date range", description = "Retrieve interactions for a user within a specific date/time range")
    @GetMapping("/by-date-range")
    public ResponseEntity<Map<String, Object>> getInteractionsByDateRange(
            @RequestHeader(value = "User-Id", required = false) Integer userId,
            @RequestHeader(value = "User-Role", required = false) String userRole,
            @RequestParam String startDateTime,
            @RequestParam String endDateTime,
            @RequestHeader(value = "Authentication-Status", required = false) String authStatus,
            @RequestParam(value = "authenticated", required = false) Boolean authenticated) {
        
        try {
            if (!isValidAuthentication(null, authStatus, authenticated, userId, userRole)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ResponseUtil.error("Unauthorized", "Authentication failed"));
            }
            
            if (userId == null || userId <= 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ResponseUtil.error("Bad Request", "Valid user ID is required"));
            }
            
            LocalDateTime startTime = LocalDateTime.parse(startDateTime, dateFormatter);
            LocalDateTime endTime = LocalDateTime.parse(endDateTime, dateFormatter);
            
            List<Interaction> interactions = interactionService.getInteractionsByUserIdAndDateRange(
                userId, startTime, endTime
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Interactions retrieved successfully");
            response.put("count", interactions.size());
            response.put("interactions", interactions);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error retrieving interactions by date range", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ResponseUtil.error("Server Error", "Failed to retrieve interactions: " + e.getMessage()));
        }
    }
    
    /**
     * Helper method to validate authentication
     */
    private boolean isValidAuthentication(String authToken, String authStatus, 
                                         Boolean authenticated, Integer userId, String userRole) {
        // Method 1: Token-based authentication
        if (authToken != null && tlsService.isAuthenticated(authToken, authStatus)) {
            return true;
        }
        
        // Method 2: Header-based legacy authentication
        if ("true".equalsIgnoreCase(authStatus)) {
            return true;
        }
        
        // Method 3: Query parameter-based authentication for read-only operations
        if (Boolean.TRUE.equals(authenticated) && userId != null && userId > 0 && userRole != null) {
            logger.debug("Using parameter authentication for userId: {}, role: {}", userId, userRole);
            return true;
        }
        
        return false;
    }
}
