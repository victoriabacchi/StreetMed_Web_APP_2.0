package com.backend.streetmed_backend.controller.Rounds;

import com.backend.streetmed_backend.entity.order_entity.Order;
import com.backend.streetmed_backend.entity.rounds_entity.Rounds;
import com.backend.streetmed_backend.entity.rounds_entity.RoundSignup;
import com.backend.streetmed_backend.repository.Order.OrderRepository;
import com.backend.streetmed_backend.service.roundService.RoundsService;
import com.backend.streetmed_backend.service.roundService.RoundSignupService;
import com.backend.streetmed_backend.service.orderService.OrderRoundAssignmentService;
import com.backend.streetmed_backend.service.orderService.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.tomcat.util.log.SystemLogHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.logging.Logger;


@Tag(name = "Admin Rounds Management", description = "APIs for administrators to manage street medicine rounds")
@RestController
@RequestMapping("/api/admin/rounds")
public class AdminRoundsController {
    private final RoundsService roundsService;
    private final RoundSignupService roundSignupService;
    private final Executor asyncExecutor;
    private final OrderRoundAssignmentService orderRoundAssignmentService;
    private final OrderService orderService;


    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    public AdminRoundsController(RoundsService roundsService,
                                 RoundSignupService roundSignupService,
                                 OrderRoundAssignmentService orderRoundAssignmentService,
                                 OrderService orderService,
                                 @Qualifier("authExecutor") Executor asyncExecutor) {
        this.roundsService = roundsService;
        this.roundSignupService = roundSignupService;
        this.orderRoundAssignmentService = orderRoundAssignmentService;
        this.orderService = orderService;
        this.asyncExecutor = asyncExecutor;
    }


