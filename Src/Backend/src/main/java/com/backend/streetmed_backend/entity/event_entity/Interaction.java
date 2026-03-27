package com.backend.streetmed_backend.entity.event_entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "interactions")
public class Interaction {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "interaction_id")
    private Integer interactionId;
    
    @Column(name = "user_id", nullable = false)
    private Integer userId;
    
    @Column(name = "user_role", nullable = false)
    private String userRole;
    
    @Column(name = "latitude", nullable = false)
    private Double latitude;
    
    @Column(name = "longitude", nullable = false)
    private Double longitude;
    
    @Column(name = "timestamp", nullable = false, columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime timestamp;
    
    @Column(name = "accuracy")
    private Double accuracy;
    
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
    
    // Constructors
    public Interaction() {
    }
    
    public Interaction(Integer userId, String userRole, Double latitude, Double longitude) {
        this.userId = userId;
        this.userRole = userRole;
        this.latitude = latitude;
        this.longitude = longitude;
        this.timestamp = LocalDateTime.now();
    }
    
    public Interaction(Integer userId, String userRole, Double latitude, Double longitude, Double accuracy, String notes) {
        this.userId = userId;
        this.userRole = userRole;
        this.latitude = latitude;
        this.longitude = longitude;
        this.accuracy = accuracy;
        this.notes = notes;
        this.timestamp = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Integer getInteractionId() {
        return interactionId;
    }
    
    public void setInteractionId(Integer interactionId) {
        this.interactionId = interactionId;
    }
    
    public Integer getUserId() {
        return userId;
    }
    
    public void setUserId(Integer userId) {
        this.userId = userId;
    }
    
    public String getUserRole() {
        return userRole;
    }
    
    public void setUserRole(String userRole) {
        this.userRole = userRole;
    }
    
    public Double getLatitude() {
        return latitude;
    }
    
    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }
    
    public Double getLongitude() {
        return longitude;
    }
    
    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
    
    public Double getAccuracy() {
        return accuracy;
    }
    
    public void setAccuracy(Double accuracy) {
        this.accuracy = accuracy;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    @Override
    public String toString() {
        return "Interaction{" +
                "interactionId=" + interactionId +
                ", userId=" + userId +
                ", userRole='" + userRole + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", timestamp=" + timestamp +
                ", accuracy=" + accuracy +
                ", notes='" + notes + '\'' +
                '}';
    }
}
