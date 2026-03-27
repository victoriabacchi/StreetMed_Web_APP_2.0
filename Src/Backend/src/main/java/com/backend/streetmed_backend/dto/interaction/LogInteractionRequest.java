package com.backend.streetmed_backend.dto.interaction;

public class LogInteractionRequest {
    
    private Double latitude;
    private Double longitude;
    private Double accuracy;
    private String notes;
    private Boolean authenticated;
    private Integer userId;
    private String userRole;
    
    // Constructors
    public LogInteractionRequest() {
    }
    
    public LogInteractionRequest(Double latitude, Double longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }
    
    public LogInteractionRequest(Double latitude, Double longitude, Double accuracy, String notes) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.accuracy = accuracy;
        this.notes = notes;
    }
    
    // Getters and Setters
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
    
    public Boolean getAuthenticated() {
        return authenticated;
    }
    
    public void setAuthenticated(Boolean authenticated) {
        this.authenticated = authenticated;
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
    
    @Override
    public String toString() {
        return "LogInteractionRequest{" +
                "latitude=" + latitude +
                ", longitude=" + longitude +
                ", accuracy=" + accuracy +
                ", notes='" + notes + '\'' +
                ", userId=" + userId +
                ", userRole='" + userRole + '\'' +
                '}';
    }
}