    @Operation(summary = "Auto-assign unassigned orders to rounds",
            description = "Automatically assigns all unassigned orders to available rounds based on capacity.")
    @PostMapping("/auto-assign-orders")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> autoAssignOrders(
            @RequestBody Map<String, Object> requestData) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Boolean authenticated = (Boolean) requestData.get("authenticated");
                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("status", "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                // Use the service to assign unassigned orders
                int assignedCount = orderRoundAssignmentService.assignUnassignedOrders();

                Map<String, Object> response = new HashMap<>();
                response.put("status", "success");
                response.put("message", assignedCount + " orders were assigned to rounds");
                response.put("assignedCount", assignedCount);

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("status", "error");
                errorResponse.put("message", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }

    @Operation(summary = "Get order assignment status for a round",
            description = "Shows how many orders are assigned to a round and its capacity.")
    @GetMapping("/{roundId}/order-status")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getRoundOrderStatus(
            @PathVariable Integer roundId,
            @RequestParam("authenticated") Boolean authenticated) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("status", "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                Rounds round = roundsService.getRound(roundId);
                long currentOrderCount = orderRepository.countByRoundId(roundId);
                Integer orderCapacity = round.getOrderCapacity() != null ? round.getOrderCapacity() : 20;
                List<Order> roundOrders = orderService.getOrdersForRound(roundId);

                Map<String, Object> response = new HashMap<>();
                response.put("status", "success");
                response.put("roundId", roundId);
                response.put("roundTitle", round.getTitle());
                response.put("currentOrderCount", currentOrderCount);
                response.put("orderCapacity", orderCapacity);
                response.put("availableSlots", orderCapacity - currentOrderCount);
                response.put("capacityPercentage", (currentOrderCount * 100.0) / orderCapacity);
                response.put("orders", roundOrders);

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("status", "error");
                errorResponse.put("message", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }


    @Operation(summary = "Create a new rounds schedule",
            description = "Creates a new rounds schedule with the provided details. Only accessible by administrators.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Round created successfully"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Unauthorized - Admin access only"),
            @ApiResponse(responseCode = "400", description = "Invalid input")
    })
    @PostMapping("/create")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> createRound(
            @RequestBody Map<String, Object> requestData) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Boolean authenticated = (Boolean) requestData.get("authenticated");
                String adminUsername = (String) requestData.get("adminUsername");

                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("status", "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                // Create a new round object
                Rounds round = new Rounds();
                round.setTitle((String) requestData.get("title"));
                round.setDescription((String) requestData.get("description"));

                // Parse dates
                String startTimeStr = (String) requestData.get("startTime");
                String endTimeStr = (String) requestData.get("endTime");
                if (startTimeStr == null || endTimeStr == null) {
                    throw new IllegalArgumentException("Start time and end time are required");
                }

                LocalDateTime startTime = LocalDateTime.parse(startTimeStr);
                LocalDateTime endTime = LocalDateTime.parse(endTimeStr);

                // Prevent scheduling rounds in the past
                if (startTime.isBefore(LocalDateTime.now())) {
                    throw new IllegalArgumentException("Cannot schedule a round in the past");
                }

                // Ensure end time is after start time
                if (endTime.isBefore(startTime)) {
                    throw new IllegalArgumentException("End time must be after start time");
                }

                round.setStartTime(startTime);
                round.setEndTime(endTime);

                round.setLocation((String) requestData.get("location"));
                round.setMaxParticipants((Integer) requestData.get("maxParticipants"));

                // Set order capacity (default to 20 if not provided)
                Integer orderCapacity = (Integer) requestData.get("orderCapacity");
                round.setOrderCapacity(orderCapacity != null ? orderCapacity : 20);

                Rounds savedRound = roundsService.createRound(round);

                // AUTO-ASSIGN UNASSIGNED ORDERS TO THIS NEW ROUND
                int assignedCount = 0;
                try {
                    List<Order> unassignedOrders = orderRepository.findByRoundIdIsNullAndStatus("PENDING");
                    int maxToAssign = savedRound.getOrderCapacity() != null ? savedRound.getOrderCapacity() : 20;

                    for (Order order : unassignedOrders) {
                        if (assignedCount >= maxToAssign) {
                            break;
                        }
                        order.setRoundId(savedRound.getRoundId());
                        orderRepository.save(order);
                        assignedCount++;
                    }
                } catch (Exception ignored) {
                  ;
                }

                Map<String, Object> response = new HashMap<>();
                response.put("status", "success");
                response.put("message", "Round created successfully");
                response.put("roundId", savedRound.getRoundId());
                response.put("ordersAutoAssigned", assignedCount);

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("status", "error");
                errorResponse.put("message", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }

    @Operation(summary = "Update a rounds schedule",
            description = "Updates an existing rounds schedule. Only accessible by administrators.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Round updated successfully"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Unauthorized - Admin access only"),
            @ApiResponse(responseCode = "404", description = "Round not found")
    })
    @PutMapping("/{roundId}")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> updateRound(
            @PathVariable Integer roundId,
            @RequestBody @Schema(example = """
        {
            "authenticated": true,
            "adminUsername": "admin",
            "title": "Updated Downtown Outreach",
            "description": "Updated description",
            "startTime": "2024-04-15T19:00:00",
            "endTime": "2024-04-15T22:00:00",
            "location": "Updated location",
            "maxParticipants": 6,
            "orderCapacity": 25,
            "status": "SCHEDULED"
        }
        """) Map<String, Object> requestData) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Boolean authenticated = (Boolean) requestData.get("authenticated");
                String adminUsername = (String) requestData.get("adminUsername");

                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("status", "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                // Fetch current round
                Rounds existingRound = roundsService.getRound(roundId);

                // Update round fields
                if (requestData.containsKey("title")) {
                    existingRound.setTitle((String) requestData.get("title"));
                }
                if (requestData.containsKey("description")) {
                    existingRound.setDescription((String) requestData.get("description"));
                }
                LocalDateTime startTime = existingRound.getStartTime();
                LocalDateTime endTime = existingRound.getEndTime();

                if (requestData.containsKey("startTime")) {
                    startTime = LocalDateTime.parse((String) requestData.get("startTime"));
                }

                if (requestData.containsKey("endTime")) {
                    endTime = LocalDateTime.parse((String) requestData.get("endTime"));
                }

                // Prevent past rounds
                if (startTime.isBefore(LocalDateTime.now())) {
                    throw new IllegalArgumentException("Cannot schedule a round in the past");
                }

                // Ensure valid range
                if (endTime.isBefore(startTime)) {
                    throw new IllegalArgumentException("End time must be after start time");
                }
                existingRound.setStartTime(startTime);
                existingRound.setEndTime(endTime);

                if (requestData.containsKey("location")) {
                    existingRound.setLocation((String) requestData.get("location"));
                }
                if (requestData.containsKey("maxParticipants")) {
                    existingRound.setMaxParticipants((Integer) requestData.get("maxParticipants"));
                }
                if (requestData.containsKey("orderCapacity")) {
                    existingRound.setOrderCapacity((Integer) requestData.get("orderCapacity"));
                }
                if (requestData.containsKey("status")) {
                    existingRound.setStatus((String) requestData.get("status"));
                }

                Rounds updatedRound = roundsService.updateRound(roundId, existingRound);

                Map<String, Object> response = new HashMap<>();
                response.put("status", "success");
                response.put("message", "Round updated successfully");
                response.put("roundId", updatedRound.getRoundId());

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("status", "error");
                errorResponse.put("message", e.getMessage());

                if (e.getMessage().contains("not found")) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
                }

                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }

