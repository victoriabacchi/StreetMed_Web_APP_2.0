package com.backend.streetmed_backend.controller.Order;

import com.backend.streetmed_backend.dto.order.*;
import com.backend.streetmed_backend.entity.order_entity.Order;
import com.backend.streetmed_backend.entity.order_entity.OrderAssignment;
import com.backend.streetmed_backend.entity.order_entity.OrderItem;
import com.backend.streetmed_backend.repository.Order.OrderItemRepository;
import com.backend.streetmed_backend.repository.Order.OrderRepository;
import com.backend.streetmed_backend.security.TLSService;
import com.backend.streetmed_backend.service.orderService.OrderManagementService;
import com.backend.streetmed_backend.service.orderService.OrderAssignmentService;
import com.backend.streetmed_backend.service.orderService.OrderService;
import com.backend.streetmed_backend.service.orderService.OrderRateLimitService;
import com.backend.streetmed_backend.util.ResponseUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Tag(name = "Order Management", description = "APIs for managing orders")
@RestController
@RequestMapping("/api/orders")
@CrossOrigin
public class OrderController {

    private static final Logger logger = LoggerFactory.getLogger(OrderController.class);

    private final OrderManagementService orderManagementService;
    private final OrderAssignmentService orderAssignmentService;
    private final OrderService orderService;
    private final TLSService tlsService;
    private final Executor authExecutor;
    private final Executor readOnlyExecutor;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    public OrderController(OrderManagementService orderManagementService,
                           OrderAssignmentService orderAssignmentService,
                           OrderService orderService,
                           TLSService tlsService,
                           @Qualifier("authExecutor") Executor authExecutor,
                           @Qualifier("readOnlyExecutor") Executor readOnlyExecutor) {
        this.orderManagementService = orderManagementService;
        this.orderAssignmentService = orderAssignmentService;
        this.orderService = orderService;
        this.tlsService = tlsService;
        this.authExecutor = authExecutor;
        this.readOnlyExecutor = readOnlyExecutor;
    }

    /**
     * Helper method to validate authentication from multiple sources
     * Supports: X-Auth-Token header, Authentication-Status header, or query parameters
     */
    private boolean isValidAuthentication(String authToken, String authStatus,
                                          Boolean authenticated, Integer userId, String userRole) {
        // Method 1: Token-based authentication (when tokens are in same instance)
        if (tlsService.isAuthenticated(authToken, authStatus)) {
            return true;
        }

        // Method 2: Header-based legacy authentication
        if ("true".equalsIgnoreCase(authStatus)) {
            return true;
        }

        // Method 3: Query parameter-based authentication (for stateless/multi-instance)
        // This is acceptable for read-only GET operations when user info is provided
        if (Boolean.TRUE.equals(authenticated) && userId != null && userId > 0 && userRole != null) {
            logger.debug("Using query parameter authentication for userId: {}, role: {}", userId, userRole);
            return true;
        }

        return false;
    }

