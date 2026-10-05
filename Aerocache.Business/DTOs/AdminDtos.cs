using System;
using System.Collections.Generic;

namespace Aerocache.Business.DTOs
{
    public class AdminLoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class AdminLoginResponse
    {
        public bool Success { get; set; }
        public string Token { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = "ADMIN";
    }

    public class RouteStatDto
    {
        public string Route { get; set; } = string.Empty; // e.g. "UIO - GYE"
        public int FlightsCount { get; set; }
        public int BookingsCount { get; set; }
        public decimal TotalRevenue { get; set; }
    }

    public class FlightOccupancyDto
    {
        public string FlightId { get; set; } = string.Empty;
        public string FlightNumber { get; set; } = string.Empty;
        public string Route { get; set; } = string.Empty;
        public string ScheduledDeparture { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int TotalSeats { get; set; } = 150;
        public int BookedSeats { get; set; }
        public int AvailableSeats { get; set; }
        public double OccupancyPercentage { get; set; }
    }

    public class AdminDashboardStatsDto
    {
        public int TotalBookings { get; set; }
        public int ConfirmedBookings { get; set; }
        public int CancelledBookings { get; set; }
        public int TotalPassengers { get; set; }
        public decimal TotalRevenue { get; set; }
        public int TotalFlightsToday { get; set; }
        public List<RouteStatDto> RouteStats { get; set; } = new();
        public List<FlightOccupancyDto> FlightOccupancies { get; set; } = new();
        public List<BookingDetail> RecentBookings { get; set; } = new();
    }

    public class UpdateFlightStatusRequest
    {
        public string Status { get; set; } = "SCHEDULED"; // SCHEDULED, BOARDING, DEPARTED, DELAYED, ARRIVED, CANCELLED
    }
}