    @Operation(summary = "Cancel a round",
            description = "Cancels an existing round and notifies all participants. Only accessible by administrators.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Round cancelled successfully"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Unauthorized - Admin access only"),
            @ApiResponse(responseCode = "404", description = "Round not found")
    })
    @PutMapping("/{roundId}/cancel")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> cancelRound(
            @PathVariable Integer roundId,
            @RequestBody @Schema(example = """
            {
                "authenticated": true,
                "adminUsername": "admin"
            }
            """) Map<String, Object> requestData) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Boolean authenticated = (Boolean) requestData.get("authenticated");
                String adminUsername = (String) requestData.get("adminUsername");

                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put(getStatus(), "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                Rounds cancelledRound = roundsService.cancelRound(roundId);

                Map<String, Object> response = new HashMap<>();
                response.put(getStatus(), "success");
                response.put("message", "Round cancelled successfully");
                response.put("roundId", cancelledRound.getRoundId());

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put(getStatus(), "error");
                errorResponse.put("message", e.getMessage());

                if (e.getMessage().contains("not found")) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
                }

                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }

    @Operation(summary = "Get all rounds",
            description = "Retrieves all rounds. Only accessible by administrators.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Rounds retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Unauthorized - Admin access only")
    })
    @GetMapping("/all")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getAllRounds(
            @RequestParam("authenticated") Boolean authenticated,
            @RequestParam("adminUsername") String adminUsername) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put(getStatus(), "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                // Use the new method that includes counts
                List<Map<String, Object>> allRounds = roundsService.getAllRoundsWithCounts();

                Map<String, Object> response = new HashMap<>();
                response.put(getStatus(), "success");
                response.put("rounds", allRounds);

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put(getStatus(), "error");
                errorResponse.put("message", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }

    @Operation(summary = "Get upcoming rounds",
            description = "Retrieves all upcoming rounds (those with start time in the future). Only accessible by administrators.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Rounds retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Unauthorized - Admin access only")
    })
    @GetMapping("/upcoming")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getUpcomingRounds(
            @RequestParam("authenticated") Boolean authenticated,
            @RequestParam("adminUsername") String adminUsername) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put(getStatus(), "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                // Use the new method that includes counts
                List<Map<String, Object>> upcomingRounds = roundsService.getUpcomingRoundsWithCounts();

                Map<String, Object> response = new HashMap<>();
                response.put(getStatus(), "success");
                response.put("rounds", upcomingRounds);

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put(getStatus(), "error");
                errorResponse.put("message", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }

    @Operation(summary = "Get round details with all participants",
            description = "Retrieves details for a specific round including all signups. Only accessible by administrators.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Round details retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Unauthorized - Admin access only"),
            @ApiResponse(responseCode = "404", description = "Round not found")
    })
    @GetMapping("/{roundId}")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getRoundDetails(
            @PathVariable Integer roundId,
            @RequestParam("authenticated") Boolean authenticated,
            @RequestParam("adminUsername") String adminUsername) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put(getStatus(), "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                // Get round details with proper service method
                Map<String, Object> roundDetails = roundsService.getRoundWithDetails(roundId);

                // Get all signups with user details
                List<Map<String, Object>> signups = roundsService.getRoundSignupsWithUserDetails(roundId);

                // Get participant counts
                long confirmedVolunteers = roundSignupService.countConfirmedVolunteersForRound(roundId);
                int waitlistedCount = roundSignupService.getWaitlistedSignups(roundId).size();

                Rounds round = roundsService.getRound(roundId);
                int availableSlots = round.getMaxParticipants() - (int)confirmedVolunteers;

                Map<String, Object> participantCounts = new HashMap<>();
                participantCounts.put("maxParticipants", round.getMaxParticipants());
                participantCounts.put("confirmedVolunteers", confirmedVolunteers);
                participantCounts.put("availableSlots", availableSlots);
                participantCounts.put("waitlistedCount", waitlistedCount);
                participantCounts.put("hasTeamLead", roundSignupService.hasTeamLead(roundId));
                participantCounts.put("hasClinician", roundSignupService.hasClinician(roundId));

                Map<String, Object> response = new HashMap<>();
                response.put(getStatus(), "success");
                response.put("round", roundDetails);
                response.put("signups", signups);
                response.put("participantCounts", participantCounts);

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put(getStatus(), "error");
                errorResponse.put("message", e.getMessage());

                if (e.getMessage().contains("not found")) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
                }

                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }

    @Operation(summary = "Run lottery for a round",
            description = "Runs the lottery to fill available slots from the waitlist. Only accessible by administrators.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lottery run successfully"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Unauthorized - Admin access only"),
            @ApiResponse(responseCode = "404", description = "Round not found")
    })
    @PostMapping("/{roundId}/lottery")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> runLottery(
            @PathVariable Integer roundId,
            @RequestBody @Schema(example = """
            {
                "authenticated": true,
                "adminUsername": "admin"
            }
            """) Map<String, Object> requestData) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Boolean authenticated = (Boolean) requestData.get("authenticated");
                String adminUsername = (String) requestData.get("adminUsername");

                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put(getStatus(), "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                List<RoundSignup> selectedSignups = roundSignupService.runLotteryForRound(roundId);

                Map<String, Object> response = new HashMap<>();
                response.put(getStatus(), "success");
                response.put("message", "Lottery run successfully");
                response.put("selectedVolunteers", selectedSignups.size());

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put(getStatus(), "error");
                errorResponse.put("message", e.getMessage());

                if (e.getMessage().contains("not found")) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
                }

                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }

    @Operation(summary = "Manually confirm a waitlisted volunteer",
            description = "Manually confirms a waitlisted volunteer for a round. Only accessible by administrators.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Volunteer confirmed successfully"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Unauthorized - Admin access only"),
            @ApiResponse(responseCode = "404", description = "Signup not found")
    })
    @PutMapping("/signup/{signupId}/confirm")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> confirmSignup(
            @PathVariable Integer signupId,
            @RequestBody @Schema(example = """
            {
                "authenticated": true,
                "adminUsername": "admin",
                "adminId": 1
            }
            """) Map<String, Object> requestData) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Boolean authenticated = (Boolean) requestData.get("authenticated");
                String adminUsername = (String) requestData.get("adminUsername");
                Integer adminId = (Integer) requestData.get("adminId");

                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put(getStatus(), "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                // Confirm the signup manually
                RoundSignup signup = roundSignupService.findSignupById(signupId);

                if (!"WAITLISTED".equals(signup.getStatus())) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put(getStatus(), "error");
                    errorResponse.put("message", "Only waitlisted signups can be manually confirmed");
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
                }

                // Update status to confirmed
                signup.setStatus("CONFIRMED");
                signup.setUpdatedAt(LocalDateTime.now());
                RoundSignup confirmedSignup = roundSignupService.updateSignup(signup);

                Map<String, Object> response = new HashMap<>();
                response.put(getStatus(), "success");
                response.put("message", "Volunteer confirmed successfully");
                response.put("signupId", confirmedSignup.getSignupId());
                response.put(getStatus(), confirmedSignup.getStatus());

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put(getStatus(), "error");
                errorResponse.put("message", e.getMessage());

                if (e.getMessage().contains("not found")) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
                }

                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }

    private static String getStatus() {
        return "status";
    }

    @Operation(summary = "Remove a volunteer from a round",
            description = "Removes a volunteer from a round. Only accessible by administrators.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Volunteer removed successfully"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Unauthorized - Admin access only"),
            @ApiResponse(responseCode = "404", description = "Signup not found")
    })
    @DeleteMapping("/signup/{signupId}")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> removeSignup(
            @PathVariable Integer signupId,
            @RequestBody @Schema(example = """
            {
                "authenticated": true,
                "adminUsername": "admin",
                "adminId": 1
            }
            """) Map<String, Object> requestData) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Boolean authenticated = (Boolean) requestData.get("authenticated");
                String adminUsername = (String) requestData.get("adminUsername");
                Integer adminId = (Integer) requestData.get("adminId");

                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put(getStatus(), "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                // Find the signup
                RoundSignup signup = roundSignupService.findSignupById(signupId);
                Integer roundId = signup.getRoundId();
                Integer userId = signup.getUserId();

                // Admin can remove any signup regardless of time restrictions
                roundSignupService.adminCancelSignup(signupId, adminId);

                Map<String, Object> response = new HashMap<>();
                response.put(getStatus(), "success");
                response.put("message", "Volunteer removed successfully");
                response.put("roundId", roundId);
                response.put("userId", userId);

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put(getStatus(), "error");
                errorResponse.put("message", e.getMessage());

                if (e.getMessage().contains("not found")) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
                }

                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }

    @Operation(summary = "Get all waitlisted volunteers for a round",
            description = "Retrieves all waitlisted volunteers for a round. Only accessible by administrators.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Waitlisted volunteers retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "404", description = "Round not found")
    })
    @GetMapping("/{roundId}/waitlist")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getWaitlistedVolunteers(
            @PathVariable Integer roundId,
            @RequestParam("authenticated") Boolean authenticated,
            @RequestParam("adminUsername") String adminUsername) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put(getStatus(), "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                // Verify round exists
                roundsService.getRound(roundId);

                // Get waitlisted signups with user details
                List<RoundSignup> waitlistedSignups = roundSignupService.getWaitlistedSignups(roundId);
                List<Map<String, Object>> waitlistedWithDetails = new java.util.ArrayList<>();

                for (RoundSignup signup : waitlistedSignups) {
                    Map<String, Object> signupDetails = new HashMap<>();
                    signupDetails.put("signupId", signup.getSignupId());
                    signupDetails.put("userId", signup.getUserId());
                    signupDetails.put(getStatus(), signup.getStatus());
                    signupDetails.put("role", signup.getRole());
                    signupDetails.put("signupTime", signup.getSignupTime());
                    signupDetails.put("lotteryNumber", signup.getLotteryNumber());

                    // Add user details (name, email, etc.)
                    try {
                        roundSignupService.addUserDetailsToSignup(signupDetails, signup.getUserId());
                    } catch (Exception e) {
                        // Continue even if user details can't be fetched
                    }

                    waitlistedWithDetails.add(signupDetails);
                }

                // Sort by lottery number
                waitlistedWithDetails.sort((map1, map2) -> {
                    Integer lottery1 = (Integer) map1.get("lotteryNumber");
                    Integer lottery2 = (Integer) map2.get("lotteryNumber");
                    return lottery1.compareTo(lottery2);
                });

                Map<String, Object> response = new HashMap<>();
                response.put(getStatus(), "success");
                response.put("roundId", roundId);
                response.put("waitlistedCount", waitlistedSignups.size());
                response.put("waitlistedVolunteers", waitlistedWithDetails);

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put(getStatus(), "error");
                errorResponse.put("message", e.getMessage());

                if (e.getMessage().contains("not found")) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
                }

                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }

    @Operation(summary = "Manually assign an order to a specific round",
            description = "Allows admin to manually assign or reassign an order to a different round.")
    @PutMapping("/orders/{orderId}/assign-round")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> assignOrderToRound(
            @PathVariable Integer orderId,
            @RequestBody Map<String, Object> requestData) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Boolean authenticated = (Boolean) requestData.get("authenticated");
                String adminUsername = (String) requestData.get("adminUsername");
                Integer targetRoundId = (Integer) requestData.get("roundId");

                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("status", "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                // Find the order
                Order order = orderRepository.findById(orderId)
                        .orElseThrow(() -> new RuntimeException("Order not found"));

                Integer previousRoundId = order.getRoundId();

                // If targetRoundId is provided, verify the round exists and has capacity
                if (targetRoundId != null) {
                    Rounds targetRound = roundsService.getRound(targetRoundId);

                    // Check if round is in the future
                    if (targetRound.getStartTime().isBefore(LocalDateTime.now())) {
                        throw new RuntimeException("Cannot assign orders to past rounds");
                    }

                    // Check if round is scheduled
                    if (!"SCHEDULED".equals(targetRound.getStatus())) {
                        throw new RuntimeException("Cannot assign orders to " + targetRound.getStatus().toLowerCase() + " rounds");
                    }

                    // Check capacity
                    if (!orderRoundAssignmentService.canAssignOrderToRound(targetRound)) {
                        throw new RuntimeException("Round " + targetRoundId + " has reached its order capacity");
                    }
                }

                // Update the order's round assignment
                order.setRoundId(targetRoundId);
                Order updatedOrder = orderRepository.save(order);

                Map<String, Object> response = new HashMap<>();
                response.put("status", "success");
                response.put("orderId", orderId);
                response.put("previousRoundId", previousRoundId);
                response.put("newRoundId", targetRoundId);
                response.put("message", targetRoundId != null ?
                        "Order assigned to round " + targetRoundId :
                        "Order unassigned from round");

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("status", "error");
                errorResponse.put("message", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }

    @Operation(summary = "Reassign multiple orders between rounds",
            description = "Bulk reassign orders from one round to another or to unassigned status.")
    @PostMapping("/orders/bulk-reassign")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> bulkReassignOrders(
            @RequestBody Map<String, Object> requestData) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Boolean authenticated = (Boolean) requestData.get("authenticated");
                String adminUsername = (String) requestData.get("adminUsername");
                Integer sourceRoundId = (Integer) requestData.get("sourceRoundId");
                Integer targetRoundId = (Integer) requestData.get("targetRoundId");
                List<Integer> orderIds = (List<Integer>) requestData.get("orderIds");
                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("status", "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                List<Order> ordersToReassign;

                if (orderIds != null && !orderIds.isEmpty()) {
                    // Reassign specific orders
                    ordersToReassign = orderRepository.findAllById(orderIds);
                } else if (sourceRoundId != null) {
                    // Reassign all orders from source round
                    ordersToReassign = orderRepository.findByRoundId(sourceRoundId);
                } else {
                    throw new IllegalArgumentException("Either orderIds or sourceRoundId must be provided");
                }

                // Verify target round if provided
                if (targetRoundId != null) {
                    Rounds targetRound = roundsService.getRound(targetRoundId);

                    if (!"SCHEDULED".equals(targetRound.getStatus())) {
                        throw new RuntimeException("Cannot assign orders to " + targetRound.getStatus().toLowerCase() + " rounds");
                    }

                    // Check if all orders can fit in target round
                    long currentOrdersInTarget = orderRepository.countByRoundId(targetRoundId);
                    Integer targetCapacity = targetRound.getOrderCapacity() != null ? targetRound.getOrderCapacity() : 20;
                    long availableSlots = targetCapacity - currentOrdersInTarget;

                    if (ordersToReassign.size() > availableSlots) {
                        throw new RuntimeException("Target round only has " + availableSlots +
                                " available slots, but trying to assign " + ordersToReassign.size() + " orders");
                    }
                }

                // Perform reassignment
                int reassignedCount = 0;
                for (Order order : ordersToReassign) {
                    order.setRoundId(targetRoundId);
                    orderRepository.save(order);
                    reassignedCount++;
                }

                Map<String, Object> response = new HashMap<>();
                response.put("status", "success");
                response.put("ordersReassigned", reassignedCount);
                response.put("sourceRoundId", sourceRoundId);
                response.put("targetRoundId", targetRoundId);
                response.put("message", reassignedCount + " orders reassigned successfully");

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("status", "error");
                errorResponse.put("message", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }

    @Operation(summary = "Get unassigned orders",
            description = "Get all orders that are not assigned to any round.")
    @GetMapping("/orders/unassigned")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getUnassignedOrders(
            @RequestParam("authenticated") Boolean authenticated,
            @RequestParam("adminUsername") String adminUsername) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (!Boolean.TRUE.equals(authenticated)) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("status", "error");
                    errorResponse.put("message", "Not authenticated");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }

                List<Order> unassignedOrders = orderRepository.findByRoundIdIsNullAndStatus("PENDING");

                List<Map<String, Object>> orderList = new ArrayList<>();
                for (Order order : unassignedOrders) {
                    Map<String, Object> orderInfo = new HashMap<>();
                    orderInfo.put("orderId", order.getOrderId());
                    orderInfo.put("status", order.getStatus());
                    orderInfo.put("requestTime", order.getRequestTime());
                    orderInfo.put("deliveryAddress", order.getDeliveryAddress());
                    orderInfo.put("phoneNumber", order.getPhoneNumber());
                    orderInfo.put("notes", order.getNotes());
                    orderInfo.put("items", order.getOrderItems());
                    orderList.add(orderInfo);
                }

                Map<String, Object> response = new HashMap<>();
                response.put("status", "success");
                response.put("orders", orderList);
                response.put("count", orderList.size());

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("status", "error");
                errorResponse.put("message", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }, asyncExecutor);
    }
}