    /**
     * Helper method to check if user has required role
     * Supports both token-based and parameter-based role checking
     */
    private boolean hasRequiredRole(String authToken, String userRole, String... requiredRoles) {
        // Method 1: Check via token (if available)
        if (authToken != null && tlsService.hasRole(authToken, requiredRoles)) {
            return true;
        }

        // Method 2: Check via provided userRole parameter
        if (userRole != null) {
            for (String role : requiredRoles) {
                if (role.equalsIgnoreCase(userRole)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get orders for a specific user
     */
    @GetMapping("/user/{userId}")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getUserOrders(
            @PathVariable Integer userId,
            @RequestParam(required = false) Boolean authenticated,
            @RequestParam(required = false) String userRole,
            @RequestParam(value = "userId", required = false) Integer requestUserId) {

        logger.info("Fetching orders for user: {} (requested by: {}, role: {})",
                userId, requestUserId, userRole);

        return CompletableFuture.supplyAsync(() -> {
            try {
                // Verify that the user is requesting their own orders
                if (requestUserId != null && !requestUserId.equals(userId)) {
                    logger.warn("User {} attempted to access orders of user {}", requestUserId, userId);
                    return ResponseUtil.forbidden("Cannot access other user's orders");
                }

                // Fetch all orders for this user
                List<Order> userOrders = orderRepository.findByUserIdOrderByRequestTimeDesc(userId);

                // Convert to response format
                List<Map<String, Object>> orderList = new ArrayList<>();
                for (Order order : userOrders) {
                    Map<String, Object> orderMap = new HashMap<>();
                    orderMap.put("orderId", order.getOrderId());
                    orderMap.put("userId", order.getUserId());
                    orderMap.put("roundId", order.getRoundId());
                    orderMap.put("status", order.getStatus());
                    orderMap.put("deliveryAddress", order.getDeliveryAddress());
                    orderMap.put("phoneNumber", order.getPhoneNumber());
                    orderMap.put("notes", order.getNotes());
                    orderMap.put("requestTime", order.getRequestTime());
                    orderMap.put("deliveryTime", order.getDeliveryTime());
                    orderMap.put("latitude", order.getLatitude());
                    orderMap.put("longitude", order.getLongitude());

                    // Add order items
                    List<OrderItem> items = orderItemRepository.findByOrderId(order.getOrderId());
                    orderMap.put("orderItems", items);

                    orderList.add(orderMap);
                }

                Map<String, Object> response = new HashMap<>();
                response.put("status", "success");
                response.put("orders", orderList);
                response.put("count", orderList.size());

                logger.info("Successfully fetched {} orders for user {}", orderList.size(), userId);

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                logger.error("Error fetching orders for user {}: ", userId, e);
                return ResponseUtil.internalError("Failed to fetch order history");
            }
        }, readOnlyExecutor);
    }

    /**
     * Cancel an order (Client and Admin endpoint)
     */
    @PostMapping("/{orderId}/cancel")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> cancelOrder(
            @PathVariable Integer orderId,
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "X-Auth-Token", required = false) String authToken,
            @RequestHeader(value = "Authentication-Status", required = false) String authStatus,
            HttpServletRequest httpRequest) {

        Boolean authenticated = (Boolean) request.get("authenticated");
        Integer userId = (Integer) request.get("userId");
        String userRole = (String) request.get("userRole");

        logger.info("Cancel order request - orderId: {}, userId: {}, role: {}",
                orderId, userId, userRole);

        // Check if this is an admin operation
        boolean isAdmin = "ADMIN".equals(userRole) && tlsService.hasRole(authToken, "ADMIN");

        // For admin operations, enforce HTTPS
        if (isAdmin && tlsService.isHttpsRequired(httpRequest, true)) {
            return CompletableFuture.completedFuture(
                    ResponseUtil.httpsRequired("Admin operations require secure HTTPS connection"));
        }

        // Check authentication
        if (!Boolean.TRUE.equals(authenticated)) {
            return CompletableFuture.completedFuture(ResponseUtil.unauthorized());
        }

        return CompletableFuture.supplyAsync(() -> {
            try {
                // Find the order
                Optional<Order> orderOpt = orderRepository.findById(orderId);
                if (orderOpt.isEmpty()) {
                    return ResponseUtil.notFound("Order not found");
                }

                Order order = orderOpt.get();

                // Verify the user owns this order (unless admin)
                if (!isAdmin && !order.getUserId().equals(userId)) {
                    return ResponseUtil.forbidden("You can only cancel your own orders");
                }

                // Check if order can be cancelled
                if ("COMPLETED".equals(order.getStatus()) || "CANCELLED".equals(order.getStatus())) {
                    return ResponseUtil.badRequest("Order cannot be cancelled - status: " + order.getStatus());
                }

                // Cancel the order through service (handles inventory release)
                orderService.cancelOrder(orderId, userId, userRole);

                Map<String, Object> response = new HashMap<>();
                response.put("status", "success");
                response.put("message", "Order cancelled successfully");
                response.put("orderId", orderId);

                logger.info("Successfully cancelled order {}", orderId);

                return ResponseEntity.ok(response);
            } catch (Exception e) {
                logger.error("Error cancelling order {}: ", orderId, e);
                return ResponseUtil.internalError("Failed to cancel order");
            }
        }, authExecutor);
    }

    @Operation(summary = "Get pending orders with priority queue")
    @GetMapping("/pending")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getPendingOrders(
            @RequestHeader("Authentication-Status") String authStatus,
            @RequestHeader("User-Id") Integer userId,
            @RequestHeader("User-Role") String userRole,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            HttpServletRequest httpRequest) {

        return CompletableFuture.supplyAsync(() -> {
            GetPendingOrdersRequest request = new GetPendingOrdersRequest(authStatus, userId, userRole, page, size);
            return orderManagementService.getPendingOrders(request);
        }, readOnlyExecutor);
    }

    @Operation(summary = "Accept an order")
    @PostMapping("/{orderId}/accept")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> acceptOrder(
            @PathVariable Integer orderId,
            @RequestBody AcceptOrderRequest request,
            HttpServletRequest httpRequest) {

        request.setOrderId(orderId);
        return CompletableFuture.supplyAsync(() ->
                orderManagementService.acceptOrder(request), authExecutor);
    }

    @Operation(summary = "Create a new order")
    @PostMapping("/create")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> createOrder(
            @RequestBody CreateOrderRequest request,
            HttpServletRequest httpRequest) {

        return CompletableFuture.supplyAsync(() -> {
            // Set guest user ID if not authenticated
            if (!Boolean.TRUE.equals(request.getAuthenticated()) || request.getUserId() == null) {
                if (request.getUserId() == null) {
                    request.setUserId(-1); // Guest user ID
                }
            }

            try {
                // Extract client IP address
                String clientIpAddress = extractClientIp(httpRequest);

                Order order = new Order(Order.OrderType.CLIENT);
                order.setUserId(request.getUserId());
                order.setDeliveryAddress(request.getDeliveryAddress());
                order.setPhoneNumber(request.getPhoneNumber());
                order.setNotes(request.getNotes());
                order.setLatitude(request.getLatitude());
                order.setLongitude(request.getLongitude());

                List<OrderItem> orderItems = new ArrayList<>();
                if (request.getItems() != null) {
                    for (Map<String, Object> itemData : request.getItems()) {
                        OrderItem item = new OrderItem();
                        item.setItemName((String) itemData.get("itemName"));
                        item.setQuantity((Integer) itemData.get("quantity"));

                        // Optional description/notes from client
                        if (itemData.containsKey("description")) {
                            item.setDescription((String) itemData.get("description"));
                        }

                        // Handle size field if present
                        if (itemData.containsKey("size")) {
                            item.setSize((String) itemData.get("size"));
                        }

                        // Handle isCustom field if present
                        if (itemData.containsKey("isCustom")) {
                            item.setIsCustom((Boolean) itemData.get("isCustom"));
                        }

                        orderItems.add(item);
                    }
                }

                // Pass IP address to service
                Order savedOrder = orderService.createOrder(order, orderItems, clientIpAddress);

                Map<String, Object> responseData = new HashMap<>();
                responseData.put("orderId", savedOrder.getOrderId());
                responseData.put("status", savedOrder.getStatus());
                responseData.put("roundId", savedOrder.getRoundId());

                return ResponseUtil.success("Order created successfully", responseData);

            } catch (OrderRateLimitService.RateLimitExceededException e) {
                return ResponseUtil.error(e.getMessage(), HttpStatus.TOO_MANY_REQUESTS, true);
            } catch (Exception e) {
                logger.error("Error creating order: {}", e.getMessage());
                return ResponseUtil.badRequest(e.getMessage());
            }
        }, authExecutor);
    }

    @Operation(summary = "Cancel order assignment")
    @DeleteMapping("/{orderId}/assignment")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> cancelOrderAssignment(
            @PathVariable Integer orderId,
            @RequestHeader("User-Id") Integer userId,
            @RequestHeader("User-Role") String userRole,
            @RequestHeader("Authentication-Status") String authStatus,
            HttpServletRequest httpRequest) {

        return CompletableFuture.supplyAsync(() -> {
            CancelAssignmentRequest request = new CancelAssignmentRequest(authStatus, userId, userRole, orderId);

            if (!"true".equals(request.getAuthStatus())) {
                return ResponseUtil.unauthorized();
            }

            if (!"VOLUNTEER".equals(request.getUserRole())) {
                return ResponseUtil.forbidden("Only volunteers can cancel assignments");
            }

            try {
                // Get the assignment for this order
                Optional<OrderAssignment> assignment = orderAssignmentService.getOrderAssignment(orderId);
                if (assignment.isEmpty()) {
                    return ResponseUtil.notFound("No assignment found for this order");
                }

                // Verify the volunteer owns this assignment
                if (!assignment.get().getVolunteerId().equals(userId)) {
                    return ResponseUtil.forbidden("You can only cancel your own assignments");
                }

                // Cancel through assignment service
                OrderAssignment cancelledAssignment = orderAssignmentService.cancelAssignment(
                        assignment.get().getAssignmentId(), userId
                );

                Map<String, Object> responseData = new HashMap<>();
                responseData.put("orderId", orderId);
                responseData.put("status", "Order returned to pending queue");
                responseData.put("assignmentStatus", cancelledAssignment.getStatus().toString());

                return ResponseUtil.success("Assignment cancelled successfully", responseData);

            } catch (Exception e) {
                logger.error("Error cancelling assignment: {}", e.getMessage());
                return ResponseUtil.internalError(e.getMessage());
            }
        }, authExecutor);
    }

    @Operation(summary = "Get my assignments (including completed)")
    @GetMapping("/my-assignments")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getMyAssignments(
            @RequestHeader("User-Id") Integer userId,
            @RequestHeader("User-Role") String userRole,
            @RequestHeader("Authentication-Status") String authStatus,
            HttpServletRequest httpRequest) {

        return CompletableFuture.supplyAsync(() -> {
            GetMyAssignmentsRequest request = new GetMyAssignmentsRequest(authStatus, userId, userRole);

            if (!"true".equals(request.getAuthStatus())) {
                return ResponseUtil.unauthorized();
            }

            if (!"VOLUNTEER".equals(request.getUserRole())) {
                return ResponseUtil.forbidden("Only volunteers can view assignments");
            }

            try {
                // CHANGED: Use getAllAssignments instead of getActiveAssignments
                List<OrderAssignment> allAssignments = orderAssignmentService.getAllAssignments(userId);

                // Enrich with order details
                List<Map<String, Object>> enrichedAssignments = new ArrayList<>();
                for (OrderAssignment assignment : allAssignments) {
                    Map<String, Object> assignmentData = new HashMap<>();
                    assignmentData.put("assignmentId", assignment.getAssignmentId());
                    assignmentData.put("orderId", assignment.getOrderId());
                    assignmentData.put("status", assignment.getStatus().toString());
                    assignmentData.put("acceptedAt", assignment.getAcceptedAt());
                    assignmentData.put("completedAt", assignment.getCompletedAt()); // Include completed time
                    assignmentData.put("roundId", assignment.getRoundId());

                    // Get order details
                    try {
                        Order order = orderService.getOrder(
                                assignment.getOrderId(), userId, userRole
                        );
                        assignmentData.put("deliveryAddress", order.getDeliveryAddress());
                        assignmentData.put("phoneNumber", order.getPhoneNumber());
                        assignmentData.put("notes", order.getNotes());
                        assignmentData.put("items", order.getOrderItems());
                        assignmentData.put("requestTime", order.getRequestTime());
                        assignmentData.put("deliveryTime", order.getDeliveryTime());
                    } catch (Exception e) {
                        logger.warn("Could not fetch order details for assignment {}: {}",
                                assignment.getAssignmentId(), e.getMessage());
                    }

                    enrichedAssignments.add(assignmentData);
                }

                Map<String, Object> responseData = new HashMap<>();
                responseData.put("status", "success");
                responseData.put("assignments", enrichedAssignments);
                responseData.put("totalActive", allAssignments.stream()
                        .filter(a -> a.getStatus() != OrderAssignment.AssignmentStatus.COMPLETED
                                && a.getStatus() != OrderAssignment.AssignmentStatus.CANCELLED)
                        .count());
                responseData.put("totalCompleted", allAssignments.stream()
                        .filter(a -> a.getStatus() == OrderAssignment.AssignmentStatus.COMPLETED)
                        .count());

                return ResponseEntity.ok(responseData);

            } catch (Exception e) {
                logger.error("Error fetching assignments: {}", e.getMessage());
                return ResponseUtil.internalError(e.getMessage());
            }
        }, readOnlyExecutor);
    }

    @Operation(summary = "Start working on assigned order")
    @PutMapping("/assignment/{assignmentId}/start")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> startAssignment(
            @PathVariable Integer assignmentId,
            @RequestHeader("User-Id") Integer userId,
            @RequestHeader("User-Role") String userRole,
            @RequestHeader("Authentication-Status") String authStatus,
            HttpServletRequest httpRequest) {

        return CompletableFuture.supplyAsync(() -> {
            if (!"true".equals(authStatus)) {
                return ResponseUtil.unauthorized();
            }

            if (!"VOLUNTEER".equals(userRole)) {
                return ResponseUtil.forbidden("Only volunteers can manage assignments");
            }

            try {
                OrderAssignment assignment = orderAssignmentService.startOrder(assignmentId, userId);

                Map<String, Object> responseData = new HashMap<>();
                responseData.put("assignmentId", assignment.getAssignmentId());
                responseData.put("orderId", assignment.getOrderId());
                responseData.put("status", assignment.getStatus().toString());
                responseData.put("message", "Order processing started");

                return ResponseUtil.successData(responseData);

            } catch (Exception e) {
                logger.error("Error starting assignment: {}", e.getMessage());
                return ResponseUtil.internalError(e.getMessage());
            }
        }, authExecutor);
    }

    @Operation(summary = "Complete assigned order")
    @PutMapping("/assignment/{assignmentId}/complete")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> completeAssignment(
            @PathVariable Integer assignmentId,
            @RequestHeader("User-Id") Integer userId,
            @RequestHeader("User-Role") String userRole,
            @RequestHeader("Authentication-Status") String authStatus,
            HttpServletRequest httpRequest) {

        return CompletableFuture.supplyAsync(() -> {
            if (!"true".equals(authStatus)) {
                return ResponseUtil.unauthorized();
            }

            if (!"VOLUNTEER".equals(userRole)) {
                return ResponseUtil.forbidden("Only volunteers can manage assignments");
            }

            try {
                OrderAssignment assignment = orderAssignmentService.completeOrder(assignmentId, userId);

                Map<String, Object> responseData = new HashMap<>();
                responseData.put("assignmentId", assignment.getAssignmentId());
                responseData.put("orderId", assignment.getOrderId());
                responseData.put("status", assignment.getStatus().toString());
                responseData.put("message", "Order completed successfully");

                return ResponseUtil.successData(responseData);

            } catch (Exception e) {
                logger.error("Error completing assignment: {}", e.getMessage());
                return ResponseUtil.internalError(e.getMessage());
            }
        }, authExecutor);
    }

    @Operation(summary = "Get order status")
    @GetMapping("/{orderId}/status")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getOrderStatus(
            @PathVariable Integer orderId,
            @RequestHeader("Authentication-Status") String authStatus,
            @RequestHeader("User-Id") Integer userId,
            @RequestHeader("User-Role") String userRole,
            HttpServletRequest httpRequest) {

        return CompletableFuture.supplyAsync(() -> {
            GetOrderStatusRequest request = new GetOrderStatusRequest(authStatus, userId, userRole, orderId);
            return orderManagementService.getOrderStatus(request);
        }, readOnlyExecutor);
    }

    @Operation(summary = "Get all orders (Admin/Volunteer)")
    @GetMapping("/all")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getAllOrders(
            @RequestParam(required = false) Boolean authenticated,
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) String userRole,
            @RequestHeader(value = "Admin-Username", required = false) String adminUsername,
            @RequestHeader(value = "Authentication-Status", required = false) String authStatus,
            @RequestHeader(value = "X-Auth-Token", required = false) String authToken,
            HttpServletRequest httpRequest) {

        // Enforce HTTPS for admin operations (skip in Cloud Run as TLS is terminated at LB)
        if (tlsService.isHttpsRequired(httpRequest, true)) {
            return CompletableFuture.completedFuture(
                    ResponseUtil.httpsRequired("Admin operations require secure HTTPS connection"));
        }

        // Validate authentication using multiple methods (supports stateless/multi-instance)
        if (!isValidAuthentication(authToken, authStatus, authenticated, userId, userRole)) {
            logger.warn("Authentication failed for /api/orders/all - authToken: {}, authStatus: {}, authenticated: {}, userId: {}, userRole: {}",
                    authToken != null ? "present" : "null", authStatus, authenticated, userId, userRole);
            return CompletableFuture.completedFuture(
                    ResponseUtil.unauthorized("Authentication required"));
        }

        // Validate role using multiple methods
        if (!hasRequiredRole(authToken, userRole, "ADMIN", "VOLUNTEER")) {
            logger.warn("Role check failed for /api/orders/all - userRole: {}", userRole);
            return CompletableFuture.completedFuture(
                    ResponseUtil.forbidden("Insufficient permissions"));
        }

        logger.info("Fetching all orders - authenticated userId: {}, role: {}", userId, userRole);

        return CompletableFuture.supplyAsync(() -> {
            GetAllOrdersRequest request = new GetAllOrdersRequest(authenticated, userId, userRole);
            return orderManagementService.getAllOrders(request);
        }, readOnlyExecutor);
    }

    @Operation(summary = "Update order status (Admin)")
    @PutMapping("/{orderId}/status")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> updateOrderStatus(
            @PathVariable Integer orderId,
            @RequestBody Map<String, Object> requestBody,
            @RequestHeader(value = "X-Auth-Token", required = false) String authToken,
            @RequestHeader(value = "Authentication-Status", required = false) String authStatus,
            HttpServletRequest httpRequest) {

        // Enforce HTTPS for admin operations
        if (tlsService.isHttpsRequired(httpRequest, true)) {
            return CompletableFuture.completedFuture(
                    ResponseUtil.httpsRequired("Admin operations require secure HTTPS connection"));
        }

        // Extract auth info from body for stateless validation
        Boolean authenticated = (Boolean) requestBody.get("authenticated");
        Integer userId = (Integer) requestBody.get("userId");
        String userRole = (String) requestBody.get("userRole");

        // Validate authentication using multiple methods
        if (!isValidAuthentication(authToken, authStatus, authenticated, userId, userRole)) {
            return CompletableFuture.completedFuture(
                    ResponseUtil.unauthorized("Authentication required"));
        }

        // Require ADMIN role for status updates
        if (!hasRequiredRole(authToken, userRole, "ADMIN")) {
            return CompletableFuture.completedFuture(
                    ResponseUtil.forbidden("Admin role required"));
        }

        return CompletableFuture.supplyAsync(() -> {
            try {
                String newStatus = (String) requestBody.get("status");

                if (newStatus == null || newStatus.trim().isEmpty()) {
                    return ResponseUtil.badRequest("Status is required");
                }

                Order updatedOrder = orderService.updateOrderStatus(orderId, newStatus, userId, userRole);

                Map<String, Object> responseData = new HashMap<>();
                responseData.put("orderId", updatedOrder.getOrderId());
                responseData.put("status", updatedOrder.getStatus());

                return ResponseUtil.success("Order status updated successfully", responseData);
            } catch (Exception e) {
                logger.error("Error updating order status: {}", e.getMessage());
                return ResponseUtil.badRequest(e.getMessage());
            }
        }, authExecutor);
    }

    @Operation(summary = "Delete an order (Admin)")
    @DeleteMapping("/{orderId}")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> deleteOrder(
            @PathVariable Integer orderId,
            @RequestParam(required = false) Boolean authenticated,
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) String userRole,
            @RequestHeader(value = "X-Auth-Token", required = false) String authToken,
            @RequestHeader(value = "Authentication-Status", required = false) String authStatus,
            HttpServletRequest httpRequest) {

        // Enforce HTTPS for admin operations
        if (tlsService.isHttpsRequired(httpRequest, true)) {
            return CompletableFuture.completedFuture(
                    ResponseUtil.httpsRequired("Admin operations require secure HTTPS connection"));
        }

        // Validate authentication using multiple methods
        if (!isValidAuthentication(authToken, authStatus, authenticated, userId, userRole)) {
            return CompletableFuture.completedFuture(
                    ResponseUtil.unauthorized("Authentication required"));
        }

        // Require ADMIN role for delete
        if (!hasRequiredRole(authToken, userRole, "ADMIN")) {
            return CompletableFuture.completedFuture(
                    ResponseUtil.forbidden("Admin role required"));
        }

        return CompletableFuture.supplyAsync(() -> {
            try {
                // First, cancel the order to release inventory
                orderService.cancelOrder(orderId, userId, userRole);

                // Then delete the order from database
                orderService.deleteOrder(orderId);

                Map<String, Object> responseData = new HashMap<>();
                responseData.put("orderId", orderId);

                return ResponseUtil.success("Order deleted successfully", responseData);
            } catch (Exception e) {
                logger.error("Error deleting order: {}", e.getMessage());
                return ResponseUtil.badRequest(e.getMessage());
            }
        }, authExecutor);
    }

    @Operation(summary = "Get round capacity")
    @GetMapping("/rounds/{roundId}/capacity")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getRoundCapacity(
            @PathVariable Integer roundId,
            @RequestParam(required = false) String authenticated,
            @RequestParam(required = false) String userRole,
            HttpServletRequest httpRequest) {

        return CompletableFuture.supplyAsync(() -> {
            String authStatus = "true".equals(authenticated) ? "true" : "false";
            GetRoundCapacityRequest request = new GetRoundCapacityRequest(authStatus, userRole, roundId);
            return orderManagementService.getRoundCapacity(request);
        }, readOnlyExecutor);
    }

    @Operation(summary = "Update round capacity (Admin)")
    @PutMapping("/rounds/{roundId}/capacity")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> updateRoundCapacity(
            @PathVariable Integer roundId,
            @RequestBody UpdateRoundCapacityRequest request,
            HttpServletRequest httpRequest) {

        if (tlsService.isHttpsRequired(httpRequest, true)) {
            return CompletableFuture.completedFuture(
                    ResponseUtil.httpsRequired("Admin operations require secure HTTPS connection"));
        }

        request.setRoundId(roundId);
        return CompletableFuture.supplyAsync(() ->
                orderManagementService.updateRoundCapacity(request), authExecutor);
    }

    // Helper method to extract client IP
    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // Take the first IP if there are multiple (proxy chain)
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }
}